import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getDatabase, Database } from 'firebase/database';
import { getStorage, FirebaseStorage } from 'firebase/storage';

// Explicit Firebase web configuration for project: light-3dc69
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBzKCZLpEyMW1VE9tw7SEF0TJEtKVxfPJc",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "light-3dc69.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "light-3dc69",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "light-3dc69.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "250329336295",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:250329336295:web:36eccbefd8bcbd8b799542",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-LQCQG0QLXM",
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "https://light-3dc69-default-rtdb.firebaseio.com"
};

// Singleton initialization
export const app: FirebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth: Auth = getAuth(app);
export const googleAuthProvider = new GoogleAuthProvider();
googleAuthProvider.setCustomParameters({ prompt: 'select_account' });

export const db: Firestore = getFirestore(app);

// Realtime Database instance (used for real-time presence with offline disconnect triggers)
let rtdbInstance: Database | null = null;
try {
  rtdbInstance = getDatabase(app);
} catch (err) {
  console.warn('[LIGHT Firebase] Realtime Database initialization warning:', err);
}
export const rtdb = rtdbInstance;

// Firebase Storage for user avatars
export const storage: FirebaseStorage = getStorage(app);
