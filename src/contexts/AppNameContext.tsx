import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useSimpleAuth } from './SimpleAuthContext';
import { FirebaseUserService } from '@/services/FirebaseUserService';

const DEFAULT_APP_NAME = 'StreamFlix';

const nameKey = (uid: string) => `tibim-app-name-${uid}`;
const skipKey = (uid: string) => `tibim-app-name-skipped-${uid}`;

interface AppNameContextType {
  /** Nome definido pelo usuário (ou null se ainda não definiu) */
  appName: string | null;
  /** Nome pronto para exibir: o definido pelo usuário ou o padrão */
  appDisplayName: string;
  /** Verdadeiro quando já carregamos o valor (localStorage + Firestore) */
  loaded: boolean;
  /** Deve mostrar o diálogo de personalização (primeiro acesso) */
  needsAsk: boolean;
  saveAppName: (name: string) => Promise<{ success: boolean; message?: string }>;
  skipAsking: () => void;
}

const AppNameContext = createContext<AppNameContextType | undefined>(undefined);

export const AppNameProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { userInfo, isAuthenticated } = useSimpleAuth();
  const uid = userInfo?.id ?? null;

  const [appName, setAppName] = useState<string | null>(null);
  const [skipped, setSkipped] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Carregar: primeiro do cache local (rápido), depois do Firestore se não houver cache
  useEffect(() => {
    if (!uid) {
      setAppName(null);
      setSkipped(false);
      setLoaded(false);
      return;
    }
    let cancelled = false;

    const cached = localStorage.getItem(nameKey(uid));
    const didSkip = localStorage.getItem(skipKey(uid)) === 'true';
    setAppName(cached);
    setSkipped(didSkip);
    setLoaded(true);

    if (!cached) {
      FirebaseUserService.getUserById(uid)
        .then((record) => {
          if (!cancelled && record?.appStoreName) {
            try { localStorage.setItem(nameKey(uid), record.appStoreName); } catch { /* noop */ }
            setAppName(record.appStoreName);
          }
        })
        .catch(() => {
          // Firestore indisponível (quota/offline): seguimos só com o cache local
        });
    }

    return () => {
      cancelled = true;
    };
  }, [uid]);

  // Título da aba do navegador acompanha o nome do app do usuário
  useEffect(() => {
    if (appName) {
      document.title = `${appName} • Painel de Gestão`;
    }
  }, [appName]);

  const saveAppName = useCallback(async (rawName: string): Promise<{ success: boolean; message?: string }> => {
    const name = rawName.trim().replace(/\s+/g, ' ');
    if (!uid) return { success: false, message: 'Sessão não encontrada.' };
    if (name.length < 2) return { success: false, message: 'O nome deve ter pelo menos 2 letras.' };
    if (name.length > 40) return { success: false, message: 'Use no máximo 40 caracteres.' };

    // Salvar no Firestore (tolerante a quota/offline — o nome continua válido no dispositivo)
    let cloudWarning: string | undefined;
    try {
      await FirebaseUserService.updateUser(uid, { appStoreName: name });
    } catch (error: any) {
      console.warn('Não foi possível salvar o nome do app no servidor:', error?.code);
      cloudWarning = 'Salvo no dispositivo. Não foi possível sincronizar com o servidor agora.';
    }

    try { localStorage.setItem(nameKey(uid), name); } catch { /* noop */ }
    try { localStorage.removeItem(skipKey(uid)); } catch { /* noop */ }
    setAppName(name);
    setSkipped(false);
    return { success: true, message: cloudWarning };
  }, [uid]);

  const skipAsking = useCallback(() => {
    if (!uid) return;
    try { localStorage.setItem(skipKey(uid), 'true'); } catch { /* noop */ }
    setSkipped(true);
  }, [uid]);

  const needsAsk = isAuthenticated && loaded && !appName && !skipped;

  return (
    <AppNameContext.Provider
      value={{
        appName,
        appDisplayName: appName || DEFAULT_APP_NAME,
        loaded,
        needsAsk,
        saveAppName,
        skipAsking,
      }}
    >
      {children}
    </AppNameContext.Provider>
  );
};

const DEFAULT_FALLBACK_CONTEXT: AppNameContextType = {
  appName: null,
  appDisplayName: DEFAULT_APP_NAME,
  loaded: true,
  needsAsk: false,
  saveAppName: async () => ({ success: false, message: 'AppNameProvider não inicializado' }),
  skipAsking: () => {},
};

export const useAppName = (): AppNameContextType => {
  const context = useContext(AppNameContext);
  if (!context) {
    return DEFAULT_FALLBACK_CONTEXT;
  }
  return context;
};

