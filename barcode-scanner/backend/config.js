module.exports = {
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://admin:Testpassword2%40@145.223.82.48:27017/shalset-barcode?authSource=admin',
  JWT_SECRET: process.env.JWT_SECRET || 'shalset-barcode-scanner-secret-key-2024',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '30d',
  PORT: process.env.PORT || 3001
};
