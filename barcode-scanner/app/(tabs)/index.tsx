import React, { useState, useEffect, useCallback } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  TextInput,
  Image,
  RefreshControl,
  StatusBar,
  SafeAreaView
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
  updatedAt: string;
}

interface DashboardStats {
  totalProducts: number;
  totalBuyValue: number;
  totalSellValue: number;
  monthlyProfit: number;
}

interface RecentActivity {
  _id: string;
  barcode: string;
  productName: string;
  productImage?: string;
  userName: string;
  type: 'add' | 'remove';
  quantity: number;
  timestamp: string;
}

export default function HomeScreen() {
  const router = useRouter();
  const { user, token } = useAuth();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState<DashboardStats>({
    totalProducts: 0,
    totalBuyValue: 0,
    totalSellValue: 0,
    monthlyProfit: 0
  });
  const [lowStockCount, setLowStockCount] = useState(0);
  const [outOfStockCount, setOutOfStockCount] = useState(0);
  const [recentProducts, setRecentProducts] = useState<Product[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    if (!token) return;
    
    try {
      // Fetch dashboard stats
      const statsResponse = await fetch(API_ENDPOINTS.STATS_DASHBOARD, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData.stats);
      }

      // Fetch products for counts and recent activity
      const productsResponse = await fetch(`${API_ENDPOINTS.PRODUCTS}?limit=100`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (productsResponse.ok) {
        const productsData = await productsResponse.json();
        const products = productsData.products || [];
        
        // Calculate stock counts
        const outOfStock = products.filter((p: Product) => p.currentStock === 0).length;
        const lowStock = products.filter((p: Product) => p.currentStock > 0 && p.currentStock <= 10).length;
        
        setOutOfStockCount(outOfStock);
        setLowStockCount(lowStock);
        
        // Get recent products (sorted by updatedAt)
        const sorted = [...products].sort((a: Product, b: Product) => 
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
        setRecentProducts(sorted.slice(0, 10));
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [token]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
  }, [token]);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const handleProductPress = (product: Product) => {
    router.push(`/(tabs)/scan?barcode=${product.barcode}`);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={AppColors.background} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.fullName?.charAt(0).toUpperCase() || 'U'}
          </Text>
        </TouchableOpacity>
        
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerButton}>
            <IconSymbol size={22} name="bell.fill" color={AppColors.textSecondary} />
            <View style={styles.notificationDot} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton}>
            <IconSymbol size={22} name="plus" color={AppColors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor={AppColors.primary}
          />
        }
      >
        {/* Search Bar */}
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
          <TouchableOpacity style={styles.filterButton}>
            <IconSymbol size={20} name="slider.horizontal.3" color={AppColors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, styles.statCardRed]}>
            <View style={styles.statIconContainer}>
              <IconSymbol size={24} name="exclamationmark.triangle.fill" color={AppColors.error} />
            </View>
            <Text style={styles.statNumber}>{outOfStockCount}</Text>
            <Text style={styles.statLabel}>Out of Stock</Text>
          </View>
          
          <View style={[styles.statCard, styles.statCardOrange]}>
            <View style={styles.statIconContainer}>
              <IconSymbol size={24} name="arrow.down.circle.fill" color={AppColors.warning} />
            </View>
            <Text style={styles.statNumber}>{lowStockCount}</Text>
            <Text style={styles.statLabel}>Low Stock</Text>
          </View>
          
          <View style={[styles.statCard, styles.statCardGreen]}>
            <View style={styles.statIconContainer}>
              <IconSymbol size={24} name="shippingbox.fill" color={AppColors.success} />
            </View>
            <Text style={styles.statNumber}>{stats.totalProducts}</Text>
            <Text style={styles.statLabel}>Total Items</Text>
          </View>
        </View>

        {/* Recent Documents */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Documents</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/inventory')}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          
          {recentProducts.length > 0 ? (
            recentProducts.map((product) => (
              <TouchableOpacity 
                key={product._id} 
                style={styles.documentCard}
                onPress={() => handleProductPress(product)}
                activeOpacity={0.7}
              >
                <View style={styles.documentImage}>
                  {product.imageUrl ? (
                    <Image source={{ uri: product.imageUrl }} style={styles.productImage} />
                  ) : (
                    <View style={styles.placeholderImage}>
                      <IconSymbol size={24} name="shippingbox.fill" color={AppColors.textMuted} />
                    </View>
                  )}
                </View>
                <View style={styles.documentInfo}>
                  <Text style={styles.documentName} numberOfLines={1}>{product.name}</Text>
                  <View style={styles.documentMeta}>
                    <View style={styles.userBadge}>
                      <Text style={styles.userBadgeText}>
                        {user?.fullName?.split(' ')[0] || 'User'}
                      </Text>
                    </View>
                    <Text style={styles.documentTime}>{formatTime(product.updatedAt)}</Text>
                  </View>
                </View>
                <View style={styles.documentTrend}>
                  <IconSymbol 
                    size={20} 
                    name={product.currentStock > 10 ? "arrow.up.right" : "arrow.down.right"} 
                    color={product.currentStock > 10 ? AppColors.success : AppColors.error} 
                  />
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyState}>
              <IconSymbol size={48} name="doc.text" color={AppColors.textMuted} />
              <Text style={styles.emptyText}>No recent activity</Text>
            </View>
          )}
        </View>
        
        {/* Bottom Padding for Tab Bar */}
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: AppColors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: AppColors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: AppColors.primary,
  },
  scrollView: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
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
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: AppColors.surface,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  statCardRed: {
    borderLeftWidth: 3,
    borderLeftColor: AppColors.error,
  },
  statCardOrange: {
    borderLeftWidth: 3,
    borderLeftColor: AppColors.warning,
  },
  statCardGreen: {
    borderLeftWidth: 3,
    borderLeftColor: AppColors.success,
  },
  statIconContainer: {
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: AppColors.textPrimary,
  },
  statLabel: {
    fontSize: 11,
    color: AppColors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  section: {
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: AppColors.textPrimary,
  },
  viewAllText: {
    fontSize: 14,
    color: AppColors.textSecondary,
  },
  documentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.surface,
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    gap: 12,
  },
  documentImage: {
    width: 56,
    height: 56,
    borderRadius: 12,
    overflow: 'hidden',
  },
  productImage: {
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
  documentInfo: {
    flex: 1,
  },
  documentName: {
    fontSize: 16,
    fontWeight: '500',
    color: AppColors.textPrimary,
    marginBottom: 6,
  },
  documentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  userBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.surfaceLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  userBadgeText: {
    fontSize: 12,
    color: AppColors.textSecondary,
  },
  documentTime: {
    fontSize: 12,
    color: AppColors.textMuted,
  },
  documentTrend: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: AppColors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    color: AppColors.textMuted,
    marginTop: 12,
  },
});
