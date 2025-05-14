import bridgefyService, { MESSAGE_TYPES } from './bridgefyService';
import firebaseService from './firebaseService';
import databaseService from './databaseService';
import locationService from './locationService';
import { Platform, NetInfo } from 'react-native';

/**
 * Combined messaging service that handles both online and offline messaging
 * Coordinates between Bridgefy (offline) and Firebase (online) services
 */
class MessagingService {
  constructor() {
    this.initialized = false;
    this.isOnline = false;
    this.isOfflineMessagingEnabled = true;
    this.username = null;
    this.userId = null;
    this.messageListeners = [];
  }

  /**
   * Initialize the messaging service
   * @param {Object} config - Firebase configuration
   * @param {string} username - User's display name
   * @returns {Promise<boolean>} Success status
   */
  async initialize(config, username) {
    if (this.initialized) {
      console.log('Messaging service already initialized');
      return true;
    }

    try {
      // Initialize database service first
      const dbInitialized = await databaseService.init();
      if (!dbInitialized) {
        console.error('Failed to initialize database service');
        return false;
      }

      // Initialize Firebase service if config is provided
      let firebaseInitialized = false;
      if (config && config.apiKey) {
        firebaseInitialized = await firebaseService.initialize(config);
        if (firebaseInitialized) {
          console.log('Firebase service initialized');
          
          // If not signed in, sign in anonymously
          if (!firebaseService.isSignedIn()) {
            await firebaseService.signInAnonymously();
          }
          
          this.userId = firebaseService.getCurrentUserId();
          
          // Get the username from Firebase if available
          const user = firebaseService.getCurrentUser();
          if (user && user.displayName) {
            this.username = user.displayName;
          } else if (username) {
            this.username = username;
            // Update display name if signed in
            if (user) {
              await firebaseService.updateUserProfile({ displayName: username });
            }
          }
        } else {
          console.warn('Failed to initialize Firebase service, will operate in offline-only mode');
        }
      }

      // Initialize Bridgefy service for offline messaging
      if (this.isOfflineMessagingEnabled) {
        // Use the bridgefy API key if we have it
        const bridgefyInitialized = await bridgefyService.initialize('simulated_api_key');
        
        if (bridgefyInitialized) {
          console.log('Bridgefy service initialized');
          
          // Start Bridgefy with user info
          await bridgefyService.start({
            username: this.username || username || 'Anonymous Hiker',
            firebaseUid: this.userId
          });
          
          // Set up Bridgefy message listener
          bridgefyService.onMessageReceived(this._handleBridgefyMessage.bind(this));
          
          // Set up Bridgefy peer listeners
          bridgefyService.onPeerDetected(this._handlePeerDetected.bind(this));
          bridgefyService.onPeerLost(this._handlePeerLost.bind(this));
          bridgefyService.onPeerConnectionStateChanged(this._handlePeerConnectionStateChanged.bind(this));
        } else {
          console.warn('Failed to initialize Bridgefy service');
        }
      }

      // Set up network status monitoring
      this._setupNetworkMonitoring();

      this.initialized = true;
      return true;
    } catch (error) {
      console.error('Error initializing messaging service:', error);
      return false;
    }
  }

  /**
   * Set username for the messaging service
   * @param {string} username - User's display name
   */
  setUsername(username) {
    this.username = username;
    
    // Update Firebase profile if signed in
    if (firebaseService.isSignedIn()) {
      firebaseService.updateUserProfile({ displayName: username })
        .catch(console.error);
    }
    
    // Update Bridgefy username
    if (bridgefyService.isStarted) {
      bridgefyService.start({ username })
        .catch(console.error);
    }
  }

  /**
   * Enable or disable offline messaging
   * @param {boolean} enabled - Whether offline messaging is enabled
   */
  setOfflineMessagingEnabled(enabled) {
    this.isOfflineMessagingEnabled = enabled;
    
    if (!enabled && bridgefyService.isStarted) {
      // Stop Bridgefy if offline messaging is disabled
      bridgefyService.stop().catch(console.error);
    } else if (enabled && !bridgefyService.isStarted && this.initialized) {
      // Restart Bridgefy if offline messaging is enabled
      bridgefyService.start({
        username: this.username || 'Anonymous Hiker',
        firebaseUid: this.userId
      }).catch(console.error);
    }
  }

  /**
   * Send a text message
   * @param {string} peerId - Recipient peer ID
   * @param {string} text - Message text
   * @returns {Promise<boolean>} Success status
   */
  async sendTextMessage(peerId, text) {
    if (!this.initialized) {
      throw new Error('Messaging service not initialized');
    }
    
    try {
      const messageId = `msg_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      const timestamp = new Date().toISOString();
      
      // Create message object
      const message = {
        messageId,
        peerId,
        senderId: this.userId || bridgefyService.userId,
        senderName: this.username || 'Me',
        localUserId: this.userId || bridgefyService.userId, // For determining if outgoing
        type: MESSAGE_TYPES.TEXT,
        content: text,
        timestamp,
        isDelivered: false,
        metadata: {
          sentVia: this.isOnline ? 'firebase' : 'bridgefy'
        }
      };
      
      // Save to local database
      await databaseService.saveMessage(message, this.isOnline);
      
      // Send via Firebase if online
      let firebaseSent = false;
      if (this.isOnline && firebaseService.isSignedIn()) {
        try {
          await firebaseService.saveMessage({
            peerId: peerId,
            type: MESSAGE_TYPES.TEXT,
            content: text,
            timestamp,
          });
          firebaseSent = true;
        } catch (error) {
          console.error('Error sending message via Firebase:', error);
        }
      }
      
      // Send via Bridgefy if offline or Firebase failed
      let bridgefySent = false;
      if (this.isOfflineMessagingEnabled && (!firebaseSent || !this.isOnline)) {
        try {
          const bridgefyMessage = {
            type: MESSAGE_TYPES.TEXT,
            content: text,
          };
          bridgefySent = await bridgefyService.sendMessage(peerId, bridgefyMessage);
        } catch (error) {
          console.error('Error sending message via Bridgefy:', error);
        }
      }
      
      // Notify listeners
      this._notifyMessageListeners([message]);
      
      return firebaseSent || bridgefySent;
    } catch (error) {
      console.error('Error sending text message:', error);
      throw error;
    }
  }

  /**
   * Send a location message
   * @param {string} peerId - Recipient peer ID
   * @param {boolean} isEmergency - Whether this is an emergency message
   * @returns {Promise<boolean>} Success status
   */
  async sendLocationMessage(peerId, isEmergency = false) {
    if (!this.initialized) {
      throw new Error('Messaging service not initialized');
    }
    
    try {
      // Get current location
      const location = await locationService.getCurrentLocation();
      if (!location) {
        throw new Error('Could not get current location');
      }
      
      const messageId = `msg_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      const timestamp = new Date().toISOString();
      const messageType = isEmergency ? MESSAGE_TYPES.SOS : MESSAGE_TYPES.LOCATION;
      
      // Create message object
      const message = {
        messageId,
        peerId,
        senderId: this.userId || bridgefyService.userId,
        senderName: this.username || 'Me',
        localUserId: this.userId || bridgefyService.userId, // For determining if outgoing
        type: messageType,
        content: {
          latitude: location.latitude,
          longitude: location.longitude,
          altitude: location.altitude,
          accuracy: location.accuracy,
          timestamp: location.timestamp || timestamp,
        },
        timestamp,
        isDelivered: false,
        isEmergency,
        metadata: {
          sentVia: this.isOnline ? 'firebase' : 'bridgefy'
        }
      };
      
      // Add message text for SOS
      if (isEmergency) {
        message.content.message = 'I need help! This is an emergency.';
      }
      
      // Save to local database
      await databaseService.saveMessage(message, this.isOnline);
      
      // Save to Firebase if online
      let firebaseSent = false;
      if (this.isOnline && firebaseService.isSignedIn()) {
        try {
          // Save message
          await firebaseService.saveMessage({
            peerId: peerId,
            type: messageType,
            content: message.content,
            timestamp,
            isEmergency,
          });
          
          // If emergency, also save to user's location
          if (isEmergency) {
            await firebaseService.saveUserLocation(message.content, true);
          }
          
          firebaseSent = true;
        } catch (error) {
          console.error('Error sending location via Firebase:', error);
        }
      }
      
      // Send via Bridgefy if offline or Firebase failed
      let bridgefySent = false;
      if (this.isOfflineMessagingEnabled && (!firebaseSent || !this.isOnline)) {
        try {
          if (isEmergency) {
            bridgefySent = await bridgefyService.sendSOS(message.content.message);
          } else {
            const bridgefyMessage = {
              type: messageType,
              content: message.content,
              isEmergency,
            };
            bridgefySent = await bridgefyService.sendMessage(peerId, bridgefyMessage);
          }
        } catch (error) {
          console.error('Error sending location via Bridgefy:', error);
        }
      }
      
      // Notify listeners
      this._notifyMessageListeners([message]);
      
      return firebaseSent || bridgefySent;
    } catch (error) {
      console.error('Error sending location message:', error);
      throw error;
    }
  }

  /**
   * Send an SOS emergency message to all peers
   * @param {string} message - Optional emergency message
   * @returns {Promise<boolean>} Success status
   */
  async sendSOSMessage(message = 'I need help! This is an emergency.') {
    if (!this.initialized) {
      throw new Error('Messaging service not initialized');
    }
    
    try {
      // Get current location
      const location = await locationService.getCurrentLocation();
      if (!location) {
        throw new Error('Could not get current location');
      }
      
      const timestamp = new Date().toISOString();
      
      // Send to Firebase if online
      let firebaseSent = false;
      if (this.isOnline && firebaseService.isSignedIn()) {
        try {
          await firebaseService.saveUserLocation({
            ...location,
            message
          }, true);
          firebaseSent = true;
        } catch (error) {
          console.error('Error sending SOS via Firebase:', error);
        }
      }
      
      // Send via Bridgefy
      let bridgefySent = false;
      if (this.isOfflineMessagingEnabled) {
        try {
          bridgefySent = await bridgefyService.sendSOS(message);
        } catch (error) {
          console.error('Error sending SOS via Bridgefy:', error);
        }
      }
      
      return firebaseSent || bridgefySent;
    } catch (error) {
      console.error('Error sending SOS message:', error);
      throw error;
    }
  }

  /**
   * Get messages for a peer
   * @param {string} peerId - Peer ID
   * @param {number} limit - Maximum number of messages
   * @returns {Promise<Array>} Messages
   */
  async getMessages(peerId, limit = 50) {
    if (!this.initialized) {
      throw new Error('Messaging service not initialized');
    }
    
    try {
      // First, get messages from local database
      const localMessages = await databaseService.getMessagesByPeerId(peerId, limit);
      
      // If online, also get messages from Firebase
      let cloudMessages = [];
      if (this.isOnline && firebaseService.isSignedIn()) {
        try {
          cloudMessages = await firebaseService.getChatMessages(peerId, limit);
          
          // Convert to local format
          cloudMessages = cloudMessages.map(msg => ({
            messageId: msg.id,
            peerId: msg.receiverId === this.userId ? msg.senderId : msg.receiverId,
            senderId: msg.senderId,
            senderName: msg.senderName,
            type: msg.type,
            content: msg.content,
            timestamp: msg.timestamp,
            isDelivered: msg.isDelivered,
            isEmergency: msg.isEmergency,
            metadata: msg.metadata || { sentVia: 'firebase' }
          }));
          
          // Save cloud messages to local database
          for (const msg of cloudMessages) {
            await databaseService.saveMessage({
              ...msg,
              localUserId: this.userId,
            }, false); // Don't mark for sync as they came from the cloud
          }
        } catch (error) {
          console.error('Error getting cloud messages:', error);
        }
      }
      
      // Merge messages from both sources, remove duplicates, and sort by timestamp
      const allMessages = [...localMessages];
      
      // Add cloud messages that aren't in local messages
      cloudMessages.forEach(cloudMsg => {
        if (!allMessages.some(localMsg => localMsg.messageId === cloudMsg.messageId)) {
          allMessages.push(cloudMsg);
        }
      });
      
      // Sort by timestamp
      return allMessages.sort((a, b) => {
        const timeA = new Date(a.timestamp || a.created_at);
        const timeB = new Date(b.timestamp || b.created_at);
        return timeA - timeB;
      });
    } catch (error) {
      console.error('Error getting messages:', error);
      throw error;
    }
  }

  /**
   * Add a message listener
   * @param {Function} callback - Callback function for new messages
   * @returns {Function} Function to remove the listener
   */
  addMessageListener(callback) {
    if (typeof callback !== 'function') return () => {};
    
    this.messageListeners.push(callback);
    
    return () => {
      this.messageListeners = this.messageListeners.filter(cb => cb !== callback);
    };
  }

  /**
   * Get peers from both online and offline sources
   * @returns {Promise<Array>} Combined peers list
   */
  async getPeers() {
    if (!this.initialized) {
      throw new Error('Messaging service not initialized');
    }
    
    try {
      // Get local peers from database
      const localPeers = await databaseService.getAllPeers();
      
      // Get offline peers from Bridgefy
      const offlinePeers = bridgefyService.getAvailablePeers();
      
      // Get online users from Firebase if online
      let onlinePeers = [];
      if (this.isOnline && firebaseService.isSignedIn()) {
        try {
          // Get current location
          const location = await locationService.getCurrentLocation();
          if (location) {
            const nearbyHikers = await firebaseService.getNearbyHikers(location);
            onlinePeers = nearbyHikers.map(hiker => ({
              id: hiker.id,
              name: hiker.name,
              connectionState: hiker.isOnline ? 'connected' : 'disconnected',
              distance: hiker.distance,
              location: hiker.location,
              lastSeen: hiker.lastSeen,
              isEmergency: hiker.isEmergency,
              isOnline: hiker.isOnline,
              source: 'firebase'
            }));
          }
        } catch (error) {
          console.error('Error getting online peers:', error);
        }
      }
      
      // Combine and deduplicate peers
      const allPeers = [...localPeers];
      
      // Add Bridgefy peers that aren't already in the list
      offlinePeers.forEach(offlinePeer => {
        const existingIndex = allPeers.findIndex(p => p.id === offlinePeer.id);
        if (existingIndex >= 0) {
          // Update existing peer with Bridgefy info
          allPeers[existingIndex] = {
            ...allPeers[existingIndex],
            connectionState: offlinePeer.connectionState,
            name: offlinePeer.name || allPeers[existingIndex].name,
            source: 'bridgefy'
          };
        } else {
          // Add new peer
          allPeers.push({
            ...offlinePeer,
            source: 'bridgefy'
          });
        }
      });
      
      // Add Firebase peers that aren't already in the list
      onlinePeers.forEach(onlinePeer => {
        const existingIndex = allPeers.findIndex(p => 
          p.id === onlinePeer.id || 
          (p.firebase_uid && p.firebase_uid === onlinePeer.id)
        );
        
        if (existingIndex >= 0) {
          // Update existing peer with Firebase info
          allPeers[existingIndex] = {
            ...allPeers[existingIndex],
            firebase_uid: onlinePeer.id,
            name: onlinePeer.name || allPeers[existingIndex].name,
            connectionState: onlinePeer.connectionState,
            distance: onlinePeer.distance,
            location: onlinePeer.location,
            lastSeen: onlinePeer.lastSeen,
            isEmergency: onlinePeer.isEmergency,
            isOnline: onlinePeer.isOnline,
            source: 'firebase'
          };
        } else {
          // Add new peer
          allPeers.push({
            ...onlinePeer,
            firebase_uid: onlinePeer.id,
            source: 'firebase'
          });
        }
        
        // Always save Firebase peers to the database
        databaseService.savePeer({
          ...onlinePeer,
          id: onlinePeer.id,
          firebaseUid: onlinePeer.id,
          connectionState: onlinePeer.connectionState
        }).catch(console.error);
      });
      
      return allPeers.sort((a, b) => {
        // Sort by online status first
        if (a.isOnline && !b.isOnline) return -1;
        if (!a.isOnline && b.isOnline) return 1;
        
        // Then by connection state
        if (a.connectionState === 'connected' && b.connectionState !== 'connected') return -1;
        if (a.connectionState !== 'connected' && b.connectionState === 'connected') return 1;
        
        // Then by emergency status
        if (a.isEmergency && !b.isEmergency) return -1;
        if (!a.isEmergency && b.isEmergency) return 1;
        
        // Then by distance if available
        if (a.distance && b.distance) return a.distance - b.distance;
        
        // Finally by name
        return (a.name || '').localeCompare(b.name || '');
      });
    } catch (error) {
      console.error('Error getting peers:', error);
      throw error;
    }
  }

  /**
   * Connect to a peer
   * @param {Object} peer - Peer to connect to
   * @returns {Promise<boolean>} Success status
   */
  async connectToPeer(peer) {
    if (!this.initialized) {
      throw new Error('Messaging service not initialized');
    }
    
    // If it's a Firebase peer, no need to connect
    if (peer.source === 'firebase' || peer.firebase_uid) {
      return true;
    }
    
    // If it's a Bridgefy peer, connect via Bridgefy
    if (peer.source === 'bridgefy' || !peer.source) {
      try {
        return await bridgefyService.connectToPeer(peer.id);
      } catch (error) {
        console.error('Error connecting to peer:', error);
        return false;
      }
    }
    
    return false;
  }

  /**
   * Disconnect from a peer
   * @param {Object} peer - Peer to disconnect from
   * @returns {Promise<boolean>} Success status
   */
  async disconnectFromPeer(peer) {
    if (!this.initialized) {
      throw new Error('Messaging service not initialized');
    }
    
    // Firebase peers don't need disconnection
    if (peer.source === 'firebase') {
      return true;
    }
    
    // Disconnect from Bridgefy peer
    if (peer.source === 'bridgefy') {
      try {
        return await bridgefyService.disconnectFromPeer(peer.id);
      } catch (error) {
        console.error('Error disconnecting from peer:', error);
        return false;
      }
    }
    
    return false;
  }

  /**
   * Sync messages with the cloud
   * @returns {Promise<number>} Number of messages synced
   */
  async syncMessages() {
    if (!this.initialized || !this.isOnline || !firebaseService.isSignedIn()) {
      return 0;
    }
    
    return await firebaseService.syncMessagesToCloud();
  }
  
  /**
   * Get count of messages pending cloud sync
   * @returns {Promise<number>} Count of pending messages
   */
  async getPendingMessageCount() {
    if (!this.initialized) {
      return 0;
    }
    
    try {
      // Get count from database service
      const messages = await databaseService.getMessagesNeedingSync(999);
      return messages.length;
    } catch (error) {
      console.error('Error getting pending message count:', error);
      return 0;
    }
  }

  /**
   * Set up network monitoring
   * @private
   */
  _setupNetworkMonitoring() {
    // Check network status initially
    this._checkNetworkStatus();
    
    // Set up periodic network status checks
    setInterval(() => {
      this._checkNetworkStatus();
    }, 30000); // Every 30 seconds
    
    // Set up periodic sync when online
    setInterval(() => {
      if (this.isOnline) {
        this.syncMessages().catch(console.error);
      }
    }, 60000); // Every minute
  }

  /**
   * Check network status
   * @private
   */
  _checkNetworkStatus() {
    // Check if navigator.onLine is available
    if (typeof navigator !== 'undefined' && 'onLine' in navigator) {
      const wasOnline = this.isOnline;
      this.isOnline = navigator.onLine;
      
      // If status changed, handle it
      if (wasOnline !== this.isOnline) {
        this._handleNetworkStatusChange(this.isOnline);
      }
    }
  }

  /**
   * Handle network status change
   * @param {boolean} isOnline - Whether device is online
   * @private
   */
  _handleNetworkStatusChange(isOnline) {
    console.log(`Network status changed: ${isOnline ? 'online' : 'offline'}`);
    
    // Update Firebase online status if signed in
    if (firebaseService.isSignedIn()) {
      firebaseService.updateUserOnlineStatus(isOnline).catch(console.error);
    }
    
    // If came online, sync messages
    if (isOnline) {
      this.syncMessages().catch(console.error);
    }
  }

  /**
   * Handle Bridgefy message
   * @param {string} peerId - Sender peer ID
   * @param {Object} message - Message object
   * @private
   */
  async _handleBridgefyMessage(peerId, message) {
    try {
      // Prepare message for storage
      const formattedMessage = {
        messageId: message.messageId || `bridgefy_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        peerId,
        senderId: message.senderId,
        senderName: message.senderName || 'Unknown Hiker',
        localUserId: this.userId || bridgefyService.userId,
        type: message.type,
        content: message.content,
        timestamp: message.timestamp || new Date().toISOString(),
        isDelivered: true,
        isEmergency: message.isEmergency || message.type === MESSAGE_TYPES.SOS,
        metadata: {
          ...message.metadata,
          receivedVia: 'bridgefy'
        }
      };
      
      // Save to local database
      await databaseService.saveMessage(formattedMessage, this.isOnline);
      
      // Notify listeners
      this._notifyMessageListeners([formattedMessage]);
      
      // If we're online, sync this message to the cloud
      if (this.isOnline && firebaseService.isSignedIn()) {
        // Save to Firebase
        try {
          await firebaseService.saveMessage({
            peerId: message.senderId,
            type: message.type,
            content: message.content,
            timestamp: message.timestamp || new Date().toISOString(),
            isEmergency: message.isEmergency || message.type === MESSAGE_TYPES.SOS,
            metadata: {
              ...message.metadata,
              originalSource: 'bridgefy'
            }
          });
        } catch (error) {
          console.error('Error saving Bridgefy message to Firebase:', error);
        }
      }
    } catch (error) {
      console.error('Error handling Bridgefy message:', error);
    }
  }

  /**
   * Handle peer detected
   * @param {Object} peer - Detected peer
   * @private
   */
  async _handlePeerDetected(peer) {
    try {
      // Save peer to database
      await databaseService.savePeer(peer);
    } catch (error) {
      console.error('Error handling peer detected:', error);
    }
  }

  /**
   * Handle peer lost
   * @param {Object} peer - Lost peer
   * @private
   */
  async _handlePeerLost(peer) {
    // No special handling needed for now
  }

  /**
   * Handle peer connection state changed
   * @param {Object} peer - Peer with updated state
   * @private
   */
  async _handlePeerConnectionStateChanged(peer) {
    try {
      // Save updated peer to database
      await databaseService.savePeer(peer);
    } catch (error) {
      console.error('Error handling peer connection state changed:', error);
    }
  }

  /**
   * Notify message listeners
   * @param {Array} messages - New messages
   * @private
   */
  _notifyMessageListeners(messages) {
    if (!messages || messages.length === 0) return;
    
    this.messageListeners.forEach(callback => {
      try {
        callback(messages);
      } catch (error) {
        console.error('Error in message listener:', error);
      }
    });
  }
}

export default new MessagingService();