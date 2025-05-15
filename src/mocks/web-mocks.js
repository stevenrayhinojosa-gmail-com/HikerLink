/**
 * Web mocks for native modules
 * These are used when running the app in a web browser
 */

import { Platform } from 'react-native';

// Mock for react-native-sqlite-storage using IndexedDB
export const SQLiteStorage = {
  enablePromise: (enable) => {
    console.log(`[Web SQLite Mock] Promise enabled: ${enable}`);
  },
  
  openDatabase: ({ name, location }) => {
    console.log(`[Web SQLite Mock] Opening database: ${name}`);
    
    // Create an in-memory database with IndexedDB for web
    let dbInstance = null;
    let idbDatabase = null;
    
    // Function to ensure database is initialized
    const ensureDatabase = async () => {
      if (idbDatabase) return idbDatabase;
      
      return new Promise((resolve, reject) => {
        const request = indexedDB.open(name, 1);
        
        request.onupgradeneeded = (event) => {
          const db = event.target.result;
          
          // Create tables object store
          if (!db.objectStoreNames.contains('tables')) {
            db.createObjectStore('tables', { keyPath: 'name' });
          }
          
          // Create data object store
          if (!db.objectStoreNames.contains('data')) {
            db.createObjectStore('data', { keyPath: ['table', 'id'] });
          }
        };
        
        request.onsuccess = (event) => {
          idbDatabase = event.target.result;
          resolve(idbDatabase);
        };
        
        request.onerror = (event) => {
          console.error('[Web SQLite Mock] IndexedDB error:', event.target.error);
          reject(event.target.error);
        };
      });
    };
    
    // Parse SQL statements
    const parseSql = (sql) => {
      sql = sql.trim().toLowerCase();
      
      // Check for CREATE TABLE
      if (sql.startsWith('create table if not exists')) {
        const match = sql.match(/create table if not exists\s+([^\s(]+)\s*\((.*)\)/i);
        if (match) {
          return { 
            type: 'create_table', 
            table: match[1], 
            columns: match[2] 
          };
        }
      }
      
      // Check for INSERT
      if (sql.startsWith('insert into')) {
        const match = sql.match(/insert\s+(?:or\s+replace\s+)?into\s+([^\s(]+)\s*(?:\((.*?)\))?\s*values\s*\((.*)\)/i);
        if (match) {
          return { 
            type: 'insert', 
            table: match[1], 
            columns: match[2] ? match[2].split(',').map(s => s.trim()) : [],
            values: match[3]
          };
        }
      }
      
      // Check for SELECT
      if (sql.startsWith('select')) {
        const fromMatch = sql.match(/from\s+([^\s]+)/i);
        const whereMatch = sql.match(/where\s+(.*?)(?:order by|limit|$)/i);
        const limitMatch = sql.match(/limit\s+([0-9]+)(?:\s+offset\s+([0-9]+))?/i);
        
        if (fromMatch) {
          return {
            type: 'select',
            table: fromMatch[1],
            where: whereMatch ? whereMatch[1].trim() : null,
            limit: limitMatch ? parseInt(limitMatch[1]) : null,
            offset: limitMatch && limitMatch[2] ? parseInt(limitMatch[2]) : 0
          };
        }
      }
      
      // Check for UPDATE
      if (sql.startsWith('update')) {
        const match = sql.match(/update\s+([^\s]+)\s+set\s+(.*?)(?:\s+where\s+(.*?))?$/i);
        if (match) {
          return {
            type: 'update',
            table: match[1],
            set: match[2],
            where: match[3] ? match[3].trim() : null
          };
        }
      }
      
      // Check for CREATE INDEX
      if (sql.startsWith('create index')) {
        const match = sql.match(/create index if not exists\s+([^\s]+)\s+on\s+([^\s(]+)\s*\((.*)\)/i);
        if (match) {
          return {
            type: 'create_index',
            index: match[1],
            table: match[2],
            columns: match[3].split(',').map(s => s.trim())
          };
        }
      }
      
      // Return a basic object for unsupported SQL
      return { type: 'unsupported', sql };
    };
    
    // Execute SQL statement
    const executeSql = async (sql, params = []) => {
      console.log(`[Web SQLite Mock] Executing SQL: ${sql}`, params);
      
      try {
        const db = await ensureDatabase();
        const parsed = parseSql(sql);
        
        // Mock implementation for supported operations
        switch (parsed.type) {
          case 'create_table': {
            const transaction = db.transaction(['tables'], 'readwrite');
            const store = transaction.objectStore('tables');
            await store.put({ name: parsed.table, columns: parsed.columns, created: new Date() });
            return [{ rows: { length: 0, item: () => null } }];
          }
            
          case 'insert': {
            // Simple mock for insert (doesn't handle all cases)
            const transaction = db.transaction(['data'], 'readwrite');
            const store = transaction.objectStore('data');
            
            // Generate a random ID if not provided
            const id = params[0] || `id_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
            
            // Create a simple object with the values
            const row = { table: parsed.table, id };
            
            // Add other values
            for (let i = 1; i < params.length; i++) {
              row[`param_${i}`] = params[i];
            }
            
            await store.put(row);
            return [{ rows: { length: 0, item: () => null } }];
          }
            
          case 'select': {
            // Basic implementation of select
            const transaction = db.transaction(['data'], 'readonly');
            const store = transaction.objectStore('data');
            const allData = await store.getAll();
            
            // Filter by table
            const tableData = allData.filter(row => row.table === parsed.table);
            
            // Apply limit/offset if specified
            const result = parsed.limit 
              ? tableData.slice(parsed.offset, parsed.offset + parsed.limit) 
              : tableData;
            
            // Return the result in the expected format
            return [{
              rows: {
                length: result.length,
                item: (index) => index < result.length ? result[index] : null,
                raw: () => result
              }
            }];
          }
            
          default:
            // For unsupported operations, just return an empty result
            console.log(`[Web SQLite Mock] Unsupported SQL operation: ${parsed.type}`);
            return [{ rows: { length: 0, item: () => null } }];
        }
      } catch (error) {
        console.error('[Web SQLite Mock] Error executing SQL:', error);
        throw error;
      }
    };
    
    // Create the database instance
    dbInstance = {
      transaction: () => ({
        executeSql: async (sql, params = []) => {
          return executeSql(sql, params);
        }
      }),
      executeSql: async (sql, params = []) => {
        return executeSql(sql, params);
      },
      close: async () => {
        console.log('[Web SQLite Mock] Closing database');
        if (idbDatabase) {
          idbDatabase.close();
          idbDatabase = null;
        }
        return true;
      }
    };
    
    return Promise.resolve(dbInstance);
  }
};

// Mock for firebase messaging
export const FirebaseMessaging = {
  requestPermission: async () => {
    console.log('[Web Firebase Messaging Mock] Requesting permission');
    return true;
  },
  getToken: async () => {
    console.log('[Web Firebase Messaging Mock] Getting token');
    return 'web-mock-fcm-token';
  },
  onMessage: (callback) => {
    console.log('[Web Firebase Messaging Mock] Subscribing to messages');
    return () => {};
  },
  onNotificationOpenedApp: (callback) => {
    console.log('[Web Firebase Messaging Mock] Subscribing to notification opened app');
    return () => {};
  },
  getInitialNotification: async () => {
    console.log('[Web Firebase Messaging Mock] Getting initial notification');
    return null;
  }
};

// Mock for react-native-shake
export const RNShake = {
  addListener: (callback) => {
    console.log('[Web RNShake Mock] Adding shake listener');
    
    // For web, we'll simulate shake with a keyboard shortcut (Alt+S)
    if (typeof window !== 'undefined') {
      const handleKeyDown = (event) => {
        if (event.altKey && event.key === 's') {
          console.log('[Web RNShake Mock] Shake detected via Alt+S shortcut');
          callback();
        }
      };
      
      window.addEventListener('keydown', handleKeyDown);
      
      // Return mock subscription
      return {
        remove: () => {
          console.log('[Web RNShake Mock] Removing shake listener');
          window.removeEventListener('keydown', handleKeyDown);
        }
      };
    }
    
    // Return empty subscription for non-browser environments
    return { remove: () => {} };
  }
};

// Mock for react-native-haptic-feedback
export const ReactNativeHapticFeedback = {
  trigger: (type, options) => {
    console.log(`[Web Haptic Mock] Triggered haptic feedback: ${type}`);
  }
};

// Mock for react-native-vibration
export const Vibration = {
  vibrate: (pattern) => {
    console.log('[Web Vibration Mock] Vibrating with pattern:', pattern);
  },
  cancel: () => {
    console.log('[Web Vibration Mock] Cancelling vibration');
  }
};

// Mock for react-native-background-geolocation
export const BackgroundGeolocation = {
  // Constants
  LOG_LEVEL_VERBOSE: 5,
  LOG_LEVEL_DEBUG: 4,
  LOG_LEVEL_INFO: 3,
  LOG_LEVEL_WARNING: 2,
  LOG_LEVEL_ERROR: 1,
  LOG_LEVEL_OFF: 0,
  
  DESIRED_ACCURACY_HIGH: 0,
  DESIRED_ACCURACY_MEDIUM: 10,
  DESIRED_ACCURACY_LOW: 100,
  DESIRED_ACCURACY_VERY_LOW: 1000,
  
  ACTIVITY_TYPE_OTHER: 1,
  ACTIVITY_TYPE_AUTOMOTIVE_NAVIGATION: 2,
  ACTIVITY_TYPE_FITNESS: 3,
  ACTIVITY_TYPE_OTHER_NAVIGATION: 4,
  
  // Configuration methods
  ready: (config) => {
    console.log('[Web BackgroundGeolocation Mock] Configured with:', config);
    return Promise.resolve(config);
  },
  
  // Location tracking methods
  start: () => {
    console.log('[Web BackgroundGeolocation Mock] Started');
    return Promise.resolve(true);
  },
  
  stop: () => {
    console.log('[Web BackgroundGeolocation Mock] Stopped');
    return Promise.resolve(true);
  },
  
  getCurrentPosition: (options) => {
    console.log('[Web BackgroundGeolocation Mock] Getting current position with options:', options);
    
    // Simulate getting current position with HTML5 Geolocation API
    if (navigator && navigator.geolocation) {
      return new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const location = {
              coords: {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                altitude: position.coords.altitude,
                accuracy: position.coords.accuracy,
                speed: position.coords.speed,
                heading: position.coords.heading
              },
              timestamp: new Date().toISOString(),
              is_moving: true,
              odometer: 0,
              uuid: `web-${Date.now()}-${Math.floor(Math.random() * 10000)}`
            };
            console.log('[Web BackgroundGeolocation Mock] Position:', location);
            resolve(location);
          },
          (error) => {
            console.error('[Web BackgroundGeolocation Mock] Error getting position:', error);
            reject(error);
          },
          {
            enableHighAccuracy: options.desiredAccuracy === 0, // High accuracy
            timeout: options.timeout || 15000,
            maximumAge: options.maximumAge || 0
          }
        );
      });
    } else {
      return Promise.reject(new Error('Geolocation not available'));
    }
  },
  
  // Data management methods
  getLocations: () => {
    console.log('[Web BackgroundGeolocation Mock] Getting stored locations');
    // Return some mock locations from localStorage if available
    let locations = [];
    try {
      const storedLocations = localStorage.getItem('bggeolocation_locations');
      if (storedLocations) {
        locations = JSON.parse(storedLocations);
      }
    } catch (e) {
      console.error('[Web BackgroundGeolocation Mock] Error getting stored locations:', e);
    }
    return Promise.resolve(locations);
  },
  
  destroyLocations: (locationIds) => {
    console.log('[Web BackgroundGeolocation Mock] Destroying locations:', locationIds);
    // Remove locations from localStorage if available
    try {
      const storedLocations = localStorage.getItem('bggeolocation_locations');
      if (storedLocations) {
        const locations = JSON.parse(storedLocations);
        const remaining = locations.filter(loc => !locationIds.includes(loc.uuid));
        localStorage.setItem('bggeolocation_locations', JSON.stringify(remaining));
      }
    } catch (e) {
      console.error('[Web BackgroundGeolocation Mock] Error destroying locations:', e);
    }
    return Promise.resolve(true);
  },
  
  // Configuration update
  setConfig: (config) => {
    console.log('[Web BackgroundGeolocation Mock] Updated config:', config);
    return Promise.resolve(config);
  },
  
  // Event listeners
  onLocation: (callback) => {
    console.log('[Web BackgroundGeolocation Mock] Added location listener');
    return () => console.log('[Web BackgroundGeolocation Mock] Removed location listener');
  },
  
  onMotionChange: (callback) => {
    console.log('[Web BackgroundGeolocation Mock] Added motion change listener');
    return () => console.log('[Web BackgroundGeolocation Mock] Removed motion change listener');
  },
  
  onActivityChange: (callback) => {
    console.log('[Web BackgroundGeolocation Mock] Added activity change listener');
    return () => console.log('[Web BackgroundGeolocation Mock] Removed activity change listener');
  },
  
  onHeartbeat: (callback) => {
    console.log('[Web BackgroundGeolocation Mock] Added heartbeat listener');
    return () => console.log('[Web BackgroundGeolocation Mock] Removed heartbeat listener');
  },
  
  onProviderChange: (callback) => {
    console.log('[Web BackgroundGeolocation Mock] Added provider change listener');
    return () => console.log('[Web BackgroundGeolocation Mock] Removed provider change listener');
  },
  
  removeListeners: () => {
    console.log('[Web BackgroundGeolocation Mock] Removed all listeners');
  }
};

// Mock for react-native-background-fetch
export const BackgroundFetch = {
  STATUS_RESTRICTED: 0,
  STATUS_DENIED: 1,
  STATUS_AVAILABLE: 2,
  
  FETCH_RESULT_NEW_DATA: 0,
  FETCH_RESULT_NO_DATA: 1,
  FETCH_RESULT_FAILED: 2,
  
  configure: (config, successCallback, failureCallback) => {
    console.log('[Web BackgroundFetch Mock] Configured with:', config);
    
    // Simulate a background fetch event every 15 minutes (if possible)
    try {
      setInterval(() => {
        if (typeof successCallback === 'function') {
          console.log('[Web BackgroundFetch Mock] Simulating fetch event');
          successCallback('com.hikerlink.fetch');
        }
      }, Math.max(15, config.minimumFetchInterval || 15) * 60000);
      
      // Return "available" status
      setTimeout(() => {
        if (typeof successCallback === 'function') {
          successCallback(2); // STATUS_AVAILABLE
        }
      }, 500);
    } catch (e) {
      console.error('[Web BackgroundFetch Mock] Error configuring:', e);
      if (typeof failureCallback === 'function') {
        failureCallback(e);
      }
    }
  },
  
  scheduleTask: (task) => {
    console.log('[Web BackgroundFetch Mock] Scheduled task:', task);
    return Promise.resolve(true);
  },
  
  start: () => {
    console.log('[Web BackgroundFetch Mock] Started');
    return Promise.resolve(true);
  },
  
  stop: () => {
    console.log('[Web BackgroundFetch Mock] Stopped');
    return Promise.resolve(true);
  },
  
  finish: (taskId) => {
    console.log('[Web BackgroundFetch Mock] Finished task:', taskId);
  }
};

// Apply mocks based on platform
if (Platform.OS === 'web') {
  // Mock SQLite for web
  if (!global.SQLite) {
    global.SQLite = SQLiteStorage;
  }
  
  // Add other mocks
  if (!global.RNShake) {
    global.RNShake = RNShake;
  }
  
  if (!global.ReactNativeHapticFeedback) {
    global.ReactNativeHapticFeedback = ReactNativeHapticFeedback;
  }
  
  if (!global.Vibration) {
    global.Vibration = Vibration;
  }
  
  // Add BackgroundGeolocation mock
  if (!global.BackgroundGeolocation) {
    global.BackgroundGeolocation = BackgroundGeolocation;
  }
  
  // Add BackgroundFetch mock
  if (!global.BackgroundFetch) {
    global.BackgroundFetch = BackgroundFetch;
  }
}