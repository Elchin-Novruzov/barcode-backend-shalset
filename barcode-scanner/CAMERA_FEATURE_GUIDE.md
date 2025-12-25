# Camera Feature Control Guide

This guide explains how to enable or disable the camera scanning feature in the barcode scanner mobile app.

## Quick Toggle

The camera feature is controlled by a single constant in the scan screen file.

### File Location
```
barcode-scanner/app/(tabs)/scan.tsx
```

### Toggle Constant
Look for this line near the top of the file (around line 34):

```typescript
const CAMERA_ENABLED = true;  // Set to true to enable, false to disable
```

## How to Enable Camera

Set the constant to `true`:
```typescript
const CAMERA_ENABLED = true;
```

When enabled:
- Users see a **Camera/Keyboard** toggle at the top of the scan screen
- Camera mode allows scanning barcodes using the device camera
- Keyboard mode is still available as an alternative

## How to Disable Camera

Set the constant to `false`:
```typescript
const CAMERA_ENABLED = false;
```

When disabled:
- The Camera/Keyboard toggle is **hidden**
- Only keyboard/scanner wedge mode is available
- The app works with external barcode scanners (USB/Bluetooth)
- No camera permissions are requested

## Why Disable Camera?

You might want to disable the camera feature when:
1. **Using external scanners** - Warehouse environments often use dedicated barcode scanner hardware
2. **Privacy concerns** - Some deployments may not want camera access
3. **Performance** - Older devices may perform better without camera processing
4. **Testing** - Easier to test with keyboard input during development

## Technical Details

### What the flag controls:
1. **Mode toggle visibility** - The Camera/Keyboard tab switcher
2. **Camera permission requests** - Only requested when camera mode is active
3. **CameraView component** - Only rendered when in camera mode and enabled
4. **Default mode** - When disabled, app defaults to keyboard mode only

### Related Components
- `CameraView` from `expo-camera` - The actual camera component
- `useCameraPermissions` hook - Handles permission state
- Barcode scanning settings - Configured to scan multiple barcode types

### Supported Barcode Types (when camera is enabled)
- QR Code
- EAN-13, EAN-8
- UPC-A, UPC-E
- Code 39, Code 93, Code 128
- Codabar, ITF-14
- PDF417, Aztec, DataMatrix

## Example Scenarios

### Scenario 1: Warehouse with handheld scanners
```typescript
const CAMERA_ENABLED = false;  // Use external scanners only
```

### Scenario 2: Retail store with phone cameras
```typescript
const CAMERA_ENABLED = true;   // Enable camera scanning
```

### Scenario 3: Development/Testing
```typescript
const CAMERA_ENABLED = false;  // Faster testing with keyboard input
```

## After Making Changes

After changing the `CAMERA_ENABLED` value:
1. Save the file
2. The app will hot-reload automatically (if running with Expo)
3. Or restart the app to see changes

No rebuild or redeployment is needed for development. For production builds, you'll need to rebuild the app.

---

**Last Updated:** December 2024
**File:** `barcode-scanner/app/(tabs)/scan.tsx`
**Line:** ~34 (look for `CAMERA_ENABLED`)
