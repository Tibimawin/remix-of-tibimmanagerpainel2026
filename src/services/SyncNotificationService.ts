import { makeProxyRequest } from '@/utils/proxyRequest';
import { ImportConfig, ImportContent } from './AutoImportService';
import { toast } from 'sonner';

class SyncNotificationService {
  private static instance: SyncNotificationService | null = null;
  private lastSeenId: string | null = null;
  private checkInterval: any = null;
  private isChecking: boolean = false;

  static getInstance(): SyncNotificationService {
    if (!SyncNotificationService.instance) {
      SyncNotificationService.instance = new SyncNotificationService();
    }
    return SyncNotificationService.instance;
  }

  constructor() {
    this.lastSeenId = localStorage.getItem('auto-import-last-seen-id');
  }

  async startMonitoring(config: ImportConfig) {
    if (this.checkInterval) return;

    console.log('📡 Iniciando monitoramento de novos conteúdos...');
    
    // Primeira verificação imediata
    await this.checkForNewContent(config);

    // Verificar a cada 5 minutos
    this.checkInterval = setInterval(() => {
      this.checkForNewContent(config);
    }, 5 * 60 * 1000);
  }

  stopMonitoring() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  private async checkForNewContent(config: ImportConfig) {
    if (this.isChecking || !config.isActive) return;
    this.isChecking = true;

    try {
      // Buscar os itens mais recentes (ordenados por ID desc)
      const endpoint = `/api/database/rows/table/${config.contentTableId}/?user_field_names=true&page=1&size=5&order_by=-id`;
      const originalUrl = `${config.sourceBaseUrl}${endpoint}`;

      const result = await makeProxyRequest({
        url: originalUrl,
        method: 'GET',
        token: config.sourceToken,
        body: null,
      });

      if (!result.ok) return;

      const results: any[] = result.data.results || [];
      if (results.length === 0) return;

      const latestId = String(results[0].id);

      // Se é a primeira vez rodando, apenas salva o ID atual
      if (!this.lastSeenId) {
        this.updateLastSeen(latestId);
        return;
      }

      // Se o ID mais novo for maior que o último visto
      if (Number(latestId) > Number(this.lastSeenId)) {
        const newItems = results.filter(item => Number(item.id) > Number(this.lastSeenId));
        
        if (newItems.length > 0) {
          console.log(`🔔 ${newItems.length} novos conteúdos detectados na base global!`);
          
          const names = newItems.map(item => item.Nome || item.Titulo || 'Novo Conteúdo').join(', ');
          
          toast.success('Novos conteúdos disponíveis!', {
            description: `${newItems.length} novos itens adicionados à base global: ${names}`,
            duration: 10000,
            action: {
              label: 'Ver Agora',
              onClick: () => {
                // Forçar recarregamento da página ou cache se necessário
                window.location.reload();
              }
            }
          });
          
          this.updateLastSeen(latestId);
        }
      }
    } catch (error) {
      console.error('Erro ao monitorar novos conteúdos:', error);
    } finally {
      this.isChecking = false;
    }
  }

  private updateLastSeen(id: string) {
    this.lastSeenId = id;
    localStorage.setItem('auto-import-last-seen-id', id);
  }
}

export const syncNotificationService = SyncNotificationService.getInstance();
