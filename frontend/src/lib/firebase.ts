import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, connectAuthEmulator } from 'firebase/auth';

const isDemo = !import.meta.env.VITE_FIREBASE_API_KEY;

const firebaseConfig = isDemo
  ? { apiKey: 'demo-key', authDomain: 'demo.firebaseapp.com', projectId: 'demo-thesislab' }
  : {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID,
    };

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const isDemoMode = isDemo;

if (isDemo) {
  // In demo mode, skip real Firebase auth entirely
  console.info('[ThesisLab] No Firebase config found — running in demo mode (auth bypassed)');
}
