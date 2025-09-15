import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Firebase設定
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBXU0edYNK3hjIRBiQxHAhbHbBCkUOzW84",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "mizuno-lab-access-control.firebaseapp.com", 
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "mizuno-lab-access-control",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "mizuno-lab-access-control.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "455588164788",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:455588164788:web:ddbe06b3110a4824d0d3e1"
};

// Firebase設定ログ（デバッグ用）
console.log('Firebase config:', {
  apiKey: firebaseConfig.apiKey ? '***' : 'MISSING',
  authDomain: firebaseConfig.authDomain,
  projectId: firebaseConfig.projectId,
  storageBucket: firebaseConfig.storageBucket,
  messagingSenderId: firebaseConfig.messagingSenderId ? '***' : 'MISSING',
  appId: firebaseConfig.appId ? '***' : 'MISSING',
  environment: import.meta.env.DEV ? 'development' : 'production'
});

// Firebase初期化
const app = initializeApp(firebaseConfig);

// Firebase サービス
export const auth = getAuth(app);
export const db = getFirestore(app);

if (import.meta.env.DEV) {
  console.log('Firebase initialized successfully');
}

export default app;