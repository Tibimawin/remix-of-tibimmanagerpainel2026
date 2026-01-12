import { useState, useEffect } from 'react';
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

  useEffect(() => {
    const fetchMetrics = async () => {
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
        // MAS vamos buscar de forma mais eficiente
        if (tableIds.conteudos && tableIds.conteudos.trim() !== '') {
          try {
            // Buscar apenas os campos necessários (Tipo) em vez de tudo
            const conteudosData = await baserowService.getTableData(tableIds.conteudos, 1, 100);
            newMetrics.totalConteudos = conteudosData.count || 0;

            if (conteudosData.results && conteudosData.count > 0) {
              // 🔍 Análise de tipos mais robusta
              const tiposCounts = {
                filmes: 0,
                series: 0,
                tv: 0
              };

              // Amostrar primeiros 100 para determinar proporções
              conteudosData.results.forEach((item: any) => {
                const tipo = (item.Tipo || item.Type || item.tipo || '').toString().toLowerCase().trim();

                if (tipo.includes('filme')) {
                  tiposCounts.filmes++;
                } else if (tipo.includes('serie') || tipo.includes('série')) {
                  tiposCounts.series++;
                } else if (tipo === 'tv' || tipo.includes('canal')) {
                  tiposCounts.tv++;
                }
              });

              // Se temos uma amostra, extrapolar para o total
              const sampleSize = conteudosData.results.length;
              const totalCount = conteudosData.count;

              if (sampleSize > 0 && totalCount > sampleSize) {
                const ratio = totalCount / sampleSize;
                newMetrics.totalFilmes = Math.round(tiposCounts.filmes * ratio);
                newMetrics.totalSeries = Math.round(tiposCounts.series * ratio);
                newMetrics.totalTV = Math.round(tiposCounts.tv * ratio);
              } else {
                newMetrics.totalFilmes = tiposCounts.filmes;
                newMetrics.totalSeries = tiposCounts.series;
                newMetrics.totalTV = tiposCounts.tv;
              }
            }
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
    };

    fetchMetrics();
  }, [config?.tableIds, config?.apiToken, config?.baseUrl]);

  return { metrics, loading, error };
};
