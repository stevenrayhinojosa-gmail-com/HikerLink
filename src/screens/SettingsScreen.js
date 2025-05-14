import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Switch, 
  ScrollView,
  SafeAreaView,
  Alert
} from 'react-native';

const SettingsScreen = () => {
  const [locationSharing, setLocationSharing] = useState(true);
  const [bluetoothEnabled, setBluetoothEnabled] = useState(true);
  const [offlineMessaging, setOfflineMessaging] = useState(true);
  const [batteryOptimization, setBatteryOptimization] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [emergencyMode, setEmergencyMode] = useState(false);

  const toggleEmergencyMode = () => {
    if (!emergencyMode) {
      // Show confirmation before enabling emergency mode
      Alert.alert(
        "Enable Emergency Mode?",
        "Emergency mode will broadcast your location continuously to nearby hikers and send your emergency contacts an alert if available.",
        [
          {
            text: "Cancel",
            style: "cancel"
          },
          {
            text: "Enable", 
            onPress: () => setEmergencyMode(true),
            style: "destructive"
          }
        ]
      );
    } else {
      setEmergencyMode(false);
    }
  };

  const handleDataReset = () => {
    Alert.alert(
      "Reset App Data",
      "This will delete all your local data including trails, messages, and contacts. This action cannot be undone.",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Reset", 
          onPress: () => console.log("Reset data confirmed"),
          style: "destructive"
        }
      ]
    );
  };

  const signOut = () => {
    console.log("Sign out functionality will be implemented with Firebase");
    // This will be implemented once Firebase is integrated
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.contentContainer}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Connection Settings</Text>
          
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Location Sharing</Text>
              <Text style={styles.settingDescription}>Allow other hikers to see your location</Text>
            </View>
            <Switch
              value={locationSharing}
              onValueChange={setLocationSharing}
              trackColor={{ false: "#767577", true: "#81b0ff" }}
              thumbColor={locationSharing ? "#27ae60" : "#f4f3f4"}
            />
          </View>
          
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Bluetooth</Text>
              <Text style={styles.settingDescription}>Enable Bluetooth connectivity</Text>
            </View>
            <Switch
              value={bluetoothEnabled}
              onValueChange={setBluetoothEnabled}
              trackColor={{ false: "#767577", true: "#81b0ff" }}
              thumbColor={bluetoothEnabled ? "#27ae60" : "#f4f3f4"}
            />
          </View>
          
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Offline Messaging</Text>
              <Text style={styles.settingDescription}>Send and receive messages without internet</Text>
            </View>
            <Switch
              value={offlineMessaging}
              onValueChange={setOfflineMessaging}
              trackColor={{ false: "#767577", true: "#81b0ff" }}
              thumbColor={offlineMessaging ? "#27ae60" : "#f4f3f4"}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Settings</Text>
          
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Battery Optimization</Text>
              <Text style={styles.settingDescription}>Reduce battery usage (decreases update frequency)</Text>
            </View>
            <Switch
              value={batteryOptimization}
              onValueChange={setBatteryOptimization}
              trackColor={{ false: "#767577", true: "#81b0ff" }}
              thumbColor={batteryOptimization ? "#27ae60" : "#f4f3f4"}
            />
          </View>
          
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Push Notifications</Text>
              <Text style={styles.settingDescription}>Receive alerts when back online</Text>
            </View>
            <Switch
              value={pushNotifications}
              onValueChange={setPushNotifications}
              trackColor={{ false: "#767577", true: "#81b0ff" }}
              thumbColor={pushNotifications ? "#27ae60" : "#f4f3f4"}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Emergency Settings</Text>
          
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Emergency Mode</Text>
              <Text style={styles.settingDescription}>Broadcast continuous emergency signal</Text>
            </View>
            <Switch
              value={emergencyMode}
              onValueChange={toggleEmergencyMode}
              trackColor={{ false: "#767577", true: "#e74c3c" }}
              thumbColor={emergencyMode ? "#e74c3c" : "#f4f3f4"}
            />
          </View>
          
          <TouchableOpacity 
            style={styles.emergencyButton}
            onPress={() => console.log("Emergency contacts")}
          >
            <Text style={styles.buttonText}>Manage Emergency Contacts</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          
          <TouchableOpacity 
            style={styles.accountButton}
            onPress={signOut}
          >
            <Text style={styles.buttonText}>Sign Out</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.accountButton, styles.dangerButton]}
            onPress={handleDataReset}
          >
            <Text style={styles.buttonText}>Reset App Data</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.versionText}>HikerLink v1.0.0</Text>
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
  section: {
    marginBottom: 25,
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 15,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingInfo: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    color: '#2c3e50',
    marginBottom: 3,
  },
  settingDescription: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  emergencyButton: {
    backgroundColor: '#e74c3c',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 15,
  },
  accountButton: {
    backgroundColor: '#3498db',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  dangerButton: {
    backgroundColor: '#e74c3c',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  versionText: {
    fontSize: 12,
    color: '#7f8c8d',
    textAlign: 'center',
    marginTop: 20,
  },
});

export default SettingsScreen;
