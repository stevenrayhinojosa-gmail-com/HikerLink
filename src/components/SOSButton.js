import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Animated, 
  TouchableOpacity,
  Platform
} from 'react-native';
import { 
  LongPressGestureHandler, 
  State as GestureState 
} from 'react-native-gesture-handler';
import sosService from '../services/sosService';

const SOSButton = ({ style, onPress, message }) => {
  const [isLongPressing, setIsLongPressing] = useState(false);
  const [longPressProgress, setLongPressProgress] = useState(0);
  const progressAnimation = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
  const longPressTimer = useRef(null);

  // Set up progress animation listener
  useEffect(() => {
    const listenerId = progressAnimation.addListener(({ value }) => {
      setLongPressProgress(value);
    });

    return () => {
      progressAnimation.removeListener(listenerId);
      if (longPressTimer.current) {
        clearInterval(longPressTimer.current);
      }
    };
  }, []);

  // Handle gesture state change
  const onHandlerStateChange = (event) => {
    if (event.nativeEvent.state === GestureState.ACTIVE) {
      // Long press started
      setIsLongPressing(true);
      
      // Animate button scale
      Animated.spring(buttonScale, {
        toValue: 0.95,
        useNativeDriver: true,
      }).start();
      
      // Reset and start progress animation
      progressAnimation.setValue(0);
      
      // Set up timer to increment progress every 100ms (3 seconds total)
      longPressTimer.current = setInterval(() => {
        progressAnimation.setValue(prev => {
          const newValue = Math.min(1, prev + 0.033);
          
          // When we reach 100%, trigger SOS
          if (newValue >= 1) {
            clearInterval(longPressTimer.current);
            handleSOSTrigger();
          }
          
          return newValue;
        });
      }, 100);
      
      // Trigger haptic feedback
      sosService.triggerHapticFeedback('impactMedium');
    } 
    else if (
      event.nativeEvent.state === GestureState.END ||
      event.nativeEvent.state === GestureState.CANCELLED ||
      event.nativeEvent.state === GestureState.FAILED
    ) {
      // Long press ended
      cancelLongPress();
    }
  };

  // Cancel the long press
  const cancelLongPress = () => {
    setIsLongPressing(false);
    
    // Clear timer
    if (longPressTimer.current) {
      clearInterval(longPressTimer.current);
      longPressTimer.current = null;
    }
    
    // Reset animations
    Animated.parallel([
      Animated.spring(buttonScale, {
        toValue: 1,
        useNativeDriver: true,
      }),
      Animated.timing(progressAnimation, {
        toValue: 0,
        duration: 300,
        useNativeDriver: false,
      })
    ]).start();
  };

  // Handle SOS trigger
  const handleSOSTrigger = () => {
    cancelLongPress();
    
    // Trigger SOS via service
    if (message) {
      sosService.sosMessage = message;
    }
    
    sosService.onLongPress();
    
    // Also call external onPress if provided
    if (onPress) {
      onPress();
    }
  };

  // Calculate progress ring width
  const progressRingWidth = progressAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <LongPressGestureHandler
      onHandlerStateChange={onHandlerStateChange}
      minDurationMs={300}
    >
      <Animated.View 
        style={[
          styles.buttonContainer, 
          style,
          {
            transform: [{ scale: buttonScale }]
          }
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.7}
          style={styles.touchableArea}
          onPress={() => {
            // Regular press also triggers the SOS alert
            // but goes through the countdown first
            if (onPress) {
              onPress();
            }
          }}
        >
          <View style={styles.buttonInner}>
            <Text style={styles.buttonText}>SOS</Text>
            {isLongPressing && (
              <View style={styles.progressContainer}>
                <Animated.View 
                  style={[
                    styles.progressRing,
                    {
                      width: progressRingWidth,
                    }
                  ]} 
                />
              </View>
            )}
          </View>
        </TouchableOpacity>
      </Animated.View>
    </LongPressGestureHandler>
  );
};

const styles = StyleSheet.create({
  buttonContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#e74c3c', // Red
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  touchableArea: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonInner: {
    width: '100%',
    height: '100%',
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e74c3c',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 18,
  },
  progressContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 5,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    overflow: 'hidden',
  },
  progressRing: {
    height: '100%',
    backgroundColor: '#fff',
  }
});

export default SOSButton;