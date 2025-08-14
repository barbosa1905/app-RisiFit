// contexts/UserContext.js
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const UserContext = createContext();

export function UserProvider({ children }) {
  const [user, setUser] = useState(null); // Firebase Auth user object
  const [userDetails, setUserDetails] = useState(null); // Additional user info from Firestore
  const [role, setRole] = useState(null); // Role string ('admin' or 'user')
  const [isLoadingUserDetails, setIsLoadingUserDetails] = useState(false); // Loading state for user details

  const auth = getAuth();
  const db = getFirestore();

  const loadUserDetails = useCallback(async (uid) => {
    if (!uid) {
      setUserDetails(null);
      setRole(null);
      return;
    }
    setIsLoadingUserDetails(true);
    try {
      const userDocRef = doc(db, 'users', uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const data = userDocSnap.data();
        setUserDetails(data);
        setRole(data.role || null);
        console.log('User details loaded:', data);
      } else {
        console.log('No such user document in Firestore!');
        setUserDetails(null);
        setRole(null);
      }
    } catch (error) {
      console.error('Error loading user details from Firestore:', error);
      setUserDetails(null);
      setRole(null);
    } finally {
      setIsLoadingUserDetails(false);
    }
  }, [db]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        await loadUserDetails(currentUser.uid);
      } else {
        setUserDetails(null);
        setRole(null);
      }
    });

    return unsubscribe;
  }, [auth, loadUserDetails]);

  const value = {
    user,
    setUser,
    userDetails,
    setUserDetails,
    role,
    setRole,
    loadUserDetails,
    isLoadingUserDetails,
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}