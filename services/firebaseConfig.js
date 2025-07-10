// services/firebaseConfig.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';


const firebaseConfig = {
  apiKey: "AIzaSyDOP9sg9slVIXrkEvdTpXrL-DRAeolLI8I",
  authDomain: "risifit-4defe.firebaseapp.com",
  projectId: "risifit-4defe",
  storageBucket: "risifit-4defe.appspot.com",
  messagingSenderId: "485424698583",
  appId: "1:485424698583:web:0d6095f3ca5a071b4ccc92",
  measurementId: "G-J7PVBCXMT5"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  useFetchStreams: false,
});


export { auth, db };