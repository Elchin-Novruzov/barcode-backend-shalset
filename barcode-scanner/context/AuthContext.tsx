import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_ENDPOINTS } from '@/constants/api';

interface User {
  id: string;
  username: string;
  fullName: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_TOKEN_KEY = 'auth_token';
const USER_DATA_KEY = 'user_data';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing auth on app start
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const storedToken = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
      const storedUser = await AsyncStorage.getItem(USER_DATA_KEY);

      if (storedToken && storedUser) {
        // We have stored credentials - use them
        const parsedUser = JSON.parse(storedUser);
        setToken(storedToken);
        setUser(parsedUser);
        
        // Try to verify token in background (non-blocking)
        try {
          const response = await fetch(API_ENDPOINTS.ME, {
            headers: {
              'Authorization': `Bearer ${storedToken}`,
            },
          });

          if (response.status === 401) {
            // Token is explicitly invalid, clear and require re-login
            console.log('Token expired, requiring re-login');
            await clearAuthData();
          } else if (response.ok) {
            // Update user data from server
            const data = await response.json();
            setUser(data.user);
            await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(data.user));
          }
          // For other errors (network, 500, etc.) - keep using cached credentials
        } catch (networkError) {
          // Network error - keep using cached credentials (offline support)
          console.log('Network unavailable, using cached credentials');
        }
      }
      // If no stored credentials, user stays unauthenticated (will see login screen)
    } catch (error) {
      console.error('Auth check error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const clearAuthData = async () => {
    await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
    await AsyncStorage.removeItem(USER_DATA_KEY);
    setToken(null);
    setUser(null);
  };

  const login = async (username: string, password: string): Promise<{ success: boolean; message?: string }> => {
    try {
      const response = await fetch(API_ENDPOINTS.LOGIN, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username: username.toLowerCase().trim(), password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Store auth data
        await AsyncStorage.setItem(AUTH_TOKEN_KEY, data.token);
        await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(data.user));
        
        setToken(data.token);
        setUser(data.user);
        
        return { success: true };
      } else {
        return { success: false, message: data.message || 'Login failed' };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: 'Network error. Please check your connection.' };
    }
  };

  const logout = async () => {
    try {
      // Try to notify server (optional, will work even if it fails)
      if (token) {
        await fetch(API_ENDPOINTS.LOGOUT, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }).catch(() => {});
      }
    } finally {
      await clearAuthData();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!token && !!user,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
