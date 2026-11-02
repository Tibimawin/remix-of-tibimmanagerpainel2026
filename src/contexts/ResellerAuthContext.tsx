import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { auth, authReady } from '@/config/firebase';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
} from 'firebase/auth';
import { ResellerService } from '@/services/ResellerService';

export interface ResellerAuthUser {
  uid: string;
  email: string;
  displayName: string;
}

interface ResellerAuthContextType {
  user: ResellerAuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  signup: (data: { nome: string; email: string; password: string; ref: string; whatsapp: string }) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
}

const ResellerAuthContext = createContext<ResellerAuthContextType | undefined>(undefined);
const STORAGE_KEY = 'revenda-auth-user';

export const ResellerAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<ResellerAuthUser | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      const status = localStorage.getItem('revenda-auth-status');
      if (saved && status === 'authenticated') return JSON.parse(saved);
    } catch { /* ignora */ }
    return null;
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
      if (fbUser) {
        const u: ResellerAuthUser = {
          uid: fbUser.uid,
          email: fbUser.email || '',
          displayName: fbUser.displayName || (fbUser.email || '').split('@')[0],
        };
        setUser(u);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
        localStorage.setItem('revenda-auth-status', 'authenticated');
      } else {
        setUser(null);
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem('revenda-auth-status');
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    if (!email || !password) return { success: false, message: 'Informe email e senha.' };
    try {
      setIsLoading(true);
      await authReady;
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      // Confirma que a conta está vinculada a uma revenda (servidor valida o vínculo)
      try {
        await ResellerService.state();
      } catch (err: any) {
        await signOut(auth);
        return {
          success: false,
          message: err?.message?.includes('não encontrada')
            ? 'Esta conta não está vinculada a uma revenda. Use o link de indicação de quem te indicou.'
            : (err?.message || 'Não foi possível entrar.'),
        };
      }
      return { success: true };
    } catch (err: any) {
      const code = err?.code || '';
      let message = 'Email ou senha incorretos.';
      if (code === 'auth/user-not-found') message = 'Conta não encontrada. Faça o cadastro com o link de indicação.';
      else if (code === 'auth/wrong-password') message = 'Senha incorreta.';
      else if (code === 'auth/too-many-requests') message = 'Muitas tentativas. Aguarde alguns minutos.';
      else if (code === 'auth/network-request-failed') message = 'Erro de conexão. Verifique sua internet.';
      return { success: false, message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signup = useCallback(async ({ nome, email, password, ref, whatsapp }: { nome: string; email: string; password: string; ref: string; whatsapp: string }) => {
    if (!ref) return { success: false, message: 'Link de indicação inválido. Peça o link a quem te indicou.' };
    if (!email || !password) return { success: false, message: 'Informe email e senha.' };
    if (password.length < 6) return { success: false, message: 'A senha precisa de pelo menos 6 caracteres.' };
    try {
      setIsLoading(true);
      await authReady;
      const emailNorm = email.trim().toLowerCase();
      const cred = await createUserWithEmailAndPassword(auth, emailNorm, password);
      try { await updateProfile(cred.user, { displayName: nome.trim() || emailNorm.split('@')[0] }); } catch { /* opcional */ }
      try {
        await ResellerService.signup({ ref, nome: nome.trim(), whatsapp: whatsapp.trim(), email: emailNorm });
      } catch (err: any) {
        await signOut(auth);
        return { success: false, message: err?.message || 'Não foi possível vincular sua conta à indicação.' };
      }
      return { success: true };
    } catch (err: any) {
      const code = err?.code || '';
      let message = 'Não foi possível criar a conta.';
      if (code === 'auth/email-already-in-use') message = 'Já existe uma conta com este email. Faça login.';
      else if (code === 'auth/weak-password') message = 'A senha precisa de pelo menos 6 caracteres.';
      else if (code === 'auth/invalid-email') message = 'Email inválido.';
      return { success: false, message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    await signOut(auth);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('revenda-auth-status');
    window.location.href = '/revendas-creditos/login';
  }, []);

  return (
    <ResellerAuthContext.Provider value={{ user, isLoading, isAuthenticated: !!user, login, signup, logout }}>
      {children}
    </ResellerAuthContext.Provider>
  );
};

export const useResellerAuth = () => {
  const ctx = useContext(ResellerAuthContext);
  if (!ctx) throw new Error('useResellerAuth deve ser usado dentro de ResellerAuthProvider');
  return ctx;
};
