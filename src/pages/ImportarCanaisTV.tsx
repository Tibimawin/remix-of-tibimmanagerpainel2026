import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { Tv, Download, Search, Wifi, WifiOff, RefreshCw, LayoutGrid } from 'lucide-react';
import { useImportarCanaisTV } from '@/hooks/useImportarCanaisTV';
import { useTypeMode } from '@/contexts/TypeModeContext';
import { cn } from '@/lib/utils';

interface CanalTV {
  id: string;
  Nome: string;
  Link: string;
  Categoria: string;
  Capa?: any;
  Idioma?: string;
  Online?: boolean;
  Offline?: boolean;
}

// Normaliza o nome da categoria (remove acentos, caixa e ruído) para agrupar variações
const normalizarCategoria = (raw?: string): string => {
  const base = (raw || 'Sem categoria')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[|/\\_-]+/g, ' ')
    .replace(/\bcanais?\b|\bcanal\b|\bde\b|\btv\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!base) return 'Outros';
  if (/(adulto|\+18|18\+|xxx|porn)/.test(base)) return 'Adultos';
  if (/(esport|sport|futebol|premiere|combate)/.test(base)) return 'Esportes';
  if (/(filme|cinema|movie)/.test(base)) return 'Filmes';
  if (/(serie|hbo|max|netflix|streaming)/.test(base)) return 'Séries e Streaming';
  if (/(infan|kids|desenho|crianc)/.test(base)) return 'Infantil';
  if (/(notic|news|jornal)/.test(base)) return 'Notícias';
  if (/(document|discovery|history|natgeo)/.test(base)) return 'Documentários';
  if (/(music|show)/.test(base)) return 'Música';
  if (/(abert|nacion|globo|record|sbt|band)/.test(base)) return 'Canais Abertos';
  if (/(religi|gospel|catolic|evangel)/.test(base)) return 'Religiosos';
  if (/(entreteni|variedade)/.test(base)) return 'Entretenimento';

  return base.charAt(0).toUpperCase() + base.slice(1);
};

const resolverCapa = (capa: any): string => {
  if (!capa) return '';
  if (typeof capa === 'string') return capa.trim();
  if (Array.isArray(capa) && capa.length > 0) {
    const first = capa[0];
    return first?.url || first?.thumbnails?.small?.url || '';
  }
  if (typeof capa === 'object') return capa.url || '';
  return '';
};

const ImportarCanaisTV = () => {
  const [busca, setBusca] = useState('');
  const [categoriaAtiva, setCategoriaAtiva] = useState('todas');
  const [somenteOnline, setSomenteOnline] = useState(false);
  const [importando, setImportando] = useState<string | null>(null);
  const autoCarregado = useRef(false);

  const {
    canais,
    loading,
    buscarTodos,
    importarCanal,
    importarTodos,
    importandoTodos,
  } = useImportarCanaisTV();
  const { mode } = useTypeMode();

  // Carrega os canais automaticamente ao abrir a página
  useEffect(() => {
    if (autoCarregado.current) return;
    autoCarregado.current = true;
    buscarTodos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const categorias = useMemo(() => {
    const contagem = new Map<string, number>();
    canais.forEach((canal) => {
      const cat = normalizarCategoria(canal.Categoria);
      contagem.set(cat, (contagem.get(cat) || 0) + 1);
    });
    return Array.from(contagem.entries()).sort((a, b) => b[1] - a[1]);
  }, [canais]);

  const canaisFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return canais.filter((canal) => {
      if (somenteOnline && canal.Offline) return false;
      if (categoriaAtiva !== 'todas' && normalizarCategoria(canal.Categoria) !== categoriaAtiva) return false;
      if (termo && !`${canal.Nome} ${canal.Categoria}`.toLowerCase().includes(termo)) return false;
      return true;
    });
  }, [canais, busca, categoriaAtiva, somenteOnline]);

  const handleImportCanal = async (canal: CanalTV) => {
    setImportando(canal.id);
    try {
      await importarCanal(canal as any);
    } finally {
      setImportando(null);
    }
  };

  const handleImportVisiveis = async () => {
    const online = canaisFiltrados.filter((c) => !c.Offline);
    if (online.length === 0) {
      toast.error('Nenhum canal online no filtro atual');
      return;
    }
    if (categoriaAtiva === 'todas' && !busca.trim() && !somenteOnline) {
      importarTodos();
      return;
    }
    toast('Importando canais filtrados...', { description: `${online.length} canais` });
    for (const canal of online) {
      await importarCanal(canal as any);
      await new Promise((r) => setTimeout(r, 100));
    }
  };

  const totalOnline = canais.filter((c) => !c.Offline).length;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl shadow-lg">
            <Tv className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Canais de TV</h1>
            <p className="text-sm text-muted-foreground">
              {loading
                ? 'Carregando canais da origem...'
                : `${canais.length} canais • ${totalOnline} online • destino: ${mode === 'plural' ? 'Canais de TV' : 'Conteúdos'}`}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Filtrar canais..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-9 bg-background/50"
            />
          </div>
          <Button
            variant={somenteOnline ? 'default' : 'outline'}
            onClick={() => setSomenteOnline((v) => !v)}
          >
            <Wifi className="w-4 h-4 mr-2" />
            Só online
          </Button>
          <Button variant="outline" onClick={() => buscarTodos()} disabled={loading}>
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
          </Button>
          <Button
            onClick={handleImportVisiveis}
            disabled={importandoTodos || loading || canaisFiltrados.filter((c) => !c.Offline).length === 0}
            className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
          >
            {importandoTodos ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            Importar {canaisFiltrados.filter((c) => !c.Offline).length}
          </Button>
        </div>
      </div>

      {/* Categorias */}
      {categorias.length > 0 && (
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex items-center gap-2 pb-3">
            <Button
              size="sm"
              variant={categoriaAtiva === 'todas' ? 'default' : 'outline'}
              onClick={() => setCategoriaAtiva('todas')}
              className="rounded-full"
            >
              <LayoutGrid className="w-3.5 h-3.5 mr-1.5" />
              Todas
              <Badge variant="secondary" className="ml-2">{canais.length}</Badge>
            </Button>
            {categorias.map(([cat, total]) => (
              <Button
                key={cat}
                size="sm"
                variant={categoriaAtiva === cat ? 'default' : 'outline'}
                onClick={() => setCategoriaAtiva(cat)}
                className="rounded-full"
              >
                {cat}
                <Badge variant="secondary" className="ml-2">{total}</Badge>
              </Button>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      )}

      {/* Grid de canais */}
      {loading && canais.length === 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="aspect-[3/4] rounded-2xl bg-muted/40 animate-pulse" />
          ))}
        </div>
      ) : canaisFiltrados.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 flex flex-col items-center gap-3 text-center">
            <Tv className="w-10 h-10 text-muted-foreground" />
            <p className="font-medium text-foreground">Nenhum canal encontrado</p>
            <p className="text-sm text-muted-foreground">Ajuste o filtro ou atualize a lista.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-4">
          {canaisFiltrados.map((canal) => {
            const capa = resolverCapa(canal.Capa);
            const offline = !!canal.Offline;
            return (
              <div
                key={canal.id}
                className="group relative rounded-2xl overflow-hidden border border-border/40 bg-card/60 backdrop-blur-sm hover:border-primary/40 hover:shadow-lg transition-all"
              >
                <div className="relative aspect-[3/4] bg-gradient-to-br from-muted/60 to-muted/20 flex items-center justify-center overflow-hidden">
                  {capa ? (
                    <img
                      src={capa}
                      alt={`Capa do canal ${canal.Nome}`}
                      loading="lazy"
                      className={cn(
                        'w-full h-full object-cover transition-transform duration-300 group-hover:scale-105',
                        offline && 'grayscale opacity-60'
                      )}
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <Tv className="w-10 h-10 text-muted-foreground/50" />
                  )}

                  <div className="absolute top-2 left-2">
                    <Badge
                      className={cn(
                        'gap-1 border text-[10px] px-1.5 py-0',
                        offline
                          ? 'bg-red-500/15 text-red-500 border-red-500/30'
                          : 'bg-green-500/15 text-green-500 border-green-500/30'
                      )}
                    >
                      {offline ? <WifiOff className="w-2.5 h-2.5" /> : <Wifi className="w-2.5 h-2.5" />}
                      {offline ? 'Offline' : 'Online'}
                    </Badge>
                  </div>

                  <div className="absolute inset-x-0 bottom-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-t from-background/95 to-transparent">
                    <Button
                      size="sm"
                      className="w-full"
                      disabled={offline || importando === canal.id}
                      onClick={() => handleImportCanal(canal as any)}
                    >
                      {importando === canal.id ? (
                        <RefreshCw className="w-3 h-3 mr-1.5 animate-spin" />
                      ) : (
                        <Download className="w-3 h-3 mr-1.5" />
                      )}
                      {offline ? 'Indisponível' : 'Importar'}
                    </Button>
                  </div>
                </div>

                <div className="p-3 space-y-1">
                  <p className="font-medium text-sm text-foreground truncate" title={canal.Nome}>
                    {canal.Nome}
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {normalizarCategoria(canal.Categoria)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ImportarCanaisTV;
