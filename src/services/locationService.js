import { Platform } from 'react-native';
import { requestLocationPermissions } from '../utils/permissions';

class LocationService {
  constructor() {
    this.watchId = null;
    this.currentLocation = null;
    this.locationUpdateCallbacks = [];
    this.isTracking = false;
  }

  // Initialize the location service
  async initialize() {
    const hasPermission = await requestLocationPermissions();
    if (!hasPermission) {
      console.log('Location permission not granted');
      return false;
    }
    return true;
  }

  // Start tracking user location
  async startTracking(updateInterval = 10000) {
    if (this.isTracking) return;

    const initialized = await this.initialize();
    if (!initialized) return;

    this.isTracking = true;

    try {
      // Using navigator.geolocation which is available in React Native
      this.watchId = navigator.geolocation.watchPosition(
        (position) => {
          this.currentLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            altitude: position.coords.altitude,
            accuracy: position.coords.accuracy,
            heading: position.coords.heading,
            speed: position.coords.speed,
            timestamp: position.timestamp
          };
          
          // Notify all callbacks
          this.locationUpdateCallbacks.forEach(callback => {
            callback(this.currentLocation);
          });
        },
        (error) => {
          console.error('Error watching position:', error);
        },
        { 
          enableHighAccuracy: true, 
          distanceFilter: 10, // meters
          interval: updateInterval, 
          fastestInterval: updateInterval / 2
        }
      );
    } catch (error) {
      console.error('Failed to start location tracking:', error);
      this.isTracking = false;
    }
  }

  // Stop tracking user location
  stopTracking() {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
      this.isTracking = false;
    }
  }

  // Get the current location once
  async getCurrentLocation() {
    const initialized = await this.initialize();
    if (!initialized) return null;

    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            altitude: position.coords.altitude,
            accuracy: position.coords.accuracy,
            heading: position.coords.heading,
            speed: position.coords.speed,
            timestamp: position.timestamp
          };
          this.currentLocation = location;
          resolve(location);
        },
        (error) => {
          console.error('Error getting current position:', error);
          reject(error);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
      );
    });
  }

  // Register a callback for location updates
  onLocationUpdate(callback) {
    if (typeof callback === 'function') {
      this.locationUpdateCallbacks.push(callback);
    }
  }

  // Remove a previously registered callback
  removeLocationUpdate(callback) {
    this.locationUpdateCallbacks = this.locationUpdateCallbacks.filter(
      cb => cb !== callback
    );
  }

  // Calculate distance between two coordinates in meters
  calculateDistance(lat1, lon1, lat2, lon2) {
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
  }
}

// Export as singleton
export default new LocationService();
