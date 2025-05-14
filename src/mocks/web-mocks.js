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

// Apply mocks based on platform
if (Platform.OS === 'web') {
  // Mock SQLite for web
  if (!global.SQLite) {
    global.SQLite = SQLiteStorage;
  }
}