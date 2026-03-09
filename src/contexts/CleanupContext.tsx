import React, { createContext, useContext, useState, useCallback, ReactNode, useRef } from 'react';
import { toast } from 'sonner';
import { BaserowService } from '@/services/BaserowService';
import { useCleanupHistory, type CleanupHistoryEntry } from '@/hooks/useCleanupHistory';

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
  wasInterrupted: boolean;
  estimatedTimeRemaining: string;
  processingSpeed: number;
  startCleanup: () => Promise<void>;
  resumeCleanup: () => Promise<void>;
  validateConfig: () => boolean;
  addLog: (action: string, status: 'success' | 'error', details?: string) => void;
  showConfirmation: boolean;
  setShowConfirmation: React.Dispatch<React.SetStateAction<boolean>>;
  confirmCleanup: () => Promise<void>;
  cancelCleanup: () => void;
  cleanupHistory: CleanupHistoryEntry[];
  clearCleanupHistory: () => void;
}

const CleanupContext = createContext<CleanupContextType | undefined>(undefined);

export const CleanupProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { history: cleanupHistory, addEntry: addHistoryEntry, clearHistory: clearCleanupHistory } = useCleanupHistory();
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
  const [wasInterrupted, setWasInterrupted] = useState(false);
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState('');
  const [processingSpeed, setProcessingSpeed] = useState(0);
  const stopRef = useRef(false);
  const startTimeRef = useRef<number>(0);
  const startCountRef = useRef<number>(0);

  const updateTimeEstimate = useCallback((processed: number, total: number) => {
    const elapsed = (Date.now() - startTimeRef.current) / 1000;
    const delta = processed - startCountRef.current;
    if (delta <= 0 || elapsed < 1) {
      setEstimatedTimeRemaining('Calculando...');
      return;
    }
    const speed = delta / elapsed;
    setProcessingSpeed(Math.round(speed * 10) / 10);
    const remaining = total - processed;
    const secondsLeft = remaining / speed;
    if (secondsLeft < 60) {
      setEstimatedTimeRemaining(`~${Math.ceil(secondsLeft)}s`);
    } else if (secondsLeft < 3600) {
      const mins = Math.floor(secondsLeft / 60);
      const secs = Math.ceil(secondsLeft % 60);
      setEstimatedTimeRemaining(`~${mins}m ${secs}s`);
    } else {
      const hrs = Math.floor(secondsLeft / 3600);
      const mins = Math.ceil((secondsLeft % 3600) / 60);
      setEstimatedTimeRemaining(`~${hrs}h ${mins}m`);
    }
  }, []);

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
      setWasInterrupted(true);
      addLog('Solicitação de parada recebida...', 'success');
      toast.info('Parando limpeza... Você pode retomar depois.');
    }
  }, [isProcessing, addLog]);

  const resumeCleanup = async () => {
    if (!validateConfig()) return;
    setWasInterrupted(false);
    setEstimatedTimeRemaining('Calculando...');
    addLog('Retomando limpeza de onde parou...', 'success', `Já processados: ${processedRecords}`);
    
    setIsProcessing(true);
    stopRef.current = false;
    startTimeRef.current = Date.now();
    startCountRef.current = processedRecords;

    try {
      const baserowService = new BaserowService(config.apiToken, config.baseUrl);
      const pageSize = 200;
      let hasMore = true;
      let processed = processedRecords; // Continuar de onde parou
      let errors = 0;
      let batchNumber = 0;
      let consecutiveErrors = 0;
      const maxConsecutiveErrors = 10;

      // Buscar total atual restante
      const firstPage = await baserowService.getTableData(config.tableId, 1, 1);
      const remaining = firstPage.count || 0;
      const newTotal = processed + remaining;
      setTotalRecords(newTotal);
      addLog(`${remaining} registros restantes para deletar`, 'success');

      while (hasMore) {
        if (stopRef.current) {
          addLog('Processo interrompido pelo usuário.', 'error');
          setWasInterrupted(true);
          toast.warning('Limpeza interrompida. Clique em "Retomar" para continuar.');
          break;
        }

        batchNumber++;
        const pageData = await baserowService.getTableData(config.tableId, 1, pageSize);
        const currentBatch = pageData.results || [];

        if (currentBatch.length === 0) {
          addLog('Nenhum registro restante, finalizando.', 'success');
          break;
        }

        const ids = currentBatch.map((record: any) => Number(record.id));

        try {
          await baserowService.deleteRowsBatch(config.tableId, ids);
          processed += ids.length;
          consecutiveErrors = 0;
          setProcessedRecords(processed);
          updateTimeEstimate(processed, newTotal);
          setProgress(Math.round((processed / newTotal) * 100));
          addLog(`Lote ${batchNumber}: ${ids.length} registros deletados (${processed}/${newTotal})`, 'success');
        } catch (error: any) {
          if (stopRef.current) break;
          for (const record of currentBatch) {
            if (stopRef.current) break;
            try {
              await baserowService.deleteRow(config.tableId, String(record.id));
              processed++;
              consecutiveErrors = 0;
              setProcessedRecords(processed);
              updateTimeEstimate(processed, newTotal);
              setProgress(Math.round((processed / newTotal) * 100));
              await new Promise(resolve => setTimeout(resolve, 300));
            } catch (err: any) {
              if (err.message?.includes('404') || err.message?.includes('NOT_EXIST')) {
                processed++;
                setProcessedRecords(processed);
                updateTimeEstimate(processed, newTotal);
                continue;
              }
              errors++;
              consecutiveErrors++;
              if (err.message?.includes('429') || err.message?.includes('Too Many')) {
                addLog('⏳ Rate limit - aguardando 30s...', 'error');
                await new Promise(resolve => setTimeout(resolve, 30000));
                consecutiveErrors = 0;
              }
              if (consecutiveErrors >= maxConsecutiveErrors) {
                throw new Error(`Muitos erros consecutivos (${maxConsecutiveErrors})`);
              }
            }
          }
        }

        if (stopRef.current) break;
        hasMore = currentBatch.length > 0;
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      if (!stopRef.current) {
        setProgress(100);
        setWasInterrupted(false);
        const duration = Math.round((Date.now() - startTimeRef.current) / 1000);
        addHistoryEntry({ tableId: config.tableId, baseUrl: config.baseUrl, recordsDeleted: processed, totalRecords: newTotal, status: 'success', durationSeconds: duration });
        addLog(`Limpeza retomada concluída! ${processed} registros totais deletados.`, 'success');
        toast.success(`Limpeza concluída! ${processed} registros removidos.`);
      }
    } catch (error: any) {
      addLog('Erro ao retomar limpeza', 'error', error.message);
      toast.error('Erro ao retomar limpeza', { description: error.message });
      setWasInterrupted(true);
    } finally {
      setIsProcessing(false);
      stopRef.current = false;
    }
  };

  const confirmCleanup = async () => {
    setShowConfirmation(false);
    setIsProcessing(true);
    stopRef.current = false;
    setProgress(0);
    setProcessedRecords(0);
    setTotalRecords(0);
    setLogs([]);
    setEstimatedTimeRemaining('Calculando...');
    setProcessingSpeed(0);
    startTimeRef.current = Date.now();
    startCountRef.current = 0;

    try {
      addLog('Inicializando serviço do Baserow...', 'success');
      const baserowService = new BaserowService(config.apiToken, config.baseUrl);

      addLog('Iniciando processo de limpeza', 'success', `Tabela ID: ${config.tableId}`);
      addLog('Validando conexão com a API...', 'success');

      // Deleção paginada - SEMPRE buscar página 1, pois após deletar os registros da página atual,
      // os registros seguintes "descem" para a página 1
      const pageSize = 200;
      let hasMore = true;
      let processed = 0;
      let errors = 0;
      let estimatedTotal = 0;
      let batchNumber = 0;
      let consecutiveErrors = 0;
      const maxConsecutiveErrors = 10;

      addLog('Carregando registros por páginas para deleção em lote (200 por requisição)...', 'success');

      while (hasMore) {
        if (stopRef.current) {
          addLog('Processo interrompido pelo usuário.', 'error');
          toast.warning('Limpeza interrompida pelo usuário.');
          break;
        }

        batchNumber++;

        // SEMPRE buscar página 1 - após deletar, os próximos registros ocupam a página 1
        const pageData = await baserowService.getTableData(config.tableId, 1, pageSize);
        const currentBatch = pageData.results || [];

        // Definir total estimado na primeira iteração
        if (batchNumber === 1) {
          estimatedTotal = pageData.count || currentBatch.length;
          setTotalRecords(estimatedTotal);
          addLog(`Estimativa de ${estimatedTotal} registros para deletar`, 'success');
        }

        if (currentBatch.length === 0) {
          addLog(`Nenhum registro restante, finalizando.`, 'success');
          break;
        }

        const ids = currentBatch.map((record: any) => Number(record.id));
        addLog(`Processando lote ${batchNumber} (${ids.length} registros)`, 'success');

        try {
          // Deletar em lote (200 ids por requisição)
          await baserowService.deleteRowsBatch(config.tableId, ids);
          processed += ids.length;
          consecutiveErrors = 0;
          setProcessedRecords(processed);
          updateTimeEstimate(processed, estimatedTotal);

          const progressPercent = estimatedTotal
            ? Math.round((processed / estimatedTotal) * 100)
            : Math.min(100, Math.round((processed / (processed + currentBatch.length)) * 100));
          setProgress(progressPercent);

          addLog(`Lote ${batchNumber}: ${ids.length} registros deletados (${processed}/${estimatedTotal || '?'})`, 'success');
        } catch (error: any) {
          console.warn(`Falha ao deletar lote ${batchNumber} em massa, tentando individualmente...`);

          if (stopRef.current) break;

          // Deletar sequencialmente com delay para evitar rate limiting (erro 429)
          let batchProcessed = 0;
          for (const record of currentBatch) {
            if (stopRef.current) break;

            try {
              await baserowService.deleteRow(config.tableId, String(record.id));
              processed++;
              batchProcessed++;
              consecutiveErrors = 0;
              setProcessedRecords(processed);
              updateTimeEstimate(processed, estimatedTotal);
              const progressPercent = estimatedTotal
                ? Math.round((processed / estimatedTotal) * 100)
                : Math.min(100, Math.round((processed / (processed + currentBatch.length)) * 100));
              setProgress(progressPercent);

              // Delay de 300ms entre cada delete para respeitar rate limit
              await new Promise(resolve => setTimeout(resolve, 300));
            } catch (err: any) {
              // Se for erro 404 (registro já deletado), não contar como erro
              if (err.message?.includes('404') || err.message?.includes('NOT_EXIST')) {
                processed++;
                batchProcessed++;
                setProcessedRecords(processed);
                updateTimeEstimate(processed, estimatedTotal);
                continue;
              }

              errors++;
              consecutiveErrors++;
              console.error('Erro ao deletar registro:', record.id, err);

              // Se for erro 429 (rate limit), esperar mais tempo
              if (err.message?.includes('429') || err.message?.includes('Too Many')) {
                addLog(`⏳ Limite de requisições atingido - aguardando 30 segundos...`, 'error', 
                  'O Baserow tem limites de requisições por minuto. O processo será retomado automaticamente.');
                await new Promise(resolve => setTimeout(resolve, 30000));
                consecutiveErrors = 0; // Resetar após espera
              }

              if (consecutiveErrors >= maxConsecutiveErrors) {
                addLog(`❌ Muitos erros consecutivos (${maxConsecutiveErrors}). Verifique a conexão.`, 'error');
                throw new Error(`Muitos erros consecutivos de deleção (${maxConsecutiveErrors})`);
              }
            }
          }
        }

        if (stopRef.current) break;

        // Continuar enquanto houver registros
        hasMore = currentBatch.length > 0;

        // Pausa entre lotes
        const delay = Math.min(50 + (currentBatch.length / 200) * 100, 150);
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      if (!stopRef.current) {
        setProgress(100);
        const duration = Math.round((Date.now() - startTimeRef.current) / 1000);

        if (errors > 0) {
          addHistoryEntry({ tableId: config.tableId, baseUrl: config.baseUrl, recordsDeleted: processed, totalRecords: estimatedTotal, status: 'partial', durationSeconds: duration });
          addLog(`Processo finalizado com avisos. ${processed} de ${estimatedTotal} registros foram deletados. ${errors} erro(s) encontrado(s).`, 'error');
          toast.error(`Limpeza parcial! ${processed} registros removidos, ${errors} erro(s) encontrado(s).`);
        } else {
          addHistoryEntry({ tableId: config.tableId, baseUrl: config.baseUrl, recordsDeleted: processed, totalRecords: estimatedTotal, status: 'success', durationSeconds: duration });
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
      wasInterrupted,
      estimatedTimeRemaining,
      processingSpeed,
      startCleanup,
      resumeCleanup,
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
