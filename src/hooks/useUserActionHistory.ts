import { useState, useEffect, useCallback, useRef } from 'react';
import { useSimpleAuth } from '@/contexts/SimpleAuthContext';
import { db } from '@/config/firebase';
import { collection, doc, setDoc, getDoc, onSnapshot, updateDoc, arrayUnion, query, orderBy, limit } from 'firebase/firestore';

export interface UserAction {
  id: string;
  timestamp: string;
  action: string;
  details: string;
  category: 'content' | 'config' | 'import' | 'export' | 'other';
  canUndo: boolean;
  undoData?: any;
  status: 'completed' | 'undone';
}

export const useUserActionHistory = () => {
  const [actions, setActions] = useState<UserAction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { userInfo } = useSimpleAuth();

  const getStorageKey = () => `user_actions_${userInfo?.id || 'unknown'}`;

  // Carregar histórico prioritariamente do localStorage (LocalStorage-first)
  useEffect(() => {
    if (!userInfo?.id) return;

    const storageKey = getStorageKey();

    try {
      const savedActions = localStorage.getItem(storageKey);
      if (savedActions) {
        const parsedActions = JSON.parse(savedActions);
        setActions(parsedActions);
      }
    } catch (error) {
      console.error('Erro ao carregar histórico do localStorage:', error);
    }
  }, [userInfo?.id]);

  // Sistema de Batching para Firebase (opcional / baixa frequência)
  // Mantido mas desativado por padrão para evitar writes desnecessários.

  const [pendingActions] = useState<UserAction[]>([]);
  const batchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Mantemos a função para possíveis usos futuros, mas atualmente não é chamada.
  const saveBatchToFirebase = useCallback(async (batchActions: UserAction[]) => {
    if (!userInfo?.id || batchActions.length === 0) return;

    try {
      const userActionsRef = doc(db, 'user_actions', userInfo.id);
      const docSnap = await getDoc(userActionsRef);
      const currentActions = docSnap.exists() ? (docSnap.data().actions || []) : [];

      const mergedActions = [...batchActions, ...currentActions]
        .filter((action, index, self) =>
          index === self.findIndex(a => a.id === action.id)
        )
        .slice(0, 100);

      await setDoc(userActionsRef, { actions: mergedActions }, { merge: true });

      console.log(`✅ Batch de ${batchActions.length} ações sincronizado com Firebase`);
    } catch (error) {
      console.error('Erro ao salvar batch no Firebase:', error);
    }
  }, [userInfo?.id]);

  // Como estamos em modo LocalStorage-first, não disparamos mais batchs automaticamente.
  useEffect(() => {
    if (batchTimeoutRef.current) {
      clearTimeout(batchTimeoutRef.current);
    }
    return () => {
      if (batchTimeoutRef.current) {
        clearTimeout(batchTimeoutRef.current);
      }
    };
  }, []);

  // Salvar ações (LocalStorage-first)
  const saveActions = useCallback(async (updatedActions: UserAction[]) => {
    if (!userInfo?.id) return;

    try {
      // Sempre salvar no localStorage imediatamente (fonte principal)
      localStorage.setItem(getStorageKey(), JSON.stringify(updatedActions));
      setActions(updatedActions);
    } catch (error) {
      console.error('Erro ao processar ação:', error);
      localStorage.setItem(getStorageKey(), JSON.stringify(updatedActions));
      setActions(updatedActions);
    }
  }, [userInfo?.id]);

  // Adicionar nova ação
  const addAction = useCallback((
    action: string,
    details: string,
    category: UserAction['category'] = 'other',
    canUndo: boolean = false,
    undoData?: any
  ) => {
    if (!userInfo?.id) return;

    const newAction: UserAction = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toLocaleString('pt-BR'),
      action,
      details,
      category,
      canUndo,
      ...(undoData !== undefined && { undoData }),
      status: 'completed'
    };

    setActions(currentActions => {
      const updatedActions = [newAction, ...currentActions].slice(0, 100); // Manter apenas últimas 100 ações
      saveActions(updatedActions);
      return updatedActions;
    });

    console.log('📝 Nova ação adicionada ao histórico:', newAction);
  }, [userInfo?.id, saveActions]);

  // Desfazer ação
  const undoAction = useCallback(async (actionId: string) => {
    const actionToUndo = actions.find(a => a.id === actionId);

    if (!actionToUndo || !actionToUndo.canUndo || actionToUndo.status === 'undone') {
      console.warn('Ação não pode ser desfeita:', actionToUndo);
      return false;
    }

    setIsLoading(true);

    try {
      // Aqui implementaríamos a lógica específica de desfazer baseada no tipo de ação
      console.log('🔄 Tentando desfazer ação:', actionToUndo);

      // Por enquanto, apenas marcamos como desfeita
      const updatedActions = actions.map(action =>
        action.id === actionId
          ? { ...action, status: 'undone' as const }
          : action
      );

      saveActions(updatedActions);

      // Adicionar ação de "desfazer" ao histórico
      addAction(
        'Ação desfeita',
        `Desfeita: ${actionToUndo.action}`,
        'other',
        false
      );

      console.log('✅ Ação desfeita com sucesso');
      return true;
    } catch (error) {
      console.error('❌ Erro ao desfazer ação:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [actions, addAction, saveActions]);

  // Limpar histórico (LocalStorage-first)
  const clearHistory = useCallback(async () => {
    if (!userInfo?.id) return;

    try {
      localStorage.removeItem(getStorageKey());
      setActions([]);
      console.log('🗑️ Histórico de ações limpo do localStorage');
    } catch (error) {
      console.error('Erro ao limpar histórico local:', error);
    }
  }, [userInfo?.id]);

  // Filtrar ações por categoria
  const getActionsByCategory = useCallback((category: UserAction['category']) => {
    return actions.filter(action => action.category === category);
  }, [actions]);

  // Obter ações recentes (últimas 24h)
  const getRecentActions = useCallback(() => {
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    return actions.filter(action => {
      const actionDate = new Date(action.timestamp.split(' ')[0].split('/').reverse().join('-') + ' ' + action.timestamp.split(' ')[1]);
      return actionDate >= twentyFourHoursAgo;
    });
  }, [actions]);

  return {
    actions,
    isLoading,
    addAction,
    undoAction,
    clearHistory,
    getActionsByCategory,
    getRecentActions
  };
};