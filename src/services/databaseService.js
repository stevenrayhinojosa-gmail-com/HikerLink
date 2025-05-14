import SQLite from 'react-native-sqlite-storage';
import { Platform } from 'react-native';

// Enable SQLite Promises
SQLite.enablePromise(true);

/**
 * Database service for handling local SQLite storage
 * Used for storing offline messages and managing sync status
 */
class DatabaseService {
  constructor() {
    this.database = null;
    this.initialized = false;
  }

  /**
   * Initialize the database
   * @returns {Promise<boolean>} Success status
   */
  async init() {
    if (this.initialized) {
      return true;
    }

    try {
      // Open or create database
      this.database = await SQLite.openDatabase({
        name: 'hikerlink.db',
        location: 'default',
      });

      // Create tables if they don't exist
      await this.createTables();

      this.initialized = true;
      console.log('Database initialized successfully');
      return true;
    } catch (error) {
      console.error('Database initialization error:', error);
      return false;
    }
  }

  /**
   * Create database tables if they don't exist
   * @returns {Promise<void>}
   */
  async createTables() {
    if (!this.database) {
      throw new Error('Database not initialized');
    }

    // Messages table
    await this.database.executeSql(`
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        peer_id TEXT NOT NULL,
        sender_id TEXT NOT NULL,
        sender_name TEXT,
        type TEXT NOT NULL,
        content TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        is_outgoing INTEGER NOT NULL,
        is_emergency INTEGER NOT NULL DEFAULT 0,
        is_delivered INTEGER NOT NULL DEFAULT 0,
        needs_sync INTEGER NOT NULL DEFAULT 0,
        sync_status TEXT DEFAULT 'pending',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);

    // Message contents table for storing different message types in structured format
    await this.database.executeSql(`
      CREATE TABLE IF NOT EXISTS message_contents (
        message_id TEXT PRIMARY KEY,
        text_content TEXT,
        latitude REAL,
        longitude REAL,
        altitude REAL,
        accuracy REAL,
        location_timestamp TEXT,
        sos_message TEXT,
        metadata TEXT,
        FOREIGN KEY (message_id) REFERENCES messages (id) ON DELETE CASCADE
      )
    `);

    // Peers table for storing information about discovered peers
    await this.database.executeSql(`
      CREATE TABLE IF NOT EXISTS peers (
        id TEXT PRIMARY KEY,
        name TEXT,
        connection_state TEXT NOT NULL,
        last_seen TEXT NOT NULL,
        metadata TEXT,
        firebase_uid TEXT,
        cloud_messaging_token TEXT
      )
    `);

    // Create indexes for better query performance
    await this.database.executeSql('CREATE INDEX IF NOT EXISTS idx_messages_peer_id ON messages (peer_id)');
    await this.database.executeSql('CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages (timestamp)');
    await this.database.executeSql('CREATE INDEX IF NOT EXISTS idx_messages_needs_sync ON messages (needs_sync)');
    await this.database.executeSql('CREATE INDEX IF NOT EXISTS idx_peers_last_seen ON peers (last_seen)');
  }

  /**
   * Close the database connection
   * @returns {Promise<void>}
   */
  async close() {
    if (this.database) {
      await this.database.close();
      this.database = null;
      this.initialized = false;
      console.log('Database connection closed');
    }
  }

  /**
   * Save a message to the database
   * @param {Object} message - Message object to save
   * @param {boolean} needsSync - Whether the message needs to be synced to cloud
   * @returns {Promise<string>} Message ID
   */
  async saveMessage(message, needsSync = true) {
    if (!this.database) {
      await this.init();
    }

    const now = new Date().toISOString();
    const isEmergency = message.isEmergency || message.type === 'sos' ? 1 : 0;
    const isOutgoing = message.senderId === message.localUserId ? 1 : 0;
    
    // Extract content as string for the main messages table
    let contentStr = '';
    if (typeof message.content === 'string') {
      contentStr = message.content;
    } else {
      contentStr = JSON.stringify(message.content);
    }

    // Save to messages table
    await this.database.executeSql(
      `INSERT OR REPLACE INTO messages (
        id, peer_id, sender_id, sender_name, type, content, timestamp, 
        is_outgoing, is_emergency, is_delivered, needs_sync, sync_status, 
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        message.messageId,
        message.peerId,
        message.senderId,
        message.senderName || '',
        message.type,
        contentStr,
        message.timestamp,
        isOutgoing,
        isEmergency,
        message.isDelivered ? 1 : 0,
        needsSync ? 1 : 0,
        'pending',
        now,
        now
      ]
    );

    // Save detailed content to message_contents table
    if (message.type === 'location' || message.type === 'sos') {
      const content = typeof message.content === 'string' 
        ? JSON.parse(message.content) 
        : message.content;
      
      await this.database.executeSql(
        `INSERT OR REPLACE INTO message_contents (
          message_id, text_content, latitude, longitude, altitude, accuracy, 
          location_timestamp, sos_message, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          message.messageId,
          message.type === 'sos' ? (content.message || '') : null,
          content.latitude || null,
          content.longitude || null,
          content.altitude || null,
          content.accuracy || null,
          content.timestamp || null,
          message.type === 'sos' ? (content.message || '') : null,
          message.metadata ? JSON.stringify(message.metadata) : null
        ]
      );
    } else if (message.type === 'text') {
      await this.database.executeSql(
        `INSERT OR REPLACE INTO message_contents (
          message_id, text_content, metadata
        ) VALUES (?, ?, ?)`,
        [
          message.messageId,
          typeof message.content === 'string' ? message.content : JSON.stringify(message.content),
          message.metadata ? JSON.stringify(message.metadata) : null
        ]
      );
    }

    return message.messageId;
  }

  /**
   * Mark a message as delivered
   * @param {string} messageId - Message ID
   * @returns {Promise<boolean>} Success status
   */
  async markMessageDelivered(messageId) {
    if (!this.database) {
      await this.init();
    }

    try {
      await this.database.executeSql(
        'UPDATE messages SET is_delivered = 1, updated_at = ? WHERE id = ?',
        [new Date().toISOString(), messageId]
      );
      return true;
    } catch (error) {
      console.error('Error marking message as delivered:', error);
      return false;
    }
  }

  /**
   * Mark a message for cloud sync
   * @param {string} messageId - Message ID
   * @param {boolean} needsSync - Whether the message needs sync
   * @returns {Promise<boolean>} Success status
   */
  async markMessageForSync(messageId, needsSync = true) {
    if (!this.database) {
      await this.init();
    }

    try {
      await this.database.executeSql(
        'UPDATE messages SET needs_sync = ?, sync_status = ?, updated_at = ? WHERE id = ?',
        [needsSync ? 1 : 0, needsSync ? 'pending' : 'synced', new Date().toISOString(), messageId]
      );
      return true;
    } catch (error) {
      console.error('Error marking message for sync:', error);
      return false;
    }
  }

  /**
   * Update message sync status
   * @param {string} messageId - Message ID
   * @param {string} status - Sync status ('pending', 'syncing', 'synced', 'failed')
   * @returns {Promise<boolean>} Success status
   */
  async updateMessageSyncStatus(messageId, status) {
    if (!this.database) {
      await this.init();
    }

    try {
      await this.database.executeSql(
        'UPDATE messages SET sync_status = ?, updated_at = ? WHERE id = ?',
        [status, new Date().toISOString(), messageId]
      );
      return true;
    } catch (error) {
      console.error('Error updating message sync status:', error);
      return false;
    }
  }

  /**
   * Get messages that need to be synced to the cloud
   * @param {number} limit - Maximum number of messages to retrieve
   * @returns {Promise<Array>} Messages that need syncing
   */
  async getMessagesNeedingSync(limit = 50) {
    if (!this.database) {
      await this.init();
    }

    try {
      const [results] = await this.database.executeSql(
        `SELECT m.*, mc.latitude, mc.longitude, mc.altitude, mc.accuracy, 
          mc.location_timestamp, mc.sos_message, mc.text_content, mc.metadata
         FROM messages m
         LEFT JOIN message_contents mc ON m.id = mc.message_id
         WHERE m.needs_sync = 1 AND m.sync_status = 'pending'
         ORDER BY m.timestamp ASC
         LIMIT ?`,
        [limit]
      );

      const messages = [];
      for (let i = 0; i < results.rows.length; i++) {
        const message = results.rows.item(i);
        
        // Convert SQLite boolean (0/1) to JavaScript boolean
        message.is_outgoing = !!message.is_outgoing;
        message.is_emergency = !!message.is_emergency;
        message.is_delivered = !!message.is_delivered;
        message.needs_sync = !!message.needs_sync;

        // Parse content if it's JSON
        try {
          message.content = JSON.parse(message.content);
        } catch (e) {
          // Keep as string if it's not valid JSON
        }

        // Parse metadata if available
        if (message.metadata) {
          try {
            message.metadata = JSON.parse(message.metadata);
          } catch (e) {
            message.metadata = null;
          }
        }

        messages.push(message);
      }

      return messages;
    } catch (error) {
      console.error('Error getting messages that need sync:', error);
      return [];
    }
  }

  /**
   * Get messages by peer ID
   * @param {string} peerId - Peer ID
   * @param {number} limit - Maximum number of messages to retrieve
   * @param {number} offset - Offset for pagination
   * @returns {Promise<Array>} Messages from/to the specified peer
   */
  async getMessagesByPeerId(peerId, limit = 50, offset = 0) {
    if (!this.database) {
      await this.init();
    }

    try {
      const [results] = await this.database.executeSql(
        `SELECT m.*, mc.latitude, mc.longitude, mc.altitude, mc.accuracy, 
          mc.location_timestamp, mc.sos_message, mc.text_content, mc.metadata
         FROM messages m
         LEFT JOIN message_contents mc ON m.id = mc.message_id
         WHERE m.peer_id = ?
         ORDER BY m.timestamp DESC
         LIMIT ? OFFSET ?`,
        [peerId, limit, offset]
      );

      const messages = [];
      for (let i = 0; i < results.rows.length; i++) {
        const message = results.rows.item(i);
        
        // Convert SQLite boolean (0/1) to JavaScript boolean
        message.is_outgoing = !!message.is_outgoing;
        message.is_emergency = !!message.is_emergency;
        message.is_delivered = !!message.is_delivered;
        message.needs_sync = !!message.needs_sync;

        // Parse content if it's JSON
        try {
          message.content = JSON.parse(message.content);
        } catch (e) {
          // Keep as string if it's not valid JSON
        }

        // Parse metadata if available
        if (message.metadata) {
          try {
            message.metadata = JSON.parse(message.metadata);
          } catch (e) {
            message.metadata = null;
          }
        }

        messages.push(message);
      }

      return messages;
    } catch (error) {
      console.error('Error getting messages by peer ID:', error);
      return [];
    }
  }

  /**
   * Save peer information to database
   * @param {Object} peer - Peer object
   * @returns {Promise<boolean>} Success status
   */
  async savePeer(peer) {
    if (!this.database) {
      await this.init();
    }

    try {
      const now = new Date().toISOString();
      const metadata = peer.profileInfo ? JSON.stringify(peer.profileInfo) : null;

      await this.database.executeSql(
        `INSERT OR REPLACE INTO peers (
          id, name, connection_state, last_seen, metadata, firebase_uid, cloud_messaging_token
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          peer.id,
          peer.name || '',
          peer.connectionState || 'disconnected',
          now,
          metadata,
          peer.firebaseUid || null,
          peer.cloudMessagingToken || null
        ]
      );
      return true;
    } catch (error) {
      console.error('Error saving peer:', error);
      return false;
    }
  }

  /**
   * Update peer firebase UID
   * @param {string} peerId - Peer ID
   * @param {string} firebaseUid - Firebase UID
   * @returns {Promise<boolean>} Success status
   */
  async updatePeerFirebaseUid(peerId, firebaseUid) {
    if (!this.database) {
      await this.init();
    }

    try {
      await this.database.executeSql(
        'UPDATE peers SET firebase_uid = ?, last_seen = ? WHERE id = ?',
        [firebaseUid, new Date().toISOString(), peerId]
      );
      return true;
    } catch (error) {
      console.error('Error updating peer Firebase UID:', error);
      return false;
    }
  }

  /**
   * Update peer cloud messaging token
   * @param {string} peerId - Peer ID
   * @param {string} token - Cloud messaging token
   * @returns {Promise<boolean>} Success status
   */
  async updatePeerCloudMessagingToken(peerId, token) {
    if (!this.database) {
      await this.init();
    }

    try {
      await this.database.executeSql(
        'UPDATE peers SET cloud_messaging_token = ?, last_seen = ? WHERE id = ?',
        [token, new Date().toISOString(), peerId]
      );
      return true;
    } catch (error) {
      console.error('Error updating peer cloud messaging token:', error);
      return false;
    }
  }

  /**
   * Get all peers
   * @returns {Promise<Array>} All peers
   */
  async getAllPeers() {
    if (!this.database) {
      await this.init();
    }

    try {
      const [results] = await this.database.executeSql(
        'SELECT * FROM peers ORDER BY last_seen DESC'
      );

      const peers = [];
      for (let i = 0; i < results.rows.length; i++) {
        const peer = results.rows.item(i);
        
        // Parse metadata if available
        if (peer.metadata) {
          try {
            peer.profileInfo = JSON.parse(peer.metadata);
          } catch (e) {
            peer.profileInfo = null;
          }
        }

        peers.push(peer);
      }

      return peers;
    } catch (error) {
      console.error('Error getting all peers:', error);
      return [];
    }
  }

  /**
   * Get emergency messages that need attention
   * @returns {Promise<Array>} Emergency messages
   */
  async getEmergencyMessages() {
    if (!this.database) {
      await this.init();
    }

    try {
      const [results] = await this.database.executeSql(
        `SELECT m.*, mc.latitude, mc.longitude, mc.altitude, mc.sos_message, 
          p.name as peer_name
         FROM messages m
         LEFT JOIN message_contents mc ON m.id = mc.message_id
         LEFT JOIN peers p ON m.peer_id = p.id
         WHERE m.is_emergency = 1
         ORDER BY m.timestamp DESC
         LIMIT 50`
      );

      const messages = [];
      for (let i = 0; i < results.rows.length; i++) {
        messages.push(results.rows.item(i));
      }

      return messages;
    } catch (error) {
      console.error('Error getting emergency messages:', error);
      return [];
    }
  }

  /**
   * Delete old messages
   * @param {number} days - Delete messages older than this many days
   * @returns {Promise<number>} Number of messages deleted
   */
  async deleteOldMessages(days = 30) {
    if (!this.database) {
      await this.init();
    }

    try {
      // Calculate cutoff date
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      const cutoffDateStr = cutoffDate.toISOString();

      // Get count of messages to delete
      const [countResults] = await this.database.executeSql(
        'SELECT COUNT(*) as count FROM messages WHERE timestamp < ? AND is_emergency = 0',
        [cutoffDateStr]
      );
      const count = countResults.rows.item(0).count;

      // Delete messages
      if (count > 0) {
        // First delete from message_contents due to foreign key constraint
        await this.database.executeSql(
          `DELETE FROM message_contents 
           WHERE message_id IN (
             SELECT id FROM messages WHERE timestamp < ? AND is_emergency = 0
           )`,
          [cutoffDateStr]
        );
        
        // Then delete from messages
        await this.database.executeSql(
          'DELETE FROM messages WHERE timestamp < ? AND is_emergency = 0',
          [cutoffDateStr]
        );
      }

      return count;
    } catch (error) {
      console.error('Error deleting old messages:', error);
      return 0;
    }
  }

  /**
   * Execute a custom SQL query
   * @param {string} sql - SQL query
   * @param {Array} params - Query parameters
   * @returns {Promise<Array>} Query results
   */
  async executeQuery(sql, params = []) {
    if (!this.database) {
      await this.init();
    }

    try {
      const [results] = await this.database.executeSql(sql, params);
      
      const rows = [];
      for (let i = 0; i < results.rows.length; i++) {
        rows.push(results.rows.item(i));
      }

      return rows;
    } catch (error) {
      console.error('Error executing query:', error, sql, params);
      throw error;
    }
  }
}

export default new DatabaseService();