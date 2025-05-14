/**
 * Firebase configuration
 */
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || '',
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || '',
  appId: process.env.VITE_FIREBASE_APP_ID || '',
  authDomain: process.env.VITE_FIREBASE_PROJECT_ID ? 
    `${process.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com` : '',
  storageBucket: process.env.VITE_FIREBASE_PROJECT_ID ? 
    `${process.env.VITE_FIREBASE_PROJECT_ID}.appspot.com` : '',
  messagingSenderId: '',
};

export default firebaseConfig;