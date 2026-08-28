import { UserConfigService } from './UserConfigService';
import { BaserowService } from './BaserowService';
import { db } from '@/config/firebase';
import { collection, query, where, getDocs, doc, setDoc, getDoc } from 'firebase/firestore';

export interface ExportProgress {
  stage: 'idle' | 'fetching_contents' | 'fetching_episodes' | 'generating_csv' | 'done' | 'error';
  loaded: number;
  total: number;
  percent: number;
  message: string;
}

export const SourceExportService = {
  /**
   * Verifica se o usuário tem acesso à Carga Total do Painel
   * (seja por compra no Asaas ou por permissão manual liberada pelo Admin)
   */
  async hasPurchasedFullExport(userId: string, userEmail?: string): Promise<boolean> {
    try {
      if (!userId && !userEmail) return false;
      
      // 1. Checar se tem permissão manual no documento de userPermissions
      if (userId) {
        try {
          const permDoc = await getDoc(doc(db, 'userPermissions', userId));
          if (permDoc.exists()) {
            const data = permDoc.data();
            const enabledFeatures: string[] = data?.enabledFeatures || [];
            if (enabledFeatures.includes('source_csv_full') || enabledFeatures.includes('carga_total_painel')) {
              return true;
            }
          }
        } catch (permErr) {
          console.warn('Erro ao verificar permissão manual de carga total:', permErr);
        }
      }

      // 2. Checar compras registradas por userId
      if (userId) {
        const qUser = query(
          collection(db, 'storePurchases'),
          where('userId', '==', userId),
          where('productId', 'in', ['source_csv_full', 'carga_total_painel']),
          where('status', '==', 'confirmed')
        );
        const snapUser = await getDocs(qUser);
        if (!snapUser.empty) return true;
      }

      // 3. Checar compras registradas por email como fallback
      if (userEmail) {
        const qEmail = query(
          collection(db, 'storePurchases'),
          where('userEmail', '==', userEmail.toLowerCase()),
          where('productId', 'in', ['source_csv_full', 'carga_total_painel']),
          where('status', '==', 'confirmed')
        );
        const snapEmail = await getDocs(qEmail);
        if (!snapEmail.empty) return true;
      }

      return false;
    } catch (error) {
      console.error('Erro ao verificar compra de exportação:', error);
      return false;
    }
  },

  /**
   * Verifica se o usuário tem acesso ao Módulo de Backup em Nuvem Automático
   * (seja por compra no Asaas ou por permissão manual liberada pelo Admin)
   */
  async hasPurchasedBackupModule(userId: string, userEmail?: string): Promise<boolean> {
    try {
      if (!userId && !userEmail) return false;

      // 1. Checar se tem permissão manual no documento de userPermissions
      if (userId) {
        try {
          const permDoc = await getDoc(doc(db, 'userPermissions', userId));
          if (permDoc.exists()) {
            const data = permDoc.data();
            const enabledFeatures: string[] = data?.enabledFeatures || [];
            if (enabledFeatures.includes('backup_nuvem_auto') || enabledFeatures.includes('backup-nuvem')) {
              return true;
            }
          }
        } catch (permErr) {
          console.warn('Erro ao verificar permissão manual de backup:', permErr);
        }
      }

      // 2. Checar compras registradas por userId
      if (userId) {
        const qUser = query(
          collection(db, 'storePurchases'),
          where('userId', '==', userId),
          where('productId', 'in', ['backup_nuvem_auto', 'backup-nuvem']),
          where('status', '==', 'confirmed')
        );
        const snapUser = await getDocs(qUser);
        if (!snapUser.empty) return true;
      }

      // 3. Checar compras registradas por email como fallback
      if (userEmail) {
        const qEmail = query(
          collection(db, 'storePurchases'),
          where('userEmail', '==', userEmail.toLowerCase()),
          where('productId', 'in', ['backup_nuvem_auto', 'backup-nuvem']),
          where('status', '==', 'confirmed')
        );
        const snapEmail = await getDocs(qEmail);
        if (!snapEmail.empty) return true;
      }

      return false;
    } catch (error) {
      console.error('Erro ao verificar módulo de backup:', error);
      return false;
    }
  },

  /**
   * Registra a compra confirmada no Firestore
   */
  async recordPurchase(data: {
    paymentId: string;
    userId: string;
    userEmail: string;
    userName: string;
    amount: number;
    productId?: string;
    productName?: string;
  }): Promise<void> {
    try {
      const docRef = doc(db, 'storePurchases', data.paymentId);
      await setDoc(docRef, {
        productId: data.productId || 'source_csv_full',
        productName: data.productName || 'Carga Total do Painel (Acervo Completo)',
        userId: data.userId,
        userEmail: data.userEmail.toLowerCase(),
        userName: data.userName,
        amount: data.amount,
        paymentId: data.paymentId,
        status: 'confirmed',
        purchasedAt: new Date().toISOString(),
      });
      console.log('✅ Compra registrada na Loja com sucesso:', data.paymentId);
    } catch (error) {
      console.error('Erro ao registrar compra na Loja:', error);
    }
  },

  /**
   * Converte um array de objetos para CSV padronizado compatível com o Baserow
   */
  convertToCsv(data: Record<string, any>[]): string {
    if (!data || data.length === 0) return '';

    // Extrair todas as colunas únicas (excluindo campos internos do Baserow que atrapalham importação)
    const ignoredFields = new Set(['order', 'created_on', 'updated_on', 'trashed']);
    const allKeys = new Set<string>();

    data.forEach(item => {
      Object.keys(item).forEach(k => {
        if (!ignoredFields.has(k)) {
          allKeys.add(k);
        }
      });
    });

    // Colocar id no início se existir
    const headers = Array.from(allKeys).sort((a, b) => {
      if (a.toLowerCase() === 'id') return -1;
      if (b.toLowerCase() === 'id') return 1;
      return 0;
    });

    const escapeValue = (val: any): string => {
      if (val === null || val === undefined) return '""';
      
      // Se for array (ex: tags, links), converter em string legível
      if (Array.isArray(val)) {
        const strVal = val.map(v => typeof v === 'object' && v !== null ? (v.value || v.name || v.id || JSON.stringify(v)) : String(v)).join(', ');
        return `"${strVal.replace(/"/g, '""')}"`;
      }

      // Se for objeto (ex: select option), extrair o valor principal
      if (typeof val === 'object') {
        const strVal = val.value || val.name || val.id || JSON.stringify(val);
        return `"${String(strVal).replace(/"/g, '""')}"`;
      }

      const str = String(val);
      return `"${str.replace(/"/g, '""')}"`;
    };

    const headerLine = headers.map(h => `"${h.replace(/"/g, '""')}"`).join(',');
    const rows = data.map(item => {
      return headers.map(header => escapeValue(item[header])).join(',');
    });

    // UTF-8 BOM (\uFEFF) para garantir que acentuações abram perfeitamente no Excel e no Baserow
    return '\uFEFF' + [headerLine, ...rows].join('\r\n');
  },

  /**
   * Baixa o CSV no navegador
   */
  downloadCsvFile(csvContent: string, fileName: string) {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  /**
   * Busca todos os registros de uma tabela com relatório de progresso
   */
  async fetchAllTableDataWithProgress(
    service: BaserowService,
    tableId: string,
    onProgress: (loaded: number, total: number) => void
  ): Promise<any[]> {
    let allResults: any[] = [];
    let page = 1;
    let hasMore = true;
    const batchSize = 100;
    let totalCount = 0;

    while (hasMore) {
      const response = await service.getTableData(tableId, page, batchSize);
      if (response && response.results) {
        if (response.count && totalCount === 0) {
          totalCount = response.count;
        }
        allResults = allResults.concat(response.results);
        onProgress(allResults.length, totalCount || allResults.length);
        
        if (response.next) {
          page++;
        } else {
          hasMore = false;
        }
      } else {
        hasMore = false;
      }
      // Pequena pausa para evitar sobrecarga na rede
      await new Promise(resolve => setTimeout(resolve, 60));
    }

    return allResults;
  },

  /**
   * Executa a exportação da tabela de conteúdos
   */
  async exportConteudos(onProgress?: (progress: ExportProgress) => void): Promise<{ count: number; filename: string }> {
    const config = await UserConfigService.getGlobalImportConfig();
    if (!config || !config.sourceToken || !config.sourceBaseUrl || !config.contentTableId) {
      throw new Error('Configurações de catálogo não encontradas. Verifique as configurações do painel.');
    }

    onProgress?.({
      stage: 'fetching_contents',
      loaded: 0,
      total: 0,
      percent: 10,
      message: 'Conectando ao catálogo e compilando conteúdos...'
    });

    const service = new BaserowService(config.sourceToken, config.sourceBaseUrl);
    const contents = await this.fetchAllTableDataWithProgress(service, config.contentTableId, (loaded, total) => {
      const percent = total > 0 ? Math.min(Math.round((loaded / total) * 80) + 10, 90) : 50;
      onProgress?.({
        stage: 'fetching_contents',
        loaded,
        total,
        percent,
        message: `Carregando conteúdos: ${loaded.toLocaleString('pt-BR')} ${total > 0 ? `de ${total.toLocaleString('pt-BR')}` : ''}...`
      });
    });

    if (contents.length === 0) {
      throw new Error('Nenhum conteúdo foi localizado no catálogo.');
    }

    onProgress?.({
      stage: 'generating_csv',
      loaded: contents.length,
      total: contents.length,
      percent: 95,
      message: 'Formatando colunas e gerando arquivo CSV para o Baserow...'
    });

    const csvData = this.convertToCsv(contents);
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `conteudos_painel_${dateStr}.csv`;

    this.downloadCsvFile(csvData, filename);

    onProgress?.({
      stage: 'done',
      loaded: contents.length,
      total: contents.length,
      percent: 100,
      message: `Download concluído! ${contents.length.toLocaleString('pt-BR')} conteúdos exportados com sucesso.`
    });

    return { count: contents.length, filename };
  },

  /**
   * Executa a exportação da tabela de episódios
   */
  async exportEpisodios(onProgress?: (progress: ExportProgress) => void): Promise<{ count: number; filename: string }> {
    const config = await UserConfigService.getGlobalImportConfig();
    if (!config || !config.sourceToken || !config.sourceBaseUrl || !config.episodeTableId) {
      throw new Error('Configuração de episódios não encontrada.');
    }

    onProgress?.({
      stage: 'fetching_episodes',
      loaded: 0,
      total: 0,
      percent: 10,
      message: 'Conectando à tabela de episódios...'
    });

    const service = new BaserowService(config.sourceToken, config.sourceBaseUrl);
    const episodes = await this.fetchAllTableDataWithProgress(service, config.episodeTableId, (loaded, total) => {
      const percent = total > 0 ? Math.min(Math.round((loaded / total) * 80) + 10, 90) : 50;
      onProgress?.({
        stage: 'fetching_episodes',
        loaded,
        total,
        percent,
        message: `Carregando episódios: ${loaded.toLocaleString('pt-BR')} ${total > 0 ? `de ${total.toLocaleString('pt-BR')}` : ''}...`
      });
    });

    if (episodes.length === 0) {
      throw new Error('Nenhum episódio foi localizado.');
    }

    onProgress?.({
      stage: 'generating_csv',
      loaded: episodes.length,
      total: episodes.length,
      percent: 95,
      message: 'Formatando colunas e gerando arquivo CSV para o Baserow...'
    });

    const csvData = this.convertToCsv(episodes);
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `episodios_painel_${dateStr}.csv`;

    this.downloadCsvFile(csvData, filename);

    onProgress?.({
      stage: 'done',
      loaded: episodes.length,
      total: episodes.length,
      percent: 100,
      message: `Download concluído! ${episodes.length.toLocaleString('pt-BR')} episódios exportados com sucesso.`
    });

    return { count: episodes.length, filename };
  }
};
