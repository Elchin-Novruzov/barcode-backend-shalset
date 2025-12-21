import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Platform,
} from 'react-native';
// Camera import
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Audio } from 'expo-av';
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
const CAMERA_ENABLED = false;

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
  
  // Audio ref for scan sound
  const soundRef = useRef<Audio.Sound | null>(null);
  
  // Load sound on mount
  useEffect(() => {
    const loadSound = async () => {
      try {
        const { sound } = await Audio.Sound.createAsync(
          require('@/assets/audio/pekaka-ses.mp3')
        );
        soundRef.current = sound;
      } catch (error) {
        console.error('Error loading sound:', error);
      }
    };
    loadSound();
    
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);
  
  // Play scan sound
  const playScanSound = async () => {
    try {
      if (soundRef.current) {
        await soundRef.current.replayAsync();
      }
    } catch (error) {
      console.error('Error playing sound:', error);
    }
  };
  
  // Camera permission hook
  const [permission, requestPermission] = useCameraPermissions();
  const [scanMode, setScanMode] = useState<ScanMode>('keyboard');
  const [buffer, setBuffer] = useState('');
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [recentScans, setRecentScans] = useState<string[]>([]);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [scanReady, setScanReady] = useState(false); // Controls scan delay
  const [validationProgress, setValidationProgress] = useState(0); // Show validation progress

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
      // Don't block the UI - scan is still recorded locally
    }
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

    // Vibrate and play sound
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    playScanSound();

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
});
