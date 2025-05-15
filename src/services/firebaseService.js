import { Platform } from 'react-native';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged,
  signOut
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs,
  updateDoc,
  arrayUnion,
  arrayRemove,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  enableIndexedDbPersistence,
  CACHE_SIZE_UNLIMITED,
  initializeFirestore,
  persistentLocalCache,
  persistentSingleTabManager,
} from 'firebase/firestore';
import databaseService from './databaseService';

/**
 * Firebase service for handling authentication, Firestore, and cloud messaging
 */
class FirebaseService {
  constructor() {
    this.initialized = false;
    this.app = null;
    this.auth = null;
    this.firestore = null;
    this.userId = null;
    this.user = null;
    this.authUnsubscribe = null;
    this.onlineStatus = false;
    this.listeners = {};
  }

  /**
   * Initialize Firebase services
   * @param {Object} config - Firebase configuration
   * @returns {Promise<boolean>} Success status
   */
  async initialize(config) {
    if (this.initialized) {
      console.log('Firebase already initialized');
      return true;
    }

    try {
      // Initialize Firebase
      this.app = initializeApp(config);
      
      // Initialize Authentication
      this.auth = getAuth(this.app);
      
      // Initialize Firestore with offline persistence
      this.firestore = initializeFirestore(this.app, {
        localCache: persistentLocalCache({
          tabManager: persistentSingleTabManager({ forceOwnership: true }),
          cacheSizeBytes: CACHE_SIZE_UNLIMITED
        })
      });
      
      // Set up auth state listener
      this.authUnsubscribe = onAuthStateChanged(this.auth, (user) => {
        this.user = user;
        this.userId = user ? user.uid : null;
        
        if (user) {
          console.log('Firebase auth state changed:', user.uid);
          this.updateUserOnlineStatus(true);
        } else {
          console.log('User signed out');
        }
      });
      
      // Initialize database service for local storage
      await databaseService.init();
      
      this.initialized = true;
      console.log('Firebase initialized successfully');
      
      // Set up sync mechanism when online
      this._setupNetworkObserver();
      
      return true;
    } catch (error) {
      console.error('Firebase initialization error:', error);
      return false;
    }
  }

  /**
   * Clean up Firebase resources
   */
  cleanup() {
    if (this.authUnsubscribe) {
      this.authUnsubscribe();
      this.authUnsubscribe = null;
    }
    
    // Detach all Firestore listeners
    Object.values(this.listeners).forEach(listener => {
      if (typeof listener === 'function') {
        listener();
      }
    });
    
    this.listeners = {};
    
    this.initialized = false;
    this.user = null;
    this.userId = null;
  }

  /**
   * Check if user is signed in
   * @returns {boolean} Whether user is signed in
   */
  isSignedIn() {
    return !!this.user;
  }

  /**
   * Get current user
   * @returns {Object|null} Current user object or null
   */
  getCurrentUser() {
    return this.user;
  }

  /**
   * Get current user ID
   * @returns {string|null} Current user ID or null
   */
  getCurrentUserId() {
    return this.userId;
  }

  /**
   * Sign in anonymously
   * @returns {Promise<Object>} User object
   */
  async signInAnonymously() {
    if (!this.initialized) {
      throw new Error('Firebase not initialized');
    }
    
    try {
      const { user } = await signInAnonymously(this.auth);
      
      // Update user profile with a default name
      await updateProfile(user, {
        displayName: `Hiker${Math.floor(Math.random() * 10000)}`
      });
      
      // Create user document in Firestore
      await this._createUserDocument(user);
      
      return user;
    } catch (error) {
      console.error('Anonymous sign-in error:', error);
      throw error;
    }
  }

  /**
   * Sign up with email and password
   * @param {string} email - User email
   * @param {string} password - User password
   * @param {string} displayName - User display name
   * @returns {Promise<Object>} User object
   */
  async signUpWithEmail(email, password, displayName) {
    if (!this.initialized) {
      throw new Error('Firebase not initialized');
    }
    
    try {
      const { user } = await createUserWithEmailAndPassword(this.auth, email, password);
      
      // Update user profile with display name
      await updateProfile(user, { displayName });
      
      // Create user document in Firestore
      await this._createUserDocument(user);
      
      return user;
    } catch (error) {
      console.error('Email sign-up error:', error);
      throw error;
    }
  }

  /**
   * Sign in with email and password
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<Object>} User object
   */
  async signInWithEmail(email, password) {
    if (!this.initialized) {
      throw new Error('Firebase not initialized');
    }
    
    try {
      const { user } = await signInWithEmailAndPassword(this.auth, email, password);
      
      // Update user online status
      await this.updateUserOnlineStatus(true);
      
      return user;
    } catch (error) {
      console.error('Email sign-in error:', error);
      throw error;
    }
  }

  /**
   * Send password reset email
   * @param {string} email - User email
   * @returns {Promise<void>}
   */
  async sendPasswordReset(email) {
    if (!this.initialized) {
      throw new Error('Firebase not initialized');
    }
    
    try {
      await sendPasswordResetEmail(this.auth, email);
    } catch (error) {
      console.error('Password reset error:', error);
      throw error;
    }
  }

  /**
   * Sign out
   * @returns {Promise<void>}
   */
  async signOut() {
    if (!this.initialized) {
      throw new Error('Firebase not initialized');
    }
    
    try {
      // Update online status before signing out
      await this.updateUserOnlineStatus(false);
      
      await signOut(this.auth);
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  }

  /**
   * Update user profile
   * @param {Object} profile - Profile data to update
   * @returns {Promise<void>}
   */
  async updateUserProfile(profile) {
    if (!this.initialized || !this.user) {
      throw new Error('Not authenticated');
    }
    
    try {
      // Update user profile in auth
      if (profile.displayName) {
        await updateProfile(this.user, { displayName: profile.displayName });
      }
      
      // Update user document in Firestore
      const userDocRef = doc(this.firestore, 'users', this.userId);
      await updateDoc(userDocRef, {
        displayName: profile.displayName || this.user.displayName,
        bio: profile.bio || '',
        emergencyContact: profile.emergencyContact || '',
        shareLocation: profile.shareLocation !== undefined ? profile.shareLocation : true,
        isPublicProfile: profile.isPublicProfile !== undefined ? profile.isPublicProfile : true,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Update user profile error:', error);
      throw error;
    }
  }

  /**
   * Update user online status
   * @param {boolean} isOnline - Whether the user is online
   * @returns {Promise<void>}
   */
  async updateUserOnlineStatus(isOnline) {
    if (!this.initialized || !this.userId) {
      return;
    }
    
    this.onlineStatus = isOnline;
    
    try {
      const userDocRef = doc(this.firestore, 'users', this.userId);
      await updateDoc(userDocRef, {
        isOnline: isOnline,
        lastSeen: new Date().toISOString()
      });
    } catch (error) {
      console.error('Update online status error:', error);
    }
  }

  /**
   * Save user location to Firestore
   * @param {Object} location - Location data
   * @param {boolean} isEmergency - Whether this is an emergency location
   * @returns {Promise<void>}
   */
  async saveUserLocation(location, isEmergency = false) {
    if (!this.initialized || !this.userId) {
      throw new Error('Not authenticated');
    }
    
    try {
      const userDocRef = doc(this.firestore, 'users', this.userId);
      await updateDoc(userDocRef, {
        location: {
          latitude: location.latitude,
          longitude: location.longitude,
          altitude: location.altitude,
          accuracy: location.accuracy,
          timestamp: location.timestamp || new Date().toISOString(),
          isEmergency: isEmergency
        },
        lastLocationUpdate: new Date().toISOString()
      });
      
      // If emergency, create an SOS document
      if (isEmergency) {
        const sosDocRef = doc(collection(this.firestore, 'sos'));
        await setDoc(sosDocRef, {
          userId: this.userId,
          displayName: this.user.displayName,
          location: {
            latitude: location.latitude,
            longitude: location.longitude,
            altitude: location.altitude,
            accuracy: location.accuracy
          },
          timestamp: new Date().toISOString(),
          status: 'active',
          message: location.message || 'Emergency SOS'
        });
      }
    } catch (error) {
      console.error('Save user location error:', error);
      throw error;
    }
  }
  
  /**
   * Save an SOS event to Firestore
   * @param {Object} sosData - SOS event data
   * @returns {Promise<string>} SOS document ID
   */
  async saveSOSEvent(sosData) {
    if (!this.initialized || !this.userId) {
      throw new Error('Not authenticated');
    }
    
    try {
      // Create a new SOS document
      const sosCollectionRef = collection(this.firestore, 'sos');
      const sosDocRef = doc(sosCollectionRef);
      
      // Enhance the SOS data with event details
      const enhancedSosData = {
        ...sosData,
        createdBy: this.userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        notifications: {
          sent: false,
          sentAt: null,
          recipients: []
        }
      };
      
      // Save the SOS event to Firestore
      await setDoc(sosDocRef, enhancedSosData);
      
      // Also update user's emergency status
      const userDocRef = doc(this.firestore, 'users', this.userId);
      await updateDoc(userDocRef, {
        emergencyStatus: {
          isInEmergency: true,
          emergencyTime: new Date().toISOString(),
          sosDocId: sosDocRef.id
        }
      });
      
      console.log('SOS event saved to Firestore:', sosDocRef.id);
      return sosDocRef.id;
    } catch (error) {
      console.error('Error saving SOS event:', error);
      throw error;
    }
  }

  /**
   * Get user data
   * @param {string} userId - User ID to fetch
   * @returns {Promise<Object|null>} User data
   */
  async getUserData(userId) {
    if (!this.initialized) {
      throw new Error('Firebase not initialized');
    }
    
    try {
      const userDocRef = doc(this.firestore, 'users', userId);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        return userDoc.data();
      } else {
        return null;
      }
    } catch (error) {
      console.error('Get user data error:', error);
      throw error;
    }
  }

  /**
   * Get nearby hikers based on location
   * @param {Object} location - Current location
   * @param {number} radiusKm - Search radius in kilometers
   * @returns {Promise<Array>} Nearby hikers
   */
  async getNearbyHikers(location, radiusKm = 10) {
    if (!this.initialized) {
      throw new Error('Firebase not initialized');
    }
    
    try {
      // Get all users with location data
      // In a production app, you would use GeoFirestore or a similar solution for efficient geoqueries
      const usersRef = collection(this.firestore, 'users');
      const querySnapshot = await getDocs(usersRef);
      
      const nearbyHikers = [];
      const currentUserId = this.userId;
      const maxDistanceMeters = radiusKm * 1000;
      
      querySnapshot.forEach(doc => {
        const userData = doc.data();
        
        // Skip current user and users without location
        if (doc.id === currentUserId || !userData.location) {
          return;
        }
        
        // Skip users who don't share location unless they have an active emergency
        if (!userData.shareLocation && !userData.location.isEmergency) {
          return;
        }
        
        // Calculate distance
        const distance = this._calculateDistance(
          location.latitude,
          location.longitude,
          userData.location.latitude,
          userData.location.longitude
        );
        
        // Add to result if within range
        if (distance <= maxDistanceMeters) {
          nearbyHikers.push({
            id: doc.id,
            name: userData.displayName,
            distance: distance,
            location: userData.location,
            isOnline: userData.isOnline,
            lastSeen: userData.lastSeen,
            isEmergency: userData.location.isEmergency
          });
        }
      });
      
      // Sort by distance
      return nearbyHikers.sort((a, b) => a.distance - b.distance);
    } catch (error) {
      console.error('Get nearby hikers error:', error);
      throw error;
    }
  }

  /**
   * Save message to Firestore
   * @param {Object} message - Message data
   * @returns {Promise<string>} Message ID
   */
  async saveMessage(message) {
    if (!this.initialized || !this.userId) {
      throw new Error('Not authenticated');
    }
    
    try {
      // Create chat document if it doesn't exist
      await this._ensureChatExists(message.peerId);
      
      // Create message document
      const messagesRef = collection(this.firestore, 'chats', this._getChatId(message.peerId), 'messages');
      const messageDoc = doc(messagesRef);
      const messageId = messageDoc.id;
      
      // Prepare message data
      const messageData = {
        id: messageId,
        senderId: this.userId,
        senderName: this.user.displayName,
        receiverId: message.peerId,
        type: message.type,
        content: message.content,
        timestamp: new Date().toISOString(),
        isDelivered: false,
        isRead: false,
        isEmergency: message.isEmergency || message.type === 'sos',
        metadata: message.metadata || {}
      };
      
      // Save to Firestore
      await setDoc(messageDoc, messageData);
      
      // Update chat document with last message
      const chatRef = doc(this.firestore, 'chats', this._getChatId(message.peerId));
      await updateDoc(chatRef, {
        lastMessage: {
          text: this._getMessagePreview(message),
          type: message.type,
          timestamp: messageData.timestamp,
          isEmergency: messageData.isEmergency
        },
        updatedAt: messageData.timestamp
      });
      
      return messageId;
    } catch (error) {
      console.error('Save message error:', error);
      throw error;
    }
  }

  /**
   * Mark message as delivered
   * @param {string} chatId - Chat ID
   * @param {string} messageId - Message ID
   * @returns {Promise<void>}
   */
  async markMessageDelivered(chatId, messageId) {
    if (!this.initialized || !this.userId) {
      throw new Error('Not authenticated');
    }
    
    try {
      const messageRef = doc(this.firestore, 'chats', chatId, 'messages', messageId);
      await updateDoc(messageRef, {
        isDelivered: true
      });
    } catch (error) {
      console.error('Mark message as delivered error:', error);
      throw error;
    }
  }

  /**
   * Mark message as read
   * @param {string} chatId - Chat ID
   * @param {string} messageId - Message ID
   * @returns {Promise<void>}
   */
  async markMessageRead(chatId, messageId) {
    if (!this.initialized || !this.userId) {
      throw new Error('Not authenticated');
    }
    
    try {
      const messageRef = doc(this.firestore, 'chats', chatId, 'messages', messageId);
      await updateDoc(messageRef, {
        isRead: true
      });
    } catch (error) {
      console.error('Mark message as read error:', error);
      throw error;
    }
  }

  /**
   * Get chat messages
   * @param {string} peerId - Peer ID
   * @param {number} limit - Maximum number of messages
   * @returns {Promise<Array>} Chat messages
   */
  async getChatMessages(peerId, limit = 50) {
    if (!this.initialized || !this.userId) {
      throw new Error('Not authenticated');
    }
    
    try {
      const chatId = this._getChatId(peerId);
      const messagesRef = collection(this.firestore, 'chats', chatId, 'messages');
      const messagesQuery = query(
        messagesRef,
        orderBy('timestamp', 'desc'),
        limit(limit)
      );
      const querySnapshot = await getDocs(messagesQuery);
      
      const messages = [];
      querySnapshot.forEach(doc => {
        messages.push({
          ...doc.data(),
          id: doc.id
        });
      });
      
      return messages.sort((a, b) => 
        new Date(a.timestamp) - new Date(b.timestamp)
      );
    } catch (error) {
      console.error('Get chat messages error:', error);
      throw error;
    }
  }

  /**
   * Listen to chat messages
   * @param {string} peerId - Peer ID
   * @param {Function} callback - Callback function for new messages
   * @returns {Function} Unsubscribe function
   */
  listenToChatMessages(peerId, callback) {
    if (!this.initialized || !this.userId) {
      throw new Error('Not authenticated');
    }
    
    try {
      const chatId = this._getChatId(peerId);
      const listenerId = `chat_${chatId}`;
      
      // Remove existing listener if any
      this._removeListener(listenerId);
      
      const messagesRef = collection(this.firestore, 'chats', chatId, 'messages');
      const messagesQuery = query(
        messagesRef,
        orderBy('timestamp', 'desc'),
        limit(50)
      );
      
      const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
        const messages = [];
        snapshot.docChanges().forEach(change => {
          if (change.type === 'added' || change.type === 'modified') {
            const message = change.doc.data();
            messages.push({
              ...message,
              id: change.doc.id
            });
            
            // Mark messages from the peer as delivered
            if (message.senderId === peerId && !message.isDelivered) {
              this.markMessageDelivered(chatId, change.doc.id);
            }
          }
        });
        
        if (messages.length > 0) {
          // Sort by timestamp
          messages.sort((a, b) => 
            new Date(a.timestamp) - new Date(b.timestamp)
          );
          
          callback(messages);
        }
      });
      
      // Save the listener for cleanup
      this.listeners[listenerId] = unsubscribe;
      
      return unsubscribe;
    } catch (error) {
      console.error('Listen to chat messages error:', error);
      throw error;
    }
  }

  /**
   * Get user chats
   * @returns {Promise<Array>} User chats
   */
  async getUserChats() {
    if (!this.initialized || !this.userId) {
      throw new Error('Not authenticated');
    }
    
    try {
      const chatsRef = collection(this.firestore, 'chats');
      const q = query(
        chatsRef,
        where('participants', 'array-contains', this.userId),
        orderBy('updatedAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      
      const chats = [];
      const userPromises = [];
      
      querySnapshot.forEach(doc => {
        const chatData = doc.data();
        const otherUserId = chatData.participants.find(id => id !== this.userId);
        
        chats.push({
          id: doc.id,
          ...chatData,
          otherUserId
        });
        
        // Get other user data
        userPromises.push(this.getUserData(otherUserId));
      });
      
      // Wait for all user data to be fetched
      const users = await Promise.all(userPromises);
      
      // Combine chat data with user data
      return chats.map((chat, index) => ({
        ...chat,
        otherUser: users[index]
      }));
    } catch (error) {
      console.error('Get user chats error:', error);
      throw error;
    }
  }

  /**
   * Listen to user chats
   * @param {Function} callback - Callback function for chat updates
   * @returns {Function} Unsubscribe function
   */
  listenToUserChats(callback) {
    if (!this.initialized || !this.userId) {
      throw new Error('Not authenticated');
    }
    
    try {
      const listenerId = 'user_chats';
      
      // Remove existing listener if any
      this._removeListener(listenerId);
      
      const chatsRef = collection(this.firestore, 'chats');
      const q = query(
        chatsRef,
        where('participants', 'array-contains', this.userId),
        orderBy('updatedAt', 'desc')
      );
      
      const unsubscribe = onSnapshot(q, async (snapshot) => {
        const chats = [];
        const userPromises = [];
        
        snapshot.docs.forEach(doc => {
          const chatData = doc.data();
          const otherUserId = chatData.participants.find(id => id !== this.userId);
          
          chats.push({
            id: doc.id,
            ...chatData,
            otherUserId
          });
          
          // Get other user data
          userPromises.push(this.getUserData(otherUserId));
        });
        
        // Wait for all user data to be fetched
        const users = await Promise.all(userPromises);
        
        // Combine chat data with user data
        const chatsWithUsers = chats.map((chat, index) => ({
          ...chat,
          otherUser: users[index]
        }));
        
        callback(chatsWithUsers);
      });
      
      // Save the listener for cleanup
      this.listeners[listenerId] = unsubscribe;
      
      return unsubscribe;
    } catch (error) {
      console.error('Listen to user chats error:', error);
      throw error;
    }
  }

  /**
   * Sync messages from local database to Firestore
   * @returns {Promise<number>} Number of messages synced
   */
  async syncMessagesToCloud() {
    if (!this.initialized || !this.userId || !this.onlineStatus) {
      return 0;
    }
    
    try {
      // Get messages that need syncing
      const messages = await databaseService.getMessagesNeedingSync();
      if (messages.length === 0) {
        return 0;
      }
      
      console.log(`Syncing ${messages.length} messages to cloud`);
      let syncedCount = 0;
      
      for (const message of messages) {
        try {
          // Update sync status to 'syncing'
          await databaseService.updateMessageSyncStatus(message.id, 'syncing');
          
          // Convert local message format to Firestore format
          const cloudMessage = {
            peerId: message.peer_id,
            type: message.type,
            content: message.content,
            timestamp: message.timestamp,
            isEmergency: message.is_emergency,
            metadata: message.metadata || {}
          };
          
          // If it's a location message, add location data
          if (message.type === 'location' || message.type === 'sos') {
            if (message.latitude && message.longitude) {
              cloudMessage.content = {
                ...(typeof cloudMessage.content === 'object' ? cloudMessage.content : {}),
                latitude: message.latitude,
                longitude: message.longitude,
                altitude: message.altitude,
                accuracy: message.accuracy,
                timestamp: message.location_timestamp || message.timestamp
              };
              
              if (message.type === 'sos' && message.sos_message) {
                cloudMessage.content.message = message.sos_message;
              }
            }
          }
          
          // Save to Firestore
          await this.saveMessage(cloudMessage);
          
          // Mark as synced
          await databaseService.markMessageForSync(message.id, false);
          await databaseService.updateMessageSyncStatus(message.id, 'synced');
          
          syncedCount++;
        } catch (error) {
          console.error(`Error syncing message ${message.id}:`, error);
          await databaseService.updateMessageSyncStatus(message.id, 'failed');
        }
      }
      
      return syncedCount;
    } catch (error) {
      console.error('Sync messages to cloud error:', error);
      return 0;
    }
  }

  /**
   * Create a user document in Firestore
   * @param {Object} user - User object
   * @returns {Promise<void>}
   * @private
   */
  async _createUserDocument(user) {
    if (!user) return;
    
    const userDocRef = doc(this.firestore, 'users', user.uid);
    const userDoc = await getDoc(userDocRef);
    
    if (!userDoc.exists()) {
      await setDoc(userDocRef, {
        displayName: user.displayName || 'Anonymous Hiker',
        email: user.email || null,
        isAnonymous: user.isAnonymous,
        isOnline: true,
        lastSeen: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        shareLocation: true,
        isPublicProfile: true,
        bio: '',
        emergencyContact: '',
        deviceTokens: []
      });
    }
  }

  /**
   * Ensure a chat document exists
   * @param {string} otherUserId - Other user ID
   * @returns {Promise<string>} Chat ID
   * @private
   */
  async _ensureChatExists(otherUserId) {
    const chatId = this._getChatId(otherUserId);
    const chatRef = doc(this.firestore, 'chats', chatId);
    const chatDoc = await getDoc(chatRef);
    
    if (!chatDoc.exists()) {
      await setDoc(chatRef, {
        participants: [this.userId, otherUserId],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastMessage: {
          text: 'Start chatting',
          timestamp: new Date().toISOString(),
          type: 'system',
          isEmergency: false
        }
      });
    }
    
    return chatId;
  }

  /**
   * Get chat ID from user IDs
   * @param {string} otherUserId - Other user ID
   * @returns {string} Chat ID
   * @private
   */
  _getChatId(otherUserId) {
    // Sort IDs to ensure consistent chat ID
    const sortedIds = [this.userId, otherUserId].sort();
    return `${sortedIds[0]}_${sortedIds[1]}`;
  }

  /**
   * Get message preview text
   * @param {Object} message - Message object
   * @returns {string} Message preview
   * @private
   */
  _getMessagePreview(message) {
    switch (message.type) {
      case 'text':
        return typeof message.content === 'string' ? message.content : JSON.stringify(message.content);
      
      case 'location':
        return 'Shared a location';
      
      case 'sos':
        return '🆘 EMERGENCY SOS';
      
      default:
        return 'New message';
    }
  }

  /**
   * Calculate distance between two coordinates in meters
   * @param {number} lat1 - Latitude 1
   * @param {number} lon1 - Longitude 1
   * @param {number} lat2 - Latitude 2
   * @param {number} lon2 - Longitude 2
   * @returns {number} Distance in meters
   * @private
   */
  _calculateDistance(lat1, lon1, lat2, lon2) {
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

  /**
   * Set up network observer to sync messages when online
   * @private
   */
  _setupNetworkObserver() {
    // Sync messages periodically when online
    const syncInterval = setInterval(async () => {
      if (this.onlineStatus && this.userId) {
        await this.syncMessagesToCloud();
      }
    }, 30000); // Every 30 seconds
    
    // Clean up on app close/refresh
    window.addEventListener('beforeunload', () => {
      clearInterval(syncInterval);
      this.updateUserOnlineStatus(false).catch(console.error);
    });
  }

  /**
   * Remove listener by ID
   * @param {string} listenerId - Listener ID
   * @private
   */
  _removeListener(listenerId) {
    if (this.listeners[listenerId]) {
      this.listeners[listenerId]();
      delete this.listeners[listenerId];
    }
  }
}

export default new FirebaseService();