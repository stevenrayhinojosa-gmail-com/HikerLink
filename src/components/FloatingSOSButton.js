import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  Animated, 
  TouchableWithoutFeedback, 
  Text,
  Platform
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import sosService from '../services/sosService';
import SOSButton from './SOSButton';

const FloatingSOSButton = () => {
  const navigation = useNavigation();
  const [isExpanded, setIsExpanded] = useState(false);
  const expandAnimation = useRef(new Animated.Value(0)).current;
  const buttonSize = 60;
  const buttonMargin = 20;

  // Handle SOS button press
  const handleSOSPress = () => {
    // If not expanded, expand the options
    if (!isExpanded) {
      setIsExpanded(true);
      return;
    }

    // If expanded, proceed to SOS with confirmation
    sosService.sosMessage = "I need help! This is an emergency SOS sent from HikerLink.";
    sosService.onLongPress();
  };

  // Handle sending SOS message and navigating to messaging screen
  const handleSendSOSAndNavigate = () => {
    // Navigate to messaging screen with SOS parameter
    navigation.navigate('MessagingTab', { sendSOS: true });
    setIsExpanded(false);
  };

  // Toggle SOS options menu
  const toggleOptions = () => {
    setIsExpanded(!isExpanded);
  };

  // Animate expansion when isExpanded changes
  useEffect(() => {
    Animated.timing(expandAnimation, {
      toValue: isExpanded ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [isExpanded]);

  // Calculate animations for menu items
  const optionTranslateY1 = expandAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -70],
  });

  const optionScale1 = expandAnimation.interpolate({
    inputRange: [0, 0.7, 1],
    outputRange: [0, 0.7, 1],
  });

  const optionOpacity1 = expandAnimation.interpolate({
    inputRange: [0, 0.7, 1],
    outputRange: [0, 0.7, 1],
  });

  // Opacity for the backdrop
  const backdropOpacity = expandAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.5],
  });

  return (
    <>
      {/* Backdrop for click-away when expanded */}
      {isExpanded && (
        <TouchableWithoutFeedback onPress={toggleOptions}>
          <Animated.View
            style={[
              styles.backdrop,
              { opacity: backdropOpacity },
            ]}
          />
        </TouchableWithoutFeedback>
      )}

      <View style={styles.container}>
        {/* SOS Option: Send SOS and Navigate */}
        <Animated.View
          style={[
            styles.option,
            {
              transform: [
                { translateY: optionTranslateY1 },
                { scale: optionScale1 },
              ],
              opacity: optionOpacity1,
            },
          ]}
        >
          <TouchableWithoutFeedback onPress={handleSendSOSAndNavigate}>
            <View style={styles.optionButton}>
              <Text style={styles.optionText}>Send SOS</Text>
            </View>
          </TouchableWithoutFeedback>
        </Animated.View>

        {/* Main SOS Button */}
        <SOSButton
          style={styles.sosButton}
          onPress={handleSOSPress}
          message="I need help! This is an emergency SOS sent from HikerLink."
        />
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 80, // Above the tab navigator
    right: 20,
    alignItems: 'center',
    zIndex: 999,
  },
  sosButton: {
    // Styles applied from SOSButton component
    // Just ensure size is consistent
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000',
    zIndex: 998,
  },
  option: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 120,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e74c3c',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
      },
      android: {
        elevation: 5,
      },
      web: {
        boxShadow: '0 2px 5px rgba(0, 0, 0, 0.3)',
      },
    }),
  },
  optionButton: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionText: {
    color: 'white',
    fontWeight: 'bold',
  },
});

export default FloatingSOSButton;