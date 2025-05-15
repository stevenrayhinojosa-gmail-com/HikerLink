import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  SafeAreaView,
  Dimensions,
  Alert,
  Modal,
  Switch,
  ScrollView
} from 'react-native';
import { Marker, Polyline } from 'react-native-maps';
import ConnectionStatus from '../components/ConnectionStatus';
import OfflineMap from '../components/OfflineMap';
import { requestLocationPermissions } from '../utils/permissions';
import locationService from '../services/locationService';
import backgroundLocationService from '../services/backgroundLocationService';
import firebaseService from '../services/firebaseService';

const MapScreen = ({ route }) => {
  const [isTracking, setIsTracking] = useState(false);
  const [trackingMode, setTrackingMode] = useState('standard'); // 'standard', 'power-saving', 'high-accuracy'
  const [userLocation, setUserLocation] = useState(null);
  const [nearbyHikers, setNearbyHikers] = useState([]);
  const [trackHistory, setTrackHistory] = useState([]);
  const [isSettingsVisible, setIsSettingsVisible] = useState(false);
  const [isBackgroundTrackingEnabled, setIsBackgroundTrackingEnabled] = useState(false);
  const [isCloudSyncEnabled, setIsCloudSyncEnabled] = useState(true);
  const [trackStats, setTrackStats] = useState({
    distance: 0,
    duration: 0,
    pointCount: 0,
    startTime: null
  });
  
  const mapRef = useRef(null);
  const locationListenerRef = useRef(null);
  const bgLocationListenerRef = useRef(null);
  
  useEffect(() => {
    // Check if we should start tracking from route params
    if (route?.params?.startTracking) {
      // Slight delay to make sure all services are initialized
      setTimeout(() => {
        // Check if we have mode and background tracking settings
        const mode = route.params.trackingMode || 'standard';
        const useBackgroundTracking = route.params.backgroundTracking || false;
        
        // Update state before starting
        setTrackingMode(mode);
        setIsBackgroundTrackingEnabled(useBackgroundTracking);
        
        // Start tracking with the specified mode
        startTracking(mode);
      }, 1000);
    }
    
    // Request location permissions and get initial location
    const initializeLocation = async () => {
      const hasPermission = await requestLocationPermissions(true); // true for background
      if (hasPermission) {
        try {
          // Initialize background location service
          await backgroundLocationService.initialize();
          
          // Get current location
          let location;
          if (backgroundLocationService.isInitialized) {
            location = await backgroundLocationService.getCurrentLocation(true);
          } else {
            location = await locationService.getCurrentLocation();
          }
          
          if (location) {
            setUserLocation(location);
          }
          
          // Retrieve track history from Firebase if logged in
          if (firebaseService.isSignedIn()) {
            loadTrackHistory();
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
      
      // Remove listeners
      if (locationListenerRef.current) {
        locationListenerRef.current();
        locationListenerRef.current = null;
      }
      
      if (bgLocationListenerRef.current) {
        bgLocationListenerRef.current();
        bgLocationListenerRef.current = null;
      }
    };
  }, [route?.params]);
  
  // Load track history from Firebase
  const loadTrackHistory = async () => {
    try {
      if (!firebaseService.isSignedIn()) return;
      
      // Get the last 24 hours of location history
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      const locationHistory = await firebaseService.getLocationHistory({
        timeFrom: yesterday.toISOString(),
        limit: 1000
      });
      
      if (locationHistory && locationHistory.length > 0) {
        // Convert to the format our map expects
        const formattedHistory = locationHistory.map(loc => ({
          latitude: loc.latitude,
          longitude: loc.longitude,
          timestamp: loc.timestamp
        }));
        
        // Update state
        setTrackHistory(formattedHistory);
        console.log(`Loaded ${formattedHistory.length} track history points from Firebase`);
      }
    } catch (error) {
      console.error('Error loading track history:', error);
    }
  };

  // Toggle location tracking
  const toggleTrackingMode = () => {
    if (isTracking) {
      stopTracking();
    } else {
      setIsSettingsVisible(true);
    }
  };

  // Start tracking user's location
  const startTracking = async (mode = 'standard') => {
    try {
      // Update UI state
      setTrackingMode(mode);
      
      // Initialize stats
      setTrackStats({
        distance: 0,
        duration: 0,
        pointCount: 0,
        startTime: new Date().toISOString()
      });
      
      if (isBackgroundTrackingEnabled) {
        // Start background location tracking
        await backgroundLocationService.initialize({
          trackingMode: mode,
          locationUpdateInterval: mode === 'high-accuracy' ? 10000 : 30000, // 10s or 30s
          minDisplacement: mode === 'high-accuracy' ? 5 : mode === 'power-saving' ? 20 : 10, // 5m, 20m, or 10m
          syncInterval: isCloudSyncEnabled ? 300000 : 3600000 // 5min or 1hr
        });
        
        await backgroundLocationService.startTracking(mode);
        
        // Add a listener for background location updates
        if (bgLocationListenerRef.current) {
          bgLocationListenerRef.current();
        }
        
        bgLocationListenerRef.current = backgroundLocationService.addLocationListener((location) => {
          if (location) {
            // Update current location
            setUserLocation(location);
            
            // Add to track history
            setTrackHistory(prevHistory => {
              // Only add if it's sufficiently different from the last point
              if (prevHistory.length === 0) {
                return [
                  {
                    latitude: location.latitude,
                    longitude: location.longitude,
                    timestamp: location.timestamp || new Date().toISOString()
                  }
                ];
              }
              
              const lastPoint = prevHistory[prevHistory.length - 1];
              const distance = calculateDistance(
                lastPoint.latitude, lastPoint.longitude,
                location.latitude, location.longitude
              );
              
              // If distance is greater than minimum displacement, add the point
              // or if it's been more than 60 seconds since the last point
              const lastTime = new Date(lastPoint.timestamp).getTime();
              const currentTime = new Date(location.timestamp || new Date()).getTime();
              const timeDiff = (currentTime - lastTime) / 1000; // in seconds
              
              if (distance >= (mode === 'high-accuracy' ? 5 : mode === 'power-saving' ? 20 : 10) || 
                  timeDiff >= 60) {
                // Add new point
                const newHistory = [...prevHistory, {
                  latitude: location.latitude,
                  longitude: location.longitude,
                  timestamp: location.timestamp || new Date().toISOString()
                }];
                
                // Also update stats
                updateTrackStats(newHistory);
                
                return newHistory;
              }
              
              return prevHistory;
            });
          }
        });
      } else {
        // Clear previous track history only if not in background mode
        // (in background mode we keep accumulating)
        if (!isTracking) {
          setTrackHistory([]);
        }
        
        // Start foreground location tracking
        await locationService.startTracking(
          mode === 'high-accuracy' ? 3000 : mode === 'power-saving' ? 15000 : 5000
        );
        
        // Subscribe to location updates
        if (locationListenerRef.current) {
          locationListenerRef.current();
        }
        
        locationListenerRef.current = locationService.onLocationUpdate((location) => {
          if (location) {
            setUserLocation(location);
            
            // Add to track history
            setTrackHistory(prevHistory => {
              const newHistory = [...prevHistory, {
                latitude: location.latitude,
                longitude: location.longitude,
                timestamp: new Date().toISOString()
              }];
              
              // Update stats
              updateTrackStats(newHistory);
              
              return newHistory;
            });
            
            // If online and cloud sync enabled, sync locations
            if (isCloudSyncEnabled && firebaseService.isSignedIn() && navigator.onLine) {
              // Batch uploads every 5 points or 60 seconds, whichever comes first
              const lastSyncTime = localStorage.getItem('lastLocationSyncTime');
              const now = Date.now();
              
              if (!lastSyncTime || 
                  (now - parseInt(lastSyncTime, 10)) > 60000 || 
                  trackHistory.length % 5 === 0) {
                
                // Sync to Firebase
                firebaseService.saveUserLocation(location, false)
                  .then(() => {
                    localStorage.setItem('lastLocationSyncTime', now.toString());
                  })
                  .catch(err => console.error('Error syncing location:', err));
              }
            }
          }
        });
      }
      
      setIsTracking(true);
      setIsSettingsVisible(false);
      Alert.alert(
        'Tracking Started', 
        `Your location is now being tracked in ${mode} mode${isBackgroundTrackingEnabled ? ' with background tracking enabled' : ''}.`
      );
    } catch (error) {
      console.error('Error starting tracking:', error);
      Alert.alert('Error', 'Failed to start location tracking: ' + error.message);
    }
  };

  // Stop tracking user's location
  const stopTracking = async () => {
    try {
      // Stop appropriate service
      if (isBackgroundTrackingEnabled) {
        await backgroundLocationService.stopTracking();
        
        if (bgLocationListenerRef.current) {
          bgLocationListenerRef.current();
          bgLocationListenerRef.current = null;
        }
      } else {
        locationService.stopTracking();
        
        if (locationListenerRef.current) {
          locationListenerRef.current();
          locationListenerRef.current = null;
        }
      }
      
      // If cloud sync is enabled and we're online, sync the final track
      if (isCloudSyncEnabled && firebaseService.isSignedIn() && navigator.onLine && trackHistory.length > 0) {
        try {
          // Format track history for Firebase
          const locationsToSync = trackHistory.map(point => ({
            latitude: point.latitude,
            longitude: point.longitude,
            timestamp: point.timestamp,
            uuid: `loc_${new Date(point.timestamp).getTime()}_${Math.floor(Math.random() * 10000)}`
          }));
          
          await firebaseService.saveLocationHistory(locationsToSync);
          console.log(`Synced ${locationsToSync.length} locations to Firebase`);
        } catch (error) {
          console.error('Error syncing track history:', error);
        }
      }
      
      setIsTracking(false);
      Alert.alert('Tracking Stopped', `Recorded ${trackHistory.length} location points over ${formatDuration(trackStats.duration)}.`);
    } catch (error) {
      console.error('Error stopping tracking:', error);
      Alert.alert('Error', 'Failed to stop location tracking: ' + error.message);
    }
  };
  
  // Update track statistics
  const updateTrackStats = (history) => {
    if (!history || history.length < 2) return;
    
    // Calculate total distance
    let totalDistance = 0;
    for (let i = 1; i < history.length; i++) {
      const prevPoint = history[i - 1];
      const currPoint = history[i];
      
      totalDistance += calculateDistance(
        prevPoint.latitude, prevPoint.longitude,
        currPoint.latitude, currPoint.longitude
      );
    }
    
    // Calculate duration
    const startTime = new Date(trackStats.startTime || history[0].timestamp).getTime();
    const endTime = new Date(history[history.length - 1].timestamp).getTime();
    const duration = (endTime - startTime) / 1000; // in seconds
    
    setTrackStats({
      distance: totalDistance,
      duration: duration,
      pointCount: history.length,
      startTime: trackStats.startTime || history[0].timestamp
    });
  };
  
  // Calculate distance between two points in meters
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
    
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  };
  
  // Format duration in HH:MM:SS
  const formatDuration = (seconds) => {
    if (!seconds) return '00:00:00';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    return [hours, minutes, secs]
      .map(v => v.toString().padStart(2, '0'))
      .join(':');
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
          {/* Display track history as polyline */}
          {trackHistory.length > 1 && (
            <Polyline
              coordinates={trackHistory}
              strokeWidth={3}
              strokeColor="#2a7ba9"
            />
          )}
          
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
      
      {/* Track stats display */}
      {isTracking && (
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Distance</Text>
            <Text style={styles.statValue}>{(trackStats.distance / 1000).toFixed(2)} km</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Duration</Text>
            <Text style={styles.statValue}>{formatDuration(trackStats.duration)}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Points</Text>
            <Text style={styles.statValue}>{trackStats.pointCount}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Mode</Text>
            <Text style={styles.statValue}>{trackingMode}</Text>
          </View>
        </View>
      )}
      
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
      
      {/* Tracking Settings Modal */}
      <Modal
        visible={isSettingsVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsSettingsVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Tracking Settings</Text>
            
            <View style={styles.settingsSection}>
              <Text style={styles.sectionTitle}>Tracking Mode</Text>
              <View style={styles.trackingModes}>
                <TouchableOpacity
                  style={[
                    styles.modeButton,
                    trackingMode === 'power-saving' && styles.modeButtonActive
                  ]}
                  onPress={() => setTrackingMode('power-saving')}
                >
                  <Text style={styles.modeButtonText}>Power Saving</Text>
                  <Text style={styles.modeDescription}>Less frequent updates, better battery life</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.modeButton,
                    trackingMode === 'standard' && styles.modeButtonActive
                  ]}
                  onPress={() => setTrackingMode('standard')}
                >
                  <Text style={styles.modeButtonText}>Standard</Text>
                  <Text style={styles.modeDescription}>Balanced accuracy and battery usage</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.modeButton,
                    trackingMode === 'high-accuracy' && styles.modeButtonActive
                  ]}
                  onPress={() => setTrackingMode('high-accuracy')}
                >
                  <Text style={styles.modeButtonText}>High Accuracy</Text>
                  <Text style={styles.modeDescription}>More frequent updates, higher battery usage</Text>
                </TouchableOpacity>
              </View>
            </View>
            
            <View style={styles.settingsSection}>
              <Text style={styles.sectionTitle}>Options</Text>
              
              <View style={styles.settingItem}>
                <Text style={styles.settingLabel}>Background Tracking</Text>
                <Switch
                  value={isBackgroundTrackingEnabled}
                  onValueChange={setIsBackgroundTrackingEnabled}
                  trackColor={{ false: '#767577', true: '#27ae60' }}
                  thumbColor={isBackgroundTrackingEnabled ? '#f5fcff' : '#f4f3f4'}
                />
              </View>
              
              <Text style={styles.settingDescription}>
                Keeps tracking your location even when the app is in the background or closed.
              </Text>
              
              <View style={styles.settingItem}>
                <Text style={styles.settingLabel}>Cloud Sync</Text>
                <Switch
                  value={isCloudSyncEnabled}
                  onValueChange={setIsCloudSyncEnabled}
                  trackColor={{ false: '#767577', true: '#27ae60' }}
                  thumbColor={isCloudSyncEnabled ? '#f5fcff' : '#f4f3f4'}
                  disabled={!firebaseService.isSignedIn()}
                />
              </View>
              
              <Text style={styles.settingDescription}>
                {firebaseService.isSignedIn() 
                  ? 'Sync your location history to the cloud when you have an internet connection.'
                  : 'Sign in to enable cloud sync of your location history.'}
              </Text>
            </View>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => setIsSettingsVisible(false)}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.startButton]}
                onPress={() => startTracking(trackingMode)}
              >
                <Text style={styles.startButtonText}>Start Tracking</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    marginBottom: 10,
  },
  // Track stats display styles
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginHorizontal: 10,
    marginBottom: 10,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    marginBottom: 2,
  },
  statValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginHorizontal: 10,
    marginBottom: 15,
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
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: Dimensions.get('window').height * 0.8,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 15,
    textAlign: 'center',
  },
  settingsSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 10,
  },
  trackingModes: {
    flexDirection: 'column',
  },
  modeButton: {
    padding: 15,
    marginVertical: 5,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  modeButtonActive: {
    backgroundColor: '#e0f2f1',
    borderColor: '#009688',
  },
  modeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 5,
  },
  modeDescription: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 8,
  },
  settingLabel: {
    fontSize: 16,
    color: '#2c3e50',
    flex: 1,
  },
  settingDescription: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 5,
    marginBottom: 15,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
    backgroundColor: '#ecf0f1',
  },
  modalButtonText: {
    fontSize: 16,
    color: '#2c3e50',
    fontWeight: '500',
  },
  startButton: {
    backgroundColor: '#27ae60',
  },
  startButtonText: {
    color: 'white',
    fontWeight: '500',
    fontSize: 16,
  },
});

export default MapScreen;
