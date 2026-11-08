import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useUserActionHistory, UserAction } from '@/hooks/useUserActionHistory';
import { 
  History, 
  Undo2, 
  Trash2, 
  FileText, 
  Settings, 
  Download, 
  Upload, 
  MoreHorizontal,
  Clock,
  CheckCircle,
  XCircle,
  Copy
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const UserActionHistory = () => {
  const { 
    actions, 
    isLoading, 
    addAction,
    undoAction, 
    clearHistory, 
    getActionsByCategory, 
    getRecentActions 
  } = useUserActionHistory();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const handleUndoAction = async (actionId: string) => {
    const success = await undoAction(actionId);
    
    if (success) {
      toast.success("Ação desfeita com sucesso");
    } else {
      toast.error("Não foi possível desfazer esta ação");
    }
  };

  const handleClearHistory = () => {
    if (window.confirm('Tem certeza que deseja limpar todo o histórico de ações?')) {
      clearHistory();
      toast.success("Histórico limpo - Todas as ações foram removidas");
    }
  };

  const getCategoryIcon = (category: UserAction['category']) => {
    switch (category) {
      case 'content':
        return <FileText className="h-4 w-4" />;
      case 'config':
        return <Settings className="h-4 w-4" />;
      case 'import':
        return <Upload className="h-4 w-4" />;
      case 'export':
        return <Download className="h-4 w-4" />;
      default:
        return <MoreHorizontal className="h-4 w-4" />;
    }
  };

  const getCategoryColor = (category: UserAction['category']) => {
    switch (category) {
      case 'content':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'config':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      case 'import':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'export':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const getFilteredActions = () => {
    if (selectedCategory === 'all') return actions;
    if (selectedCategory === 'recent') return getRecentActions();
    return getActionsByCategory(selectedCategory as UserAction['category']);
  };

  const filteredActions = getFilteredActions();

  // Dados agregados de importação
  const importActions = useMemo(() => actions.filter(a => a.category === 'import'), [actions]);
  const allImportNames = useMemo(() => {
    const names: string[] = [];
    importActions.forEach(a => {
      const list = Array.isArray((a as any).undoData?.names) ? (a as any).undoData.names : [];
      list.forEach((n: string) => {
        const clean = (n || '').toString().trim();
        if (clean) names.push(clean);
      });
    });
    // únicos preservando ordem
    return Array.from(new Set(names));
  }, [importActions]);

  const [importSearchTerm, setImportSearchTerm] = useState('');
  const filteredImportActions = useMemo(() => {
    if (!importSearchTerm) return filteredActions;
    const term = importSearchTerm.toLowerCase();
    return filteredActions.filter(a => {
      const names: string[] = Array.isArray((a as any).undoData?.names) ? (a as any).undoData.names : [];
      return names.some(n => (n || '').toString().toLowerCase().includes(term));
    });
  }, [filteredActions, importSearchTerm]);

  const copyAllImportNames = async () => {
    if (allImportNames.length === 0) {
      toast.info('Nenhum nome de importação disponível');
      return;
    }
    try {
      await navigator.clipboard.writeText(allImportNames.join('\n'));
      toast.success('Todos os nomes de importação copiados');
    } catch (e) {
      toast.error('Falha ao copiar nomes');
      console.error(e);
    }
  };

  const exportImportCSV = () => {
    // Uma linha por nome: timestamp,actionId,name
    const lines: string[] = ['timestamp,action_id,name'];
    importActions.forEach(a => {
      const ts = a.timestamp;
      const id = a.id;
      const names: string[] = Array.isArray((a as any).undoData?.names) ? (a as any).undoData.names : [];
      names.forEach(n => {
        const safe = (n || '').toString().replace(/"/g, '""');
        lines.push(`"${ts}","${id}","${safe}"`);
      });
    });
    const csv = lines.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'historico_importacoes.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('CSV de importações gerado');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5" />
          <h2 className="text-2xl font-semibold">Histórico de Ações</h2>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              // Adicionar ações de exemplo para demonstração
              addAction?.('Teste de ação', 'Ação adicionada para demonstração do sistema', 'other', true);
              addAction?.('Visualizou conteúdo', 'Abriu lista de conteúdos para edição', 'content', false);
              addAction?.('Importação teste', 'Simulou importação de 50 itens M3U', 'import', true);
              toast.success("Ações de teste adicionadas ao histórico!");
            }}
            disabled={actions.length > 10}
          >
            {actions.length === 0 ? 'Adicionar Ações de Teste' : 'Adicionar Mais Ações'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearHistory}
            disabled={actions.length === 0}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Limpar Histórico
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Suas Ações Recentes</CardTitle>
          <CardDescription>
            Visualize e gerencie suas ações no sistema. Algumas ações podem ser desfeitas.
            {actions.length === 0 && (
              <span className="block mt-2 text-orange-600 dark:text-orange-400">
                💡 Clique em "Adicionar Ações de Teste" para ver o sistema funcionando!
              </span>
            )}
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="all">Todas</TabsTrigger>
              <TabsTrigger value="recent">Recentes</TabsTrigger>
              <TabsTrigger value="content">Conteúdo</TabsTrigger>
              <TabsTrigger value="config">Config</TabsTrigger>
              <TabsTrigger value="import">Import</TabsTrigger>
              <TabsTrigger value="export">Export</TabsTrigger>
            </TabsList>

            <TabsContent value={selectedCategory} className="mt-4">
              {filteredActions.length === 0 ? (
                <div className="text-center py-8">
                  <History className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Nenhuma ação encontrada</h3>
                  <p className="text-muted-foreground">
                    {selectedCategory === 'all' 
                      ? 'Suas ações aparecerão aqui conforme você usa o sistema.'
                      : 'Nenhuma ação encontrada para esta categoria.'
                    }
                  </p>
                </div>
              ) : selectedCategory === 'import' ? (
                // Renderização especializada para histórico de importação
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <Input
                      placeholder="Buscar por nome importado..."
                      value={importSearchTerm}
                      onChange={e => setImportSearchTerm(e.target.value)}
                      className="max-w-sm"
                    />
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={copyAllImportNames}>
                        <Copy className="h-4 w-4 mr-2" /> Copiar todos
                      </Button>
                      <Button variant="outline" size="sm" onClick={exportImportCSV}>
                        <Download className="h-4 w-4 mr-2" /> Exportar CSV
                      </Button>
                    </div>
                  </div>
                  <ScrollArea className="h-[460px]">
                  <div className="space-y-3">
                    {filteredImportActions.map((action, index) => {
                      const names: string[] = Array.isArray((action as any).undoData?.names)
                        ? (action as any).undoData.names
                        : [];
                      const count: number | undefined = (action as any).undoData?.count;
                      return (
                        <div key={action.id}>
                          <div className="p-4 rounded-lg border bg-card">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <Upload className="h-4 w-4" />
                                  <h4 className="font-medium">Importação de Conteúdos</h4>
                                  <Badge variant="secondary" className={getCategoryColor('import')}>import</Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  {action.timestamp}
                                </p>
                              </div>
                              {typeof count === 'number' && (
                                <Badge variant="outline" className="ml-2 flex-shrink-0">
                                  {count} conteúdo(s)
                                </Badge>
                              )}
                            </div>

                            {names.length > 0 ? (
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                {names.slice(0, 60).map((n, idx) => (
                                  <div key={`${action.id}-${idx}`} className="text-sm text-foreground truncate">
                                    • {n}
                                  </div>
                                ))}
                                {names.length > 60 && (
                                  <div className="text-xs text-muted-foreground mt-1">
                                    +{names.length - 60} mais
                                  </div>
                                )}
                              </div>
                            ) : (
                              <p className="text-sm text-muted-foreground">Sem lista de nomes anexada</p>
                            )}
                          </div>
                          {index < filteredActions.length - 1 && (
                            <Separator className="my-2" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                  </ScrollArea>
                </div>
              ) : (
                // Renderização padrão para outras categorias
                <ScrollArea className="h-[500px]">
                  <div className="space-y-3">
                    {filteredActions.map((action, index) => (
                      <div key={action.id}>
                        <div className="flex items-start justify-between p-4 rounded-lg border bg-card">
                          <div className="flex items-start gap-3 flex-1">
                            <div className="flex items-center gap-2">
                              {getCategoryIcon(action.category)}
                              {action.status === 'undone' ? (
                                <XCircle className="h-4 w-4 text-red-500" />
                              ) : (
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              )}
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className={`font-medium ${action.status === 'undone' ? 'line-through text-muted-foreground' : ''}`}>
                                  {action.action}
                                </h4>
                                <Badge 
                                  variant="secondary" 
                                  className={getCategoryColor(action.category)}
                                >
                                  {action.category}
                                </Badge>
                              </div>
                              
                              <p className={`text-sm text-muted-foreground mb-2 ${action.status === 'undone' ? 'line-through' : ''}`}>
                                {action.details}
                              </p>
                              
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                {action.timestamp}
                                {action.status === 'undone' && (
                                  <Badge variant="outline" className="text-xs">
                                    Desfeita
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {action.canUndo && action.status === 'completed' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleUndoAction(action.id)}
                              disabled={isLoading}
                            >
                              <Undo2 className="h-4 w-4" />
                              Desfazer
                            </Button>
                          )}
                        </div>
                        
                        {index < filteredActions.length - 1 && (
                          <Separator className="my-2" />
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </TabsContent>
          </Tabs>
          
          {filteredActions.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Total: {filteredActions.length} ações</span>
                <span>
                  {filteredActions.filter(a => a.canUndo && a.status === 'completed').length} podem ser desfeitas
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default UserActionHistory;