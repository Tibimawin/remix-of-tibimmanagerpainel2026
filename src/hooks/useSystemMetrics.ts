import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { BaserowService } from '@/services/BaserowService';
import { useConfig } from '@/contexts/ConfigContext';
import { useTypeMode } from '@/contexts/TypeModeContext';

const METRICS_CACHE_KEY = 'dashboard:system-metrics-cache';

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

  // Francisco mode specific
  totalCategoriasTV: number;
  totalCategoriasAnime: number;

  // Tibim mode specific
  totalCanaisTv: number;
  totalPlanos: number;
  totalPlanos2: number;
  totalCarrossel: number;
  totalVersao: number;
  totalPedido: number;
  totalAvaliacao: number;
  totalPerfil: number;
  totalCategoriaFilmes: number;
  totalCategoriaSeries: number;
  totalCategoriaDorama: number;
  totalCategoriaAnimes: number;
  totalCategoriaNovelas: number;
  totalMeusAplicativos: number;
}

export const useSystemMetrics = () => {
  const [metrics, setMetrics] = useState<SystemMetrics>(() => {
    const defaults = {
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
      totalCategoriasTV: 0,
      totalCategoriasAnime: 0,
      totalCanaisTv: 0,
      totalPlanos: 0,
      totalPlanos2: 0,
      totalCarrossel: 0,
      totalVersao: 0,
      totalPedido: 0,
      totalAvaliacao: 0,
      totalPerfil: 0,
      totalCategoriaFilmes: 0,
      totalCategoriaSeries: 0,
      totalCategoriaDorama: 0,
      totalCategoriaAnimes: 0,
      totalCategoriaNovelas: 0,
      totalMeusAplicativos: 0,
    };
    try {
      const cached = sessionStorage.getItem(METRICS_CACHE_KEY);
      if (cached) {
        return { ...defaults, ...JSON.parse(cached) } as SystemMetrics;
      }
    } catch {
      // noop
    }
    return defaults;
  });
  const [loading, setLoading] = useState(() => {
    try {
      return !sessionStorage.getItem(METRICS_CACHE_KEY);
    } catch {
      return true;
    }
  });
  const [error, setError] = useState<string | null>(null);

  const { config } = useConfig();
  const { mode } = useTypeMode();
  const configSignature = useMemo(() => JSON.stringify({
    token: config?.apiToken || '',
    baseUrl: config?.baseUrl || '',
    tableIds: config?.tableIds || {},
    mode: mode,
  }), [config?.apiToken, config?.baseUrl, config?.tableIds, mode]);
  const inFlightRef = useRef(false);
  const lastLoadedSignatureRef = useRef<string | null>(null);

  const fetchMetrics = useCallback(async (force = false) => {
    if (inFlightRef.current || (!force && lastLoadedSignatureRef.current === configSignature)) return;

    // Se não há configuração de Baserow válida, usar métricas padrão
    if (!config?.tableIds || !config.apiToken || !config.baseUrl) {
      console.log('⚠️ Configuração do Baserow incompleta');
      setLoading(false);
      return;
    }

    try {
      console.time('⏱️ Métricas carregadas em');
      inFlightRef.current = true;
      const hasCache = (() => {
        try {
          return !!sessionStorage.getItem(METRICS_CACHE_KEY);
        } catch {
          return false;
        }
      })();
      if (!hasCache) setLoading(true);
      setError(null);

      const tableIds = config.tableIds;
      const baserowService = new BaserowService(config.apiToken, config.baseUrl);
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
        totalCategoriasTV: 0,
        totalCategoriasAnime: 0,
        totalCanaisTv: 0,
        totalPlanos: 0,
        totalPlanos2: 0,
        totalCarrossel: 0,
        totalVersao: 0,
        totalPedido: 0,
        totalAvaliacao: 0,
        totalPerfil: 0,
        totalCategoriaFilmes: 0,
        totalCategoriaSeries: 0,
        totalCategoriaDorama: 0,
        totalCategoriaAnimes: 0,
        totalCategoriaNovelas: 0,
        totalMeusAplicativos: 0,
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

      if (mode === 'tibim') {
        // Buscar tabelas exclusivas do Modo Tibim em paralelo
        const [
          conteudosCount,
          episodiosCount,
          canaisTvCount,
          planosCount,
          plano2Count,
          carrosselCount,
          versaoCount,
          pedidoCount,
          avaliacaoCount,
          perfilCount,
          usuariosCount,
          categoriasTVCount,
          categoriaFilmesCount,
          categoriaSeriesCount,
          categoriaDoramaCount,
          categoriaAnimesCount,
          categoriaNovelasCount,
          meusAplicativosCount
        ] = await Promise.all([
          fetchCount(tableIds.conteudos),
          fetchCount(tableIds.episodios),
          fetchCount(tableIds.canaisTv),
          fetchCount(tableIds.planos),
          fetchCount(tableIds.plano2),
          fetchCount(tableIds.carrosseu),
          fetchCount(tableIds.versao),
          fetchCount(tableIds.pedido),
          fetchCount(tableIds.avaliacao),
          fetchCount(tableIds.perfil),
          fetchCount(tableIds.usuarios),
          fetchCount(tableIds.categoriasTV),
          fetchCount(tableIds.categoriaFilmes),
          fetchCount(tableIds.categoriaSeries),
          fetchCount(tableIds.categoriaDorama),
          fetchCount(tableIds.categoriaAnimes),
          fetchCount(tableIds.categoriaNovelas),
          fetchCount(tableIds.meusAplicativos),
        ]);

        newMetrics.totalConteudos = conteudosCount;
        newMetrics.totalEpisodios = episodiosCount;
        newMetrics.totalCanaisTv = canaisTvCount;
        newMetrics.totalPlanos = planosCount;
        newMetrics.totalPlanos2 = plano2Count;
        newMetrics.totalCarrossel = carrosselCount;
        newMetrics.totalVersao = versaoCount;
        newMetrics.totalPedido = pedidoCount;
        newMetrics.totalAvaliacao = avaliacaoCount;
        newMetrics.totalPerfil = perfilCount;
        newMetrics.totalUsuarios = usuariosCount;
        newMetrics.totalCategoriasTV = categoriasTVCount;
        newMetrics.totalCategoriaFilmes = categoriaFilmesCount;
        newMetrics.totalCategoriaSeries = categoriaSeriesCount;
        newMetrics.totalCategoriaDorama = categoriaDoramaCount;
        newMetrics.totalCategoriaAnimes = categoriaAnimesCount;
        newMetrics.totalCategoriaNovelas = categoriaNovelasCount;
        newMetrics.totalMeusAplicativos = meusAplicativosCount;

        // Para os filmes e séries do Modo Tibim, eles ainda são tipos dentro da tabela de conteúdos
        if (tableIds.conteudos && tableIds.conteudos.trim() !== '') {
          try {
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
            const [filmesCount, serieCount, seriesCount] = await Promise.all([
              countByTipo('Filme'),
              countByTipo('Serie'),
              countByTipo('Série'),
            ]);
            newMetrics.totalFilmes = filmesCount;
            newMetrics.totalSeries = serieCount + seriesCount;
          } catch {}
        }
      } else {
        // Modos Singular (Thiago) ou Plural (Francisco)
        const promises = [
          fetchCount(tableIds.episodios),
          fetchCount(tableIds.banners),
          fetchCount(tableIds.categorias),
          fetchCount(tableIds.sessoes),
          fetchCount(tableIds.plataformas),
          fetchCount(tableIds.usuarios),
        ];

        // Se for Plural (Francisco), buscar também Categorias TV e Categorias Anime
        if (mode === 'plural') {
          promises.push(fetchCount(tableIds.categoriasTV));
          promises.push(fetchCount(tableIds.categoriasAnime));
        }

        const results = await Promise.all(promises);

        newMetrics.totalEpisodios = results[0];
        newMetrics.totalBanners = results[1];
        newMetrics.totalCategorias = results[2];
        newMetrics.totalSessoes = results[3];
        newMetrics.totalPlataformas = results[4];
        newMetrics.totalUsuarios = results[5];

        if (mode === 'plural') {
          newMetrics.totalCategoriasTV = results[6] || 0;
          newMetrics.totalCategoriasAnime = results[7] || 0;
        }

        // Buscar filmes/series/TV do conteúdos para Singular/Plural
        if (tableIds.conteudos && tableIds.conteudos.trim() !== '') {
          try {
            // Total geral
            newMetrics.totalConteudos = await fetchCount(tableIds.conteudos);

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
      }

      console.log('✅ Métricas carregadas:', newMetrics);
      console.timeEnd('⏱️ Métricas carregadas em');
      setMetrics(newMetrics);
      try {
        sessionStorage.setItem(METRICS_CACHE_KEY, JSON.stringify(newMetrics));
      } catch {
        // noop
      }
      lastLoadedSignatureRef.current = configSignature;
    } catch (err) {
      console.error('❌ Erro ao buscar métricas:', err);
      setError('Erro ao carregar métricas');
    } finally {
      inFlightRef.current = false;
      setLoading(false);
    }
  }, [config?.tableIds, config?.apiToken, config?.baseUrl, configSignature, mode]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  return { metrics, loading, error, refetch: () => fetchMetrics(true) };
};
