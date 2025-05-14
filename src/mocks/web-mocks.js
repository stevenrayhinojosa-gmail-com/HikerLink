/**
 * Web mocks for native modules
 * These are used when running the app in a web browser
 */

import { Platform } from 'react-native';

// Mock for react-native-sqlite-storage
export const SQLiteStorage = {
  enablePromise: (enable) => {},
  openDatabase: ({ name, location }) => {
    console.log(`[Web SQLite Mock] Opening database: ${name}`);
    
    // Use IndexedDB for persistent storage in web
    const db = {
      transaction: () => ({
        executeSql: async (sql, params = []) => {
          console.log(`[Web SQLite Mock] Executing SQL: ${sql}`, params);
          return [{ rows: { length: 0, item: () => null } }];
        }
      }),
      executeSql: async (sql, params = []) => {
        console.log(`[Web SQLite Mock] Executing SQL: ${sql}`, params);
        return [{ rows: { length: 0, item: () => null } }];
      },
      close: async () => {
        console.log('[Web SQLite Mock] Closing database');
        return true;
      }
    };
    
    return Promise.resolve(db);
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

// Apply mocks based on platform
if (Platform.OS === 'web') {
  // Mock SQLite for web
  if (!global.SQLite) {
    global.SQLite = SQLiteStorage;
  }
}