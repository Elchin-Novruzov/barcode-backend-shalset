'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { getProductByBarcode, Product, addStock, removeStock, updateProduct, getCategories, Category } from '@/lib/api';
import { translations, Language, languageNames, languageFlags } from '@/lib/translations';

export default function ProductDetailPage() {
  const router = useRouter();
  const params = useParams();
  const barcode = params.barcode as string;
  const { user, token, isLoading } = useAuth();
  
  // Language state
  const [language, setLanguage] = useState<Language>('en');
  const [showLangDropdown, setShowLangDropdown] = useState(false);
  const t = translations[language];
  
  // Product state
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Categories
  const [categories, setCategories] = useState<Category[]>([]);
  
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
  const [editProductCategory, setEditProductCategory] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  // Load language from localStorage
  useEffect(() => {
    const savedLang = localStorage.getItem('language') as Language;
    if (savedLang && ['en', 'az', 'ru'].includes(savedLang)) {
      setLanguage(savedLang);
    }
  }, []);

  const fetchProduct = async () => {
    if (!token || !barcode) return;
    setLoading(true);
    try {
      const data = await getProductByBarcode(token, barcode);
      setProduct(data);
      setError('');
    } catch (err) {
      setError(t.failedToLoadProductDetails);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  const fetchCategories = async () => {
    if (!token) return;
    try {
      const data = await getCategories(token);
      setCategories(data);
    } catch (err) {
      console.error('Failed to load categories', err);
    }
  };

  useEffect(() => {
    if (token && barcode) {
      fetchProduct();
      fetchCategories();
    }
  }, [token, barcode]);
  
  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !token) {
      router.push('/');
    }
  }, [isLoading, token, router]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };
  
  const handleStockAction = async () => {
    if (!token || !product) return;
    const qty = parseInt(stockQuantity);
    if (!qty || qty <= 0) {
      setStockError(t.enterValidQuantity);
      return;
    }
    if (stockAction === 'remove' && qty > product.currentStock) {
      setStockError(`${t.cannotRemove} ${qty}. ${t.onlyInStock} ${product.currentStock} ${t.inStock}.`);
      return;
    }
    setStockLoading(true);
    setStockError('');
    try {
      let updatedProduct;
      if (stockAction === 'add') {
        updatedProduct = await addStock(token, product.barcode, qty, stockNote, stockSupplier);
      } else {
        updatedProduct = await removeStock(token, product.barcode, qty, stockNote, stockLocation);
      }
      // Refresh product data
      await fetchProduct();
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
  
  const startEditing = () => {
    if (product) {
      setEditName(product.name);
      setEditNote(product.note || '');
      setEditBuyingPrice(product.buyingPrice?.toString() || '');
      setEditSellingPrice(product.sellingPrice?.toString() || '');
      setEditBoughtFrom(product.boughtFrom || '');
      setEditSellLocation(product.sellLocation || '');
      setEditImageUrl(product.imageUrl || '');
      setEditProductCategory(product.category || '');
      setIsEditing(true);
      setEditError('');
    }
  };
  
  const cancelEditing = () => {
    setIsEditing(false);
    setEditError('');
  };
  
  const handleSaveEdit = async () => {
    if (!token || !product) return;
    if (!editName.trim()) {
      setEditError(t.productNameRequired);
      return;
    }
    setEditLoading(true);
    setEditError('');
    try {
      await updateProduct(token, product.barcode, {
        name: editName,
        note: editNote,
        buyingPrice: parseFloat(editBuyingPrice) || 0,
        sellingPrice: parseFloat(editSellingPrice) || 0,
        boughtFrom: editBoughtFrom,
        sellLocation: editSellLocation,
        imageUrl: editImageUrl,
        category: editProductCategory || null
      });
      await fetchProduct();
      setIsEditing(false);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : t.failedToUpdateProduct);
    } finally {
      setEditLoading(false);
    }
  };

  if (isLoading || loading) {
    return (
      <div className="min-h-screen bg-[#1a1f37] flex items-center justify-center">
        <div className="text-white text-xl">{t.loadingProducts}</div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-[#1a1f37] flex flex-col items-center justify-center">
        <div className="text-red-400 text-xl mb-4">{error || 'Product not found'}</div>
        <button 
          onClick={() => router.push('/')}
          className="bg-cyan-500 hover:bg-cyan-600 text-white px-6 py-2 rounded-lg"
        >
          {t.backToDashboard}
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1a1f37]">
      {/* Header */}
      <header className="bg-[#232a4d] border-b border-[#2d3561] px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => router.push('/')}
              className="text-gray-400 hover:text-white transition flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              {t.backToDashboard}
            </button>
          </div>
          <h1 className="text-xl font-bold text-white">{t.productDetails}</h1>
          <div className="relative">
            <button
              onClick={() => setShowLangDropdown(!showLangDropdown)}
              className="flex items-center gap-2 px-3 py-2 bg-[#1a1f37] rounded-lg text-white hover:bg-[#2d3561] transition"
            >
              <span>{languageFlags[language]}</span>
              <span className="hidden sm:inline">{languageNames[language]}</span>
            </button>
            {showLangDropdown && (
              <div className="absolute right-0 mt-2 w-40 bg-[#232a4d] rounded-lg border border-[#2d3561] shadow-xl z-50">
                {(['en', 'az', 'ru'] as Language[]).map(lang => (
                  <button
                    key={lang}
                    onClick={() => { setLanguage(lang); localStorage.setItem('language', lang); setShowLangDropdown(false); }}
                    className={`w-full px-4 py-2 text-left hover:bg-[#2d3561] transition flex items-center gap-2 ${language === lang ? 'text-cyan-400' : 'text-white'}`}
                  >
                    <span>{languageFlags[lang]}</span>
                    <span>{languageNames[lang]}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {isEditing ? (
          /* Edit Mode */
          <div className="bg-[#232a4d] rounded-2xl border border-[#2d3561] p-6">
            <h2 className="text-2xl font-bold text-white mb-6">{t.editProduct}</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                  <label className="block text-sm font-medium text-gray-300 mb-1">{t.category}</label>
                  <select value={editProductCategory} onChange={(e) => setEditProductCategory(e.target.value)} className="w-full px-4 py-2 bg-[#1a1f37] border border-[#2d3561] rounded-lg text-white">
                    <option value="">{t.noCategory}</option>
                    {categories.map(cat => (
                      <option key={cat._id} value={cat._id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">{t.note}</label>
                  <textarea value={editNote} onChange={(e) => setEditNote(e.target.value)} rows={3} className="w-full px-4 py-2 bg-[#1a1f37] border border-[#2d3561] rounded-lg text-white" />
                </div>
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
                {editImageUrl && <img src={editImageUrl} alt={t.preview} className="max-h-48 rounded-lg mx-auto" />}
              </div>
            </div>
            {editError && <div className="mt-4 p-3 bg-red-500/20 text-red-400 rounded-lg text-sm">{editError}</div>}
            <div className="flex gap-3 mt-6">
              <button onClick={cancelEditing} className="flex-1 py-2 bg-[#1a1f37] text-gray-300 rounded-lg hover:bg-[#2d3561]">{t.cancel}</button>
              <button onClick={handleSaveEdit} disabled={editLoading} className="flex-1 py-2 bg-cyan-500 text-white rounded-lg font-semibold disabled:opacity-50">{editLoading ? t.saving : t.save}</button>
            </div>
          </div>
        ) : (
          /* View Mode */
          <div className="space-y-6">
            {/* Product Info Card */}
            <div className="bg-[#232a4d] rounded-2xl border border-[#2d3561] p-6">
              <div className="flex flex-wrap justify-between items-start gap-4 mb-6">
                <div className="flex items-center gap-6">
                  {product.imageUrl ? (
                    <img src={product.imageUrl} alt={product.name} className="w-32 h-32 object-cover rounded-xl" />
                  ) : (
                    <div className="w-32 h-32 bg-[#1a1f37] rounded-xl flex items-center justify-center">
                      <span className="text-gray-500 text-lg">{t.noImg}</span>
                    </div>
                  )}
                  <div>
                    <h2 className="text-3xl font-bold text-white mb-2">{product.name}</h2>
                    <p className="text-gray-400 font-mono text-lg">{product.barcode}</p>
                    {product.categoryName && (
                      <span className="inline-block mt-2 px-3 py-1 rounded-full text-sm" style={{
                        backgroundColor: `${categories.find(c => c._id === product.category)?.color || '#3b82f6'}20`,
                        color: categories.find(c => c._id === product.category)?.color || '#3b82f6'
                      }}>
                        {product.categoryName}
                      </span>
                    )}
                  </div>
                </div>
                <button onClick={startEditing} className="bg-cyan-500 hover:bg-cyan-600 text-white px-4 py-2 rounded-lg transition">
                  {t.edit}
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="bg-[#1a1f37] p-4 rounded-xl">
                  <p className="text-gray-400 text-sm mb-1">{t.stock}</p>
                  <p className={`text-4xl font-bold ${product.currentStock > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {product.currentStock}
                  </p>
                </div>
                <div className="bg-[#1a1f37] p-4 rounded-xl">
                  <p className="text-gray-400 text-sm mb-1">{t.buyPrice}</p>
                  <p className="text-2xl font-semibold text-white">${product.buyingPrice?.toFixed(2) || '0.00'}</p>
                </div>
                <div className="bg-[#1a1f37] p-4 rounded-xl">
                  <p className="text-gray-400 text-sm mb-1">{t.sellPrice}</p>
                  <p className="text-2xl font-semibold text-green-400">${product.sellingPrice?.toFixed(2) || '0.00'}</p>
                </div>
                <div className="bg-[#1a1f37] p-4 rounded-xl">
                  <p className="text-gray-400 text-sm mb-1">{t.profit}</p>
                  <p className="text-2xl font-semibold text-cyan-400">
                    ${((product.sellingPrice || 0) - (product.buyingPrice || 0)).toFixed(2)}
                  </p>
                </div>
              </div>

              {product.note && (
                <div className="mt-6 p-4 bg-[#1a1f37] rounded-xl">
                  <p className="text-gray-400 text-sm mb-1">{t.note}</p>
                  <p className="text-white">{product.note}</p>
                </div>
              )}

              <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                {product.boughtFrom && (
                  <div>
                    <p className="text-gray-400">{t.defaultSupplier}</p>
                    <p className="text-white">{product.boughtFrom}</p>
                  </div>
                )}
                {product.sellLocation && (
                  <div>
                    <p className="text-gray-400">{t.defaultSellLocation}</p>
                    <p className="text-white">{product.sellLocation}</p>
                  </div>
                )}
                <div>
                  <p className="text-gray-400">{t.updated}</p>
                  <p className="text-white">{formatDate(product.updatedAt)}</p>
                </div>
              </div>
            </div>

            {/* Stock Management */}
            <div className="bg-[#232a4d] rounded-2xl border border-[#2d3561] p-6">
              <h3 className="text-xl font-semibold text-white mb-4">{t.manageStock}</h3>
              <div className="flex gap-2 mb-4">
                <button onClick={() => { setStockAction('add'); setStockError(''); }} className={`flex-1 py-3 rounded-lg font-medium transition ${stockAction === 'add' ? 'bg-green-500 text-white' : 'bg-[#1a1f37] text-gray-300'}`}>
                  + {t.add}
                </button>
                <button onClick={() => { setStockAction('remove'); setStockError(''); }} className={`flex-1 py-3 rounded-lg font-medium transition ${stockAction === 'remove' ? 'bg-red-500 text-white' : 'bg-[#1a1f37] text-gray-300'}`}>
                  - {t.remove}
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <input type="number" value={stockQuantity} onChange={(e) => setStockQuantity(e.target.value)} placeholder={t.quantity} className="px-4 py-3 bg-[#1a1f37] border border-[#2d3561] rounded-lg text-white" />
                <input type="text" value={stockAction === 'add' ? stockSupplier : stockLocation} onChange={(e) => stockAction === 'add' ? setStockSupplier(e.target.value) : setStockLocation(e.target.value)} placeholder={stockAction === 'add' ? t.supplier : t.location} className="px-4 py-3 bg-[#1a1f37] border border-[#2d3561] rounded-lg text-white" />
                <input type="text" value={stockNote} onChange={(e) => setStockNote(e.target.value)} placeholder={t.noteOptional} className="px-4 py-3 bg-[#1a1f37] border border-[#2d3561] rounded-lg text-white" />
              </div>
              {stockError && <div className="mb-4 p-3 bg-red-500/20 text-red-400 rounded-lg text-sm">{stockError}</div>}
              <button onClick={handleStockAction} disabled={stockLoading} className={`w-full py-3 rounded-lg font-semibold text-white disabled:opacity-50 ${stockAction === 'add' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'}`}>
                {stockLoading ? t.processing : (stockAction === 'add' ? `+ ${t.addStock}` : `- ${t.removeStock}`)}
              </button>
            </div>

            {/* Stock History */}
            <div className="bg-[#232a4d] rounded-2xl border border-[#2d3561] p-6">
              <h3 className="text-xl font-semibold text-white mb-4">
                {t.stockHistory} ({product.stockHistory?.length || 0})
              </h3>
              {product.stockHistory && product.stockHistory.length > 0 ? (
                <div className="space-y-3">
                  {product.stockHistory.slice().reverse().map((h, i) => (
                    <div key={i} className={`p-4 rounded-xl border-l-4 ${h.type === 'add' ? 'bg-green-500/10 border-green-500' : 'bg-red-500/10 border-red-500'}`}>
                      <div className="flex justify-between items-start">
                        <div>
                          <span className={`text-2xl font-bold ${h.type === 'add' ? 'text-green-400' : 'text-red-400'}`}>
                            {h.type === 'add' ? '+' : '-'}{h.quantity}
                          </span>
                          <p className="text-gray-300 text-sm mt-1">
                            {h.supplier && `${t.from}: ${h.supplier}`}
                            {h.location && `${t.to}: ${h.location}`}
                          </p>
                          {h.note && <p className="text-gray-400 text-sm italic mt-1">{h.note}</p>}
                        </div>
                        <div className="text-right">
                          <p className="text-gray-400 text-sm">{formatDate(h.createdAt)}</p>
                          <p className="text-gray-500 text-xs">{h.addedByName}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-center py-8">{t.noDataAvailable}</p>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
