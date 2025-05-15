# Firebase Integration Guide

## Overview

HikerLink uses Firebase to provide cloud-based services when internet connectivity is available. This document explains how Firebase integrates with the application, what services are used, and how to set up your own Firebase project.

## Firebase Services Used

HikerLink utilizes the following Firebase services:

1. **Authentication**: For user login and identity management
2. **Firestore**: Cloud database for storing location history, user profiles, and friend connections
3. **Cloud Messaging**: For delivering notifications when friends share their location or send SOS alerts
4. **Cloud Functions**: For processing background tasks like geofence alerts or emergency notifications

## Setting Up Firebase

### 1. Create a Firebase Project

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Enter a project name (e.g., "HikerLink")
4. Follow the setup wizard (you can enable Google Analytics if desired)

### 2. Configure Authentication

1. In the Firebase console, go to "Authentication" → "Sign-in method"
2. Enable Google Sign-in
3. Add your app's domain to the "Authorized domains" list
4. (Optional) Enable other authentication methods like Email/Password or Apple

### 3. Set Up Firestore Database

1. Go to "Firestore Database" in the Firebase console
2. Click "Create database"
3. Choose "Start in production mode"
4. Select a location closest to your primary user base

### 4. Create a Web App

1. In the Firebase console, click the gear icon and select "Project settings"
2. In the "Your apps" section, click the web icon (</>) to add a web app
3. Register your app with a nickname (e.g., "HikerLink Web")
4. Copy the configuration object for later use

### 5. Configure HikerLink with Firebase Credentials

Add the following environment variables to your project:

```
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_PROJECT_ID=your_project_id
```

## Data Structure

HikerLink uses the following collections in Firestore:

### Users Collection
```
users/{userId}
  - displayName: string
  - email: string
  - photoURL: string
  - lastActive: timestamp
  - fcmToken: string (for push notifications)
  - privacySettings: { object of settings }
```

### Locations Collection
```
locations/{userId}/history/{locationId}
  - timestamp: timestamp
  - coords: {
      latitude: number,
      longitude: number,
      altitude: number,
      accuracy: number,
      speed: number
    }
  - activity: string (walking, running, driving, etc.)
  - batterySaving: boolean
  - isEmergency: boolean
```

### Connections Collection
```
connections/{connectionId}
  - users: [userId1, userId2]
  - status: string (pending, accepted, blocked)
  - createdAt: timestamp
  - lastInteraction: timestamp
```

### Emergency Alerts Collection
```
emergencyAlerts/{alertId}
  - userId: string
  - timestamp: timestamp
  - location: {
      latitude: number,
      longitude: number
    }
  - message: string
  - status: string (active, resolved, false_alarm)
  - viewedBy: [array of userIds]
```

## Authentication Flow

1. User initiates sign-in via the Login button
2. The app redirects to Google authentication
3. Upon successful authentication, Firebase returns user credentials
4. The app stores authentication state and updates the user record
5. When online, the app refreshes the authentication token automatically

## Offline/Online Synchronization

HikerLink implements a comprehensive offline-first strategy:

1. All data is first stored in the local SQLite database
2. When online, the app syncs local data to Firestore
3. Firebase's offline persistence caches data for offline use
4. Conflict resolution follows "last write wins" with timestamp verification
5. Critical emergency data gets priority in the sync queue

## Security Rules

Firebase security rules ensure that users can only access their own data and data that has been explicitly shared with them. Example rules:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;
    }
    
    // Location history - can be read by friends
    match /locations/{userId}/history/{locationId} {
      allow read: if request.auth.uid == userId || 
        exists(/databases/$(database)/documents/connections/$(existingConnection()));
      allow write: if request.auth.uid == userId;
    }
    
    // Helper function to check if connection exists
    function existingConnection() {
      return /databases/$(database)/documents/connections
        .where("users", "array-contains", request.auth.uid)
        .where("users", "array-contains", userId)
        .where("status", "==", "accepted");
    }
  }
}
```

## Future Enhancements

Planned Firebase integrations include:

- Real-time location sharing between connected users
- Cloud Functions for automated emergency escalation
- Integration with weather APIs for trail condition alerts
- Analytics to improve app performance and battery usage
- Remote configuration for feature flags and app updates