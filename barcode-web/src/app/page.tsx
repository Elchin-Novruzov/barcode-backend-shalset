'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { getAllScans, Scan, PaginationInfo, getAllProducts, Product, getProductByBarcode, addStock, removeStock, updateProduct, getCategories, createCategory, updateCategory as updateCategoryApi, deleteCategory, Category, getCategoryDistribution, getInventoryValue, getDashboardStats, CategoryDistributionItem, InventoryValueItem, DashboardStats, getAllUsers, createUser, updateUser, deleteUser, UserAccount } from '@/lib/api';
import { translations, Language, languageNames, languageFlags } from '@/lib/translations';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { Pie, Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  ChartDataLabels
);

type PageType = 'dashboard' | 'inventory' | 'history' | 'categories' | 'users';

export default function Home() {
  const router = useRouter();
  const { user, token, isLoading, login, logout } = useAuth();
  const [activePage, setActivePage] = useState<PageType>('dashboard');
  
  // Language state
  const [language, setLanguage] = useState<Language>('en');
  const [showLangDropdown, setShowLangDropdown] = useState(false);
  const t = translations[language];
  
  // Scans state
  const [scans, setScans] = useState<Scan[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [loadingScans, setLoadingScans] = useState(false);
  const [error, setError] = useState('');
  
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
  
  // Edit product state
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editNote, setEditNote] = useState('');
  const [editBuyingPrice, setEditBuyingPrice] = useState('');
  const [editSellingPrice, setEditSellingPrice] = useState('');
  const [editBoughtFrom, setEditBoughtFrom] = useState('');
  const [editSellLocation, setEditSellLocation] = useState('');
  const [editImageUrl, setEditImageUrl] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');
  
  // Login form state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  
  // Category state
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('');
  const [editCategory, setEditCategory] = useState<Category | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDescription, setNewCategoryDescription] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('#3b82f6');
  const [categoryError, setCategoryError] = useState('');
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editProductCategory, setEditProductCategory] = useState('');

  // Dashboard stats
  const [stats, setStats] = useState<DashboardStats>({
    totalProducts: 0,
    totalBuyValue: 0,
    totalSellValue: 0,
    monthlyProfit: 0
  });
  
  // Chart data
  const [categoryDistribution, setCategoryDistribution] = useState<CategoryDistributionItem[]>([]);
  const [inventoryValue, setInventoryValue] = useState<InventoryValueItem[]>([]);
  const [inventoryDays, setInventoryDays] = useState(30);
  
  // User Management state
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [newUserUsername, setNewUserUsername] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserFullName, setNewUserFullName] = useState('');
  const [newUserRole, setNewUserRole] = useState<'admin' | 'user'>('user');
  const [userError, setUserError] = useState('');
  const [userLoading, setUserLoading] = useState(false);

  const fetchScans = async (page = 1) => {
    if (!token) return;
    setLoadingScans(true);
    try {
      const data = await getAllScans(token, page, 50);
      setScans(data.scans);
      setPagination(data.pagination);
      setError('');
    } catch (err) {
      setError(t.failedToLoadScans);
      console.error(err);
    } finally {
      setLoadingScans(false);
    }
  };

  const fetchProducts = async (page = 1, search = '', category = '') => {
    if (!token) return;
    setLoadingProducts(true);
    try {
      const data = await getAllProducts(token, page, 50, search, category);
      setProducts(data.products);
      setProductsPagination(data.pagination);
      setProductsError('');
      
      // Calculate stats
      const totalStock = data.products.reduce((sum, p) => sum + p.currentStock, 0);
      const lowStock = data.products.filter(p => p.currentStock <= 10).length;
      setStats(prev => ({
        ...prev,
        totalProducts: data.pagination.total,
        totalStock,
        lowStockCount: lowStock
      }));
    } catch (err) {
      setProductsError(t.failedToLoadProducts);
      console.error(err);
    } finally {
      setLoadingProducts(false);
    }
  };
  
  const fetchCategories = async () => {
    if (!token) return;
    setLoadingCategories(true);
    try {
      const data = await getCategories(token);
      setCategories(data);
    } catch (err) {
      console.error('Failed to load categories', err);
    } finally {
      setLoadingCategories(false);
    }
  };
  
  const fetchChartData = async (days = inventoryDays) => {
    if (!token) return;
    try {
      const [distData, valueData, dashStats] = await Promise.all([
        getCategoryDistribution(token),
        getInventoryValue(token, days),
        getDashboardStats(token)
      ]);
      setCategoryDistribution(distData);
      setInventoryValue(valueData);
      setStats(dashStats);
    } catch (err) {
      console.error('Failed to load chart data', err);
    }
  };
  
  const handleInventoryDaysChange = (days: number) => {
    setInventoryDays(days);
    if (token) {
      getInventoryValue(token, days).then(data => setInventoryValue(data)).catch(console.error);
    }
  };
  
  const fetchUsers = async () => {
    if (!token || user?.role !== 'admin') return;
    setLoadingUsers(true);
    try {
      const data = await getAllUsers(token);
      setUsers(data);
    } catch (err) {
      console.error('Failed to load users', err);
    } finally {
      setLoadingUsers(false);
    }
  };
  
  const handleCreateUser = async () => {
    if (!token) return;
    if (!newUserUsername.trim() || !newUserFullName.trim()) {
      setUserError('Username and full name are required');
      return;
    }
    if (!editingUser && !newUserPassword.trim()) {
      setUserError('Password is required');
      return;
    }
    setUserLoading(true);
    setUserError('');
    try {
      if (editingUser) {
        const updateData: { username?: string; fullName?: string; role?: 'admin' | 'user'; password?: string } = {
          username: newUserUsername,
          fullName: newUserFullName,
          role: newUserRole
        };
        if (newUserPassword.trim()) {
          updateData.password = newUserPassword;
        }
        await updateUser(token, editingUser._id, updateData);
      } else {
        await createUser(token, {
          username: newUserUsername,
          password: newUserPassword,
          fullName: newUserFullName,
          role: newUserRole
        });
      }
      setShowUserForm(false);
      setEditingUser(null);
      setNewUserUsername('');
      setNewUserPassword('');
      setNewUserFullName('');
      setNewUserRole('user');
      fetchUsers();
    } catch (err) {
      setUserError(err instanceof Error ? err.message : 'Failed to save user');
    } finally {
      setUserLoading(false);
    }
  };
  
  const handleDeleteUser = async (userId: string) => {
    if (!token) return;
    if (userId === user?.id) {
      alert(t.cannotDeleteSelf);
      return;
    }
    if (!confirm(t.confirmDeleteUser)) return;
    try {
      await deleteUser(token, userId);
      fetchUsers();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete user');
    }
  };
  
  const openEditUser = (userToEdit: UserAccount) => {
    setEditingUser(userToEdit);
    setNewUserUsername(userToEdit.username);
    setNewUserFullName(userToEdit.fullName);
    setNewUserRole(userToEdit.role);
    setNewUserPassword('');
    setUserError('');
    setShowUserForm(true);
  };
  
  const openNewUserForm = () => {
    setEditingUser(null);
    setNewUserUsername('');
    setNewUserPassword('');
    setNewUserFullName('');
    setNewUserRole('user');
    setUserError('');
    setShowUserForm(true);
  };

  useEffect(() => {
    if (token) {
      fetchScans();
      fetchProducts();
      fetchCategories();
      fetchChartData();
      if (user?.role === 'admin') {
        fetchUsers();
      }
    }
  }, [token, user?.role]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchProducts(1, searchQuery, selectedCategoryFilter);
  };
  
  const handleCategoryFilterChange = (categoryId: string) => {
    setSelectedCategoryFilter(categoryId);
    fetchProducts(1, searchQuery, categoryId);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError('');
    try {
      await login(username, password);
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : t.loginFailed);
    } finally {
      setLoginLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getCurrentDate = () => {
    return new Date().toLocaleDateString('en-US', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    });
  };

  const openProductModal = async (product: Product) => {
    setSelectedProduct(product);
    setStockAction('add');
    setStockQuantity('');
    setStockNote('');
    setStockSupplier('');
    setStockLocation('');
    setStockError('');
    if (token) {
      try {
        const fullProduct = await getProductByBarcode(token, product.barcode);
        setSelectedProduct(fullProduct);
      } catch (err) {
        console.error(t.failedToLoadProductDetails, err);
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
    setIsEditing(false);
    setEditError('');
  };

  const startEditing = () => {
    if (selectedProduct) {
      setEditName(selectedProduct.name);
      setEditNote(selectedProduct.note || '');
      setEditBuyingPrice(selectedProduct.buyingPrice?.toString() || '');
      setEditSellingPrice(selectedProduct.sellingPrice?.toString() || '');
      setEditBoughtFrom(selectedProduct.boughtFrom || '');
      setEditSellLocation(selectedProduct.sellLocation || '');
      setEditImageUrl(selectedProduct.imageUrl || '');
      setEditProductCategory(selectedProduct.category || '');
      setIsEditing(true);
      setEditError('');
    }
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditError('');
  };

  const handleSaveEdit = async () => {
    if (!token || !selectedProduct) return;
    if (!editName.trim()) {
      setEditError(t.productNameRequired);
      return;
    }
    setEditLoading(true);
    setEditError('');
    try {
      const updatedProduct = await updateProduct(token, selectedProduct.barcode, {
        name: editName.trim(),
        note: editNote.trim(),
        buyingPrice: parseFloat(editBuyingPrice) || 0,
        sellingPrice: parseFloat(editSellingPrice) || 0,
        boughtFrom: editBoughtFrom.trim(),
        sellLocation: editSellLocation.trim(),
        imageUrl: editImageUrl.trim(),
        category: editProductCategory || null,
      });
      setSelectedProduct(updatedProduct);
      setIsEditing(false);
      fetchProducts(productsPagination?.page || 1, searchQuery, selectedCategoryFilter);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : t.failedToUpdateProduct);
    } finally {
      setEditLoading(false);
    }
  };

  const handleStockAction = async () => {
    if (!token || !selectedProduct) return;
    const qty = parseInt(stockQuantity);
    if (!qty || qty <= 0) {
      setStockError(t.enterValidQuantity);
      return;
    }
    if (stockAction === 'remove' && qty > selectedProduct.currentStock) {
      setStockError(`${t.cannotRemove} ${qty}. ${t.onlyInStock} ${selectedProduct.currentStock} ${t.inStock}.`);
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
      const updatedProduct = await getProductByBarcode(token, selectedProduct.barcode);
      setSelectedProduct(updatedProduct);
      fetchProducts(productsPagination?.page || 1, searchQuery, selectedCategoryFilter);
      setStockQuantity('');
      setStockNote('');
      setStockSupplier('');
      setStockLocation('');
    } catch (err) {
      setStockError(err instanceof Error ? err.message : t.failedToUpdateStock);
    } finally {
      setStockLoading(false);
    }
  };
  
  // Category functions
  const resetCategoryForm = () => {
    setNewCategoryName('');
    setNewCategoryDescription('');
    setNewCategoryColor('#3b82f6');
    setEditCategory(null);
    setShowCategoryForm(false);
    setCategoryError('');
  };
  
  const handleCreateCategory = async () => {
    if (!token) return;
    if (!newCategoryName.trim()) {
      setCategoryError(t.categoryNameRequired);
      return;
    }
    setCategoryLoading(true);
    setCategoryError('');
    try {
      await createCategory(token, newCategoryName.trim(), newCategoryDescription.trim(), newCategoryColor);
      await fetchCategories();
      resetCategoryForm();
    } catch (err) {
      setCategoryError(err instanceof Error ? err.message : 'Failed to create category');
    } finally {
      setCategoryLoading(false);
    }
  };
  
  const handleUpdateCategory = async () => {
    if (!token || !editCategory) return;
    if (!newCategoryName.trim()) {
      setCategoryError(t.categoryNameRequired);
      return;
    }
    setCategoryLoading(true);
    setCategoryError('');
    try {
      await updateCategoryApi(token, editCategory._id, newCategoryName.trim(), newCategoryDescription.trim(), newCategoryColor);
      await fetchCategories();
      resetCategoryForm();
    } catch (err) {
      setCategoryError(err instanceof Error ? err.message : 'Failed to update category');
    } finally {
      setCategoryLoading(false);
    }
  };
  
  const handleDeleteCategory = async (categoryId: string) => {
    if (!token) return;
    if (!confirm(t.confirmDeleteCategory)) return;
    try {
      await deleteCategory(token, categoryId);
      await fetchCategories();
      if (selectedCategoryFilter === categoryId) {
        setSelectedCategoryFilter('');
        fetchProducts(1, searchQuery, '');
      }
    } catch (err) {
      console.error('Failed to delete category', err);
    }
  };
  
  const startEditCategory = (category: Category) => {
    setEditCategory(category);
    setNewCategoryName(category.name);
    setNewCategoryDescription(category.description);
    setNewCategoryColor(category.color);
    setShowCategoryForm(true);
    setCategoryError('');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1a1f37]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400"></div>
      </div>
    );
  }

  // Login Screen
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1a1f37] to-[#0d1025]">
        <div className="bg-[#232a4d] p-8 rounded-2xl shadow-2xl w-full max-w-md border border-[#2d3561]">
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <img src="/logo-shalset.png" alt="Shalset" className="w-16 h-16 object-contain" />
            </div>
            <h1 className="text-2xl font-bold text-white">{t.warehouseAdmin}</h1>
            <p className="text-gray-400 mt-2">{t.signInToAccount}</p>
          </div>
          
          {/* Language Selector on Login */}
          <div className="flex justify-center gap-2 mb-6">
            {(['en', 'az', 'ru'] as Language[]).map((lang) => (
              <button
                key={lang}
                onClick={() => setLanguage(lang)}
                className={`px-3 py-2 rounded-lg text-sm transition ${language === lang ? 'bg-cyan-500 text-white' : 'bg-[#1a1f37] text-gray-400 hover:bg-[#2d3561]'}`}
              >
                {languageFlags[lang]} {languageNames[lang]}
              </button>
            ))}
          </div>
          
          <form onSubmit={handleLogin} className="space-y-5">
            {loginError && (
              <div className="bg-red-500/20 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm">
                {loginError}
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">{t.username}</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 bg-[#1a1f37] border border-[#2d3561] rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-white placeholder-gray-500"
                placeholder={t.enterUsername}
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">{t.password}</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-[#1a1f37] border border-[#2d3561] rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-white placeholder-gray-500"
                placeholder={t.enterPassword}
                required
              />
            </div>
            
            <button
              type="submit"
              disabled={loginLoading}
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-semibold py-3 px-4 rounded-lg transition duration-200 disabled:opacity-50"
            >
              {loginLoading ? t.signingIn : t.signIn}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Main Dashboard
  return (
    <div className="min-h-screen bg-[#1a1f37] flex">
      {/* Left Sidebar */}
      <aside className="w-20 bg-[#232a4d] border-r border-[#2d3561] flex flex-col items-center py-6 fixed h-full">
        {/* Logo */}
        <div className="w-12 h-12 flex items-center justify-center mb-10">
          <img src="/logo-shalset.png" alt="Shalset" className="w-12 h-12 object-contain" />
        </div>
        
        {/* Navigation */}
        <nav className="flex flex-col gap-4 flex-1">
          <button
            onClick={() => setActivePage('dashboard')}
            className={`w-12 h-12 rounded-xl flex items-center justify-center transition ${
              activePage === 'dashboard' 
                ? 'bg-cyan-500/20 text-cyan-400' 
                : 'text-gray-400 hover:bg-[#2d3561] hover:text-white'
            }`}
            title={t.dashboard}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </button>
          
          <button
            onClick={() => setActivePage('inventory')}
            className={`w-12 h-12 rounded-xl flex items-center justify-center transition ${
              activePage === 'inventory' 
                ? 'bg-cyan-500/20 text-cyan-400' 
                : 'text-gray-400 hover:bg-[#2d3561] hover:text-white'
            }`}
            title={t.inventory}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </button>
          
          <button
            onClick={() => setActivePage('history')}
            className={`w-12 h-12 rounded-xl flex items-center justify-center transition ${
              activePage === 'history' 
                ? 'bg-cyan-500/20 text-cyan-400' 
                : 'text-gray-400 hover:bg-[#2d3561] hover:text-white'
            }`}
            title={t.scanHistory}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
          
          <button
            onClick={() => setActivePage('categories')}
            className={`w-12 h-12 rounded-xl flex items-center justify-center transition ${
              activePage === 'categories' 
                ? 'bg-cyan-500/20 text-cyan-400' 
                : 'text-gray-400 hover:bg-[#2d3561] hover:text-white'
            }`}
            title={t.categories}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
          </button>
          
          {/* Users - Admin only */}
          {user?.role === 'admin' && (
            <button
              onClick={() => setActivePage('users')}
              className={`w-12 h-12 rounded-xl flex items-center justify-center transition ${
                activePage === 'users' 
                  ? 'bg-cyan-500/20 text-cyan-400' 
                  : 'text-gray-400 hover:bg-[#2d3561] hover:text-white'
              }`}
              title={t.users}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </button>
          )}
        </nav>
        
        {/* Logout */}
        <button
          onClick={logout}
          className="w-12 h-12 rounded-xl flex items-center justify-center text-gray-400 hover:bg-red-500/20 hover:text-red-400 transition"
          title={t.logout}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-20">
        {/* Top Header */}
        <header className="bg-[#232a4d] border-b border-[#2d3561] px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold text-white">
              {t.hello}, {user.fullName}
            </h1>
            <div className="flex items-center gap-2 bg-[#1a1f37] px-4 py-2 rounded-lg text-gray-400 text-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {getCurrentDate()}
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Language Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowLangDropdown(!showLangDropdown)}
                className="flex items-center gap-2 bg-[#1a1f37] px-4 py-2 rounded-lg text-gray-300 hover:bg-[#2d3561] transition"
              >
                <span>{languageFlags[language]}</span>
                <span>{languageNames[language]}</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {showLangDropdown && (
                <div className="absolute right-0 mt-2 w-40 bg-[#232a4d] border border-[#2d3561] rounded-lg shadow-xl z-50">
                  {(['en', 'az', 'ru'] as Language[]).map((lang) => (
                    <button
                      key={lang}
                      onClick={() => { setLanguage(lang); setShowLangDropdown(false); }}
                      className={`w-full px-4 py-2 text-left flex items-center gap-2 hover:bg-[#2d3561] transition first:rounded-t-lg last:rounded-b-lg ${
                        language === lang ? 'text-cyan-400' : 'text-gray-300'
                      }`}
                    >
                      <span>{languageFlags[lang]}</span>
                      <span>{languageNames[lang]}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white font-semibold">{user.fullName.charAt(0)}</span>
              </div>
              <div>
                <p className="text-white text-sm font-medium">{user.fullName}</p>
                <p className="text-gray-400 text-xs">{user.role === 'admin' ? t.admin : t.userRole}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-8">
          {/* Dashboard Page */}
          {activePage === 'dashboard' && (
            <div className="space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-[#232a4d] rounded-2xl p-6 border border-[#2d3561]">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-cyan-500/20 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                    </div>
                    <span className="text-gray-400 text-sm">{t.totalProducts}</span>
                  </div>
                  <p className="text-3xl font-bold text-white">{stats.totalProducts}</p>
                  <p className="text-cyan-400 text-sm mt-2">{t.activeInventory}</p>
                </div>

                <div className="bg-[#232a4d] rounded-2xl p-6 border border-[#2d3561]">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <span className="text-gray-400 text-sm">{t.totalBuyValue}</span>
                  </div>
                  <p className="text-3xl font-bold text-white">{stats.totalBuyValue.toLocaleString()}</p>
                  <p className="text-red-400 text-sm mt-2">{t.basedOnBuyPrice}</p>
                </div>

                <div className="bg-[#232a4d] rounded-2xl p-6 border border-[#2d3561]">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <span className="text-gray-400 text-sm">{t.totalSellValue}</span>
                  </div>
                  <p className="text-3xl font-bold text-white">{stats.totalSellValue.toLocaleString()}</p>
                  <p className="text-green-400 text-sm mt-2">{t.basedOnSellPrice}</p>
                </div>

                <div className="bg-[#232a4d] rounded-2xl p-6 border border-[#2d3561]">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                    </div>
                    <span className="text-gray-400 text-sm">{t.monthlyProfit}</span>
                  </div>
                  <p className={`text-3xl font-bold ${stats.monthlyProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {stats.monthlyProfit >= 0 ? '+' : ''}{stats.monthlyProfit.toLocaleString()}
                  </p>
                  <p className="text-purple-400 text-sm mt-2">{t.thisMonth}</p>
                </div>
              </div>

              {/* Charts Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Category Distribution Pie Chart */}
                <div className="bg-[#232a4d] rounded-2xl border border-[#2d3561] p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">{t.categoryDistribution}</h3>
                  {categoryDistribution.length > 0 ? (
                    <div className="h-72 flex items-center justify-center">
                      <Pie
                        data={{
                          labels: categoryDistribution.map(d => d.name),
                          datasets: [{
                            data: categoryDistribution.map(d => d.count),
                            backgroundColor: categoryDistribution.map(d => d.color),
                            borderColor: '#232a4d',
                            borderWidth: 3,
                          }]
                        }}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          layout: {
                            padding: 30
                          },
                          plugins: {
                            legend: {
                              display: false
                            },
                            tooltip: {
                              backgroundColor: '#1a1f37',
                              titleColor: '#fff',
                              bodyColor: '#9ca3af',
                              borderColor: '#2d3561',
                              borderWidth: 1,
                              padding: 12,
                              displayColors: true,
                            },
                            datalabels: {
                              color: '#fff',
                              font: {
                                weight: 'bold' as const,
                                size: 11
                              },
                              backgroundColor: (context: any) => {
                                return context.dataset.backgroundColor[context.dataIndex];
                              },
                              borderRadius: 4,
                              padding: { top: 4, bottom: 4, left: 8, right: 8 },
                              anchor: 'end' as const,
                              align: 'end' as const,
                              offset: 10,
                              formatter: (_value: any, context: any) => {
                                return context.chart.data.labels[context.dataIndex];
                              },
                            }
                          }
                        }}
                      />
                    </div>
                  ) : (
                    <div className="h-72 flex items-center justify-center">
                      <p className="text-gray-400">{t.noDataAvailable}</p>
                    </div>
                  )}
                </div>
                
                {/* Inventory Value Line Chart */}
                <div className="bg-[#232a4d] rounded-2xl border border-[#2d3561] p-6">
                  <div className="flex flex-wrap justify-between items-center mb-4 gap-2">
                    <h3 className="text-lg font-semibold text-white">{t.inventoryValue}</h3>
                    <div className="flex gap-1">
                      {[
                        { days: 7, label: t.last7Days },
                        { days: 30, label: t.last30Days },
                        { days: 90, label: t.last90Days },
                        { days: 365, label: t.last365Days },
                      ].map(option => (
                        <button
                          key={option.days}
                          onClick={() => handleInventoryDaysChange(option.days)}
                          className={`px-3 py-1 text-xs rounded-lg transition ${
                            inventoryDays === option.days
                              ? 'bg-cyan-500 text-white'
                              : 'bg-[#1a1f37] text-gray-400 hover:bg-[#2d3561]'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  {inventoryValue.length > 0 ? (
                    <div className="h-64">
                      <Line
                        data={{
                          labels: inventoryValue.map(d => d.date),
                          datasets: [
                            {
                              label: t.totalBought,
                              data: inventoryValue.map(d => d.bought),
                              borderColor: '#ef4444',
                              backgroundColor: 'rgba(239, 68, 68, 0.1)',
                              tension: 0.3,
                              fill: true,
                            },
                            {
                              label: t.totalSold,
                              data: inventoryValue.map(d => d.sold),
                              borderColor: '#22c55e',
                              backgroundColor: 'rgba(34, 197, 94, 0.1)',
                              tension: 0.3,
                              fill: true,
                            },
                            {
                              label: t.profit,
                              data: inventoryValue.map(d => d.profit),
                              borderColor: '#3b82f6',
                              backgroundColor: 'rgba(59, 130, 246, 0.1)',
                              tension: 0.3,
                              fill: true,
                            }
                          ]
                        }}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          scales: {
                            x: {
                              ticks: { color: '#9ca3af' },
                              grid: { color: '#2d3561' }
                            },
                            y: {
                              ticks: { color: '#9ca3af' },
                              grid: { color: '#2d3561' }
                            }
                          },
                          plugins: {
                            legend: {
                              labels: {
                                color: '#9ca3af',
                                padding: 15
                              }
                            },
                            datalabels: {
                              display: false
                            }
                          }
                        }}
                      />
                    </div>
                  ) : (
                    <div className="h-64 flex items-center justify-center">
                      <p className="text-gray-400">{t.noDataAvailable}</p>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Recent Activity */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Low Stock Products */}
                <div className="bg-[#232a4d] rounded-2xl border border-[#2d3561]">
                  <div className="px-6 py-4 border-b border-[#2d3561] flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-white">{t.lowStockAlert}</h3>
                    <button 
                      onClick={() => setActivePage('inventory')}
                      className="text-cyan-400 text-sm hover:underline"
                    >
                      {t.viewAll}
                    </button>
                  </div>
                  <div className="p-4 space-y-3 max-h-80 overflow-y-auto">
                    {products.filter(p => p.currentStock <= 10).slice(0, 5).map(product => (
                      <div 
                        key={product._id} 
                        className="flex items-center justify-between bg-[#1a1f37] p-4 rounded-xl cursor-pointer hover:bg-[#2d3561] transition"
                        onClick={() => openProductModal(product)}
                      >
                        <div className="flex items-center gap-3">
                          {product.imageUrl ? (
                            <img src={product.imageUrl} alt={product.name} className="w-10 h-10 rounded-lg object-cover" />
                          ) : (
                            <div className="w-10 h-10 bg-[#2d3561] rounded-lg flex items-center justify-center">
                              <span className="text-gray-400 text-xs">{t.imgPlaceholder}</span>
                            </div>
                          )}
                          <div>
                            <p className="text-white text-sm font-medium">{product.name}</p>
                            <p className="text-gray-400 text-xs">{product.barcode}</p>
                          </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          product.currentStock === 0 
                            ? 'bg-red-500/20 text-red-400' 
                            : 'bg-orange-500/20 text-orange-400'
                        }`}>
                          {product.currentStock} {t.left}
                        </span>
                      </div>
                    ))}
                    {products.filter(p => p.currentStock <= 10).length === 0 && (
                      <p className="text-gray-400 text-center py-8">{t.noLowStockItems}</p>
                    )}
                  </div>
                </div>

                {/* Recent Scans */}
                <div className="bg-[#232a4d] rounded-2xl border border-[#2d3561]">
                  <div className="px-6 py-4 border-b border-[#2d3561] flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-white">{t.recentScans}</h3>
                    <button 
                      onClick={() => setActivePage('history')}
                      className="text-cyan-400 text-sm hover:underline"
                    >
                      {t.viewAll}
                    </button>
                  </div>
                  <div className="p-4 space-y-3 max-h-80 overflow-y-auto">
                    {scans.slice(0, 5).map(scan => (
                      <div key={scan._id} className="flex items-center justify-between bg-[#1a1f37] p-4 rounded-xl">
                        <div>
                          <p className="text-white text-sm font-mono">{scan.barcode}</p>
                          <p className="text-gray-400 text-xs">{scan.userFullName}</p>
                        </div>
                        <div className="text-right">
                          <span className={`px-2 py-1 rounded text-xs ${
                            scan.scanMode === 'camera' 
                              ? 'bg-green-500/20 text-green-400' 
                              : 'bg-blue-500/20 text-blue-400'
                          }`}>
                            {scan.scanMode === 'camera' ? t.camera : t.keyboard}
                          </span>
                          <p className="text-gray-400 text-xs mt-1">{formatDate(scan.scannedAt)}</p>
                        </div>
                      </div>
                    ))}
                    {scans.length === 0 && (
                      <p className="text-gray-400 text-center py-8">{t.noRecentScans}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Inventory Page */}
          {activePage === 'inventory' && (
            <div className="bg-[#232a4d] rounded-2xl border border-[#2d3561]">
              <div className="px-6 py-4 border-b border-[#2d3561] flex flex-wrap justify-between items-center gap-4">
                <h2 className="text-lg font-semibold text-white">{t.inventoryProducts}</h2>
                <div className="flex flex-wrap gap-2">
                  {/* Category Filter */}
                  <select
                    value={selectedCategoryFilter}
                    onChange={(e) => handleCategoryFilterChange(e.target.value)}
                    className="px-4 py-2 bg-[#1a1f37] border border-[#2d3561] rounded-lg text-white focus:ring-2 focus:ring-cyan-500"
                  >
                    <option value="">{t.allCategories}</option>
                    <option value="uncategorized">{t.uncategorized}</option>
                    {categories.map(cat => (
                      <option key={cat._id} value={cat._id}>{cat.name}</option>
                    ))}
                  </select>
                  <form onSubmit={handleSearch} className="flex gap-2">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={t.searchProducts}
                      className="px-4 py-2 bg-[#1a1f37] border border-[#2d3561] rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-cyan-500"
                    />
                    <button type="submit" className="bg-cyan-500 hover:bg-cyan-600 text-white px-4 py-2 rounded-lg transition">
                      {t.search}
                    </button>
                  </form>
                  <button
                    onClick={() => { setSearchQuery(''); setSelectedCategoryFilter(''); fetchProducts(1, '', ''); }}
                    className="bg-[#1a1f37] hover:bg-[#2d3561] text-gray-300 px-4 py-2 rounded-lg transition"
                  >
                    {t.refresh}
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-[#1a1f37]">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">{t.image}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">{t.barcode}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">{t.name}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">{t.category}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">{t.stock}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">{t.updated}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2d3561]">
                    {products.map((product) => (
                      <tr key={product._id} className="hover:bg-[#1a1f37] cursor-pointer transition" onClick={() => openProductModal(product)}>
                        <td className="px-6 py-4">
                          {product.imageUrl ? (
                            <img src={product.imageUrl} alt={product.name} className="w-12 h-12 object-cover rounded-lg" />
                          ) : (
                            <div className="w-12 h-12 bg-[#2d3561] rounded-lg flex items-center justify-center">
                              <span className="text-gray-500 text-xs">{t.noImg}</span>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-mono text-sm text-gray-300 bg-[#1a1f37] px-2 py-1 rounded">{product.barcode}</span>
                        </td>
                        <td className="px-6 py-4 text-white">{product.name}</td>
                        <td className="px-6 py-4">
                          {product.categoryName ? (
                            <span className="px-2 py-1 rounded text-xs" style={{
                              backgroundColor: `${categories.find(c => c._id === product.category)?.color || '#3b82f6'}20`,
                              color: categories.find(c => c._id === product.category)?.color || '#3b82f6'
                            }}>
                              {product.categoryName}
                            </span>
                          ) : (
                            <span className="text-gray-500 text-xs">{t.noCategory}</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                            product.currentStock > 10
                              ? 'bg-green-500/20 text-green-400'
                              : product.currentStock > 0
                              ? 'bg-orange-500/20 text-orange-400'
                              : 'bg-red-500/20 text-red-400'
                          }`}>
                            {product.currentStock}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-400 text-sm">{formatDate(product.updatedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {productsPagination && productsPagination.pages > 1 && (
                <div className="px-6 py-4 border-t border-[#2d3561] flex justify-between items-center">
                  <p className="text-sm text-gray-400">{t.page} {productsPagination.page} {t.of} {productsPagination.pages}</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => fetchProducts(productsPagination.page - 1, searchQuery, selectedCategoryFilter)}
                      disabled={productsPagination.page <= 1}
                      className="px-4 py-2 bg-[#1a1f37] text-gray-300 rounded-lg disabled:opacity-50 hover:bg-[#2d3561] transition"
                    >
                      {t.previous}
                    </button>
                    <button
                      onClick={() => fetchProducts(productsPagination.page + 1, searchQuery, selectedCategoryFilter)}
                      disabled={productsPagination.page >= productsPagination.pages}
                      className="px-4 py-2 bg-[#1a1f37] text-gray-300 rounded-lg disabled:opacity-50 hover:bg-[#2d3561] transition"
                    >
                      {t.next}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Scan History Page */}
          {activePage === 'history' && (
            <div className="bg-[#232a4d] rounded-2xl border border-[#2d3561]">
              <div className="px-6 py-4 border-b border-[#2d3561] flex justify-between items-center">
                <h2 className="text-lg font-semibold text-white">{t.scanHistory}</h2>
                <button
                  onClick={() => fetchScans(pagination?.page || 1)}
                  disabled={loadingScans}
                  className="bg-cyan-500 hover:bg-cyan-600 text-white px-4 py-2 rounded-lg transition disabled:opacity-50"
                >
                  {loadingScans ? t.refreshing : t.refresh}
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-[#1a1f37]">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">{t.barcode}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">{t.user}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">{t.scannedAt}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">{t.mode}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">{t.device}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2d3561]">
                    {scans.map((scan) => (
                      <tr key={scan._id} className="hover:bg-[#1a1f37] transition">
                        <td className="px-6 py-4">
                          <span className="font-mono text-sm text-gray-300 bg-[#1a1f37] px-2 py-1 rounded">{scan.barcode}</span>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-white text-sm">{scan.userFullName}</p>
                          <p className="text-gray-400 text-xs">@{scan.username}</p>
                        </td>
                        <td className="px-6 py-4 text-gray-300 text-sm">{formatDate(scan.scannedAt)}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded text-xs ${
                            scan.scanMode === 'camera' 
                              ? 'bg-green-500/20 text-green-400' 
                              : 'bg-blue-500/20 text-blue-400'
                          }`}>
                            {scan.scanMode === 'camera' ? t.camera : t.keyboard}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-400 text-sm">{scan.deviceInfo || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {pagination && pagination.pages > 1 && (
                <div className="px-6 py-4 border-t border-[#2d3561] flex justify-between items-center">
                  <p className="text-sm text-gray-400">{t.page} {pagination.page} {t.of} {pagination.pages}</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => fetchScans(pagination.page - 1)}
                      disabled={pagination.page <= 1}
                      className="px-4 py-2 bg-[#1a1f37] text-gray-300 rounded-lg disabled:opacity-50 hover:bg-[#2d3561] transition"
                    >
                      {t.previous}
                    </button>
                    <button
                      onClick={() => fetchScans(pagination.page + 1)}
                      disabled={pagination.page >= pagination.pages}
                      className="px-4 py-2 bg-[#1a1f37] text-gray-300 rounded-lg disabled:opacity-50 hover:bg-[#2d3561] transition"
                    >
                      {t.next}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Categories Page */}
          {activePage === 'categories' && (
            <div className="space-y-6">
              <div className="bg-[#232a4d] rounded-2xl border border-[#2d3561]">
                <div className="px-6 py-4 border-b border-[#2d3561] flex justify-between items-center">
                  <h2 className="text-lg font-semibold text-white">{t.manageCategories}</h2>
                  <button
                    onClick={() => { resetCategoryForm(); setShowCategoryForm(true); }}
                    className="bg-cyan-500 hover:bg-cyan-600 text-white px-4 py-2 rounded-lg transition flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    {t.addCategory}
                  </button>
                </div>
                
                {/* Category Form */}
                {showCategoryForm && (
                  <div className="px-6 py-4 bg-[#1a1f37] border-b border-[#2d3561]">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">{t.categoryName}</label>
                        <input
                          type="text"
                          value={newCategoryName}
                          onChange={(e) => setNewCategoryName(e.target.value)}
                          className="w-full px-4 py-2 bg-[#232a4d] border border-[#2d3561] rounded-lg text-white"
                          placeholder={t.categoryName}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">{t.categoryDescription}</label>
                        <input
                          type="text"
                          value={newCategoryDescription}
                          onChange={(e) => setNewCategoryDescription(e.target.value)}
                          className="w-full px-4 py-2 bg-[#232a4d] border border-[#2d3561] rounded-lg text-white"
                          placeholder={t.categoryDescription}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">{t.categoryColor}</label>
                        <input
                          type="color"
                          value={newCategoryColor}
                          onChange={(e) => setNewCategoryColor(e.target.value)}
                          className="w-full h-10 bg-[#232a4d] border border-[#2d3561] rounded-lg cursor-pointer"
                        />
                      </div>
                    </div>
                    {categoryError && (
                      <p className="text-red-400 text-sm mt-2">{categoryError}</p>
                    )}
                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={editCategory ? handleUpdateCategory : handleCreateCategory}
                        disabled={categoryLoading}
                        className="bg-cyan-500 hover:bg-cyan-600 text-white px-4 py-2 rounded-lg transition disabled:opacity-50"
                      >
                        {categoryLoading ? '...' : (editCategory ? t.save : t.addCategory)}
                      </button>
                      <button
                        onClick={resetCategoryForm}
                        className="bg-[#2d3561] hover:bg-[#3d4671] text-gray-300 px-4 py-2 rounded-lg transition"
                      >
                        {t.cancel}
                      </button>
                    </div>
                  </div>
                )}
                
                {/* Categories List */}
                <div className="p-6">
                  {loadingCategories ? (
                    <div className="flex justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
                    </div>
                  ) : categories.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-400">{t.noCategories}</p>
                      <p className="text-gray-500 text-sm mt-1">{t.createFirstCategory}</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {categories.map(category => (
                        <div
                          key={category._id}
                          className="bg-[#1a1f37] rounded-xl p-4 border border-[#2d3561] hover:border-[#3d4671] transition"
                        >
                          <div className="flex items-center gap-3 mb-3">
                            <div
                              className="w-4 h-4 rounded-full"
                              style={{ backgroundColor: category.color }}
                            ></div>
                            <h3 className="text-white font-medium">{category.name}</h3>
                          </div>
                          {category.description && (
                            <p className="text-gray-400 text-sm mb-3">{category.description}</p>
                          )}
                          <div className="flex gap-2 mt-3">
                            <button
                              onClick={() => startEditCategory(category)}
                              className="flex-1 bg-[#2d3561] hover:bg-[#3d4671] text-gray-300 px-3 py-2 rounded-lg text-sm transition"
                            >
                              {t.edit}
                            </button>
                            <button
                              onClick={() => handleDeleteCategory(category._id)}
                              className="bg-red-500/20 hover:bg-red-500/30 text-red-400 px-3 py-2 rounded-lg text-sm transition"
                            >
                              {t.delete}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {/* Users Page - Admin only */}
          {activePage === 'users' && user?.role === 'admin' && (
            <div className="space-y-6">
              <div className="bg-[#232a4d] rounded-2xl border border-[#2d3561]">
                <div className="px-6 py-4 border-b border-[#2d3561] flex justify-between items-center">
                  <h2 className="text-lg font-semibold text-white">{t.manageUsers}</h2>
                  <button
                    onClick={openNewUserForm}
                    className="bg-cyan-500 hover:bg-cyan-600 text-white px-4 py-2 rounded-lg transition flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    {t.createUser}
                  </button>
                </div>
                
                {/* User Form */}
                {showUserForm && (
                  <div className="px-6 py-4 bg-[#1a1f37] border-b border-[#2d3561]">
                    <h3 className="text-lg font-medium text-white mb-4">
                      {editingUser ? t.editUser : t.createUser}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">{t.username}</label>
                        <input
                          type="text"
                          value={newUserUsername}
                          onChange={(e) => setNewUserUsername(e.target.value)}
                          className="w-full px-4 py-2 bg-[#232a4d] border border-[#2d3561] rounded-lg text-white"
                          placeholder={t.username}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">{t.fullName}</label>
                        <input
                          type="text"
                          value={newUserFullName}
                          onChange={(e) => setNewUserFullName(e.target.value)}
                          className="w-full px-4 py-2 bg-[#232a4d] border border-[#2d3561] rounded-lg text-white"
                          placeholder={t.fullName}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          {t.password} {editingUser && <span className="text-gray-500 text-xs">({t.leaveBlankPassword})</span>}
                        </label>
                        <input
                          type="password"
                          value={newUserPassword}
                          onChange={(e) => setNewUserPassword(e.target.value)}
                          className="w-full px-4 py-2 bg-[#232a4d] border border-[#2d3561] rounded-lg text-white"
                          placeholder={editingUser ? '••••••' : t.password}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">{t.role}</label>
                        <select
                          value={newUserRole}
                          onChange={(e) => setNewUserRole(e.target.value as 'admin' | 'user')}
                          className="w-full px-4 py-2 bg-[#232a4d] border border-[#2d3561] rounded-lg text-white"
                        >
                          <option value="user">{t.userRole}</option>
                          <option value="admin">{t.admin}</option>
                        </select>
                      </div>
                    </div>
                    {userError && (
                      <p className="text-red-400 text-sm mt-2">{userError}</p>
                    )}
                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={handleCreateUser}
                        disabled={userLoading}
                        className="bg-cyan-500 hover:bg-cyan-600 text-white px-4 py-2 rounded-lg transition disabled:opacity-50"
                      >
                        {userLoading ? '...' : (editingUser ? t.save : t.createUser)}
                      </button>
                      <button
                        onClick={() => { setShowUserForm(false); setEditingUser(null); }}
                        className="bg-[#2d3561] hover:bg-[#3d4671] text-gray-300 px-4 py-2 rounded-lg transition"
                      >
                        {t.cancel}
                      </button>
                    </div>
                  </div>
                )}
                
                {/* Users List */}
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-[#1a1f37]">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">{t.username}</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">{t.fullName}</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">{t.role}</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">{t.lastLogin}</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#2d3561]">
                      {loadingUsers ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-8 text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400 mx-auto"></div>
                          </td>
                        </tr>
                      ) : users.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-8 text-center text-gray-400">
                            {t.noUsers}
                          </td>
                        </tr>
                      ) : (
                        users.map((u) => (
                          <tr key={u._id} className="hover:bg-[#1a1f37] transition">
                            <td className="px-6 py-4 text-white">{u.username}</td>
                            <td className="px-6 py-4 text-white">{u.fullName}</td>
                            <td className="px-6 py-4">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                u.role === 'admin' 
                                  ? 'bg-purple-500/20 text-purple-400' 
                                  : 'bg-blue-500/20 text-blue-400'
                              }`}>
                                {u.role === 'admin' ? t.admin : t.userRole}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-gray-400 text-sm">
                              {u.lastLogin ? formatDate(u.lastLogin) : t.never}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex gap-2">
                                <button
                                  onClick={() => openEditUser(u)}
                                  className="bg-[#2d3561] hover:bg-[#3d4671] text-gray-300 px-3 py-1 rounded-lg text-sm transition"
                                >
                                  {t.edit}
                                </button>
                                {u._id !== user?.id && (
                                  <button
                                    onClick={() => handleDeleteUser(u._id)}
                                    className="bg-red-500/20 hover:bg-red-500/30 text-red-400 px-3 py-1 rounded-lg text-sm transition"
                                  >
                                    {t.delete}
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Product Modal - keeping existing functionality */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={closeProductModal}>
          <div className="bg-[#232a4d] rounded-2xl shadow-2xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-hidden border border-[#2d3561]" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-[#2d3561] flex justify-between items-center">
              <h3 className="text-xl font-semibold text-white">
                {isEditing ? t.editProduct : selectedProduct.name}
              </h3>
              <div className="flex items-center gap-2">
                {!isEditing && (
                  <>
                    <button 
                      onClick={() => router.push(`/product/${selectedProduct.barcode}`)}
                      className="bg-purple-500 hover:bg-purple-600 text-white px-3 py-1 rounded-lg text-sm transition"
                    >
                      {t.viewDetails}
                    </button>
                    <button onClick={startEditing} className="bg-cyan-500 hover:bg-cyan-600 text-white px-3 py-1 rounded-lg text-sm transition">
                      {t.edit}
                    </button>
                  </>
                )}
                <button onClick={closeProductModal} className="text-gray-400 hover:text-white text-2xl">&times;</button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto max-h-[75vh]">
              {isEditing ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">{t.productName} *</label>
                    <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full px-4 py-2 bg-[#1a1f37] border border-[#2d3561] rounded-lg text-white" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">{t.buyingPrice}</label>
                      <input type="number" step="0.01" value={editBuyingPrice} onChange={(e) => setEditBuyingPrice(e.target.value)} className="w-full px-4 py-2 bg-[#1a1f37] border border-[#2d3561] rounded-lg text-white" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">{t.sellingPrice}</label>
                      <input type="number" step="0.01" value={editSellingPrice} onChange={(e) => setEditSellingPrice(e.target.value)} className="w-full px-4 py-2 bg-[#1a1f37] border border-[#2d3561] rounded-lg text-white" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">{t.defaultSupplier}</label>
                      <input type="text" value={editBoughtFrom} onChange={(e) => setEditBoughtFrom(e.target.value)} className="w-full px-4 py-2 bg-[#1a1f37] border border-[#2d3561] rounded-lg text-white" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">{t.defaultSellLocation}</label>
                      <input type="text" value={editSellLocation} onChange={(e) => setEditSellLocation(e.target.value)} className="w-full px-4 py-2 bg-[#1a1f37] border border-[#2d3561] rounded-lg text-white" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">{t.note}</label>
                    <textarea value={editNote} onChange={(e) => setEditNote(e.target.value)} rows={3} className="w-full px-4 py-2 bg-[#1a1f37] border border-[#2d3561] rounded-lg text-white" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">{t.productImage}</label>
                    <div className="flex gap-2 mb-2">
                      <label className="flex-1 cursor-pointer">
                        <div className="w-full px-4 py-2 border-2 border-dashed border-[#2d3561] rounded-lg text-center hover:border-cyan-500 transition">
                          <span className="text-gray-400">{t.clickToUpload}</span>
                        </div>
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            if (file.size > 2 * 1024 * 1024) { setEditError(t.imageMustBeLessThan2MB); return; }
                            const reader = new FileReader();
                            reader.onloadend = () => setEditImageUrl(reader.result as string);
                            reader.readAsDataURL(file);
                          }
                        }} />
                      </label>
                      {editImageUrl && <button type="button" onClick={() => setEditImageUrl('')} className="px-3 py-2 bg-red-500/20 text-red-400 rounded-lg">{t.remove}</button>}
                    </div>
                    {editImageUrl && <img src={editImageUrl} alt={t.preview} className="max-h-32 rounded-lg" />}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">{t.category}</label>
                    <select
                      value={editProductCategory}
                      onChange={(e) => setEditProductCategory(e.target.value)}
                      className="w-full px-4 py-2 bg-[#1a1f37] border border-[#2d3561] rounded-lg text-white"
                    >
                      <option value="">{t.noCategory}</option>
                      {categories.map(cat => (
                        <option key={cat._id} value={cat._id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                  {editError && <div className="p-3 bg-red-500/20 text-red-400 rounded-lg text-sm">{editError}</div>}
                  <div className="flex gap-3 pt-4">
                    <button onClick={cancelEditing} className="flex-1 py-2 bg-[#1a1f37] text-gray-300 rounded-lg hover:bg-[#2d3561]">{t.cancel}</button>
                    <button onClick={handleSaveEdit} disabled={editLoading} className="flex-1 py-2 bg-cyan-500 text-white rounded-lg font-semibold disabled:opacity-50">{editLoading ? t.saving : t.save}</button>
                  </div>
                </div>
              ) : (
                <>
                  {selectedProduct.imageUrl && (
                    <div className="mb-6 flex justify-center">
                      <img src={selectedProduct.imageUrl} alt={selectedProduct.name} className="max-w-xs max-h-48 object-contain rounded-lg" />
                    </div>
                  )}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div><p className="text-gray-400 text-sm">{t.barcode}</p><p className="text-white font-mono">{selectedProduct.barcode}</p></div>
                    <div><p className="text-gray-400 text-sm">{t.stock}</p><p className={`text-3xl font-bold ${selectedProduct.currentStock > 0 ? 'text-green-400' : 'text-red-400'}`}>{selectedProduct.currentStock}</p></div>
                    <div><p className="text-gray-400 text-sm">{t.buyPrice}</p><p className="text-white">${selectedProduct.buyingPrice?.toFixed(2) || '0.00'}</p></div>
                    <div><p className="text-gray-400 text-sm">{t.sellPrice}</p><p className="text-green-400">${selectedProduct.sellingPrice?.toFixed(2) || '0.00'}</p></div>
                  </div>
                  
                  <div className="mb-6 p-4 bg-[#1a1f37] rounded-xl">
                    <h4 className="text-lg font-semibold text-white mb-4">{t.manageStock}</h4>
                    <div className="flex gap-2 mb-4">
                      <button onClick={() => { setStockAction('add'); setStockError(''); }} className={`flex-1 py-2 rounded-lg font-medium transition ${stockAction === 'add' ? 'bg-green-500 text-white' : 'bg-[#2d3561] text-gray-300'}`}>+ {t.add}</button>
                      <button onClick={() => { setStockAction('remove'); setStockError(''); }} className={`flex-1 py-2 rounded-lg font-medium transition ${stockAction === 'remove' ? 'bg-red-500 text-white' : 'bg-[#2d3561] text-gray-300'}`}>- {t.remove}</button>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <input type="number" value={stockQuantity} onChange={(e) => setStockQuantity(e.target.value)} placeholder={t.quantity} className="px-4 py-2 bg-[#232a4d] border border-[#2d3561] rounded-lg text-white" />
                      <input type="text" value={stockAction === 'add' ? stockSupplier : stockLocation} onChange={(e) => stockAction === 'add' ? setStockSupplier(e.target.value) : setStockLocation(e.target.value)} placeholder={stockAction === 'add' ? t.supplier : t.location} className="px-4 py-2 bg-[#232a4d] border border-[#2d3561] rounded-lg text-white" />
                    </div>
                    <input type="text" value={stockNote} onChange={(e) => setStockNote(e.target.value)} placeholder={t.noteOptional} className="w-full px-4 py-2 bg-[#232a4d] border border-[#2d3561] rounded-lg text-white mb-4" />
                    {stockError && <div className="mb-4 p-3 bg-red-500/20 text-red-400 rounded-lg text-sm">{stockError}</div>}
                    <button onClick={handleStockAction} disabled={stockLoading} className={`w-full py-3 rounded-lg font-semibold text-white disabled:opacity-50 ${stockAction === 'add' ? 'bg-green-500' : 'bg-red-500'}`}>{stockLoading ? t.processing : (stockAction === 'add' ? `+ ${t.addStock}` : `- ${t.removeStock}`)}</button>
                  </div>

                  {selectedProduct.stockHistory && selectedProduct.stockHistory.length > 0 && (
                    <div>
                      <h4 className="text-lg font-semibold text-white mb-3">{t.stockHistory} ({selectedProduct.stockHistory.length})</h4>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {selectedProduct.stockHistory.slice().reverse().map((h, i) => (
                          <div key={i} className={`p-3 rounded-lg border-l-4 ${h.type === 'add' ? 'bg-green-500/10 border-green-500' : 'bg-red-500/10 border-red-500'}`}>
                            <div className="flex justify-between">
                              <span className={`font-bold ${h.type === 'add' ? 'text-green-400' : 'text-red-400'}`}>{h.type === 'add' ? '+' : '-'}{h.quantity}</span>
                              <span className="text-gray-400 text-xs">{formatDate(h.createdAt)}</span>
                            </div>
                            <div className="text-sm text-gray-300">{h.supplier && `${t.from}: ${h.supplier}`}{h.location && `${t.to}: ${h.location}`}</div>
                            {h.note && <p className="text-gray-400 text-xs italic">{h.note}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
