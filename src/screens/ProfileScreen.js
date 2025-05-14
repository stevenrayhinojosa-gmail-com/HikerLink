import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  Switch, 
  ScrollView,
  SafeAreaView
} from 'react-native';

const ProfileScreen = () => {
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [shareLocation, setShareLocation] = useState(true);
  const [isPublicProfile, setIsPublicProfile] = useState(true);

  const saveProfile = () => {
    console.log('Profile saved:', { name, bio, emergencyContact, shareLocation, isPublicProfile });
    // Here we would save to Firebase in the future
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.contentContainer}>
        <View style={styles.profileHeader}>
          <View style={styles.profileImagePlaceholder}>
            <Text style={styles.profileImageText}>
              {name ? name.charAt(0).toUpperCase() : '?'}
            </Text>
          </View>
          <TouchableOpacity style={styles.changePhotoButton}>
            <Text style={styles.changePhotoText}>Change Photo</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.inputSection}>
          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Your name"
            value={name}
            onChangeText={setName}
          />

          <Text style={styles.label}>Bio</Text>
          <TextInput
            style={[styles.input, styles.bioInput]}
            placeholder="Tell other hikers about yourself"
            value={bio}
            onChangeText={setBio}
            multiline
            numberOfLines={4}
          />

          <Text style={styles.label}>Emergency Contact</Text>
          <TextInput
            style={styles.input}
            placeholder="Phone number"
            value={emergencyContact}
            onChangeText={setEmergencyContact}
            keyboardType="phone-pad"
          />

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Share My Location</Text>
            <Switch
              value={shareLocation}
              onValueChange={setShareLocation}
              trackColor={{ false: "#767577", true: "#81b0ff" }}
              thumbColor={shareLocation ? "#27ae60" : "#f4f3f4"}
            />
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Public Profile</Text>
            <Switch
              value={isPublicProfile}
              onValueChange={setIsPublicProfile}
              trackColor={{ false: "#767577", true: "#81b0ff" }}
              thumbColor={isPublicProfile ? "#27ae60" : "#f4f3f4"}
            />
          </View>

          <TouchableOpacity 
            style={styles.saveButton}
            onPress={saveProfile}
          >
            <Text style={styles.saveButtonText}>Save Profile</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.privacyNote}>
          Your profile information will only be shared with other HikerLink users 
          when you are in Bluetooth range or connected to the same network.
        </Text>
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
  profileHeader: {
    alignItems: 'center',
    marginBottom: 30,
  },
  profileImagePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#27ae60',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  profileImageText: {
    color: 'white',
    fontSize: 40,
    fontWeight: 'bold',
  },
  changePhotoButton: {
    padding: 8,
  },
  changePhotoText: {
    color: '#3498db',
    fontWeight: '500',
  },
  inputSection: {
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
    marginBottom: 15,
  },
  bioInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  switchLabel: {
    fontSize: 16,
    color: '#2c3e50',
  },
  saveButton: {
    backgroundColor: '#27ae60',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  saveButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  privacyNote: {
    fontSize: 12,
    color: '#7f8c8d',
    textAlign: 'center',
    marginTop: 20,
  },
});

export default ProfileScreen;
