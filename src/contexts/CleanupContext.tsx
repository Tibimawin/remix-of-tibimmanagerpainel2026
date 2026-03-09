import React, { createContext, useContext, useState, useCallback, ReactNode, useRef } from 'react';
import { toast } from 'sonner';
import { BaserowService } from '@/services/BaserowService';

interface CleanupConfig {
  tableId: string;
  apiToken: string;
  baseUrl: string;
}

interface CleanupLog {
  id: string;
  action: string;
  status: 'success' | 'error';
  timestamp: string;
  details?: string;
}

interface CleanupContextType {
  config: CleanupConfig;
  setConfig: React.Dispatch<React.SetStateAction<CleanupConfig>>;
  isProcessing: boolean;
  progress: number;
  logs: CleanupLog[];
  processedRecords: number;
  totalRecords: number;
  startCleanup: () => Promise<void>;
  validateConfig: () => boolean;
  addLog: (action: string, status: 'success' | 'error', details?: string) => void;
  showConfirmation: boolean;
  setShowConfirmation: React.Dispatch<React.SetStateAction<boolean>>;
  confirmCleanup: () => Promise<void>;
  cancelCleanup: () => void;
}

const CleanupContext = createContext<CleanupContextType | undefined>(undefined);

export const CleanupProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [config, setConfig] = useState<CleanupConfig>({
    tableId: '',
    apiToken: '',
    baseUrl: ''
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<CleanupLog[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [processedRecords, setProcessedRecords] = useState(0);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const stopRef = useRef(false);

  const addLog = useCallback((action: string, status: 'success' | 'error', details?: string) => {
    const newLog: CleanupLog = {
      id: Date.now().toString() + Math.random().toString(), // Ensure unique ID
      action,
      status,
      timestamp: new Date().toLocaleString('pt-BR'),
      details
    };
    setLogs(prev => [newLog, ...prev]);
  }, []);

  const validateConfig = useCallback((): boolean => {
    if (!config.tableId.trim()) {
      toast.error('ID da Tabela é obrigatório');
      addLog('Validação falhou', 'error', 'ID da Tabela não informado');
      return false;
    }
    if (!config.apiToken.trim()) {
      toast.error('Token da API é obrigatório');
      addLog('Validação falhou', 'error', 'Token da API não informado');
      return false;
    }
    if (!config.baseUrl.trim()) {
      toast.error('URL Base do Baserow é obrigatória');
      addLog('Validação falhou', 'error', 'URL Base não informada');
      return false;
    }

    // Validar formato da URL
    try {
      new URL(config.baseUrl);
    } catch (error) {
      toast.error('URL Base do Baserow inválida');
      addLog('Validação falhou', 'error', 'URL Base tem formato inválido');
      return false;
    }

    // Validar se o tableId é numérico
    if (!/^\d+$/.test(config.tableId.trim())) {
      toast.error('ID da Tabela deve ser numérico');
      addLog('Validação falhou', 'error', 'ID da Tabela deve conter apenas números');
      return false;
    }

    addLog('Configuração validada com sucesso', 'success');
    return true;
  }, [config, addLog]);

  const startCleanup = async () => {
    if (!validateConfig()) return;
    setShowConfirmation(true);
  };

  const cancelCleanup = useCallback(() => {
    if (isProcessing) {
      stopRef.current = true;
      addLog('Solicitação de parada recebida...', 'success');
      toast.info('Parando limpeza...');
    }
  }, [isProcessing, addLog]);

  const confirmCleanup = async () => {
    setShowConfirmation(false);
    setIsProcessing(true);
    stopRef.current = false;
    setProgress(0);
    setProcessedRecords(0);
    setTotalRecords(0);
    setLogs([]);

    try {
      addLog('Inicializando serviço do Baserow...', 'success');
      const baserowService = new BaserowService(config.apiToken, config.baseUrl);

      addLog('Iniciando processo de limpeza', 'success', `Tabela ID: ${config.tableId}`);
      addLog('Validando conexão com a API...', 'success');

      // Deleção paginada em lotes de 200
      const pageSize = 200;
      let page = 1;
      let hasMore = true;
      let processed = 0;
      let errors = 0;
      let estimatedTotal = 0;

      addLog('Carregando registros por páginas para deleção em lote (200 por requisição)...', 'success');

      while (hasMore) {
        if (stopRef.current) {
          addLog('Processo interrompido pelo usuário.', 'error');
          toast.warning('Limpeza interrompida pelo usuário.');
          break;
        }

        // Buscar página atual
        const pageData = await baserowService.getTableData(config.tableId, page, pageSize);
        const currentBatch = pageData.results || [];

        // Definir total estimado na primeira iteração
        if (page === 1) {
          estimatedTotal = pageData.count || currentBatch.length;
          setTotalRecords(estimatedTotal);
          addLog(`Estimativa de ${estimatedTotal} registros para deletar`, 'success');
        }

        if (currentBatch.length === 0) {
          addLog(`Nenhum registro restante na página ${page}, finalizando.`, 'success');
          break;
        }

        const batchNumber = page;
        const ids = currentBatch.map((record: any) => Number(record.id));
        addLog(`Processando lote ${batchNumber} (${ids.length} registros)`, 'success');

        try {
          // Deletar em lote (200 ids por requisição)
          await baserowService.deleteRowsBatch(config.tableId, ids);
          processed += ids.length;
          setProcessedRecords(processed);

          const progressPercent = estimatedTotal
            ? Math.round((processed / estimatedTotal) * 100)
            : Math.min(100, Math.round((processed / (processed + currentBatch.length)) * 100));
          setProgress(progressPercent);

          addLog(`Lote ${batchNumber}: ${ids.length} registros deletados (${processed}/${estimatedTotal || '?'})`, 'success');
        } catch (error: any) {
          console.warn(`Falha ao deletar lote ${batchNumber} em massa, tentando individualmente...`);

          if (stopRef.current) break;

          // Deletar sequencialmente com delay para evitar rate limiting (erro 429)
          for (const record of currentBatch) {
            if (stopRef.current) break;

            try {
              await baserowService.deleteRow(config.tableId, String(record.id));
              processed++;
              setProcessedRecords(processed);
              const progressPercent = estimatedTotal
                ? Math.round((processed / estimatedTotal) * 100)
                : Math.min(100, Math.round((processed / (processed + currentBatch.length)) * 100));
              setProgress(progressPercent);

              // Delay de 500ms entre cada delete para respeitar rate limit
              await new Promise(resolve => setTimeout(resolve, 500));
            } catch (err: any) {
              errors++;
              console.error('Erro ao deletar registro:', record.id, err);

              // Se for erro 429 (rate limit), esperar mais tempo
              if (err.message?.includes('429') || err.message?.includes('Too Many')) {
                addLog(`⏳ Limite de requisições atingido - aguardando 30 segundos...`, 'error', 
                  'O Baserow tem limites de requisições por minuto. O processo será retomado automaticamente.');
                await new Promise(resolve => setTimeout(resolve, 30000));
              }

              if (errors >= 20) {
                throw new Error('Muitos erros de deleção encontrados');
              }
            }
          }
        }

        if (stopRef.current) {
          addLog('Processo interrompido pelo usuário.', 'error');
          toast.warning('Limpeza interrompida pelo usuário.');
          break;
        }

        // Verificar próxima página e continuar
        hasMore = !!pageData.next && currentBatch.length === pageSize;
        page++;

        // Pausa reduzida para maior velocidade (50ms a 150ms)
        const delay = Math.min(50 + (currentBatch.length / 200) * 100, 150);
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      if (!stopRef.current) {
        setProgress(100);

        if (errors > 0) {
          addLog(`Processo finalizado com avisos. ${processed} de ${estimatedTotal} registros foram deletados. ${errors} erro(s) encontrado(s).`, 'error');
          toast.error(`Limpeza parcial! ${processed} registros removidos, ${errors} erro(s) encontrado(s).`);
        } else {
          addLog(`Processo finalizado com sucesso! ${processed} registros foram deletados.`, 'success');
          toast.success(`Limpeza concluída! ${processed} registros foram removidos com sucesso.`);
        }
      }

    } catch (error: any) {
      console.error('Erro durante a limpeza:', error);

      let errorTitle = 'Erro durante o processo de limpeza';
      let errorMessage = 'Erro desconhecido durante a limpeza';
      let errorSuggestion = '';

      if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
        errorTitle = 'Autenticação falhou';
        errorMessage = 'O Token da API é inválido ou expirou.';
        errorSuggestion = '💡 Dica: Verifique se o token está correto e possui permissões de escrita/deleção na tabela.';
      } else if (error.message?.includes('403') || error.message?.includes('Forbidden')) {
        errorTitle = 'Sem permissão';
        errorMessage = 'O token não tem permissão para deletar registros nesta tabela.';
        errorSuggestion = '💡 Dica: Certifique-se de que o token tem permissões de "Admin" ou "Editor" no Baserow.';
      } else if (error.message?.includes('404') || error.message?.includes('not found')) {
        errorTitle = 'Tabela não encontrada';
        errorMessage = `A tabela com ID "${config.tableId}" não foi encontrada no Baserow.`;
        errorSuggestion = '💡 Dica: Verifique se o ID da tabela está correto. Pode encontrá-lo na URL do Baserow.';
      } else if (error.message?.includes('429') || error.message?.includes('rate limit') || error.message?.includes('Too Many')) {
        errorTitle = 'Limite de requisições atingido';
        errorMessage = 'O Baserow bloqueou temporariamente as requisições por excesso de chamadas.';
        errorSuggestion = '💡 Dica: Aguarde alguns minutos e tente novamente. O processo será retomado automaticamente quando possível.';
      } else if (error.message?.includes('NetworkError') || error.message?.includes('Failed to fetch') || error.message?.includes('ERR_CONNECTION')) {
        errorTitle = 'Erro de conexão';
        errorMessage = 'Não foi possível conectar ao servidor do Baserow.';
        errorSuggestion = '💡 Dica: Verifique se a URL base está correta e se sua conexão de internet está funcionando.';
      } else if (error.message?.includes('502') || error.message?.includes('503') || error.message?.includes('504') || error.message?.includes('HTML em vez de JSON')) {
        errorTitle = 'Servidor Baserow indisponível';
        errorMessage = 'O servidor Baserow não está a responder corretamente (retornou HTML em vez de JSON).';
        errorSuggestion = '💡 Dica: Verifique se o servidor Baserow está online e acessível. Teste aceder diretamente à URL no navegador. Se for um servidor self-hosted, confirme que está a funcionar.';
      } else if (error.message?.includes('CORS') || error.message?.includes('cross-origin')) {
        errorTitle = 'Erro de CORS';
        errorMessage = 'O navegador bloqueou a requisição por política de segurança (CORS).';
        errorSuggestion = '💡 Dica: Use uma URL HTTPS para o Baserow ou configure o proxy corretamente.';
      } else if (error.message?.includes('Muitos erros')) {
        errorTitle = 'Muitos erros encontrados';
        errorMessage = 'O processo foi interrompido porque mais de 20 registros falharam ao ser deletados.';
        errorSuggestion = '💡 Dica: Verifique se o token e as permissões estão corretos. Alguns registros podem estar protegidos.';
      } else if (error.message) {
        errorMessage = error.message;
      }

      addLog(errorTitle, 'error', `${errorMessage}${errorSuggestion ? ` ${errorSuggestion}` : ''}`);
      toast.error(errorTitle, { description: errorMessage, duration: 8000 });
    } finally {
      setIsProcessing(false);
      stopRef.current = false;
    }
  };

  return (
    <CleanupContext.Provider value={{
      config,
      setConfig,
      isProcessing,
      progress,
      logs,
      processedRecords,
      totalRecords,
      startCleanup,
      validateConfig,
      addLog,
      showConfirmation,
      setShowConfirmation,
      confirmCleanup,
      cancelCleanup
    }}>
      {children}
    </CleanupContext.Provider>
  );
};

export const useCleanup = () => {
  const context = useContext(CleanupContext);
  if (context === undefined) {
    throw new Error('useCleanup must be used within a CleanupProvider');
  }
  return context;
};
