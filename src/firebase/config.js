import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyDoo10roIpWzEhf-SgOQ_oPX8AUg3bLXyQ',
  authDomain: 'hivemind-app-9485e.firebaseapp.com',
  projectId: 'hivemind-app-9485e',
  storageBucket: 'hivemind-app-9485e.firebasestorage.app',
  messagingSenderId: '753004693511',
  appId: '1:753004693511:web:659c609f041c2352ba02a2',
  measurementId: 'G-FW995WV3TR',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { app, db };
