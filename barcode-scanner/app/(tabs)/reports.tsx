import React, { useState, useEffect, useCallback } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  ScrollView,
  StatusBar,
  SafeAreaView,
  RefreshControl,
  ActivityIndicator
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { AppColors } from '@/constants/theme';
import { API_ENDPOINTS } from '@/constants/api';
import { useAuth } from '@/context/AuthContext';
import { IconSymbol } from '@/components/ui/icon-symbol';

interface DashboardStats {
  totalProducts: number;
  totalBuyValue: number;
  totalSellValue: number;
  monthlyProfit: number;
}

export default function ReportsScreen() {
  const { token } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalProducts: 0,
    totalBuyValue: 0,
    totalSellValue: 0,
    monthlyProfit: 0
  });
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchStats = useCallback(async (showRefreshing = false) => {
    if (!token) return;
    if (showRefreshing) setRefreshing(true);
    
    try {
      const response = await fetch(API_ENDPOINTS.STATS_DASHBOARD, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, [token]);

  // Initial load
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Auto-refresh when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchStats();
    }, [fetchStats])
  );

  const onRefresh = useCallback(() => {
    fetchStats(true);
  }, [fetchStats]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={AppColors.background} />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Reports</Text>
        {lastUpdated && (
          <Text style={styles.lastUpdated}>
            Updated: {lastUpdated.toLocaleTimeString()}
          </Text>
        )}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={AppColors.primary} />
          <Text style={styles.loadingText}>Loading reports...</Text>
        </View>
      ) : null}

      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={AppColors.primary}
            colors={[AppColors.primary]}
          />
        }
      >
        {/* Financial Overview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Financial Overview</Text>
          
          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <IconSymbol size={24} name="dollarsign.circle.fill" color={AppColors.primary} />
            </View>
            <View style={styles.statInfo}>
              <Text style={styles.statLabel}>Total Inventory Cost</Text>
              <Text style={styles.statValue}>${stats.totalBuyValue.toLocaleString()}</Text>
            </View>
          </View>
          
          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <IconSymbol size={24} name="chart.line.uptrend.xyaxis" color={AppColors.success} />
            </View>
            <View style={styles.statInfo}>
              <Text style={styles.statLabel}>Total Inventory Worth</Text>
              <Text style={[styles.statValue, { color: AppColors.success }]}>
                ${stats.totalSellValue.toLocaleString()}
              </Text>
            </View>
          </View>
          
          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <IconSymbol size={24} name="arrow.up.right.circle.fill" color={stats.monthlyProfit >= 0 ? AppColors.success : AppColors.error} />
            </View>
            <View style={styles.statInfo}>
              <Text style={styles.statLabel}>Monthly Profit</Text>
              <Text style={[styles.statValue, { color: stats.monthlyProfit >= 0 ? AppColors.success : AppColors.error }]}>
                {stats.monthlyProfit >= 0 ? '+' : ''}${stats.monthlyProfit.toLocaleString()}
              </Text>
            </View>
          </View>
        </View>

        {/* Inventory Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Inventory Summary</Text>
          
          <View style={styles.summaryGrid}>
            <View style={styles.summaryCard}>
              <IconSymbol size={32} name="shippingbox.fill" color={AppColors.primary} />
              <Text style={styles.summaryValue}>{stats.totalProducts}</Text>
              <Text style={styles.summaryLabel}>Total Products</Text>
            </View>
            
            <View style={styles.summaryCard}>
              <IconSymbol size={32} name="chart.pie.fill" color={AppColors.info} />
              <Text style={styles.summaryValue}>
                ${(stats.totalSellValue - stats.totalBuyValue).toLocaleString()}
              </Text>
              <Text style={styles.summaryLabel}>Potential Profit</Text>
            </View>
          </View>
        </View>

        {/* Coming Soon */}
        <View style={styles.section}>
          <View style={styles.comingSoon}>
            <IconSymbol size={48} name="chart.bar.fill" color={AppColors.textMuted} />
            <Text style={styles.comingSoonTitle}>More Reports Coming Soon</Text>
            <Text style={styles.comingSoonText}>
              Detailed analytics, charts, and export features will be available in future updates.
            </Text>
          </View>
        </View>
        
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
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: AppColors.textPrimary,
  },
  lastUpdated: {
    fontSize: 12,
    color: AppColors.textSecondary,
    marginTop: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: AppColors.textSecondary,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: AppColors.textPrimary,
    marginBottom: 16,
  },
  statCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    gap: 16,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: AppColors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statInfo: {
    flex: 1,
  },
  statLabel: {
    fontSize: 14,
    color: AppColors.textSecondary,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: AppColors.textPrimary,
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: AppColors.surface,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: AppColors.textPrimary,
    marginTop: 12,
  },
  summaryLabel: {
    fontSize: 12,
    color: AppColors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  comingSoon: {
    backgroundColor: AppColors.surface,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
  },
  comingSoonTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: AppColors.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  comingSoonText: {
    fontSize: 14,
    color: AppColors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
