import { Platform } from 'react-native';
import BackgroundGeolocation from 'react-native-background-geolocation';
import BackgroundFetch from 'react-native-background-fetch';
import firebaseService from './firebaseService';
import messagingService from './messagingService';
import locationService from './locationService';
import { requestLocationPermissions } from '../utils/permissions';

/**
 * Service for managing background location tracking
 * Uses a combination of react-native-background-geolocation and react-native-background-fetch
 * with smart battery optimization strategies
 */
class BackgroundLocationService {
  constructor() {
    this.isInitialized = false;
    this.isTracking = false;
    this.trackingMode = 'standard'; // 'standard', 'power-saving', 'high-accuracy'
    this.lastKnownLocation = null;
    this.locationListeners = [];
    this.locationUpdateInterval = 60000; // 1 minute default
    this.minDisplacement = 10; // minimum 10 meters by default
    this.syncInterval = 300000; // 5 minutes - sync tracked locations to Firebase
    this.lastSyncTime = null;
    this.pendingLocations = [];
    this.backupInterval = null;
    this.appState = 'active';
    
    // Bindings
    this._onLocation = this._onLocation.bind(this);
    this._onMotionChange = this._onMotionChange.bind(this);
    this._onActivityChange = this._onActivityChange.bind(this);
    this._onHeartbeat = this._onHeartbeat.bind(this);
    this._onProviderChange = this._onProviderChange.bind(this);
    this._syncLocationsToCloud = this._syncLocationsToCloud.bind(this);
  }

  /**
   * Initialize background location tracking with permissions
   * @param {Object} options - Configuration options
   * @returns {Promise<boolean>} Success status
   */
  async initialize(options = {}) {
    if (this.isInitialized) {
      console.log('Background location service already initialized');
      return true;
    }

    try {
      // Request location permissions
      const hasPermissions = await requestLocationPermissions(true); // true for background
      if (!hasPermissions) {
        console.error('Location permissions denied');
        return false;
      }

      // Apply configuration options
      this.trackingMode = options.trackingMode || this.trackingMode;
      this.locationUpdateInterval = options.locationUpdateInterval || this.locationUpdateInterval;
      this.minDisplacement = options.minDisplacement || this.minDisplacement;
      this.syncInterval = options.syncInterval || this.syncInterval;
      
      // Configure background geolocation based on tracking mode
      const config = this._getConfigForMode(this.trackingMode);
      
      // Configure BackgroundGeolocation
      await BackgroundGeolocation.ready(config);
      
      // Configure BackgroundFetch for iOS (Android's JobScheduler/WorkManager handled by BackgroundGeolocation)
      await this._configureBackgroundFetch();
      
      // Set up a backup interval using setInterval when app is active
      // This provides a fallback in case background modes fail
      this._setupBackupInterval();
      
      this.isInitialized = true;
      console.log('Background location service initialized');
      return true;
    } catch (error) {
      console.error('Error initializing background location service:', error);
      return false;
    }
  }

  /**
   * Start tracking location in the background
   * @param {string} mode - Tracking mode: 'standard', 'power-saving', or 'high-accuracy'
   * @returns {Promise<boolean>} Success status
   */
  async startTracking(mode = null) {
    if (!this.isInitialized) {
      const initialized = await this.initialize();
      if (!initialized) return false;
    }
    
    try {
      // If mode has changed, update the configuration
      if (mode && mode !== this.trackingMode) {
        this.trackingMode = mode;
        await BackgroundGeolocation.setConfig(this._getConfigForMode(mode));
      }
      
      // Start the location tracking
      await BackgroundGeolocation.start();
      
      // Also start background fetch
      BackgroundFetch.start();
      
      this.isTracking = true;
      console.log(`Background location tracking started in ${this.trackingMode} mode`);
      return true;
    } catch (error) {
      console.error('Error starting background location tracking:', error);
      return false;
    }
  }

  /**
   * Stop tracking location in the background
   * @returns {Promise<boolean>} Success status
   */
  async stopTracking() {
    if (!this.isTracking) return true;
    
    try {
      // Stop background geolocation
      await BackgroundGeolocation.stop();
      
      // Stop background fetch
      BackgroundFetch.stop();
      
      // Clear backup interval
      if (this.backupInterval) {
        clearInterval(this.backupInterval);
        this.backupInterval = null;
      }
      
      this.isTracking = false;
      console.log('Background location tracking stopped');
      return true;
    } catch (error) {
      console.error('Error stopping background location tracking:', error);
      return false;
    }
  }

  /**
   * Change the tracking mode (affects accuracy, power usage, and polling frequency)
   * @param {string} mode - 'standard', 'power-saving', or 'high-accuracy'
   * @returns {Promise<boolean>} Success status
   */
  async setTrackingMode(mode) {
    if (!this.isInitialized) {
      return false;
    }
    
    if (mode === this.trackingMode) {
      return true; // No change needed
    }
    
    try {
      this.trackingMode = mode;
      
      // Update configuration
      await BackgroundGeolocation.setConfig(this._getConfigForMode(mode));
      
      // Update backup interval to match
      this._setupBackupInterval();
      
      console.log(`Tracking mode changed to ${mode}`);
      return true;
    } catch (error) {
      console.error('Error changing tracking mode:', error);
      return false;
    }
  }

  /**
   * Add a listener for location updates
   * @param {Function} listener - Callback function(location)
   * @returns {Function} Function to remove listener
   */
  addLocationListener(listener) {
    if (typeof listener !== 'function') return () => {};
    
    this.locationListeners.push(listener);
    return () => {
      this.locationListeners = this.locationListeners.filter(l => l !== listener);
    };
  }

  /**
   * Get the last known location
   * @returns {Object|null} Location object or null
   */
  getLastKnownLocation() {
    return this.lastKnownLocation;
  }

  /**
   * Manually request a location update
   * @param {boolean} highAccuracy - Whether to request high accuracy
   * @returns {Promise<Object>} Location object
   */
  async getCurrentLocation(highAccuracy = false) {
    if (!this.isInitialized) {
      const initialized = await this.initialize();
      if (!initialized) {
        throw new Error('Background location service not initialized');
      }
    }
    
    try {
      // Get current position with BackgroundGeolocation
      const location = await BackgroundGeolocation.getCurrentPosition({
        samples: highAccuracy ? 3 : 1, // Number of samples to collect
        maximumAge: highAccuracy ? 0 : 10000, // Age in ms (use cache if recent)
        timeout: highAccuracy ? 30000 : 10000, // Timeout in ms
        persist: true, // Save to database
        desiredAccuracy: highAccuracy ? 
          BackgroundGeolocation.DESIRED_ACCURACY_HIGH : 
          BackgroundGeolocation.DESIRED_ACCURACY_MEDIUM,
      });
      
      // Update last known location
      this.lastKnownLocation = this._formatLocation(location);
      
      // Notify listeners
      this._notifyLocationListeners(this.lastKnownLocation);
      
      return this.lastKnownLocation;
    } catch (error) {
      console.error('Error getting current location:', error);
      
      // Fallback to the regular location service
      return await locationService.getCurrentLocation();
    }
  }

  /**
   * Force sync tracked locations to the cloud
   * @returns {Promise<number>} Number of locations synced
   */
  async syncLocationsToCloud() {
    return await this._syncLocationsToCloud();
  }

  /**
   * Get the current tracking status
   * @returns {Object} Status object with isTracking, trackingMode, etc.
   */
  getTrackingStatus() {
    return {
      isInitialized: this.isInitialized,
      isTracking: this.isTracking,
      trackingMode: this.trackingMode,
      lastKnownLocation: this.lastKnownLocation,
      lastSyncTime: this.lastSyncTime,
      pendingLocationCount: this.pendingLocations.length
    };
  }

  /**
   * Clean up resources
   */
  async cleanup() {
    await this.stopTracking();
    
    // Clear all listeners
    this.locationListeners = [];
    
    // Remove BackgroundGeolocation listeners
    if (this.isInitialized) {
      BackgroundGeolocation.removeListeners();
    }
    
    this.isInitialized = false;
  }

  /* ---- Private methods ---- */

  /**
   * Get configuration for BackgroundGeolocation based on tracking mode
   * @param {string} mode - 'standard', 'power-saving', or 'high-accuracy'
   * @returns {Object} Configuration object
   * @private
   */
  _getConfigForMode(mode) {
    // Base configuration
    const baseConfig = {
      // Debug config
      debug: false,
      logLevel: BackgroundGeolocation.LOG_LEVEL_VERBOSE,
      
      // Geolocation config
      desiredAccuracy: BackgroundGeolocation.DESIRED_ACCURACY_MEDIUM,
      distanceFilter: this.minDisplacement,
      locationUpdateInterval: this.locationUpdateInterval,
      fastestLocationUpdateInterval: this.locationUpdateInterval / 2,
      
      // Activity Recognition
      stopTimeout: 5, // Stop after 5 minutes of still activity
      
      // Application config
      stopOnTerminate: false,
      startOnBoot: true,
      enableHeadless: true,
      
      // HTTP & persistence
      autoSync: true,
      maxRecordsToPersist: 1000,
      batchSync: true,
      maxBatchSize: 50,
      
      // Android specifics
      foregroundService: true,
      notification: {
        title: 'HikerLink is tracking your location',
        text: 'Location tracking is active'
      },
      
      // iOS specifics
      pausesLocationUpdatesAutomatically: false,
      saveBatteryOnBackground: true
    };
    
    // Mode-specific configurations
    switch (mode) {
      case 'power-saving':
        return {
          ...baseConfig,
          desiredAccuracy: BackgroundGeolocation.DESIRED_ACCURACY_LOW,
          distanceFilter: this.minDisplacement * 3, // 3x standard distance
          locationUpdateInterval: this.locationUpdateInterval * 3, // 3x standard interval
          fastestLocationUpdateInterval: this.locationUpdateInterval * 1.5,
          stopTimeout: 2, // Stop after 2 minutes of still activity
          saveBatteryOnBackground: true
        };
        
      case 'high-accuracy':
        return {
          ...baseConfig,
          desiredAccuracy: BackgroundGeolocation.DESIRED_ACCURACY_HIGH,
          distanceFilter: Math.max(5, this.minDisplacement / 2), // Half standard, minimum 5m
          locationUpdateInterval: Math.max(10000, this.locationUpdateInterval / 3), // 1/3 standard, minimum 10s
          fastestLocationUpdateInterval: Math.max(5000, this.locationUpdateInterval / 6), // Minimum 5s
          stopTimeout: 10, // Stop after 10 minutes of still activity
          saveBatteryOnBackground: false
        };
        
      case 'standard':
      default:
        return baseConfig;
    }
  }

  /**
   * Configure BackgroundFetch for iOS
   * @returns {Promise<void>}
   * @private
   */
  async _configureBackgroundFetch() {
    // Configure BackgroundFetch
    await BackgroundFetch.configure({
      minimumFetchInterval: Math.max(15, Math.floor(this.syncInterval / 60000)), // in minutes, minimum 15
      stopOnTerminate: false,
      startOnBoot: true,
      enableHeadless: true,
    }, async (taskId) => {
      console.log('[BackgroundFetch] Event received:', taskId);
      
      // Get current location if tracking is active
      if (this.isTracking) {
        try {
          await this.getCurrentLocation(false); // Low accuracy is sufficient for background
        } catch (error) {
          console.error('[BackgroundFetch] Error getting location:', error);
        }
      }
      
      // Sync locations to cloud
      try {
        await this._syncLocationsToCloud();
      } catch (error) {
        console.error('[BackgroundFetch] Error syncing locations:', error);
      }
      
      // IMPORTANT: You must call finish() when your task is complete
      BackgroundFetch.finish(taskId);
    }, (error) => {
      console.error('[BackgroundFetch] Failed to configure:', error);
    });
    
    // Register an additional task for handling Firebase notification wake-ups
    BackgroundFetch.scheduleTask({
      taskId: 'com.hikerlink.firebase-sync',
      delay: 0, // Execute immediately when triggered
      forceAlarmManager: true, // Android only. Force using AlarmManager for this task
      periodic: false // Non-periodic task
    });
  }

  /**
   * Set up backup interval for when the app is active
   * @private
   */
  _setupBackupInterval() {
    // Clear existing interval if any
    if (this.backupInterval) {
      clearInterval(this.backupInterval);
    }
    
    // Calculate interval based on tracking mode
    let interval = this.locationUpdateInterval;
    if (this.trackingMode === 'power-saving') {
      interval = this.locationUpdateInterval * 3;
    } else if (this.trackingMode === 'high-accuracy') {
      interval = Math.max(10000, this.locationUpdateInterval / 3);
    }
    
    // Set up new interval
    this.backupInterval = setInterval(async () => {
      if (this.isTracking && this.appState === 'active') {
        try {
          // Get current location
          await this.getCurrentLocation(this.trackingMode === 'high-accuracy');
          
          // Check if it's time to sync to cloud
          const now = Date.now();
          if (!this.lastSyncTime || (now - this.lastSyncTime) >= this.syncInterval) {
            await this._syncLocationsToCloud();
          }
        } catch (error) {
          console.error('Error in backup location interval:', error);
        }
      }
    }, interval);
  }

  /**
   * Sync tracked locations to the cloud
   * @returns {Promise<number>} Number of locations synced
   * @private
   */
  async _syncLocationsToCloud() {
    if (!firebaseService.isSignedIn() || !navigator.onLine) {
      return 0;
    }
    
    try {
      // Get locations from the native plugin
      const locations = await BackgroundGeolocation.getLocations();
      
      // Extract locations that haven't been synced yet
      const unsynced = [...this.pendingLocations, ...locations]
        .filter(location => location && location.uuid)
        // Sort ascending by time
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      
      if (unsynced.length === 0) {
        return 0;
      }
      
      console.log(`Syncing ${unsynced.length} locations to cloud`);
      
      // Process in smaller batches to avoid overwhelming the API
      const batchSize = 20;
      let totalSynced = 0;
      
      for (let i = 0; i < unsynced.length; i += batchSize) {
        const batch = unsynced.slice(i, i + batchSize);
        
        // Format locations for Firebase
        const formattedLocations = batch.map(location => this._formatLocation(location));
        
        // Save to Firebase (batched)
        await firebaseService.saveLocationHistory(formattedLocations);
        
        // Remove the locations that were successfully synced
        const syncedIds = batch.map(location => location.uuid);
        await BackgroundGeolocation.destroyLocations(syncedIds);
        
        totalSynced += batch.length;
      }
      
      // Update sync time
      this.lastSyncTime = Date.now();
      this.pendingLocations = [];
      
      console.log(`Successfully synced ${totalSynced} locations to cloud`);
      return totalSynced;
    } catch (error) {
      console.error('Error syncing locations to cloud:', error);
      return 0;
    }
  }

  /**
   * Format location object for consistency across the app
   * @param {Object} location - Raw location object
   * @returns {Object} Formatted location object
   * @private
   */
  _formatLocation(location) {
    if (!location) return null;
    
    return {
      latitude: location.coords?.latitude || location.latitude,
      longitude: location.coords?.longitude || location.longitude,
      altitude: location.coords?.altitude || location.altitude,
      accuracy: location.coords?.accuracy || location.accuracy,
      speed: location.coords?.speed || location.speed,
      heading: location.coords?.heading || location.heading,
      timestamp: location.timestamp || new Date().toISOString(),
      activity: location.activity?.type || null,
      confidence: location.activity?.confidence || null,
      battery: {
        level: location.battery?.level,
        isCharging: location.battery?.is_charging
      },
      uuid: location.uuid || null,
      is_moving: !!location.is_moving,
      odometer: location.odometer || 0
    };
  }

  /**
   * Notify all location listeners of a new location
   * @param {Object} location - Location object
   * @private
   */
  _notifyLocationListeners(location) {
    if (!location) return;
    
    this.locationListeners.forEach(listener => {
      try {
        listener(location);
      } catch (error) {
        console.error('Error in location listener:', error);
      }
    });
  }

  /**
   * Handle location update from BackgroundGeolocation
   * @param {Object} location - Location object from plugin
   * @private
   */
  _onLocation(location) {
    console.log('[BackgroundGeolocation] Location update:', location);
    
    // Update last known location
    this.lastKnownLocation = this._formatLocation(location);
    
    // Notify listeners
    this._notifyLocationListeners(this.lastKnownLocation);
    
    // If online and sufficient time has passed, sync to cloud
    if (navigator.onLine && firebaseService.isSignedIn()) {
      const now = Date.now();
      if (!this.lastSyncTime || (now - this.lastSyncTime) >= this.syncInterval) {
        this._syncLocationsToCloud();
      }
    } else {
      // Add to pending locations if offline
      this.pendingLocations.push(location);
    }
  }

  /**
   * Handle motion change from BackgroundGeolocation
   * @param {Object} event - Motion change event
   * @private
   */
  _onMotionChange(event) {
    console.log('[BackgroundGeolocation] Motion changed:', event);
    
    // If device is moving, get a fresh location at higher accuracy
    if (event.isMoving) {
      this.getCurrentLocation(true);
    }
  }

  /**
   * Handle activity change from BackgroundGeolocation
   * @param {Object} event - Activity change event
   * @private
   */
  _onActivityChange(event) {
    console.log('[BackgroundGeolocation] Activity changed:', event);
    
    // Adjust tracking mode based on activity
    if (event.confidence >= 75) {
      if (event.activity === 'still') {
        // If stationary for a while, reduce polling frequency
        if (this.trackingMode !== 'power-saving') {
          this.setTrackingMode('power-saving');
        }
      } else if (event.activity === 'walking' || event.activity === 'on_foot') {
        // Standard tracking for walking
        if (this.trackingMode !== 'standard') {
          this.setTrackingMode('standard');
        }
      } else if (event.activity === 'running' || event.activity === 'on_bicycle') {
        // Higher accuracy for faster movement
        if (this.trackingMode !== 'high-accuracy') {
          this.setTrackingMode('high-accuracy');
        }
      }
    }
  }

  /**
   * Handle heartbeat from BackgroundGeolocation
   * @param {Object} event - Heartbeat event
   * @private
   */
  _onHeartbeat(event) {
    console.log('[BackgroundGeolocation] Heartbeat:', event);
    
    // Check if we should get a new location
    if (this.isTracking) {
      this.getCurrentLocation(false);
    }
  }

  /**
   * Handle provider change from BackgroundGeolocation
   * @param {Object} event - Provider change event
   * @private
   */
  _onProviderChange(event) {
    console.log('[BackgroundGeolocation] Provider change:', event);
    
    // If GPS is disabled, attempt to use network provider
    if (!event.gps) {
      console.log('[BackgroundGeolocation] GPS disabled, falling back to network provider');
    }
  }
}

export default new BackgroundLocationService();