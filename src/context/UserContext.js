import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  onAuthStateChanged,
  signOut,
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
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      if (user) {
        // If a real user logs in, exit guest mode
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

  const enterGuestMode = () => {
    setIsGuest(true);
  };

  const logout = async () => {
    try {
      if (isGuest) {
        // Guest user — just exit guest mode, no Firebase signout needed
        setIsGuest(false);
        showMessage('Guest session ended', 'success');
        return { success: true };
      }
      await signOut(auth);
      showMessage('Logged out successfully', 'success');
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
