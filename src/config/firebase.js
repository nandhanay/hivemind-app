import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { initializeAuth, getReactNativePersistence, getAuth } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: 'AIzaSyDoo10roIpWzEhf-SgOQ_oPX8AUg3bLXyQ',
  authDomain: 'hivemind-app-9485e.firebaseapp.com',
  projectId: 'hivemind-app-9485e',
  storageBucket: 'hivemind-app-9485e.firebasestorage.app',
  messagingSenderId: '753004693511',
  appId: '1:753004693511:web:659c609f041c2352ba02a2',
  measurementId: 'G-FW995WV3TR',
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Use persistent auth so users stay logged in across app restarts.
// initializeAuth must only be called once; if the app was already initialized, use getAuth.
let auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch (e) {
  // If auth was already initialized (e.g. hot reload), fall back to getAuth
  auth = getAuth(app);
}

const db = getFirestore(app);

export { app, auth, db };
