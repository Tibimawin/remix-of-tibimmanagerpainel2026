import React, { useState, useEffect } from 'react';
import { useBaserowService } from '@/services/BaserowService';
import { useConfig } from '@/contexts/ConfigContext';
import { useOptimizedDuplicates } from '@/hooks/useOptimizedDuplicates';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, Trash2, RefreshCw, Settings, Clock } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface DuplicateGroup {
  key: string;
  records: any[];
  fields: string[];
}

const DuplicadosEpisodios = () => {
  const [selectedRows, setSelectedRows] = useState<Record<string, boolean>>({});
  const baserowService = useBaserowService();
  const { config, isConfigured } = useConfig();
  
  const {
    duplicates: episodiosDuplicados,
    loading,
    progress,
    error,
    findDuplicates,
    expandSearch,
    currentLimit,
    totalRecords,
    hasMoreData
  } = useOptimizedDuplicates(config.tableIds?.episodios || '', ['Nome', 'Link']);

  // Carregar episódios duplicados
  const loadDuplicates = async () => {
    if (!isConfigured) {
      toast.error("Configuração incompleta. Verifique as configurações do sistema.");
      return;
    }

    if (!config.tableIds.episodios) {
      toast.error("ID da tabela de episódios não configurado.");
      return;
    }

    await findDuplicates();
  };

  // Deletar episódio individual
  const handleDelete = async (recordId: string) => {
    if (!window.confirm('Tem certeza que deseja deletar este episódio?')) return;
    
    try {
      await baserowService.deleteRow(config.tableIds.episodios, recordId);
      toast.success("Episódio deletado com sucesso.");
      loadDuplicates();
    } catch (error) {
      console.error('Error deleting episode:', error);
      toast.error("Não foi possível deletar o episódio.");
    }
  };

  // Selecionar/desselecionar episódio
  const handleSelectRow = (recordId: string) => {
    setSelectedRows(prev => ({
      ...prev,
      [recordId]: !prev[recordId]
    }));
  };

  // Deletar selecionados
  const handleDeleteSelected = async () => {
    const toDelete = Object.entries(selectedRows)
      .filter(([_, checked]) => checked)
      .map(([id]) => id);
      
    if (toDelete.length === 0) return;
    
    if (!window.confirm(`Excluir ${toDelete.length} episódio(s) selecionados?`)) return;
    
    let deletedCount = 0;
    let errorCount = 0;
    
    for (const recordId of toDelete) {
      try {
        await baserowService.deleteRow(config.tableIds.episodios, recordId);
        deletedCount++;
      } catch (error: any) {
        console.error(`Error deleting episode ${recordId}:`, error);
        errorCount++;
        
        // Se o erro for que o registro não existe, apenas continue
        if (error.message && error.message.includes('ERROR_ROW_DOES_NOT_EXIST')) {
          console.log(`Episode ${recordId} already deleted, skipping...`);
        }
      }
    }
    
    if (deletedCount > 0) {
      toast.success(`${deletedCount} episódio(s) deletado(s).`);
    }
    
    if (errorCount > 0) {
      toast.error(`${errorCount} episódio(s) não puderam ser deletados (podem já ter sido removidos).`);
    }
    
    setSelectedRows({});
    loadDuplicates();
  };

  useEffect(() => {
    if (isConfigured && config.tableIds?.episodios) {
      findDuplicates();
    }
  }, [isConfigured, config.tableIds?.episodios]);

  // Verificar se a configuração está completa
  if (!isConfigured) {
    return (
      <div className="w-full bg-background min-h-screen py-8 animate-fade-in-up px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-card border border-border rounded-xl p-8 text-center">
            <Settings className="h-12 w-12 mb-4 mx-auto text-yellow-600" />
            <h2 className="text-2xl font-bold mb-2">Configuração Necessária</h2>
            <p className="text-muted-foreground mb-6">
              Para usar a verificação de episódios duplicados, é necessário configurar a conexão com o Baserow.
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              Certifique-se de que os seguintes itens estão configurados:
              <br />• URL do Baserow
              <br />• Token de API
              <br />• ID da tabela de episódios
            </p>
            <Button onClick={() => window.location.href = '/configuracoes'}>
              <Settings className="mr-2 h-4 w-4" />
              Ir para Configurações
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const selectedCount = Object.values(selectedRows).filter(Boolean).length;

  return (
    <div className="w-full bg-background min-h-screen py-8 animate-fade-in-up px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <h1 className="text-3xl font-bold whitespace-nowrap">Verificar Duplicatas: Episódios</h1>
        </div>
        <p className="text-muted-foreground mb-6">
          Gerencie episódios duplicados no sistema
        </p>
        
        {/* Informações sobre limites e dados */}
        {totalRecords > 0 && (
          <div className="bg-card border border-border rounded-lg p-4 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Analisando:</span>
                  <span className="font-semibold text-primary">
                    {currentLimit.toLocaleString()} de {totalRecords.toLocaleString()} episódios
                  </span>
                </div>
                {episodiosDuplicados.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Duplicados encontrados:</span>
                    <span className="font-semibold text-destructive">
                      {episodiosDuplicados.reduce((acc, group) => acc + group.records.length, 0)} episódios
                    </span>
                  </div>
                )}
              </div>
              
              {hasMoreData && (
                <Button 
                  onClick={expandSearch} 
                  disabled={loading}
                  variant="outline"
                  size="sm"
                  className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                >
                  Analisar mais {(5000).toLocaleString()} episódios
                </Button>
              )}
            </div>
            
            {hasMoreData && (
              <p className="text-xs text-muted-foreground mt-2">
                💡 Para melhor performance, a análise está limitada a {currentLimit.toLocaleString()} episódios. 
                Após limpar os duplicados atuais, você pode expandir a análise para mais registros.
              </p>
            )}
          </div>
        )}
        <div className="flex flex-col md:flex-row justify-between gap-2 items-start md:items-center mb-6">
          <div>
            <Button 
              onClick={loadDuplicates} 
              disabled={loading} 
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
            disabled={selectedCount === 0}
          >
            <Trash2 className="h-5 w-5" />
            Excluir Selecionados ({selectedCount})
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600 mx-auto mb-4"></div>
          <div className="max-w-md mx-auto">
            <p className="mb-4">Analisando episódios duplicados...</p>
            <Progress value={progress} className="w-full mb-2" />
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              {progress.toFixed(0)}% concluído
            </div>
          </div>
        </div>
      ) : error ? (
        <div className="bg-card border border-destructive rounded-xl p-8 text-center">
          <AlertTriangle className="h-8 w-8 mb-2 mx-auto text-destructive" />
          <div className="text-destructive mb-4">Erro ao carregar duplicados</div>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <Button onClick={loadDuplicates} variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Tentar Novamente
          </Button>
        </div>
      ) : episodiosDuplicados.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-8 text-center text-muted-foreground">
          <AlertTriangle className="h-8 w-8 mb-2 mx-auto text-yellow-600" />
          <div className="mb-2">
            {totalRecords > 0 ? (
              hasMoreData ? (
                <>
                  Nenhum episódio duplicado encontrado nos primeiros {currentLimit.toLocaleString()} episódios.
                  <br />
                  <span className="text-sm">
                    Há mais {(totalRecords - currentLimit).toLocaleString()} episódios para analisar.
                  </span>
                </>
              ) : (
                `Nenhum episódio duplicado encontrado em ${totalRecords.toLocaleString()} episódios analisados.`
              )
            ) : (
              "Nenhum episódio duplicado encontrado."
            )}
          </div>
          {hasMoreData && (
            <Button 
              onClick={expandSearch} 
              disabled={loading}
              className="mt-4"
              variant="outline"
            >
              Analisar mais episódios
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {episodiosDuplicados.map((group) => {
            const firstRecord = group.records[0];
            
            // Debug: ver todos os campos disponíveis
            console.log('Campos disponíveis no record:', Object.keys(firstRecord || {}));
            console.log('Record completo:', firstRecord);
            
            // Tentar diferentes possibilidades de nomes dos campos
            const serieInfo = firstRecord?.Serie || firstRecord?.serie || firstRecord?.Série || firstRecord?.['Série'] || 'Série não identificada';
            const temporadaInfo = firstRecord?.Temporada || firstRecord?.temporada || firstRecord?.Season || firstRecord?.season || 'N/A';
            const episodioInfo = firstRecord?.Episodio || firstRecord?.episodio || firstRecord?.Episode || firstRecord?.episode || firstRecord?.Episódio || firstRecord?.['Episódio'] || 'N/A';
            
            return (
              <div key={group.key} className="bg-card border border-border rounded-xl shadow-lg">
                <div className="px-6 pt-6 pb-4 border-b border-border">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-bold text-xl text-primary mb-2">
                        {serieInfo}
                      </h3>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="bg-primary/10 text-primary px-2 py-1 rounded-md font-medium">
                          Temporada {temporadaInfo}
                        </span>
                        <span className="bg-secondary/80 text-secondary-foreground px-2 py-1 rounded-md font-medium">
                          Episódio {episodioInfo}
                        </span>
                      </div>
                    </div>
                    <span className="bg-destructive/20 text-destructive text-sm px-3 py-1 rounded-full font-medium">
                      {group.records.length} Duplicatas
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    <strong>Nome do Episódio:</strong> {firstRecord?.Nome || firstRecord?.nome || firstRecord?.Name || firstRecord?.name || firstRecord?.Titulo || firstRecord?.titulo || firstRecord?.Title || firstRecord?.title || 'Sem nome'}
                  </p>
                </div>
                
                <div className="divide-y divide-border">
                  {group.records.map((record, index) => (
                    <div key={record.id} className="px-6 py-4 hover:bg-muted/30 transition-colors">
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
                                <span className="font-medium text-muted-foreground">Série:</span>
                                <p className="font-medium">{record.Serie || record.serie || record.Série || record?.['Série'] || 'N/A'}</p>
                              </div>
                              <div>
                                <span className="font-medium text-muted-foreground">Temporada:</span>
                                <p className="font-medium">{record.Temporada || record.temporada || record.Season || record.season || 'N/A'}</p>
                              </div>
                              <div>
                                <span className="font-medium text-muted-foreground">Episódio:</span>
                                <p className="font-medium">{record.Episodio || record.episodio || record.Episode || record.episode || record.Episódio || record?.['Episódio'] || 'N/A'}</p>
                              </div>
                              <div>
                                <span className="font-medium text-muted-foreground">Nome:</span>
                                <p className="font-medium truncate" title={record.Nome || record.nome || record.Name || record.name || record.Titulo || record.titulo || record.Title || record.title}>
                                  {record.Nome || record.nome || record.Name || record.name || record.Titulo || record.titulo || record.Title || record.title || 'N/A'}
                                </p>
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
                          title={`Excluir episódio ${record.Nome || 'sem nome'}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          
          {/* Botão para expandir pesquisa quando há mais dados */}
          {hasMoreData && (
            <div className="bg-card border border-border rounded-xl p-6 text-center">
              <div className="mb-4">
                <p className="text-muted-foreground mb-2">
                  Há mais {(totalRecords - currentLimit).toLocaleString()} episódios não analisados.
                </p>
                <p className="text-sm text-muted-foreground">
                  Após limpar os duplicados atuais, você pode expandir a análise para encontrar mais duplicados.
                </p>
              </div>
              <Button 
                onClick={expandSearch} 
                disabled={loading}
                variant="outline"
                className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
              >
                Analisar mais {(5000).toLocaleString()} episódios
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DuplicadosEpisodios;