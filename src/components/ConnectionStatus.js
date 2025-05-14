import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';

const ConnectionStatus = () => {
  const [connectionType, setConnectionType] = useState('offline');
  const [nearbyDevices, setNearbyDevices] = useState(0);
  
  useEffect(() => {
    // Simulate checking connection type and nearby devices
    // In a real app, this would use actual Bluetooth and network detection
    const simulateConnectionCheck = () => {
      // Randomly choose a connection type for demonstration
      const connectionTypes = ['cellular', 'wifi', 'bluetooth', 'offline'];
      const randomConnection = connectionTypes[Math.floor(Math.random() * connectionTypes.length)];
      setConnectionType(randomConnection);
      
      // Simulate finding nearby devices
      if (randomConnection === 'bluetooth') {
        setNearbyDevices(Math.floor(Math.random() * 5) + 1);
      } else {
        setNearbyDevices(0);
      }
    };
    
    // Check on mount
    simulateConnectionCheck();
    
    // Set up interval to periodically check
    const interval = setInterval(simulateConnectionCheck, 30000);
    
    return () => clearInterval(interval);
  }, []);
  
  const getStatusColor = () => {
    switch (connectionType) {
      case 'cellular':
        return '#3498db'; // blue
      case 'wifi':
        return '#27ae60'; // green
      case 'bluetooth':
        return '#9b59b6'; // purple
      case 'offline':
      default:
        return '#e74c3c'; // red
    }
  };
  
  const getStatusText = () => {
    switch (connectionType) {
      case 'cellular':
        return 'Cellular';
      case 'wifi':
        return 'Wi-Fi';
      case 'bluetooth':
        return `Bluetooth (${nearbyDevices} nearby)`;
      case 'offline':
      default:
        return 'Offline';
    }
  };
  
  return (
    <View style={styles.container}>
      <View style={[styles.statusIndicator, { backgroundColor: getStatusColor() }]} />
      <Text style={styles.statusText}>{getStatusText()}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statusIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  statusText: {
    color: '#2c3e50',
    fontWeight: '500',
    fontSize: 14,
  },
});

export default ConnectionStatus;
