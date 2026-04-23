import { useState } from 'react';
import { toast } from 'sonner';
import { useBaserowService } from '@/services/BaserowService';
import { useConfig } from '@/contexts/ConfigContext';
import { useSystemLogs } from '@/hooks/useSystemLogs';
import { useAdminConfig } from '@/contexts/AdminConfigContext';
import { useTypeMode } from '@/contexts/TypeModeContext';
import { BASEROW_PROXY_CONFIG } from '@/config/proxyConfig';
import { supabase } from '@/integrations/supabase/client';

interface CanalTV {
  id: string;
  Nome: string;
  Link: string;
  Categoria: string;
  Capa?: string;
  Idioma?: string;
  Online?: boolean;
  Offline?: boolean;
}

export const useImportarCanaisTV = () => {
  const [canais, setCanais] = useState<CanalTV[]>([]);
  const [loading, setLoading] = useState(false);
  const [importandoTodos, setImportandoTodos] = useState(false);

  const baserowService = useBaserowService();
  const { config } = useConfig();
  const { addLog } = useSystemLogs();
  const { adminConfig } = useAdminConfig();
  const { mode } = useTypeMode();

  // Resolve a tabela alvo conforme o modo (singular → conteúdos, plural → canais de TV)
  const resolveTargetTableId = (): string => {
    // Plural (Francisco): sempre canais de TV
    // Singular (Thiago): canais de TV se preenchido, senão conteúdos
    let desired = '';
    if (mode === 'plural') {
      desired = config.tableIds.canaisTv || '';
    } else {
      desired = config.tableIds.canaisTv?.trim()
        ? config.tableIds.canaisTv
        : (config.tableIds.conteudos || '');
    }
    if (!desired) {
      // Fallback seguro: se não estiver configurado, usar conteúdos
      toast.warning('Tabela alvo não configurada. Usando "Conteúdos" por padrão.');
      return config.tableIds.conteudos;
    }
    return desired;
  };

  // Busca na origem usando configurações de admin
  const fetchSourceTable = async (tableId: string, search?: string, size: number = 200) => {
    const page = 1;
    const searchParam = search ? `&search=${encodeURIComponent(search)}` : '';
    const safeSize = Math.min(200, Math.max(1, size));
    const endpoint = `/api/database/rows/table/${tableId}/?user_field_names=true&page=${page}&size=${safeSize}${searchParam}`;
    const originalUrl = `${adminConfig.canaisTv.sourceBaseUrl}${endpoint}`;

    let response: Response;
    if (adminConfig.canaisTv.sourceBaseUrl.startsWith('http://')) {
      // 🔧 Usar proxy local configurado
      const proxyPayload = {
        url: originalUrl,
        method: 'GET',
        token: adminConfig.canaisTv.sourceToken,
        body: null
      };

      response = await fetch(BASEROW_PROXY_CONFIG.ACTIVE_PROXY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(proxyPayload)
      });
    } else {
      response = await fetch(originalUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Token ${adminConfig.canaisTv.sourceToken}`,
          'Content-Type': 'application/json',
        },
      });
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erro ${response.status}: ${errorText || response.statusText}`);
    }
    return response.json();
  };

  const searchCanais = async (searchTerm: string) => {
    setLoading(true);
    try {

      toast('Buscando canais...', { description: `Pesquisando por "${searchTerm}"` });

      const data = await fetchSourceTable(adminConfig.canaisTv.sourceTableId, searchTerm, 200);

      if (!data.results || data.results.length === 0) {
        toast.error('Nenhum canal encontrado', {
          description: `Não foram encontrados canais para "${searchTerm}"`
        });
        setCanais([]);
        return;
      }

      const canaisFormatados: CanalTV[] = data.results.map((canal: any) => ({
        id: canal.id,
        Nome: canal.Nome || 'Canal sem nome',
        Link: canal.Link || '',
        Categoria: canal.Categoria || 'Sem categoria',
        Capa: canal.Capa || '',
        Idioma: canal.Idioma || '',
        Online: canal.Online || false,
        Offline: canal.Offline || false,
      }));

      setCanais(canaisFormatados);
      toast.success(`${canaisFormatados.length} canais encontrados!`);

    } catch (error) {
      console.error('Erro ao buscar canais:', error);
      toast.error('Erro ao buscar canais', {
        description: 'Verifique se a tabela origem está configurada corretamente'
      });
      setCanais([]);
    } finally {
      setLoading(false);
    }
  };

  // Buscar TODOS os canais disponíveis (com paginação automática)
  const buscarTodos = async () => {
    setLoading(true);
    try {
      toast('Carregando todos os canais...', { description: 'Por favor aguarde' });

      const allResults: any[] = [];
      let currentPage = 1;
      let hasMore = true;
      const pageSize = 200;

      // Buscar todas as páginas até terminar
      while (hasMore) {
        const endpoint = `/api/database/rows/table/${adminConfig.canaisTv.sourceTableId}/?user_field_names=true&page=${currentPage}&size=${pageSize}`;
        const originalUrl = `${adminConfig.canaisTv.sourceBaseUrl}${endpoint}`;

        let response: Response;
        if (adminConfig.canaisTv.sourceBaseUrl.startsWith('http://')) {
          const proxyPayload = {
            url: originalUrl,
            method: 'GET',
            token: adminConfig.canaisTv.sourceToken,
            body: null
          };

          response = await fetch(BASEROW_PROXY_CONFIG.ACTIVE_PROXY_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(proxyPayload)
          });
        } else {
          response = await fetch(originalUrl, {
            method: 'GET',
            headers: {
              'Authorization': `Token ${adminConfig.canaisTv.sourceToken}`,
              'Content-Type': 'application/json',
            },
          });
        }

        if (!response.ok) {
          throw new Error(`Erro ${response.status}`);
        }

        const data = await response.json();

        if (data.results && data.results.length > 0) {
          allResults.push(...data.results);

          // Verificar se há mais páginas
          if (data.next) {
            currentPage++;
            console.log(`📄 Página ${currentPage} - ${allResults.length} canais carregados...`);
          } else {
            hasMore = false;
          }
        } else {
          hasMore = false;
        }
      }

      if (allResults.length === 0) {
        toast.error('Nenhum canal encontrado na origem');
        setCanais([]);
        return;
      }

      const canaisFormatados: CanalTV[] = allResults.map((canal: any) => ({
        id: canal.id,
        Nome: canal.Nome || 'Canal sem nome',
        Link: canal.Link || '',
        Categoria: canal.Categoria || 'Sem categoria',
        Capa: canal.Capa || '',
        Idioma: canal.Idioma || '',
        Online: canal.Online || false,
        Offline: canal.Offline || false,
      }));

      setCanais(canaisFormatados);
      toast.success(`✅ ${canaisFormatados.length} canais carregados!`, {
        description: `${canaisFormatados.filter(c => !c.Offline).length} online • ${canaisFormatados.filter(c => c.Offline).length} offline`
      });

    } catch (error) {
      console.error('Erro ao carregar canais:', error);
      toast.error('Erro ao carregar canais', {
        description: 'Verifique se a tabela origem está configurada corretamente'
      });
      setCanais([]);
    } finally {
      setLoading(false);
    }
  };

  const protectLink = async (url: string, channelName: string): Promise<string> => {
    try {
      const { data, error } = await supabase.functions.invoke('generate-protected-link', {
        body: { url, channelName, expiresInDays: 30 },
      });
      if (error || !data?.protectedUrl) return url;
      return data.protectedUrl;
    } catch {
      return url; // Fallback to original if protection fails
    }
  };

  const importarCanal = async (canal: CanalTV) => {
    try {
      if (canal.Offline) {
        toast.error('Canal offline não pode ser importado', {
          description: `"${canal.Nome}" está marcado como offline`
        });
        return;
      }

      const targetTableId = resolveTargetTableId();

      // Proteger o link antes de importar
      const protectedLink = await protectLink(canal.Link, canal.Nome);

      // Verificar se o canal já existe na tabela de conteúdos
      const existingContent = await baserowService.getAllTableData(
        targetTableId,
        canal.Nome,
        10
      );

      if (existingContent.results && existingContent.results.length > 0) {
        const existingCanal = existingContent.results.find((item: any) =>
          item.Nome?.toLowerCase() === canal.Nome.toLowerCase()
        );

        if (existingCanal) {
          toast('Atualizando canal...', { description: `Atualizando link de "${canal.Nome}"` });

          const updatePayload = {
            'Link': protectedLink,
            'Sinopse': `Canal de TV atualizado automaticamente. Status: ${canal.Online ? 'Online' : canal.Offline ? 'Offline' : 'Desconhecido'}`,
          };

          await baserowService.updateRow(targetTableId, existingCanal.id, updatePayload);

          toast.success('Canal atualizado com sucesso!', {
            description: `Link de "${canal.Nome}" foi atualizado e protegido`
          });

          addLog('Atualizou link do canal de TV (protegido)', `Canal: ${canal.Nome}`);
          return;
        }
      }

      toast('Importando canal...', { description: `Importando "${canal.Nome}" com proteção` });

      const payload = {
        'Nome': canal.Nome,
        'Link': protectedLink,
        'Categoria': canal.Categoria,
        'Capa': canal.Capa || '',
        'Idioma': canal.Idioma || '',
        'Tipo': 'TV',
        'Views': '0',
        'Sinopse': `Canal de TV importado automaticamente. Status: ${canal.Online ? 'Online' : canal.Offline ? 'Offline' : 'Desconhecido'}`,
      };

      await baserowService.createRow(targetTableId, payload);

      toast.success('Canal importado com sucesso!', {
        description: `"${canal.Nome}" foi adicionado com link protegido`
      });

      addLog('Importou canal de TV (protegido)', `Canal: ${canal.Nome}`);

    } catch (error) {
      console.error('Erro ao importar canal:', error);
      toast.error('Falha ao importar canal', {
        description: String(error)
      });
    }
  };

  const importarTodos = async () => {
    if (canais.length === 0) {
      toast.error('Nenhum canal para importar');
      return;
    }

    const canaisOnline = canais.filter(canal => !canal.Offline);

    if (canaisOnline.length === 0) {
      toast.error('Nenhum canal online para importar', {
        description: 'Todos os canais encontrados estão offline'
      });
      return;
    }

    setImportandoTodos(true);
    try {
      toast('Importando canais online...', {
        description: `Importando ${canaisOnline.length} canais online de ${canais.length} encontrados`
      });

      let importados = 0;
      let atualizados = 0;
      let falhas = 0;

      const targetTableId = resolveTargetTableId();

      for (const canal of canaisOnline) {
        try {
          // Proteger o link
          const protectedLink = await protectLink(canal.Link, canal.Nome);

          // Verificar se o canal já existe na tabela de conteúdos
          const existingContent = await baserowService.getAllTableData(
            targetTableId,
            canal.Nome,
            10
          );

          if (existingContent.results && existingContent.results.length > 0) {
            const existingCanal = existingContent.results.find((item: any) =>
              item.Nome?.toLowerCase() === canal.Nome.toLowerCase()
            );

            if (existingCanal) {
              const updatePayload = {
                'Link': protectedLink,
                'Sinopse': `Canal de TV atualizado automaticamente. Status: ${canal.Online ? 'Online' : canal.Offline ? 'Offline' : 'Desconhecido'}`,
              };

              await baserowService.updateRow(targetTableId, existingCanal.id, updatePayload);
              atualizados++;
            }
          } else {
            const payload = {
              'Nome': canal.Nome,
              'Link': protectedLink,
              'Categoria': canal.Categoria,
              'Capa': canal.Capa || '',
              'Idioma': canal.Idioma || '',
              'Tipo': 'TV',
              'Views': '0',
              'Sinopse': `Canal de TV importado automaticamente. Status: ${canal.Online ? 'Online' : canal.Offline ? 'Offline' : 'Desconhecido'}`,
            };

            await baserowService.createRow(targetTableId, payload);
            importados++;
          }

          // Pequena pausa para não sobrecarregar o servidor
          await new Promise(resolve => setTimeout(resolve, 200));

        } catch (error) {
          console.error(`Erro ao processar canal ${canal.Nome}:`, error);
          falhas++;
        }
      }

      if (importados > 0 || atualizados > 0) {
        const totalProcessados = importados + atualizados;
        toast.success(`Processamento concluído!`, {
          description: `${importados} canais importados, ${atualizados} atualizados${falhas > 0 ? `, ${falhas} falharam` : ''}`
        });

        addLog('Processou canais de TV em massa', `Total encontrados: ${canais.length}, Online: ${canaisOnline.length}, Importados: ${importados}, Atualizados: ${atualizados}, Falhas: ${falhas}`);
      } else {
        toast.error('Nenhum canal foi processado', {
          description: 'Todas as operações falharam'
        });
      }

      // Limpar a lista após importação
      setCanais([]);

    } catch (error) {
      console.error('Erro na importação em massa:', error);
      toast.error('Erro na importação em massa', {
        description: String(error)
      });
    } finally {
      setImportandoTodos(false);
    }
  };

  // Função para agrupar canais por categoria
  const agruparPorCategoria = () => {
    const grupos: Record<string, CanalTV[]> = {};

    canais.forEach(canal => {
      const categoria = canal.Categoria;
      if (!grupos[categoria]) {
        grupos[categoria] = [];
      }
      grupos[categoria].push(canal);
    });

    // Ordenar categorias alfabeticamente
    const categoriasOrdenadas: Record<string, CanalTV[]> = {};
    Object.keys(grupos)
      .sort((a, b) => a.localeCompare(b))
      .forEach(categoria => {
        categoriasOrdenadas[categoria] = grupos[categoria];
      });

    return categoriasOrdenadas;
  };

  return {
    canais,
    loading,
    importandoTodos,
    searchCanais,
    buscarTodos,
    importarCanal,
    importarTodos,
    agruparPorCategoria,
  };
};
