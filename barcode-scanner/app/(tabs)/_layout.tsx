import { Tabs } from 'expo-router';
import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { AppColors } from '@/constants/theme';

export default function TabLayout() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: AppColors.primary,
          tabBarInactiveTintColor: AppColors.tabIconDefault,
          headerShown: false,
          tabBarButton: HapticTab,
          tabBarStyle: {
            backgroundColor: AppColors.tabBarBackground,
            borderTopColor: AppColors.border,
            borderTopWidth: 1,
            height: 70,
            paddingTop: 8,
            paddingBottom: 12,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '500',
          },
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color }) => <IconSymbol size={24} name="house.fill" color={color} />,
          }}
        />
        <Tabs.Screen
          name="inventory"
          options={{
            title: 'Inventory',
            tabBarIcon: ({ color }) => <IconSymbol size={24} name="shippingbox.fill" color={color} />,
          }}
        />
        <Tabs.Screen
          name="scan"
          options={{
            title: '',
            tabBarIcon: () => null,
            tabBarButton: () => null,
          }}
        />
        <Tabs.Screen
          name="reports"
          options={{
            title: 'Reports',
            tabBarIcon: ({ color }) => <IconSymbol size={24} name="doc.text.fill" color={color} />,
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: 'Settings',
            tabBarIcon: ({ color }) => <IconSymbol size={24} name="gearshape.fill" color={color} />,
          }}
        />
        <Tabs.Screen
          name="explore"
          options={{
            href: null,
          }}
        />
      </Tabs>
      
      {/* Floating Scan Button */}
      <TouchableOpacity 
        style={styles.scanButton}
        onPress={() => router.push('/(tabs)/scan')}
        activeOpacity={0.8}
      >
        <IconSymbol size={28} name="barcode.viewfinder" color="#FFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  scanButton: {
    position: 'absolute',
    bottom: 25,
    alignSelf: 'center',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: AppColors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: AppColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 100,
  },
});
