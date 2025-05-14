import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  SafeAreaView,
  Dimensions,
  ActivityIndicator 
} from 'react-native';
import ConnectionStatus from '../components/ConnectionStatus';
import { requestLocationPermissions } from '../utils/permissions';

const MapScreen = () => {
  const [loading, setLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [location, setLocation] = useState(null);
  const [nearbyHikers, setNearbyHikers] = useState([]);

  useEffect(() => {
    // Simulate loading the map
    const timer = setTimeout(() => {
      setLoading(false);
      setMapReady(true);
      // Simulated current location data
      setLocation({
        latitude: 37.7749,
        longitude: -122.4194,
      });
    }, 1500);

    // Check for location permissions
    const checkPermissions = async () => {
      await requestLocationPermissions();
    };
    
    checkPermissions();
    
    return () => clearTimeout(timer);
  }, []);

  const toggleTrackingMode = () => {
    // This will be implemented with actual GPS tracking in the future
    console.log('Tracking mode toggled');
  };

  const findNearbyHikers = () => {
    // This will be implemented with actual Bluetooth/Bridgefy functionality in the future
    console.log('Finding nearby hikers...');
    // Simulate finding hikers
    setNearbyHikers([
      { id: '1', name: 'Alex', distance: '0.5 miles' },
      { id: '2', name: 'Jamie', distance: '1.2 miles' },
    ]);
  };

  const shareLocation = () => {
    // This will be implemented with actual Bluetooth/Bridgefy functionality in the future
    console.log('Location shared with nearby hikers');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ConnectionStatus />
      
      <View style={styles.mapContainer}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#27ae60" />
            <Text style={styles.loadingText}>Loading Map...</Text>
          </View>
        ) : (
          <View style={styles.mapPlaceholder}>
            <Text style={styles.mapPlaceholderText}>
              Map Content Will Appear Here
            </Text>
            {location && (
              <Text style={styles.locationText}>
                Location: {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
              </Text>
            )}
          </View>
        )}
      </View>
      
      <View style={styles.controlsContainer}>
        <TouchableOpacity 
          style={styles.controlButton}
          onPress={toggleTrackingMode}
        >
          <Text style={styles.controlButtonText}>Toggle Tracking</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.controlButton}
          onPress={findNearbyHikers}
        >
          <Text style={styles.controlButtonText}>Find Nearby Hikers</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.controlButton}
          onPress={shareLocation}
        >
          <Text style={styles.controlButtonText}>Share My Location</Text>
        </TouchableOpacity>
      </View>
      
      {nearbyHikers.length > 0 && (
        <View style={styles.hikersContainer}>
          <Text style={styles.hikersTitle}>Nearby Hikers:</Text>
          {nearbyHikers.map((hiker) => (
            <View key={hiker.id} style={styles.hikerItem}>
              <Text style={styles.hikerName}>{hiker.name}</Text>
              <Text style={styles.hikerDistance}>{hiker.distance}</Text>
            </View>
          ))}
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  mapContainer: {
    height: Dimensions.get('window').height * 0.5,
    backgroundColor: '#f0f0f0',
    marginBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#2c3e50',
    fontSize: 16,
  },
  mapPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e0e0e0',
  },
  mapPlaceholderText: {
    color: '#2c3e50',
    fontSize: 16,
    fontWeight: '500',
  },
  locationText: {
    marginTop: 15,
    color: '#27ae60',
    fontSize: 14,
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginHorizontal: 10,
    marginBottom: 20,
  },
  controlButton: {
    backgroundColor: '#27ae60',
    padding: 12,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  controlButtonText: {
    color: 'white',
    fontWeight: '500',
    fontSize: 14,
  },
  hikersContainer: {
    padding: 15,
    backgroundColor: '#ecf0f1',
    borderRadius: 10,
    marginHorizontal: 15,
    marginBottom: 15,
  },
  hikersTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 10,
  },
  hikerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  hikerName: {
    fontSize: 16,
    color: '#2c3e50',
  },
  hikerDistance: {
    fontSize: 16,
    color: '#7f8c8d',
  },
});

export default MapScreen;
