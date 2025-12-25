// API Configuration

// Production API URL (Render)
const API_URL = 'https://barcode-backend-shalset.onrender.com';

export { API_URL };

export const API_ENDPOINTS = {
  LOGIN: `${API_URL}/api/auth/login`,
  ME: `${API_URL}/api/auth/me`,
  LOGOUT: `${API_URL}/api/auth/logout`,
  UPDATE_PROFILE: `${API_URL}/api/auth/profile`,
  HEALTH: `${API_URL}/api/health`,
  // Scan endpoints
  SCANS: `${API_URL}/api/scans`,
  MY_SCANS: `${API_URL}/api/scans/my`,
  ALL_SCANS: `${API_URL}/api/scans/all`,
  SCAN_STATS: `${API_URL}/api/scans/stats`,
  // Product/Inventory endpoints
  PRODUCTS: `${API_URL}/api/products`,
  CHECK_PRODUCT: (barcode: string) => `${API_URL}/api/products/check/${barcode}`,
  GET_PRODUCT: (barcode: string) => `${API_URL}/api/products/${barcode}`,
  ADD_STOCK: (barcode: string) => `${API_URL}/api/products/${barcode}/add-stock`,
  REMOVE_STOCK: (barcode: string) => `${API_URL}/api/products/${barcode}/remove-stock`,
  // Category endpoints
  CATEGORIES: `${API_URL}/api/categories`,
  // Stats endpoints
  STATS_DASHBOARD: `${API_URL}/api/stats/dashboard`,
  STATS_CATEGORY_DISTRIBUTION: `${API_URL}/api/stats/category-distribution`,
};
