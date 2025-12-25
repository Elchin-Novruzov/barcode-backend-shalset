/**
 * Modern dark theme with red accent colors
 */

import { Platform } from 'react-native';

// Brand Colors
export const AppColors = {
  // Primary red accent
  primary: '#E53935',
  primaryLight: '#FF6F61',
  primaryDark: '#B71C1C',
  
  // Backgrounds
  background: '#000000',
  surface: '#1A1A1A',
  surfaceLight: '#2A2A2A',
  card: '#1E1E1E',
  cardHover: '#252525',
  
  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#9E9E9E',
  textMuted: '#666666',
  
  // Status colors
  success: '#4CAF50',
  warning: '#FF9800',
  error: '#F44336',
  info: '#2196F3',
  
  // Border
  border: '#2D2D2D',
  borderLight: '#3D3D3D',
  
  // Tab bar
  tabBarBackground: '#0D0D0D',
  tabIconDefault: '#666666',
  tabIconSelected: '#E53935',
};

const tintColorLight = '#E53935';
const tintColorDark = '#E53935';

export const Colors = {
  light: {
    text: AppColors.textPrimary,
    background: AppColors.background,
    tint: tintColorLight,
    icon: AppColors.textSecondary,
    tabIconDefault: AppColors.tabIconDefault,
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: AppColors.textPrimary,
    background: AppColors.background,
    tint: tintColorDark,
    icon: AppColors.textSecondary,
    tabIconDefault: AppColors.tabIconDefault,
    tabIconSelected: tintColorDark,
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
