
import React, { useState, useEffect } from 'react';
import { useBaserowService } from '@/services/BaserowService';
import { useConfig } from '@/contexts/ConfigContext';
import { useOptimizedDuplicates } from '@/hooks/useOptimizedDuplicates';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Trash2, RefreshCw, Settings, Clock, CheckCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface DuplicateGroup {
  key: string;
  records: any[];
  fields: string[];
}

const Duplicados = () => {
  const [selectedRows, setSelectedRows] = useState<Record<string, boolean>>({});
  const [processingDelete, setProcessingDelete] = useState(false);
  const baserowService = useBaserowService();
  const { config, isConfigured } = useConfig();
  
  const {
    duplicates: conteudosDuplicados,
    loading,
    progress,
    error,
    findDuplicates
  } = useOptimizedDuplicates(config.tableIds?.conteudos || '', ['Nome', 'Link']);

  // Carregar duplicados otimizado
  const loadDuplicates = async () => {
    if (!isConfigured) {
      toast.error("Configuração incompleta. Verifique as configurações do sistema.");
      return;
    }

    if (!config.tableIds.conteudos) {
      toast.error("ID da tabela de conteúdos não configurado.");
      return;
    }

    await findDuplicates();
  };

  // Deletar registro individual
  const handleDelete = async (recordId: string) => {
    if (!window.confirm('Tem certeza que deseja deletar este registro?')) return;
    
    try {
      await baserowService.deleteRow(config.tableIds.conteudos, recordId);
      toast.success("Registro deletado com sucesso.");
      loadDuplicates();
    } catch (error) {
      console.error('Error deleting record:', error);
      toast.error("Não foi possível deletar o registro.");
    }
  };

  // Selecionar/desselecionar registro
  const handleSelectRow = (recordId: string) => {
    setSelectedRows(prev => ({
      ...prev,
      [recordId]: !prev[recordId]
    }));
  };

  // Deletar selecionados com progresso otimizado
  const handleDeleteSelected = async () => {
    const toDelete = Object.entries(selectedRows)
      .filter(([_, checked]) => checked)
      .map(([id]) => id);
      
    if (toDelete.length === 0) return;
    
    if (!window.confirm(`Excluir ${toDelete.length} registro(s) selecionados?`)) return;
    
    setProcessingDelete(true);
    let deletedCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < toDelete.length; i++) {
      const recordId = toDelete[i];
      try {
        await baserowService.deleteRow(config.tableIds.conteudos, recordId);
        deletedCount++;
      } catch (error: any) {
        console.error(`Error deleting content ${recordId}:`, error);
        errorCount++;
        
        if (error.message && error.message.includes('ERROR_ROW_DOES_NOT_EXIST')) {
          console.log(`Content ${recordId} already deleted, skipping...`);
        }
      }

      // Pequena pausa para não sobrecarregar
      if (i % 10 === 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    if (deletedCount > 0) {
      toast.success(`${deletedCount} registro(s) deletado(s).`);
    }
    
    if (errorCount > 0) {
      toast.error(`${errorCount} registro(s) não puderam ser deletados (podem já ter sido removidos).`);
    }
    
    setSelectedRows({});
    setProcessingDelete(false);
    loadDuplicates();
  };

  useEffect(() => {
    if (isConfigured && config.tableIds?.conteudos) {
      findDuplicates();
    }
  }, [isConfigured, config.tableIds?.conteudos]);

  // Verificar se a configuração está completa
  if (!isConfigured) {
    return (
      <div className="w-full bg-background min-h-screen py-8 animate-fade-in-up px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader className="text-center">
              <Settings className="h-12 w-12 mb-4 mx-auto text-yellow-600" />
              <CardTitle>Configuração Necessária</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-muted-foreground mb-6">
                Para usar a verificação de duplicados, é necessário configurar a conexão com o Baserow.
              </p>
              <div className="text-sm text-muted-foreground mb-6 space-y-1">
                <p>Certifique-se de que os seguintes itens estão configurados:</p>
                <p>• URL do Baserow</p>
                <p>• Token de API</p>
                <p>• ID da tabela de conteúdos</p>
              </div>
              <Button onClick={() => window.location.href = '/configuracoes'}>
                <Settings className="mr-2 h-4 w-4" />
                Ir para Configurações
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const selectedCount = Object.values(selectedRows).filter(Boolean).length;

  return (
    <div className="w-full bg-background min-h-screen py-8 animate-fade-in-up px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <h1 className="text-3xl font-bold whitespace-nowrap">Verificar Duplicatas: Conteúdos</h1>
          {!loading && conteudosDuplicados.length > 0 && (
            <div className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium">
              {conteudosDuplicados.length} grupos encontrados
            </div>
          )}
        </div>
        <p className="text-muted-foreground mb-6">
          Gerencie conteúdos duplicados no sistema (versão otimizada)
        </p>
        <div className="flex flex-col md:flex-row justify-between gap-2 items-start md:items-center mb-6">
          <div>
            <Button 
              onClick={loadDuplicates} 
              disabled={loading || processingDelete} 
              className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700"
            >
              <RefreshCw className="mr-2 h-5 w-5" /> 
              Verificar Novamente
            </Button>
          </div>
          <Button 
            onClick={handleDeleteSelected} 
            className="bg-red-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
            variant="destructive"
            disabled={selectedCount === 0 || processingDelete}
          >
            <Trash2 className="h-5 w-5" />
            {processingDelete ? 'Excluindo...' : `Excluir Selecionados (${selectedCount})`}
          </Button>
        </div>
      </div>

      {loading ? (
        <Card>
          <CardContent className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600 mx-auto mb-4"></div>
            <div className="max-w-md mx-auto">
              <p className="mb-4">Analisando conteúdos duplicados...</p>
              <Progress value={progress} className="w-full mb-2" />
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                {progress.toFixed(0)}% concluído
              </div>
              <div className="mt-4 text-xs text-muted-foreground">
                Processamento otimizado em lotes para melhor performance
              </div>
            </div>
          </CardContent>
        </Card>
      ) : error ? (
        <Card>
          <CardContent className="text-center py-12">
            <AlertTriangle className="h-8 w-8 mb-2 mx-auto text-destructive" />
            <div className="text-destructive mb-4">Erro ao carregar duplicados</div>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <Button onClick={loadDuplicates} variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              Tentar Novamente
            </Button>
          </CardContent>
        </Card>
      ) : conteudosDuplicados.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <CheckCircle className="h-8 w-8 mb-2 mx-auto text-green-600" />
            <div className="text-lg font-medium mb-2">Nenhum conteúdo duplicado encontrado!</div>
            <div className="text-sm text-muted-foreground">Todos os conteúdos são únicos.</div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {conteudosDuplicados.map((group, groupIndex) => {
            const firstRecord = group.records[0];
            const nomeConteudo = firstRecord?.Nome || 'Conteúdo sem nome';
            
            return (
              <Card key={group.key} className="shadow-lg">
                <CardHeader className="pb-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <CardTitle className="text-xl text-primary mb-2">
                        {nomeConteudo}
                      </CardTitle>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="bg-primary/10 text-primary px-2 py-1 rounded-md font-medium">
                          Grupo #{groupIndex + 1}
                        </span>
                        {firstRecord?.Categoria && (
                          <span className="bg-secondary/80 text-secondary-foreground px-2 py-1 rounded-md font-medium">
                            {firstRecord.Categoria}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="bg-destructive/20 text-destructive text-sm px-3 py-1 rounded-full font-medium">
                      {group.records.length} Duplicatas
                    </span>
                  </div>
                  {firstRecord?.Link && (
                    <p className="text-sm text-muted-foreground truncate">
                      <strong>Link:</strong> {firstRecord.Link}
                    </p>
                  )}
                </CardHeader>
                
                <CardContent className="pt-0">
                  <div className="divide-y divide-border">
                    {group.records.map((record, index) => (
                      <div key={record.id} className="py-4 hover:bg-muted/30 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <input 
                              type="checkbox" 
                              className="w-4 h-4 text-primary focus:ring-primary border-border rounded" 
                              checked={!!selectedRows[record.id]}
                              onChange={() => handleSelectRow(record.id)}
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <span className="bg-muted text-muted-foreground text-xs px-2 py-1 rounded font-mono">
                                  Cópia #{index + 1}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  ID: {record.id}
                                </span>
                              </div>
                              
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                                <div>
                                  <span className="font-medium text-muted-foreground">Nome:</span>
                                  <p className="font-medium truncate" title={record.Nome}>
                                    {record.Nome || '-'}
                                  </p>
                                </div>
                                <div>
                                  <span className="font-medium text-muted-foreground">Views:</span>
                                  <p className="font-medium">{record.Views || '0'}</p>
                                </div>
                                <div>
                                  <span className="font-medium text-muted-foreground">Data:</span>
                                  <p className="font-medium">{record.Data || '-'}</p>
                                </div>
                                <div>
                                  <span className="font-medium text-muted-foreground">Categoria:</span>
                                  <p className="font-medium">{record.Categoria || '-'}</p>
                                </div>
                              </div>
                              
                              {record.Link && (
                                <div className="mt-2 text-xs">
                                  <span className="font-medium text-muted-foreground">Link:</span>
                                  <p className="text-blue-600 truncate max-w-md" title={record.Link}>
                                    {record.Link}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <Button 
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(record.id)}
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                            title={`Excluir conteúdo ${record.Nome || 'sem nome'}`}
                            disabled={processingDelete}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Duplicados;
