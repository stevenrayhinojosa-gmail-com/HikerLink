import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  SafeAreaView,
  Alert
} from 'react-native';
import ConnectionStatus from '../components/ConnectionStatus';

const HomeScreen = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.contentContainer}>
        <ConnectionStatus />
        
        <View style={styles.welcomeSection}>
          <Text style={styles.title}>Welcome to HikerLink</Text>
          <Text style={styles.subtitle}>Connect with fellow hikers even without cellular service</Text>
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
              onPress={() => console.log('Track My Hike')}
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
        </View>
      </ScrollView>
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
  },
  infoText: {
    color: '#34495e',
    lineHeight: 20,
  },
});

export default HomeScreen;
