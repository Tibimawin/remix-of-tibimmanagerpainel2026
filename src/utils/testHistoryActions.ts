// Utility para adicionar ações de teste ao histórico do usuário
import { UserAction } from '@/hooks/useUserActionHistory';

export const generateTestActions = (userId: string): UserAction[] => {
  const now = new Date();
  const testActions: UserAction[] = [
    {
      id: `test_${Date.now()}_1`,
      timestamp: new Date(now.getTime() - 5 * 60 * 1000).toLocaleString('pt-BR'),
      action: 'Login realizado',
      details: 'Usuário fez login no sistema',
      category: 'other',
      canUndo: false,
      status: 'completed'
    },
    {
      id: `test_${Date.now()}_2`,
      timestamp: new Date(now.getTime() - 10 * 60 * 1000).toLocaleString('pt-BR'),
      action: 'Visualizou conteúdos',
      details: 'Acessou a página de conteúdos',
      category: 'content',
      canUndo: false,
      status: 'completed'
    },
    {
      id: `test_${Date.now()}_3`,
      timestamp: new Date(now.getTime() - 15 * 60 * 1000).toLocaleString('pt-BR'),
      action: 'Configuração alterada',
      details: 'Modificou configurações do sistema',
      category: 'config',
      canUndo: true,
      status: 'completed'
    },
    {
      id: `test_${Date.now()}_4`,
      timestamp: new Date(now.getTime() - 20 * 60 * 1000).toLocaleString('pt-BR'),
      action: 'Importação realizada',
      details: 'Importou lista M3U com 150 itens',
      category: 'import',
      canUndo: true,
      status: 'completed'
    },
    {
      id: `test_${Date.now()}_5`,
      timestamp: new Date(now.getTime() - 25 * 60 * 1000).toLocaleString('pt-BR'),
      action: 'Exportação concluída',
      details: 'Exportou dados para arquivo CSV',
      category: 'export',
      canUndo: false,
      status: 'completed'
    }
  ];

  return testActions;
};

export const addTestActionsToLocalStorage = (userId: string) => {
  const storageKey = `user_actions_${userId}`;
  const existingActions = JSON.parse(localStorage.getItem(storageKey) || '[]');
  
  // Se já há ações, não adicionar duplicatas
  if (existingActions.length > 0) {
    return;
  }
  
  const testActions = generateTestActions(userId);
  localStorage.setItem(storageKey, JSON.stringify(testActions));
  console.log('✅ Ações de teste adicionadas ao histórico');
};