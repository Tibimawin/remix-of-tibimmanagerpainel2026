import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Tv, Download, Search, Wifi, WifiOff, RefreshCw, List, TrendingUp, ChevronDown, ChevronUp } from 'lucide-react';
import { useImportarCanaisTV } from '@/hooks/useImportarCanaisTV';
import { useTypeMode } from '@/contexts/TypeModeContext';
import { cn } from '@/lib/utils';


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

const ImportarCanaisTV = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoriasExpandidas, setCategoriasExpandidas] = useState<Set<string>>(new Set());

  const {
    canais,
    loading,
    searchCanais,
    buscarTodos,
    importarCanal,
    importarTodos,
    importandoTodos,
    agruparPorCategoria,
  } = useImportarCanaisTV();
  const { mode } = useTypeMode();

  const canaisPorCategoria = agruparPorCategoria();
  const categorias = Object.keys(canaisPorCategoria);

  const toggleCategoria = (categoria: string) => {
    const novasExpandidas = new Set(categoriasExpandidas);
    if (novasExpandidas.has(categoria)) {
      novasExpandidas.delete(categoria);
    } else {
      novasExpandidas.add(categoria);
    }
    setCategoriasExpandidas(novasExpandidas);
  };

  const expandirTodas = () => {
    setCategoriasExpandidas(new Set(categorias));
  };

  const recolherTodas = () => {
    setCategoriasExpandidas(new Set());
  };

  const handleSearch = () => {
    if (!searchTerm.trim()) {
      toast.error('Digite um termo para buscar');
      return;
    }
    searchCanais(searchTerm);
  };

  const handleLoadAll = () => {
    buscarTodos();
  };

  const handleImportCanal = (canal: CanalTV) => {
    importarCanal(canal);
  };

  const handleImportTodos = () => {
    if (canais.length === 0) {
      toast.error('Nenhum canal encontrado para importar');
      return;
    }
    importarTodos();
  };

  const handleImportCategoria = async (categoria: string) => {
    const canaisCategoria = canaisPorCategoria[categoria].filter(c => !c.Offline);

    if (canaisCategoria.length === 0) {
      toast.error('Nenhum canal online nesta categoria');
      return;
    }

    toast(`Importando categoria ${categoria}...`, {
      description: `${canaisCategoria.length} canais serão importados`
    });

    for (const canal of canaisCategoria) {
      await importarCanal(canal);
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  };

  const getCategoriaIcon = (categoria: string) => {
    // Sempre retorna o mesmo ícone para todas as categorias
    return Tv;
  };

  const getCategoriaColor = (categoria: string) => {
    // Sempre retorna a mesma cor para todas as categorias
    return 'from-blue-500 to-cyan-500';
  };

  const getStatusBadge = (canal: CanalTV) => {
    if (canal.Online) {
      return (
        <Badge className="gap-1.5 bg-gradient-to-r from-green-500/10 to-emerald-500/10 text-green-600 border-green-500/20">
          <Wifi className="w-3 h-3" />
          Online
        </Badge>
      );
    }
    if (canal.Offline) {
      return (
        <Badge className="gap-1.5 bg-gradient-to-r from-red-500/10 to-rose-500/10 text-red-600 border-red-500/20">
          <WifiOff className="w-3 h-3" />
          Offline
        </Badge>
      );
    }
    return <Badge variant="secondary">Desconhecido</Badge>;
  };


  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 blur-xl" />
          <div className="relative flex items-center justify-center w-14 h-14 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl shadow-lg">
            <Tv className="w-7 h-7 text-white" />
          </div>
        </div>
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
            Importar Canais TV
          </h1>
          <p className="text-muted-foreground font-medium mt-1">
            Importe canais de TV da tabela origem para {mode === 'plural' ? 'Canais de TV' : 'Conteúdos'}
          </p>
        </div>
      </div>

      {/* Busca */}
      <Card className="border-border/40 bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Search className="w-5 h-5 text-primary" />
            <span>Buscar Canais</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              placeholder="Digite o nome do canal ou categoria..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1 bg-background/50"
            />
            <div className="flex gap-2">
              <Button
                onClick={handleSearch}
                disabled={loading}
                className="bg-primary hover:bg-primary/90 flex-1 sm:flex-initial"
              >
                {loading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Search className="w-4 h-4 mr-2" />
                    Buscar
                  </>
                )}
              </Button>
              <Button
                onClick={handleLoadAll}
                disabled={loading}
                variant="outline"
                className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border-blue-500/20 hover:from-blue-500/20 hover:to-cyan-500/20 flex-1 sm:flex-initial"
              >
                {loading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <List className="w-4 h-4 mr-2" />
                    Todos os Canais
                  </>
                )}
              </Button>
            </div>
          </div>

          {canais.length > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  <p className="text-sm font-semibold text-foreground">
                    {canais.length} canais encontrados
                  </p>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span>{canais.filter(c => !c.Offline).length} online</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-red-500" />
                    <span>{canais.filter(c => c.Offline).length} offline</span>
                  </div>
                </div>
              </div>
              <Button
                onClick={handleImportTodos}
                disabled={importandoTodos || canais.filter(c => !c.Offline).length === 0}
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg disabled:opacity-50"
              >
                {importandoTodos ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Importando...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Importar Online ({canais.filter(c => !c.Offline).length})
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resultados por Categoria */}
      {canais.length > 0 && (
        <div className="space-y-4">
          {/* Controles de Expandir/Recolher */}
          <Card className="border-border/40 bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <Tv className="w-5 h-5 text-primary" />
                  <span>Canais por Categoria</span>
                  <Badge variant="secondary" className="ml-2">{categorias.length} categorias</Badge>
                </CardTitle>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={expandirTodas}
                    className="text-xs"
                  >
                    <ChevronDown className="w-3 h-3 mr-1" />
                    Expandir Todas
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={recolherTodas}
                    className="text-xs"
                  >
                    <ChevronUp className="w-3 h-3 mr-1" />
                    Recolher Todas
                  </Button>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Categorias */}
          {categorias.map((categoria) => {
            const canaisCategoria = canaisPorCategoria[categoria];
            const canaisOnline = canaisCategoria.filter(c => !c.Offline);
            const canaisOffline = canaisCategoria.filter(c => c.Offline);
            const isExpanded = categoriasExpandidas.has(categoria);
            const IconeCategoria = getCategoriaIcon(categoria);
            const corCategoria = getCategoriaColor(categoria);

            return (
              <Card key={categoria} className="border-border/40 bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-sm overflow-hidden">
                {/* Header da Categoria */}
                <div
                  className={cn(
                    "px-6 py-4 cursor-pointer hover:bg-muted/30 transition-colors",
                    `bg-gradient-to-r ${corCategoria} bg-opacity-5`
                  )}
                  onClick={() => toggleCategoria(categoria)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center",
                        `bg-gradient-to-br ${corCategoria}`
                      )}>
                        <IconeCategoria className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg text-foreground">{categoria}</h3>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground mt-0.5">
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                            <span>{canaisOnline.length} online</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-red-500" />
                            <span>{canaisOffline.length} offline</span>
                          </div>
                          <span className="text-muted-foreground/60">•</span>
                          <span>{canaisCategoria.length} total</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleImportCategoria(categoria);
                        }}
                        disabled={canaisOnline.length === 0 || importandoTodos}
                        className={cn(
                          "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700",
                          "text-white shadow-sm"
                        )}
                      >
                        <Download className="w-3 h-3 mr-1.5" />
                        Importar Categoria ({canaisOnline.length})
                      </Button>

                      <div className="p-2">
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Conteúdo da Categoria (Colapsável) */}
                {isExpanded && (
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="border-b border-border/40 bg-muted/20">
                            <th className="text-left p-4 font-semibold text-sm text-muted-foreground">Nome do Canal</th>
                            <th className="text-left p-4 font-semibold text-sm text-muted-foreground">Status</th>
                            <th className="text-right p-4 font-semibold text-sm text-muted-foreground">Ações</th>
                          </tr>
                        </thead>
                        <tbody>
                          {canaisCategoria.map((canal, index) => (
                            <tr
                              key={canal.id}
                              className={cn(
                                "border-b border-border/40 hover:bg-muted/50 transition-colors",
                                "animate-fade-in"
                              )}
                              style={{ animationDelay: `${index * 20}ms` }}
                            >
                              <td className="p-4">
                                <div className="flex items-center space-x-3">
                                  <div className={cn(
                                    "w-10 h-10 rounded-lg flex items-center justify-center",
                                    `bg-gradient-to-br ${corCategoria} bg-opacity-20`
                                  )}>
                                    <Tv className="w-5 h-5" />
                                  </div>
                                  <span className="font-medium text-foreground">{canal.Nome}</span>
                                </div>
                              </td>
                              <td className="p-4">{getStatusBadge(canal)}</td>
                              <td className="p-4 text-right">
                                <Button
                                  size="sm"
                                  onClick={() => handleImportCanal(canal)}
                                  disabled={canal.Offline}
                                  className={cn(
                                    "bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70",
                                    "disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                                  )}
                                >
                                  <Download className="w-3 h-3 mr-1.5" />
                                  {canal.Offline ? 'Offline' : 'Importar'}
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Info */}
      <Card className="border-l-4 border-l-blue-500 bg-gradient-to-r from-blue-500/5 to-cyan-500/5">
        <CardContent className="pt-6">
          <div className="flex items-start space-x-3">
            <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-xl">
              <Tv className="w-5 h-5 text-blue-600" />
            </div>
            <div className="space-y-2 flex-1">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                Como funciona?
              </h3>
              <ul className="text-sm text-muted-foreground space-y-1.5">
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-0.5">•</span>
                  <span>Clique em <strong>"Todos os Canais"</strong> para carregar todos os canais disponíveis</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-0.5">•</span>
                  <span>Ou use a <strong>busca</strong> para encontrar canais específicos por nome ou categoria</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-0.5">•</span>
                  <span>Visualize o status <Badge className="inline-flex gap-1 py-0 px-1.5 bg-green-500/10 text-green-600 border-green-500/20 text-xs"><Wifi className="w-2.5 h-2.5" />Online</Badge> ou <Badge className="inline-flex gap-1 py-0 px-1.5 bg-red-500/10 text-red-600 border-red-500/20 text-xs"><WifiOff className="w-2.5 h-2.5" />Offline</Badge> de cada canal</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-0.5">•</span>
                  <span>Importe canais individualmente ou todos os canais online de uma vez</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-0.5">•</span>
                  <span>Os canais serão adicionados à tabela <strong>{mode === 'plural' ? 'Canais de TV' : 'Conteúdos'}</strong></span>
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ImportarCanaisTV;