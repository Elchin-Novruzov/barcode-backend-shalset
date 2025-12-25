const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cron = require('node-cron');
const config = require('./config');
const User = require('./models/User');
const Scan = require('./models/Scan');
const Product = require('./models/Product');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

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
        fullName: user.fullName
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
      fullName: req.user.fullName
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
    const { barcode, name, quantity, note, buyingPrice, sellingPrice, boughtFrom, sellLocation } = req.body;
    
    if (!barcode || !name) {
      return res.status(400).json({ message: 'Barcode and name are required' });
    }
    
    // Check if product already exists
    const existingProduct = await Product.findOne({ barcode: barcode.trim() });
    if (existingProduct) {
      return res.status(409).json({ message: 'Product with this barcode already exists' });
    }
    
    const initialQuantity = parseInt(quantity) || 0;
    
    const product = new Product({
      barcode: barcode.trim(),
      name: name.trim(),
      currentStock: initialQuantity,
      note: note || '',
      buyingPrice: parseFloat(buyingPrice) || 0,
      sellingPrice: parseFloat(sellingPrice) || 0,
      boughtFrom: boughtFrom?.trim() || '',
      sellLocation: sellLocation?.trim() || '',
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
        sellLocation: product.sellLocation
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
    
    const query = search ? {
      $or: [
        { name: { $regex: search, $options: 'i' } },
        { barcode: { $regex: search, $options: 'i' } }
      ]
    } : {};
    
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

// Start server
app.listen(config.PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${config.PORT}`);
});
