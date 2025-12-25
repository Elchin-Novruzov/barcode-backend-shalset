import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Platform,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
// Camera import
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { useFocusEffect } from 'expo-router';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { API_ENDPOINTS } from '@/constants/api';
import { useAuth } from '@/context/AuthContext';

const MAX_HISTORY_ITEMS = 20;
const INACTIVITY_TIMEOUT_MS = 100;
const SCAN_DELAY_MS = 300; // Delay before scanning to allow camera alignment
const REQUIRED_CONSISTENT_READS = 3; // Number of identical reads required to confirm scan
const SCAN_VALIDATION_WINDOW_MS = 500; // Time window for consistent reads

type ScanMode = 'camera' | 'keyboard';

// Set to true to enable camera scanning, false to disable
const CAMERA_ENABLED = true;

export default function ScanScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { token } = useAuth();
  
  const inputRef = useRef<TextInput>(null);
  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scanDelayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastScannedRef = useRef<string>('');
  const scanCooldownRef = useRef<boolean>(false);
  
  // Barcode validation refs for consistent read confirmation
  const pendingBarcodeRef = useRef<string>('');
  const readCountRef = useRef<number>(0);
  const validationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Camera permission hook
  const [permission, requestPermission] = useCameraPermissions();
  const [scanMode, setScanMode] = useState<ScanMode>('keyboard');
  const [buffer, setBuffer] = useState('');
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [recentScans, setRecentScans] = useState<string[]>([]);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [scanReady, setScanReady] = useState(false); // Controls scan delay
  const [validationProgress, setValidationProgress] = useState(0); // Show validation progress
  
    // Warehouse Modal State
    const [modalVisible, setModalVisible] = useState(false);
    const [modalLoading, setModalLoading] = useState(false);
    const [scannedBarcode, setScannedBarcode] = useState('');
    const [existingProduct, setExistingProduct] = useState<any>(null);
    const [productName, setProductName] = useState('');
    const [quantity, setQuantity] = useState('');
    const [note, setNote] = useState('');
    const [modalError, setModalError] = useState('');
    const [stockAction, setStockAction] = useState<'add' | 'remove'>('add');
    // New product pricing and location fields
    const [buyingPrice, setBuyingPrice] = useState('');
    const [sellingPrice, setSellingPrice] = useState('');
    const [boughtFrom, setBoughtFrom] = useState('');
    const [sellLocation, setSellLocation] = useState('');
    // Stock action supplier/location fields (for existing products)
    const [stockSupplier, setStockSupplier] = useState('');
    const [stockLocation, setStockLocation] = useState('');

  // Start scan delay timer when entering camera mode
  useEffect(() => {
    if (CAMERA_ENABLED && scanMode === 'camera') {
      setScanReady(false);
      scanDelayTimerRef.current = setTimeout(() => {
        setScanReady(true);
      }, SCAN_DELAY_MS);
    }
    return () => {
      if (scanDelayTimerRef.current) {
        clearTimeout(scanDelayTimerRef.current);
      }
    };
  }, [scanMode]);

  // Focus the input when screen is focused
  useFocusEffect(
    useCallback(() => {
      focusInput();
      return () => {
        if (inactivityTimerRef.current) {
          clearTimeout(inactivityTimerRef.current);
        }
      };
    }, [])
  );

  const focusInput = () => {
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  // Save scan to database
  const saveScanToDatabase = async (barcode: string, mode: ScanMode) => {
    try {
      const response = await fetch(API_ENDPOINTS.SCANS, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          barcode,
          scanMode: mode,
          deviceInfo: Platform.OS,
        }),
      });
      
      if (!response.ok) {
        console.error('Failed to save scan to database');
      }
    } catch (error) {
      console.error('Error saving scan:', error);
    }
  };

  // Check if product exists and show modal
  const checkProductAndShowModal = async (barcode: string) => {
    setScannedBarcode(barcode);
    setModalLoading(true);
    setModalError('');
    setProductName('');
    setQuantity('');
    setNote('');
    setBuyingPrice('');
    setSellingPrice('');
    setBoughtFrom('');
    setSellLocation('');
    setStockSupplier('');
    setStockLocation('');
    setExistingProduct(null);
    setModalVisible(true);

    try {
      const url = API_ENDPOINTS.CHECK_PRODUCT(barcode);
      console.log('Checking product at:', url);
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      const text = await response.text();
      console.log('Response status:', response.status);
      console.log('Response text:', text.substring(0, 200));
      
      // Try to parse as JSON
      let data;
      try {
        data = JSON.parse(text);
      } catch (parseError) {
        console.error('Failed to parse response as JSON:', text.substring(0, 500));
        setModalError('Server returned invalid response. Please try again.');
        return;
      }

      if (data.exists) {
        setExistingProduct(data.product);
      }
    } catch (error) {
      console.error('Error checking product:', error);
      setModalError('Failed to check product. Check your connection.');
    } finally {
      setModalLoading(false);
    }
  };

  // Create new product
  const handleCreateProduct = async () => {
    if (!productName.trim()) {
      setModalError('Product name is required');
      return;
    }
    if (!quantity || parseInt(quantity) <= 0) {
      setModalError('Valid quantity is required');
      return;
    }

    setModalLoading(true);
    setModalError('');

    try {
      const response = await fetch(API_ENDPOINTS.PRODUCTS, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          barcode: scannedBarcode,
          name: productName.trim(),
          quantity: parseInt(quantity),
          note: note.trim(),
          buyingPrice: parseFloat(buyingPrice) || 0,
          sellingPrice: parseFloat(sellingPrice) || 0,
          boughtFrom: boughtFrom.trim(),
          sellLocation: sellLocation.trim(),
        }),
      });

      const data = await response.json();
      if (response.ok) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        closeModal();
      } else {
        setModalError(data.message || 'Failed to create product');
      }
    } catch (error) {
      setModalError('Failed to create product');
    } finally {
      setModalLoading(false);
    }
  };

  // Add stock to existing product
  const handleAddStock = async () => {
    if (!quantity || parseInt(quantity) <= 0) {
      setModalError('Valid quantity is required');
      return;
    }

    setModalLoading(true);
    setModalError('');

    try {
      const response = await fetch(API_ENDPOINTS.ADD_STOCK(scannedBarcode), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          quantity: parseInt(quantity),
          note: note.trim(),
          supplier: stockSupplier.trim(),
        }),
      });

      const data = await response.json();
      if (response.ok) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        closeModal();
      } else {
        setModalError(data.message || 'Failed to add stock');
      }
    } catch (error) {
      setModalError('Failed to add stock');
    } finally {
      setModalLoading(false);
    }
  };

  // Remove stock from existing product
  const handleRemoveStock = async () => {
    if (!quantity || parseInt(quantity) <= 0) {
      setModalError('Valid quantity is required');
      return;
    }

    const qty = parseInt(quantity);
    if (existingProduct && qty > existingProduct.currentStock) {
      setModalError(`Cannot remove ${qty}. Only ${existingProduct.currentStock} in stock.`);
      return;
    }

    setModalLoading(true);
    setModalError('');

    try {
      const response = await fetch(API_ENDPOINTS.REMOVE_STOCK(scannedBarcode), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          quantity: qty,
          note: note.trim(),
          location: stockLocation.trim(),
        }),
      });

      const data = await response.json();
      if (response.ok) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        closeModal();
      } else {
        setModalError(data.message || 'Failed to remove stock');
      }
    } catch (error) {
      setModalError('Failed to remove stock');
    } finally {
      setModalLoading(false);
    }
  };

  // Handle stock action (add or remove)
  const handleStockAction = () => {
    if (stockAction === 'add') {
      handleAddStock();
    } else {
      handleRemoveStock();
    }
  };

  const closeModal = () => {
    setModalVisible(false);
    setScannedBarcode('');
    setExistingProduct(null);
    setProductName('');
    setQuantity('');
    setNote('');
    setModalError('');
    setStockAction('add');
    setBuyingPrice('');
    setSellingPrice('');
    setBoughtFrom('');
    setSellLocation('');
    setStockSupplier('');
    setStockLocation('');
    if (scanMode === 'keyboard') focusInput();
  };

  const completeScan = (barcode: string) => {
    const trimmedBarcode = barcode.trim();
    
    if (trimmedBarcode.length === 0) {
      setBuffer('');
      if (scanMode === 'keyboard') focusInput();
      return;
    }

    // Prevent duplicate scans within cooldown period
    if (trimmedBarcode === lastScannedRef.current && scanCooldownRef.current) {
      return;
    }

    // Set cooldown
    lastScannedRef.current = trimmedBarcode;
    scanCooldownRef.current = true;
    setTimeout(() => {
      scanCooldownRef.current = false;
    }, 2000); // 2 second cooldown for same barcode

    // Vibrate
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Update last scanned
    setLastScanned(trimmedBarcode);

    // Add to recent scans (prepend and limit to MAX_HISTORY_ITEMS)
    setRecentScans((prev) => {
      const newScans = [trimmedBarcode, ...prev];
      return newScans.slice(0, MAX_HISTORY_ITEMS);
    });

    // Clear buffer
    setBuffer('');

    // Save to database (async, non-blocking)
    saveScanToDatabase(trimmedBarcode, scanMode);

    // Check product and show warehouse modal
    checkProductAndShowModal(trimmedBarcode);

    // Refocus input for keyboard mode
    if (scanMode === 'keyboard') {
      focusInput();
    }

    // Reset scan delay for next scan in camera mode
    if (scanMode === 'camera') {
      setScanReady(false);
      scanDelayTimerRef.current = setTimeout(() => {
        setScanReady(true);
      }, SCAN_DELAY_MS);
    }
  };

  const resetInactivityTimer = () => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }

    if (buffer.length > 0) {
      inactivityTimerRef.current = setTimeout(() => {
        completeScan(buffer);
      }, INACTIVITY_TIMEOUT_MS);
    }
  };

  const handleTextChange = (text: string) => {
    setBuffer(text);
  };

  useEffect(() => {
    if (buffer.length > 0 && scanMode === 'keyboard') {
      resetInactivityTimer();
    }
    return () => {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
    };
  }, [buffer, scanMode]);

  const handleKeyPress = (e: { nativeEvent: { key: string } }) => {
    if (e.nativeEvent.key === 'Enter') {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
      completeScan(buffer);
    }
  };

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    // Only process in camera mode when scan is ready
    if (scanMode !== 'camera' || !scanReady) {
      return;
    }

    const trimmedData = data.trim();
    if (trimmedData.length === 0) {
      return;
    }

    // Check if this is the same barcode as pending validation
    if (trimmedData === pendingBarcodeRef.current) {
      // Same barcode - increment read count
      readCountRef.current += 1;
      setValidationProgress(readCountRef.current);

      // Check if we have enough consistent reads
      if (readCountRef.current >= REQUIRED_CONSISTENT_READS) {
        // Clear validation state
        if (validationTimerRef.current) {
          clearTimeout(validationTimerRef.current);
        }
        pendingBarcodeRef.current = '';
        readCountRef.current = 0;
        setValidationProgress(0);
        
        // Complete the scan
        completeScan(trimmedData);
      }
    } else {
      // Different barcode - reset validation
      if (validationTimerRef.current) {
        clearTimeout(validationTimerRef.current);
      }
      
      pendingBarcodeRef.current = trimmedData;
      readCountRef.current = 1;
      setValidationProgress(1);

      // Set timeout to reset if no consistent reads within window
      validationTimerRef.current = setTimeout(() => {
        pendingBarcodeRef.current = '';
        readCountRef.current = 0;
        setValidationProgress(0);
      }, SCAN_VALIDATION_WINDOW_MS);
    }
  };

  const handleClearHistory = () => {
    setRecentScans([]);
    setLastScanned(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (scanMode === 'keyboard') focusInput();
  };

  const handleCopyLastScan = async () => {
    if (lastScanned) {
      await Clipboard.setStringAsync(lastScanned);
      setCopyFeedback(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setTimeout(() => setCopyFeedback(false), 1500);
      if (scanMode === 'keyboard') focusInput();
    }
  };

  const toggleScanMode = () => {
    const newMode = scanMode === 'camera' ? 'keyboard' : 'camera';
    setScanMode(newMode);
    if (newMode === 'keyboard') {
      setTimeout(focusInput, 200);
    }
  };

  const renderScanItem = ({ item, index }: { item: string; index: number }) => (
    <View style={[styles.scanItem, { backgroundColor: isDark ? '#1a1a1a' : '#f5f5f5' }]}>
      <Text style={[styles.scanItemIndex, { color: isDark ? '#666' : '#999' }]}>
        {index + 1}.
      </Text>
      <Text 
        style={[styles.scanItemText, { color: isDark ? '#fff' : '#000' }]}
        numberOfLines={1}
        ellipsizeMode="middle"
      >
        {item}
      </Text>
    </View>
  );

  // Camera permission handling
  if (CAMERA_ENABLED && scanMode === 'camera' && !permission) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: isDark ? '#000' : '#fff' }]}>
        <Text style={{ color: isDark ? '#fff' : '#000' }}>Loading camera...</Text>
      </View>
    );
  }

  if (CAMERA_ENABLED && scanMode === 'camera' && !permission?.granted) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: isDark ? '#000' : '#fff' }]}>
        <Text style={[styles.permissionText, { color: isDark ? '#fff' : '#000' }]}>
          Camera permission is required to scan barcodes
        </Text>
        <TouchableOpacity
          style={[styles.permissionButton, { backgroundColor: Colors[colorScheme ?? 'light'].tint }]}
          onPress={requestPermission}
        >
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeButton, { marginTop: 20 }]}
          onPress={toggleScanMode}
        >
          <Text style={[styles.modeButtonText, { color: Colors[colorScheme ?? 'light'].tint }]}>
            Use Keyboard Mode Instead
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#000' : '#fff' }]}>
      {/* Mode Toggle - Hidden while camera is disabled */}
      {CAMERA_ENABLED && (
        <View style={styles.modeToggle}>
          <TouchableOpacity
            style={[
              styles.modeTab,
              scanMode === 'camera' && { backgroundColor: Colors[colorScheme ?? 'light'].tint }
            ]}
            onPress={() => setScanMode('camera')}
          >
            <Text style={[
              styles.modeTabText,
              { color: scanMode === 'camera' ? '#fff' : (isDark ? '#aaa' : '#666') }
            ]}>
              Camera
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.modeTab,
              scanMode === 'keyboard' && { backgroundColor: Colors[colorScheme ?? 'light'].tint }
            ]}
            onPress={() => {
              setScanMode('keyboard');
              setTimeout(focusInput, 200);
            }}
          >
            <Text style={[
              styles.modeTabText,
              { color: scanMode === 'keyboard' ? '#fff' : (isDark ? '#aaa' : '#666') }
            ]}>
              Keyboard
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Camera View */}
      {CAMERA_ENABLED && scanMode === 'camera' && (
        <View style={styles.cameraContainer}>
          <CameraView
            style={styles.camera}
            facing="back"
            barcodeScannerSettings={{
              barcodeTypes: [
                'qr',
                'ean13',
                'ean8',
                'upc_a',
                'upc_e',
                'code39',
                'code93',
                'code128',
                'codabar',
                'itf14',
                'pdf417',
                'aztec',
                'datamatrix',
              ],
            }}
            onBarcodeScanned={handleBarcodeScanned}
          />
          <View style={styles.scanOverlay}>
            <View style={[styles.scanFrame, { 
              borderColor: validationProgress > 0 ? '#2196F3' : (scanReady ? '#4CAF50' : '#FFA500'),
              borderWidth: validationProgress > 0 ? 3 : 2
            }]} />
            <Text style={styles.scanStatus}>
              {!scanReady 
                ? 'Aligning...' 
                : validationProgress > 0 
                  ? `Validating ${validationProgress}/${REQUIRED_CONSISTENT_READS}` 
                  : 'Ready to scan'}
            </Text>
            {validationProgress > 0 && (
              <View style={styles.progressContainer}>
                {[...Array(REQUIRED_CONSISTENT_READS)].map((_, i) => (
                  <View 
                    key={i} 
                    style={[
                      styles.progressDot,
                      { backgroundColor: i < validationProgress ? '#4CAF50' : '#555' }
                    ]} 
                  />
                ))}
              </View>
            )}
          </View>
        </View>
      )}

      {/* Hidden TextInput for keyboard wedge scanning */}
      <TextInput
        ref={inputRef}
        style={styles.hiddenInput}
        value={buffer}
        onChangeText={handleTextChange}
        onKeyPress={handleKeyPress}
        autoFocus
        autoCapitalize="none"
        autoCorrect={false}
        blurOnSubmit={false}
        showSoftInputOnFocus={false}
        caretHidden
      />
      <View style={styles.keyboardModeInfo}>
        <View style={[styles.statusDot, { backgroundColor: '#4CAF50' }]} />
        <Text style={[styles.keyboardModeText, { color: isDark ? '#aaa' : '#666' }]}>
          Ready - Waiting for scanner input...
        </Text>
      </View>

      {/* Last Scanned Section */}
      <View style={styles.lastScannedSection}>
        <Text style={[styles.sectionLabel, { color: isDark ? '#aaa' : '#666' }]}>
          Last scanned:
        </Text>
        <View style={[styles.lastScannedBox, { 
          backgroundColor: isDark ? '#1a1a1a' : '#f0f0f0',
          borderColor: isDark ? '#333' : '#ddd'
        }]}>
          <Text 
            style={[styles.lastScannedText, { color: isDark ? '#fff' : '#000' }]}
            numberOfLines={2}
            ellipsizeMode="middle"
          >
            {lastScanned || 'No scans yet'}
          </Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[
            styles.actionButton,
            { backgroundColor: Colors[colorScheme ?? 'light'].tint },
            !lastScanned && styles.buttonDisabled
          ]}
          onPress={handleCopyLastScan}
          disabled={!lastScanned}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>
            {copyFeedback ? 'Copied!' : 'Copy last scan'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.actionButton,
            styles.clearButton,
            recentScans.length === 0 && styles.buttonDisabled
          ]}
          onPress={handleClearHistory}
          disabled={recentScans.length === 0}
          activeOpacity={0.8}
        >
          <Text style={[styles.buttonText, styles.clearButtonText]}>
            Clear history
          </Text>
        </TouchableOpacity>
      </View>

      {/* Recent Scans Section */}
      <View style={styles.recentSection}>
        <Text style={[styles.sectionLabel, { color: isDark ? '#aaa' : '#666' }]}>
          Recent scans ({recentScans.length}/{MAX_HISTORY_ITEMS}):
        </Text>
        
        {recentScans.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: isDark ? '#666' : '#999' }]}>
              Connect a barcode scanner to start scanning
            </Text>
          </View>
        ) : (
          <FlatList
            data={recentScans}
            renderItem={renderScanItem}
            keyExtractor={(item, index) => `${item}-${index}`}
            style={styles.scanList}
            showsVerticalScrollIndicator={true}
          />
        )}
      </View>

      {/* Warehouse Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={closeModal}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalContent, { backgroundColor: isDark ? '#1a1a1a' : '#fff' }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Header */}
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: isDark ? '#fff' : '#000' }]}>
                  {existingProduct ? 'Add to Stock' : 'New Product'}
                </Text>
                <TouchableOpacity onPress={closeModal} style={styles.closeButton}>
                  <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* Barcode Display */}
              <View style={[styles.barcodeDisplay, { backgroundColor: isDark ? '#333' : '#f0f0f0' }]}>
                <Text style={[styles.barcodeLabel, { color: isDark ? '#aaa' : '#666' }]}>Barcode</Text>
                <Text style={[styles.barcodeValue, { color: isDark ? '#fff' : '#000' }]}>{scannedBarcode}</Text>
              </View>

              {modalLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#2196F3" />
                  <Text style={[styles.loadingText, { color: isDark ? '#aaa' : '#666' }]}>
                    Checking product...
                  </Text>
                </View>
              ) : existingProduct ? (
                /* Existing Product - Manage Stock */
                <View>
                  <View style={[styles.productInfo, { backgroundColor: isDark ? '#333' : '#e8f5e9' }]}>
                    <Text style={[styles.productName, { color: isDark ? '#fff' : '#000' }]}>
                      {existingProduct.name}
                    </Text>
                    <Text style={[styles.currentStock, { color: isDark ? '#4CAF50' : '#2e7d32' }]}>
                      Current Stock: {existingProduct.currentStock}
                    </Text>
                    {existingProduct.note ? (
                      <Text style={[styles.productNote, { color: isDark ? '#aaa' : '#666' }]}>
                        Note: {existingProduct.note}
                      </Text>
                    ) : null}
                  </View>

                  {/* Action Toggle */}
                  <View style={styles.actionToggle}>
                    <TouchableOpacity
                      style={[
                        styles.actionToggleButton,
                        stockAction === 'add' && styles.actionToggleButtonActive,
                        { backgroundColor: stockAction === 'add' ? '#4CAF50' : (isDark ? '#333' : '#e0e0e0') }
                      ]}
                      onPress={() => { setStockAction('add'); setModalError(''); }}
                    >
                      <Text style={[
                        styles.actionToggleText,
                        { color: stockAction === 'add' ? '#fff' : (isDark ? '#aaa' : '#666') }
                      ]}>+ Add Stock</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.actionToggleButton,
                        stockAction === 'remove' && styles.actionToggleButtonActive,
                        { backgroundColor: stockAction === 'remove' ? '#f44336' : (isDark ? '#333' : '#e0e0e0') }
                      ]}
                      onPress={() => { setStockAction('remove'); setModalError(''); }}
                    >
                      <Text style={[
                        styles.actionToggleText,
                        { color: stockAction === 'remove' ? '#fff' : (isDark ? '#aaa' : '#666') }
                      ]}>- Remove Stock</Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={[styles.inputLabel, { color: isDark ? '#aaa' : '#666' }]}>
                    Quantity to {stockAction === 'add' ? 'Add' : 'Remove'} *
                  </Text>
                  <TextInput
                    style={[styles.modalInput, { 
                      backgroundColor: isDark ? '#333' : '#f5f5f5',
                      color: isDark ? '#fff' : '#000',
                      borderColor: stockAction === 'remove' ? '#f44336' : '#4CAF50',
                      borderWidth: 2
                    }]}
                    value={quantity}
                    onChangeText={setQuantity}
                    placeholder={`Enter quantity to ${stockAction}`}
                    placeholderTextColor={isDark ? '#666' : '#999'}
                    keyboardType="number-pad"
                  />

                  {/* Supplier field for adding stock */}
                  {stockAction === 'add' && (
                    <>
                      <Text style={[styles.inputLabel, { color: isDark ? '#aaa' : '#666' }]}>
                        Supplier (Where bought from)
                      </Text>
                      <TextInput
                        style={[styles.modalInput, { 
                          backgroundColor: isDark ? '#333' : '#f5f5f5',
                          color: isDark ? '#fff' : '#000'
                        }]}
                        value={stockSupplier}
                        onChangeText={setStockSupplier}
                        placeholder="e.g., ABC Supplier"
                        placeholderTextColor={isDark ? '#666' : '#999'}
                      />
                    </>
                  )}

                  {/* Location field for removing stock */}
                  {stockAction === 'remove' && (
                    <>
                      <Text style={[styles.inputLabel, { color: isDark ? '#aaa' : '#666' }]}>
                        Store/Location (Where sold)
                      </Text>
                      <TextInput
                        style={[styles.modalInput, { 
                          backgroundColor: isDark ? '#333' : '#f5f5f5',
                          color: isDark ? '#fff' : '#000'
                        }]}
                        value={stockLocation}
                        onChangeText={setStockLocation}
                        placeholder="e.g., Main Store"
                        placeholderTextColor={isDark ? '#666' : '#999'}
                      />
                    </>
                  )}

                  <Text style={[styles.inputLabel, { color: isDark ? '#aaa' : '#666' }]}>
                    Note (Optional) - Will be added to history
                  </Text>
                  <TextInput
                    style={[styles.modalInput, styles.noteInput, { 
                      backgroundColor: isDark ? '#333' : '#f5f5f5',
                      color: isDark ? '#fff' : '#000'
                    }]}
                    value={note}
                    onChangeText={setNote}
                    placeholder={stockAction === 'add' ? 'e.g., Received from supplier' : 'e.g., Sold to customer'}
                    placeholderTextColor={isDark ? '#666' : '#999'}
                    multiline
                  />
                </View>
              ) : (
                /* New Product Form */
                <View>
                  <View style={[styles.newProductBadge, { backgroundColor: '#2196F3' }]}>
                    <Text style={styles.newProductBadgeText}>New Product</Text>
                  </View>

                  <Text style={[styles.inputLabel, { color: isDark ? '#aaa' : '#666' }]}>
                    Product Name *
                  </Text>
                  <TextInput
                    style={[styles.modalInput, { 
                      backgroundColor: isDark ? '#333' : '#f5f5f5',
                      color: isDark ? '#fff' : '#000'
                    }]}
                    value={productName}
                    onChangeText={setProductName}
                    placeholder="Enter product name"
                    placeholderTextColor={isDark ? '#666' : '#999'}
                  />

                  <Text style={[styles.inputLabel, { color: isDark ? '#aaa' : '#666' }]}>
                    Initial Stock Quantity *
                  </Text>
                  <TextInput
                    style={[styles.modalInput, { 
                      backgroundColor: isDark ? '#333' : '#f5f5f5',
                      color: isDark ? '#fff' : '#000'
                    }]}
                    value={quantity}
                    onChangeText={setQuantity}
                    placeholder="Enter quantity"
                    placeholderTextColor={isDark ? '#666' : '#999'}
                    keyboardType="number-pad"
                  />

                  {/* Pricing Section */}
                  <View style={styles.rowInputs}>
                    <View style={styles.halfInput}>
                      <Text style={[styles.inputLabel, { color: isDark ? '#aaa' : '#666' }]}>
                        Buying Price
                      </Text>
                      <TextInput
                        style={[styles.modalInput, { 
                          backgroundColor: isDark ? '#333' : '#f5f5f5',
                          color: isDark ? '#fff' : '#000'
                        }]}
                        value={buyingPrice}
                        onChangeText={setBuyingPrice}
                        placeholder="0.00"
                        placeholderTextColor={isDark ? '#666' : '#999'}
                        keyboardType="decimal-pad"
                      />
                    </View>
                    <View style={styles.halfInput}>
                      <Text style={[styles.inputLabel, { color: isDark ? '#aaa' : '#666' }]}>
                        Selling Price
                      </Text>
                      <TextInput
                        style={[styles.modalInput, { 
                          backgroundColor: isDark ? '#333' : '#f5f5f5',
                          color: isDark ? '#fff' : '#000'
                        }]}
                        value={sellingPrice}
                        onChangeText={setSellingPrice}
                        placeholder="0.00"
                        placeholderTextColor={isDark ? '#666' : '#999'}
                        keyboardType="decimal-pad"
                      />
                    </View>
                  </View>

                  <Text style={[styles.inputLabel, { color: isDark ? '#aaa' : '#666' }]}>
                    Bought From (Supplier)
                  </Text>
                  <TextInput
                    style={[styles.modalInput, { 
                      backgroundColor: isDark ? '#333' : '#f5f5f5',
                      color: isDark ? '#fff' : '#000'
                    }]}
                    value={boughtFrom}
                    onChangeText={setBoughtFrom}
                    placeholder="e.g., ABC Supplier"
                    placeholderTextColor={isDark ? '#666' : '#999'}
                  />

                  <Text style={[styles.inputLabel, { color: isDark ? '#aaa' : '#666' }]}>
                    Sell Location (Store/Warehouse)
                  </Text>
                  <TextInput
                    style={[styles.modalInput, { 
                      backgroundColor: isDark ? '#333' : '#f5f5f5',
                      color: isDark ? '#fff' : '#000'
                    }]}
                    value={sellLocation}
                    onChangeText={setSellLocation}
                    placeholder="e.g., Main Store"
                    placeholderTextColor={isDark ? '#666' : '#999'}
                  />

                  <Text style={[styles.inputLabel, { color: isDark ? '#aaa' : '#666' }]}>
                    Note (Optional)
                  </Text>
                  <TextInput
                    style={[styles.modalInput, styles.noteInput, { 
                      backgroundColor: isDark ? '#333' : '#f5f5f5',
                      color: isDark ? '#fff' : '#000'
                    }]}
                    value={note}
                    onChangeText={setNote}
                    placeholder="Add a note"
                    placeholderTextColor={isDark ? '#666' : '#999'}
                    multiline
                  />
                </View>
              )}

              {/* Error Message */}
              {modalError ? (
                <Text style={styles.errorText}>{modalError}</Text>
              ) : null}

              {/* Action Buttons */}
              {!modalLoading && (
                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={closeModal}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.modalButton, 
                      styles.submitButton,
                      existingProduct && stockAction === 'remove' && { backgroundColor: '#f44336' }
                    ]}
                    onPress={existingProduct ? handleStockAction : handleCreateProduct}
                  >
                    <Text style={styles.submitButtonText}>
                      {existingProduct 
                        ? (stockAction === 'add' ? '+ Add Stock' : '- Remove Stock')
                        : 'Create Product'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 12,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  modeToggle: {
    flexDirection: 'row',
    marginBottom: 12,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#333',
  },
  modeTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  modeTabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  cameraContainer: {
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
    position: 'relative',
  },
  camera: {
    flex: 1,
  },
  scanOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: 250,
    height: 150,
    borderWidth: 2,
    borderColor: '#4CAF50',
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
  scanStatus: {
    marginTop: 16,
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  progressContainer: {
    flexDirection: 'row',
    marginTop: 10,
    gap: 8,
  },
  progressDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  hiddenInput: {
    position: 'absolute',
    left: -9999,
    top: -9999,
    width: 1,
    height: 1,
    opacity: 0,
  },
  keyboardModeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
    borderStyle: 'dashed',
  },
  keyboardModeText: {
    fontSize: 14,
  },
  lastScannedSection: {
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  lastScannedBox: {
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    minHeight: 50,
    justifyContent: 'center',
  },
  lastScannedText: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  clearButton: {
    backgroundColor: '#ff4444',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  clearButtonText: {
    color: '#fff',
  },
  recentSection: {
    flex: 1,
  },
  scanList: {
    flex: 1,
  },
  scanItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 6,
    marginBottom: 4,
  },
  scanItemIndex: {
    fontSize: 12,
    fontWeight: '500',
    marginRight: 8,
    width: 24,
  },
  scanItemText: {
    fontSize: 14,
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  permissionText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  permissionButton: {
    paddingHorizontal: 30,
    paddingVertical: 14,
    borderRadius: 10,
  },
  modeButton: {
    padding: 10,
  },
  modeButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 20,
    color: '#999',
  },
  barcodeDisplay: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  barcodeLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  barcodeValue: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  productInfo: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  productName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  currentStock: {
    fontSize: 16,
    fontWeight: '600',
  },
  productNote: {
    fontSize: 14,
    marginTop: 8,
    fontStyle: 'italic',
  },
  actionToggle: {
    flexDirection: 'row',
    marginBottom: 16,
    borderRadius: 8,
    overflow: 'hidden',
  },
  actionToggleButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  actionToggleButtonActive: {
    // Active state handled by inline styles
  },
  actionToggleText: {
    fontSize: 14,
    fontWeight: '600',
  },
  newProductBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 16,
  },
  newProductBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
  },
  modalInput: {
    padding: 14,
    borderRadius: 8,
    fontSize: 16,
    marginBottom: 16,
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  noteInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  errorText: {
    color: '#f44336',
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#666',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#4CAF50',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
