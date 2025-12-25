import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';

export default function HomeScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { user, logout } = useAuth();

  const handleStartScan = () => {
    router.push('/(tabs)/scan');
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: logout },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#000' : '#fff' }]}>
      {/* User Info Header */}
      <View style={[styles.header, { borderBottomColor: isDark ? '#333' : '#eee' }]}>
        <View style={styles.userInfo}>
          <View style={[styles.avatar, { backgroundColor: Colors[colorScheme ?? 'light'].tint }]}>
            <Text style={styles.avatarText}>
              {user?.fullName?.charAt(0).toUpperCase() || 'U'}
            </Text>
          </View>
          <View>
            <Text style={[styles.userName, { color: isDark ? '#fff' : '#000' }]}>
              {user?.fullName || 'User'}
            </Text>
            <Text style={[styles.userUsername, { color: isDark ? '#888' : '#666' }]}>
              @{user?.username || 'unknown'}
            </Text>
          </View>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Image 
          source={require('@/assets/images/logo-shalset.png')} 
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={[styles.title, { color: isDark ? '#fff' : '#000' }]}>
          Shalset Scanner
        </Text>
        <Text style={[styles.subtitle, { color: isDark ? '#aaa' : '#666' }]}>
          Scan barcodes using a keyboard wedge scanner
        </Text>
        
        <TouchableOpacity
          style={[styles.button, { backgroundColor: Colors[colorScheme ?? 'light'].tint }]}
          onPress={handleStartScan}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>Start Scan</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
  },
  userUsername: {
    fontSize: 13,
  },
  logoutButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#ff3b3020',
  },
  logoutText: {
    color: '#ff3b30',
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 40,
  },
  button: {
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
