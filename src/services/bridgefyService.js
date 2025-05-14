import { Platform, NativeEventEmitter, NativeModules } from 'react-native';
import { requestBluetoothPermissions } from '../utils/permissions';
import locationService from './locationService';

// Message types
export const MESSAGE_TYPES = {
  TEXT: 'text',
  LOCATION: 'location',
  SOS: 'sos',
  STATUS: 'status',
};

// Simulated peer connection states
export const CONNECTION_STATE = {
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
};

/**
 * BridgefyService - Service for handling peer-to-peer communication
 * 
 * This implementation simulates Bridgefy SDK behavior. In a real app,
 * you would replace this with the actual Bridgefy SDK implementation.
 */
class BridgefyService {
  constructor() {
    this.apiKey = null;
    this.isInitialized = false;
    this.isStarted = false;
    this.userId = `user_${Math.floor(Math.random() * 1000000)}`;
    this.username = null;
    this.profileInfo = {};
    
    // Connected peers
    this.connectedPeers = new Map();
    this.availablePeers = new Map();
    
    // Callbacks
    this.onPeerDetectedCallbacks = [];
    this.onPeerLostCallbacks = [];
    this.onPeerConnectionStateChangedCallbacks = [];
    this.onMessageReceivedCallbacks = [];
    this.onErrorCallbacks = [];
    
    // Message storage
    this.messageHistory = new Map();
    
    // Simulate a native event emitter
    this.eventEmitter = null;
    if (NativeModules.BridgefyModule) {
      this.eventEmitter = new NativeEventEmitter(NativeModules.BridgefyModule);
    }
  }

  /**
   * Initialize the Bridgefy service with an API key
   * @param {string} apiKey - Bridgefy API key
   * @returns {Promise<boolean>} - Success status
   */
  async initialize(apiKey) {
    if (this.isInitialized) {
      console.log('Bridgefy already initialized');
      return true;
    }
    
    try {
      console.log(`Initializing Bridgefy with API key: ${apiKey}`);
      
      // Store the API key
      this.apiKey = apiKey;
      
      // Request Bluetooth permissions
      const hasPermission = await requestBluetoothPermissions();
      if (!hasPermission) {
        console.error('Bluetooth permissions not granted');
        return false;
      }
      
      // Simulate initialization success
      this.isInitialized = true;
      console.log('Bridgefy initialized successfully');
      
      return true;
    } catch (error) {
      console.error('Error initializing Bridgefy:', error);
      this._notifyError('initialization_error', error.message);
      return false;
    }
  }

  /**
   * Start the Bridgefy service
   * @param {Object} userInfo - User information for mesh network
   * @returns {Promise<boolean>} - Success status
   */
  async start(userInfo = {}) {
    if (!this.isInitialized) {
      console.error('Bridgefy not initialized');
      return false;
    }
    
    if (this.isStarted) {
      console.log('Bridgefy already started');
      return true;
    }
    
    try {
      console.log('Starting Bridgefy service...');
      
      // Save user info
      this.username = userInfo.username || `User ${this.userId.substring(5, 10)}`;
      this.profileInfo = {
        ...userInfo,
        userId: this.userId,
        username: this.username,
      };
      
      // Simulate starting the service
      this.isStarted = true;
      
      // Simulate peer discovery process
      this._simulatePeerDiscovery();
      
      console.log('Bridgefy service started successfully');
      return true;
    } catch (error) {
      console.error('Error starting Bridgefy:', error);
      this._notifyError('start_error', error.message);
      return false;
    }
  }

  /**
   * Stop the Bridgefy service
   * @returns {Promise<boolean>} - Success status
   */
  async stop() {
    if (!this.isStarted) {
      console.log('Bridgefy not started');
      return true;
    }
    
    try {
      console.log('Stopping Bridgefy service...');
      
      // Simulate stopping the service
      this.isStarted = false;
      
      // Clear peer lists
      this.connectedPeers.clear();
      this.availablePeers.clear();
      
      console.log('Bridgefy service stopped successfully');
      return true;
    } catch (error) {
      console.error('Error stopping Bridgefy:', error);
      this._notifyError('stop_error', error.message);
      return false;
    }
  }

  /**
   * Send a message to a specific peer
   * @param {string} peerId - Recipient peer ID
   * @param {Object} message - Message to send
   * @returns {Promise<boolean>} - Success status
   */
  async sendMessage(peerId, message) {
    if (!this.isStarted) {
      console.error('Bridgefy not started');
      return false;
    }
    
    if (!this.connectedPeers.has(peerId)) {
      console.error(`Peer ${peerId} not connected`);
      return false;
    }
    
    try {
      // Prepare message with metadata
      const messageWithMetadata = {
        ...message,
        senderId: this.userId,
        senderName: this.username,
        timestamp: new Date().toISOString(),
        messageId: `msg_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      };
      
      console.log(`Sending message to peer ${peerId}:`, messageWithMetadata);
      
      // In a real implementation, this would call the Bridgefy SDK
      // to send the message to the peer
      
      // Simulate message delivery delay
      setTimeout(() => {
        // Add to local message history
        this._addToMessageHistory(peerId, messageWithMetadata);
        
        // Simulate peer receiving the message (for demo only)
        this._simulateMessageDelivery(peerId, messageWithMetadata);
      }, 500);
      
      return true;
    } catch (error) {
      console.error(`Error sending message to peer ${peerId}:`, error);
      this._notifyError('send_message_error', error.message);
      return false;
    }
  }

  /**
   * Broadcast a message to all connected peers
   * @param {Object} message - Message to broadcast
   * @returns {Promise<boolean>} - Success status
   */
  async broadcastMessage(message) {
    if (!this.isStarted) {
      console.error('Bridgefy not started');
      return false;
    }
    
    if (this.connectedPeers.size === 0) {
      console.log('No connected peers to broadcast to');
      return false;
    }
    
    try {
      // Prepare message with metadata
      const messageWithMetadata = {
        ...message,
        senderId: this.userId,
        senderName: this.username,
        timestamp: new Date().toISOString(),
        messageId: `msg_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        isBroadcast: true,
      };
      
      console.log(`Broadcasting message to ${this.connectedPeers.size} peers:`, messageWithMetadata);
      
      // Send to all connected peers
      const peerIds = Array.from(this.connectedPeers.keys());
      for (const peerId of peerIds) {
        // Simulate message delivery delay with slight variation
        const delay = 500 + Math.random() * 500;
        setTimeout(() => {
          // Add to local message history
          this._addToMessageHistory(peerId, messageWithMetadata);
          
          // Simulate peer receiving the message (for demo only)
          this._simulateMessageDelivery(peerId, messageWithMetadata);
        }, delay);
      }
      
      return true;
    } catch (error) {
      console.error('Error broadcasting message:', error);
      this._notifyError('broadcast_message_error', error.message);
      return false;
    }
  }

  /**
   * Send current location to all connected peers
   * @param {boolean} isEmergency - Whether this is an emergency SOS broadcast
   * @returns {Promise<boolean>} - Success status
   */
  async sendLocationUpdate(isEmergency = false) {
    try {
      // Get current location
      const location = await locationService.getCurrentLocation();
      if (!location) {
        console.error('Could not get current location');
        return false;
      }
      
      // Prepare location message
      const message = {
        type: isEmergency ? MESSAGE_TYPES.SOS : MESSAGE_TYPES.LOCATION,
        content: {
          latitude: location.latitude,
          longitude: location.longitude,
          altitude: location.altitude,
          accuracy: location.accuracy,
          timestamp: location.timestamp,
        },
        isEmergency,
      };
      
      // Broadcast the location to all peers
      return await this.broadcastMessage(message);
    } catch (error) {
      console.error('Error sending location update:', error);
      this._notifyError('location_update_error', error.message);
      return false;
    }
  }

  /**
   * Send an SOS emergency message with current location
   * @param {string} message - Additional emergency message
   * @returns {Promise<boolean>} - Success status
   */
  async sendSOS(message = '') {
    try {
      // Get current location
      const location = await locationService.getCurrentLocation();
      
      // Prepare SOS message
      const sosMessage = {
        type: MESSAGE_TYPES.SOS,
        content: {
          message,
          latitude: location ? location.latitude : null,
          longitude: location ? location.longitude : null,
          timestamp: new Date().toISOString(),
        },
        isEmergency: true,
        priority: 'high',
      };
      
      // Broadcast the SOS to all peers
      return await this.broadcastMessage(sosMessage);
    } catch (error) {
      console.error('Error sending SOS:', error);
      this._notifyError('sos_error', error.message);
      return false;
    }
  }

  /**
   * Get all available peers (discovered but not necessarily connected)
   * @returns {Array} - List of available peers
   */
  getAvailablePeers() {
    return Array.from(this.availablePeers.values());
  }

  /**
   * Get all connected peers
   * @returns {Array} - List of connected peers
   */
  getConnectedPeers() {
    return Array.from(this.connectedPeers.values());
  }

  /**
   * Connect to a specific peer
   * @param {string} peerId - Peer ID to connect to
   * @returns {Promise<boolean>} - Success status
   */
  async connectToPeer(peerId) {
    if (!this.isStarted) {
      console.error('Bridgefy not started');
      return false;
    }
    
    if (!this.availablePeers.has(peerId)) {
      console.error(`Peer ${peerId} not available`);
      return false;
    }
    
    if (this.connectedPeers.has(peerId)) {
      console.log(`Already connected to peer ${peerId}`);
      return true;
    }
    
    try {
      console.log(`Connecting to peer ${peerId}...`);
      
      const peer = this.availablePeers.get(peerId);
      
      // Update connection state
      peer.connectionState = CONNECTION_STATE.CONNECTING;
      this._notifyPeerConnectionStateChanged(peer);
      
      // Simulate connection process
      return new Promise((resolve) => {
        setTimeout(() => {
          // Connect to peer
          peer.connectionState = CONNECTION_STATE.CONNECTED;
          this.connectedPeers.set(peerId, peer);
          this._notifyPeerConnectionStateChanged(peer);
          
          console.log(`Connected to peer ${peerId}`);
          resolve(true);
        }, 1000);
      });
    } catch (error) {
      console.error(`Error connecting to peer ${peerId}:`, error);
      this._notifyError('connect_peer_error', error.message);
      return false;
    }
  }

  /**
   * Disconnect from a specific peer
   * @param {string} peerId - Peer ID to disconnect from
   * @returns {Promise<boolean>} - Success status
   */
  async disconnectFromPeer(peerId) {
    if (!this.isStarted) {
      console.error('Bridgefy not started');
      return false;
    }
    
    if (!this.connectedPeers.has(peerId)) {
      console.log(`Not connected to peer ${peerId}`);
      return true;
    }
    
    try {
      console.log(`Disconnecting from peer ${peerId}...`);
      
      const peer = this.connectedPeers.get(peerId);
      
      // Update connection state
      peer.connectionState = CONNECTION_STATE.DISCONNECTED;
      this.connectedPeers.delete(peerId);
      this._notifyPeerConnectionStateChanged(peer);
      
      console.log(`Disconnected from peer ${peerId}`);
      return true;
    } catch (error) {
      console.error(`Error disconnecting from peer ${peerId}:`, error);
      this._notifyError('disconnect_peer_error', error.message);
      return false;
    }
  }

  /**
   * Get the message history for a specific peer
   * @param {string} peerId - Peer ID
   * @returns {Array} - Message history
   */
  getMessageHistory(peerId) {
    return this.messageHistory.get(peerId) || [];
  }

  /**
   * Get the full message history across all peers
   * @returns {Object} - Full message history, grouped by peer ID
   */
  getAllMessageHistory() {
    const history = {};
    this.messageHistory.forEach((messages, peerId) => {
      history[peerId] = messages;
    });
    return history;
  }

  /**
   * Register callback for peer detected event
   * @param {Function} callback - Callback function
   */
  onPeerDetected(callback) {
    if (typeof callback === 'function') {
      this.onPeerDetectedCallbacks.push(callback);
    }
  }

  /**
   * Register callback for peer lost event
   * @param {Function} callback - Callback function
   */
  onPeerLost(callback) {
    if (typeof callback === 'function') {
      this.onPeerLostCallbacks.push(callback);
    }
  }

  /**
   * Register callback for peer connection state changed event
   * @param {Function} callback - Callback function
   */
  onPeerConnectionStateChanged(callback) {
    if (typeof callback === 'function') {
      this.onPeerConnectionStateChangedCallbacks.push(callback);
    }
  }

  /**
   * Register callback for message received event
   * @param {Function} callback - Callback function
   */
  onMessageReceived(callback) {
    if (typeof callback === 'function') {
      this.onMessageReceivedCallbacks.push(callback);
    }
  }

  /**
   * Register callback for error event
   * @param {Function} callback - Callback function
   */
  onError(callback) {
    if (typeof callback === 'function') {
      this.onErrorCallbacks.push(callback);
    }
  }

  /**
   * Remove peer detected callback
   * @param {Function} callback - Callback function to remove
   */
  removePeerDetectedCallback(callback) {
    this.onPeerDetectedCallbacks = this.onPeerDetectedCallbacks.filter(
      cb => cb !== callback
    );
  }

  /**
   * Remove peer lost callback
   * @param {Function} callback - Callback function to remove
   */
  removePeerLostCallback(callback) {
    this.onPeerLostCallbacks = this.onPeerLostCallbacks.filter(
      cb => cb !== callback
    );
  }

  /**
   * Remove peer connection state changed callback
   * @param {Function} callback - Callback function to remove
   */
  removePeerConnectionStateChangedCallback(callback) {
    this.onPeerConnectionStateChangedCallbacks = this.onPeerConnectionStateChangedCallbacks.filter(
      cb => cb !== callback
    );
  }

  /**
   * Remove message received callback
   * @param {Function} callback - Callback function to remove
   */
  removeMessageReceivedCallback(callback) {
    this.onMessageReceivedCallbacks = this.onMessageReceivedCallbacks.filter(
      cb => cb !== callback
    );
  }

  /**
   * Remove error callback
   * @param {Function} callback - Callback function to remove
   */
  removeErrorCallback(callback) {
    this.onErrorCallbacks = this.onErrorCallbacks.filter(
      cb => cb !== callback
    );
  }

  /**
   * Add message to history
   * @param {string} peerId - Peer ID
   * @param {Object} message - Message object
   */
  _addToMessageHistory(peerId, message) {
    if (!this.messageHistory.has(peerId)) {
      this.messageHistory.set(peerId, []);
    }
    
    const history = this.messageHistory.get(peerId);
    history.push(message);
    
    // Limit history size
    if (history.length > 100) {
      history.shift(); // Remove oldest message
    }
  }

  /**
   * Notify all peer detected callbacks
   * @param {Object} peer - Detected peer
   */
  _notifyPeerDetected(peer) {
    this.onPeerDetectedCallbacks.forEach(callback => {
      callback(peer);
    });
  }

  /**
   * Notify all peer lost callbacks
   * @param {Object} peer - Lost peer
   */
  _notifyPeerLost(peer) {
    this.onPeerLostCallbacks.forEach(callback => {
      callback(peer);
    });
  }

  /**
   * Notify all peer connection state changed callbacks
   * @param {Object} peer - Peer with updated connection state
   */
  _notifyPeerConnectionStateChanged(peer) {
    this.onPeerConnectionStateChangedCallbacks.forEach(callback => {
      callback(peer);
    });
  }

  /**
   * Notify all message received callbacks
   * @param {string} peerId - Sender peer ID
   * @param {Object} message - Received message
   */
  _notifyMessageReceived(peerId, message) {
    this.onMessageReceivedCallbacks.forEach(callback => {
      callback(peerId, message);
    });
  }

  /**
   * Notify all error callbacks
   * @param {string} code - Error code
   * @param {string} message - Error message
   */
  _notifyError(code, message) {
    const error = { code, message };
    this.onErrorCallbacks.forEach(callback => {
      callback(error);
    });
  }

  /**
   * Simulate peer discovery process
   * This is used for development and testing only
   */
  _simulatePeerDiscovery() {
    if (!this.isStarted) return;
    
    console.log('Simulating peer discovery...');
    
    // Simulate discovery of 2-5 peers
    const peerCount = Math.floor(Math.random() * 4) + 2;
    const discoveryInterval = setInterval(() => {
      if (!this.isStarted) {
        clearInterval(discoveryInterval);
        return;
      }
      
      // Generate random peer
      const peerId = `peer_${Math.floor(Math.random() * 1000000)}`;
      const peer = {
        id: peerId,
        name: `Hiker ${Math.floor(Math.random() * 100)}`,
        connectionState: CONNECTION_STATE.DISCONNECTED,
        discoveredAt: new Date().toISOString(),
        profileInfo: {
          hikeExperience: ['beginner', 'intermediate', 'advanced'][Math.floor(Math.random() * 3)],
        },
      };
      
      // Add to available peers
      this.availablePeers.set(peerId, peer);
      
      // Notify listeners
      this._notifyPeerDetected(peer);
      
      console.log(`Discovered peer: ${peer.name} (${peerId})`);
      
      if (this.availablePeers.size >= peerCount) {
        clearInterval(discoveryInterval);
        
        // Simulate peer loss after some time
        setTimeout(() => {
          if (!this.isStarted) return;
          
          // Randomly select a peer to lose
          const peerIds = Array.from(this.availablePeers.keys());
          if (peerIds.length > 0) {
            const randomPeerId = peerIds[Math.floor(Math.random() * peerIds.length)];
            const lostPeer = this.availablePeers.get(randomPeerId);
            
            // Remove peer
            this.availablePeers.delete(randomPeerId);
            if (this.connectedPeers.has(randomPeerId)) {
              this.connectedPeers.delete(randomPeerId);
            }
            
            // Notify listeners
            this._notifyPeerLost(lostPeer);
            
            console.log(`Lost peer: ${lostPeer.name} (${randomPeerId})`);
          }
        }, 30000); // Simulate peer loss after 30 seconds
      }
    }, 5000); // Discover a new peer every 5 seconds
  }

  /**
   * Simulate message delivery (for demo purposes only)
   * @param {string} peerId - Recipient peer ID
   * @param {Object} message - Message to deliver
   */
  _simulateMessageDelivery(peerId, message) {
    if (!this.isStarted) return;
    
    // Simulate a response from the peer
    setTimeout(() => {
      if (!this.isStarted || !this.connectedPeers.has(peerId)) return;
      
      const peer = this.connectedPeers.get(peerId);
      
      // Generate a response based on the message type
      let response;
      switch (message.type) {
        case MESSAGE_TYPES.TEXT:
          response = {
            type: MESSAGE_TYPES.TEXT,
            content: `Thanks for your message: "${message.content}"`,
            senderId: peer.id,
            senderName: peer.name,
            timestamp: new Date().toISOString(),
            messageId: `msg_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
            isResponse: true,
          };
          break;
          
        case MESSAGE_TYPES.LOCATION:
          // Simulate nearby location
          const latOffset = (Math.random() * 0.01) - 0.005;
          const lonOffset = (Math.random() * 0.01) - 0.005;
          response = {
            type: MESSAGE_TYPES.LOCATION,
            content: {
              latitude: message.content.latitude + latOffset,
              longitude: message.content.longitude + lonOffset,
              timestamp: new Date().toISOString(),
            },
            senderId: peer.id,
            senderName: peer.name,
            timestamp: new Date().toISOString(),
            messageId: `msg_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
            isResponse: true,
          };
          break;
          
        case MESSAGE_TYPES.SOS:
          response = {
            type: MESSAGE_TYPES.STATUS,
            content: {
              status: 'received_sos',
              message: 'I received your SOS and am coming to help!',
              eta: '15 minutes',
            },
            senderId: peer.id,
            senderName: peer.name,
            timestamp: new Date().toISOString(),
            messageId: `msg_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
            isResponse: true,
            isEmergency: true,
          };
          break;
          
        default:
          response = {
            type: MESSAGE_TYPES.STATUS,
            content: {
              status: 'received',
              message: 'Message received',
            },
            senderId: peer.id,
            senderName: peer.name,
            timestamp: new Date().toISOString(),
            messageId: `msg_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
            isResponse: true,
          };
      }
      
      // Add to local message history
      this._addToMessageHistory(peer.id, response);
      
      // Notify listeners
      this._notifyMessageReceived(peer.id, response);
      
      console.log(`Received response from peer ${peer.name} (${peer.id}):`, response);
    }, 2000 + Math.random() * 3000); // Random delay between 2-5 seconds
  }
}

// Export as singleton
export default new BridgefyService();