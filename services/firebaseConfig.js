// services/firebaseConfig.js
import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Config do teu projeto Firebase (podes manter assim)
const firebaseConfig = {
  apiKey: 'AIzaSyDOP9sg9slVIXrkEvdTpXrL-DRAeolLI8I',
  authDomain: 'risifit-4defe.firebaseapp.com',
  projectId: 'risifit-4defe',
  storageBucket: 'risifit-4defe.appspot.com',
  messagingSenderId: '485424698583',
  appId: '1:485424698583:web:0d6095f3ca5a071b4ccc92',
  measurementId: 'G-J7PVBCXMT5',
};

// Inicializa app
export const app = initializeApp(firebaseConfig);

// Auth com persistência para React Native
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

// Firestore
export const db = getFirestore(app);

// Cloud Functions (usa a MESMA região do deploy; pelo teu log é 'us-central1')
export const functions = getFunctions(app, 'us-central1');

/* 
// Se no futuro mudares a região no backend para europa:
export const functions = getFunctions(app, 'europe-west1');
*/
