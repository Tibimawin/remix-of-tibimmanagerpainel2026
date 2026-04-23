import { useState, useEffect, useCallback } from 'react';
import { useBaserowService } from '@/services/BaserowService';
import { useConfig } from '@/contexts/ConfigContext';

interface SystemMetrics {
  totalFilmes: number;
  totalSeries: number;
  totalTV: number;
  totalEpisodios: number;
  totalConteudos: number;
  totalBanners: number;
  totalCategorias: number;
  totalSessoes: number;
  totalPlataformas: number;
  totalUsuarios: number;
}

export const useSystemMetrics = () => {
  const [metrics, setMetrics] = useState<SystemMetrics>({
    totalFilmes: 0,
    totalSeries: 0,
    totalTV: 0,
    totalEpisodios: 0,
    totalConteudos: 0,
    totalBanners: 0,
    totalCategorias: 0,
    totalSessoes: 0,
    totalPlataformas: 0,
    totalUsuarios: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const baserowService = useBaserowService();
  const { config } = useConfig();

  const fetchMetrics = useCallback(async () => {
    // Se não há configuração de Baserow válida, usar métricas padrão
    if (!config?.tableIds || !config.apiToken || !config.baseUrl) {
      console.log('⚠️ Configuração do Baserow incompleta');
      setLoading(false);
      return;
    }

    try {
      console.time('⏱️ Métricas carregadas em');
      setLoading(true);
      setError(null);

      const tableIds = config.tableIds;
      const newMetrics: SystemMetrics = {
        totalFilmes: 0,
        totalSeries: 0,
        totalTV: 0,
        totalEpisodios: 0,
        totalConteudos: 0,
        totalBanners: 0,
        totalCategorias: 0,
        totalSessoes: 0,
        totalPlataformas: 0,
        totalUsuarios: 0,
      };

      // 🚀 OTIMIZAÇÃO: Buscar apenas 1 página para pegar o count (muito mais rápido)
      const fetchCount = async (tableId: string) => {
        if (!tableId || tableId.trim() === '') return 0;
        try {
          const result = await baserowService.getTableData(tableId, 1, 1);
          return result.count || 0;
        } catch {
          return 0;
        }
      };

      // 🚀 Buscar contadores em paralelo (muito mais rápido que sequencial)
      const [episodiosCount, bannersCount, categoriasCount, sessoesCount, plataformasCount, usuariosCount] =
        await Promise.all([
          fetchCount(tableIds.episodios),
          fetchCount(tableIds.banners),
          fetchCount(tableIds.categorias),
          fetchCount(tableIds.sessoes),
          fetchCount(tableIds.plataformas),
          fetchCount(tableIds.usuarios),
        ]);

      newMetrics.totalEpisodios = episodiosCount;
      newMetrics.totalBanners = bannersCount;
      newMetrics.totalCategorias = categoriasCount;
      newMetrics.totalSessoes = sessoesCount;
      newMetrics.totalPlataformas = plataformasCount;
      newMetrics.totalUsuarios = usuariosCount;

      // 🎯 Para conteúdos, precisamos buscar os dados para filtrar por tipo
      // ✅ Contagem EXATA via filtros do Baserow (filter__Tipo__equal=...)
      if (tableIds.conteudos && tableIds.conteudos.trim() !== '') {
        try {
          // Total geral
          const totalData = await baserowService.getTableData(tableIds.conteudos, 1, 1);
          newMetrics.totalConteudos = totalData.count || 0;

          // Contagem exata por tipo usando filtro do Baserow
          const countByTipo = async (valor: string): Promise<number> => {
            try {
              const res = await baserowService.getTableData(
                tableIds.conteudos,
                1,
                1,
                undefined,
                undefined,
                `filter__Tipo__equal=${encodeURIComponent(valor)}`
              );
              return res.count || 0;
            } catch {
              return 0;
            }
          };

          const [filmesCount, serieCount, seriesCount, tvCount, canalCount] = await Promise.all([
            countByTipo('Filme'),
            countByTipo('Serie'),
            countByTipo('Série'),
            countByTipo('TV'),
            countByTipo('Canal'),
          ]);

          newMetrics.totalFilmes = filmesCount;
          newMetrics.totalSeries = serieCount + seriesCount;
          newMetrics.totalTV = tvCount + canalCount;
        } catch (err) {
          console.error('❌ Erro ao buscar conteúdos:', err);
        }
      }

      console.log('✅ Métricas carregadas:', newMetrics);
      console.timeEnd('⏱️ Métricas carregadas em');
      setMetrics(newMetrics);
    } catch (err) {
      console.error('❌ Erro ao buscar métricas:', err);
      setError('Erro ao carregar métricas');
    } finally {
      setLoading(false);
    }
  }, [config?.tableIds, config?.apiToken, config?.baseUrl, baserowService]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  return { metrics, loading, error, refetch: fetchMetrics };
};
