import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import ConnectionStatus from '../components/ConnectionStatus';
import bridgefyService, { MESSAGE_TYPES, CONNECTION_STATE } from '../services/bridgefyService';

const MessagingScreen = ({ navigation, route }) => {
  const [initialized, setInitialized] = useState(false);
  const [isStarted, setIsStarted] = useState(false);
  const [nearbyPeers, setNearbyPeers] = useState([]);
  const [connectedPeers, setConnectedPeers] = useState([]);
  const [selectedPeer, setSelectedPeer] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [username, setUsername] = useState('');
  const [apiKey, setApiKey] = useState(''); // You would get this from environment variables
  
  const flatListRef = useRef(null);

  // Initialize Bridgefy
  useEffect(() => {
    const initializeBridgefy = async () => {
      setIsLoading(true);
      
      try {
        // In a real app, get API key from environment or secure storage
        const bridgefyApiKey = 'simulated_api_key';
        
        // Initialize the service
        const success = await bridgefyService.initialize(bridgefyApiKey);
        
        if (success) {
          setInitialized(true);
          setApiKey(bridgefyApiKey);
          console.log('Bridgefy initialized successfully');
        } else {
          Alert.alert('Error', 'Failed to initialize Bridgefy service');
        }
      } catch (error) {
        console.error('Error initializing Bridgefy:', error);
        Alert.alert('Error', 'Failed to initialize Bridgefy service');
      } finally {
        setIsLoading(false);
      }
    };
    
    initializeBridgefy();
    
    // Cleanup
    return () => {
      stopBridgefy();
    };
  }, []);

  // Set up listeners for Bridgefy events
  useEffect(() => {
    if (!initialized) return;
    
    // Peer detection
    bridgefyService.onPeerDetected((peer) => {
      console.log('Peer detected:', peer);
      setNearbyPeers(prev => {
        if (prev.some(p => p.id === peer.id)) return prev;
        return [...prev, peer];
      });
    });
    
    // Peer lost
    bridgefyService.onPeerLost((peer) => {
      console.log('Peer lost:', peer);
      setNearbyPeers(prev => prev.filter(p => p.id !== peer.id));
      setConnectedPeers(prev => prev.filter(p => p.id !== peer.id));
      
      // If the selected peer is lost, deselect it
      if (selectedPeer && selectedPeer.id === peer.id) {
        setSelectedPeer(null);
      }
    });
    
    // Connection state change
    bridgefyService.onPeerConnectionStateChanged((peer) => {
      console.log('Peer connection state changed:', peer);
      
      // Update nearby peers list
      setNearbyPeers(prev => {
        return prev.map(p => p.id === peer.id ? peer : p);
      });
      
      // Update connected peers list
      if (peer.connectionState === CONNECTION_STATE.CONNECTED) {
        setConnectedPeers(prev => {
          if (prev.some(p => p.id === peer.id)) return prev;
          return [...prev, peer];
        });
      } else if (peer.connectionState === CONNECTION_STATE.DISCONNECTED) {
        setConnectedPeers(prev => prev.filter(p => p.id !== peer.id));
      }
      
      // Update selected peer if it's the same one
      if (selectedPeer && selectedPeer.id === peer.id) {
        setSelectedPeer(peer);
      }
    });
    
    // Message received
    bridgefyService.onMessageReceived((peerId, message) => {
      console.log('Message received:', peerId, message);
      
      // Update messages if it's from the selected peer
      if (selectedPeer && selectedPeer.id === peerId) {
        setMessages(prev => [...prev, message]);
        
        // Scroll to bottom
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
      
      // Show notification for emergency messages
      if (message.isEmergency) {
        const peerName = connectedPeers.find(p => p.id === peerId)?.name || 'Unknown hiker';
        Alert.alert(
          'Emergency!',
          `${peerName} has sent an emergency message!`,
          [
            {
              text: 'View',
              onPress: () => {
                // Find the peer and select it
                const peer = nearbyPeers.find(p => p.id === peerId);
                if (peer) {
                  setSelectedPeer(peer);
                  
                  // Get message history
                  const history = bridgefyService.getMessageHistory(peerId);
                  setMessages(history);
                }
              }
            },
            { text: 'OK', style: 'cancel' }
          ]
        );
      }
    });
    
    // Error handling
    bridgefyService.onError((error) => {
      console.error('Bridgefy error:', error);
      Alert.alert('Error', `Bridgefy error: ${error.message}`);
    });
    
    // Cleanup
    return () => {
      bridgefyService.removePeerDetectedCallback();
      bridgefyService.removePeerLostCallback();
      bridgefyService.removePeerConnectionStateChangedCallback();
      bridgefyService.removeMessageReceivedCallback();
      bridgefyService.removeErrorCallback();
    };
  }, [initialized, selectedPeer, nearbyPeers, connectedPeers]);

  // Load messages when selected peer changes
  useEffect(() => {
    if (selectedPeer) {
      // Get message history for the selected peer
      const history = bridgefyService.getMessageHistory(selectedPeer.id);
      setMessages(history);
      
      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } else {
      setMessages([]);
    }
  }, [selectedPeer]);

  // Handle SOS parameter if passed from HomeScreen
  useEffect(() => {
    if (route.params?.sendSOS && isStarted) {
      sendSOS();
    }
  }, [route.params, isStarted]);

  // Start Bridgefy service
  const startBridgefy = async () => {
    if (!initialized) {
      Alert.alert('Error', 'Bridgefy not initialized');
      return;
    }
    
    if (isStarted) {
      console.log('Bridgefy already started');
      
      // If there's a pending SOS to send
      if (route.params?.sendSOS) {
        sendSOS();
      }
      
      return;
    }
    
    if (!username.trim()) {
      Alert.alert('Error', 'Please enter a username');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Start the service with user info
      const success = await bridgefyService.start({ username });
      
      if (success) {
        setIsStarted(true);
        console.log('Bridgefy started successfully');
        
        // Send SOS if requested
        if (route.params?.sendSOS) {
          setTimeout(() => {
            sendSOS();
          }, 1000); // Slight delay to ensure service is fully started
        }
      } else {
        Alert.alert('Error', 'Failed to start Bridgefy service');
      }
    } catch (error) {
      console.error('Error starting Bridgefy:', error);
      Alert.alert('Error', 'Failed to start Bridgefy service');
    } finally {
      setIsLoading(false);
    }
  };

  // Stop Bridgefy service
  const stopBridgefy = async () => {
    if (!isStarted) return;
    
    try {
      const success = await bridgefyService.stop();
      
      if (success) {
        setIsStarted(false);
        setNearbyPeers([]);
        setConnectedPeers([]);
        setSelectedPeer(null);
        console.log('Bridgefy stopped successfully');
      }
    } catch (error) {
      console.error('Error stopping Bridgefy:', error);
    }
  };

  // Connect to a peer
  const connectToPeer = async (peer) => {
    if (!isStarted) {
      Alert.alert('Error', 'Bridgefy not started');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const success = await bridgefyService.connectToPeer(peer.id);
      
      if (success) {
        console.log(`Connected to peer ${peer.name} (${peer.id})`);
        // Select the peer
        setSelectedPeer(peer);
      } else {
        Alert.alert('Error', `Failed to connect to ${peer.name}`);
      }
    } catch (error) {
      console.error('Error connecting to peer:', error);
      Alert.alert('Error', 'Failed to connect to peer');
    } finally {
      setIsLoading(false);
    }
  };

  // Disconnect from a peer
  const disconnectFromPeer = async (peer) => {
    if (!isStarted) return;
    
    try {
      const success = await bridgefyService.disconnectFromPeer(peer.id);
      
      if (success) {
        console.log(`Disconnected from peer ${peer.name} (${peer.id})`);
        
        // If the selected peer is disconnected, deselect it
        if (selectedPeer && selectedPeer.id === peer.id) {
          setSelectedPeer(null);
        }
      }
    } catch (error) {
      console.error('Error disconnecting from peer:', error);
    }
  };

  // Send a message to the selected peer
  const sendMessage = async () => {
    if (!isStarted || !selectedPeer) {
      Alert.alert('Error', 'No peer selected');
      return;
    }
    
    if (!messageText.trim()) return;
    
    try {
      // Prepare the message
      const message = {
        type: MESSAGE_TYPES.TEXT,
        content: messageText.trim(),
      };
      
      // Send the message
      const success = await bridgefyService.sendMessage(selectedPeer.id, message);
      
      if (success) {
        console.log(`Message sent to ${selectedPeer.name} (${selectedPeer.id})`);
        setMessageText('');
      } else {
        Alert.alert('Error', 'Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message');
    }
  };

  // Send location to the selected peer
  const sendLocation = async () => {
    if (!isStarted || !selectedPeer) {
      Alert.alert('Error', 'No peer selected');
      return;
    }
    
    try {
      const success = await bridgefyService.sendLocationUpdate(false);
      
      if (success) {
        console.log(`Location sent to ${selectedPeer.name} (${selectedPeer.id})`);
      } else {
        Alert.alert('Error', 'Failed to send location');
      }
    } catch (error) {
      console.error('Error sending location:', error);
      Alert.alert('Error', 'Failed to send location');
    }
  };

  // Send an SOS message
  const sendSOS = async () => {
    if (!isStarted) {
      Alert.alert('Error', 'Bridgefy not started');
      return;
    }
    
    Alert.alert(
      'Send SOS',
      'This will broadcast an emergency SOS message to all nearby hikers. Continue?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Send SOS',
          style: 'destructive',
          onPress: async () => {
            try {
              const success = await bridgefyService.sendSOS('I need immediate assistance!');
              
              if (success) {
                console.log('SOS message sent to all nearby hikers');
                Alert.alert('SOS Sent', 'Emergency message has been broadcast to all nearby hikers');
              } else {
                Alert.alert('Error', 'Failed to send SOS message');
              }
            } catch (error) {
              console.error('Error sending SOS:', error);
              Alert.alert('Error', 'Failed to send SOS message');
            }
          }
        }
      ]
    );
  };

  // Render message item
  const renderMessage = ({ item }) => {
    const isIncoming = item.senderId !== bridgefyService.userId;
    const isEmergency = item.isEmergency || item.type === MESSAGE_TYPES.SOS;
    
    // Determine message container style
    const containerStyle = [
      styles.messageContainer,
      isIncoming ? styles.incomingMessage : styles.outgoingMessage,
      isEmergency && styles.emergencyMessage
    ];
    
    // Determine message text style
    const textStyle = [
      styles.messageText,
      isIncoming ? styles.incomingMessageText : styles.outgoingMessageText,
      isEmergency && styles.emergencyMessageText
    ];
    
    // Format timestamp
    const timestamp = new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    // Render different message types
    let content;
    switch (item.type) {
      case MESSAGE_TYPES.TEXT:
        content = (
          <Text style={textStyle}>{item.content}</Text>
        );
        break;
        
      case MESSAGE_TYPES.LOCATION:
        content = (
          <View>
            <Text style={textStyle}>📍 Location Update</Text>
            {item.content.latitude && item.content.longitude && (
              <Text style={[textStyle, styles.locationText]}>
                {item.content.latitude.toFixed(4)}, {item.content.longitude.toFixed(4)}
              </Text>
            )}
          </View>
        );
        break;
        
      case MESSAGE_TYPES.SOS:
        content = (
          <View>
            <Text style={[textStyle, styles.sosText]}>🆘 EMERGENCY SOS</Text>
            {item.content.message && (
              <Text style={textStyle}>{item.content.message}</Text>
            )}
            {item.content.latitude && item.content.longitude && (
              <Text style={[textStyle, styles.locationText]}>
                Location: {item.content.latitude.toFixed(4)}, {item.content.longitude.toFixed(4)}
              </Text>
            )}
          </View>
        );
        break;
        
      case MESSAGE_TYPES.STATUS:
        content = (
          <View>
            <Text style={textStyle}>{item.content.status}</Text>
            {item.content.message && (
              <Text style={textStyle}>{item.content.message}</Text>
            )}
          </View>
        );
        break;
        
      default:
        content = (
          <Text style={textStyle}>{JSON.stringify(item.content)}</Text>
        );
    }
    
    return (
      <View style={containerStyle}>
        <View style={styles.messageBubble}>
          {!isIncoming && (
            <Text style={styles.messageSender}>You</Text>
          )}
          {isIncoming && (
            <Text style={styles.messageSender}>{item.senderName}</Text>
          )}
          
          {content}
          
          <Text style={styles.messageTimestamp}>{timestamp}</Text>
        </View>
      </View>
    );
  };

  // Render peer item
  const renderPeer = ({ item }) => {
    const isConnected = item.connectionState === CONNECTION_STATE.CONNECTED;
    const isConnecting = item.connectionState === CONNECTION_STATE.CONNECTING;
    const isSelected = selectedPeer && selectedPeer.id === item.id;
    
    return (
      <TouchableOpacity
        style={[
          styles.peerItem,
          isSelected && styles.selectedPeer,
          isConnected && styles.connectedPeer
        ]}
        onPress={() => {
          if (isConnected) {
            setSelectedPeer(item);
          } else {
            connectToPeer(item);
          }
        }}
        disabled={isConnecting}
      >
        <View style={styles.peerInfo}>
          <Text style={styles.peerName}>{item.name}</Text>
          <View style={styles.peerStatusContainer}>
            <View 
              style={[
                styles.peerStatusIndicator,
                isConnected ? styles.connectedIndicator : styles.disconnectedIndicator,
                isConnecting && styles.connectingIndicator
              ]} 
            />
            <Text style={styles.peerStatus}>
              {isConnecting ? 'Connecting...' : isConnected ? 'Connected' : 'Available'}
            </Text>
          </View>
        </View>
        
        {isConnected && (
          <TouchableOpacity
            style={styles.disconnectButton}
            onPress={() => disconnectFromPeer(item)}
          >
            <Text style={styles.disconnectButtonText}>Disconnect</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ConnectionStatus />
      
      {!isStarted ? (
        <View style={styles.setupContainer}>
          <Text style={styles.title}>Offline Messaging</Text>
          <Text style={styles.subtitle}>
            Connect with nearby hikers using Bluetooth mesh networking.
            No internet connection required!
          </Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Your Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your name"
              value={username}
              onChangeText={setUsername}
              maxLength={20}
            />
          </View>
          
          <TouchableOpacity
            style={styles.startButton}
            onPress={startBridgefy}
            disabled={isLoading || !username.trim()}
          >
            {isLoading ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Text style={styles.startButtonText}>Start Messaging</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.messagesContainer}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>
              {selectedPeer ? `Chat with ${selectedPeer.name}` : 'Nearby Hikers'}
            </Text>
            
            {selectedPeer && (
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => setSelectedPeer(null)}
              >
                <Text style={styles.backButtonText}>Back</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity
              style={styles.emergencyButton}
              onPress={sendSOS}
            >
              <Text style={styles.emergencyButtonText}>SOS</Text>
            </TouchableOpacity>
          </View>
          
          {!selectedPeer ? (
            <View style={styles.peerListContainer}>
              <Text style={styles.sectionTitle}>Available Hikers ({nearbyPeers.length})</Text>
              
              {nearbyPeers.length === 0 ? (
                <View style={styles.emptyStateContainer}>
                  <Text style={styles.emptyStateText}>
                    No hikers found nearby. Waiting for discoveries...
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={nearbyPeers}
                  renderItem={renderPeer}
                  keyExtractor={(item) => item.id}
                  contentContainerStyle={styles.peerList}
                />
              )}
            </View>
          ) : (
            <View style={styles.chatContainer}>
              <FlatList
                ref={flatListRef}
                data={messages}
                renderItem={renderMessage}
                keyExtractor={(item) => item.messageId}
                contentContainerStyle={styles.messagesList}
                onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
              />
              
              <View style={styles.inputRow}>
                <TouchableOpacity
                  style={styles.locationButton}
                  onPress={sendLocation}
                >
                  <Text style={styles.locationButtonText}>📍</Text>
                </TouchableOpacity>
                
                <TextInput
                  style={styles.messageInput}
                  placeholder="Type a message..."
                  value={messageText}
                  onChangeText={setMessageText}
                  multiline
                />
                
                <TouchableOpacity
                  style={styles.sendButton}
                  onPress={sendMessage}
                  disabled={!messageText.trim()}
                >
                  <Text style={styles.sendButtonText}>Send</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  setupContainer: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#7f8c8d',
    marginBottom: 30,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2c3e50',
    marginBottom: 5,
  },
  input: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  startButton: {
    backgroundColor: '#27ae60',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  startButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  messagesContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    backgroundColor: '#2c3e50',
  },
  headerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  backButton: {
    padding: 8,
    marginRight: 10,
  },
  backButtonText: {
    color: '#27ae60',
    fontWeight: 'bold',
  },
  emergencyButton: {
    backgroundColor: '#e74c3c',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 15,
  },
  emergencyButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  peerListContainer: {
    flex: 1,
    padding: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 15,
  },
  peerList: {
    paddingBottom: 20,
  },
  peerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  selectedPeer: {
    borderWidth: 2,
    borderColor: '#27ae60',
  },
  connectedPeer: {
    backgroundColor: '#f1f8e9',
  },
  peerInfo: {
    flex: 1,
  },
  peerName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2c3e50',
    marginBottom: 5,
  },
  peerStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  peerStatusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 5,
  },
  connectedIndicator: {
    backgroundColor: '#27ae60',
  },
  disconnectedIndicator: {
    backgroundColor: '#7f8c8d',
  },
  connectingIndicator: {
    backgroundColor: '#f39c12',
  },
  peerStatus: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  disconnectButton: {
    backgroundColor: '#e74c3c',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 5,
  },
  disconnectButtonText: {
    color: 'white',
    fontWeight: '500',
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  emptyStateText: {
    textAlign: 'center',
    color: '#7f8c8d',
    fontSize: 16,
  },
  chatContainer: {
    flex: 1,
  },
  messagesList: {
    padding: 15,
    paddingBottom: 20,
  },
  messageContainer: {
    marginBottom: 10,
    flexDirection: 'row',
  },
  incomingMessage: {
    justifyContent: 'flex-start',
  },
  outgoingMessage: {
    justifyContent: 'flex-end',
  },
  emergencyMessage: {
    marginVertical: 10,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 10,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  incomingMessage: {
    backgroundColor: '#ecf0f1',
  },
  outgoingMessage: {
    backgroundColor: '#27ae60',
  },
  emergencyMessage: {
    backgroundColor: '#e74c3c',
  },
  messageSender: {
    fontSize: 12,
    marginBottom: 5,
    fontWeight: 'bold',
  },
  messageText: {
    fontSize: 16,
  },
  incomingMessageText: {
    color: '#2c3e50',
  },
  outgoingMessageText: {
    color: 'white',
  },
  emergencyMessageText: {
    color: 'white',
    fontWeight: 'bold',
  },
  sosText: {
    fontSize: 18,
    marginBottom: 5,
  },
  locationText: {
    fontSize: 14,
    marginTop: 5,
  },
  messageTimestamp: {
    fontSize: 10,
    alignSelf: 'flex-end',
    marginTop: 5,
    opacity: 0.7,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 10,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  locationButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  locationButtonText: {
    fontSize: 24,
  },
  messageInput: {
    flex: 1,
    backgroundColor: '#f1f1f1',
    borderRadius: 20,
    padding: 10,
    maxHeight: 100,
  },
  sendButton: {
    marginLeft: 10,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#27ae60',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});

export default MessagingScreen;