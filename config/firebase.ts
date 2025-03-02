import { initializeApp, getApps } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: 'AIzaSyDwv3eu9uryL-V0UZLSv99REk6gQ54IkXs',
  authDomain: 'mosaic-9c4e1.firebaseapp.com',
  projectId: 'mosaic-9c4e1',
  storageBucket: 'mosaic-9c4e1.firebasestorage.app',
  messagingSenderId: '288157261681',
  appId: '1:288157261681:web:dfb4a68b56371acf4fa0d0',
  measurementId: 'G-0HSDR0VBMD',
};

// Initialize Firebase only if no apps exist (prevent duplicate initialization)
let app;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

// Initialize Auth with AsyncStorage persistence
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

export default app;
