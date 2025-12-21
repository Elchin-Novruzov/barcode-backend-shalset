const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cron = require('node-cron');
const config = require('./config');
const User = require('./models/User');
const Scan = require('./models/Scan');

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

// Start server
app.listen(config.PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${config.PORT}`);
});
