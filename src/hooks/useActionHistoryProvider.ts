import { createContext, useContext } from 'react';
import { useUserActionHistory } from './useUserActionHistory';

// Context para fornecer funcionalidades de histórico em toda a aplicação
export const ActionHistoryContext = createContext<{
  logAction: (action: string, details: string, category?: 'content' | 'config' | 'import' | 'export' | 'other', canUndo?: boolean, undoData?: any) => void;
} | null>(null);

export const useActionHistory = () => {
  const context = useContext(ActionHistoryContext);
  if (!context) {
    // Fallback para usar diretamente o hook se não houver contexto
    const { addAction } = useUserActionHistory();
    return {
      logAction: (action: string, details: string, category: 'content' | 'config' | 'import' | 'export' | 'other' = 'other', canUndo = false, undoData?: any) => {
        addAction(action, details, category, canUndo, undoData);
      }
    };
  }
  return context;
};