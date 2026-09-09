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
      <DialogContent className={`max-w-xl sm:max-w-2xl w-[95vw] sm:w-full bg-[#0b0c10] border-[#232738] text-slate-100 p-0 rounded-2xl shadow-2xl ${isSeries ? 'max-h-[90vh] overflow-y-auto' : ''}`}>
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-[#00d2ff]" />
            <p className="text-xs font-medium text-slate-400">Carregando detalhes do título via MaxPlus...</p>
          </div>
        ) : details ? (
          <div>
            {/* Header com Banner / Poster Compacto e Informações sem Scroll */}
            <div className={`relative p-4 sm:p-5 pb-5 sm:pb-6 bg-[#151722] flex flex-col sm:flex-row gap-3.5 sm:gap-4 items-start ${isSeries ? 'border-b border-[#232738]' : ''}`}>
              {/* Capa / Poster Reduzido */}
              <div className="w-24 sm:w-28 shrink-0 aspect-[2/3] rounded-xl overflow-hidden shadow-lg border border-[#232738] bg-slate-900 mx-auto sm:mx-0">
                {details.imagem ? (
                  <img
                    src={details.imagem}
                    alt={details.nome}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-600">
                    <Film className="w-8 h-8" />
                  </div>
                )}
              </div>

              {/* Informações Principais Otimizadas */}
              <div className="flex-1 flex flex-col justify-between w-full min-w-0 pr-6 sm:pr-7">
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
                    <Badge className={isSeries ? 'bg-[#6366f1] text-white font-bold text-[10px] h-5 px-1.5' : 'bg-[#00d2ff] text-slate-950 font-bold text-[10px] h-5 px-1.5'}>
                      {isSeries ? <Tv className="w-2.5 h-2.5 mr-1" /> : <Film className="w-2.5 h-2.5 mr-1" />}
                      {isSeries ? 'Série' : 'Filme'}
                    </Badge>

                    {details.estrelas && (
                      <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-300 font-bold text-[10px] h-5 px-1.5 flex items-center gap-1">
                        <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                        {details.estrelas} / 10
                      </Badge>
                    )}

                    {details.server_used && (
                      <Badge variant="outline" className="border-[#232738] text-slate-400 text-[10px] h-5 px-1.5">
                        Servidor: {details.server_used}
                      </Badge>
                    )}
                  </div>

                  <h2 className="text-base sm:text-lg font-bold text-slate-100 tracking-tight leading-snug line-clamp-1 mb-0.5">
                    {details.nome}
                  </h2>

                  {/* Gêneros */}
                  {details.generos && (
                    <p className="text-[11px] text-[#00d2ff] font-medium mb-1.5 line-clamp-1">
                      {details.generos}
                    </p>
                  )}

                  {/* Sinopse Reduzida com line-clamp para economizar altura */}
                  <div className="text-xs text-slate-300/90 leading-relaxed line-clamp-2 mb-1.5">
                    {details.sinopse || 'Sinopse não informada para este título.'}
                  </div>
                </div>

                {/* Se for Filme: Exibe link do MP4 compacto e botão de importar filme */}
                {!isSeries && (
                  <div className="mt-2.5 pt-2.5 border-t border-[#232738]/80 flex flex-col gap-2.5 w-full">
                    {details.video ? (
                      <div className="flex items-center gap-2 bg-[#0b0c10] border border-[#232738] rounded-xl p-1.5 px-2.5 w-full min-w-0">
                        <Play className="w-3.5 h-3.5 text-[#00d2ff] shrink-0" />
                        <span className="text-[11px] font-mono text-slate-300 truncate min-w-0 flex-1 select-all" title={details.video}>
                          {details.video}
                        </span>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => handleCopy(details.video!)}
                          className="h-7 px-2.5 shrink-0 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                          title="Copiar Link MP4"
                        >
                          {copiedLink ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span className="text-[11px] text-emerald-400 font-medium">Copiado</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3 text-slate-300" />
                              <span className="text-[11px]">Copiar</span>
                            </>
                          )}
                        </Button>
                      </div>
                    ) : (
                      <p className="text-[11px] text-amber-400/80 flex items-center gap-1.5">
                        <AlertCircle className="w-3 h-3" />
                        Link de streaming direto não detectado nesta fonte.
                      </p>
                    )}

                    <Button
                      disabled={isImporting}
                      onClick={() => onImportMovie(details, fallbackCategory)}
                      className="bg-gradient-to-r from-[#00d2ff] to-[#00a3cc] hover:from-[#00b8e6] hover:to-[#008fb3] text-slate-950 font-bold shadow-lg shadow-[#00d2ff]/20 h-10 px-4 text-xs sm:text-sm gap-2 w-full rounded-xl cursor-pointer"
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
              <div className="p-4 sm:p-5 space-y-4">
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

                    <div className="max-h-48 overflow-y-auto space-y-1 pr-1.5 border border-[#232738] rounded-xl p-1.5 bg-[#151722]/50 scrollbar-thin">
                      {currentSeason.episodes && currentSeason.episodes.length > 0 ? (
                        currentSeason.episodes.map((ep) => {
                          const isSel = !!selectedEpisodes[`${currentSeason.number}_${ep.number}`];
                          return (
                            <div
                              key={ep.number}
                              onClick={() => toggleEpisode(currentSeason.number, ep.number)}
                              className={`flex items-center justify-between p-2 rounded-lg border transition-all cursor-pointer ${
                                isSel 
                                  ? 'bg-[#6366f1]/15 border-[#6366f1]/50 text-white' 
                                  : 'bg-[#0b0c10] border-[#232738] hover:border-slate-700 text-slate-300'
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <Checkbox
                                  checked={isSel}
                                  onCheckedChange={() => toggleEpisode(currentSeason.number, ep.number)}
                                  className="data-[state=checked]:bg-[#6366f1] data-[state=checked]:border-[#6366f1] border-slate-600"
                                />
                                <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
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
                        <p className="text-center py-4 text-xs text-slate-500">
                          Nenhum episódio listado para esta temporada.
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Barra de Progresso durante a Importação */}
                {importProgress.active && (
                  <div className="p-3 rounded-xl bg-[#151722] border border-[#6366f1]/40 space-y-2 animate-pulse">
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
                      className="h-1.5 bg-[#0b0c10]"
                    />
                    <p className="text-[10px] text-slate-400 truncate">
                      {importProgress.currentTitle}
                    </p>
                  </div>
                )}

                {/* Botões de Ação para Séries */}
                <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
                  <Button
                    disabled={isImporting}
                    onClick={handleImportAllSeries}
                    className="flex-1 bg-gradient-to-r from-[#6366f1] to-[#818cf8] hover:from-[#4f46e5] hover:to-[#6366f1] text-white font-bold h-9 sm:h-10 text-xs sm:text-sm rounded-xl shadow-md shadow-[#6366f1]/25 gap-2"
                  >
                    {isImporting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Importando Série e Episódios...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        Importar Série Completa
                      </>
                    )}
                  </Button>

                  {totalSelectedCount > 0 && (
                    <Button
                      variant="outline"
                      disabled={isImporting}
                      onClick={handleImportSelectedEpisodesOnly}
                      className="border-[#00d2ff]/40 bg-[#00d2ff]/10 hover:bg-[#00d2ff]/20 text-[#00d2ff] font-bold h-9 sm:h-10 text-xs sm:text-sm rounded-xl"
                    >
                      Importar {totalSelectedCount} Selecionados
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
