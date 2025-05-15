import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { View, Text, StyleSheet, Platform } from 'react-native';
import HomeScreen from '../screens/HomeScreen';
import ProfileScreen from '../screens/ProfileScreen';
import MapScreen from '../screens/MapScreen';
import SettingsScreen from '../screens/SettingsScreen';
import MessagingScreen from '../screens/MessagingScreen';
import FloatingSOSButton from '../components/FloatingSOSButton';

// Create navigators
const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Common screen options for all stacks
const screenOptions = {
  headerStyle: {
    backgroundColor: '#2c3e50',
  },
  headerTintColor: '#fff',
  headerTitleStyle: {
    fontWeight: 'bold',
  },
};

// Home stack navigator to allow nested navigation
const HomeStack = () => {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen 
        name="Home" 
        component={HomeScreen} 
        options={{ 
          title: 'HikerLink',
        }} 
      />
    </Stack.Navigator>
  );
};

// Map stack navigator
const MapStack = () => {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen 
        name="Map" 
        component={MapScreen} 
        options={{ 
          title: 'Trail Map',
        }} 
      />
    </Stack.Navigator>
  );
};

// Messaging stack navigator
const MessagingStack = () => {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen 
        name="Messaging" 
        component={MessagingScreen} 
        options={{ 
          title: 'Offline Messaging',
        }} 
      />
    </Stack.Navigator>
  );
};

// Profile stack navigator
const ProfileStack = () => {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen 
        name="Profile" 
        component={ProfileScreen} 
        options={{ 
          title: 'My Profile',
        }} 
      />
    </Stack.Navigator>
  );
};

// Settings stack navigator
const SettingsStack = () => {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen 
        name="Settings" 
        component={SettingsScreen} 
        options={{ 
          title: 'Settings',
        }} 
      />
    </Stack.Navigator>
  );
};

// Main tab navigator with floating SOS button
const MainNavigator = () => {
  return (
    <View style={{ flex: 1 }}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName;

            if (route.name === 'HomeTab') {
              iconName = focused ? '🏠' : '🏠';
            } else if (route.name === 'MapTab') {
              iconName = focused ? '🗺️' : '🗺️';
            } else if (route.name === 'MessagingTab') {
              iconName = focused ? '💬' : '💬';
            } else if (route.name === 'ProfileTab') {
              iconName = focused ? '👤' : '👤';
            } else if (route.name === 'SettingsTab') {
              iconName = focused ? '⚙️' : '⚙️';
            }

            // Return emoji icons for simplicity
            return (
              <Text style={{ fontSize: size * 0.8 }}>{iconName}</Text>
            );
          },
          tabBarActiveTintColor: '#27ae60',
          tabBarInactiveTintColor: 'gray',
          headerShown: false,
        })}
      >
        <Tab.Screen 
          name="HomeTab" 
          component={HomeStack} 
          options={{ 
            title: 'Home',
          }} 
        />
        <Tab.Screen 
          name="MapTab" 
          component={MapStack} 
          options={{ 
            title: 'Map',
          }} 
        />
        <Tab.Screen 
          name="MessagingTab" 
          component={MessagingStack} 
          options={{ 
            title: 'Chat',
          }} 
        />
        <Tab.Screen 
          name="ProfileTab" 
          component={ProfileStack} 
          options={{ 
            title: 'Profile',
          }} 
        />
        <Tab.Screen 
          name="SettingsTab" 
          component={SettingsStack} 
          options={{ 
            title: 'Settings',
          }} 
        />
      </Tab.Navigator>
      
      {/* Floating SOS Button */}
      <FloatingSOSButton />
    </View>
  );
};

// App's main navigation (Tab navigator)
const AppNavigator = () => {
  return (
    <NavigationContainer>
      <MainNavigator />
    </NavigationContainer>
  );
};

export default AppNavigator;
