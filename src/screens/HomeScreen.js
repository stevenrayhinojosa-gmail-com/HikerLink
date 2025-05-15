import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  SafeAreaView,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator
} from 'react-native';
import ConnectionStatus from '../components/ConnectionStatus';
import firebaseService from '../services/firebaseService';
import messagingService from '../services/messagingService';

const HomeScreen = ({ navigation }) => {
  const [user, setUser] = useState(null);
  const [isAuthModalVisible, setIsAuthModalVisible] = useState(false);
  const [isTrackingModalVisible, setIsTrackingModalVisible] = useState(false);
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedTrackingMode, setSelectedTrackingMode] = useState('standard');
  const [isBackgroundTrackingOn, setIsBackgroundTrackingOn] = useState(false);

  // Check user login state
  useEffect(() => {
    const currentUser = firebaseService.getCurrentUser();
    setUser(currentUser);
  }, []);

  // Handle authentication
  const handleAuth = async () => {
    if (!email || !password) {
      setError('Please enter email and password');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      if (authMode === 'login') {
        await firebaseService.signInWithEmail(email, password);
      } else {
        if (!displayName) {
          setError('Please enter a display name');
          setIsLoading(false);
          return;
        }
        await firebaseService.signUpWithEmail(email, password, displayName);
      }

      // Update user state
      setUser(firebaseService.getCurrentUser());
      
      // Update username in messaging service
      if (firebaseService.getCurrentUser()) {
        messagingService.setUsername(firebaseService.getCurrentUser().displayName);
      }
      
      // Close the modal
      setIsAuthModalVisible(false);
      
      // Reset fields
      setEmail('');
      setPassword('');
      setDisplayName('');
    } catch (err) {
      console.error('Authentication error:', err);
      setError(err.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Sign in anonymously
  const handleAnonymousSignIn = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      await firebaseService.signInAnonymously();
      setUser(firebaseService.getCurrentUser());
      
      // Update username in messaging service
      if (firebaseService.getCurrentUser()) {
        messagingService.setUsername(firebaseService.getCurrentUser().displayName);
      }
      
      // Close the modal
      setIsAuthModalVisible(false);
    } catch (err) {
      console.error('Anonymous sign-in error:', err);
      setError(err.message || 'Anonymous sign-in failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Sign out
  const handleSignOut = async () => {
    try {
      await firebaseService.signOut();
      setUser(null);
    } catch (err) {
      console.error('Sign out error:', err);
      Alert.alert('Error', 'Failed to sign out');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.contentContainer}>
        <ConnectionStatus />
        
        <View style={styles.welcomeSection}>
          <Text style={styles.title}>Welcome to HikerLink</Text>
          <Text style={styles.subtitle}>
            {user ? `Signed in as ${user.displayName || 'Anonymous'}` : 'Connect with fellow hikers even without cellular service'}
          </Text>
          
          {/* Authentication buttons */}
          <View style={styles.authButtons}>
            {user ? (
              <TouchableOpacity
                style={styles.signOutButton}
                onPress={handleSignOut}
              >
                <Text style={styles.signOutButtonText}>Sign Out</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.signInButton}
                onPress={() => {
                  setIsAuthModalVisible(true);
                  setAuthMode('login');
                }}
              >
                <Text style={styles.signInButtonText}>Sign In / Sign Up</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
        
        <View style={styles.featuresSection}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => navigation.navigate('MapTab')}
            >
              <Text style={styles.actionButtonText}>View Map</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => navigation.navigate('MessagingTab')}
            >
              <Text style={styles.actionButtonText}>Connect with Hikers</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionButton, styles.emergencyButton]}
              onPress={() => {
                Alert.alert(
                  'Send SOS Emergency Signal',
                  'This will broadcast your emergency status and location to all nearby hikers. Continue?',
                  [
                    {
                      text: 'Cancel',
                      style: 'cancel'
                    },
                    {
                      text: 'Send SOS',
                      style: 'destructive',
                      onPress: () => {
                        // Navigate to the messaging screen and send SOS
                        navigation.navigate('MessagingTab', { sendSOS: true });
                      }
                    }
                  ]
                );
              }}
            >
              <Text style={styles.actionButtonText}>Emergency Signal</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => setIsTrackingModalVisible(true)}
            >
              <Text style={styles.actionButtonText}>Track My Hike</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>About HikerLink</Text>
          <Text style={styles.infoText}>
            HikerLink uses Bluetooth and mesh networking technology to help you stay connected
            with fellow hikers even when cellular service is unavailable. Share your location,
            send messages, and stay safe on the trail.
          </Text>
          <Text style={styles.infoText}>
            When online, HikerLink syncs your data to the cloud, allowing you to access
            your messages and track history on any device. Sign in to enable cloud sync.
          </Text>
        </View>
      </ScrollView>

      {/* Authentication Modal */}
      <Modal
        visible={isAuthModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsAuthModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {authMode === 'login' ? 'Sign In' : 'Create Account'}
            </Text>

            {error ? (
              <Text style={styles.errorText}>{error}</Text>
            ) : null}

            {authMode === 'signup' ? (
              <TextInput
                style={styles.input}
                placeholder="Display Name"
                value={displayName}
                onChangeText={setDisplayName}
                autoCapitalize="words"
              />
            ) : null}

            <TextInput
              style={styles.input}
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <TextInput
              style={styles.input}
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            <TouchableOpacity
              style={styles.authButton}
              onPress={handleAuth}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.authButtonText}>
                  {authMode === 'login' ? 'Sign In' : 'Sign Up'}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.authToggleButton}
              onPress={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
              disabled={isLoading}
            >
              <Text style={styles.authToggleText}>
                {authMode === 'login'
                  ? "Don't have an account? Sign Up"
                  : 'Already have an account? Sign In'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.anonymousButton}
              onPress={handleAnonymousSignIn}
              disabled={isLoading}
            >
              <Text style={styles.anonymousButtonText}>
                Continue Anonymously
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setIsAuthModalVisible(false)}
              disabled={isLoading}
            >
              <Text style={styles.closeButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Tracking Settings Modal */}
      <Modal
        visible={isTrackingModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsTrackingModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Tracking Settings</Text>
            
            <View style={styles.trackingSection}>
              <Text style={styles.sectionTitle}>Tracking Mode</Text>
              
              <TouchableOpacity 
                style={[
                  styles.trackingOption,
                  selectedTrackingMode === 'power-saving' && styles.selectedTrackingOption
                ]}
                onPress={() => setSelectedTrackingMode('power-saving')}
              >
                <Text style={styles.trackingOptionTitle}>Power Saving</Text>
                <Text style={styles.trackingOptionDescription}>Less frequent updates, longer battery life</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.trackingOption,
                  selectedTrackingMode === 'standard' && styles.selectedTrackingOption
                ]}
                onPress={() => setSelectedTrackingMode('standard')}
              >
                <Text style={styles.trackingOptionTitle}>Standard</Text>
                <Text style={styles.trackingOptionDescription}>Regular location updates (recommended)</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.trackingOption,
                  selectedTrackingMode === 'high-accuracy' && styles.selectedTrackingOption
                ]}
                onPress={() => setSelectedTrackingMode('high-accuracy')}
              >
                <Text style={styles.trackingOptionTitle}>High Accuracy</Text>
                <Text style={styles.trackingOptionDescription}>Frequent updates, higher battery usage</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.toggleContainer}>
              <Text style={styles.toggleLabel}>Background Tracking</Text>
              <Switch
                value={isBackgroundTrackingOn}
                onValueChange={setIsBackgroundTrackingOn}
                trackColor={{ false: '#767577', true: '#27ae60' }}
                thumbColor={isBackgroundTrackingOn ? '#f5fcff' : '#f4f3f4'}
              />
            </View>
            
            <Text style={styles.toggleDescription}>
              Keeps tracking your location even when the app is in the background or closed
            </Text>
            
            <View style={styles.trackingButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setIsTrackingModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.startTrackingButton}
                onPress={() => {
                  setIsTrackingModalVisible(false);
                  // Navigate to map screen with tracking params
                  navigation.navigate('MapTab', { 
                    startTracking: true,
                    trackingMode: selectedTrackingMode,
                    backgroundTracking: isBackgroundTrackingOn
                  });
                }}
              >
                <Text style={styles.startTrackingButtonText}>Start Tracking</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  contentContainer: {
    padding: 20,
  },
  welcomeSection: {
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#7f8c8d',
    marginBottom: 10,
  },
  authButtons: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  signInButton: {
    backgroundColor: '#3498db',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
  },
  signInButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  signOutButton: {
    backgroundColor: '#95a5a6',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
  },
  signOutButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  featuresSection: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 15,
  },
  actionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionButton: {
    backgroundColor: '#27ae60',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    width: '48%',
    alignItems: 'center',
  },
  emergencyButton: {
    backgroundColor: '#e74c3c',
  },
  actionButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  infoSection: {
    padding: 15,
    backgroundColor: '#ecf0f1',
    borderRadius: 10,
    marginBottom: 20,
  },
  infoText: {
    color: '#34495e',
    lineHeight: 20,
    marginBottom: 10,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginBottom: 15,
    fontSize: 16,
  },
  authButton: {
    backgroundColor: '#3498db',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 15,
  },
  authButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  authToggleButton: {
    marginBottom: 15,
    alignItems: 'center',
  },
  authToggleText: {
    color: '#3498db',
    fontSize: 16,
  },
  anonymousButton: {
    backgroundColor: '#95a5a6',
    padding: 12,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 15,
  },
  anonymousButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 10,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#7f8c8d',
    fontSize: 16,
  },
  errorText: {
    color: '#e74c3c',
    marginBottom: 15,
    textAlign: 'center',
  },
  // Tracking Modal Styles
  trackingSection: {
    marginBottom: 20,
  },
  trackingOption: {
    padding: 15,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    marginBottom: 10,
    backgroundColor: '#f9f9f9',
  },
  selectedTrackingOption: {
    borderColor: '#27ae60',
    backgroundColor: '#e0f2f1',
  },
  trackingOptionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 5,
  },
  trackingOptionDescription: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  toggleLabel: {
    fontSize: 16,
    color: '#2c3e50',
  },
  toggleDescription: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 20,
  },
  trackingButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelButton: {
    backgroundColor: '#ecf0f1',
    padding: 12,
    borderRadius: 5,
    flex: 1,
    marginRight: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#2c3e50',
    fontWeight: 'bold',
  },
  startTrackingButton: {
    backgroundColor: '#27ae60',
    padding: 12,
    borderRadius: 5,
    flex: 1,
    marginLeft: 10,
    alignItems: 'center',
  },
  startTrackingButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});

export default HomeScreen;
