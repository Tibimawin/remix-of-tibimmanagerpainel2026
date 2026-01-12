import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  Download, 
  Copy, 
  FileText, 
  Tv, 
  Film, 
  Play,
  Settings2,
  Eye,
  RefreshCw,
  Link2,
  Save
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useBaserowService } from '@/services/BaserowService';
import { useConfig } from '@/contexts/ConfigContext';
import { playlistStorageService, PlaylistMetadata } from '@/services/PlaylistStorageService';
import { PlaylistManager } from '@/components/PlaylistManager';
import { auth } from '@/config/firebase';
import { onAuthStateChanged } from 'firebase/auth';

interface Conteudo {
  id: number;
  Titulo: string;
  Ano: string;
  Categoria: string;
  Sinopse: string;
  Link: string;
  Foto: string;
  Lancamento: string;
  Genero: string;
  Classificacao: string;
  Duracao: string;
  Qualidade: string;
  Audio: string;
  Legenda: string;
  Ativo?: boolean | string;
  Status_Ativo?: boolean | string;
  [key: string]: any; // Para permitir campos adicionais
}

interface Episodio {
  id: number;
  Titulo?: string;
  Nome?: string;
  Serie: string;
  Temporada: string;
  Episodio: string;
  Link: string;
  Foto: string;
  Sinopse: string;
  Lancamento: string;
  Duracao: string;
  Qualidade: string;
  Audio: string;
  Legenda: string;
  Ativo?: boolean | string;
  Status_Ativo?: boolean | string;
  [key: string]: any; // Para permitir campos adicionais
}

export default function ListaM3U() {
  const baserowService = useBaserowService();
  const { config: baserowConfig } = useConfig();
  const [conteudos, setConteudos] = useState<Conteudo[]>([]);
  const [episodios, setEpisodios] = useState<Episodio[]>([]);
  const [loading, setLoading] = useState(false);
  const [m3uContent, setM3uContent] = useState('');
  const [stats, setStats] = useState({
    filmes: 0,
    series: 0,
    episodios: 0,
    total: 0
  });
  const [savedPlaylists, setSavedPlaylists] = useState<PlaylistMetadata[]>([]);
  const [permanentUrl, setPermanentUrl] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Configurações da lista M3U
  const [config, setConfig] = useState({
    incluirFilmes: true,
    incluirSeries: true,
    incluirTV: true,
    apenasAtivos: true,
    formatoPersonalizado: false,
    nomePlaylist: 'StreamFlix Playlist',
    prefixoCanal: '',
    agruparPorCategoria: false
  });

  const loadStats = async () => {
    setLoading(true);
    try {
      // Carregar apenas primeira página para estatísticas rápidas
      const [conteudosResponse, episodiosResponse] = await Promise.all([
        baserowService.getTableData(baserowConfig.tableIds.conteudos, 1, 1),
        baserowService.getTableData(baserowConfig.tableIds.episodios, 1, 1)
      ]);

      setStats({
        filmes: 0,
        series: 0,
        episodios: episodiosResponse?.count || 0,
        total: (conteudosResponse?.count || 0) + (episodiosResponse?.count || 0)
      });

      toast.success("Estatísticas carregadas. Clique em 'Gerar Lista M3U' para processar todos os dados.");
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
      toast.error("Erro ao carregar estatísticas.");
    } finally {
      setLoading(false);
    }
  };

  const loadAllData = async () => {
    setLoading(true);
    try {
      toast.info("Carregando todos os dados... Isso pode levar alguns minutos.");
      
      const [conteudosResponse, episodiosResponse] = await Promise.all([
        baserowService.getAllTableData(baserowConfig.tableIds.conteudos),
        baserowService.getAllTableData(baserowConfig.tableIds.episodios)
      ]);

      const conteudosData = conteudosResponse?.results || [];
      const episodiosData = episodiosResponse?.results || [];

      setConteudos(conteudosData);
      setEpisodios(episodiosData);

      // Calcular estatísticas detalhadas
      const filmes = conteudosData.filter(c => c.Categoria?.toLowerCase().includes('filme') || c.Categoria?.toLowerCase().includes('movie')) || [];
      const series = conteudosData.filter(c => c.Categoria?.toLowerCase().includes('serie') || c.Categoria?.toLowerCase().includes('series')) || [];

      setStats({
        filmes: filmes.length,
        series: series.length,
        episodios: episodiosData.length,
        total: conteudosData.length + episodiosData.length
      });

      return { conteudosData, episodiosData };
    } catch (error) {
      console.error('Erro ao carregar todos os dados:', error);
      toast.error("Erro ao carregar dados para gerar a lista M3U.");
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const generateM3U = async () => {
    // Se não temos dados carregados, carregar primeiro
    let currentConteudos = conteudos;
    let currentEpisodios = episodios;
    
    if (conteudos.length === 0 && episodios.length === 0) {
      try {
        const data = await loadAllData();
        currentConteudos = data?.conteudosData || [];
        currentEpisodios = data?.episodiosData || [];
      } catch (error) {
        return;
      }
    }

    console.log('Debug M3U Generation:');
    console.log('Current conteudos:', currentConteudos.length);
    console.log('Current episodios:', currentEpisodios.length);
    console.log('Config:', config);
    
    // Debug - mostrar structure dos primeiros items
    if (currentConteudos.length > 0) {
      console.log('Sample conteudo structure:', Object.keys(currentConteudos[0]));
      console.log('Sample conteudo data:', currentConteudos[0]);
    }

    let m3uLines = [`#EXTM3U x-tvg-url="" tv-icon="" tvg-name="${config.nomePlaylist}"`];
    
    // Função auxiliar para verificar se conteúdo está ativo
    const isAtivo = (item: any) => {
      if (!config.apenasAtivos) return true;
      
      // Verificar múltiplas possibilidades do campo ativo
      const ativoFields = ['Ativo', 'Status_Ativo', 'ativo'];
      for (const field of ativoFields) {
        if (item[field] !== undefined) {
          return item[field] === true || item[field] === 'true' || item[field] === 1 || item[field] === '1';
        }
      }
      // Se não encontrar nenhum campo de ativo, incluir o item (assumir ativo)
      return true;
    };

    // Filtrar conteúdos
    let filteredConteudos = currentConteudos;
    if (config.apenasAtivos) {
      filteredConteudos = filteredConteudos.filter(isAtivo);
    }
    
    console.log('Filtered conteudos:', filteredConteudos.length);
    console.log('Sample categories:', filteredConteudos.slice(0, 5).map(c => c.Categoria));

    // Adicionar filmes
    if (config.incluirFilmes) {
      const filmes = filteredConteudos.filter(c => {
        const categoria = c.Categoria?.toLowerCase() || '';
        return categoria.includes('filme') || categoria.includes('movie');
      });
      
      console.log('Filmes encontrados:', filmes.length);

      filmes.forEach(filme => {
        // Verificar múltiplas possibilidades de campos título e link
        const titulo = filme.Titulo || filme.Nome || filme.Title || filme.name;
        const link = filme.Link || filme.URL || filme.Url || filme.link || filme.url;
        
        if (!titulo || !link) {
          console.log('Filme ignorado (sem título ou link):', {
            titulo,
            link,
            availableFields: Object.keys(filme)
          });
          return;
        }
        
        const channelName = config.prefixoCanal ? `${config.prefixoCanal} ${titulo}` : titulo;
        const groupTitle = config.agruparPorCategoria ? filme.Categoria || 'Filme' : 'Filme';
        
        m3uLines.push(
          `#EXTINF:-1 tvg-id="${filme.id}" tvg-name="${titulo}" tvg-logo="${filme.Foto || filme.Capa || ''}" group-title="${groupTitle}",${channelName}`
        );
        m3uLines.push(link);
      });
    }

    // Adicionar séries (conteúdos de série)
    if (config.incluirSeries) {
      const series = filteredConteudos.filter(c => {
        const categoria = c.Categoria?.toLowerCase() || '';
        return categoria.includes('serie') || categoria.includes('series');
      });
      
      console.log('Séries encontradas:', series.length);

      series.forEach(serie => {
        if (!serie.Titulo || !serie.Link) {
          console.log('Série ignorada (sem título ou link):', serie);
          return;
        }
        const channelName = config.prefixoCanal ? `${config.prefixoCanal} ${serie.Titulo}` : serie.Titulo;
        const groupTitle = config.agruparPorCategoria ? serie.Categoria || 'Séries' : 'Séries';
        
        m3uLines.push(
          `#EXTINF:-1 tvg-id="${serie.id}" tvg-name="${serie.Titulo}" tvg-logo="${serie.Foto || ''}" group-title="${groupTitle}",${channelName}`
        );
        m3uLines.push(serie.Link);
      });

      // Adicionar episódios
      let filteredEpisodios = currentEpisodios;
      if (config.apenasAtivos) {
        filteredEpisodios = filteredEpisodios.filter(isAtivo);
      }
      
      console.log('Episódios filtrados:', filteredEpisodios.length);

      filteredEpisodios.forEach(episodio => {
        // Verificar se tem título ou nome
        const titulo = episodio.Titulo || episodio.Nome || '';
        if (!titulo || !episodio.Link) {
          console.log('Episódio ignorado (sem título ou link):', episodio);
          return;
        }
        
        const episodioTitle = `${episodio.Serie || ''} - T${episodio.Temporada}E${episodio.Episodio} - ${titulo}`;
        const channelName = config.prefixoCanal ? `${config.prefixoCanal} ${episodioTitle}` : episodioTitle;
        const groupTitle = config.agruparPorCategoria ? `${episodio.Serie || 'Serie'} - Temporada ${episodio.Temporada}` : 'Episódios';
        
        m3uLines.push(
          `#EXTINF:-1 tvg-id="ep_${episodio.id}" tvg-name="${episodioTitle}" tvg-logo="${episodio.Foto || ''}" group-title="${groupTitle}",${channelName}`
        );
        m3uLines.push(episodio.Link);
      });
    }

    // Adicionar TV/Canais
    if (config.incluirTV) {
      const canaisTV = filteredConteudos.filter(c => {
        const categoria = c.Categoria?.toLowerCase() || '';
        return categoria.includes('tv') || categoria.includes('canal');
      });
      
      console.log('Canais TV encontrados:', canaisTV.length);

      canaisTV.forEach(canal => {
        if (!canal.Titulo || !canal.Link) {
          console.log('Canal ignorado (sem título ou link):', canal);
          return;
        }
        const channelName = config.prefixoCanal ? `${config.prefixoCanal} ${canal.Titulo}` : canal.Titulo;
        const groupTitle = config.agruparPorCategoria ? canal.Categoria || 'TV' : 'TV';
        
        m3uLines.push(
          `#EXTINF:-1 tvg-id="${canal.id}" tvg-name="${canal.Titulo}" tvg-logo="${canal.Foto || ''}" group-title="${groupTitle}",${channelName}`
        );
        m3uLines.push(canal.Link);
      });
    }

    // Se não temos nenhum item específico, adicionar todos os conteúdos restantes
    if (config.incluirFilmes || config.incluirSeries || config.incluirTV) {
      const outrosConteudos = filteredConteudos.filter(c => {
        const categoria = c.Categoria?.toLowerCase() || '';
        // Incluir conteúdos que não se encaixam nas categorias específicas
        const isFilme = categoria.includes('filme') || categoria.includes('movie');
        const isSerie = categoria.includes('serie') || categoria.includes('series');
        const isTV = categoria.includes('tv') || categoria.includes('canal');
        
        return !isFilme && !isSerie && !isTV && c.Titulo && c.Link;
      });
      
      console.log('Outros conteúdos encontrados:', outrosConteudos.length);
      
      outrosConteudos.forEach(conteudo => {
        const channelName = config.prefixoCanal ? `${config.prefixoCanal} ${conteudo.Titulo}` : conteudo.Titulo;
        const groupTitle = config.agruparPorCategoria ? conteudo.Categoria || 'Outros' : 'Outros';
        
        m3uLines.push(
          `#EXTINF:-1 tvg-id="${conteudo.id}" tvg-name="${conteudo.Titulo}" tvg-logo="${conteudo.Foto || ''}" group-title="${groupTitle}",${channelName}`
        );
        m3uLines.push(conteudo.Link);
      });
    }

    console.log('Total de linhas na playlist:', m3uLines.length);
    console.log('Linhas EXTINF:', m3uLines.filter(line => line.includes('#EXTINF')).length);

    const finalM3U = m3uLines.join('\n');
    setM3uContent(finalM3U);

    toast.success(`${m3uLines.filter(line => line.includes('#EXTINF')).length} itens adicionados à playlist.`);
  };

  const downloadM3U = () => {
    if (!m3uContent) {
      toast.error("Gere a lista M3U primeiro.");
      return;
    }

    const blob = new Blob([m3uContent], { type: 'application/x-mpegurl' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${config.nomePlaylist.replace(/[^a-zA-Z0-9]/g, '_')}.m3u`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success("A lista M3U foi baixada com sucesso.");
  };

  const copyToClipboard = () => {
    if (!m3uContent) {
      toast.error("Gere a lista M3U primeiro.");
      return;
    }

    navigator.clipboard.writeText(m3uContent).then(() => {
      toast.success("Lista M3U copiada para a área de transferência.");
    }).catch(() => {
      toast.error("Erro ao copiar para a área de transferência.");
    });
  };

  const generateM3ULink = () => {
    if (!m3uContent) {
      toast.error("Gere a lista M3U primeiro.");
      return;
    }

    const blob = new Blob([m3uContent], { type: 'application/x-mpegurl' });
    const url = URL.createObjectURL(blob);
    
    navigator.clipboard.writeText(url).then(() => {
      toast.success("Link da lista M3U copiado para a área de transferência!");
    }).catch(() => {
      toast.error("Erro ao gerar link da lista M3U.");
    });
  };

  const savePlaylistPermanently = async () => {
    if (!m3uContent) {
      toast.error("Gere a lista M3U primeiro.");
      return;
    }

    if (!isAuthenticated) {
      toast.error("Você precisa estar autenticado para salvar playlists permanentemente.");
      return;
    }

    setIsSaving(true);
    try {
      // Count stats from m3u content
      const extinftLines = m3uContent.split('\n').filter(line => line.includes('#EXTINF'));
      const filmesCount = extinftLines.filter(line => line.includes('group-title="Filme')).length;
      const seriesCount = extinftLines.filter(line => line.includes('group-title="Séries')).length;
      const episodiosCount = extinftLines.filter(line => line.includes('group-title="Episódios') || line.includes('Temporada')).length;

      const playlistStats = {
        totalItems: extinftLines.length,
        filmes: filmesCount,
        series: seriesCount,
        episodios: episodiosCount,
        fileSize: 0 // Will be calculated by service
      };

      const metadata = await playlistStorageService.uploadPlaylist(
        m3uContent,
        config,
        playlistStats
      );

      setPermanentUrl(metadata.fileUrl);
      await loadSavedPlaylists();
      
      toast.success("Playlist salva com sucesso! Link permanente gerado.");
    } catch (error) {
      console.error('Erro ao salvar playlist:', error);
      toast.error("Erro ao salvar playlist permanentemente.");
    } finally {
      setIsSaving(false);
    }
  };

  const loadSavedPlaylists = async () => {
    if (!isAuthenticated) return;
    
    try {
      const playlists = await playlistStorageService.getPlaylists();
      setSavedPlaylists(playlists);
    } catch (error) {
      console.error('Erro ao carregar playlists salvas:', error);
    }
  };

  const handleRegeneratePlaylist = async (playlistId: string) => {
    if (!m3uContent) {
      toast.error("Gere a lista M3U primeiro antes de regenerar.");
      return;
    }

    try {
      const extinftLines = m3uContent.split('\n').filter(line => line.includes('#EXTINF'));
      const filmesCount = extinftLines.filter(line => line.includes('group-title="Filme')).length;
      const seriesCount = extinftLines.filter(line => line.includes('group-title="Séries')).length;
      const episodiosCount = extinftLines.filter(line => line.includes('group-title="Episódios') || line.includes('Temporada')).length;

      const playlistStats = {
        totalItems: extinftLines.length,
        filmes: filmesCount,
        series: seriesCount,
        episodios: episodiosCount,
        fileSize: 0
      };

      await playlistStorageService.regeneratePlaylist(playlistId, m3uContent, playlistStats);
      await loadSavedPlaylists();
      toast.success("Playlist regenerada com sucesso!");
    } catch (error) {
      console.error('Erro ao regenerar playlist:', error);
      toast.error("Erro ao regenerar playlist.");
    }
  };

  const handleDeletePlaylist = async (playlistId: string) => {
    try {
      await playlistStorageService.deletePlaylist(playlistId);
      await loadSavedPlaylists();
      toast.success("Playlist excluída com sucesso!");
    } catch (error) {
      console.error('Erro ao excluir playlist:', error);
      toast.error("Erro ao excluir playlist.");
    }
  };

  useEffect(() => {
    loadStats();
    
    // Check auth state
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsAuthenticated(!!user);
      if (user) {
        loadSavedPlaylists();
      } else {
        setSavedPlaylists([]);
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center space-x-3">
        <FileText className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Lista M3U</h1>
          <p className="text-muted-foreground">Gere listas M3U personalizadas dos seus conteúdos</p>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Film className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Filmes</p>
                <p className="text-2xl font-bold">{stats.filmes}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Tv className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Séries</p>
                <p className="text-2xl font-bold">{stats.series}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Play className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm text-muted-foreground">Episódios</p>
                <p className="text-2xl font-bold">{stats.episodios}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configurações */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Settings2 className="h-5 w-5" />
              <span>Configurações da Lista</span>
            </CardTitle>
            <CardDescription>
              Configure os parâmetros para gerar sua lista M3U personalizada
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="nomePlaylist">Nome da Playlist</Label>
                <Input
                  id="nomePlaylist"
                  value={config.nomePlaylist}
                  onChange={(e) => setConfig(prev => ({ ...prev, nomePlaylist: e.target.value }))}
                  placeholder="Nome da sua playlist M3U"
                />
              </div>

              <div>
                <Label htmlFor="prefixoCanal">Prefixo dos Canais (opcional)</Label>
                <Input
                  id="prefixoCanal"
                  value={config.prefixoCanal}
                  onChange={(e) => setConfig(prev => ({ ...prev, prefixoCanal: e.target.value }))}
                  placeholder="Ex: StreamFlix -"
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h4 className="font-medium">Tipos de Conteúdo</h4>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="incluirFilmes"
                  checked={config.incluirFilmes}
                  onCheckedChange={(checked) => setConfig(prev => ({ ...prev, incluirFilmes: checked }))}
                />
                <Label htmlFor="incluirFilmes">Incluir Filmes</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="incluirSeries"
                  checked={config.incluirSeries}
                  onCheckedChange={(checked) => setConfig(prev => ({ ...prev, incluirSeries: checked }))}
                />
                <Label htmlFor="incluirSeries">Incluir Séries e Episódios</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="incluirTV"
                  checked={config.incluirTV}
                  onCheckedChange={(checked) => setConfig(prev => ({ ...prev, incluirTV: checked }))}
                />
                <Label htmlFor="incluirTV">Incluir TV/Canais</Label>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h4 className="font-medium">Opções Avançadas</h4>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="apenasAtivos"
                  checked={config.apenasAtivos}
                  onCheckedChange={(checked) => setConfig(prev => ({ ...prev, apenasAtivos: checked }))}
                />
                <Label htmlFor="apenasAtivos">Apenas conteúdos ativos</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="agruparPorCategoria"
                  checked={config.agruparPorCategoria}
                  onCheckedChange={(checked) => setConfig(prev => ({ ...prev, agruparPorCategoria: checked }))}
                />
                <Label htmlFor="agruparPorCategoria">Agrupar por categoria</Label>
              </div>
            </div>

            <div className="flex space-x-2">
              <Button onClick={loadStats} variant="outline" disabled={loading}>
                {loading ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Atualizar Estatísticas
              </Button>
              
              <Button onClick={generateM3U} className="flex-1">
                <FileText className="h-4 w-4 mr-2" />
                Gerar Lista M3U
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Preview e Download */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Eye className="h-5 w-5" />
              <span>Preview da Lista M3U</span>
            </CardTitle>
            <CardDescription>
              Visualize e baixe sua lista M3U gerada
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={m3uContent}
              readOnly
              placeholder="A lista M3U aparecerá aqui após gerar..."
              className="min-h-[300px] font-mono text-sm"
            />

            <div className="flex flex-wrap gap-2">
              <Button 
                onClick={savePlaylistPermanently} 
                disabled={!m3uContent || isSaving || !isAuthenticated}
                className="flex-1"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Salvar Permanentemente
                  </>
                )}
              </Button>
            </div>

            {!isAuthenticated && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <p className="text-sm text-amber-600 dark:text-amber-400">
                  ⚠️ Você precisa estar autenticado para salvar playlists permanentemente.
                </p>
              </div>
            )}

            {permanentUrl && (
              <div className="space-y-3 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  <p className="text-sm font-medium text-green-600 dark:text-green-400">
                    ✅ Playlist salva com sucesso!
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Link Permanente:</Label>
                  <div className="flex gap-2">
                    <Input
                      value={permanentUrl}
                      readOnly
                      className="font-mono text-xs"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(permanentUrl);
                        toast.success("Link copiado!");
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <Separator />

            <div className="flex flex-wrap gap-2">
              <Button onClick={downloadM3U} disabled={!m3uContent} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Baixar M3U
              </Button>
              
              <Button onClick={copyToClipboard} variant="outline" disabled={!m3uContent}>
                <Copy className="h-4 w-4 mr-2" />
                Copiar
              </Button>
              
              <Button onClick={generateM3ULink} variant="outline" disabled={!m3uContent}>
                <Link2 className="h-4 w-4 mr-2" />
                Gerar Link
              </Button>
            </div>

            {m3uContent && (
              <div className="mt-4 p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <strong>Linhas:</strong> {m3uContent.split('\n').length} | 
                  <strong> Canais:</strong> {m3uContent.split('#EXTINF').length - 1} | 
                  <strong> Tamanho:</strong> {(new Blob([m3uContent]).size / 1024).toFixed(1)} KB
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Playlists Salvas */}
      {isAuthenticated && (
        <PlaylistManager
          playlists={savedPlaylists}
          onRegenerate={handleRegeneratePlaylist}
          onDelete={handleDeletePlaylist}
          onRefresh={loadSavedPlaylists}
        />
      )}
    </div>
  );
}