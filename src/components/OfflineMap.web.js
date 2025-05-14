import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Text,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';

// Basic SVG map background to simulate map tiles
const MapBackground = () => (
  <svg width="100%" height="100%" viewBox="0 0 500 500" style={{position: 'absolute', top: 0, left: 0, zIndex: 0}}>
    <rect width="100%" height="100%" fill="#e0f7fa" />
    <path d="M0,100 L500,100" stroke="#a5d6a7" strokeWidth="2" />
    <path d="M0,200 L500,200" stroke="#a5d6a7" strokeWidth="2" />
    <path d="M0,300 L500,300" stroke="#a5d6a7" strokeWidth="2" />
    <path d="M0,400 L500,400" stroke="#a5d6a7" strokeWidth="2" />
    <path d="M100,0 L100,500" stroke="#a5d6a7" strokeWidth="2" />
    <path d="M200,0 L200,500" stroke="#a5d6a7" strokeWidth="2" />
    <path d="M300,0 L300,500" stroke="#a5d6a7" strokeWidth="2" />
    <path d="M400,0 L400,500" stroke="#a5d6a7" strokeWidth="2" />
    
    {/* Add some terrain features */}
    <circle cx="150" cy="150" r="50" fill="#c8e6c9" />
    <circle cx="350" cy="350" r="70" fill="#c8e6c9" />
    <path d="M100,400 Q250,200 400,400" stroke="#81c784" strokeWidth="3" fill="none" />
    <path d="M0,250 Q100,200 200,250 T400,250" stroke="#4db6ac" strokeWidth="2" fill="none" />
  </svg>
);

// Web version of the map component
const OfflineMap = forwardRef(({ 
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
}, ref) => {
  const [loading, setLoading] = useState(false);
  const [userLocation, setUserLocation] = useState({
    latitude: initialRegion.latitude,
    longitude: initialRegion.longitude
  });
  const [region, setRegion] = useState(initialRegion);
  const [cacheSize, setCacheSize] = useState("2.45");
  const [isTracking, setIsTracking] = useState(false);
  const [trackHistory, setTrackHistory] = useState([]);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  
  // Expose methods to parent components through ref
  useImperativeHandle(ref, () => ({
    animateToRegion: (newRegion) => {
      setRegion(newRegion);
      if (onRegionChange) {
        onRegionChange(newRegion);
      }
      Alert.alert('Map Navigation', `Map moved to: ${newRegion.latitude.toFixed(4)}, ${newRegion.longitude.toFixed(4)}`);
    }
  }));

  // Simulate location updates for demo
  useEffect(() => {
    if (isTracking) {
      const interval = setInterval(() => {
        // Simulate small movements
        const newLocation = {
          latitude: userLocation.latitude + (Math.random() * 0.002 - 0.001),
          longitude: userLocation.longitude + (Math.random() * 0.002 - 0.001)
        };
        
        setUserLocation(newLocation);
        setTrackHistory(prev => [...prev, newLocation]);
      }, 3000);
      
      return () => clearInterval(interval);
    }
  }, [isTracking, userLocation]);

  // Fetch the user's location if available through the web browser
  useEffect(() => {
    if (navigator.geolocation && showUserLocation) {
      setLoading(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          };
          setUserLocation(newLocation);
          setLoading(false);
          
          // Update region to center on user
          const newRegion = {
            ...newLocation,
            latitudeDelta: 0.0922,
            longitudeDelta: 0.0421,
          };
          setRegion(newRegion);
        },
        (error) => {
          console.error('Error getting location:', error);
          setLoading(false);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
      );
    }
  }, [showUserLocation]);

  // Start tracking location
  const startTracking = () => {
    setIsTracking(true);
    setTrackHistory([userLocation]);
    Alert.alert('Tracking Started', 'Your location is now being tracked.');
  };

  // Stop tracking location
  const stopTracking = () => {
    setIsTracking(false);
    Alert.alert('Tracking Stopped', `Recorded ${trackHistory.length} location points.`);
  };

  // Handle download button
  const handleDownload = () => {
    if (isDownloading) return;
    
    setIsDownloading(true);
    setDownloadProgress(0);
    
    // Simulate download progress
    const interval = setInterval(() => {
      setDownloadProgress(prev => {
        const newProgress = prev + Math.random() * 10;
        if (newProgress >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setIsDownloading(false);
            setCacheSize((parseFloat(cacheSize) + 1.2).toFixed(2));
            Alert.alert('Download Complete', 'Map tiles have been cached for offline use.');
          }, 500);
          return 100;
        }
        return newProgress;
      });
    }, 300);
  };

  // Clear map cache
  const clearMapCache = () => {
    setCacheSize("0.00");
    Alert.alert('Cache Cleared', 'Map cache has been cleared successfully.');
  };

  // Render markers as dots on the simulated map
  const renderMarkerDots = () => {
    return React.Children.map(children, (child, index) => {
      if (child && child.props && child.props.coordinate) {
        // Calculate relative position in the container based on coordinates
        // This is just a simplified simulation
        const left = ((child.props.coordinate.longitude - (region.longitude - region.longitudeDelta/2)) 
                      / region.longitudeDelta) * 100;
        const top = (1 - (child.props.coordinate.latitude - (region.latitude - region.latitudeDelta/2)) 
                     / region.latitudeDelta) * 100;
        
        return (
          <View 
            key={index}
            style={[
              styles.markerDot, 
              { 
                left: `${Math.min(Math.max(left, 0), 100)}%`, 
                top: `${Math.min(Math.max(top, 0), 100)}%`,
                backgroundColor: child.props.pinColor || '#3498db'
              }
            ]}
          >
            <Text style={styles.markerDotText}>📌</Text>
          </View>
        );
      }
      return null;
    });
  };

  // Render user location marker
  const renderUserMarker = () => {
    if (!userLocation) return null;
    
    // Calculate relative position
    const left = ((userLocation.longitude - (region.longitude - region.longitudeDelta/2)) 
                 / region.longitudeDelta) * 100;
    const top = (1 - (userLocation.latitude - (region.latitude - region.latitudeDelta/2)) 
                / region.latitudeDelta) * 100;
    
    return (
      <View
        style={[
          styles.userMarkerDot,
          {
            left: `${Math.min(Math.max(left, 0), 100)}%`,
            top: `${Math.min(Math.max(top, 0), 100)}%`,
          }
        ]}
      >
        <Text style={styles.markerDotText}>📍</Text>
      </View>
    );
  };

  // This is a more advanced web mock of the map with user location
  return (
    <View style={[styles.container, style]}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#27ae60" />
          <Text style={styles.loadingText}>Loading Map...</Text>
        </View>
      ) : (
        <View style={styles.mapContainer}>
          {/* Map simulation */}
          <View style={styles.webMapPlaceholder}>
            <MapBackground />
            
            {/* Place map markers */}
            {renderUserMarker()}
            {renderMarkerDots()}
            
            {/* Track history line */}
            {trackHistory.length > 1 && (
              <View style={styles.trackLine}>
                {trackHistory.map((point, index) => {
                  if (index === 0) return null;
                  
                  const prevPoint = trackHistory[index - 1];
                  
                  // Calculate relative positions
                  const x1 = ((prevPoint.longitude - (region.longitude - region.longitudeDelta/2)) 
                            / region.longitudeDelta) * 100;
                  const y1 = (1 - (prevPoint.latitude - (region.latitude - region.latitudeDelta/2)) 
                            / region.latitudeDelta) * 100;
                  const x2 = ((point.longitude - (region.longitude - region.longitudeDelta/2)) 
                            / region.longitudeDelta) * 100;
                  const y2 = (1 - (point.latitude - (region.latitude - region.latitudeDelta/2)) 
                            / region.latitudeDelta) * 100;
                  
                  // Draw line segments connecting track points
                  return (
                    <View 
                      key={index}
                      style={[
                        styles.trackSegment,
                        {
                          left: `${Math.min(Math.max(x1, 0), 100)}%`,
                          top: `${Math.min(Math.max(y1, 0), 100)}%`,
                          width: Math.abs(x2 - x1) + '%',
                          height: Math.abs(y2 - y1) + '%',
                          transform: [
                            { translateX: x2 < x1 ? '-100%' : '0%' },
                            { translateY: y2 < y1 ? '-100%' : '0%' }
                          ]
                        }
                      ]}
                    />
                  );
                })}
              </View>
            )}
            
            {/* Map information overlay */}
            <View style={styles.mapOverlay}>
              <Text style={styles.mapTitle}>HikerLink Map (Web Demo)</Text>
              
              {/* Display the location */}
              <View style={styles.locationInfo}>
                <Text style={styles.locationText}>
                  Current Location: {userLocation.latitude.toFixed(4)}, {userLocation.longitude.toFixed(4)}
                </Text>
              </View>
            </View>
            
            {/* Map controls */}
            <View style={styles.controlsContainer}>
              <TouchableOpacity 
                style={styles.iconButton} 
                onPress={() => {
                  const newRegion = {
                    ...userLocation,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                  };
                  setRegion(newRegion);
                  if (onRegionChange) {
                    onRegionChange(newRegion);
                  }
                }}
              >
                <Text style={styles.iconButtonText}>📍</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.iconButton, isTracking ? styles.activeButton : null]} 
                onPress={() => isTracking ? stopTracking() : startTracking()}
              >
                <Text style={styles.iconButtonText}>{isTracking ? '⏹️' : '▶️'}</Text>
              </TouchableOpacity>
            </View>
            
            {/* Download controls */}
            <View style={styles.downloadContainer}>
              <TouchableOpacity 
                style={styles.button}
                onPress={handleDownload}
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
            
            {/* Info panel */}
            <View style={styles.infoContainer}>
              <Text style={styles.infoText}>
                Map Cache: {cacheSize} MB
              </Text>
              
              {isDownloading && (
                <View style={styles.progressContainer}>
                  <View style={[styles.progressBar, {width: `${downloadProgress}%`}]} />
                  <Text style={styles.progressText}>{Math.round(downloadProgress)}%</Text>
                </View>
              )}
            </View>
            
            {/* Markers list */}
            <View style={styles.markersPanel}>
              <Text style={styles.markerTitle}>Nearby Points:</Text>
              <View style={styles.marker}>
                <Text style={styles.markerText}>📍 You</Text>
              </View>
              {React.Children.map(children, (child, index) => {
                // Extract marker props and render a simplified version
                if (child && child.props && child.props.title) {
                  return (
                    <TouchableOpacity 
                      key={index} 
                      style={styles.marker}
                      onPress={() => {
                        if (child.props.coordinate) {
                          const newRegion = {
                            latitude: child.props.coordinate.latitude,
                            longitude: child.props.coordinate.longitude,
                            latitudeDelta: 0.01,
                            longitudeDelta: 0.01,
                          };
                          setRegion(newRegion);
                          if (onRegionChange) {
                            onRegionChange(newRegion);
                          }
                        }
                      }}
                    >
                      <Text style={styles.markerText}>
                        📌 {child.props.title} {child.props.description ? `- ${child.props.description}` : ''}
                      </Text>
                    </TouchableOpacity>
                  );
                }
                return null;
              })}
            </View>
          </View>
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f0f0',
  },
  mapContainer: {
    flex: 1,
  },
  webMapPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#b2dfdb',
    borderRadius: 10,
    position: 'relative',
    overflow: 'hidden',
  },
  mapOverlay: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    zIndex: 10,
  },
  mapTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    padding: 5,
    borderRadius: 5,
  },
  locationInfo: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    padding: 5,
    borderRadius: 5,
  },
  locationText: {
    fontSize: 14,
    color: '#333',
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
  controlsContainer: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 10,
  },
  downloadContainer: {
    position: 'absolute',
    top: 80,
    right: 10,
    zIndex: 10,
  },
  iconButton: {
    backgroundColor: 'white',
    width: 40,
    height: 40,
    borderRadius: 20,
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
    fontSize: 20,
  },
  activeButton: {
    backgroundColor: '#e74c3c',
  },
  button: {
    backgroundColor: '#27ae60',
    paddingVertical: 8, 
    paddingHorizontal: 12,
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
    bottom: 10,
    left: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    padding: 8,
    borderRadius: 8,
    zIndex: 10,
    maxWidth: '50%',
  },
  infoText: {
    fontSize: 12,
    color: '#2c3e50',
  },
  progressContainer: {
    height: 10,
    backgroundColor: '#ecf0f1',
    borderRadius: 5,
    marginTop: 5,
    position: 'relative',
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#27ae60',
  },
  progressText: {
    position: 'absolute',
    top: -2,
    right: 0,
    fontSize: 10,
  },
  markersPanel: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    padding: 8,
    borderRadius: 8,
    maxWidth: '40%',
    maxHeight: '30%',
    zIndex: 10,
    overflow: 'auto',
  },
  markerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333',
  },
  marker: {
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  markerText: {
    fontSize: 14,
    color: '#333',
  },
  markerDot: {
    position: 'absolute',
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
    transform: [{ translateX: -16 }, { translateY: -32 }],
  },
  userMarkerDot: {
    position: 'absolute',
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 6,
    transform: [{ translateX: -16 }, { translateY: -32 }],
  },
  markerDotText: {
    fontSize: 24,
  },
  trackLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    zIndex: 4,
  },
  trackSegment: {
    position: 'absolute',
    backgroundColor: 'rgba(231, 76, 60, 0.7)',
    height: 3,
    zIndex: 4,
  }
});

export default OfflineMap;