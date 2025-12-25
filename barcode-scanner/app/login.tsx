import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
  StatusBar,
  SafeAreaView,
} from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { AppColors } from '@/constants/theme';
import { IconSymbol } from '@/components/ui/icon-symbol';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter both username and password');
      return;
    }

    setIsLoading(true);
    try {
      const result = await login(username, password);
      if (!result.success) {
        Alert.alert('Login Failed', result.message || 'Invalid credentials');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={AppColors.background} />
      <KeyboardAvoidingView 
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.content}>
          {/* Logo */}
          <View style={styles.logoContainer}>
            <View style={styles.logoWrapper}>
              <Image 
                source={require('@/assets/images/logo-shalset.png')} 
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
          </View>

          {/* Title */}
          <View style={styles.header}>
            <Text style={styles.title}>Shalset Scanner</Text>
            <Text style={styles.subtitle}>Sign in to your account</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <View style={styles.inputWrapper}>
                <IconSymbol size={20} name="person.fill" color={AppColors.textMuted} />
                <TextInput
                  style={styles.input}
                  placeholder="Username"
                  placeholderTextColor={AppColors.textMuted}
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isLoading}
                />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <View style={styles.inputWrapper}>
                <IconSymbol size={20} name="lock.fill" color={AppColors.textMuted} />
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor={AppColors.textMuted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isLoading}
                  onSubmitEditing={handleLogin}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <IconSymbol 
                    size={20} 
                    name={showPassword ? "eye.slash.fill" : "eye.fill"} 
                    color={AppColors.textMuted} 
                  />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Sign In</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Demo Accounts */}
          <View style={styles.footer}>
            <Text style={styles.footerLabel}>Demo Accounts</Text>
            <View style={styles.demoAccounts}>
              <View style={styles.demoAccount}>
                <Text style={styles.demoText}>admin</Text>
                <Text style={styles.demoDivider}>•</Text>
                <Text style={styles.demoText}>admin123</Text>
              </View>
              <View style={styles.demoAccount}>
                <Text style={styles.demoText}>user1</Text>
                <Text style={styles.demoDivider}>•</Text>
                <Text style={styles.demoText}>user123</Text>
              </View>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoWrapper: {
    width: 100,
    height: 100,
    borderRadius: 24,
    backgroundColor: AppColors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: AppColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  logo: {
    width: 70,
    height: 70,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: AppColors.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: AppColors.textSecondary,
  },
  form: {
    gap: 16,
  },
  inputContainer: {
    marginBottom: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.surface,
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 56,
    gap: 12,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: AppColors.textPrimary,
  },
  button: {
    backgroundColor: AppColors.primary,
    borderRadius: 14,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: AppColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  footer: {
    marginTop: 48,
    alignItems: 'center',
  },
  footerLabel: {
    fontSize: 13,
    color: AppColors.textMuted,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  demoAccounts: {
    gap: 8,
  },
  demoAccount: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.surface,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  demoText: {
    fontSize: 14,
    color: AppColors.textSecondary,
    fontFamily: 'monospace',
  },
  demoDivider: {
    color: AppColors.textMuted,
  },
});
