import { BaserowService } from './BaserowService';
import { isDemoSessionActive, demoDatabase } from './BaserowDemoData';

export type BackupEntityType =
  | 'conteudos'
  | 'episodios'
  | 'canaisTv'
  | 'categorias'
  | 'banners'
  | 'jogosDia'
  | 'miniseries'
  | 'miniseriesEpisodios'
  | 'plataformas'
  | 'usuarios';

export interface BackupEntityConfig {
  key: BackupEntityType;
  label: string;
  description: string;
  defaultSelected: boolean;
  tableKey: string;
  category: 'catalogo' | 'organizacao' | 'clientes';
}

export const BACKUP_ENTITIES: BackupEntityConfig[] = [
  {
    key: 'conteudos',
    label: 'Filmes e Séries (VOD)',
    description: 'Catálogo de filmes e séries com sinopses, capas, links e metadados TMDb',
    defaultSelected: true,
    tableKey: 'conteudos',
    category: 'catalogo'
  },
  {
    key: 'episodios',
    label: 'Episódios de Séries',
    description: 'Episódios organizados por temporada com links de vídeo e sinopses',
    defaultSelected: true,
    tableKey: 'episodios',
    category: 'catalogo'
  },
  {
    key: 'canaisTv',
    label: 'Canais de TV ao Vivo',
    description: 'Grade de canais de TV ao vivo com URLs de streaming e categorias',
    defaultSelected: true,
    tableKey: 'canaisTv',
    category: 'catalogo'
  },
  {
    key: 'miniseries',
    label: 'Minisséries e Doramas',
    description: 'Catálogo de minisséries curtas e doramas',
    defaultSelected: true,
    tableKey: 'miniseries',
    category: 'catalogo'
  },
  {
    key: 'miniseriesEpisodios',
    label: 'Episódios de Minisséries',
    description: 'Capítulos de minisséries com links diretos',
    defaultSelected: true,
    tableKey: 'miniseriesEpisodios',
    category: 'catalogo'
  },
  {
    key: 'categorias',
    label: 'Categorias e Gêneros',
    description: 'Categorias de filmes, séries e canais',
    defaultSelected: true,
    tableKey: 'categorias',
    category: 'organizacao'
  },
  {
    key: 'banners',
    label: 'Banners de Destaque',
    description: 'Banners rotativos do carrossel inicial',
    defaultSelected: true,
    tableKey: 'banners',
    category: 'organizacao'
  },
  {
    key: 'jogosDia',
    label: 'Jogos do Dia',
    description: 'Transmissões esportivas e grade de partidas do dia',
    defaultSelected: true,
    tableKey: 'jogosDia',
    category: 'organizacao'
  },
  {
    key: 'plataformas',
    label: 'Plataformas de Streaming',
    description: 'Marcas de plataformas (Netflix, Prime, Max, etc.)',
    defaultSelected: true,
    tableKey: 'plataformas',
    category: 'organizacao'
  },
  {
    key: 'usuarios',
    label: 'Clientes e Usuários (Opcional)',
    description: 'Lista de clientes finais com datas de vencimento e acessos',
    defaultSelected: false,
    tableKey: 'usuarios',
    category: 'clientes'
  }
];

export interface BackupMetadata {
  version: string;
  system: string;
  appName: string;
  userEmail?: string;
  createdAt: string;
  counts: Partial<Record<BackupEntityType, number>>;
  totalRecords: number;
}

export interface BackupFileStructure {
  tibimBackup: true;
  version: string;
  metadata: BackupMetadata;
  data: Partial<Record<BackupEntityType, any[]>>;
}

export interface BackupProgress {
  stage: 'idle' | 'exporting' | 'importing' | 'validating' | 'done' | 'error';
  currentEntity: BackupEntityType | string;
  currentEntityLabel: string;
  entityProgress: number; // 0 to 100
  totalProgress: number;  // 0 to 100
  processedItems: number;
  totalItems: number;
  message: string;
}

export interface RestoreOptions {
  mode: 'merge' | 'append';
  selectedEntities: BackupEntityType[];
}

export interface RestoreResult {
  success: boolean;
  totalRestored: number;
  counts: Partial<Record<BackupEntityType, number>>;
  errors: string[];
}

class BackupService {
  private static instance: BackupService | null = null;

  static getInstance(): BackupService {
    if (!BackupService.instance) {
      BackupService.instance = new BackupService();
    }
    return BackupService.instance;
  }

  /**
   * Resolve o ID da tabela no Baserow ou chave do banco simulado Demo
   */
  private resolveTableId(entityKey: BackupEntityType, tableIds: Record<string, string | undefined>): string {
    if (isDemoSessionActive()) {
      return `demo-${entityKey}`;
    }
    return tableIds[entityKey] || '';
  }

  /**
   * Exporta os dados selecionados em um arquivo JSON completo de backup
   */
  async exportBackup(
    baserowService: BaserowService,
    tableIds: Record<string, string | undefined>,
    selectedEntities: BackupEntityType[],
    appName: string,
    userEmail?: string,
    onProgress?: (progress: BackupProgress) => void
  ): Promise<BackupFileStructure> {
    const isDemo = isDemoSessionActive();
    const backupData: Partial<Record<BackupEntityType, any[]>> = {};
    const counts: Partial<Record<BackupEntityType, number>> = {};
    let totalRecords = 0;

    const totalEntities = selectedEntities.length;

    for (let index = 0; index < totalEntities; index++) {
      const entityKey = selectedEntities[index];
      const entityConfig = BACKUP_ENTITIES.find(e => e.key === entityKey);
      const entityLabel = entityConfig?.label || entityKey;

      onProgress?.({
        stage: 'exporting',
        currentEntity: entityKey,
        currentEntityLabel: entityLabel,
        entityProgress: 10,
        totalProgress: Math.round((index / totalEntities) * 100),
        processedItems: totalRecords,
        totalItems: totalRecords,
        message: `Lendo dados de ${entityLabel}...`
      });

      const tableId = this.resolveTableId(entityKey, tableIds);

      if (!tableId && !isDemo) {
        console.warn(`[BackupService] Tabela ${entityKey} não configurada, pulando.`);
        backupData[entityKey] = [];
        counts[entityKey] = 0;
        continue;
      }

      try {
        if (isDemo) {
          const demoData = demoDatabase.getTable(entityKey);
          backupData[entityKey] = [...demoData.results];
          counts[entityKey] = demoData.results.length;
          totalRecords += demoData.results.length;
        } else {
          const result = await baserowService.getAllTableData(
            tableId,
            undefined,
            0,
            (loaded, total) => {
              const entityPct = total > 0 ? Math.min(100, Math.round((loaded / total) * 100)) : 50;
              onProgress?.({
                stage: 'exporting',
                currentEntity: entityKey,
                currentEntityLabel: entityLabel,
                entityProgress: entityPct,
                totalProgress: Math.round(((index + (entityPct / 100)) / totalEntities) * 100),
                processedItems: totalRecords + loaded,
                totalItems: totalRecords + total,
                message: `Exportando ${entityLabel} (${loaded}/${total || '...'})`
              });
            }
          );

          backupData[entityKey] = result.results || [];
          counts[entityKey] = backupData[entityKey]!.length;
          totalRecords += backupData[entityKey]!.length;
        }
      } catch (err) {
        console.error(`[BackupService] Erro ao exportar ${entityKey}:`, err);
        backupData[entityKey] = [];
        counts[entityKey] = 0;
      }
    }

    const structure: BackupFileStructure = {
      tibimBackup: true,
      version: '1.0.0',
      metadata: {
        version: '1.0.0',
        system: 'Tibim Manager 2026',
        appName: appName || 'Tibim Manager',
        userEmail: userEmail || undefined,
        createdAt: new Date().toISOString(),
        counts,
        totalRecords
      },
      data: backupData
    };

    onProgress?.({
      stage: 'done',
      currentEntity: 'concluido',
      currentEntityLabel: 'Finalizado',
      entityProgress: 100,
      totalProgress: 100,
      processedItems: totalRecords,
      totalItems: totalRecords,
      message: `Backup concluído com sucesso! ${totalRecords} registros exportados.`
    });

    return structure;
  }

  /**
   * Dispara o download automático do arquivo JSON no navegador
   */
  downloadBackupFile(backup: BackupFileStructure, customPrefix?: string) {
    const jsonStr = JSON.stringify(backup, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 16);
    const filename = `${customPrefix || 'backup-tibim'}-${dateStr}.json`;

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Valida o conteúdo de um arquivo de backup
   */
  validateBackupFile(fileContent: string): {
    valid: boolean;
    error?: string;
    metadata?: BackupMetadata;
    data?: Partial<Record<BackupEntityType, any[]>>;
  } {
    try {
      const parsed = JSON.parse(fileContent);

      if (!parsed || typeof parsed !== 'object') {
        return { valid: false, error: 'O arquivo enviado não contém um formato JSON válido.' };
      }

      // Suporta tanto o formato nativo com tibimBackup: true quanto exportações brutas
      const isTibimNative = parsed.tibimBackup === true && parsed.data;
      const data: Partial<Record<BackupEntityType, any[]>> = isTibimNative ? parsed.data : parsed;

      const recognizedKeys = BACKUP_ENTITIES.map(e => e.key);
      const presentKeys = Object.keys(data).filter(k => recognizedKeys.includes(k as BackupEntityType)) as BackupEntityType[];

      if (presentKeys.length === 0) {
        return {
          valid: false,
          error: 'Nenhuma tabela ou catálogo compatível foi encontrado no arquivo de backup.'
        };
      }

      const counts: Partial<Record<BackupEntityType, number>> = {};
      let totalRecords = 0;

      presentKeys.forEach(k => {
        const arr = Array.isArray(data[k]) ? data[k]! : [];
        counts[k] = arr.length;
        totalRecords += arr.length;
      });

      const metadata: BackupMetadata = isTibimNative && parsed.metadata ? parsed.metadata : {
        version: parsed.version || '1.0.0',
        system: 'Tibim Manager 2026',
        appName: parsed.metadata?.appName || 'Backup Restaurado',
        createdAt: parsed.metadata?.createdAt || new Date().toISOString(),
        counts,
        totalRecords
      };

      return {
        valid: true,
        metadata,
        data
      };
    } catch (err: any) {
      return {
        valid: false,
        error: `Falha ao processar arquivo JSON: ${err?.message || 'Arquivo corrompido'}`
      };
    }
  }

  /**
   * Remove identificadores internos e campos de sistema antes de inserir novas linhas
   */
  private cleanRowForCreation(row: any): Record<string, any> {
    if (!row || typeof row !== 'object') return {};
    const copy: Record<string, any> = { ...row };

    // Remover campos internos de identificação do Baserow para criar novos registros
    delete copy.id;
    delete copy.order;
    delete copy.created_on;
    delete copy.updated_on;

    return copy;
  }

  /**
   * Restaura o catálogo no Baserow ou banco simulado a partir dos dados do backup
   */
  async restoreBackup(
    baserowService: BaserowService,
    tableIds: Record<string, string | undefined>,
    backupData: Partial<Record<BackupEntityType, any[]>>,
    options: RestoreOptions,
    onProgress?: (progress: BackupProgress) => void
  ): Promise<RestoreResult> {
    const isDemo = isDemoSessionActive();
    const errors: string[] = [];
    const restoredCounts: Partial<Record<BackupEntityType, number>> = {};
    let totalRestored = 0;

    // Ordem de restauração para preservar dependências e vínculos relacionais:
    // 1. Categorias & Plataformas
    // 2. Conteúdos (Filmes/Séries), Canais TV, Minisséries
    // 3. Episódios & Episódios de Minisséries (com mapeamento de IDs de Conteúdo)
    // 4. Banners, Jogos do Dia, Usuários
    const executionOrder: BackupEntityType[] = [
      'categorias',
      'plataformas',
      'conteudos',
      'canaisTv',
      'miniseries',
      'episodios',
      'miniseriesEpisodios',
      'banners',
      'jogosDia',
      'usuarios'
    ];

    const entitiesToRestore = executionOrder.filter(k => options.selectedEntities.includes(k) && Array.isArray(backupData[k]));
    const totalEntities = entitiesToRestore.length;

    // Mapa de correspondência: ID original no backup -> Novo ID criado no Baserow
    const contentIdMap = new Map<string | number, number>();
    const contentTitleToNewId = new Map<string, number>();

    for (let index = 0; index < totalEntities; index++) {
      const entityKey = entitiesToRestore[index];
      const entityConfig = BACKUP_ENTITIES.find(e => e.key === entityKey);
      const entityLabel = entityConfig?.label || entityKey;
      const rows = backupData[entityKey] || [];

      if (rows.length === 0) {
        restoredCounts[entityKey] = 0;
        continue;
      }

      const tableId = this.resolveTableId(entityKey, tableIds);

      if (!tableId && !isDemo) {
        errors.push(`Tabela para "${entityLabel}" não está configurada.`);
        continue;
      }

      onProgress?.({
        stage: 'importing',
        currentEntity: entityKey,
        currentEntityLabel: entityLabel,
        entityProgress: 0,
        totalProgress: Math.round((index / totalEntities) * 100),
        processedItems: totalRestored,
        totalItems: totalRestored + rows.length,
        message: `Preparando restauração de ${rows.length} itens em ${entityLabel}...`
      });

      try {
        if (isDemo) {
          // Modo Demonstração: Inserção direta em memória
          let entityRestored = 0;
          for (const item of rows) {
            const clean = this.cleanRowForCreation(item);
            const created = demoDatabase.addRow(entityKey, clean);
            if (item.id && created?.id) {
              contentIdMap.set(item.id, created.id);
            }
            if (clean.Nome || clean.Titulo) {
              contentTitleToNewId.set(String(clean.Nome || clean.Titulo).toLowerCase().trim(), created.id);
            }
            entityRestored++;
          }
          restoredCounts[entityKey] = entityRestored;
          totalRestored += entityRestored;
        } else {
          // Modo Real: Criação em lotes de até 150 registros
          const batchSize = 150;
          let entityRestored = 0;

          for (let b = 0; b < rows.length; b += batchSize) {
            const chunk = rows.slice(b, b + batchSize);
            const preparedBatch: any[] = [];

            for (const item of chunk) {
              const clean = this.cleanRowForCreation(item);

              // 🔗 Se for episódio, ajustar vínculo de relação com o conteúdo correspondente
              if (entityKey === 'episodios' || entityKey === 'miniseriesEpisodios') {
                const oldContentRef = Array.isArray(item.Conteudo) ? item.Conteudo[0] : item.Conteudo;
                const oldId = typeof oldContentRef === 'object' && oldContentRef?.id ? oldContentRef.id : oldContentRef;

                if (oldId && contentIdMap.has(oldId)) {
                  clean.Conteudo = [contentIdMap.get(oldId)];
                } else if (clean.Serie) {
                  const serieNorm = String(clean.Serie).toLowerCase().trim();
                  if (contentTitleToNewId.has(serieNorm)) {
                    clean.Conteudo = [contentTitleToNewId.get(serieNorm)];
                  }
                }
              }

              preparedBatch.push(clean);
            }

            const createdResults = await baserowService.createRowsBatch(tableId, preparedBatch);

            // Mapear IDs criados de Conteúdos para vincular os episódios subsequentes
            if (entityKey === 'conteudos' || entityKey === 'miniseries') {
              for (let i = 0; i < chunk.length; i++) {
                const orig = chunk[i];
                const created = createdResults[i];
                if (orig?.id && created?.id) {
                  contentIdMap.set(orig.id, created.id);
                }
                const name = orig?.Nome || orig?.Titulo;
                if (name && created?.id) {
                  contentTitleToNewId.set(String(name).toLowerCase().trim(), created.id);
                }
              }
            }

            entityRestored += createdResults.length;
            totalRestored += createdResults.length;

            const pct = Math.min(100, Math.round(((b + chunk.length) / rows.length) * 100));
            onProgress?.({
              stage: 'importing',
              currentEntity: entityKey,
              currentEntityLabel: entityLabel,
              entityProgress: pct,
              totalProgress: Math.round(((index + (pct / 100)) / totalEntities) * 100),
              processedItems: totalRestored,
              totalItems: totalRestored + (rows.length - entityRestored),
              message: `Restaurando ${entityLabel} (${entityRestored}/${rows.length})`
            });
          }

          restoredCounts[entityKey] = entityRestored;
        }
      } catch (err: any) {
        console.error(`[BackupService] Falha ao restaurar ${entityKey}:`, err);
        errors.push(`Erro ao restaurar ${entityLabel}: ${err?.message || 'Falha de comunicação'}`);
      }
    }

    onProgress?.({
      stage: 'done',
      currentEntity: 'concluido',
      currentEntityLabel: 'Finalizado',
      entityProgress: 100,
      totalProgress: 100,
      processedItems: totalRestored,
      totalItems: totalRestored,
      message: `Restauração finalizada! Total de ${totalRestored} registros processados.`
    });

    return {
      success: errors.length === 0,
      totalRestored,
      counts: restoredCounts,
      errors
    };
  }
}

export const backupService = BackupService.getInstance();
