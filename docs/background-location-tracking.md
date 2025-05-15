# Background Location Tracking Documentation

## Overview

HikerLink's background location tracking service provides continuous GPS location updates even when the app is not in the foreground. This document explains how the tracking works, the different tracking modes, and how to use it in your outdoor adventures.

## How It Works

The background location tracking system uses a combination of technologies:

1. **React Native Background Geolocation**: Provides efficient GPS tracking with battery optimization
2. **Background Fetch**: Allows periodic updates even when the app is completely closed
3. **Activity Recognition**: Adjusts tracking frequency based on your movement (walking, running, driving, stationary)
4. **SQLite Database**: Stores location data locally when offline
5. **Firebase Firestore**: Syncs location data to the cloud when connectivity is available

## Tracking Modes

### Power Saving Mode
- **Update Frequency**: Every 5-10 minutes
- **Accuracy**: Within 50-100 meters
- **Battery Impact**: Low
- **Best For**: Multi-day hikes where battery conservation is critical

### Standard Mode (Default)
- **Update Frequency**: Every 1-2 minutes
- **Accuracy**: Within 10-30 meters
- **Battery Impact**: Medium
- **Best For**: Day hikes with moderate need for location precision

### High Accuracy Mode
- **Update Frequency**: Every 10-30 seconds
- **Accuracy**: Within 5-10 meters
- **Battery Impact**: High
- **Best For**: Technical terrain, navigation-critical situations, or short trips

## Background Tracking Option

When "Enable Background Tracking" is toggled on:
- Location updates continue when the app is minimized or the screen is off
- The system uses intelligent algorithms to reduce battery consumption
- A persistent notification shows the tracking status
- Motion detection automatically reduces frequency when stationary

When toggled off:
- Location tracking only works when the app is in the foreground
- The UI will show your current location but won't record your path when not active

## Battery Optimization Strategies

HikerLink employs several strategies to maximize battery life:

1. **Motion-based Updates**: Fewer updates when stationary
2. **Adaptive Sampling**: Dynamically adjusts GPS sampling based on movement speed
3. **Batch Processing**: Collects and processes location data in batches
4. **Geofencing**: Uses less battery-intensive geofencing when applicable
5. **Deferred Updates**: Prioritizes critical updates and defers others when battery is low

## Permissions Required

For full functionality, HikerLink requires these permissions:

- **Location Permission**: Always or While In Use (iOS) / Fine Location (Android)
- **Background Processing**: Allow background app refresh (iOS) / Background processing (Android)
- **Motion & Fitness**: For activity recognition to optimize tracking (iOS only)

## Privacy Considerations

- All location data is stored locally first
- Data is only synced to the cloud when connectivity is available and you're signed in
- You control when tracking starts and stops
- Emergency SOS features may override some privacy settings in critical situations

## Troubleshooting

If tracking isn't working as expected:

1. Check that location permissions are set to "Always" (iOS) or allowed in background (Android)
2. Verify that battery optimization/power saving is disabled for HikerLink
3. Make sure the device has sufficient battery (some devices restrict background activities below 15%)
4. Restart the app if tracking seems inconsistent
5. Check for physical obstructions that might block GPS signals

## Future Enhancements

The development roadmap for the tracking service includes:

- Improved offline map integration with track visualization
- Enhanced battery optimization algorithms
- Altitude and elevation tracking
- Weather data integration
- Group tracking with nearby HikerLink users