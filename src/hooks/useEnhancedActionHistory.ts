import { useEffect } from 'react';
import { useUserActionHistory } from './useUserActionHistory';
import { useSimpleAuth } from '@/contexts/SimpleAuthContext';
import { useLocation } from 'react-router-dom';
import { addTestActionsToLocalStorage } from '@/utils/testHistoryActions';

// Hook para registrar automaticamente ações importantes do sistema
export const useEnhancedActionHistory = () => {
  const { addAction } = useUserActionHistory();
  const { userInfo } = useSimpleAuth();
  const location = useLocation();

  // ✅ OTIMIZADO: Tracking de navegação REMOVIDO
  // Motivo: Economiza ~80% de writes no Firebase
  // Impacto: Histórico mostra apenas ações importantes (criar, editar, deletar)
  // Navegação pode ser rastreada via Analytics (Google, etc)

  // REMOVIDO: useEffect de navegação automática
  // Economia: ~16 writes/usuário/dia → ~3 writes/usuário/dia
  // 50 usuários: 800 writes/dia → 150 writes/dia

  // Função para registrar ações manuais (APENAS ações importantes!)
  const logAction = (action: string, details: string, category: 'content' | 'config' | 'import' | 'export' | 'other' = 'other', canUndo: boolean = false, undoData?: any) => {
    addAction(action, details, category, canUndo, undoData);
  };

  // Registrar login inicial e adicionar ações de teste se necessário
  useEffect(() => {
    if (userInfo?.id) {
      const storageKey = `user_actions_${userInfo.id}`;
      const existingActions = localStorage.getItem(storageKey);

      if (!existingActions || JSON.parse(existingActions).length === 0) {
        // Adicionar ações de teste para demonstração
        addTestActionsToLocalStorage(userInfo.id);

        // Força reload das ações no hook
        window.dispatchEvent(new Event('storage'));
      }
    }
  }, [userInfo?.id]);

  return {
    logAction
  };
};