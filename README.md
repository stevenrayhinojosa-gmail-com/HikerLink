# HikerLink

## Overview

HikerLink is a React Native mobile application designed for hikers and outdoor enthusiasts, enabling seamless navigation, location sharing, and connectivity features even in remote areas with limited or no cellular coverage.

## Key Features

- **Offline Communication**: Uses Bluetooth mesh networking to enable device-to-device communication without cellular connectivity
- **Location Tracking**: Multiple power-optimized modes for GPS tracking that balance accuracy and battery life
- **Background Tracking**: Continues to track location even when the app is in the background
- **Offline Maps**: Supports map tile caching for use without internet connectivity
- **Emergency SOS**: Quick access emergency features with location sharing
- **Cross-Platform**: Works on both iOS and Android devices

## Technology Stack

- **Frontend**: React Native, React Native Web
- **State Management**: React Hooks
- **Authentication**: Firebase Authentication
- **Database**: Firebase Firestore with offline support
- **Local Storage**: SQLite
- **Communication**: Bridgefy SDK (simulated in development)
- **Maps**: React Native Maps with tile caching
- **Location Tracking**: React Native Background Geolocation

## Getting Started

### Prerequisites

- Node.js v14 or higher
- npm or yarn
- React Native development environment set up

### Installation

1. Clone the repository
```
git clone https://github.com/yourusername/hikerlink.git
cd hikerlink
```

2. Install dependencies
```
npm install
```

3. Configure Firebase
- Create a Firebase project in the [Firebase Console](https://console.firebase.google.com/)
- Enable Authentication with Google sign-in
- Add your app's domain to the authorized domains list
- Create a `.env` file with your Firebase configuration:
```
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_PROJECT_ID=your_project_id
```

### Running the App

#### Web Version
```
npm run web
```
or for development mode:
```
npx webpack serve --config webpack.config.simple.js --mode=development --port 3000 --host 0.0.0.0
```

**Note**: We've changed the port from 5000 to 3000 to avoid conflicts with macOS Control Center which uses port 5000.

#### iOS
```
npm run ios
```

#### Android
```
npm run android
```

## Usage Guide

### Location Tracking

HikerLink offers three tracking modes:

1. **Power Saving Mode**: Less frequent updates, optimized for battery life
2. **Standard Mode**: Balanced approach to accuracy and power consumption
3. **High Accuracy Mode**: More frequent updates with higher precision

To start tracking:
1. Tap the "Start Tracking" button on the home screen
2. Select your preferred tracking mode
3. Toggle background tracking on/off as needed
4. Click "Start Tracking" to begin

### Emergency Features

In case of emergency:
1. Shake the device (Alt+S on web) or
2. Press and hold the floating SOS button
3. Your location will be shared with connected peers and to the cloud when connectivity is available

## Development Roadmap

- [x] Basic UI implementation
- [x] Location tracking modes
- [x] Background tracking toggle
- [x] Tracking status display
- [ ] Firebase authentication integration
- [ ] Offline map implementation
- [ ] Full Bridgefy SDK integration
- [ ] Complete SOS functionality
- [ ] Friend location sharing
- [ ] Route history and statistics

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- React Native community
- Firebase team
- Bridgefy for mesh networking technology
- All contributors to this project