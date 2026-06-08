import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { initializeAuth, getReactNativePersistence, getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ---------------------------------------------------------------------------
// Environment variable validation
// ---------------------------------------------------------------------------
const REQUIRED_FIREBASE_VARS = {
  EXPO_PUBLIC_FIREBASE_API_KEY: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  EXPO_PUBLIC_FIREBASE_PROJECT_ID: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  EXPO_PUBLIC_FIREBASE_APP_ID: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const OPTIONAL_FIREBASE_VARS = {
  EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

const missingVars = Object.entries(REQUIRED_FIREBASE_VARS)
  .filter(([, value]) => !value)
  .map(([key]) => key);

if (missingVars.length > 0) {
  console.error(
    `[HiveMind] ❌ Missing REQUIRED Firebase environment variables:\n` +
    missingVars.map(v => `  - ${v}`).join('\n') +
    `\nFirebase will NOT initialise correctly. The app may show errors.`
  );
} else {
  console.log('[HiveMind] ✅ All required Firebase environment variables are present.');
}

Object.entries(OPTIONAL_FIREBASE_VARS).forEach(([key, value]) => {
  if (!value) {
    console.warn(`[HiveMind] ⚠️  Optional Firebase variable missing: ${key}`);
  }
});

// ---------------------------------------------------------------------------
// Firebase initialisation (crash-safe)
// ---------------------------------------------------------------------------
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

let app = null;
let auth = null;
let db = null;
let storage = null;

try {
  app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  console.log('[HiveMind] ✅ Firebase App Initialized');

  // Use persistent auth so users stay logged in across app restarts.
  // initializeAuth must only be called once; if the app was already initialized, use getAuth.
  try {
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch (e) {
    // If auth was already initialized (e.g. hot reload), fall back to getAuth
    auth = getAuth(app);
  }
  console.log('[HiveMind] ✅ Firebase Auth Initialized');

  db = getFirestore(app);
  console.log('[HiveMind] ✅ Firestore Initialized');

  storage = getStorage(app);
  console.log('[HiveMind] ✅ Firebase Storage Initialized');
} catch (error) {
  console.error('[HiveMind] ❌ Firebase initialization FAILED:', error.message || error);
  console.error('[HiveMind] The app will continue running but Firebase features will be unavailable.');
  // app/auth/db/storage remain null — callers must handle this gracefully
}

export { app, auth, db, storage };
