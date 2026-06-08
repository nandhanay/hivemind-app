import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  onAuthStateChanged,
  signOut,
  signInAnonymously,
} from 'firebase/auth';
import { auth } from '../config/firebase';

const UserContext = createContext();

const getUserName = (firebaseUser) => {
  if (!firebaseUser) return '';
  if (firebaseUser.displayName) return firebaseUser.displayName;
  if (firebaseUser.email) return firebaseUser.email.split('@')[0];
  return 'HiveMind User';
};

export const UserProvider = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [authInitializing, setAuthInitializing] = useState(true);
  const [isGuest, setIsGuest] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    console.log('[HiveMind] UserProvider: Setting up auth listener...');
    if (!auth) {
      console.error('[HiveMind] ❌ Firebase auth is null — Firebase may have failed to initialize. Skipping auth listener.');
      setAuthInitializing(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log(`[HiveMind] Auth state changed: ${user ? 'signed in' : 'signed out'}`);
      setFirebaseUser(user);
      if (user) {
        setIsGuest(user.isAnonymous);
      } else {
        setIsGuest(false);
      }
      setAuthInitializing(false);
    });
    return unsubscribe;
  }, []);


  const showMessage = (text, type = 'success') => {
    setMessage({ text, type, id: Date.now() });
  };

  const clearMessage = () => {
    setMessage(null);
  };

  const enterGuestMode = async () => {
    try {
      setAuthInitializing(true);
      await signInAnonymously(auth);
      setIsGuest(true);
    } catch (error) {
      console.warn('Firebase anonymous auth failed (make sure it is enabled in Firebase Console):', error);
      setIsGuest(true);
    } finally {
      setAuthInitializing(false);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setIsGuest(false);
      showMessage('Session ended', 'success');
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      return { success: false, error: error.message };
    }
  };

  const getCurrentUser = () => auth.currentUser;

  const value = useMemo(
    () => ({
      user: firebaseUser,
      userId: firebaseUser?.uid || null,
      userName: isGuest ? 'Guest' : getUserName(firebaseUser),
      isLoggedIn: Boolean(firebaseUser),
      isGuest,
      authInitializing,
      message,
      showMessage,
      clearMessage,
      logout,
      enterGuestMode,
      getCurrentUser,
    }),
    [firebaseUser, authInitializing, isGuest, message]
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
