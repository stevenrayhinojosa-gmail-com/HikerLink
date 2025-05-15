import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const TestConnect = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Connection Test Successful!</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 10,
    backgroundColor: '#e6ffe6',
    borderRadius: 5,
    margin: 10,
  },
  text: {
    color: '#006600',
    fontWeight: 'bold',
  },
});

export default TestConnect;