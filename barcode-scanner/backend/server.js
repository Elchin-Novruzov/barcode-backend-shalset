const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cron = require('node-cron');
const config = require('./config');
const User = require('./models/User');
const Scan = require('./models/Scan');
const Product = require('./models/Product');
const Category = require('./models/Category');

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Connect to MongoDB
mongoose.connect(config.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// ============ AUTO CLEANUP SCHEDULER ============
// Production: Delete scans older than 3 days, runs once daily at midnight
const CLEANUP_INTERVAL_DAYS = 3;

cron.schedule('0 0 * * *', async () => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - CLEANUP_INTERVAL_DAYS);
    
    const result = await Scan.deleteMany({
      scannedAt: { $lt: cutoffDate }
    });
    
    if (result.deletedCount > 0) {
      console.log(`[CLEANUP] Deleted ${result.deletedCount} scans older than ${CLEANUP_INTERVAL_DAYS} day(s)`);
    }
  } catch (error) {
    console.error('[CLEANUP] Error:', error);
  }
});

console.log(`[CLEANUP] Auto-cleanup scheduled: daily at midnight, deleting scans older than ${CLEANUP_INTERVAL_DAYS} days`);

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRES_IN
  });
};

// Auth middleware
const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }
    const decoded = jwt.verify(token, config.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

// Admin middleware - requires admin role
const adminMiddleware = async (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

// Routes

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }
    
    // Find user
    const user = await User.findOne({ username: username.toLowerCase() });
    if (!user) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }
    
    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }
    
    // Update last login
    user.lastLogin = new Date();
    await user.save();
    
    // Generate token
    const token = generateToken(user._id);
    
    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        fullName: user.fullName,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get current user (verify token)
app.get('/api/auth/me', authMiddleware, async (req, res) => {
  res.json({
    success: true,
    user: {
      id: req.user._id,
      username: req.user.username,
      fullName: req.user.fullName,
      role: req.user.role
    }
  });
});

// Logout (optional - mainly for tracking)
app.post('/api/auth/logout', authMiddleware, async (req, res) => {
  res.json({ success: true, message: 'Logged out successfully' });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============ USER MANAGEMENT ROUTES (Admin only) ============

// Get all users
app.get('/api/users', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json({
      success: true,
      users
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Failed to get users' });
  }
});

// Create new user (Admin only)
app.post('/api/users', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { username, password, fullName, role } = req.body;
    
    if (!username || !password || !fullName) {
      return res.status(400).json({ message: 'Username, password, and full name are required' });
    }
    
    // Check if username exists
    const existingUser = await User.findOne({ username: username.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ message: 'Username already exists' });
    }
    
    const user = new User({
      username: username.toLowerCase(),
      password,
      fullName,
      role: role || 'user'
    });
    
    await user.save();
    
    res.status(201).json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ message: 'Failed to create user' });
  }
});

// Update user (Admin only)
app.put('/api/users/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { username, password, fullName, role } = req.body;
    
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check if new username is taken by another user
    if (username && username.toLowerCase() !== user.username) {
      const existingUser = await User.findOne({ username: username.toLowerCase() });
      if (existingUser) {
        return res.status(400).json({ message: 'Username already exists' });
      }
      user.username = username.toLowerCase();
    }
    
    if (fullName) user.fullName = fullName;
    if (role) user.role = role;
    if (password) user.password = password; // Will be hashed by pre-save hook
    
    await user.save();
    
    res.json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin
      }
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Failed to update user' });
  }
});

// Delete user (Admin only)
app.delete('/api/users/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Prevent self-deletion
    if (id === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }
    
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    await User.findByIdAndDelete(id);
    
    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Failed to delete user' });
  }
});

// ============ SCAN ROUTES ============

// Save a new scan
app.post('/api/scans', authMiddleware, async (req, res) => {
  try {
    const { barcode, scanMode, deviceInfo, location } = req.body;
    
    if (!barcode) {
      return res.status(400).json({ message: 'Barcode data is required' });
    }
    
    const scan = new Scan({
      barcode: barcode.trim(),
      user: req.user._id,
      username: req.user.username,
      userFullName: req.user.fullName,
      scanMode: scanMode || 'keyboard',
      deviceInfo: deviceInfo || null,
      location: location || null,
      scannedAt: new Date()
    });
    
    await scan.save();
    
    res.status(201).json({
      success: true,
      scan: {
        id: scan._id,
        barcode: scan.barcode,
        scannedAt: scan.scannedAt,
        scanMode: scan.scanMode
      }
    });
  } catch (error) {
    console.error('Save scan error:', error);
    res.status(500).json({ message: 'Failed to save scan' });
  }
});

// Get scans for current user
app.get('/api/scans/my', authMiddleware, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * limit;
    
    const scans = await Scan.find({ user: req.user._id })
      .sort({ scannedAt: -1 })
      .skip(skip)
      .limit(limit);
    
    const total = await Scan.countDocuments({ user: req.user._id });
    
    res.json({
      success: true,
      scans,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get scans error:', error);
    res.status(500).json({ message: 'Failed to get scans' });
  }
});

// Get all scans (admin view)
app.get('/api/scans/all', authMiddleware, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * limit;
    
    const scans = await Scan.find()
      .sort({ scannedAt: -1 })
      .skip(skip)
      .limit(limit);
    
    const total = await Scan.countDocuments();
    
    res.json({
      success: true,
      scans,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get all scans error:', error);
    res.status(500).json({ message: 'Failed to get scans' });
  }
});

// Get scan statistics
app.get('/api/scans/stats', authMiddleware, async (req, res) => {
  try {
    const userId = req.query.userId || req.user._id;
    
    const totalScans = await Scan.countDocuments({ user: userId });
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayScans = await Scan.countDocuments({ 
      user: userId, 
      scannedAt: { $gte: todayStart } 
    });
    
    const recentScans = await Scan.find({ user: userId })
      .sort({ scannedAt: -1 })
      .limit(5);
    
    res.json({
      success: true,
      stats: {
        totalScans,
        todayScans,
        recentScans
      }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ message: 'Failed to get stats' });
  }
});

// Delete scans older than X days
app.delete('/api/scans/cleanup', authMiddleware, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 3;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    const result = await Scan.deleteMany({
      scannedAt: { $lt: cutoffDate }
    });
    
    res.json({
      success: true,
      message: `Deleted ${result.deletedCount} scans older than ${days} days`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Cleanup error:', error);
    res.status(500).json({ message: 'Failed to cleanup old scans' });
  }
});

// ============ PRODUCT/INVENTORY ROUTES ============

// Check if product exists by barcode
app.get('/api/products/check/:barcode', authMiddleware, async (req, res) => {
  try {
    const { barcode } = req.params;
    const product = await Product.findOne({ barcode: barcode.trim() });
    
    if (product) {
      res.json({
        success: true,
        exists: true,
        product: {
          id: product._id,
          barcode: product.barcode,
          name: product.name,
          currentStock: product.currentStock,
          note: product.note,
          createdAt: product.createdAt,
          updatedAt: product.updatedAt
        }
      });
    } else {
      res.json({
        success: true,
        exists: false,
        barcode: barcode.trim()
      });
    }
  } catch (error) {
    console.error('Check product error:', error);
    res.status(500).json({ message: 'Failed to check product' });
  }
});

// Create new product
app.post('/api/products', authMiddleware, async (req, res) => {
  try {
    const { barcode, name, quantity, note, buyingPrice, sellingPrice, boughtFrom, sellLocation, category } = req.body;
    
    if (!barcode || !name) {
      return res.status(400).json({ message: 'Barcode and name are required' });
    }
    
    // Check if product already exists
    const existingProduct = await Product.findOne({ barcode: barcode.trim() });
    if (existingProduct) {
      return res.status(409).json({ message: 'Product with this barcode already exists' });
    }
    
    const initialQuantity = parseInt(quantity) || 0;
    
    // Get category info if provided
    let categoryDoc = null;
    if (category) {
      categoryDoc = await Category.findById(category);
    }
    
    const product = new Product({
      barcode: barcode.trim(),
      name: name.trim(),
      currentStock: initialQuantity,
      note: note || '',
      buyingPrice: parseFloat(buyingPrice) || 0,
      sellingPrice: parseFloat(sellingPrice) || 0,
      boughtFrom: boughtFrom?.trim() || '',
      sellLocation: sellLocation?.trim() || '',
      category: categoryDoc ? categoryDoc._id : null,
      categoryName: categoryDoc ? categoryDoc.name : '',
      stockHistory: initialQuantity > 0 ? [{
        quantity: initialQuantity,
        type: 'add',
        note: 'Initial stock',
        addedBy: req.user._id,
        addedByName: req.user.fullName
      }] : [],
      createdBy: req.user._id,
      createdByName: req.user.fullName
    });
    
    await product.save();
    
    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      product: {
        id: product._id,
        barcode: product.barcode,
        name: product.name,
        currentStock: product.currentStock,
        note: product.note,
        buyingPrice: product.buyingPrice,
        sellingPrice: product.sellingPrice,
        boughtFrom: product.boughtFrom,
        sellLocation: product.sellLocation,
        category: product.category,
        categoryName: product.categoryName
      }
    });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ message: 'Failed to create product' });
  }
});

// Add stock to existing product
app.post('/api/products/:barcode/add-stock', authMiddleware, async (req, res) => {
  try {
    const { barcode } = req.params;
    const { quantity, note, supplier } = req.body;
    
    console.log('Add stock request - supplier:', supplier, 'quantity:', quantity);
    
    const addQuantity = parseInt(quantity);
    if (!addQuantity || addQuantity <= 0) {
      return res.status(400).json({ message: 'Valid quantity is required' });
    }
    
    const product = await Product.findOne({ barcode: barcode.trim() });
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    product.currentStock += addQuantity;
    product.stockHistory.push({
      quantity: addQuantity,
      type: 'add',
      note: note || '',
      supplier: supplier?.trim() || '',
      addedBy: req.user._id,
      addedByName: req.user.fullName
    });
    
    await product.save();
    
    res.json({
      success: true,
      message: `Added ${addQuantity} to stock`,
      product: {
        id: product._id,
        barcode: product.barcode,
        name: product.name,
        currentStock: product.currentStock
      }
    });
  } catch (error) {
    console.error('Add stock error:', error);
    res.status(500).json({ message: 'Failed to add stock' });
  }
});

// Remove stock from product
app.post('/api/products/:barcode/remove-stock', authMiddleware, async (req, res) => {
  try {
    const { barcode } = req.params;
    const { quantity, note, location } = req.body;
    
    console.log('Remove stock request - location:', location, 'quantity:', quantity);
    
    const removeQuantity = parseInt(quantity);
    if (!removeQuantity || removeQuantity <= 0) {
      return res.status(400).json({ message: 'Valid quantity is required' });
    }
    
    const product = await Product.findOne({ barcode: barcode.trim() });
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    if (product.currentStock < removeQuantity) {
      return res.status(400).json({ message: 'Insufficient stock' });
    }
    
    product.currentStock -= removeQuantity;
    product.stockHistory.push({
      quantity: removeQuantity,
      type: 'remove',
      note: note || '',
      location: location?.trim() || '',
      addedBy: req.user._id,
      addedByName: req.user.fullName
    });
    
    await product.save();
    
    res.json({
      success: true,
      message: `Removed ${removeQuantity} from stock`,
      product: {
        id: product._id,
        barcode: product.barcode,
        name: product.name,
        currentStock: product.currentStock
      }
    });
  } catch (error) {
    console.error('Remove stock error:', error);
    res.status(500).json({ message: 'Failed to remove stock' });
  }
});

// Get all products
app.get('/api/products', authMiddleware, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';
    const categoryFilter = req.query.category || '';
    
    let query = {};
    
    // Search filter
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { barcode: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Category filter
    if (categoryFilter) {
      if (categoryFilter === 'uncategorized') {
        query.category = null;
      } else {
        query.category = categoryFilter;
      }
    }
    
    const products = await Product.find(query)
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-stockHistory');
    
    const total = await Product.countDocuments(query);
    
    res.json({
      success: true,
      products,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ message: 'Failed to get products' });
  }
});

// Get single product with history
app.get('/api/products/:barcode', authMiddleware, async (req, res) => {
  try {
    const { barcode } = req.params;
    const product = await Product.findOne({ barcode: barcode.trim() });
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    res.json({
      success: true,
      product
    });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ message: 'Failed to get product' });
  }
});

// Update product info
app.put('/api/products/:barcode', authMiddleware, async (req, res) => {
  try {
    const { barcode } = req.params;
    const { name, note, buyingPrice, sellingPrice, boughtFrom, sellLocation, imageUrl, category } = req.body;
    
    const product = await Product.findOne({ barcode: barcode.trim() });
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    // Update fields if provided
    if (name !== undefined) product.name = name.trim();
    if (note !== undefined) product.note = note.trim();
    if (buyingPrice !== undefined) product.buyingPrice = parseFloat(buyingPrice) || 0;
    if (sellingPrice !== undefined) product.sellingPrice = parseFloat(sellingPrice) || 0;
    if (boughtFrom !== undefined) product.boughtFrom = boughtFrom.trim();
    if (sellLocation !== undefined) product.sellLocation = sellLocation.trim();
    if (imageUrl !== undefined) product.imageUrl = imageUrl;
    
    // Update category
    if (category !== undefined) {
      if (category === null || category === '') {
        product.category = null;
        product.categoryName = '';
      } else {
        const categoryDoc = await Category.findById(category);
        if (categoryDoc) {
          product.category = categoryDoc._id;
          product.categoryName = categoryDoc.name;
        }
      }
    }
    
    await product.save();
    
    res.json({
      success: true,
      message: 'Product updated successfully',
      product
    });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ message: 'Failed to update product' });
  }
});

// ============ CATEGORY ROUTES ============

// Get all categories
app.get('/api/categories', authMiddleware, async (req, res) => {
  try {
    const categories = await Category.find().sort({ name: 1 });
    res.json({
      success: true,
      categories
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ message: 'Failed to get categories' });
  }
});

// Create new category
app.post('/api/categories', authMiddleware, async (req, res) => {
  try {
    const { name, description, color } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Category name is required' });
    }
    
    // Check if category already exists
    const existingCategory = await Category.findOne({ name: name.trim() });
    if (existingCategory) {
      return res.status(400).json({ message: 'Category already exists' });
    }
    
    const category = new Category({
      name: name.trim(),
      description: description?.trim() || '',
      color: color || '#3b82f6',
      createdBy: req.user._id,
      createdByName: req.user.fullName
    });
    
    await category.save();
    
    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      category
    });
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({ message: 'Failed to create category' });
  }
});

// Update category
app.put('/api/categories/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, color } = req.body;
    
    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }
    
    if (name !== undefined) {
      // Check if new name conflicts with existing category
      const existingCategory = await Category.findOne({ name: name.trim(), _id: { $ne: id } });
      if (existingCategory) {
        return res.status(400).json({ message: 'Category name already exists' });
      }
      category.name = name.trim();
      
      // Update categoryName in all products with this category
      await Product.updateMany({ category: id }, { categoryName: name.trim() });
    }
    if (description !== undefined) category.description = description.trim();
    if (color !== undefined) category.color = color;
    
    await category.save();
    
    res.json({
      success: true,
      message: 'Category updated successfully',
      category
    });
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({ message: 'Failed to update category' });
  }
});

// Delete category
app.delete('/api/categories/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    
    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }
    
    // Remove category reference from all products
    await Product.updateMany({ category: id }, { category: null, categoryName: '' });
    
    await Category.findByIdAndDelete(id);
    
    res.json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({ message: 'Failed to delete category' });
  }
});

// Get products count by category
app.get('/api/categories/:id/products-count', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const count = await Product.countDocuments({ category: id });
    res.json({
      success: true,
      count
    });
  } catch (error) {
    console.error('Get products count error:', error);
    res.status(500).json({ message: 'Failed to get products count' });
  }
});

// ============ STATISTICS ROUTES ============

// Get category distribution for pie chart
app.get('/api/stats/category-distribution', authMiddleware, async (req, res) => {
  try {
    const categories = await Category.find();
    const distribution = [];
    
    // Get count for each category
    for (const category of categories) {
      const count = await Product.countDocuments({ category: category._id });
      if (count > 0) {
        distribution.push({
          name: category.name,
          color: category.color,
          count
        });
      }
    }
    
    // Get uncategorized count
    const uncategorizedCount = await Product.countDocuments({ category: null });
    if (uncategorizedCount > 0) {
      distribution.push({
        name: 'Uncategorized',
        color: '#6b7280',
        count: uncategorizedCount
      });
    }
    
    res.json({
      success: true,
      distribution
    });
  } catch (error) {
    console.error('Get category distribution error:', error);
    res.status(500).json({ message: 'Failed to get category distribution' });
  }
});

// Get dashboard stats
app.get('/api/stats/dashboard', authMiddleware, async (req, res) => {
  try {
    const products = await Product.find();
    
    // Calculate totals
    let totalProducts = products.length;
    let totalBuyValue = 0;
    let totalSellValue = 0;
    
    for (const product of products) {
      totalBuyValue += (product.currentStock || 0) * (product.buyingPrice || 0);
      totalSellValue += (product.currentStock || 0) * (product.sellingPrice || 0);
    }
    
    // Calculate monthly profit (from stock history this month)
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    let monthlyBought = 0;
    let monthlySold = 0;
    
    for (const product of products) {
      for (const history of product.stockHistory) {
        if (new Date(history.createdAt) >= startOfMonth) {
          if (history.type === 'add') {
            monthlyBought += history.quantity * (product.buyingPrice || 0);
          } else if (history.type === 'remove') {
            monthlySold += history.quantity * (product.sellingPrice || 0);
          }
        }
      }
    }
    
    const monthlyProfit = monthlySold - monthlyBought;
    
    res.json({
      success: true,
      stats: {
        totalProducts,
        totalBuyValue: Math.round(totalBuyValue * 100) / 100,
        totalSellValue: Math.round(totalSellValue * 100) / 100,
        monthlyProfit: Math.round(monthlyProfit * 100) / 100
      }
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ message: 'Failed to get dashboard stats' });
  }
});

// Get inventory value over time for line chart
app.get('/api/stats/inventory-value', authMiddleware, async (req, res) => {
  try {
    // Get days parameter (default 30)
    const days = parseInt(req.query.days) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);
    
    // Get all products with stock history
    const products = await Product.find();
    
    // Create a map of daily values
    const dailyData = new Map();
    
    // Process each product's stock history
    for (const product of products) {
      for (const history of product.stockHistory) {
        const historyDate = new Date(history.createdAt);
        if (historyDate < startDate) continue;
        
        const date = historyDate.toISOString().split('T')[0];
        
        if (!dailyData.has(date)) {
          dailyData.set(date, { bought: 0, sold: 0 });
        }
        
        const dayData = dailyData.get(date);
        
        if (history.type === 'add') {
          // Bought items: quantity × buying price
          dayData.bought += history.quantity * (product.buyingPrice || 0);
        } else if (history.type === 'remove') {
          // Sold items: quantity × selling price
          dayData.sold += history.quantity * (product.sellingPrice || 0);
        }
      }
    }
    
    // Convert to array and sort by date
    const sortedDates = Array.from(dailyData.keys()).sort();
    
    // Calculate cumulative values
    let cumulativeBought = 0;
    let cumulativeSold = 0;
    const chartData = sortedDates.map(date => {
      const dayData = dailyData.get(date);
      cumulativeBought += dayData.bought;
      cumulativeSold += dayData.sold;
      return {
        date,
        bought: Math.round(cumulativeBought * 100) / 100,
        sold: Math.round(cumulativeSold * 100) / 100,
        profit: Math.round((cumulativeSold - cumulativeBought) * 100) / 100
      };
    });
    
    res.json({
      success: true,
      data: chartData
    });
  } catch (error) {
    console.error('Get inventory value error:', error);
    res.status(500).json({ message: 'Failed to get inventory value' });
  }
});

// Start server
app.listen(config.PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${config.PORT}`);
});
