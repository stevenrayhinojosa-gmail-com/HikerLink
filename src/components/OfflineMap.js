import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Text,
  TouchableOpacity,
  Alert,
} from 'react-native';
import MapView, { PROVIDER_GOOGLE, Marker, UrlTile } from 'react-native-maps';
import Geolocation from 'react-native-geolocation-service';
import mapCacheService from '../services/mapCacheService';
import { requestLocationPermissions } from '../utils/permissions';

// OSM tile server URL
const DEFAULT_TILE_SERVER = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

const OfflineMap = ({ 
  initialRegion = {
    latitude: 37.78825,
    longitude: -122.4324,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  },
  showUserLocation = true,
  onRegionChange,
  onPress,
  style,
  customTileServer,
  children,
}) => {
  const mapRef = useRef(null);
  const [region, setRegion] = useState(initialRegion);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [cacheSize, setCacheSize] = useState(0);

  const tileServer = customTileServer || DEFAULT_TILE_SERVER;

  // Update cache size information
  const updateCacheSize = async () => {
    const size = await mapCacheService.getCacheSize();
    setCacheSize(size.toFixed(2));
  };

  // Get current location
  const getCurrentLocation = async () => {
    try {
      const hasPermission = await requestLocationPermissions();
      
      if (hasPermission) {
        Geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            
            const userLoc = {
              latitude,
              longitude,
            };
            
            setUserLocation(userLoc);
            
            // If no initial region was specified, center on user
            if (!initialRegion || initialRegion.latitude === 37.78825) {
              const newRegion = {
                latitude,
                longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              };
              
              setRegion(newRegion);
              mapRef.current?.animateToRegion(newRegion);
            }
            
            setLoading(false);
          },
          (error) => {
            console.log(error.code, error.message);
            setLoading(false);
            Alert.alert('Error', 'Unable to get current location.');
          },
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
        );
      } else {
        setLoading(false);
        Alert.alert('Permission Denied', 'Location permission is required for this feature.');
      }
    } catch (error) {
      console.error('Error getting location:', error);
      setLoading(false);
    }
  };

  // Pre-cache the current visible region
  const downloadCurrentRegion = async () => {
    if (isDownloading) return;
    
    try {
      setIsDownloading(true);
      setDownloadProgress(0);
      
      // Pre-cache from zoom levels 12 to 16
      const totalTiles = await mapCacheService.preCacheRegion(
        region,
        12, // min zoom
        16, // max zoom
        tileServer
      );
      
      setIsDownloading(false);
      updateCacheSize();
      
      Alert.alert('Download Complete', `Successfully cached ${totalTiles} map tiles for offline use.`);
    } catch (error) {
      console.error('Error pre-caching region:', error);
      setIsDownloading(false);
      Alert.alert('Error', 'Failed to download map tiles.');
    }
  };

  // Clear the map cache
  const clearMapCache = async () => {
    try {
      await mapCacheService.clearCache();
      updateCacheSize();
      Alert.alert('Cache Cleared', 'Map cache has been cleared successfully.');
    } catch (error) {
      console.error('Error clearing cache:', error);
      Alert.alert('Error', 'Failed to clear map cache.');
    }
  };

  // Initialize
  useEffect(() => {
    getCurrentLocation();
    updateCacheSize();
    
    // Start location updates
    const watchId = Geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ latitude, longitude });
      },
      (error) => console.log(error),
      { 
        enableHighAccuracy: true, 
        distanceFilter: 10, // meters
        interval: 5000,
        fastestInterval: 2000
      }
    );
    
    return () => {
      // Clean up by stopping location updates
      Geolocation.clearWatch(watchId);
    };
  }, []);

  // Handle region change
  const handleRegionChange = (newRegion) => {
    setRegion(newRegion);
    if (onRegionChange) {
      onRegionChange(newRegion);
    }
  };

  // Center the map on user's location
  const centerOnUser = () => {
    if (userLocation) {
      const newRegion = {
        ...userLocation,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
      
      mapRef.current?.animateToRegion(newRegion);
    }
  };

  return (
    <View style={[styles.container, style]}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#27ae60" />
          <Text style={styles.loadingText}>Loading Map...</Text>
        </View>
      ) : (
        <>
          <MapView
            ref={mapRef}
            style={styles.map}
            provider={PROVIDER_GOOGLE}
            initialRegion={region}
            onRegionChangeComplete={handleRegionChange}
            onPress={onPress}
            showsUserLocation={showUserLocation}
            showsMyLocationButton={false}
          >
            <UrlTile 
              urlTemplate={tileServer}
              maximumZ={19}
              flipY={false}
              zIndex={-1}
            />
            
            {userLocation && (
              <Marker
                coordinate={userLocation}
                title="You are here"
                description="Your current location"
                pinColor="#27ae60"
              />
            )}
            
            {children}
          </MapView>
          
          <View style={styles.controlsContainer}>
            <TouchableOpacity 
              style={styles.iconButton} 
              onPress={centerOnUser}
            >
              <Text style={styles.iconButtonText}>📍</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.button}
              onPress={downloadCurrentRegion}
              disabled={isDownloading}
            >
              <Text style={styles.buttonText}>
                {isDownloading ? 'Downloading...' : 'Save Offline Map'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.button, styles.clearButton]}
              onPress={clearMapCache}
            >
              <Text style={styles.buttonText}>Clear Cache</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.infoContainer}>
            <Text style={styles.infoText}>
              Map Cache: {cacheSize} MB
            </Text>
            
            {isDownloading && (
              <Text style={styles.infoText}>
                Downloading tiles... {downloadProgress}%
              </Text>
            )}
          </View>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
  },
  loadingText: {
    marginTop: 10,
    color: '#2c3e50',
    fontSize: 16,
  },
  controlsContainer: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  iconButton: {
    backgroundColor: 'white',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  iconButtonText: {
    fontSize: 24,
  },
  button: {
    backgroundColor: '#27ae60',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  clearButton: {
    backgroundColor: '#e74c3c',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  infoContainer: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    padding: 8,
    borderRadius: 8,
  },
  infoText: {
    fontSize: 12,
    color: '#2c3e50',
  },
});

export default OfflineMap;