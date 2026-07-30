import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  inMemoryPersistence,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBN7cODHg978T4S2jPvrBsr5sqwZhGidtU",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "tibimmanagerpainelvercel.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "tibimmanagerpainelvercel",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "tibimmanagerpainelvercel.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "915232934037",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:915232934037:web:e9386fab78107ba226339c"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);

// ✅ Persistência resiliente: tenta localStorage → sessionStorage → memória.
// Necessário porque Safari iOS (ITP/private mode/iframe) pode bloquear localStorage,
// fazendo o login "piscar" e o usuário voltar para /login.
export const authReady: Promise<void> = setPersistence(auth, browserLocalPersistence)
  .catch((err) => {
    console.warn('Firebase: persistência local indisponível, tentando session:', err?.code || err);
    return setPersistence(auth, browserSessionPersistence);
  })
  .catch((err) => {
    console.warn('Firebase: persistência session indisponível, usando memória:', err?.code || err);
    return setPersistence(auth, inMemoryPersistence);
  })
  .then(() => {});

export { app };
