
import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, authReady } from '@/config/firebase';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
} from 'firebase/auth';
import { UserInfo, LoginResult, SimpleAuthContextType } from '@/types/authTypes';
import { toast } from '@/hooks/use-toast';

const SimpleAuthContext = createContext<SimpleAuthContextType | undefined>(undefined);

// Janela em ms em que ignoramos um flip transitório para firebaseUser=null
// logo após um login bem-sucedido (Safari iOS pode disparar listener com null
// antes da persistência se estabilizar).
const JUST_LOGGED_IN_KEY = 'auth-just-logged-in';
const JUST_LOGGED_IN_GRACE_MS = 5000;

const markJustLoggedIn = () => {
  try {
    sessionStorage.setItem(JUST_LOGGED_IN_KEY, String(Date.now()));
  } catch {
    // sessionStorage pode falhar em modos restritos — não é crítico
  }
};

export const isWithinLoginGrace = (): boolean => {
  try {
    const ts = Number(sessionStorage.getItem(JUST_LOGGED_IN_KEY) || 0);
    return ts > 0 && Date.now() - ts < JUST_LOGGED_IN_GRACE_MS;
  } catch {
    return false;
  }
};

const isMobileDevice = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
};

export const SimpleAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(() => {
    // Inicializar com dados do localStorage se disponível
    const savedUser = localStorage.getItem('simple-auth-user');
    const authStatus = localStorage.getItem('simple-auth-status');

    if (savedUser && authStatus === 'authenticated') {
      try {
        return JSON.parse(savedUser);
      } catch (error) {
        localStorage.removeItem('simple-auth-user');
        localStorage.removeItem('simple-auth-status');
      }
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    // Capturar resultado do signInWithRedirect (fluxo Google em mobile).
    // Precisa rodar no mount para finalizar a autenticação após o retorno do Google.
    getRedirectResult(auth).catch((err) => {
      if (err?.code && err.code !== 'auth/no-auth-event') {
        console.warn('Firebase: getRedirectResult falhou:', err?.code);
      }
    });

    // Listener do Firebase Auth para manter sessão persistente
    // OTIMIZADO: Usa APENAS Firebase Auth + localStorage (ZERO writes no Firestore)
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        // Se há usuário autenticado no Firebase
        if (firebaseUser) {
          // Verificar se não é admin
          if (firebaseUser.email?.toLowerCase() === 'admin@admin.com') {
            setIsLoading(false);
            return;
          }

          // Verificar se já temos dados no localStorage
          const savedUser = localStorage.getItem('simple-auth-user');
          const authStatus = localStorage.getItem('simple-auth-status');

          if (savedUser && authStatus === 'authenticated') {
            try {
              const userData = JSON.parse(savedUser);

              // Validar que o ID do Firebase corresponde ao salvo
              if (userData.id === firebaseUser.uid) {
                setUserInfo(userData);
                setIsLoading(false);
                return; // ✅ Para aqui, SEM writes no Firestore
              }
            } catch (error) {
              // Se houver erro ao parsear, vamos recriar os dados
              console.error('Erro ao parsear dados salvos:', error);
            }
          }

          // Se não tem dados salvos válidos, criar novo objeto UserInfo
          // IMPORTANTE: Só cria localmente, SEM escrever no Firestore ainda
          const userData: UserInfo = {
            id: firebaseUser.uid,
            email: firebaseUser.email || '',
            diasRestantes: 0,
            totalLogins: 0,
          };

          setUserInfo(userData);
          localStorage.setItem('simple-auth-user', JSON.stringify(userData));
          localStorage.setItem('simple-auth-status', 'authenticated');

          // ✅ REMOVIDO: Não chama Firestore aqui!
          // O registro no Firestore só acontece no LOGIN INICIAL
          // Sessões subsequentes usam APENAS localStorage
        } else {
          // Não há usuário autenticado no Firebase.
          // ⚠️ Safari iOS pode disparar este callback com `null` momentaneamente
          // logo após um login bem-sucedido (antes da persistência se estabilizar).
          // Se acabamos de logar, ignoramos o flip transitório para não derrubar
          // a sessão e mandar o usuário de volta para /login.
          if (isWithinLoginGrace()) {
            console.log('🔐 Ignorando firebaseUser=null durante janela pós-login');
          } else {
            const savedUser = localStorage.getItem('simple-auth-user');
            if (savedUser) {
              localStorage.removeItem('simple-auth-user');
              localStorage.removeItem('simple-auth-status');
              setUserInfo(null);
            }
          }
        }
      } catch (error) {
        console.error('Erro no listener de autenticação:', error);
      } finally {
        setIsLoading(false);
      }
    });

    // Cleanup: remover listener quando componente desmontar
    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string): Promise<LoginResult> => {
    if (!email || !password) {
      const message = 'Email e senha são obrigatórios.';
      toast.error(message);
      return { success: false, message };
    }

    try {
      setIsLoading(true);
      // Garantir que a persistência foi configurada antes do signIn,
      // evitando que o Safari iOS perca a sessão entre a navegação.
      await authReady;
      const credential = await signInWithEmailAndPassword(auth, email, password);
      const user = credential.user;

      // Verificar se não é admin
      if (user.email?.toLowerCase() === 'admin@admin.com') {
        await signOut(auth);
        const message = 'Use o painel administrativo para login de admin.';
        toast.error(message);
        return { success: false, message };
      }


      const userData: UserInfo = {
        id: user.uid,
        email: user.email || '',
        diasRestantes: 0,
        totalLogins: 0,
      };

      setUserInfo(userData);
      localStorage.setItem('simple-auth-user', JSON.stringify(userData));
      localStorage.setItem('simple-auth-status', 'authenticated');
      markJustLoggedIn();

      // ✅ OTIMIZADO: Registrar login e criar usuário no Firestore se não existir
      // IMPORTANTE: Isso é OPCIONAL - Login funciona SEM Firestore!
      // Se quota Firestore excedida, login ainda funciona via Auth + localStorage
      try {
        const { FirebaseUserService } = await import('@/services/FirebaseUserService');

        const existingUser = await FirebaseUserService.getUserById(user.uid);

        if (!existingUser) {
          const defaultUserData = {
            uid: user.uid,
            email: user.email || '',
            name: user.displayName || user.email?.split('@')[0] || 'Usuário',
            accessDays: 1,
            startDate: new Date().toISOString(),
            expiryDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            isActive: true,
            totalLogins: 1,
            createdAt: new Date().toISOString(),
            createdBy: 'self-registration'
          };

          await FirebaseUserService.createUserRecord(defaultUserData);
        } else {
          await FirebaseUserService.recordLogin(user.uid);
        }
        
        // ✅ Registrar dispositivo automaticamente no login
        try {
          const { DeviceManagementService } = await import('@/services/DeviceManagementService');
          await DeviceManagementService.registerDevice(
            user.uid,
            user.email || '',
            user.displayName || user.email?.split('@')[0] || 'Usuário'
          );
          console.log('📱 Dispositivo registrado automaticamente no login');
        } catch (deviceError) {
          console.warn('Não foi possível registrar dispositivo:', deviceError);
          // Não bloqueia o login se falhar
        }
      } catch (error: any) {
        // ✅ QUOTA EXCEDIDA: Não é crítico!
        // Login funciona SEM Firestore
        // Dados já salvos no localStorage
        // Sessão mantida via Firebase Auth
        console.warn('Firestore indisponível (quota?), usando localStorage:', error?.code);

        // Se for erro de quota, avisar mas não falhar login
        if (error?.code === 'resource-exhausted' || error?.message?.includes('quota')) {
          console.log('⚠️ Quota Firestore excedida - Login funciona normalmente via Auth');
        }
      }

      toast.success('Login realizado com sucesso!');
      return { success: true };
    } catch (error: any) {
      const code = error?.code || '';
      let message = 'Falha no login. Verifique suas credenciais.';

      // Mapear erros específicos do Firebase para mensagens amigáveis
      if (code === 'auth/invalid-credential') {
        message = 'Email ou senha incorretos. Verifique suas credenciais e tente novamente.';
      } else if (code === 'auth/wrong-password') {
        message = 'Senha incorreta. Tente novamente ou recupere sua senha.';
      } else if (code === 'auth/user-not-found') {
        message = 'Usuário não encontrado. Verifique o email ou crie uma nova conta.';
      } else if (code === 'auth/invalid-email') {
        message = 'Email inválido. Verifique o formato do email.';
      } else if (code === 'auth/user-disabled') {
        message = 'Esta conta foi desativada. Entre em contato com o suporte.';
      } else if (code === 'auth/too-many-requests') {
        message = 'Muitas tentativas de login. Aguarde alguns minutos e tente novamente.';
      } else if (code === 'auth/network-request-failed') {
        message = 'Erro de conexão. Verifique sua internet e tente novamente.';
      }

      toast.error(message);
      return { success: false, message };
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = async (): Promise<LoginResult> => {
    try {
      setIsLoading(true);
      await authReady;
      const provider = new GoogleAuthProvider();

      // Em mobile (especialmente Safari iOS), popups são bloqueados ou perdem
      // o callback. Usar redirect garante o retorno via getRedirectResult.
      if (isMobileDevice()) {
        markJustLoggedIn();
        await signInWithRedirect(auth, provider);
        // signInWithRedirect navega para fora da página; o retorno é
        // processado por getRedirectResult no mount.
        return { success: true };
      }

      const credential = await signInWithPopup(auth, provider);
      const user = credential.user;

      // Verificar se não é admin
      if (user.email?.toLowerCase() === 'admin@admin.com') {
        await signOut(auth);
        const message = 'Use o painel administrativo para login de admin.';
        toast.error(message);
        return { success: false, message };
      }

      const userData: UserInfo = {
        id: user.uid,
        email: user.email || '',
        diasRestantes: 0,
        totalLogins: 0,
      };

      setUserInfo(userData);
      localStorage.setItem('simple-auth-user', JSON.stringify(userData));
      localStorage.setItem('simple-auth-status', 'authenticated');
      markJustLoggedIn();

      // ✅ OTIMIZADO: Processar usuário no Firestore (OPCIONAL)
      // Login funciona mesmo se Firestore estiver com quota excedida
      try {
        const { FirebaseUserService } = await import('@/services/FirebaseUserService');

        const existingUser = await FirebaseUserService.getUserById(user.uid);

        if (!existingUser) {
          const defaultUserData = {
            uid: user.uid,
            email: user.email || '',
            name: user.displayName || user.email?.split('@')[0] || 'Usuário',
            accessDays: 1,
            startDate: new Date().toISOString(),
            expiryDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            isActive: true,
            totalLogins: 1,
            createdAt: new Date().toISOString(),
            createdBy: 'google-login'
          };

          await FirebaseUserService.createUserRecord(defaultUserData);
        } else {
          await FirebaseUserService.recordLogin(user.uid);
        }
        
        // ✅ Registrar dispositivo automaticamente no login com Google
        try {
          const { DeviceManagementService } = await import('@/services/DeviceManagementService');
          await DeviceManagementService.registerDevice(
            user.uid,
            user.email || '',
            user.displayName || user.email?.split('@')[0] || 'Usuário'
          );
          console.log('📱 Dispositivo registrado automaticamente no login Google');
        } catch (deviceError) {
          console.warn('Não foi possível registrar dispositivo:', deviceError);
          // Não bloqueia o login se falhar
        }
      } catch (error: any) {
        // ✅ QUOTA EXCEDIDA: Login funciona normalmente!
        console.warn('Firestore indisponível (quota?), login Google OK via Auth:', error?.code);
        if (error?.code === 'resource-exhausted' || error?.message?.includes('quota')) {
          console.log('⚠️ Quota Firestore excedida - Login Google funciona via Auth');
        }
      }

      toast.success('Login com Google realizado!');
      return { success: true };
    } catch (error: any) {
      const code = error?.code || '';
      let message = 'Não foi possível entrar com Google. Tente novamente.';

      // Mapear erros específicos do Google Auth
      if (code === 'auth/popup-closed-by-user') {
        message = 'Login cancelado. Tente novamente quando estiver pronto.';
      } else if (code === 'auth/popup-blocked') {
        message = 'Pop-up bloqueado pelo navegador. Habilite pop-ups para este site.';
      } else if (code === 'auth/cancelled-popup-request') {
        message = 'Solicitação cancelada. Apenas uma janela de login pode ser aberta por vez.';
      } else if (code === 'auth/account-exists-with-different-credential') {
        message = 'Já existe uma conta com este email usando outro método de login.';
      } else if (code === 'auth/network-request-failed') {
        message = 'Erro de conexão. Verifique sua internet e tente novamente.';
      }

      toast.error(message);
      return { success: false, message };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      // Limpar dados locais primeiro
      setUserInfo(null);
      localStorage.removeItem('simple-auth-user');
      localStorage.removeItem('simple-auth-status');
      localStorage.removeItem('user-config-cache');
      try { sessionStorage.removeItem(JUST_LOGGED_IN_KEY); } catch { /* noop */ }

      // Fazer signOut do Firebase
      await signOut(auth);

      toast.info('Você foi desconectado.');

      // Redirecionar para login
      window.location.href = '/login';
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      toast.error('Erro ao sair. Tente novamente.');
    }
  };


  return (
    <SimpleAuthContext.Provider value={{
      userInfo,
      login,
      loginWithGoogle,
      logout,

      isAuthenticated: !!userInfo,
      isLoading,
    }}>
      {children}
    </SimpleAuthContext.Provider>
  );
};

export const useSimpleAuth = () => {
  const context = useContext(SimpleAuthContext);
  if (!context) {
    throw new Error('useSimpleAuth deve ser usado dentro de SimpleAuthProvider');
  }
  return context;
};
