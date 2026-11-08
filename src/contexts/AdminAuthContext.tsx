
import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'sonner';
import { auth, db } from '@/config/firebase';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  User,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

interface AdminUser {
  id: string;
  nome: string;
  email: string;
  role: 'admin';
}

interface AdminAuthContextType {
  adminUser: AdminUser | null;
  login: (email: string, password: string) => Promise<boolean>;
  loginWithGoogle: () => Promise<boolean>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

// E-mails pré-autorizados como administrador (configurável via env VITE_ADMIN_EMAILS)
const getAuthorizedAdminEmails = (): Set<string> => {
  const emails = new Set<string>(['admin@admin.com']);
  const envEmails = import.meta.env.VITE_ADMIN_EMAILS;
  if (envEmails && typeof envEmails === 'string') {
    envEmails
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)
      .forEach((e) => emails.add(e));
  }
  return emails;
};

/**
 * Validação rigorosa e segura do status de administrador:
 * 1. O usuário precisa estar autenticado no Firebase Auth (auth.currentUser ativo).
 * 2. Verifica se possui Firebase Custom Claim `admin === true` ou `role === 'admin'`.
 * 3. Verifica se o e-mail assinado pelo Firebase Auth está na lista de administradores autorizados.
 * 4. Consulta a coleção segura `systemAdmins/{uid}` ou `users/{uid}` (com role === 'admin') no Firestore.
 */
export const checkIsFirebaseAdmin = async (user: User | null): Promise<boolean> => {
  if (!user || !user.email) return false;

  const normalizedEmail = user.email.trim().toLowerCase();
  const authorizedEmails = getAuthorizedAdminEmails();

  // 1. Verificação por lista de e-mails autorizados
  if (authorizedEmails.has(normalizedEmail)) {
    return true;
  }

  // 2. Verificação por Firebase Custom Claims
  try {
    const idTokenResult = await user.getIdTokenResult();
    if (idTokenResult.claims.admin === true || idTokenResult.claims.role === 'admin') {
      return true;
    }
  } catch (err) {
    console.warn('⚠️ [AdminAuth] Falha ao verificar custom claims:', err);
  }

  // 3. Verificação no Firestore (coleções seguras)
  try {
    const adminDocRef = doc(db, 'systemAdmins', user.uid);
    const adminDoc = await getDoc(adminDocRef);
    if (adminDoc.exists()) {
      return true;
    }

    const userDocRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userDocRef);
    if (userDoc.exists() && userDoc.data()?.role === 'admin') {
      return true;
    }
  } catch (err) {
    // Permissão negada ou erro de rede não concede acesso
    console.warn('⚠️ [AdminAuth] Falha na consulta de admin no Firestore:', err);
  }

  return false;
};

const clearAdminStorage = () => {
  try {
    localStorage.removeItem('admin-user');
    localStorage.removeItem('admin-auth-status');
  } catch {
    // noop
  }
};

export const AdminAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 🛡️ Segurança: O estado inicial é estritamente null e isLoading = true.
  // NUNCA inicializamos com valores do localStorage para evitar bypass por console/DevTools.
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Listener do Firebase Auth: autorização em tempo real criptografada pelo Firebase
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (!firebaseUser) {
          // Nenhum usuário autenticado no Firebase -> Bloquear acesso imediatamente
          setAdminUser(null);
          clearAdminStorage();
          setIsLoading(false);
          return;
        }

        const isAdmin = await checkIsFirebaseAdmin(firebaseUser);

        if (isAdmin) {
          const adminData: AdminUser = {
            id: firebaseUser.uid,
            nome: firebaseUser.displayName || 'Administrador',
            email: firebaseUser.email || '',
            role: 'admin',
          };
          setAdminUser(adminData);
          try {
            localStorage.setItem('admin-user', JSON.stringify(adminData));
            localStorage.setItem('admin-auth-status', 'authenticated');
          } catch {
            // noop
          }
        } else {
          // Usuário logado existe, mas NÃO é administrador -> Revoga qualquer privilégio admin
          setAdminUser(null);
          clearAdminStorage();
        }
      } catch (error) {
        console.error('❌ [AdminAuth] Erro ao validar privilégios administrativos:', error);
        setAdminUser(null);
        clearAdminStorage();
      } finally {
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    if (!email || !password) {
      toast.error('Email e senha são obrigatórios.');
      return false;
    }

    try {
      setIsLoading(true);
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const user = cred.user;

      const isAdmin = await checkIsFirebaseAdmin(user);

      if (isAdmin) {
        const adminData: AdminUser = {
          id: user.uid,
          nome: user.displayName || 'Administrador',
          email: user.email || '',
          role: 'admin',
        };
        setAdminUser(adminData);
        try {
          localStorage.setItem('admin-user', JSON.stringify(adminData));
          localStorage.setItem('admin-auth-status', 'authenticated');
        } catch {}
        toast.success('Login administrativo realizado com sucesso!');
        return true;
      } else {
        toast.error('Acesso Negado: este usuário não possui permissão de administrador.');
        await signOut(auth);
        setAdminUser(null);
        clearAdminStorage();
        return false;
      }
    } catch (error: any) {
      const code = error?.code || '';
      let message = 'Falha ao autenticar.';
      if (code === 'auth/invalid-credential' || code === 'auth/wrong-password') {
        message = 'Credenciais administrativas inválidas.';
      } else if (code === 'auth/user-not-found') {
        message = 'Administrador não cadastrado.';
      } else if (code === 'auth/too-many-requests') {
        message = 'Muitas tentativas. Bloqueado temporariamente.';
      }
      toast.error(message);
      setAdminUser(null);
      clearAdminStorage();
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = async (): Promise<boolean> => {
    try {
      setIsLoading(true);
      const provider = new GoogleAuthProvider();
      const { user } = await signInWithPopup(auth, provider);

      const isAdmin = await checkIsFirebaseAdmin(user);

      if (isAdmin) {
        const adminData: AdminUser = {
          id: user.uid,
          nome: user.displayName || 'Administrador',
          email: user.email || '',
          role: 'admin',
        };
        setAdminUser(adminData);
        try {
          localStorage.setItem('admin-user', JSON.stringify(adminData));
          localStorage.setItem('admin-auth-status', 'authenticated');
        } catch {}
        toast.success('Login administrativo realizado com Google!');
        return true;
      } else {
        toast.error('Acesso Negado: esta conta Google não é administradora.');
        await signOut(auth);
        setAdminUser(null);
        clearAdminStorage();
        return false;
      }
    } catch (error) {
      toast.error('Não foi possível autenticar com Google.');
      setAdminUser(null);
      clearAdminStorage();
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await signOut(auth);
    } catch (error) {
      console.warn('Erro durante signOut:', error);
    } finally {
      setAdminUser(null);
      clearAdminStorage();
      toast.info('Você foi desconectado do painel administrativo.');
      window.location.href = '/admin-login';
    }
  };

  const contextValue = {
    adminUser,
    login,
    loginWithGoogle,
    logout,
    isAuthenticated: Boolean(adminUser && auth.currentUser),
    isLoading,
  };

  return (
    <AdminAuthContext.Provider value={contextValue}>
      {children}
    </AdminAuthContext.Provider>
  );
};

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth deve ser usado dentro de AdminAuthProvider');
  }
  return context;
};
