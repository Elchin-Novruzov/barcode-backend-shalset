// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolWeight, SymbolViewProps } from 'expo-symbols';
import { ComponentProps } from 'react';
import { OpaqueColorValue, type StyleProp, type TextStyle } from 'react-native';

type IconMapping = Record<SymbolViewProps['name'], ComponentProps<typeof MaterialIcons>['name']>;
type IconSymbolName = keyof typeof MAPPING;

/**
 * Add your SF Symbols to Material Icons mappings here.
 * - see Material Icons in the [Icons Directory](https://icons.expo.fyi).
 * - see SF Symbols in the [SF Symbols](https://developer.apple.com/sf-symbols/) app.
 */
const MAPPING = {
  // Navigation & Tab Bar
  'house.fill': 'home',
  'shippingbox.fill': 'inventory-2',
  'shippingbox': 'inventory-2',
  'doc.text.fill': 'description',
  'gearshape.fill': 'settings',
  'barcode.viewfinder': 'qr-code-scanner',
  'barcode': 'qr-code',
  
  // Common UI
  'chevron.right': 'chevron-right',
  'chevron.left': 'chevron-left',
  'xmark': 'close',
  'plus': 'add',
  'minus': 'remove',
  'magnifyingglass': 'search',
  'slider.horizontal.3': 'tune',
  'doc.text': 'description',
  
  // Actions
  'paperplane.fill': 'send',
  'chevron.left.forwardslash.chevron.right': 'code',
  'bell.fill': 'notifications',
  'person.fill': 'person',
  'lock.fill': 'lock',
  'eye.fill': 'visibility',
  'eye.slash.fill': 'visibility-off',
  
  // Settings icons
  'moon.fill': 'dark-mode',
  'globe': 'language',
  'iphone.radiowaves.left.and.right': 'settings-remote',
  'questionmark.circle.fill': 'help',
  'envelope.fill': 'email',
  'rectangle.portrait.and.arrow.right': 'logout',
  
  // Stats & Data
  'exclamationmark.triangle.fill': 'warning',
  'arrow.down.circle.fill': 'arrow-downward',
  'cube.box.fill': 'inventory',
  'arrow.up.right': 'trending-up',
  'arrow.down.right': 'trending-down',
  'chart.bar.fill': 'bar-chart',
  'chart.pie.fill': 'pie-chart',
  'chart.line.uptrend.xyaxis': 'show-chart',
  'arrow.up.right.circle.fill': 'arrow-circle-up',
  'dollarsign.circle.fill': 'attach-money',
  
  // Documents
  'doc.fill': 'description',
  'folder.fill': 'folder',
  'tray.full.fill': 'inbox',
} as IconMapping;

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 * This ensures a consistent look across platforms, and optimal resource usage.
 * Icon `name`s are based on SF Symbols and require manual mapping to Material Icons.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}
