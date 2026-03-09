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
              if (err.message?.includes('429')) {
                addLog(`Rate limit atingido, aguardando 30 segundos...`, 'error');
                await new Promise(resolve => setTimeout(resolve, 30000)); // 30 segundos
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

      let errorMessage = 'Erro desconhecido durante a limpeza';

      if (error.message?.includes('401') || error.message?.includes('403')) {
        errorMessage = 'Token da API inválido ou sem permissão';
      } else if (error.message?.includes('404')) {
        errorMessage = 'Tabela não encontrada. Verifique o ID da tabela';
      } else if (error.message?.includes('NetworkError') || error.message?.includes('Failed to fetch')) {
        errorMessage = 'Erro de conexão. Verifique a URL base e sua conexão de internet';
      } else if (error.message) {
        errorMessage = error.message;
      }

      addLog('Erro durante o processo de limpeza', 'error', errorMessage);
      toast.error(`Erro: ${errorMessage}`);
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
