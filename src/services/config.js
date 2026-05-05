import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyDoo10roIpWzEhf-SgOQ_oPX8AUg3bLXyQ',
  authDomain: 'hivemind-app-9485e.firebaseapp.com',
  projectId: 'hivemind-app-9485e',
  storageBucket: 'hivemind-app-9485e.firebasestorage.app',
  messagingSenderId: '753004693511',
  appId: '1:753004693511:web:659c609f041c2352ba02a2',
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);

export { app, auth };
