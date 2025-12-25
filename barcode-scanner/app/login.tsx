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
} from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

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
    <KeyboardAvoidingView 
      style={[styles.container, isDark && styles.containerDark]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Image 
            source={require('@/assets/images/logo-shalset.png')} 
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={[styles.title, isDark && styles.textDark]}>Shalset Scanner</Text>
          <Text style={[styles.subtitle, isDark && styles.subtitleDark]}>Sign in to continue</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={[styles.label, isDark && styles.textDark]}>Username</Text>
            <TextInput
              style={[styles.input, isDark && styles.inputDark]}
              placeholder="Enter username"
              placeholderTextColor={isDark ? '#888' : '#999'}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={[styles.label, isDark && styles.textDark]}>Password</Text>
            <TextInput
              style={[styles.input, isDark && styles.inputDark]}
              placeholder="Enter password"
              placeholderTextColor={isDark ? '#888' : '#999'}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
              onSubmitEditing={handleLogin}
            />
          </View>

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Sign In</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, isDark && styles.subtitleDark]}>
            Demo accounts:
          </Text>
          <Text style={[styles.footerText, isDark && styles.subtitleDark]}>
            admin / admin123
          </Text>
          <Text style={[styles.footerText, isDark && styles.subtitleDark]}>
            user1 / user123
          </Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  containerDark: {
    backgroundColor: '#121212',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logo: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  subtitleDark: {
    color: '#aaa',
  },
  textDark: {
    color: '#fff',
  },
  form: {
    gap: 16,
  },
  inputContainer: {
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#333',
  },
  inputDark: {
    backgroundColor: '#1e1e1e',
    borderColor: '#333',
    color: '#fff',
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
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
    gap: 4,
  },
  footerText: {
    fontSize: 12,
    color: '#888',
  },
});
