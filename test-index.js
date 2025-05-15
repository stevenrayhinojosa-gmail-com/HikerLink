import { AppRegistry } from 'react-native';
import TestApp from './TestApp';

// Register and run the test app
AppRegistry.registerComponent('TestApp', () => TestApp);

// Run the app on web
if (typeof document !== 'undefined') {
  AppRegistry.runApplication('TestApp', {
    rootTag: document.getElementById('root')
  });
}