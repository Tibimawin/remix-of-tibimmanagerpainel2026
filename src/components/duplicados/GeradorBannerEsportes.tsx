import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { 
  Download, 
  Upload, 
  Trash2, 
  Plus, 
  Calendar, 
  Trophy,
  Palette,
  Layout as LayoutIcon,
  Sparkles,
  Flame,
  Zap,
  Crown,
  Star,
  Tv,
  Check,
  RotateCcw,
  Layers,
  Smartphone
} from 'lucide-react';
import { toPng } from 'html-to-image';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Match,
  SPORTS_MODELS,
  PremierArenaBanner,
  ChampionsStadiumBanner,
  CyberNeonBanner,
  StoriesMatchBanner,
  SuperClasicoBanner,
  VipGoldBanner,
  MinimalistCleanBanner,
  FeedSquareBanner,
  FireStadiumBanner,
  GridMultiJogosBanner,
  ClassicBroadcastBanner
} from './sportsTemplates';

// Input rápido para colar link do escudo
const LogoUrlInput = ({ onApply }: { onApply: (url: string) => void }) => {
  const [value, setValue] = useState('');
  const apply = () => {
    if (!value.trim()) return;
    onApply(value.trim());
    setValue('');
  };
  return (
    <div className="flex gap-1 mt-1">
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Ou cole o link do escudo"
        className="h-7 text-[10px]"
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); apply(); } }}
      />
      <Button size="sm" variant="outline" className="h-7 px-2 text-[10px] shrink-0" onClick={apply}>
        OK
      </Button>
    </div>
  );
};

// Presets de jogos prontos para gerar em 1 clique
const PRESET_RODADAS = [
  {
    label: '🇧🇷 Brasileirão Clássico',
    date: 'DOMINGO - RODADA DO BRASILEIRÃO',
    matches: [
      { id: '1', league: 'BRASILEIRÃO SÉRIE A', time: '16:00', teamHome: 'FLAMENGO', teamAway: 'FLUMINENSE', logoHome: 'https://images.fotmob.com/image_resources/logo/teamlogo/9777.png', logoAway: 'https://images.fotmob.com/image_resources/logo/teamlogo/10237.png', channel: 'PREMIERE' },
      { id: '2', league: 'BRASILEIRÃO SÉRIE A', time: '16:00', teamHome: 'PALMEIRAS', teamAway: 'CORINTHIANS', logoHome: 'https://images.fotmob.com/image_resources/logo/teamlogo/10235.png', logoAway: 'https://images.fotmob.com/image_resources/logo/teamlogo/9776.png', channel: 'GLOBO / PFC' },
      { id: '3', league: 'BRASILEIRÃO SÉRIE A', time: '18:30', teamHome: 'SÃO PAULO', teamAway: 'SANTOS', logoHome: 'https://images.fotmob.com/image_resources/logo/teamlogo/10233.png', logoAway: 'https://images.fotmob.com/image_resources/logo/teamlogo/9770.png', channel: 'SPORTV' },
      { id: '4', league: 'BRASILEIRÃO SÉRIE A', time: '18:30', teamHome: 'GRÊMIO', teamAway: 'INTERNACIONAL', logoHome: 'https://images.fotmob.com/image_resources/logo/teamlogo/10231.png', logoAway: 'https://images.fotmob.com/image_resources/logo/teamlogo/9771.png', channel: 'PREMIERE' }
    ]
  },
  {
    label: '🏆 Champions League',
    date: 'TERÇA E QUARTA - QUARTAS DE FINAL',
    matches: [
      { id: '1', league: 'UEFA CHAMPIONS LEAGUE', time: '16:00', teamHome: 'REAL MADRID', teamAway: 'MAN CITY', logoHome: 'https://images.fotmob.com/image_resources/logo/teamlogo/8633.png', logoAway: 'https://images.fotmob.com/image_resources/logo/teamlogo/8456.png', channel: 'TNT / MAX' },
      { id: '2', league: 'UEFA CHAMPIONS LEAGUE', time: '16:00', teamHome: 'BARCELONA', teamAway: 'BAYERN', logoHome: 'https://images.fotmob.com/image_resources/logo/teamlogo/8634.png', logoAway: 'https://images.fotmob.com/image_resources/logo/teamlogo/9823.png', channel: 'SPACE / MAX' },
      { id: '3', league: 'UEFA CHAMPIONS LEAGUE', time: '16:00', teamHome: 'PSG', teamAway: 'ARSENAL', logoHome: 'https://images.fotmob.com/image_resources/logo/teamlogo/9847.png', logoAway: 'https://images.fotmob.com/image_resources/logo/teamlogo/9825.png', channel: 'SBT / TNT' }
    ]
  },
  {
    label: '⚔️ Libertadores da América',
    date: 'QUINTA-FEIRA - NOITE DE LIBERTADORES',
    matches: [
      { id: '1', league: 'COPA LIBERTADORES', time: '21:30', teamHome: 'BOCA JUNIORS', teamAway: 'RIVER PLATE', logoHome: 'https://images.fotmob.com/image_resources/logo/teamlogo/10077.png', logoAway: 'https://images.fotmob.com/image_resources/logo/teamlogo/10076.png', channel: 'ESPN / STAR+' },
      { id: '2', league: 'COPA LIBERTADORES', time: '19:00', teamHome: 'ATLÉTICO-MG', teamAway: 'PEÑAROL', logoHome: 'https://images.fotmob.com/image_resources/logo/teamlogo/10232.png', logoAway: 'https://images.fotmob.com/image_resources/logo/teamlogo/9773.png', channel: 'PARAMOUNT+' }
    ]
  }
];

const PRESET_COLORS = [
  { name: 'Vermelho Premiere', hex: '#e50914' },
  { name: 'Azul Champions', hex: '#0055ff' },
  { name: 'Ciano Neon', hex: '#06b6d4' },
  { name: 'Dourado VIP', hex: '#D4AF37' },
  { name: 'Verde Gramado', hex: '#10b981' },
  { name: 'Laranja Decisão', hex: '#f97316' },
  { name: 'Roxo CazéTV', hex: '#8b5cf6' },
  { name: 'Vinho Clássico', hex: '#8B0000' }
];

const GeradorBannerEsportes = () => {
  // Modelo selecionado
  const [selectedModel, setSelectedModel] = useState<string>(() => {
    return localStorage.getItem('gerador-banner-model') || 'premier';
  });

  // Resolução de exportação
  const [exportQuality, setExportQuality] = useState<number>(() => {
    const saved = localStorage.getItem('gerador-banner-quality');
    return saved ? Number(saved) : 3;
  });

  // Zoom de visualização
  const [previewZoom, setPreviewZoom] = useState<'auto' | 50 | 60 | 80 | 100>('auto');

  // Nome da marca
  const [brandName, setBrandName] = useState<string>(() => {
    return localStorage.getItem('gerador-post-brand-name') || 'STREAM SPORTS';
  });

  const [logo, setLogo] = useState<string | null>(localStorage.getItem('gerador-post-logo'));
  const [date, setDate] = useState('HOJE - SÁBADO - 22 DE AGOSTO');
  const [matches, setMatches] = useState<Match[]>([
    {
      id: '1',
      league: 'BRASILEIRÃO SÉRIE A',
      time: '16:00',
      teamHome: 'FLAMENGO',
      teamAway: 'FLUMINENSE',
      logoHome: '',
      logoAway: '',
      channel: 'PREMIERE'
    },
    {
      id: '2',
      league: 'BRASILEIRÃO SÉRIE A',
      time: '18:30',
      teamHome: 'PALMEIRAS',
      teamAway: 'CORINTHIANS',
      logoHome: '',
      logoAway: '',
      channel: 'SPORTV / PFC'
    },
    {
      id: '3',
      league: 'CHAMPIONS LEAGUE',
      time: '16:00',
      teamHome: 'REAL MADRID',
      teamAway: 'MAN CITY',
      logoHome: '',
      logoAway: '',
      channel: 'TNT / MAX'
    }
  ]);
  
  const [accentColor, setAccentColor] = useState('#e50914');
  const [logoSize, setLogoSize] = useState(120);
  const [logoX, setLogoX] = useState(0);
  const [logoY, setLogoY] = useState(0);
  const [overlayOpacity, setOverlayOpacity] = useState(0.85);

  const previewRef = useRef<HTMLDivElement>(null);

  const handleSelectModel = (id: string) => {
    setSelectedModel(id);
    localStorage.setItem('gerador-banner-model', id);
  };

  const handleSetQuality = (quality: number) => {
    setExportQuality(quality);
    localStorage.setItem('gerador-banner-quality', String(quality));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setLogo(base64);
        localStorage.setItem('gerador-post-logo', base64);
        toast.success('Logo salva com sucesso!');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBrandNameChange = (name: string) => {
    setBrandName(name);
    localStorage.setItem('gerador-post-brand-name', name);
  };

  const addMatch = () => {
    const newMatch: Match = {
      id: Math.random().toString(36).substring(2, 9),
      league: 'BRASILEIRÃO SÉRIE A',
      time: '18:00',
      teamHome: 'TIME A',
      teamAway: 'TIME B',
      logoHome: '',
      logoAway: '',
      channel: 'PREMIERE'
    };
    setMatches([...matches, newMatch]);
  };

  const removeMatch = (id: string) => {
    if (matches.length <= 1) {
      toast.warning('O banner precisa ter pelo menos 1 jogo');
      return;
    }
    setMatches(matches.filter(m => m.id !== id));
  };

  const updateMatch = (id: string, field: keyof Match, value: string) => {
    setMatches(matches.map(m => m.id === id ? { ...m, [field]: value } : m));
  };

  const handleTeamLogoUpload = (id: string, side: 'Home' | 'Away', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        updateMatch(id, side === 'Home' ? 'logoHome' : 'logoAway', base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const applyLogoUrl = async (id: string, side: 'Home' | 'Away', url: string) => {
    toast.loading('Carregando escudo...', { id: 'logo-url' });
    try {
      const res = await fetch(url, { mode: 'cors', cache: 'no-store' });
      if (!res.ok) throw new Error('fetch falhou');
      const blob = await res.blob();
      const base64 = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onloadend = () => resolve(r.result as string);
        r.onerror = reject;
        r.readAsDataURL(blob);
      });
      updateMatch(id, side === 'Home' ? 'logoHome' : 'logoAway', base64);
      toast.success('Escudo carregado com sucesso!', { id: 'logo-url' });
    } catch {
      updateMatch(id, side === 'Home' ? 'logoHome' : 'logoAway', url);
      toast.success('Escudo vinculado!', { id: 'logo-url' });
    }
  };

  const applyPreset = (preset: typeof PRESET_RODADAS[0]) => {
    setDate(preset.date);
    setMatches(preset.matches);
    toast.success(`Rodada carregada: ${preset.label}`);
  };

  const getScaleFactor = () => {
    if (previewZoom === 50) return 0.5;
    if (previewZoom === 60) return 0.6;
    if (previewZoom === 80) return 0.8;
    if (previewZoom === 100) return 1.0;
    // auto:
    if (selectedModel === 'stories') return 0.65;
    if (selectedModel === 'feedsquare') return 0.68;
    return 0.62;
  };

  const scale = getScaleFactor();

  const downloadBanner = async () => {
    if (!previewRef.current) return;
    try {
      const qualityLabels: Record<number, string> = {
        2: 'Full HD (2x)',
        3: 'Ultra HD 2K (3x)',
        4: 'Cinema 4K (4x)'
      };
      const currentQuality = qualityLabels[exportQuality] || `${exportQuality}x`;

      toast.loading(`Gerando banner em ${currentQuality}...`, { id: 'download-banner' });

      const targetNode = (previewRef.current.firstElementChild as HTMLElement) || previewRef.current;
      const naturalWidth = targetNode.offsetWidth || 1000;
      const naturalHeight = targetNode.offsetHeight || 1250;

      const dataUrl = await toPng(targetNode, {
        cacheBust: true,
        quality: 1,
        pixelRatio: exportQuality,
        width: naturalWidth,
        height: naturalHeight,
        canvasWidth: naturalWidth,
        canvasHeight: naturalHeight,
        skipFonts: true,
        backgroundColor: '#07090E',
        style: {
          transform: 'none',
          transformOrigin: 'top left',
          margin: '0',
        },
      });

      const link = document.createElement('a');
      link.download = `banner-jogos-${selectedModel}-${exportQuality}x-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
      toast.success(`Banner esportivo ${currentQuality} baixado com sucesso!`, { id: 'download-banner' });
    } catch (err) {
      console.error(err);
      toast.error('Erro ao gerar banner esportivo', { id: 'download-banner' });
    }
  };

  return (
    <div className="mt-8 space-y-6 animate-fade-in border-t border-border/40 pt-8">
      {/* Header Banner Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-red-950/40 via-neutral-900 to-black p-6 rounded-2xl border border-red-500/20 shadow-xl">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-red-600/20 text-red-400 border border-red-500/30">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span>ESTÚDIO DE ARTES ESPORTIVAS</span>
          </div>
          <h2 className="text-3xl font-black uppercase tracking-tight text-white italic">
            Gerador de Banner de Jogos
          </h2>
          <p className="text-sm text-muted-foreground">
            Crie tabelas de jogos oficiais com 11 modelos profissionais para transmissões e redes sociais
          </p>
        </div>

        {/* Quick Presets */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-white/70">Presets Rápidos:</span>
          {PRESET_RODADAS.map((p) => (
            <Button
              key={p.label}
              size="sm"
              variant="outline"
              className="text-xs h-8 border-white/20 bg-black/40 hover:bg-white/10"
              onClick={() => applyPreset(p)}
            >
              {p.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Left Controls Column (Rolagem independente) */}
        <div className="w-full lg:w-[440px] lg:flex-shrink-0 space-y-6 lg:max-h-[calc(100vh-5rem)] lg:overflow-y-auto lg:pr-2 lg:sticky lg:top-4 custom-scrollbar">
          <Card className="netflix-card border-primary/20 bg-black/40 backdrop-blur-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center gap-2 text-white font-bold">
                  <LayoutIcon className="w-4 h-4 text-primary" />
                  Painel de Configuração
                </span>
                <Badge variant="outline" className="text-xs text-primary border-primary/40 font-bold uppercase">
                  11 Modelos
                </Badge>
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              <Tabs defaultValue="modelos" className="w-full">
                <TabsList className="grid w-full grid-cols-4 bg-muted/20">
                  <TabsTrigger value="modelos" className="text-xs data-[state=active]:bg-primary/20">
                    Modelos
                  </TabsTrigger>
                  <TabsTrigger value="jogos" className="text-xs data-[state=active]:bg-primary/20">
                    Jogos
                  </TabsTrigger>
                  <TabsTrigger value="marca" className="text-xs data-[state=active]:bg-primary/20">
                    Marca
                  </TabsTrigger>
                  <TabsTrigger value="estilo" className="text-xs data-[state=active]:bg-primary/20">
                    Estilo
                  </TabsTrigger>
                </TabsList>

                {/* TAB 1: 11 Modelos com Mockups Visuais Reais */}
                <TabsContent value="modelos" className="space-y-4 pt-4">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                    <span className="font-semibold text-white/90">11 Modelos Esportivos Disponíveis</span>
                    <span className="text-[10px] text-primary font-bold">10 Novos Adicionados ✨</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
                    {SPORTS_MODELS.map((m) => {
                      const isSelected = selectedModel === m.id;
                      return (
                        <button
                          key={m.id}
                          onClick={() => handleSelectModel(m.id)}
                          className={cn(
                            "group relative min-h-[195px] border-2 rounded-xl overflow-hidden transition-all hover:scale-[1.02] text-left p-2.5 flex flex-col justify-between",
                            isSelected 
                              ? "border-primary bg-primary/10 shadow-[0_0_15px_rgba(229,9,20,0.35)] ring-1 ring-primary/50" 
                              : "border-border/40 hover:border-primary/50 bg-muted/20"
                          )}
                        >
                          <div className="flex justify-between items-center w-full">
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-white/10 text-white/70">{m.ratio}</span>
                            {m.badge && (
                              <span className={cn("text-[8px] font-black px-1.5 py-0.2 rounded text-white", m.badgeColor || "bg-primary")}>
                                {m.badge}
                              </span>
                            )}
                            {isSelected && (
                              <span className="text-[9px] font-black text-primary flex items-center gap-0.5">
                                <Check size={11} /> ATIVO
                              </span>
                            )}
                          </div>

                          {/* Mockup Visual do Modelo */}
                          <div className="w-full h-24 rounded-lg overflow-hidden bg-neutral-950/90 border border-white/10 relative my-1.5 flex items-center justify-center p-1 group-hover:border-primary/40 transition-all shadow-inner">
                            {/* Visual specific render per model */}
                            {m.id === 'premier' && (
                              <div className="h-[84px] w-[62px] rounded-[4px] bg-neutral-900 border border-neutral-700 relative overflow-hidden flex flex-col justify-between p-1">
                                <div className="text-[4px] font-black text-center text-amber-400">TABELA DE JOGOS</div>
                                <div className="bg-white text-black text-[3px] font-black text-center py-0.5 transform -skew-x-6">BRASILEIRÃO</div>
                                <div className="flex justify-between items-center px-1">
                                  <div className="w-3.5 h-3.5 rounded-full bg-red-600 border border-white/40" />
                                  <span className="text-[4px] font-black italic">VS</span>
                                  <div className="w-3.5 h-3.5 rounded-full bg-white border border-gray-400" />
                                </div>
                                <div className="text-[3px] text-center text-amber-300">PREMIERE HD</div>
                              </div>
                            )}

                            {m.id === 'champions' && (
                              <div className="h-[84px] w-[62px] rounded-[4px] bg-[#030712] border border-cyan-400/60 shadow-[0_0_8px_rgba(6,182,212,0.4)] relative overflow-hidden flex flex-col justify-between p-1">
                                <div className="text-[4px] font-black text-center text-cyan-300 flex items-center justify-center gap-0.5">
                                  <Star size={4} className="fill-amber-300 text-amber-300" /> CHAMPIONS
                                </div>
                                <div className="bg-blue-600 text-white text-[3px] font-black text-center py-0.5 rounded">NOITE DE DECISÃO</div>
                                <div className="flex justify-between items-center px-1">
                                  <div className="w-3.5 h-3.5 rounded-md bg-cyan-900 border border-cyan-400" />
                                  <span className="text-[4px] font-black italic text-cyan-200">VS</span>
                                  <div className="w-3.5 h-3.5 rounded-md bg-blue-900 border border-cyan-400" />
                                </div>
                                <div className="text-[3px] text-center text-cyan-300">MAX / TNT</div>
                              </div>
                            )}

                            {m.id === 'cyber' && (
                              <div className="h-[84px] w-[62px] rounded-[4px] bg-black border border-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.4)] relative overflow-hidden flex flex-col justify-between p-1">
                                <div className="text-[4px] font-black text-center text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-rose-400">
                                  ⚡ CYBER STADIUM
                                </div>
                                <div className="flex justify-between items-center px-1 my-auto">
                                  <div className="w-3.5 h-3.5 rounded bg-black border border-cyan-400" />
                                  <span className="text-[5px] font-black italic text-white">VS</span>
                                  <div className="w-3.5 h-3.5 rounded bg-black border border-rose-500" />
                                </div>
                                <div className="text-[3px] text-center text-rose-400 font-bold">4K 60FPS</div>
                              </div>
                            )}

                            {m.id === 'stories' && (
                              <div className="h-[86px] w-[46px] rounded-[6px] bg-neutral-900 border border-purple-500/60 shadow-md relative overflow-hidden flex flex-col justify-between p-0.5">
                                <div className="flex gap-0.5 w-full">
                                  <div className="h-[1px] flex-1 bg-white" />
                                  <div className="h-[1px] flex-1 bg-white/40" />
                                </div>
                                <div className="text-[3px] font-black text-center text-amber-300">STATUS WHATSAPP</div>
                                <div className="w-full bg-neutral-800 p-0.5 rounded flex justify-between items-center">
                                  <div className="w-2 h-2 rounded-full bg-red-500" />
                                  <span className="text-[3px] font-black">VS</span>
                                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                                </div>
                                <div className="bg-red-600 text-white text-[3px] font-black text-center py-0.2 rounded">PEÇA TESTE</div>
                              </div>
                            )}

                            {m.id === 'superclasico' && (
                              <div className="h-[84px] w-[62px] rounded-[4px] bg-red-950/80 border border-red-500 shadow-[0_0_8px_rgba(220,38,38,0.5)] relative overflow-hidden flex flex-col justify-between p-1">
                                <div className="text-[4px] font-black text-center text-amber-400">🔥 SUPER CLÁSSICO</div>
                                <div className="flex justify-around items-center my-auto">
                                  <div className="w-5 h-5 rounded-full bg-black border-2 border-amber-400" />
                                  <span className="text-[6px] font-black italic text-red-500">VS</span>
                                  <div className="w-5 h-5 rounded-full bg-black border-2 border-amber-400" />
                                </div>
                                <div className="text-[3px] text-center text-white/70">DUELO DE GIGANTES</div>
                              </div>
                            )}

                            {m.id === 'vipgold' && (
                              <div className="h-[84px] w-[62px] rounded-[4px] bg-[#0A0907] border border-amber-400/80 shadow-[0_0_8px_rgba(212,175,55,0.4)] relative overflow-hidden flex flex-col justify-between p-1">
                                <div className="text-[4px] font-black text-center text-amber-300 flex items-center justify-center gap-0.5">
                                  <Crown size={5} className="text-amber-400" /> VIP SPORTS
                                </div>
                                <div className="flex justify-between items-center px-1 my-auto">
                                  <div className="w-4 h-4 rounded-full bg-black border border-amber-400" />
                                  <div className="w-3.5 h-3.5 rounded-full bg-amber-400 text-black text-[4px] font-black flex items-center justify-center">VS</div>
                                  <div className="w-4 h-4 rounded-full bg-black border border-amber-400" />
                                </div>
                                <div className="bg-amber-400 text-black text-[3px] font-black text-center py-0.2 rounded">TRANSMISSÃO 4K</div>
                              </div>
                            )}

                            {m.id === 'minimalist' && (
                              <div className="h-[84px] w-[62px] rounded-[4px] bg-[#0C0F17] border border-neutral-700 relative overflow-hidden flex flex-col justify-between p-1">
                                <div className="text-[4px] font-bold text-neutral-400">PROGRAMAÇÃO</div>
                                <div className="space-y-1 my-auto">
                                  <div className="h-0.5 w-3/4 bg-white/80 rounded" />
                                  <div className="h-0.5 w-1/2 bg-blue-400 rounded" />
                                </div>
                                <div className="flex justify-between text-[3px] text-neutral-500">
                                  <span>AO VIVO</span>
                                  <span>HD</span>
                                </div>
                              </div>
                            )}

                            {m.id === 'feedsquare' && (
                              <div className="w-[66px] h-[66px] rounded-[4px] bg-[#080B11] border border-emerald-500/50 shadow-md relative overflow-hidden flex flex-col justify-between p-1">
                                <div className="flex justify-between text-[3px] font-black text-emerald-400">
                                  <span>1:1 FEED</span>
                                  <span>HOJE</span>
                                </div>
                                <div className="w-full bg-neutral-900 rounded p-0.5 flex justify-between items-center">
                                  <div className="w-2.5 h-2.5 rounded-full bg-white/80" />
                                  <span className="text-[3px] font-black">VS</span>
                                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                                </div>
                                <div className="text-[3px] text-center text-white/50">INSTAGRAM & GRUPOS</div>
                              </div>
                            )}

                            {m.id === 'fire' && (
                              <div className="h-[84px] w-[62px] rounded-[4px] bg-[#0A0503] border border-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.4)] relative overflow-hidden flex flex-col justify-between p-1">
                                <div className="text-[4px] font-black text-center text-orange-400">RODADA EM FOGO</div>
                                <div className="flex justify-between items-center px-1 my-auto">
                                  <div className="w-3.5 h-3.5 rounded-full bg-orange-600" />
                                  <span className="text-[5px] font-black italic text-amber-300">VS</span>
                                  <div className="w-3.5 h-3.5 rounded-full bg-red-600" />
                                </div>
                                <div className="text-[3px] text-center text-orange-300">CLIMA DE DECISÃO</div>
                              </div>
                            )}

                            {m.id === 'gridmulti' && (
                              <div className="h-[84px] w-[62px] rounded-[4px] bg-[#0A0D14] border border-blue-500/50 relative overflow-hidden flex flex-col justify-between p-1">
                                <div className="text-[3px] font-black text-center text-blue-300">GRADE MULTI-JOGOS</div>
                                <div className="grid grid-cols-2 gap-0.5 my-auto">
                                  <div className="h-4 bg-neutral-900 rounded-[2px] border border-white/10" />
                                  <div className="h-4 bg-neutral-900 rounded-[2px] border border-white/10" />
                                  <div className="h-4 bg-neutral-900 rounded-[2px] border border-white/10" />
                                  <div className="h-4 bg-neutral-900 rounded-[2px] border border-white/10" />
                                </div>
                                <div className="text-[3px] text-center text-white/60">2 COLUNAS</div>
                              </div>
                            )}

                            {m.id === 'classic' && (
                              <div className="h-[84px] w-[62px] rounded-[4px] bg-black border border-neutral-700 relative overflow-hidden flex flex-col justify-between p-1">
                                <div className="text-[4px] font-black text-center text-amber-400">TABELA CLÁSSICA</div>
                                <div className="bg-white text-black text-[3px] font-black text-center py-1 rounded-[1px]">
                                  CARTELAS BRANCAS
                                </div>
                                <div className="text-[3px] text-center text-white/50">PADRÃO GLOBO</div>
                              </div>
                            )}
                          </div>

                          <div>
                            <div className="text-[11px] font-black leading-tight text-white">{m.name}</div>
                            <div className="text-[9px] text-muted-foreground line-clamp-1">{m.description}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </TabsContent>

                {/* TAB 2: Editor de Jogos */}
                <TabsContent value="jogos" className="space-y-4 pt-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-white">Partidas no Banner ({matches.length})</Label>
                    <Button onClick={addMatch} size="sm" variant="outline" className="h-7 text-xs border-primary/40 text-primary hover:bg-primary/10">
                      <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar Jogo
                    </Button>
                  </div>

                  <div className="space-y-3.5 max-h-[480px] overflow-y-auto pr-1 custom-scrollbar">
                    {matches.map((match, index) => (
                      <Card key={match.id} className="bg-black/50 border-border/40 overflow-hidden">
                        <CardHeader className="p-2.5 bg-white/5 flex flex-row items-center justify-between">
                          <span className="text-xs font-black text-amber-400 uppercase">
                            Jogo #{index + 1}
                          </span>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => removeMatch(match.id)} 
                            className="h-6 w-6 p-0 text-destructive hover:bg-destructive/20"
                          >
                            <Trash2 size={13} />
                          </Button>
                        </CardHeader>

                        <CardContent className="p-3 space-y-2.5">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <Label className="text-[10px] text-muted-foreground">Campeonato / Liga</Label>
                              <Input 
                                placeholder="Ex: BRASILEIRÃO" 
                                value={match.league} 
                                onChange={(e) => updateMatch(match.id, 'league', e.target.value.toUpperCase())} 
                                className="h-7 text-xs" 
                              />
                            </div>
                            <div>
                              <Label className="text-[10px] text-muted-foreground">Horário</Label>
                              <Input 
                                placeholder="Ex: 16:00" 
                                value={match.time} 
                                onChange={(e) => updateMatch(match.id, 'time', e.target.value)} 
                                className="h-7 text-xs" 
                              />
                            </div>
                          </div>

                          {/* Time Mandante vs Time Visitante */}
                          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-white/5">
                            <div className="space-y-1">
                              <Label className="text-[10px] font-bold text-white">Time Mandante</Label>
                              <Input 
                                value={match.teamHome} 
                                onChange={(e) => updateMatch(match.id, 'teamHome', e.target.value.toUpperCase())} 
                                className="h-7 text-xs font-bold" 
                              />
                              <label className="text-[9px] cursor-pointer text-primary hover:underline block pt-0.5">
                                Enviar Escudo
                                <input type="file" className="hidden" accept="image/*" onChange={(e) => handleTeamLogoUpload(match.id, 'Home', e)} />
                              </label>
                              <LogoUrlInput onApply={(url) => applyLogoUrl(match.id, 'Home', url)} />
                            </div>

                            <div className="space-y-1">
                              <Label className="text-[10px] font-bold text-white">Time Visitante</Label>
                              <Input 
                                value={match.teamAway} 
                                onChange={(e) => updateMatch(match.id, 'teamAway', e.target.value.toUpperCase())} 
                                className="h-7 text-xs font-bold" 
                              />
                              <label className="text-[9px] cursor-pointer text-primary hover:underline block pt-0.5">
                                Enviar Escudo
                                <input type="file" className="hidden" accept="image/*" onChange={(e) => handleTeamLogoUpload(match.id, 'Away', e)} />
                              </label>
                              <LogoUrlInput onApply={(url) => applyLogoUrl(match.id, 'Away', url)} />
                            </div>
                          </div>

                          <div>
                            <Label className="text-[10px] text-muted-foreground">Canal de Transmissão</Label>
                            <Input 
                              placeholder="Ex: PREMIERE / SPORTV" 
                              value={match.channel} 
                              onChange={(e) => updateMatch(match.id, 'channel', e.target.value.toUpperCase())} 
                              className="h-7 text-xs" 
                            />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>

                {/* TAB 3: Marca e Textos */}
                <TabsContent value="marca" className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold">Data / Título Principal do Banner</Label>
                    <Input 
                      value={date} 
                      onChange={(e) => setDate(e.target.value.toUpperCase())} 
                      className="font-bold text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold">Nome da Marca (Se não houver logo)</Label>
                    <Input 
                      value={brandName} 
                      onChange={(e) => handleBrandNameChange(e.target.value.toUpperCase())} 
                      placeholder="Ex: STREAM SPORTS" 
                      className="font-bold text-sm"
                    />
                  </div>

                  <div className="space-y-2 pt-1 border-t border-white/10">
                    <Label className="text-xs font-bold">Logo da Marca</Label>
                    {logo ? (
                      <div className="relative group rounded-lg overflow-hidden border border-border/40 bg-muted/20 p-4 flex items-center justify-center">
                        <img src={logo} alt="Brand Logo" className="max-h-20 object-contain" />
                        <button 
                          onClick={() => { setLogo(null); localStorage.removeItem('gerador-post-logo'); }} 
                          className="absolute top-2 right-2 p-1.5 bg-red-600 rounded-full text-white hover:bg-red-700"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-border/40 rounded-lg cursor-pointer hover:bg-muted/30 transition-colors">
                        <Upload className="w-6 h-6 mb-1 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground font-bold">Upload da Logo (PNG sem fundo)</span>
                        <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                      </label>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">Tamanho da Logo ({logoSize}px)</Label>
                    <Slider value={[logoSize]} onValueChange={([val]) => setLogoSize(val)} max={220} min={50} step={5} />
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="space-y-1">
                      <Label className="text-[11px]">Ajuste Horizontal ({logoX}%)</Label>
                      <Slider value={[logoX]} onValueChange={([val]) => setLogoX(val)} max={100} min={-100} step={1} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px]">Ajuste Vertical ({logoY}%)</Label>
                      <Slider value={[logoY]} onValueChange={([val]) => setLogoY(val)} max={100} min={-100} step={1} />
                    </div>
                  </div>
                </TabsContent>

                {/* TAB 4: Estilo e Cores */}
                <TabsContent value="estilo" className="space-y-4 pt-4">
                  <div className="space-y-2.5">
                    <Label className="text-xs font-bold">Cor de Destaque do Banner</Label>
                    <div className="flex gap-2">
                      <Input 
                        type="color" 
                        value={accentColor} 
                        onChange={(e) => setAccentColor(e.target.value)} 
                        className="w-12 h-10 p-1 bg-transparent cursor-pointer" 
                      />
                      <Input 
                        value={accentColor} 
                        onChange={(e) => setAccentColor(e.target.value)} 
                        className="flex-1 font-mono text-sm" 
                      />
                    </div>

                    <div className="grid grid-cols-4 gap-1.5 pt-2">
                      {PRESET_COLORS.map((c) => (
                        <button
                          key={c.hex}
                          type="button"
                          onClick={() => setAccentColor(c.hex)}
                          className="h-8 rounded-md flex items-center justify-center text-[10px] font-bold text-white border border-white/20 shadow-sm transition-transform hover:scale-105"
                          style={{ backgroundColor: c.hex }}
                        >
                          {accentColor === c.hex && <Check size={12} />}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-white/10">
                    <Label className="text-xs">Opacidade dos Efeitos de Fundo ({Math.round(overlayOpacity * 100)}%)</Label>
                    <Slider value={[overlayOpacity]} onValueChange={([val]) => setOverlayOpacity(val)} max={1} min={0.4} step={0.05} />
                  </div>
                </TabsContent>
              </Tabs>

              {/* Seletor de Resolução / Qualidade & Botão de Download */}
              <div className="space-y-3 pt-3 border-t border-white/10">
                <div className="p-3 rounded-xl border border-border/50 bg-black/40 backdrop-blur-sm space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-primary" />
                      <Label className="text-xs font-bold text-white">Resolução de Download</Label>
                    </div>
                    <Badge variant="outline" className="text-[10px] text-primary border-primary/40 font-black uppercase">
                      {exportQuality === 4 ? 'Cinema 4K (4x)' : exportQuality === 3 ? 'Ultra HD 2K (3x)' : 'Full HD (2x)'}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-1.5">
                    <Button
                      type="button"
                      size="sm"
                      variant={exportQuality === 2 ? 'default' : 'outline'}
                      className={cn("text-[11px] h-8 font-bold", exportQuality === 2 ? "bg-primary text-white" : "border-border/60 hover:bg-muted/40 text-muted-foreground")}
                      onClick={() => handleSetQuality(2)}
                    >
                      Full HD (2x)
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={exportQuality === 3 ? 'default' : 'outline'}
                      className={cn("text-[11px] h-8 font-bold", exportQuality === 3 ? "bg-primary text-white" : "border-border/60 hover:bg-muted/40 text-muted-foreground")}
                      onClick={() => handleSetQuality(3)}
                    >
                      Ultra HD (3x) ✨
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={exportQuality === 4 ? 'default' : 'outline'}
                      className={cn("text-[11px] h-8 font-bold", exportQuality === 4 ? "bg-primary text-white" : "border-border/60 hover:bg-muted/40 text-muted-foreground")}
                      onClick={() => handleSetQuality(4)}
                    >
                      Cinema 4K (4x) 🔥
                    </Button>
                  </div>
                </div>

                <Button 
                  onClick={downloadBanner} 
                  className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-black text-sm shadow-xl shadow-primary/25 transition-all hover:scale-[1.01]"
                >
                  <Download className="w-5 h-5 mr-2" /> 
                  Baixar Banner em {exportQuality === 4 ? '4K Ultra HD' : exportQuality === 3 ? 'Ultra HD 2K' : 'Full HD'} (PNG)
                </Button>

                <div className="flex justify-between items-center text-[11px] text-muted-foreground px-0.5">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Fundo Sólido Sem Cantos Brancos</span>
                  </div>
                  <span className="font-bold text-white/80">
                    {exportQuality === 4 ? 'Até 4000px' : exportQuality === 3 ? 'Até 3000px' : 'Até 2000px'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Preview Column (Sticky e com visualizador ajustável) */}
        <div className="flex-1 w-full flex flex-col items-center lg:sticky lg:top-4 lg:max-h-[calc(100vh-5rem)] lg:overflow-y-auto custom-scrollbar">
          {/* Top Bar do Preview */}
          <div className="w-full flex items-center justify-between bg-black/40 backdrop-blur-md border border-border/40 rounded-xl px-4 py-2.5 mb-4 text-xs shadow-sm">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="font-bold text-muted-foreground hidden sm:inline">Modelo Ativo:</span>
              <Badge variant="outline" className="text-primary border-primary/40 font-black uppercase text-[10px] tracking-wider">
                {SPORTS_MODELS.find(m => m.id === selectedModel)?.name || '1. Premier Arena'}
              </Badge>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-muted-foreground mr-1">Zoom:</span>
              {(['auto', 50, 60, 80, 100] as const).map((z) => (
                <Button
                  key={z}
                  type="button"
                  variant={previewZoom === z ? 'default' : 'ghost'}
                  size="sm"
                  className="h-7 px-2 text-[11px] font-bold"
                  onClick={() => setPreviewZoom(z)}
                >
                  {z === 'auto' ? 'Ajustar' : `${z}%`}
                </Button>
              ))}
            </div>
          </div>

          {/* Renderização do Modelo */}
          <div className="w-full flex justify-center items-start overflow-hidden py-2 min-h-[500px]">
            <div
              style={{
                transform: `scale(${scale})`,
                transformOrigin: 'top center',
                transition: 'transform 0.2s ease-out',
              }}
            >
              <div ref={previewRef} className="flex justify-center items-center shadow-2xl rounded-none overflow-hidden bg-black">
                {selectedModel === 'premier' && (
                  <PremierArenaBanner
                    matches={matches}
                    date={date}
                    logo={logo}
                    accentColor={accentColor}
                    logoSize={logoSize}
                    logoX={logoX}
                    logoY={logoY}
                    overlayOpacity={overlayOpacity}
                    brandName={brandName}
                  />
                )}
                {selectedModel === 'champions' && (
                  <ChampionsStadiumBanner
                    matches={matches}
                    date={date}
                    logo={logo}
                    accentColor={accentColor}
                    logoSize={logoSize}
                    logoX={logoX}
                    logoY={logoY}
                    overlayOpacity={overlayOpacity}
                    brandName={brandName}
                  />
                )}
                {selectedModel === 'cyber' && (
                  <CyberNeonBanner
                    matches={matches}
                    date={date}
                    logo={logo}
                    accentColor={accentColor}
                    logoSize={logoSize}
                    logoX={logoX}
                    logoY={logoY}
                    overlayOpacity={overlayOpacity}
                    brandName={brandName}
                  />
                )}
                {selectedModel === 'stories' && (
                  <StoriesMatchBanner
                    matches={matches}
                    date={date}
                    logo={logo}
                    accentColor={accentColor}
                    logoSize={logoSize}
                    logoX={logoX}
                    logoY={logoY}
                    overlayOpacity={overlayOpacity}
                    brandName={brandName}
                  />
                )}
                {selectedModel === 'superclasico' && (
                  <SuperClasicoBanner
                    matches={matches}
                    date={date}
                    logo={logo}
                    accentColor={accentColor}
                    logoSize={logoSize}
                    logoX={logoX}
                    logoY={logoY}
                    overlayOpacity={overlayOpacity}
                    brandName={brandName}
                  />
                )}
                {selectedModel === 'vipgold' && (
                  <VipGoldBanner
                    matches={matches}
                    date={date}
                    logo={logo}
                    accentColor={accentColor}
                    logoSize={logoSize}
                    logoX={logoX}
                    logoY={logoY}
                    overlayOpacity={overlayOpacity}
                    brandName={brandName}
                  />
                )}
                {selectedModel === 'minimalist' && (
                  <MinimalistCleanBanner
                    matches={matches}
                    date={date}
                    logo={logo}
                    accentColor={accentColor}
                    logoSize={logoSize}
                    logoX={logoX}
                    logoY={logoY}
                    overlayOpacity={overlayOpacity}
                    brandName={brandName}
                  />
                )}
                {selectedModel === 'feedsquare' && (
                  <FeedSquareBanner
                    matches={matches}
                    date={date}
                    logo={logo}
                    accentColor={accentColor}
                    logoSize={logoSize}
                    logoX={logoX}
                    logoY={logoY}
                    overlayOpacity={overlayOpacity}
                    brandName={brandName}
                  />
                )}
                {selectedModel === 'fire' && (
                  <FireStadiumBanner
                    matches={matches}
                    date={date}
                    logo={logo}
                    accentColor={accentColor}
                    logoSize={logoSize}
                    logoX={logoX}
                    logoY={logoY}
                    overlayOpacity={overlayOpacity}
                    brandName={brandName}
                  />
                )}
                {selectedModel === 'gridmulti' && (
                  <GridMultiJogosBanner
                    matches={matches}
                    date={date}
                    logo={logo}
                    accentColor={accentColor}
                    logoSize={logoSize}
                    logoX={logoX}
                    logoY={logoY}
                    overlayOpacity={overlayOpacity}
                    brandName={brandName}
                  />
                )}
                {selectedModel === 'classic' && (
                  <ClassicBroadcastBanner
                    matches={matches}
                    date={date}
                    logo={logo}
                    accentColor={accentColor}
                    logoSize={logoSize}
                    logoX={logoX}
                    logoY={logoY}
                    overlayOpacity={overlayOpacity}
                    brandName={brandName}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GeradorBannerEsportes;
