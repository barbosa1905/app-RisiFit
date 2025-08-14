// services/firebaseConfig.js
import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyDOP9sg9slVIXrkEvdTpXrL-DRAeolLI8I",
  authDomain: "risifit-4defe.firebaseapp.com",
  projectId: "risifit-4defe",
  storageBucket: "risifit-4defe.appspot.com",
  messagingSenderId: "485424698583",
  appId: "1:485424698583:web:0d6095f3ca5a071b4ccc92",
  measurementId: "G-J7PVBCXMT5"
};

export const app = initializeApp(firebaseConfig);

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

export const db = getFirestore(app);
