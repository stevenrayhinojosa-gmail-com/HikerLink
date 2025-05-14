import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Text,
  TouchableOpacity,
  Alert,
} from 'react-native';

// Web version of the map component
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
  const [loading, setLoading] = useState(false);
  const [userLocation, setUserLocation] = useState({
    latitude: initialRegion.latitude,
    longitude: initialRegion.longitude
  });

  // Fetch the user's location if available through the web browser
  useEffect(() => {
    if (navigator.geolocation && showUserLocation) {
      setLoading(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
          setLoading(false);
        },
        (error) => {
          console.error('Error getting location:', error);
          setLoading(false);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
      );
    }
  }, [showUserLocation]);

  // This is a simple web mock of the map with user location
  return (
    <View style={[styles.container, style]}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#27ae60" />
          <Text style={styles.loadingText}>Loading Map...</Text>
        </View>
      ) : (
        <View style={styles.mapContainer}>
          {/* Simulated map UI for web version */}
          <View style={styles.webMapPlaceholder}>
            <Text style={styles.mapTitle}>Map View (Web Simulation)</Text>
            
            {/* Display the location */}
            <View style={styles.locationInfo}>
              <Text style={styles.locationText}>
                Current Location: {userLocation.latitude.toFixed(4)}, {userLocation.longitude.toFixed(4)}
              </Text>
            </View>
            
            {/* Map controls */}
            <View style={styles.controlsContainer}>
              <TouchableOpacity 
                style={styles.iconButton} 
                onPress={() => Alert.alert('Center', 'Map centered on user location')}
              >
                <Text style={styles.iconButtonText}>📍 Center</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.button}
                onPress={() => Alert.alert('Download', 'Map tiles downloaded for offline use')}
              >
                <Text style={styles.buttonText}>Save Offline Map</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.button, styles.clearButton]}
                onPress={() => Alert.alert('Clear', 'Map cache cleared')}
              >
                <Text style={styles.buttonText}>Clear Cache</Text>
              </TouchableOpacity>
            </View>
            
            {/* Other children elements like markers */}
            <View style={styles.markersSimulation}>
              <Text style={styles.markerTitle}>Markers:</Text>
              <View style={styles.marker}>
                <Text style={styles.markerText}>You (📍)</Text>
              </View>
              {React.Children.map(children, (child, index) => {
                // Extract marker props and render a simplified version
                if (child && child.props && child.props.title) {
                  return (
                    <View key={index} style={styles.marker}>
                      <Text style={styles.markerText}>
                        {child.props.title} (📌) {child.props.description ? `- ${child.props.description}` : ''}
                      </Text>
                    </View>
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
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f0f0',
  },
  mapContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  webMapPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#e5e5e5',
    padding: 20,
    borderRadius: 10,
  },
  mapTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  locationInfo: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    padding: 10,
    borderRadius: 5,
    marginBottom: 20,
  },
  locationText: {
    fontSize: 16,
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
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
  },
  iconButton: {
    backgroundColor: 'white',
    padding: 10,
    borderRadius: 8,
    marginRight: 10,
    marginBottom: 10,
  },
  iconButtonText: {
    fontSize: 16,
  },
  button: {
    backgroundColor: '#27ae60',
    paddingVertical: 10, 
    paddingHorizontal: 15,
    borderRadius: 8,
    marginRight: 10,
    marginBottom: 10,
  },
  clearButton: {
    backgroundColor: '#e74c3c',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  markersSimulation: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 15,
  },
  markerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  marker: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  markerText: {
    fontSize: 16,
    color: '#333',
  }
});

export default OfflineMap;