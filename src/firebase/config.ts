import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Firebase設定
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || "AIzaSyBXU0edYNK3hjIRBiQxHAhbHbBCkUOzW84",
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || "mizuno-lab-access-control.firebaseapp.com",
  projectId: process.env.FIREBASE_PROJECT_ID || "mizuno-lab-access-control",
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "mizuno-lab-access-control.firebasestorage.app",
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "455588164788",
  appId: process.env.FIREBASE_APP_ID || "1:455588164788:web:ddbe06b3110a4824d0d3e1"
};

// Firebase初期化
const app = initializeApp(firebaseConfig);

// Firebase サービス
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;