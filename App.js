import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'react-native';
import AppNavigator from './src/navigation/AppNavigator';
import { requestLocationPermissions, requestBluetoothPermissions } from './src/utils/permissions';

const App = () => {
  React.useEffect(() => {
    // Request necessary permissions when the app starts
    const requestPermissions = async () => {
      await requestLocationPermissions();
      await requestBluetoothPermissions();
    };
    
    requestPermissions();
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" />
      <AppNavigator />
    </SafeAreaProvider>
  );
};

export default App;
