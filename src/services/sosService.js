import { Platform, Alert, Vibration } from 'react-native';
import RNShake from 'react-native-shake';
import messagingService from './messagingService';
import locationService from './locationService';
import firebaseService from './firebaseService';

// Short vibration for feedback
const SHORT_VIBRATION = 300; // 300ms

// SOS vibration pattern (SOS in Morse code: • • • — — — • • •)
const SOS_VIBRATION_PATTERN = Platform.select({
  ios: [
    0, 300, 200, 300, 200, 300, // Short pulses (S)
    500, 700, 500, 700, 500, // Long pulses (O)
    700, 300, 200, 300, 200, 300 // Short pulses (S)
  ],
  android: [
    0, 300, 200, 300, 200, 300, // Short pulses (S)
    500, 700, 500, 700, 500, // Long pulses (O)
    700, 300, 200, 300, 200, 300 // Short pulses (S)
  ]
});

class SOSService {
  constructor() {
    this.isListening = false;
    this.shakeSubscription = null;
    this.isSending = false;
    this.sosMessageTimeout = null;
    this.sosCountdown = 0;
    this.sosCountdownInterval = null;
    this.sosMessage = "I need help! This is an emergency SOS signal.";
    this.sosCallback = null;
  }

  // Initialize SOS service
  initialize(sosMessage = null, callback = null) {
    if (this.isListening) {
      return;
    }

    this.isListening = true;
    this.sosMessage = sosMessage || this.sosMessage;
    this.sosCallback = callback;

    // Set up shake detection
    if (Platform.OS !== 'web') {
      this.shakeSubscription = RNShake.addListener(() => {
        this.onShake();
      });
    }

    console.log('SOS service initialized');
  }

  // Clean up listeners
  cleanup() {
    this.stopSosCountdown();
    
    if (this.shakeSubscription) {
      this.shakeSubscription.remove();
      this.shakeSubscription = null;
    }
    
    this.isListening = false;
    console.log('SOS service cleaned up');
  }

  // Handle shake event
  onShake() {
    if (this.isSending) return;
    
    // Start or update countdown
    this.startSosCountdown();
    
    // Trigger haptic feedback
    this.triggerHapticFeedback('impactMedium');
  }

  // Handle long press
  onLongPress() {
    if (this.isSending) return;
    
    // Start or update countdown
    this.startSosCountdown();
    
    // Trigger haptic feedback
    this.triggerHapticFeedback('impactHeavy');
  }

  // Start SOS countdown
  startSosCountdown() {
    // If already counting down, add more time
    if (this.sosCountdownInterval) {
      this.sosCountdown = 5; // Reset to 5 seconds
      return;
    }
    
    // Start countdown from 5 seconds
    this.sosCountdown = 5;
    
    // Provide initial feedback to user
    this.triggerHapticFeedback('notificationWarning');
    
    // Show alert
    Alert.alert(
      'SOS Countdown Started',
      'Shake device again or press and hold to confirm SOS. SOS will be sent in 5 seconds.\nPress Cancel to stop.',
      [
        {
          text: 'Cancel',
          onPress: () => this.stopSosCountdown(),
          style: 'cancel',
        },
        {
          text: 'Send Now',
          onPress: () => {
            this.stopSosCountdown();
            this.sendSOS();
          },
          style: 'destructive',
        },
      ],
      { cancelable: false }
    );
    
    // Start countdown interval
    this.sosCountdownInterval = setInterval(() => {
      this.sosCountdown -= 1;
      
      // Provide feedback based on remaining time
      if (this.sosCountdown <= 3) {
        this.triggerHapticFeedback('impactMedium');
      }
      
      if (this.sosCountdown <= 0) {
        this.stopSosCountdown();
        this.sendSOS();
      }
    }, 1000);
  }

  // Stop SOS countdown
  stopSosCountdown() {
    if (this.sosCountdownInterval) {
      clearInterval(this.sosCountdownInterval);
      this.sosCountdownInterval = null;
    }
  }

  // Send SOS
  async sendSOS() {
    if (this.isSending) return;
    
    try {
      this.isSending = true;
      
      // Play SOS vibration pattern
      this.playSOSPattern();
      
      // Get current location
      const location = await locationService.getCurrentLocation();
      
      // Get message to send
      const message = this.sosMessage;
      
      // Notify callback if provided
      if (this.sosCallback) {
        this.sosCallback();
      }
      
      // Send SOS via messaging service
      const success = await messagingService.sendSOSMessage(message);
      
      // Show success or error message
      if (success) {
        Alert.alert(
          'SOS Sent',
          'Your emergency signal has been broadcast to nearby hikers' +
          (firebaseService.isSignedIn() ? ' and to the cloud.' : '.')
        );
      } else {
        Alert.alert(
          'SOS Sending Failed',
          'Failed to send emergency signal. Please try again or use the SOS button.'
        );
      }
    } catch (error) {
      console.error('Error sending SOS:', error);
      Alert.alert(
        'SOS Error',
        'An error occurred while sending SOS. Please try again or use the SOS button.'
      );
    } finally {
      this.isSending = false;
    }
  }

  // Trigger haptic feedback
  triggerHapticFeedback(type) {
    if (Platform.OS !== 'web') {
      // Use Vibration API instead of haptic feedback
      switch (type) {
        case 'impactLight':
          Vibration.vibrate(100);
          break;
        case 'impactMedium':
          Vibration.vibrate(200);
          break;
        case 'impactHeavy':
          Vibration.vibrate(300);
          break;
        case 'notificationWarning':
          Vibration.vibrate([0, 100, 200, 300]);
          break;
        default:
          Vibration.vibrate(SHORT_VIBRATION);
      }
    } else {
      console.log(`[Web] Haptic feedback: ${type}`);
    }
  }

  // Play SOS vibration pattern
  playSOSPattern() {
    if (Platform.OS !== 'web') {
      Vibration.vibrate(SOS_VIBRATION_PATTERN);
    }
  }

  // Cancel vibration
  cancelVibration() {
    if (Platform.OS !== 'web') {
      Vibration.cancel();
    }
  }
}

export default new SOSService();