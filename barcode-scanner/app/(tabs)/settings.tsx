import React, { useState } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView,
  Alert,
  StatusBar,
  SafeAreaView,
  Modal,
  TextInput,
  ActivityIndicator,
  Image
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { AppColors } from '@/constants/theme';
import { API_ENDPOINTS } from '@/constants/api';
import { useAuth } from '@/context/AuthContext';
import { IconSymbol } from '@/components/ui/icon-symbol';

interface SettingItemProps {
  icon: string;
  iconColor?: string;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  showArrow?: boolean;
  danger?: boolean;
}

const SettingItem: React.FC<SettingItemProps> = ({ 
  icon, 
  iconColor = AppColors.textSecondary, 
  title, 
  subtitle, 
  onPress, 
  showArrow = true,
  danger = false 
}) => (
  <TouchableOpacity 
    style={styles.settingItem} 
    onPress={onPress}
    activeOpacity={0.7}
  >
    <View style={[styles.settingIcon, { backgroundColor: iconColor + '20' }]}>
      <IconSymbol size={20} name={icon as any} color={iconColor} />
    </View>
    <View style={styles.settingInfo}>
      <Text style={[styles.settingTitle, danger && { color: AppColors.error }]}>{title}</Text>
      {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
    </View>
    {showArrow && (
      <IconSymbol size={16} name="chevron.right" color={AppColors.textMuted} />
    )}
  </TouchableOpacity>
);

export default function SettingsScreen() {
  const { user, token, logout, refreshUser } = useAuth();
  
  // Edit Profile Modal State
  const [editProfileVisible, setEditProfileVisible] = useState(false);
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [profileImage, setProfileImage] = useState<string | null>(user?.profileImage || null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');

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

  const openEditProfile = () => {
    setFullName(user?.fullName || '');
    setProfileImage(user?.profileImage || null);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setError('');
    setEditProfileVisible(true);
  };

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Please allow access to your photo library to change your profile photo.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.3,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
      setProfileImage(base64Image);
    }
  };

  const removeImage = () => {
    Alert.alert(
      'Remove Photo',
      'Are you sure you want to remove your profile photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => setProfileImage(null) },
      ]
    );
  };

  const handleUpdateProfile = async () => {
    setError('');
    
    if (!fullName.trim()) {
      setError('Full name is required');
      return;
    }
    
    if (newPassword) {
      if (!currentPassword) {
        setError('Current password is required to change password');
        return;
      }
      if (newPassword.length < 6) {
        setError('New password must be at least 6 characters');
        return;
      }
      if (newPassword !== confirmPassword) {
        setError('New passwords do not match');
        return;
      }
    }
    
    setUpdating(true);
    
    try {
      const body: any = { fullName: fullName.trim() };
      
      // Include profile image (can be base64 string or null to remove)
      if (profileImage !== user?.profileImage) {
        body.profileImage = profileImage;
      }
      
      if (newPassword) {
        body.currentPassword = currentPassword;
        body.newPassword = newPassword;
      }
      
      const response = await fetch(API_ENDPOINTS.UPDATE_PROFILE, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      
      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        console.error('Failed to parse response:', parseError);
        setError('Server error. Please try again.');
        return;
      }
      
      if (response.ok) {
        // Refresh user data
        if (refreshUser) {
          await refreshUser();
        }
        setEditProfileVisible(false);
        Alert.alert('Success', 'Profile updated successfully');
      } else {
        setError(data.message || 'Failed to update profile');
      }
    } catch (err: any) {
      console.error('Profile update error:', err);
      setError(err?.message || 'Failed to update profile. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={AppColors.background} />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Profile Section */}
        <View style={styles.profileSection}>
          <View style={styles.avatar}>
            {user?.profileImage ? (
              <Image source={{ uri: user.profileImage }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarText}>
                {user?.fullName?.charAt(0).toUpperCase() || 'U'}
              </Text>
            )}
          </View>
          <Text style={styles.profileName}>{user?.fullName || 'User'}</Text>
          <Text style={styles.profileUsername}>@{user?.username || 'unknown'}</Text>
          {user?.role && (
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>{user.role.toUpperCase()}</Text>
            </View>
          )}
        </View>

        {/* Account Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.sectionContent}>
            <SettingItem 
              icon="person.fill"
              iconColor={AppColors.primary}
              title="Edit Profile"
              subtitle="Update your personal information"
              onPress={openEditProfile}
            />
            <SettingItem 
              icon="lock.fill"
              iconColor={AppColors.warning}
              title="Change Password"
              subtitle="Update your password"
            />
            <SettingItem 
              icon="bell.fill"
              iconColor={AppColors.info}
              title="Notifications"
              subtitle="Configure notification preferences"
            />
          </View>
        </View>

        {/* App Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App</Text>
          <View style={styles.sectionContent}>
            <SettingItem 
              icon="moon.fill"
              iconColor="#9C27B0"
              title="Appearance"
              subtitle="Dark mode"
            />
            <SettingItem 
              icon="globe"
              iconColor={AppColors.success}
              title="Language"
              subtitle="English"
            />
            <SettingItem 
              icon="iphone.radiowaves.left.and.right"
              iconColor="#00BCD4"
              title="Scanner Settings"
              subtitle="Configure barcode scanner"
            />
          </View>
        </View>

        {/* Support */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>
          <View style={styles.sectionContent}>
            <SettingItem 
              icon="questionmark.circle.fill"
              iconColor={AppColors.info}
              title="Help Center"
            />
            <SettingItem 
              icon="envelope.fill"
              iconColor={AppColors.success}
              title="Contact Us"
            />
            <SettingItem 
              icon="doc.text.fill"
              iconColor={AppColors.textSecondary}
              title="Terms & Privacy"
            />
          </View>
        </View>

        {/* Logout */}
        <View style={styles.section}>
          <View style={styles.sectionContent}>
            <SettingItem 
              icon="rectangle.portrait.and.arrow.right"
              iconColor={AppColors.error}
              title="Logout"
              onPress={handleLogout}
              showArrow={false}
              danger
            />
          </View>
        </View>

        {/* App Version */}
        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>Shalset Scanner v1.0.0</Text>
        </View>
        
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal
        visible={editProfileVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditProfileVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setEditProfileVisible(false)}>
                <IconSymbol size={24} name="xmark" color={AppColors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Profile Photo */}
              <View style={styles.photoSection}>
                <TouchableOpacity style={styles.photoContainer} onPress={pickImage}>
                  {profileImage ? (
                    <Image source={{ uri: profileImage }} style={styles.photoImage} />
                  ) : (
                    <View style={styles.photoPlaceholder}>
                      <IconSymbol size={40} name="person.fill" color={AppColors.textMuted} />
                    </View>
                  )}
                  <View style={styles.photoEditBadge}>
                    <IconSymbol size={14} name="plus" color="#FFF" />
                  </View>
                </TouchableOpacity>
                <View style={styles.photoButtons}>
                  <TouchableOpacity style={styles.photoButton} onPress={pickImage}>
                    <Text style={styles.photoButtonText}>Change Photo</Text>
                  </TouchableOpacity>
                  {profileImage && (
                    <TouchableOpacity style={styles.photoButtonRemove} onPress={removeImage}>
                      <Text style={styles.photoButtonRemoveText}>Remove</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Full Name */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Full Name</Text>
                <TextInput
                  style={styles.input}
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Enter your full name"
                  placeholderTextColor={AppColors.textMuted}
                />
              </View>

              {/* Divider */}
              <View style={styles.divider}>
                <Text style={styles.dividerText}>Change Password (optional)</Text>
              </View>

              {/* Current Password */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Current Password</Text>
                <TextInput
                  style={styles.input}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  placeholder="Enter current password"
                  placeholderTextColor={AppColors.textMuted}
                  secureTextEntry
                />
              </View>

              {/* New Password */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>New Password</Text>
                <TextInput
                  style={styles.input}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="Enter new password"
                  placeholderTextColor={AppColors.textMuted}
                  secureTextEntry
                />
              </View>

              {/* Confirm Password */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Confirm New Password</Text>
                <TextInput
                  style={styles.input}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Confirm new password"
                  placeholderTextColor={AppColors.textMuted}
                  secureTextEntry
                />
              </View>

              {/* Error Message */}
              {error ? (
                <Text style={styles.errorText}>{error}</Text>
              ) : null}
            </ScrollView>

            {/* Buttons */}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setEditProfileVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, updating && styles.buttonDisabled]}
                onPress={handleUpdateProfile}
                disabled={updating}
              >
                {updating ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                )}
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
    paddingTop: 40,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: AppColors.textPrimary,
  },
  scrollView: {
    flex: 1,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 24,
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: AppColors.surface,
    borderRadius: 20,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: AppColors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  avatarText: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
  },
  profileName: {
    fontSize: 22,
    fontWeight: '600',
    color: AppColors.textPrimary,
    marginBottom: 4,
  },
  profileUsername: {
    fontSize: 14,
    color: AppColors.textSecondary,
    marginBottom: 12,
  },
  roleBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: AppColors.primary + '20',
    borderRadius: 12,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
    color: AppColors.primary,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: AppColors.textMuted,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  sectionContent: {
    backgroundColor: AppColors.surface,
    borderRadius: 16,
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.border,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  settingInfo: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: AppColors.textPrimary,
  },
  settingSubtitle: {
    fontSize: 13,
    color: AppColors.textSecondary,
    marginTop: 2,
  },
  versionContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  versionText: {
    fontSize: 13,
    color: AppColors.textMuted,
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
    maxHeight: '85%',
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
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: AppColors.textSecondary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: AppColors.surfaceLight,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: AppColors.textPrimary,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  divider: {
    paddingVertical: 16,
    marginBottom: 8,
    borderTopWidth: 1,
    borderTopColor: AppColors.border,
  },
  dividerText: {
    fontSize: 14,
    fontWeight: '600',
    color: AppColors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  errorText: {
    color: AppColors.error,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: AppColors.border,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: AppColors.surfaceLight,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.textSecondary,
  },
  saveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: AppColors.primary,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  // Photo picker styles
  photoSection: {
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.border,
  },
  photoContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  photoImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  photoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: AppColors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: AppColors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: AppColors.surface,
  },
  photoButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  photoButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: AppColors.primary,
    borderRadius: 20,
  },
  photoButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  photoButtonRemove: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: AppColors.surfaceLight,
    borderRadius: 20,
  },
  photoButtonRemoveText: {
    color: AppColors.error,
    fontSize: 14,
    fontWeight: '600',
  },
});
