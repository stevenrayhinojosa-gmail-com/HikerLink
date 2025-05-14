import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import firebaseService from '../services/firebaseService';
import messagingService from '../services/messagingService';

const ConnectionStatus = () => {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' && 'onLine' in navigator ? navigator.onLine : false);
  const [syncStatus, setSyncStatus] = useState({
    lastSyncTime: null,
    pendingMessages: 0,
    syncing: false,
  });
  
  useEffect(() => {
    // Check initial online status
    checkOnlineStatus();
    
    // Set up event listeners for online/offline events
    if (typeof window !== 'undefined') {
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      
      // Set up interval to check sync status
      const interval = setInterval(checkSyncStatus, 10000); // Every 10 seconds
      
      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
        clearInterval(interval);
      };
    }
  }, []);
  
  const checkOnlineStatus = () => {
    if (typeof navigator !== 'undefined' && 'onLine' in navigator) {
      setIsOnline(navigator.onLine);
    }
  };
  
  const handleOnline = () => {
    setIsOnline(true);
    
    // Start sync when coming online
    syncMessages();
  };
  
  const handleOffline = () => {
    setIsOnline(false);
    setSyncStatus(prev => ({
      ...prev,
      syncing: false,
    }));
  };
  
  const checkSyncStatus = async () => {
    // Only check if we're online
    if (!isOnline || !firebaseService.isSignedIn()) {
      return;
    }
    
    try {
      // Get count of messages pending sync
      const pendingCount = await messagingService.getPendingMessageCount();
      setSyncStatus(prev => ({
        ...prev,
        pendingMessages: pendingCount,
      }));
      
      // Auto-sync if there are pending messages
      if (pendingCount > 0 && !syncStatus.syncing) {
        syncMessages();
      }
    } catch (err) {
      console.error('Error checking sync status:', err);
    }
  };
  
  const syncMessages = async () => {
    if (!isOnline || syncStatus.syncing || !firebaseService.isSignedIn()) {
      return;
    }
    
    try {
      setSyncStatus(prev => ({
        ...prev,
        syncing: true,
      }));
      
      // Sync messages
      const syncedCount = await messagingService.syncMessages();
      
      // Update sync status
      setSyncStatus({
        lastSyncTime: new Date(),
        pendingMessages: Math.max(0, syncStatus.pendingMessages - syncedCount),
        syncing: false,
      });
    } catch (err) {
      console.error('Error syncing messages:', err);
      setSyncStatus(prev => ({
        ...prev,
        syncing: false,
      }));
    }
  };
  
  return (
    <View style={styles.container}>
      <View style={styles.statusRow}>
        <View style={[styles.statusIndicator, isOnline ? styles.online : styles.offline]} />
        <Text style={styles.statusText}>
          {isOnline ? 'Online' : 'Offline'} Mode
        </Text>
        
        {isOnline && firebaseService.isSignedIn() && (
          <TouchableOpacity 
            style={styles.syncButton}
            onPress={syncMessages}
            disabled={syncStatus.syncing || syncStatus.pendingMessages === 0}
          >
            <Text style={styles.syncButtonText}>
              {syncStatus.syncing 
                ? 'Syncing...' 
                : syncStatus.pendingMessages > 0 
                  ? `Sync (${syncStatus.pendingMessages})` 
                  : 'Synced'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
      
      {syncStatus.lastSyncTime && (
        <Text style={styles.lastSyncText}>
          Last synced: {syncStatus.lastSyncTime.toLocaleTimeString()}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 15,
    padding: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  online: {
    backgroundColor: '#27ae60',
  },
  offline: {
    backgroundColor: '#e74c3c',
  },
  statusText: {
    fontSize: 14,
    color: '#34495e',
    flex: 1,
  },
  syncButton: {
    backgroundColor: '#3498db',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    alignItems: 'center',
  },
  syncButtonText: {
    color: 'white',
    fontSize: 12,
  },
  lastSyncText: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 4,
  },
});

export default ConnectionStatus;