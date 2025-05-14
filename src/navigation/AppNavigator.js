import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import HomeScreen from '../screens/HomeScreen';
import ProfileScreen from '../screens/ProfileScreen';
import MapScreen from '../screens/MapScreen';
import SettingsScreen from '../screens/SettingsScreen';
import { Image } from 'react-native';

// Create navigators
const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Home stack navigator to allow nested navigation
const HomeStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#2c3e50',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
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
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#2c3e50',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
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

// Profile stack navigator
const ProfileStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#2c3e50',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
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
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#2c3e50',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
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

// App's main navigation (Tab navigator)
const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName;

            if (route.name === 'HomeTab') {
              iconName = focused ? 'home-focused' : 'home';
            } else if (route.name === 'MapTab') {
              iconName = focused ? 'map-focused' : 'map';
            } else if (route.name === 'ProfileTab') {
              iconName = focused ? 'user-focused' : 'user';
            } else if (route.name === 'SettingsTab') {
              iconName = focused ? 'settings-focused' : 'settings';
            }

            // You can return any component here - using a placeholder for now
            // In a real app, you'd use an actual icon library like react-native-vector-icons
            return (
              <TabBarIcon name={iconName} size={size} color={color} />
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
    </NavigationContainer>
  );
};

// Simple placeholder for tab icons
// In a real app, you would use an icon library
const TabBarIcon = ({ name, size, color }) => {
  return (
    <Image
      style={{
        width: size,
        height: size,
        tintColor: color
      }}
      // This is a placeholder - real app would use an actual icon component
      source={{ uri: `https://via.placeholder.com/${size}x${size}` }}
    />
  );
};

export default AppNavigator;
