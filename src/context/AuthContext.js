import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  signInWithPopup,
  GoogleAuthProvider,
  updateProfile as updateAuthProfile,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isApproved, setIsApproved] = useState(false);
  const [loading, setLoading] = useState(true);

  // Sign up: create Firebase Auth account + Firestore profile
  async function signup(email, password) {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    await setDoc(doc(db, 'users', credential.user.uid), {
      email,
      isApproved: false,
      createdAt: serverTimestamp(),
    });
    return credential;
  }

  // Google Login: create Firestore profile if first time
  async function googleLogin() {
    const provider = new GoogleAuthProvider();
    const credential = await signInWithPopup(auth, provider);
    const userDocRef = doc(db, 'users', credential.user.uid);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      await setDoc(userDocRef, {
        email: credential.user.email,
        isApproved: false,
        createdAt: serverTimestamp(),
      });
    }
    return credential;
  }

  // Login: Firebase Auth only — approval is checked via onAuthStateChanged
  function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  // Logout
  function logout() {
    return signOut(auth);
  }

  async function updateProfileName(name) {
    const user = auth.currentUser;
    const trimmedName = name.trim();

    if (!user) {
      throw new Error('You must be logged in to update your profile.');
    }

    if (!trimmedName) {
      throw new Error('Name is required.');
    }

    const userRef = doc(db, 'users', user.uid);
    const snapshot = await getDoc(userRef);

    if (snapshot.exists()) {
      await updateDoc(userRef, {
        name: trimmedName,
      });
    } else {
      await setDoc(
        userRef,
        {
          email: user.email || '',
          name: trimmedName,
          isApproved: false,
          createdAt: serverTimestamp(),
        },
        { merge: true }
      );
    }

    try {
      await updateAuthProfile(user, { displayName: trimmedName });
    } catch (error) {
      console.error('Unable to update Firebase Auth display name:', error);
    }

    setProfile((prev) => ({
      ...(prev || {}),
      email: user.email || '',
      name: trimmedName,
      isApproved: prev?.isApproved ?? isApproved,
    }));
  }

  // Listen to auth state changes and load the Firestore approval status
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);

      if (user) {
        try {
          const snap = await getDoc(doc(db, 'users', user.uid));
          const profileData = snap.exists() ? snap.data() : null;
          setProfile(profileData);
          setIsApproved(profileData?.isApproved === true);
        } catch {
          setProfile(null);
          setIsApproved(false);
        }
      } else {
        setProfile(null);
        setIsApproved(false);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const profileName = profile?.name?.trim() || '';
  const hasProfileName = profileName.length > 0;
  const suggestedName = profileName || currentUser?.displayName?.trim() || '';

  const value = {
    currentUser,
    profile,
    profileName,
    suggestedName,
    hasProfileName,
    isApproved,
    loading,
    signup,
    googleLogin,
    login,
    logout,
    updateProfileName,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
