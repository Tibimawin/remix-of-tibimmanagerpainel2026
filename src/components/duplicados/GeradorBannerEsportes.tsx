import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { 
  Download, 
  Upload, 
  Trash2, 
  Plus, 
  Calendar, 
  Clock, 
  Trophy,
  Palette,
  Layout as LayoutIcon,
  Image as ImageIcon,
  Type
} from 'lucide-react';
import { toPng } from 'html-to-image';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Match {
  id: string;
  league: string;
  time: string;
  teamHome: string;
  teamAway: string;
  logoHome: string;
  logoAway: string;
  channel: string;
}

const GeradorBannerEsportes = () => {
  const [logo, setLogo] = useState<string | null>(localStorage.getItem('gerador-post-logo'));
  const [date, setDate] = useState('SÁBADO - 22 DE AGOSTO');
  const [matches, setMatches] = useState<Match[]>([
    {
      id: '1',
      league: 'BRASILEIRÃO SÉRIE A - 16:00',
      time: '16:00',
      teamHome: 'FLUMINENSE',
      teamAway: 'REMO',
      logoHome: '',
      logoAway: '',
      channel: 'PFC'
    }
  ]);
  
  const [accentColor, setAccentColor] = useState('#8B0000'); // Dark red from reference
  const [logoSize, setLogoSize] = useState(120);
  const [logoX, setLogoX] = useState(0);
  const [logoY, setLogoY] = useState(0);
  const [overlayOpacity, setOverlayOpacity] = useState(0.85);

  const previewRef = useRef<HTMLDivElement>(null);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setLogo(base64);
        localStorage.setItem('gerador-post-logo', base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const addMatch = () => {
    const newMatch: Match = {
      id: Math.random().toString(36).substr(2, 9),
      league: 'BRASILEIRÃO SÉRIE A - 18:00',
      time: '18:00',
      teamHome: 'TIME A',
      teamAway: 'TIME B',
      logoHome: '',
      logoAway: '',
      channel: 'SPORTV'
    };
    setMatches([...matches, newMatch]);
  };

  const removeMatch = (id: string) => {
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

  const downloadBanner = async () => {
    if (!previewRef.current) return;
    try {
      toast.loading('Gerando banner...', { id: 'download-banner' });
      const dataUrl = await toPng(previewRef.current, {
        quality: 0.95,
        pixelRatio: 2,
      });
      const link = document.createElement('a');
      link.download = `banner-jogos-${new Date().getTime()}.png`;
      link.href = dataUrl;
      link.click();
      toast.success('Banner baixado com sucesso!', { id: 'download-banner' });
    } catch (err) {
      toast.error('Erro ao gerar banner', { id: 'download-banner' });
    }
  };

  return (
    <div className="mt-12 space-y-8 animate-fade-in border-t border-border/40 pt-12">
      <div className="flex flex-col items-center mb-8">
        <h2 className="text-3xl font-black uppercase tracking-tighter text-white">Gerador de Banner de Jogos</h2>
        <p className="text-muted-foreground">Crie tabelas de jogos personalizadas com sua marca</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Controls */}
        <div className="w-full lg:w-1/3 space-y-6">
          <Tabs defaultValue="geral" className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-muted/20">
              <TabsTrigger value="geral">Geral</TabsTrigger>
              <TabsTrigger value="jogos">Jogos</TabsTrigger>
              <TabsTrigger value="estilo">Estilo</TabsTrigger>
            </TabsList>

            <TabsContent value="geral" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Data / Título do Banner</Label>
                <Input value={date} onChange={(e) => setDate(e.target.value.toUpperCase())} />
              </div>

              <div className="space-y-2">
                <Label>Logo da Marca</Label>
                <div className="flex flex-col gap-4">
                  {logo ? (
                    <div className="relative group rounded-lg overflow-hidden border border-border/40 bg-muted/20 p-4 flex items-center justify-center">
                      <img src={logo} alt="Brand Logo" className="max-h-20 object-contain" />
                      <button onClick={() => setLogo(null)} className="absolute top-2 right-2 p-1 bg-red-500 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-border/40 rounded-lg cursor-pointer hover:bg-muted/30">
                      <Upload className="w-6 h-6 mb-1 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Upload Logo</span>
                      <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                    </label>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Tamanho da Logo ({logoSize}%)</Label>
                <Slider value={[logoSize]} onValueChange={([val]) => setLogoSize(val)} max={200} min={50} step={5} />
              </div>

              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>Ajuste Horizontal ({logoX}%)</Label>
                  <Slider value={[logoX]} onValueChange={([val]) => setLogoX(val)} max={100} min={-100} step={1} />
                </div>
                <div className="space-y-2">
                  <Label>Ajuste Vertical ({logoY}%)</Label>
                  <Slider value={[logoY]} onValueChange={([val]) => setLogoY(val)} max={100} min={-100} step={1} />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="jogos" className="space-y-4 pt-4">
              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                {matches.map((match, index) => (
                  <Card key={match.id} className="bg-black/40 border-border/40">
                    <CardHeader className="p-3 flex flex-row items-center justify-between">
                      <span className="text-xs font-bold">Jogo #{index + 1}</span>
                      <Button variant="ghost" size="sm" onClick={() => removeMatch(match.id)} className="h-6 w-6 p-0 text-destructive">
                        <Trash2 size={14} />
                      </Button>
                    </CardHeader>
                    <CardContent className="p-3 pt-0 space-y-3">
                      <Input placeholder="Liga / Horário" value={match.league} onChange={(e) => updateMatch(match.id, 'league', e.target.value.toUpperCase())} className="h-8 text-xs" />
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-[10px]">Time Mandante</Label>
                          <Input value={match.teamHome} onChange={(e) => updateMatch(match.id, 'teamHome', e.target.value.toUpperCase())} className="h-8 text-xs" />
                          <label className="text-[9px] cursor-pointer text-primary hover:underline block">Logo Mandante
                            <input type="file" className="hidden" accept="image/*" onChange={(e) => handleTeamLogoUpload(match.id, 'Home', e)} />
                          </label>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px]">Time Visitante</Label>
                          <Input value={match.teamAway} onChange={(e) => updateMatch(match.id, 'teamAway', e.target.value.toUpperCase())} className="h-8 text-xs" />
                          <label className="text-[9px] cursor-pointer text-primary hover:underline block">Logo Visitante
                            <input type="file" className="hidden" accept="image/*" onChange={(e) => handleTeamLogoUpload(match.id, 'Away', e)} />
                          </label>
                        </div>
                      </div>
                      <Input placeholder="Onde Assistir" value={match.channel} onChange={(e) => updateMatch(match.id, 'channel', e.target.value.toUpperCase())} className="h-8 text-xs" />
                    </CardContent>
                  </Card>
                ))}
                <Button onClick={addMatch} variant="outline" className="w-full border-dashed">
                  <Plus className="w-4 h-4 mr-2" /> Adicionar Jogo
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="estilo" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Cor Principal</Label>
                <div className="flex gap-2">
                  <Input type="color" value={accentColor} onChange={(e) => setAccentColor(e.target.value)} className="w-12 h-10 p-1 bg-transparent" />
                  <Input value={accentColor} onChange={(e) => setAccentColor(e.target.value)} className="flex-1" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Opacidade do Fundo ({overlayOpacity})</Label>
                <Slider value={[overlayOpacity]} onValueChange={([val]) => setOverlayOpacity(val)} max={1} min={0.5} step={0.05} />
              </div>
            </TabsContent>
          </Tabs>

          <Button onClick={downloadBanner} className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 font-bold">
            <Download className="w-5 h-5 mr-2" /> Baixar Banner (PNG)
          </Button>
        </div>

        {/* Preview */}
        <div className="flex-1 flex justify-center items-start">
          <div className="sticky top-24 w-full flex justify-center">
            {/* The exported banner container */}
            <div 
              ref={previewRef}
              className="relative w-[1000px] min-h-[1200px] bg-black overflow-hidden flex flex-col items-center py-10 px-6 font-sans text-white shadow-2xl"
              style={{
                backgroundImage: 'radial-gradient(circle at center, #2a0000 0%, #000 100%)'
              }}
            >
              {/* Background Decoration */}
              <div className="absolute inset-0 z-0 opacity-20 pointer-events-none" 
                   style={{ 
                     backgroundImage: `linear-gradient(45deg, ${accentColor} 25%, transparent 25%), linear-gradient(-45deg, ${accentColor} 25%, transparent 25%)`,
                     backgroundSize: '100px 100px',
                     filter: 'blur(20px)'
                   }} 
              />
              
              <div className="relative z-10 w-full flex flex-col items-center gap-8">
                {/* Header */}
                <div className="w-full flex justify-between items-center px-8">
                  <div style={{ width: `${logoSize}px`, transform: `translate(${logoX}%, ${logoY}%)` }}>
                    {logo && <img src={logo} alt="Brand" className="w-full object-contain" />}
                  </div>
                  <div className="text-center">
                    <h3 className="text-4xl font-black uppercase tracking-tight leading-none italic" style={{ color: 'white' }}>TABELA DE JOGOS</h3>
                    <p className="text-2xl font-bold uppercase mt-2 italic" style={{ color: '#ffd700' }}>{date}</p>
                  </div>
                  <div style={{ width: `${logoSize}px`, transform: `translate(${-logoX}%, ${logoY}%)` }}>
                    {logo && <img src={logo} alt="Brand" className="w-full object-contain" />}
                  </div>
                </div>

                {/* Matches List */}
                <div className="w-full space-y-4 max-w-[850px]">
                  {matches.map((match) => (
                    <div key={match.id} className="flex flex-col items-center w-full">
                      {/* League Header */}
                      <div className="bg-white text-black px-12 py-1 rounded-sm text-sm font-black italic transform -skew-x-12 z-20 shadow-lg border-b-4 border-gray-300">
                        {match.league}
                      </div>
                      
                      {/* Match Card */}
                      <div className="w-full bg-white mt-[-10px] rounded-sm py-4 px-10 flex items-center justify-between text-black relative shadow-xl overflow-hidden transform transition-transform duration-300">
                        {/* Team Home */}
                        <div className="flex items-center gap-6 flex-1 justify-end">
                          <div className="w-20 h-20 flex items-center justify-center p-1 border-2 border-gray-100 rounded-full bg-white shadow-sm overflow-hidden">
                            {match.logoHome ? <img src={match.logoHome} className="w-full h-full object-contain" /> : <div className="w-12 h-12 bg-gray-200 rounded-full" />}
                          </div>
                          <span className="text-2xl font-black tracking-tighter text-right leading-tight max-w-[150px] text-black">{match.teamHome}</span>
                        </div>

                        {/* VS Divider */}
                        <div className="flex flex-col items-center mx-8">
                           <span className="text-4xl font-black italic tracking-tighter text-black/80">VS</span>
                        </div>

                        {/* Team Away */}
                        <div className="flex items-center gap-6 flex-1 justify-start">
                          <span className="text-2xl font-black tracking-tighter text-left leading-tight max-w-[150px] text-black">{match.teamAway}</span>
                          <div className="w-20 h-20 flex items-center justify-center p-1 border-2 border-gray-100 rounded-full bg-white shadow-sm overflow-hidden">
                            {match.logoAway ? <img src={match.logoAway} className="w-full h-full object-contain" /> : <div className="w-12 h-12 bg-gray-200 rounded-full" />}
                          </div>
                        </div>

                        {/* Channel / Watch Info */}
                        <div className="absolute right-10 bottom-2 flex flex-col items-center">
                           <span className="text-[10px] font-bold uppercase text-gray-500 mb-0.5">ASSISTA EM:</span>
                           <div className="bg-gray-100 px-3 py-1 rounded border border-gray-200 min-w-[60px] flex items-center justify-center">
                              <span className="text-xs font-black text-green-700">{match.channel}</span>
                           </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Footer Section */}
                <div className="w-full flex flex-col items-center mt-6">
                   <div className="bg-black/40 backdrop-blur-md px-6 py-1 rounded-full border border-white/20 text-[10px] font-bold uppercase tracking-widest text-white/80 mb-6 italic">
                     Assine já e acompanhe os principais campeonatos do futebol brasileiro e do mundo
                   </div>
                   
                   <div className="flex flex-wrap justify-center gap-6 items-center px-4">
                      {/* Fake league logos/names for style */}
                      {['BUNDESLIGA', 'PREMIER LEAGUE', 'LALIGA', 'CHAMPIONS LEAGUE', 'LIGUE 1', 'LIBERTADORES', 'COPA DO BRASIL', 'BRASILEIRÃO'].map(league => (
                        <div key={league} className="bg-white/10 backdrop-blur-sm border border-white/10 rounded px-3 py-1.5 flex flex-col items-center opacity-70 hover:opacity-100 transition-opacity">
                           <div className="w-8 h-8 mb-1 bg-white/20 rounded-full" />
                           <span className="text-[8px] font-black tracking-tighter text-white">{league}</span>
                        </div>
                      ))}
                   </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GeradorBannerEsportes;
