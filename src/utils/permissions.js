import { Platform, Alert, Linking } from 'react-native';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';

// Request location permissions based on platform
export const requestLocationPermissions = async () => {
  try {
    let locationPermission;
    
    if (Platform.OS === 'ios') {
      locationPermission = PERMISSIONS.IOS.LOCATION_WHEN_IN_USE;
    } else {
      locationPermission = PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION;
    }
    
    const result = await check(locationPermission);
    
    if (result === RESULTS.DENIED) {
      const requestResult = await request(locationPermission);
      if (requestResult !== RESULTS.GRANTED) {
        showPermissionAlert('location');
      }
      return requestResult === RESULTS.GRANTED;
    } else if (result === RESULTS.BLOCKED || result === RESULTS.UNAVAILABLE) {
      showPermissionAlert('location');
      return false;
    }
    
    return result === RESULTS.GRANTED;
  } catch (error) {
    console.error('Error checking location permissions:', error);
    return false;
  }
};

// Request Bluetooth permissions based on platform
export const requestBluetoothPermissions = async () => {
  try {
    let bluetoothPermission;
    
    if (Platform.OS === 'ios') {
      // iOS 13+ uses Bluetooth permission
      bluetoothPermission = PERMISSIONS.IOS.BLUETOOTH_PERIPHERAL;
    } else {
      // For Android, we need different permissions based on Android version
      // For Android 12+ (API 31+), use BLUETOOTH_SCAN and BLUETOOTH_CONNECT
      // For older versions, use BLUETOOTH and BLUETOOTH_ADMIN
      if (Platform.Version >= 31) { // Android 12+
        bluetoothPermission = PERMISSIONS.ANDROID.BLUETOOTH_SCAN;
      } else {
        bluetoothPermission = PERMISSIONS.ANDROID.BLUETOOTH;
      }
    }
    
    const result = await check(bluetoothPermission);
    
    if (result === RESULTS.DENIED) {
      const requestResult = await request(bluetoothPermission);
      
      // On Android 12+, also request BLUETOOTH_CONNECT if needed
      if (Platform.OS === 'android' && Platform.Version >= 31 && requestResult === RESULTS.GRANTED) {
        const connectResult = await request(PERMISSIONS.ANDROID.BLUETOOTH_CONNECT);
        if (connectResult !== RESULTS.GRANTED) {
          showPermissionAlert('bluetooth');
        }
        return connectResult === RESULTS.GRANTED;
      }
      
      if (requestResult !== RESULTS.GRANTED) {
        showPermissionAlert('bluetooth');
      }
      
      return requestResult === RESULTS.GRANTED;
    } else if (result === RESULTS.BLOCKED || result === RESULTS.UNAVAILABLE) {
      showPermissionAlert('bluetooth');
      return false;
    }
    
    return result === RESULTS.GRANTED;
  } catch (error) {
    console.error('Error checking Bluetooth permissions:', error);
    return false;
  }
};

// Show alert when permissions are denied and guide user to settings
const showPermissionAlert = (permissionType) => {
  Alert.alert(
    `${permissionType.charAt(0).toUpperCase() + permissionType.slice(1)} Permission Required`,
    `HikerLink needs ${permissionType} permission to function properly. Please enable it in your device settings.`,
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Settings', onPress: openSettings }
    ]
  );
};

// Open device settings
const openSettings = () => {
  Linking.openSettings();
};
