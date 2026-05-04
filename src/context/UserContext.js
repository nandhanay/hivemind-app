import React, { createContext, useContext } from 'react';

// Mock user ID for pre-auth development
const MOCK_USER_ID = 'demo-user';
const MOCK_USER_NAME = 'Nandhana';

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const value = {
    userId: MOCK_USER_ID,
    userName: MOCK_USER_NAME,
    isLoggedIn: true, // Always true for now
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
