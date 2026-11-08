import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Sparkles, Snowflake, PartyPopper, Egg, Ghost, Palette, 
  Eye, EyeOff, Save, RotateCcw, Heart, Flame, Music
} from 'lucide-react';
import { toast } from 'sonner';
import { useSeasonalTheme } from '@/hooks/useSeasonalTheme';
import { SeasonalThemeType } from '@/services/SeasonalThemeService';

const themeIcons: Record<SeasonalThemeType, React.ReactNode> = {
  christmas: <Snowflake className="w-5 h-5" />,
  new_year: <PartyPopper className="w-5 h-5" />,
  carnival: <Music className="w-5 h-5" />,
  valentines: <Heart className="w-5 h-5" />,
  sao_joao: <Flame className="w-5 h-5" />,
  easter: <Egg className="w-5 h-5" />,
  halloween: <Ghost className="w-5 h-5" />,
  custom: <Palette className="w-5 h-5" />,
  none: <EyeOff className="w-5 h-5" />
};

const themeColors: Record<SeasonalThemeType, string> = {
  christmas: 'from-red-500 to-green-500',
  new_year: 'from-yellow-500 to-purple-500',
  carnival: 'from-orange-500 to-pink-500',
  valentines: 'from-pink-500 to-red-500',
  sao_joao: 'from-amber-500 to-orange-600',
  easter: 'from-pink-400 to-purple-400',
  halloween: 'from-orange-500 to-purple-700',
  custom: 'from-blue-500 to-purple-500',
  none: 'from-gray-400 to-gray-500'
};

export const AdminSeasonalTheme: React.FC = () => {
  const { config, loading, updateConfig, setThemeType, toggleEffect, presets } = useSeasonalTheme();
  const [customName, setCustomName] = useState('');
  const [customPrimaryColor, setCustomPrimaryColor] = useState('#3b82f6');
  const [customSecondaryColor, setCustomSecondaryColor] = useState('#8b5cf6');
  const [customParticleEmoji, setCustomParticleEmoji] = useState('✨');
  const [customBannerMessage, setCustomBannerMessage] = useState('');
  const [customBannerEmoji, setCustomBannerEmoji] = useState('✨');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (config?.customTheme) {
      setCustomName(config.customTheme.name || '');
      setCustomPrimaryColor(config.customTheme.primaryColor || '#3b82f6');
      setCustomSecondaryColor(config.customTheme.secondaryColor || '#8b5cf6');
      setCustomParticleEmoji(config.customTheme.particleEmoji || '✨');
      setCustomBannerMessage(config.customTheme.bannerMessage || '');
      setCustomBannerEmoji(config.customTheme.bannerEmoji || '✨');
    }
  }, [config?.customTheme]);

  const handleThemeSelect = async (themeType: SeasonalThemeType) => {
    try {
      await setThemeType(themeType);
      toast.success(`Tema ${presets[themeType]?.name || 'Desativado'} selecionado!`);
    } catch (error) {
      toast.error('Erro ao selecionar tema');
    }
  };

  const handleSaveCustomTheme = async () => {
    if (!config) return;
    
    setIsSaving(true);
    try {
      await updateConfig({
        themeType: 'custom',
        enabled: true,
        customTheme: {
          name: customName || 'Personalizado',
          primaryColor: customPrimaryColor,
          secondaryColor: customSecondaryColor,
          particleEmoji: customParticleEmoji,
          bannerMessage: customBannerMessage,
          bannerEmoji: customBannerEmoji
        }
      });
      toast.success('Tema personalizado salvo!');
    } catch (error) {
      toast.error('Erro ao salvar tema');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleTheme = async () => {
    if (!config) return;
    
    await updateConfig({ enabled: !config.enabled });
    toast.success(config.enabled ? 'Tema desativado' : 'Tema ativado');
  };

  if (loading) {
    return (
      <Card className="modern-card">
        <CardContent className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="modern-card bg-gradient-to-br from-card to-card/80 border-border/40">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-foreground flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                Tema Sazonal
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Configure temas visuais especiais para datas comemorativas
              </CardDescription>
            </div>
            
            <div className="flex items-center gap-3">
              <Badge 
                variant={config?.enabled ? 'default' : 'secondary'}
                className={config?.enabled ? 'bg-green-500' : ''}
              >
                {config?.enabled ? 'Ativo' : 'Inativo'}
              </Badge>
              <Switch
                checked={config?.enabled || false}
                onCheckedChange={handleToggleTheme}
              />
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <Tabs defaultValue="themes" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="themes">Temas Prontos</TabsTrigger>
              <TabsTrigger value="custom">Personalizado</TabsTrigger>
              <TabsTrigger value="effects">Efeitos</TabsTrigger>
            </TabsList>

            {/* Temas Prontos */}
            <TabsContent value="themes" className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {(Object.keys(presets) as SeasonalThemeType[]).map((themeKey) => {
                  const preset = presets[themeKey];
                  const isSelected = config?.themeType === themeKey;

                  return (
                    <button
                      key={themeKey}
                      onClick={() => handleThemeSelect(themeKey)}
                      className={`relative p-6 rounded-xl border-2 transition-all duration-300 text-left ${
                        isSelected 
                          ? 'border-primary bg-primary/10 shadow-lg scale-105' 
                          : 'border-border/40 hover:border-primary/50 hover:bg-muted/50'
                      }`}
                    >
                      <div className={`absolute inset-0 rounded-xl opacity-20 bg-gradient-to-br ${themeColors[themeKey]}`} />
                      
                      <div className="relative">
                        <div className="flex items-center gap-3 mb-2">
                          <div className={`p-2 rounded-lg bg-gradient-to-br ${themeColors[themeKey]} text-white`}>
                            {themeIcons[themeKey]}
                          </div>
                          <span className="font-medium text-foreground">
                            {preset?.name || 'Desconhecido'}
                          </span>
                        </div>
                        
                        {themeKey !== 'none' && preset?.particleEmoji && (
                          <div className="flex gap-2 mt-3">
                            <span className="text-xl">{preset.particleEmoji}</span>
                            <span className="text-xl">{preset.bannerEmoji}</span>
                          </div>
                        )}

                        {isSelected && (
                          <div className="absolute top-2 right-2 w-3 h-3 bg-primary rounded-full animate-pulse" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </TabsContent>

            {/* Tema Personalizado */}
            <TabsContent value="custom" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="customName">Nome do Tema</Label>
                    <Input
                      id="customName"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      placeholder="Ex: Promoção de Verão"
                      className="mt-1"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="primaryColor">Cor Primária</Label>
                      <div className="flex gap-2 mt-1">
                        <input
                          type="color"
                          id="primaryColor"
                          value={customPrimaryColor}
                          onChange={(e) => setCustomPrimaryColor(e.target.value)}
                          className="w-12 h-10 rounded border cursor-pointer"
                        />
                        <Input
                          value={customPrimaryColor}
                          onChange={(e) => setCustomPrimaryColor(e.target.value)}
                          placeholder="#3b82f6"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="secondaryColor">Cor Secundária</Label>
                      <div className="flex gap-2 mt-1">
                        <input
                          type="color"
                          id="secondaryColor"
                          value={customSecondaryColor}
                          onChange={(e) => setCustomSecondaryColor(e.target.value)}
                          className="w-12 h-10 rounded border cursor-pointer"
                        />
                        <Input
                          value={customSecondaryColor}
                          onChange={(e) => setCustomSecondaryColor(e.target.value)}
                          placeholder="#8b5cf6"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="particleEmoji">Emoji das Partículas</Label>
                      <Input
                        id="particleEmoji"
                        value={customParticleEmoji}
                        onChange={(e) => setCustomParticleEmoji(e.target.value)}
                        placeholder="✨"
                        className="mt-1 text-2xl"
                        maxLength={4}
                      />
                    </div>

                    <div>
                      <Label htmlFor="bannerEmoji">Emoji do Banner</Label>
                      <Input
                        id="bannerEmoji"
                        value={customBannerEmoji}
                        onChange={(e) => setCustomBannerEmoji(e.target.value)}
                        placeholder="🎉"
                        className="mt-1 text-2xl"
                        maxLength={4}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="bannerMessage">Mensagem do Banner</Label>
                    <Input
                      id="bannerMessage"
                      value={customBannerMessage}
                      onChange={(e) => setCustomBannerMessage(e.target.value)}
                      placeholder="🎉 Sua mensagem aqui! 🎉"
                      className="mt-1"
                    />
                  </div>
                </div>

                {/* Preview */}
                <div className="space-y-4">
                  <Label>Pré-visualização</Label>
                  <div 
                    className="rounded-xl p-6 text-white min-h-[200px] relative overflow-hidden"
                    style={{
                      background: `linear-gradient(135deg, ${customPrimaryColor}, ${customSecondaryColor})`
                    }}
                  >
                    <div className="absolute inset-0 opacity-20">
                      <div className="absolute top-0 left-0 w-24 h-24 bg-white rounded-full -translate-x-1/2 -translate-y-1/2" />
                      <div className="absolute bottom-0 right-0 w-16 h-16 bg-white rounded-full translate-x-1/2 translate-y-1/2" />
                    </div>

                    <div className="relative">
                      <h3 className="text-xl font-bold mb-2">{customName || 'Tema Personalizado'}</h3>
                      <p className="mb-4">{customBannerMessage || 'Sua mensagem aparecerá aqui'}</p>
                      
                      <div className="flex gap-2 text-3xl">
                        {[...Array(5)].map((_, i) => (
                          <span key={i} className="animate-bounce" style={{ animationDelay: `${i * 0.1}s` }}>
                            {customParticleEmoji}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={handleSaveCustomTheme}
                  disabled={isSaving}
                  className="flex-1"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {isSaving ? 'Salvando...' : 'Salvar e Ativar Tema'}
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => {
                    setCustomName('');
                    setCustomPrimaryColor('#3b82f6');
                    setCustomSecondaryColor('#8b5cf6');
                    setCustomParticleEmoji('✨');
                    setCustomBannerMessage('');
                    setCustomBannerEmoji('✨');
                  }}
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Resetar
                </Button>
              </div>
            </TabsContent>

            {/* Efeitos */}
            <TabsContent value="effects" className="space-y-4">
              <div className="grid gap-4">
                <Card className="border-border/40">
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">❄️</div>
                      <div>
                        <h4 className="font-medium">Partículas Animadas</h4>
                        <p className="text-sm text-muted-foreground">
                          Elementos flutuantes caindo pela tela
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={config?.effects.particles || false}
                      onCheckedChange={() => toggleEffect('particles')}
                    />
                  </CardContent>
                </Card>

                <Card className="border-border/40">
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">📢</div>
                      <div>
                        <h4 className="font-medium">Banner Decorativo</h4>
                        <p className="text-sm text-muted-foreground">
                          Banner temático no topo das páginas
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={config?.effects.banner || false}
                      onCheckedChange={() => toggleEffect('banner')}
                    />
                  </CardContent>
                </Card>

                <Card className="border-border/40">
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">🎄</div>
                      <div>
                        <h4 className="font-medium">Decorações nos Cantos</h4>
                        <p className="text-sm text-muted-foreground">
                          Elementos decorativos fixos nos cantos da tela
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={config?.effects.decorations || false}
                      onCheckedChange={() => toggleEffect('decorations')}
                    />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};
