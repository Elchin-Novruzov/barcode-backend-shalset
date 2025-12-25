// API Configuration
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://barcode-backend-shalset.onrender.com';

export const API_ENDPOINTS = {
  LOGIN: `${API_URL}/api/auth/login`,
  ME: `${API_URL}/api/auth/me`,
  LOGOUT: `${API_URL}/api/auth/logout`,
  HEALTH: `${API_URL}/api/health`,
  SCANS: `${API_URL}/api/scans`,
  MY_SCANS: `${API_URL}/api/scans/my`,
  ALL_SCANS: `${API_URL}/api/scans/all`,
  SCAN_STATS: `${API_URL}/api/scans/stats`,
  PRODUCTS: `${API_URL}/api/products`,
};

export interface User {
  id: string;
  username: string;
  fullName: string;
}

export interface Scan {
  _id: string;
  barcode: string;
  user: string;
  username: string;
  userFullName: string;
  scannedAt: string;
  scanMode: 'keyboard' | 'camera';
  deviceInfo?: string;
  location?: string;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface StockHistoryItem {
  quantity: number;
  type: 'add' | 'remove';
  note: string;
  supplier?: string;  // Where items were bought from (for 'add')
  location?: string;  // Where items were sold/moved to (for 'remove')
  addedByName: string;
  createdAt: string;
}

export interface Product {
  _id: string;
  barcode: string;
  name: string;
  currentStock: number;
  note: string;
  buyingPrice?: number;
  sellingPrice?: number;
  boughtFrom?: string;
  sellLocation?: string;
  stockHistory: StockHistoryItem[];
  createdByName: string;
  createdAt: string;
  updatedAt: string;
}

export async function login(username: string, password: string): Promise<{ token: string; user: User }> {
  const response = await fetch(API_ENDPOINTS.LOGIN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Login failed');
  }
  
  return response.json();
}

export async function getMe(token: string): Promise<User> {
  const response = await fetch(API_ENDPOINTS.ME, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  
  if (!response.ok) {
    throw new Error('Failed to get user');
  }
  
  const data = await response.json();
  return data.user;
}

export async function getAllScans(token: string, page = 1, limit = 50): Promise<{ scans: Scan[]; pagination: PaginationInfo }> {
  const response = await fetch(`${API_ENDPOINTS.ALL_SCANS}?page=${page}&limit=${limit}`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  
  if (!response.ok) {
    throw new Error('Failed to get scans');
  }
  
  return response.json();
}

export async function getScanStats(token: string): Promise<{ totalScans: number; todayScans: number; recentScans: Scan[] }> {
  const response = await fetch(API_ENDPOINTS.SCAN_STATS, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  
  if (!response.ok) {
    throw new Error('Failed to get stats');
  }
  
  const data = await response.json();
  return data.stats;
}

export async function getAllProducts(token: string, page = 1, limit = 50, search = ''): Promise<{ products: Product[]; pagination: PaginationInfo }> {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (search) params.append('search', search);
  
  const response = await fetch(`${API_ENDPOINTS.PRODUCTS}?${params}`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  
  if (!response.ok) {
    throw new Error('Failed to get products');
  }
  
  return response.json();
}

export async function getProductByBarcode(token: string, barcode: string): Promise<Product> {
  const response = await fetch(`${API_ENDPOINTS.PRODUCTS}/${barcode}`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  
  if (!response.ok) {
    throw new Error('Failed to get product');
  }
  
  const data = await response.json();
  return data.product;
}

export async function addStock(token: string, barcode: string, quantity: number, note: string, supplier?: string): Promise<Product> {
  const response = await fetch(`${API_ENDPOINTS.PRODUCTS}/${barcode}/add-stock`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ quantity, note, supplier }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to add stock');
  }
  
  const data = await response.json();
  return data.product;
}

export async function removeStock(token: string, barcode: string, quantity: number, note: string, location?: string): Promise<Product> {
  const response = await fetch(`${API_ENDPOINTS.PRODUCTS}/${barcode}/remove-stock`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ quantity, note, location }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to remove stock');
  }
  
  const data = await response.json();
  return data.product;
}
