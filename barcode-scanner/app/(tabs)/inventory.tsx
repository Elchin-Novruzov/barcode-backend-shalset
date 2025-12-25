import React, { useState, useEffect, useCallback } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  FlatList, 
  TextInput,
  Image,
  RefreshControl,
  StatusBar,
  SafeAreaView,
  Modal,
  ScrollView
} from 'react-native';
import { useRouter } from 'expo-router';
import { AppColors } from '@/constants/theme';
import { API_ENDPOINTS } from '@/constants/api';
import { useAuth } from '@/context/AuthContext';
import { IconSymbol } from '@/components/ui/icon-symbol';

interface Product {
  _id: string;
  barcode: string;
  name: string;
  currentStock: number;
  buyingPrice?: number;
  sellingPrice?: number;
  imageUrl?: string;
  categoryName?: string;
  category?: string;
  updatedAt: string;
}

interface Category {
  _id: string;
  name: string;
  color: string;
}

export default function InventoryScreen() {
  const router = useRouter();
  const { token } = useAuth();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Filter state
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [stockFilter, setStockFilter] = useState<'all' | 'inStock' | 'lowStock' | 'outOfStock'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'stock'>('name');
  const [activeFiltersCount, setActiveFiltersCount] = useState(0);

  const fetchProducts = async () => {
    if (!token) return;
    
    try {
      const response = await fetch(`${API_ENDPOINTS.PRODUCTS}?limit=100`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setProducts(data.products || []);
      }
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    if (!token) return;
    
    try {
      const response = await fetch(API_ENDPOINTS.CATEGORIES, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setCategories(data.categories || []);
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, [token]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchProducts(), fetchCategories()]);
    setRefreshing(false);
  }, [token]);

  const getCategoryColor = (categoryId?: string) => {
    const category = categories.find(c => c._id === categoryId);
    return category?.color || AppColors.textMuted;
  };

  // Calculate active filters count
  useEffect(() => {
    let count = 0;
    if (selectedCategory) count++;
    if (stockFilter !== 'all') count++;
    setActiveFiltersCount(count);
  }, [selectedCategory, stockFilter]);

  // Filter and sort products
  const filteredProducts = products
    .filter(product => {
      // Search filter
      const matchesSearch = 
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.barcode.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Category filter
      const matchesCategory = !selectedCategory || product.category === selectedCategory;
      
      // Stock filter
      let matchesStock = true;
      if (stockFilter === 'outOfStock') {
        matchesStock = product.currentStock === 0;
      } else if (stockFilter === 'lowStock') {
        matchesStock = product.currentStock > 0 && product.currentStock <= 10;
      } else if (stockFilter === 'inStock') {
        matchesStock = product.currentStock > 10;
      }
      
      return matchesSearch && matchesCategory && matchesStock;
    })
    .sort((a, b) => {
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      } else if (sortBy === 'price') {
        return (b.sellingPrice || 0) - (a.sellingPrice || 0);
      } else {
        return b.currentStock - a.currentStock;
      }
    });

  const clearFilters = () => {
    setSelectedCategory(null);
    setStockFilter('all');
    setSortBy('name');
  };

  const handleProductPress = (product: Product) => {
    router.push(`/(tabs)/scan?barcode=${product.barcode}`);
  };

  const renderProduct = ({ item }: { item: Product }) => (
    <TouchableOpacity 
      style={styles.productCard}
      onPress={() => handleProductPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.productImage}>
        {item.imageUrl ? (
          <Image source={{ uri: item.imageUrl }} style={styles.image} />
        ) : (
          <View style={styles.placeholderImage}>
            <IconSymbol size={28} name="shippingbox.fill" color={AppColors.textMuted} />
          </View>
        )}
      </View>
      
      <View style={styles.productInfo}>
        <View style={styles.productHeader}>
          <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
          {item.categoryName && (
            <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(item.category) + '20' }]}>
              <Text style={[styles.categoryText, { color: getCategoryColor(item.category) }]}>
                {item.categoryName}
              </Text>
            </View>
          )}
        </View>
        
        <Text style={styles.stockText}>
          {item.currentStock} in Stock
        </Text>
        
        <View style={styles.barcodeContainer}>
          <IconSymbol size={12} name="barcode" color={AppColors.textMuted} />
          <Text style={styles.barcodeText}>{item.barcode}</Text>
        </View>
      </View>
      
      <View style={styles.priceContainer}>
        <Text style={styles.priceText}>
          ${item.sellingPrice?.toFixed(2) || '0.00'}
        </Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => router.push(`/(tabs)/scan?barcode=${item.barcode}`)}
        >
          <IconSymbol size={16} name="plus" color="#FFF" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={AppColors.background} />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <IconSymbol size={18} name="magnifyingglass" color={AppColors.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search..."
              placeholderTextColor={AppColors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          <TouchableOpacity 
            style={[styles.filterButton, activeFiltersCount > 0 && styles.filterButtonActive]}
            onPress={() => setFilterModalVisible(true)}
          >
            <IconSymbol size={20} name="slider.horizontal.3" color={activeFiltersCount > 0 ? '#FFF' : AppColors.textSecondary} />
            {activeFiltersCount > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{activeFiltersCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Items Header */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Items</Text>
        <TouchableOpacity>
          <Text style={styles.viewAllText}>View All</Text>
        </TouchableOpacity>
      </View>

      {/* Products List */}
      <FlatList
        data={filteredProducts}
        renderItem={renderProduct}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor={AppColors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <IconSymbol size={64} name="shippingbox" color={AppColors.textMuted} />
            <Text style={styles.emptyText}>No products found</Text>
          </View>
        }
      />

      {/* Floating Add Button */}
      <TouchableOpacity style={styles.floatingButton}>
        <IconSymbol size={24} name="plus" color="#FFF" />
      </TouchableOpacity>

      {/* Filter Modal */}
      <Modal
        visible={filterModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filters</Text>
              <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                <IconSymbol size={24} name="xmark" color={AppColors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Stock Status Filter */}
              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>Stock Status</Text>
                <View style={styles.filterOptions}>
                  {[
                    { key: 'all', label: 'All' },
                    { key: 'inStock', label: 'In Stock' },
                    { key: 'lowStock', label: 'Low Stock' },
                    { key: 'outOfStock', label: 'Out of Stock' },
                  ].map((option) => (
                    <TouchableOpacity
                      key={option.key}
                      style={[
                        styles.filterChip,
                        stockFilter === option.key && styles.filterChipActive
                      ]}
                      onPress={() => setStockFilter(option.key as any)}
                    >
                      <Text style={[
                        styles.filterChipText,
                        stockFilter === option.key && styles.filterChipTextActive
                      ]}>{option.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Category Filter */}
              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>Category</Text>
                <View style={styles.filterOptions}>
                  <TouchableOpacity
                    style={[
                      styles.filterChip,
                      !selectedCategory && styles.filterChipActive
                    ]}
                    onPress={() => setSelectedCategory(null)}
                  >
                    <Text style={[
                      styles.filterChipText,
                      !selectedCategory && styles.filterChipTextActive
                    ]}>All</Text>
                  </TouchableOpacity>
                  {categories.map((cat) => (
                    <TouchableOpacity
                      key={cat._id}
                      style={[
                        styles.filterChip,
                        selectedCategory === cat._id && styles.filterChipActive,
                        { borderColor: cat.color }
                      ]}
                      onPress={() => setSelectedCategory(cat._id)}
                    >
                      <View style={[styles.categoryDot, { backgroundColor: cat.color }]} />
                      <Text style={[
                        styles.filterChipText,
                        selectedCategory === cat._id && styles.filterChipTextActive
                      ]}>{cat.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Sort By */}
              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>Sort By</Text>
                <View style={styles.filterOptions}>
                  {[
                    { key: 'name', label: 'Name' },
                    { key: 'price', label: 'Price' },
                    { key: 'stock', label: 'Stock' },
                  ].map((option) => (
                    <TouchableOpacity
                      key={option.key}
                      style={[
                        styles.filterChip,
                        sortBy === option.key && styles.filterChipActive
                      ]}
                      onPress={() => setSortBy(option.key as any)}
                    >
                      <Text style={[
                        styles.filterChipText,
                        sortBy === option.key && styles.filterChipTextActive
                      ]}>{option.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>

            {/* Action Buttons */}
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.clearButton}
                onPress={clearFilters}
              >
                <Text style={styles.clearButtonText}>Clear All</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.applyButton}
                onPress={() => setFilterModalVisible(false)}
              >
                <Text style={styles.applyButtonText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    color: AppColors.textPrimary,
    fontSize: 15,
  },
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: AppColors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: AppColors.primary,
  },
  filterBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: AppColors.error,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: AppColors.textPrimary,
  },
  viewAllText: {
    fontSize: 14,
    color: AppColors.textSecondary,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.surface,
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    gap: 12,
  },
  productImage: {
    width: 72,
    height: 72,
    borderRadius: 12,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    backgroundColor: AppColors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  productInfo: {
    flex: 1,
    gap: 4,
  },
  productHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.textPrimary,
    flex: 1,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '500',
  },
  stockText: {
    fontSize: 14,
    color: AppColors.textSecondary,
  },
  barcodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  barcodeText: {
    fontSize: 11,
    color: AppColors.textMuted,
    fontFamily: 'monospace',
  },
  priceContainer: {
    alignItems: 'flex-end',
    gap: 8,
  },
  priceText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: AppColors.textPrimary,
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: AppColors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: AppColors.textMuted,
    marginTop: 16,
  },
  floatingButton: {
    position: 'absolute',
    bottom: 90,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: AppColors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: AppColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: AppColors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: AppColors.textPrimary,
  },
  filterSection: {
    marginBottom: 24,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: AppColors.textSecondary,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: AppColors.surfaceLight,
    borderWidth: 1,
    borderColor: AppColors.border,
    gap: 6,
  },
  filterChipActive: {
    backgroundColor: AppColors.primary,
    borderColor: AppColors.primary,
  },
  filterChipText: {
    fontSize: 14,
    color: AppColors.textSecondary,
  },
  filterChipTextActive: {
    color: '#FFF',
    fontWeight: '600',
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: AppColors.border,
  },
  clearButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: AppColors.surfaceLight,
    alignItems: 'center',
  },
  clearButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.textSecondary,
  },
  applyButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: AppColors.primary,
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
});
