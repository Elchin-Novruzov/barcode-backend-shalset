'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { getAllScans, Scan, PaginationInfo, getAllProducts, Product, getProductByBarcode, addStock, removeStock } from '@/lib/api';

type TabType = 'scans' | 'products';

export default function Home() {
  const { user, token, isLoading, login, logout } = useAuth();
  const [scans, setScans] = useState<Scan[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [loadingScans, setLoadingScans] = useState(false);
  const [error, setError] = useState('');
  
  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>('products');
  
  // Products state
  const [products, setProducts] = useState<Product[]>([]);
  const [productsPagination, setProductsPagination] = useState<PaginationInfo | null>(null);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [productsError, setProductsError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  
  // Stock management state
  const [stockAction, setStockAction] = useState<'add' | 'remove'>('add');
  const [stockQuantity, setStockQuantity] = useState('');
  const [stockNote, setStockNote] = useState('');
  const [stockSupplier, setStockSupplier] = useState('');
  const [stockLocation, setStockLocation] = useState('');
  const [stockLoading, setStockLoading] = useState(false);
  const [stockError, setStockError] = useState('');
  
  // Login form state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  const fetchScans = async (page = 1) => {
    if (!token) return;
    setLoadingScans(true);
    try {
      const data = await getAllScans(token, page, 50);
      setScans(data.scans);
      setPagination(data.pagination);
      setError('');
    } catch (err) {
      setError('Failed to load scans');
      console.error(err);
    } finally {
      setLoadingScans(false);
    }
  };

  const fetchProducts = async (page = 1, search = '') => {
    if (!token) return;
    setLoadingProducts(true);
    try {
      const data = await getAllProducts(token, page, 50, search);
      setProducts(data.products);
      setProductsPagination(data.pagination);
      setProductsError('');
    } catch (err) {
      setProductsError('Failed to load products');
      console.error(err);
    } finally {
      setLoadingProducts(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchScans();
      fetchProducts();
    }
  }, [token]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchProducts(1, searchQuery);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError('');
    try {
      await login(username, password);
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoginLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const openProductModal = async (product: Product) => {
    setSelectedProduct(product);
    setStockAction('add');
    setStockQuantity('');
    setStockNote('');
    setStockSupplier('');
    setStockLocation('');
    setStockError('');
    // Fetch full product with stock history
    if (token) {
      try {
        const fullProduct = await getProductByBarcode(token, product.barcode);
        setSelectedProduct(fullProduct);
      } catch (err) {
        console.error('Failed to load product details:', err);
      }
    }
  };

  const closeProductModal = () => {
    setSelectedProduct(null);
    setStockQuantity('');
    setStockNote('');
    setStockSupplier('');
    setStockLocation('');
    setStockError('');
  };

  const handleStockAction = async () => {
    if (!token || !selectedProduct) return;
    
    const qty = parseInt(stockQuantity);
    if (!qty || qty <= 0) {
      setStockError('Please enter a valid quantity');
      return;
    }

    if (stockAction === 'remove' && qty > selectedProduct.currentStock) {
      setStockError(`Cannot remove ${qty}. Only ${selectedProduct.currentStock} in stock.`);
      return;
    }

    setStockLoading(true);
    setStockError('');

    try {
      if (stockAction === 'add') {
        await addStock(token, selectedProduct.barcode, qty, stockNote, stockSupplier);
      } else {
        await removeStock(token, selectedProduct.barcode, qty, stockNote, stockLocation);
      }
      
      // Refresh the product and products list
      const updatedProduct = await getProductByBarcode(token, selectedProduct.barcode);
      setSelectedProduct(updatedProduct);
      fetchProducts(productsPagination?.page || 1, searchQuery);
      
      // Clear form
      setStockQuantity('');
      setStockNote('');
      setStockSupplier('');
      setStockLocation('');
    } catch (err) {
      setStockError(err instanceof Error ? err.message : 'Failed to update stock');
    } finally {
      setStockLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Login Screen
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Barcode Scanner</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">Admin Panel</p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-6">
            {loginError && (
              <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg">
                {loginError}
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder="Enter username"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder="Enter password"
                required
              />
            </div>
            
            <button
              type="submit"
              disabled={loginLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loginLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Dashboard
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Warehouse Admin</h1>
          <div className="flex items-center gap-4">
            <span className="text-gray-600 dark:text-gray-400">Welcome, {user.fullName}</span>
            <button
              onClick={logout}
              className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg transition"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('products')}
            className={`px-6 py-3 font-medium text-sm rounded-t-lg transition ${
              activeTab === 'products'
                ? 'bg-white dark:bg-gray-800 text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            Products ({productsPagination?.total || 0})
          </button>
          <button
            onClick={() => setActiveTab('scans')}
            className={`px-6 py-3 font-medium text-sm rounded-t-lg transition ${
              activeTab === 'scans'
                ? 'bg-white dark:bg-gray-800 text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            Scan History ({pagination?.total || 0})
          </button>
        </div>
      </div>

      {/* Products Tab */}
      {activeTab === 'products' && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex flex-wrap justify-between items-center gap-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Inventory Products</h2>
              <div className="flex gap-2">
                <form onSubmit={handleSearch} className="flex gap-2">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by name or barcode..."
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                  <button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
                  >
                    Search
                  </button>
                </form>
                <button
                  onClick={() => { setSearchQuery(''); fetchProducts(1); }}
                  disabled={loadingProducts}
                  className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg transition disabled:opacity-50"
                >
                  {loadingProducts ? 'Loading...' : 'Refresh'}
                </button>
              </div>
            </div>

            {productsError && (
              <div className="px-6 py-4 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                {productsError}
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Barcode
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Product Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Stock
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Note
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Created By
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Last Updated
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {products.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                        {loadingProducts ? 'Loading products...' : 'No products found'}
                      </td>
                    </tr>
                  ) : (
                    products.map((product) => (
                      <tr key={product._id} className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer" onClick={() => openProductModal(product)}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="font-mono text-sm bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                            {product.barcode}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">{product.name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1 text-sm font-semibold rounded-full ${
                            product.currentStock > 10
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                              : product.currentStock > 0
                              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
                              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                          }`}>
                            {product.currentStock}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-600 dark:text-gray-300 max-w-xs truncate">
                            {product.note || '-'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                          {product.createdByName || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                          {formatDate(product.updatedAt)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Products Pagination */}
            {productsPagination && productsPagination.pages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Showing page {productsPagination.page} of {productsPagination.pages}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => fetchProducts(productsPagination.page - 1, searchQuery)}
                    disabled={productsPagination.page <= 1 || loadingProducts}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => fetchProducts(productsPagination.page + 1, searchQuery)}
                    disabled={productsPagination.page >= productsPagination.pages || loadingProducts}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Product Detail Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={closeProductModal}>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{selectedProduct.name}</h3>
              <button onClick={closeProductModal} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-2xl">
                &times;
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[75vh]">
              {/* Product Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Barcode</p>
                  <p className="font-mono text-sm bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded inline-block">{selectedProduct.barcode}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Current Stock</p>
                  <p className={`text-3xl font-bold ${selectedProduct.currentStock > 0 ? 'text-green-600' : 'text-red-600'}`}>{selectedProduct.currentStock}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Created By</p>
                  <p className="text-gray-900 dark:text-white text-sm">{selectedProduct.createdByName || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Last Updated</p>
                  <p className="text-gray-900 dark:text-white text-sm">{formatDate(selectedProduct.updatedAt)}</p>
                </div>
              </div>

              {/* Pricing and Location Info */}
              {(selectedProduct.buyingPrice || selectedProduct.sellingPrice || selectedProduct.boughtFrom || selectedProduct.sellLocation) && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  {selectedProduct.buyingPrice !== undefined && selectedProduct.buyingPrice > 0 && (
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Buying Price</p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">${selectedProduct.buyingPrice.toFixed(2)}</p>
                    </div>
                  )}
                  {selectedProduct.sellingPrice !== undefined && selectedProduct.sellingPrice > 0 && (
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Selling Price</p>
                      <p className="text-lg font-semibold text-green-600 dark:text-green-400">${selectedProduct.sellingPrice.toFixed(2)}</p>
                    </div>
                  )}
                  {selectedProduct.boughtFrom && (
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Default Supplier</p>
                      <p className="text-gray-900 dark:text-white text-sm">{selectedProduct.boughtFrom}</p>
                    </div>
                  )}
                  {selectedProduct.sellLocation && (
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Default Sell Location</p>
                      <p className="text-gray-900 dark:text-white text-sm">{selectedProduct.sellLocation}</p>
                    </div>
                  )}
                </div>
              )}

              {selectedProduct.note && (
                <div className="mb-6">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Product Note</p>
                  <p className="text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">{selectedProduct.note}</p>
                </div>
              )}

              {/* Stock Management */}
              <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Manage Stock</h4>
                
                {/* Action Toggle */}
                <div className="flex gap-2 mb-4">
                  <button
                    onClick={() => { setStockAction('add'); setStockError(''); }}
                    className={`flex-1 py-2 px-4 rounded-lg font-medium transition ${
                      stockAction === 'add'
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500'
                    }`}
                  >
                    + Add Stock
                  </button>
                  <button
                    onClick={() => { setStockAction('remove'); setStockError(''); }}
                    className={`flex-1 py-2 px-4 rounded-lg font-medium transition ${
                      stockAction === 'remove'
                        ? 'bg-red-600 text-white'
                        : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500'
                    }`}
                  >
                    - Remove Stock
                  </button>
                </div>

                {/* Quantity and Note */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Quantity to {stockAction === 'add' ? 'Add' : 'Remove'}
                    </label>
                    <input
                      type="number"
                      value={stockQuantity}
                      onChange={(e) => setStockQuantity(e.target.value)}
                      placeholder="Enter quantity"
                      min="1"
                      className={`w-full px-4 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 dark:bg-gray-600 dark:text-white ${
                        stockAction === 'add'
                          ? 'border-green-300 focus:ring-green-500'
                          : 'border-red-300 focus:ring-red-500'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {stockAction === 'add' ? 'Supplier (Where bought from)' : 'Store/Location (Where sold)'}
                    </label>
                    <input
                      type="text"
                      value={stockAction === 'add' ? stockSupplier : stockLocation}
                      onChange={(e) => stockAction === 'add' ? setStockSupplier(e.target.value) : setStockLocation(e.target.value)}
                      placeholder={stockAction === 'add' ? 'e.g., ABC Supplier' : 'e.g., Main Store'}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-600 dark:text-white"
                    />
                  </div>
                </div>

                {/* Note */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Note (Optional)
                  </label>
                  <input
                    type="text"
                    value={stockNote}
                    onChange={(e) => setStockNote(e.target.value)}
                    placeholder={stockAction === 'add' ? 'e.g., Monthly restock' : 'e.g., Online order #1234'}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-600 dark:text-white"
                  />
                </div>

                {stockError && (
                  <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg text-sm">
                    {stockError}
                  </div>
                )}

                <button
                  onClick={handleStockAction}
                  disabled={stockLoading || !stockQuantity}
                  className={`w-full py-3 rounded-lg font-semibold text-white transition disabled:opacity-50 disabled:cursor-not-allowed ${
                    stockAction === 'add'
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {stockLoading ? 'Processing...' : (stockAction === 'add' ? '+ Add Stock' : '- Remove Stock')}
                </button>
              </div>

              {/* Stock History */}
              {selectedProduct.stockHistory && selectedProduct.stockHistory.length > 0 && (
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Stock History ({selectedProduct.stockHistory.length} records)</h4>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {selectedProduct.stockHistory.slice().reverse().map((history, idx) => (
                      <div key={idx} className={`p-4 rounded-lg border-l-4 ${
                        history.type === 'add' 
                          ? 'bg-green-50 dark:bg-green-900/20 border-green-500' 
                          : 'bg-red-50 dark:bg-red-900/20 border-red-500'
                      }`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className={`px-3 py-1 text-sm font-bold rounded ${
                            history.type === 'add' 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' 
                              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                          }`}>
                            {history.type === 'add' ? '+' : '-'}{history.quantity} units
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">{formatDate(history.createdAt)}</span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                          {/* Supplier or Location */}
                          {history.type === 'add' && history.supplier && (
                            <div>
                              <span className="text-gray-500 dark:text-gray-400">Supplier: </span>
                              <span className="text-gray-800 dark:text-gray-200 font-medium">{history.supplier}</span>
                            </div>
                          )}
                          {history.type === 'remove' && history.location && (
                            <div>
                              <span className="text-gray-500 dark:text-gray-400">Sold at: </span>
                              <span className="text-gray-800 dark:text-gray-200 font-medium">{history.location}</span>
                            </div>
                          )}
                          
                          {/* By user */}
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">By: </span>
                            <span className="text-gray-800 dark:text-gray-200">{history.addedByName}</span>
                          </div>
                        </div>
                        
                        {/* Note */}
                        {history.note && (
                          <div className="mt-2 text-sm">
                            <span className="text-gray-500 dark:text-gray-400">Note: </span>
                            <span className="text-gray-700 dark:text-gray-300 italic">{history.note}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Scans Tab */}
      {activeTab === 'scans' && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">All Scans</h2>
            <button
              onClick={() => fetchScans(pagination?.page || 1)}
              disabled={loadingScans}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition disabled:opacity-50"
            >
              {loadingScans ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>

          {error && (
            <div className="px-6 py-4 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Barcode
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Scanned At
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Mode
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Device
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {scans.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                      {loadingScans ? 'Loading scans...' : 'No scans found'}
                    </td>
                  </tr>
                ) : (
                  scans.map((scan) => (
                    <tr key={scan._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-mono text-sm bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                          {scan.barcode}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">{scan.userFullName}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">@{scan.username}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                        {formatDate(scan.scannedAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          scan.scanMode === 'camera' 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' 
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
                        }`}>
                          {scan.scanMode}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                        {scan.deviceInfo || '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination && pagination.pages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Showing page {pagination.page} of {pagination.pages}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => fetchScans(pagination.page - 1)}
                  disabled={pagination.page <= 1 || loadingScans}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Previous
                </button>
                <button
                  onClick={() => fetchScans(pagination.page + 1)}
                  disabled={pagination.page >= pagination.pages || loadingScans}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      )}
    </div>
  );
}
