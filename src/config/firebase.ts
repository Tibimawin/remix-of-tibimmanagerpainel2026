import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyBN7cODHg978T4S2jPvrBsr5sqwZhGidtU",
  authDomain: "tibimmanagerpainelvercel.firebaseapp.com",
  projectId: "tibimmanagerpainelvercel",
  storageBucket: "tibimmanagerpainelvercel.firebasestorage.app",
  messagingSenderId: "915232934037",
  appId: "1:915232934037:web:e9386fab78107ba226339c"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);

// ✅ Garante que o token Firebase persiste no localStorage
// Usuário permanece logado após recarregar a página até fazer logout manual
setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.warn('Firebase: falha ao configurar persistência local:', err);
});

export { app };
