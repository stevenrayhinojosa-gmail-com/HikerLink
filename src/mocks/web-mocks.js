// Web mocks for React Native modules that are not compatible with web

// Mock for react-native-fs
const RNFS = {
  DocumentDirectoryPath: '/documents',
  ExternalDirectoryPath: '/external',
  exists: (path) => Promise.resolve(true),
  mkdir: (path) => Promise.resolve(true),
  readdir: (path) => Promise.resolve([]),
  stat: (path) => Promise.resolve({ size: 0 }),
  unlink: (path) => Promise.resolve(true),
  downloadFile: () => ({
    promise: Promise.resolve({ statusCode: 200 })
  })
};

// Mock for react-native-geolocation-service
const Geolocation = {
  getCurrentPosition: (successCallback, errorCallback, options) => {
    successCallback({
      coords: {
        latitude: 37.7749,
        longitude: -122.4194,
        altitude: 0,
        accuracy: 5,
        heading: 0,
        speed: 0,
      },
      timestamp: Date.now(),
    });
    return true;
  },
  watchPosition: (successCallback, errorCallback, options) => {
    const id = setInterval(() => {
      successCallback({
        coords: {
          latitude: 37.7749 + (Math.random() * 0.001 - 0.0005),
          longitude: -122.4194 + (Math.random() * 0.001 - 0.0005),
          altitude: 0,
          accuracy: 5,
          heading: 0,
          speed: 0,
        },
        timestamp: Date.now(),
      });
    }, options?.interval || 5000);
    return id;
  },
  clearWatch: (id) => {
    clearInterval(id);
  },
  stopObserving: () => {},
};

// Mock for react-native-maps
const MapView = (props) => {
  // This will be replaced in the actual components
  return null;
};

MapView.Marker = (props) => null;
MapView.UrlTile = (props) => null;
MapView.PROVIDER_GOOGLE = 'google';

export { RNFS, Geolocation, MapView };