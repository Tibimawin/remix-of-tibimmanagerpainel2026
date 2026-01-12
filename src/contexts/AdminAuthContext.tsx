
import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'sonner';
import { auth } from '@/config/firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

interface AdminUser {
  id: string;
  nome: string;
  email: string;
  role?: string;
}

interface AdminAuthContextType {
  adminUser: AdminUser | null;
  login: (email: string, password: string) => Promise<boolean>;
  loginWithGoogle: () => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);


export const AdminAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('admin-user');
    const savedStatus = localStorage.getItem('admin-auth-status');
    if (savedUser && savedStatus === 'authenticated') {
      try { setAdminUser(JSON.parse(savedUser)); } catch {}
    }

    // Usar onAuthStateChanged apenas para admin, mas verificar se é admin
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user?.email && user.email.toLowerCase() === 'admin@admin.com') {
        const adminData: AdminUser = { id: user.uid, nome: 'Administrador', email: user.email, role: 'admin' };
        setAdminUser(adminData);
        localStorage.setItem('admin-user', JSON.stringify(adminData));
        localStorage.setItem('admin-auth-status', 'authenticated');
      } else if (!user) {
        // Apenas limpar se o usuário fez logout completo
        const currentAdmin = localStorage.getItem('admin-user');
        if (currentAdmin) {
          // Verificar se o logout foi intencional do admin
          const adminStatus = localStorage.getItem('admin-auth-status');
          if (adminStatus === 'authenticated') {
            // Manter o admin logado se for apenas troca de usuário
            try {
              const adminData = JSON.parse(currentAdmin);
              setAdminUser(adminData);
            } catch {}
          }
        }
      }
      setIsLoading(false);
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
      if (user.email && user.email.toLowerCase() === 'admin@admin.com') {
        const adminData: AdminUser = { id: user.uid, nome: 'Administrador', email: user.email, role: 'admin' };
        setAdminUser(adminData);
        localStorage.setItem('admin-user', JSON.stringify(adminData));
        localStorage.setItem('admin-auth-status', 'authenticated');
        toast.success('Login administrativo realizado com sucesso!');
        return true;
      } else {
        toast.error('Acesso Negado: este usuário não é administrador.');
        await signOut(auth);
        return false;
      }
    } catch (error: any) {
      const code = error?.code || '';
      let message = 'Falha ao autenticar.';
      if (code === 'auth/invalid-credential' || code === 'auth/wrong-password') message = 'Credenciais inválidas.';
      toast.error(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try { 
      // Fazer signOut completo apenas do admin
      await signOut(auth); 
    } catch {}
    setAdminUser(null);
    localStorage.removeItem('admin-user');
    localStorage.removeItem('admin-auth-status');
    toast.info('Você foi desconectado do painel administrativo.');
    window.location.href = '/admin-login';
  };

  const loginWithGoogle = async (): Promise<boolean> => {
    try {
      setIsLoading(true);
      const provider = new GoogleAuthProvider();
      const { user } = await signInWithPopup(auth, provider);
      if (user.email && user.email.toLowerCase() === 'admin@admin.com') {
        const adminData: AdminUser = { id: user.uid, nome: 'Administrador', email: user.email, role: 'admin' };
        setAdminUser(adminData);
        localStorage.setItem('admin-user', JSON.stringify(adminData));
        localStorage.setItem('admin-auth-status', 'authenticated');
        toast.success('Login administrativo realizado com Google!');
        return true;
      } else {
        toast.error('Acesso Negado: esta conta Google não é administradora.');
        await signOut(auth);
        return false;
      }
    } catch (error) {
      toast.error('Não foi possível autenticar com Google.');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const contextValue = {
    adminUser,
    login,
    loginWithGoogle,
    logout,
    isAuthenticated: !!adminUser,
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
