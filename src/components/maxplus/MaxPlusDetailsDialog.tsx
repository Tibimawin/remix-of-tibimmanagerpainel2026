import React, { useState, useMemo } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  MaxPlusContentDetails, 
  MaxPlusSeasonDetail, 
  MaxPlusEpisodeDetail 
} from '@/services/maxplusApi';
import { ImportProgress } from '@/services/maxplusImportEngine';
import { 
  Film, 
  Tv, 
  Star, 
  Download, 
  Play, 
  Copy, 
  Check, 
  Loader2, 
  Sparkles, 
  Layers, 
  AlertCircle 
} from 'lucide-react';
import { toast } from 'sonner';

interface MaxPlusDetailsDialogProps {
  open: boolean;
  onClose: () => void;
  details: MaxPlusContentDetails | null;
  loading: boolean;
  onImportMovie: (details: MaxPlusContentDetails, fallbackCat?: string) => Promise<void>;
  onImportSeries: (
    details: MaxPlusContentDetails, 
    fallbackCat?: string, 
    selectedEps?: { seasonNum: number; episodeNum: number }[]
  ) => Promise<void>;
  importProgress: ImportProgress;
  isImporting: boolean;
  fallbackCategory?: string;
}

export const MaxPlusDetailsDialog: React.FC<MaxPlusDetailsDialogProps> = ({
  open,
  onClose,
  details,
  loading,
  onImportMovie,
  onImportSeries,
  importProgress,
  isImporting,
  fallbackCategory,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [selectedSeasonNumber, setSelectedSeasonNumber] = useState<number>(1);
  const [selectedEpisodes, setSelectedEpisodes] = useState<Record<string, boolean>>({});

  const isSeries = useMemo(() => {
    if (!details) return false;
    return (details.total_seasons !== undefined && details.total_seasons > 0) ||
           (details.seasons_details !== undefined && details.seasons_details.length > 0);
  }, [details]);

  // Temporadas disponíveis
  const seasons: MaxPlusSeasonDetail[] = useMemo(() => {
    return details?.seasons_details || [];
  }, [details]);

  // Temporada ativa atual
  const currentSeason = useMemo(() => {
    if (!seasons.length) return null;
    return seasons.find(s => s.number === selectedSeasonNumber) || seasons[0];
  }, [seasons, selectedSeasonNumber]);

  // Alternar seleção de episódio
  const toggleEpisode = (seasonNum: number, epNum: number) => {
    const key = `${seasonNum}_${epNum}`;
    setSelectedEpisodes(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Selecionar todos os episódios da temporada atual
  const toggleSelectSeasonEpisodes = (season: MaxPlusSeasonDetail) => {
    const allSelected = season.episodes.every(ep => selectedEpisodes[`${season.number}_${ep.number}`]);
    setSelectedEpisodes(prev => {
      const next = { ...prev };
      season.episodes.forEach(ep => {
        next[`${season.number}_${ep.number}`] = !allSelected;
      });
      return next;
    });
  };

  // Contagem de selecionados
  const totalSelectedCount = useMemo(() => {
    return Object.values(selectedEpisodes).filter(Boolean).length;
  }, [selectedEpisodes]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(true);
    toast.success('Link do vídeo copiado para a área de transferência!');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleImportSelectedEpisodesOnly = async () => {
    if (!details) return;
    const selectedList: { seasonNum: number; episodeNum: number }[] = [];
    Object.entries(selectedEpisodes).forEach(([key, isSel]) => {
      if (isSel) {
        const [s, e] = key.split('_').map(Number);
        selectedList.push({ seasonNum: s, episodeNum: e });
      }
    });

    if (selectedList.length === 0) {
      toast.info('Selecione pelo menos um episódio para importar.');
      return;
    }

    await onImportSeries(details, fallbackCategory, selectedList);
  };

  const handleImportAllSeries = async () => {
    if (!details) return;
    await onImportSeries(details, fallbackCategory);
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !isImporting && !val && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-[#0b0c10] border-[#232738] text-slate-100 p-0 rounded-2xl shadow-2xl">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-4">
            <Loader2 className="w-10 h-10 animate-spin text-[#00d2ff]" />
            <p className="text-sm font-medium text-slate-400">Carregando detalhes do título via MaxPlus...</p>
          </div>
        ) : details ? (
          <div>
            {/* Header com Banner / Poster e Informações */}
            <div className="relative p-6 bg-[#151722] border-b border-[#232738] flex flex-col sm:flex-row gap-6">
              {/* Capa */}
              <div className="w-36 sm:w-44 flex-shrink-0 aspect-[2/3] rounded-xl overflow-hidden shadow-2xl border border-[#232738] bg-slate-900 mx-auto sm:mx-0">
                {details.imagem ? (
                  <img
                    src={details.imagem}
                    alt={details.nome}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-600">
                    <Film className="w-12 h-12" />
                  </div>
                )}
              </div>

              {/* Informações Principais */}
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <Badge className={isSeries ? 'bg-[#6366f1] text-white font-bold' : 'bg-[#00d2ff] text-slate-950 font-bold'}>
                      {isSeries ? <Tv className="w-3 h-3 mr-1" /> : <Film className="w-3 h-3 mr-1" />}
                      {isSeries ? 'Série' : 'Filme'}
                    </Badge>

                    {details.estrelas && (
                      <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-300 font-bold flex items-center gap-1">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        {details.estrelas} / 10
                      </Badge>
                    )}

                    {details.server_used && (
                      <Badge variant="outline" className="border-[#232738] text-slate-400 text-xs">
                        Servidor: {details.server_used}
                      </Badge>
                    )}
                  </div>

                  <h2 className="text-2xl font-black text-slate-100 tracking-tight mb-2">
                    {details.nome}
                  </h2>

                  {/* Gêneros */}
                  {details.generos && (
                    <p className="text-xs text-[#00d2ff] font-medium mb-3">
                      {details.generos}
                    </p>
                  )}

                  {/* Sinopse */}
                  <div className="text-sm text-slate-300/90 leading-relaxed max-h-32 overflow-y-auto pr-2 scrollbar-thin">
                    {details.sinopse || 'Sinopse não informada para este título.'}
                  </div>
                </div>

                {/* Se for Filme: Exibe link do MP4 e botão de importar filme */}
                {!isSeries && (
                  <div className="mt-4 pt-4 border-t border-[#232738]/80 flex flex-col gap-3">
                    {details.video ? (
                      <div className="flex items-center gap-2 bg-[#0b0c10] border border-[#232738] rounded-xl p-2.5">
                        <Play className="w-4 h-4 text-[#00d2ff] flex-shrink-0" />
                        <span className="text-xs font-mono text-slate-300 truncate flex-1">
                          {details.video}
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleCopy(details.video!)}
                          className="h-7 px-2 text-xs text-slate-400 hover:text-white"
                          title="Copiar Link MP4"
                        >
                          {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </Button>
                      </div>
                    ) : (
                      <p className="text-xs text-amber-400/80 flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5" />
                        Link de streaming direto não detectado nesta fonte.
                      </p>
                    )}

                    <Button
                      disabled={isImporting}
                      onClick={() => onImportMovie(details, fallbackCategory)}
                      className="bg-gradient-to-r from-[#00d2ff] to-[#00a3cc] hover:from-[#00b8e6] hover:to-[#008fb3] text-slate-950 font-bold shadow-lg shadow-[#00d2ff]/20 h-10 gap-2 w-full sm:w-auto"
                    >
                      {isImporting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                          Salvando no Baserow...
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4 text-slate-950" />
                          Salvar Filme no Baserow
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Seção Exclusiva de Séries */}
            {isSeries && (
              <div className="p-6 space-y-5">
                {/* Abas das Temporadas */}
                <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-[#232738]">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[#6366f1]" />
                    <span className="text-sm font-bold text-slate-200">Temporadas ({seasons.length})</span>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    {seasons.map((season) => (
                      <Button
                        key={season.number}
                        size="sm"
                        variant={selectedSeasonNumber === season.number ? 'default' : 'outline'}
                        onClick={() => setSelectedSeasonNumber(season.number)}
                        className={`text-xs h-8 rounded-lg ${
                          selectedSeasonNumber === season.number
                            ? 'bg-[#6366f1] text-white font-bold border-[#6366f1]'
                            : 'bg-[#151722] border-[#232738] text-slate-300 hover:border-[#6366f1]/50'
                        }`}
                      >
                        {season.title || `Temporada ${season.number}`}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Lista de Episódios da Temporada Selecionada */}
                {currentSeason && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>{currentSeason.title || `Temporada ${currentSeason.number}`} • {currentSeason.episodes?.length || 0} episódios</span>
                      <button
                        type="button"
                        onClick={() => toggleSelectSeasonEpisodes(currentSeason)}
                        className="text-[#00d2ff] hover:underline font-medium cursor-pointer"
                      >
                        Selecionar Todos desta Temporada
                      </button>
                    </div>

                    <div className="max-h-64 overflow-y-auto space-y-1.5 pr-2 border border-[#232738] rounded-xl p-2 bg-[#151722]/50 scrollbar-thin">
                      {currentSeason.episodes && currentSeason.episodes.length > 0 ? (
                        currentSeason.episodes.map((ep) => {
                          const isSel = !!selectedEpisodes[`${currentSeason.number}_${ep.number}`];
                          return (
                            <div
                              key={ep.number}
                              onClick={() => toggleEpisode(currentSeason.number, ep.number)}
                              className={`flex items-center justify-between p-2.5 rounded-lg border transition-all cursor-pointer ${
                                isSel 
                                  ? 'bg-[#6366f1]/15 border-[#6366f1]/50 text-white' 
                                  : 'bg-[#0b0c10] border-[#232738] hover:border-slate-700 text-slate-300'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <Checkbox
                                  checked={isSel}
                                  onCheckedChange={() => toggleEpisode(currentSeason.number, ep.number)}
                                  className="data-[state=checked]:bg-[#6366f1] data-[state=checked]:border-[#6366f1] border-slate-600"
                                />
                                <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                                  EP {ep.number}
                                </span>
                                <span className="text-xs font-medium line-clamp-1">
                                  {ep.title || `Episódio ${ep.number}`}
                                </span>
                              </div>

                              <span className="text-[10px] text-slate-500 font-mono">
                                {ep.link ? 'MP4 pronto' : 'Auto'}
                              </span>
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-center py-6 text-xs text-slate-500">
                          Nenhum episódio listado para esta temporada.
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Barra de Progresso durante a Importação */}
                {importProgress.active && (
                  <div className="p-4 rounded-xl bg-[#151722] border border-[#6366f1]/40 space-y-2.5 animate-pulse">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-white flex items-center gap-1.5">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-[#00d2ff]" />
                        {importProgress.stage}
                      </span>
                      <span className="font-mono font-bold text-[#00d2ff]">
                        {importProgress.current} / {importProgress.total} ({Math.round((importProgress.current / Math.max(1, importProgress.total)) * 100)}%)
                      </span>
                    </div>
                    <Progress
                      value={(importProgress.current / Math.max(1, importProgress.total)) * 100}
                      className="h-2 bg-[#0b0c10]"
                    />
                    <p className="text-[11px] text-slate-400 truncate">
                      {importProgress.currentTitle}
                    </p>
                  </div>
                )}

                {/* Botões de Ação para Séries */}
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <Button
                    disabled={isImporting}
                    onClick={handleImportAllSeries}
                    className="flex-1 bg-gradient-to-r from-[#6366f1] to-[#818cf8] hover:from-[#4f46e5] hover:to-[#6366f1] text-white font-bold h-11 rounded-xl shadow-lg shadow-[#6366f1]/25 gap-2"
                  >
                    {isImporting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Importando Série e Episódios...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Importar Série Completa (Todas as Temporadas)
                      </>
                    )}
                  </Button>

                  {totalSelectedCount > 0 && (
                    <Button
                      variant="outline"
                      disabled={isImporting}
                      onClick={handleImportSelectedEpisodesOnly}
                      className="border-[#00d2ff]/40 bg-[#00d2ff]/10 hover:bg-[#00d2ff]/20 text-[#00d2ff] font-bold h-11 rounded-xl"
                    >
                      Importar {totalSelectedCount} Episódios Selecionados
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="p-12 text-center text-slate-500">
            Nenhum detalhe disponível.
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
