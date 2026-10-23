import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDsliMw7vl7pWokg33iQjRkSACnCJCfpPk",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "midia-ffa0b.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "midia-ffa0b",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "midia-ffa0b.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "507782134715",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:507782134715:web:efe1161ce0093abe3f629e",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-P5HS2CX29X"
};

export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);
