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
  const [message, setMessage] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
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

  const logout = async () => {
    try {
      const { logout } = useUser();
      await logout();
      showMessage('Logged out successfully', 'success');
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const getCurrentUser = () => auth.currentUser;

  const value = useMemo(
    () => ({
      user: firebaseUser,
      userId: firebaseUser?.uid || null,
      userName: getUserName(firebaseUser),
      isLoggedIn: Boolean(firebaseUser),
      authInitializing,
      message,
      clearMessage,
      logout,
      getCurrentUser,
    }),
    [firebaseUser, authInitializing, message]
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
