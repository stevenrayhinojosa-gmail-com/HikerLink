import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  SafeAreaView,
  Dimensions,
  Alert 
} from 'react-native';
import { Marker } from 'react-native-maps';
import ConnectionStatus from '../components/ConnectionStatus';
import OfflineMap from '../components/OfflineMap';
import Geolocation from 'react-native-geolocation-service';
import { requestLocationPermissions } from '../utils/permissions';
import locationService from '../services/locationService';

const MapScreen = () => {
  const [isTracking, setIsTracking] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [nearbyHikers, setNearbyHikers] = useState([]);
  const [trackHistory, setTrackHistory] = useState([]);
  const mapRef = useRef(null);
  
  useEffect(() => {
    // Request location permissions and get initial location
    const initializeLocation = async () => {
      const hasPermission = await requestLocationPermissions();
      if (hasPermission) {
        try {
          const location = await locationService.getCurrentLocation();
          if (location) {
            setUserLocation(location);
          }
        } catch (error) {
          console.error('Error getting initial location:', error);
        }
      }
    };
    
    initializeLocation();
    
    // Cleanup
    return () => {
      if (isTracking) {
        stopTracking();
      }
    };
  }, []);

  // Toggle location tracking
  const toggleTrackingMode = () => {
    if (isTracking) {
      stopTracking();
    } else {
      startTracking();
    }
  };

  // Start tracking user's location
  const startTracking = async () => {
    try {
      // Clear previous track history
      setTrackHistory([]);
      
      // Start location tracking
      await locationService.startTracking(5000); // Update every 5 seconds
      
      // Subscribe to location updates
      locationService.onLocationUpdate((location) => {
        setUserLocation(location);
        
        // Add to track history
        setTrackHistory(prevHistory => [
          ...prevHistory,
          {
            latitude: location.latitude,
            longitude: location.longitude,
            timestamp: new Date().toISOString()
          }
        ]);
      });
      
      setIsTracking(true);
      Alert.alert('Tracking Started', 'Your location is now being tracked.');
    } catch (error) {
      console.error('Error starting tracking:', error);
      Alert.alert('Error', 'Failed to start location tracking.');
    }
  };

  // Stop tracking user's location
  const stopTracking = () => {
    try {
      locationService.stopTracking();
      setIsTracking(false);
      Alert.alert('Tracking Stopped', `Recorded ${trackHistory.length} location points.`);
    } catch (error) {
      console.error('Error stopping tracking:', error);
    }
  };

  // Find nearby hikers using Bluetooth
  const findNearbyHikers = () => {
    // This will be implemented with actual Bluetooth/Bridgefy functionality in the future
    console.log('Finding nearby hikers...');
    
    // Simulate finding hikers
    const mockHikers = [
      { 
        id: '1', 
        name: 'Alex', 
        distance: '0.5 miles',
        location: {
          latitude: userLocation ? userLocation.latitude + 0.002 : 37.7751,
          longitude: userLocation ? userLocation.longitude + 0.001 : -122.4184,
        }
      },
      { 
        id: '2', 
        name: 'Jamie', 
        distance: '1.2 miles',
        location: {
          latitude: userLocation ? userLocation.latitude - 0.003 : 37.7719,
          longitude: userLocation ? userLocation.longitude - 0.002 : -122.4214,
        }
      },
    ];
    
    setNearbyHikers(mockHikers);
  };

  // Share user's location with nearby hikers
  const shareLocation = () => {
    // This will be implemented with actual Bluetooth/Bridgefy functionality
    if (!userLocation) {
      Alert.alert('Error', 'Cannot share location: your current location is unknown.');
      return;
    }
    
    Alert.alert(
      'Share Location',
      'This will broadcast your current location to nearby hikers. Continue?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Share',
          onPress: () => {
            console.log('Location shared with nearby hikers:', userLocation);
            Alert.alert('Success', 'Your location has been shared with nearby hikers.');
          }
        }
      ]
    );
  };

  // Handle map region change
  const handleRegionChange = (region) => {
    console.log('Map region changed:', region);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ConnectionStatus />
      
      <View style={styles.mapContainer}>
        <OfflineMap
          showUserLocation={true}
          onRegionChange={handleRegionChange}
          ref={mapRef}
        >
          {/* Display nearby hikers as markers */}
          {nearbyHikers.map(hiker => (
            hiker.location && (
              <Marker
                key={hiker.id}
                coordinate={hiker.location}
                title={hiker.name}
                description={`${hiker.distance} away`}
                pinColor="#3498db"
              />
            )
          ))}
        </OfflineMap>
      </View>
      
      <View style={styles.controlsContainer}>
        <TouchableOpacity 
          style={[
            styles.controlButton,
            isTracking ? styles.activeButton : null
          ]}
          onPress={toggleTrackingMode}
        >
          <Text style={styles.controlButtonText}>
            {isTracking ? 'Stop Tracking' : 'Start Tracking'}
          </Text>
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
            <TouchableOpacity 
              key={hiker.id} 
              style={styles.hikerItem}
              onPress={() => {
                if (hiker.location && mapRef.current) {
                  mapRef.current.animateToRegion({
                    latitude: hiker.location.latitude,
                    longitude: hiker.location.longitude,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                  });
                }
              }}
            >
              <Text style={styles.hikerName}>{hiker.name}</Text>
              <Text style={styles.hikerDistance}>{hiker.distance}</Text>
            </TouchableOpacity>
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
  activeButton: {
    backgroundColor: '#e74c3c',
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
