import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { auth, authReady } from '@/config/firebase';

import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';

export interface ResellerUser {
  uid: string;
  email: string;
  nome: string;
  isRegisteredReseller?: boolean;
}

interface ResellerAuthContextType {
  user: ResellerUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isResellerAccount: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, nome: string) => Promise<ResellerUser>;
  logout: () => Promise<void>;
  checkResellerStatus: () => Promise<boolean>;
}

const ResellerAuthContext = createContext<ResellerAuthContextType | undefined>(undefined);

const FRIENDLY_ERRORS: Record<string, string> = {
  'auth/invalid-credential': 'E-mail ou senha incorretos.',
  'auth/invalid-login-credentials': 'E-mail ou senha incorretos.',
  'auth/user-not-found': 'E-mail ou senha incorretos.',
  'auth/wrong-password': 'E-mail ou senha incorretos.',
  'auth/email-already-in-use': 'Este e-mail já possui conta. Faça login.',
  'auth/invalid-email': 'E-mail inválido.',
  'auth/weak-password': 'A senha precisa ter pelo menos 6 caracteres.',
  'auth/too-many-requests': 'Muitas tentativas. Aguarde um instante e tente novamente.',
  'auth/network-request-failed': 'Falha de conexão. Verifique sua internet.',
};

const friendly = (err: any) =>
  FRIENDLY_ERRORS[err?.code] || err?.message?.replace('Firebase: ', '') || 'Não foi possível concluir a operação.';

export const ResellerAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<ResellerUser | null>(null);
  const [isResellerAccount, setIsResellerAccount] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);

  const checkStatusForUid = useCallback(async (uid: string): Promise<boolean> => {
    try {
      const snap = await getDoc(doc(db, 'resellers', uid));
      const exists = snap.exists();
      setIsResellerAccount(exists);
      return exists;
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    let alive = true;
    const boot = async () => {
      await authReady;
      if (!alive) return;
      const unsub = onAuthStateChanged(auth, async firebaseUser => {
        if (!alive) return;
        if (firebaseUser) {
          const u: ResellerUser = {
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            nome: firebaseUser.displayName || (firebaseUser.email || '').split('@')[0],
          };
          setUser(u);
          try {
            const isReg = await checkStatusForUid(firebaseUser.uid);
            if (alive) {
              setUser({ ...u, isRegisteredReseller: isReg });
            }
          } catch { /* ignora */ }
        } else {
          setUser(null);
          setIsResellerAccount(false);
        }
        setIsLoading(false);
      });
      return unsub;
    };
    let unsub: (() => void) | undefined;
    boot().then(u => { unsub = u; });
    return () => {
      alive = false;
      unsub?.();
    };
  }, [checkStatusForUid]);

  const login = useCallback(async (email: string, password: string) => {
    await authReady;
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
      await checkStatusForUid(cred.user.uid);
    } catch (err: any) {
      throw new Error(friendly(err));
    }
  }, [checkStatusForUid]);

  const register = useCallback(async (email: string, password: string, nome: string) => {
    await authReady;
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
      if (nome.trim()) {
        try { await updateProfile(cred.user, { displayName: nome.trim() }); } catch { /* perfil é opcional */ }
      }
      const u = {
        uid: cred.user.uid,
        email: cred.user.email || '',
        nome: nome.trim() || (cred.user.email || '').split('@')[0],
        isRegisteredReseller: false,
      };
      setUser(u);
      return u;
    } catch (err: any) {
      throw new Error(friendly(err));
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await signOut(auth);
      setUser(null);
      setIsResellerAccount(false);
    } catch { /* ignora falha de rede no logout */ }
  }, []);

  const checkResellerStatus = useCallback(async () => {
    if (!auth.currentUser) return false;
    return checkStatusForUid(auth.currentUser.uid);
  }, [checkStatusForUid]);

  const value = useMemo<ResellerAuthContextType>(() => ({
    user,
    isAuthenticated: !!user,
    isLoading,
    isResellerAccount,
    login,
    register,
    logout,
    checkResellerStatus,
  }), [user, isLoading, isResellerAccount, login, register, logout, checkResellerStatus]);

  return <ResellerAuthContext.Provider value={value}>{children}</ResellerAuthContext.Provider>;
};

export const useResellerAuth = () => {
  const ctx = useContext(ResellerAuthContext);
  if (!ctx) throw new Error('useResellerAuth precisa estar dentro de ResellerAuthProvider');
  return ctx;
};

export default ResellerAuthProvider;
