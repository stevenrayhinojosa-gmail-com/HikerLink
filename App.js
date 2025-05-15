import React, { useState, useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar, View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AppNavigator from './src/navigation/AppNavigator';
import { requestLocationPermissions, requestBluetoothPermissions } from './src/utils/permissions';
import firebaseConfig from './src/config/firebase';
import firebaseService from './src/services/firebaseService';
import messagingService from './src/services/messagingService';
import databaseService from './src/services/databaseService';
import sosService from './src/services/sosService';

// Import mock SQLite for web platform
import './src/mocks/web-mocks';

const App = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Initialize Firebase, database, and request permissions
    const initializeApp = async () => {
      try {
        setIsLoading(true);
        
        // Request necessary permissions
        await requestLocationPermissions();
        await requestBluetoothPermissions();
        
        // Initialize SQLite database
        await databaseService.init();
        
        // Initialize Firebase if config exists
        if (firebaseConfig.apiKey && firebaseConfig.projectId) {
          await firebaseService.initialize(firebaseConfig);
          
          // Initialize messaging service with Firebase config and default username
          await messagingService.initialize(firebaseConfig, 'Anonymous Hiker');
          
          console.log('Firebase and messaging services initialized');
        } else {
          console.log('Firebase config not provided, running in offline-only mode');
          
          // Initialize messaging service without Firebase config
          await messagingService.initialize(null, 'Anonymous Hiker');
        }
        
        // Initialize SOS service
        sosService.initialize(
          "I need help! This is an emergency SOS signal triggered by shake/long press.",
          () => {
            console.log("SOS callback triggered");
            // Navigate directly to Messaging screen when SOS is triggered
            // We'll rely on the SOS service to handle the actual SOS message sending
          }
        );
        console.log('SOS service initialized');
        
      } catch (err) {
        console.error('Error initializing app:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    
    initializeApp();
    
    // Cleanup on component unmount
    return () => {
      // Close the database connection
      databaseService.close().catch(console.error);
      
      // Clean up Firebase listeners
      firebaseService.cleanup();
      
      // Clean up SOS service
      sosService.cleanup();
    };
  }, []);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2a7ba9" />
        <Text style={styles.loadingText}>Loading HikerLink...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Error Initializing App</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        <Text style={styles.errorHelp}>Please restart the app and check your network connection.</Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" />
      <AppNavigator />
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#2a7ba9',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    padding: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#e74c3c',
    marginBottom: 10,
  },
  errorMessage: {
    fontSize: 16,
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  errorHelp: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});

export default App;
