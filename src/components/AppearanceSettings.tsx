import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { Palette, Type, RotateCcw, Check, Pipette, X, Star, Plus, Trash2, Edit2, Eye, Contrast, Globe, Layout, Smartphone, Laptop } from 'lucide-react';
import { useCustomization, AVAILABLE_FONTS, AVAILABLE_THEMES, AVAILABLE_LANGUAGES } from '@/contexts/CustomizationContext';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Cores sugeridas para escolha rápida
const QUICK_COLORS = [
  '#FF6B35', '#F7931E', '#FFD93D', '#6BCB77', '#4D96FF',
  '#6C5CE7', '#A855F7', '#EC4899', '#EF4444', '#14B8A6',
  '#8B5CF6', '#F59E0B', '#10B981', '#3B82F6', '#E11D48',
];

export const AppearanceSettings: React.FC = () => {
  const { 
    settings, 
    setFont, 
    setTheme, 
    setCustomColor, 
    setFontSize,
    setHighContrast,
    setLanguage,
    resetToDefaults, 
    currentFont, 
    activeColor,
    currentLanguage,
    addFavoritePalette,
    removeFavoritePalette,
    renameFavoritePalette,
    applyFavoritePalette,
    hexToHSL,
  } = useCustomization();
  
  // Estado para preview ao vivo
  const [previewSettings, setPreviewSettings] = useState({ ...settings });
  const [customColorInput, setCustomColorInput] = useState(settings.customColor || '#FF6B35');
  const [newPaletteName, setNewPaletteName] = useState('');
  const [editingPaletteId, setEditingPaletteId] = useState<string | null>(null);
  const [editingPaletteName, setEditingPaletteName] = useState('');

  // Sincronizar preview quando as configurações reais mudam (ex: reset)
  useEffect(() => {
    setPreviewSettings({ ...settings });
  }, [settings]);

  const handlePreviewTheme = (themeId: string) => {
    setPreviewSettings(prev => ({ ...prev, themeId, customColor: null }));
    setTheme(themeId);
  };

  const handlePreviewFont = (fontId: string) => {
    setPreviewSettings(prev => ({ ...prev, fontId }));
    setFont(fontId);
  };

  const handlePreviewFontSize = (size: number) => {
    setPreviewSettings(prev => ({ ...prev, fontSize: size }));
    setFontSize(size);
  };

  const handleCustomColorChange = (color: string) => {
    setCustomColorInput(color);
    // Validar se é uma cor HEX válida
    if (/^#[0-9A-Fa-f]{6}$/.test(color)) {
      setCustomColor(color);
    }
  };

  const handleRemoveCustomColor = () => {
    setCustomColor(null);
    setCustomColorInput('#FF6B35');
  };

  const handleSaveToFavorites = () => {
    const colorToSave = settings.customColor || customColorInput;
    if (!/^#[0-9A-Fa-f]{6}$/.test(colorToSave)) {
      toast.error('Selecione uma cor válida primeiro');
      return;
    }
    addFavoritePalette(newPaletteName, colorToSave);
    setNewPaletteName('');
    toast.success('Cor salva nos favoritos!');
  };

  const handleStartEditing = (id: string, currentName: string) => {
    setEditingPaletteId(id);
    setEditingPaletteName(currentName);
  };

  const handleFinishEditing = () => {
    if (editingPaletteId && editingPaletteName.trim()) {
      renameFavoritePalette(editingPaletteId, editingPaletteName);
      toast.success('Nome atualizado!');
    }
    setEditingPaletteId(null);
    setEditingPaletteName('');
  };

  const handleDeletePalette = (id: string, name: string) => {
    removeFavoritePalette(id);
    toast.success(`"${name}" removido dos favoritos`);
  };

  const currentPreviewTheme = AVAILABLE_THEMES.find(t => t.id === previewSettings.themeId) || AVAILABLE_THEMES[0];
  const currentPreviewFont = AVAILABLE_FONTS.find(f => f.id === previewSettings.fontId) || AVAILABLE_FONTS[0];
  const [viewport, setViewport] = useState<'mobile' | 'desktop'>('desktop');

  const previewPrimary = previewSettings.customColor 
    ? hexToHSL(previewSettings.customColor)
    : currentPreviewTheme.primary;
    
  const previewBg = currentPreviewTheme.background || '222.2 84% 4.9%';
  const previewCard = currentPreviewTheme.card || currentPreviewTheme.background || '222.2 84% 4.9%';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-8 space-y-6">
      {/* Configuração de Fonte */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Type className="h-5 w-5" />
            Tipografia
          </CardTitle>
          <CardDescription>
            Personalize a fonte e tamanho do texto do painel
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Seletor de Fonte */}
          <div className="space-y-2">
            <Label>Fonte do Sistema</Label>
            <Select value={previewSettings.fontId} onValueChange={handlePreviewFont}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione uma fonte" />
              </SelectTrigger>
              <SelectContent>
                {AVAILABLE_FONTS.map((font) => (
                  <SelectItem key={font.id} value={font.id}>
                    <span style={{ fontFamily: font.value }}>{font.name}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Fonte atual: <span style={{ fontFamily: currentFont.value }}>{currentFont.name}</span>
            </p>
          </div>

          {/* Tamanho da Fonte */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Tamanho do Texto</Label>
              <Badge variant="secondary">{previewSettings.fontSize}%</Badge>
            </div>
            <Slider
              value={[previewSettings.fontSize]}
              onValueChange={([value]) => handlePreviewFontSize(value)}
              min={80}
              max={130}
              step={5}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Menor (80%)</span>
              <span>Normal (100%)</span>
              <span>Maior (130%)</span>
            </div>
          </div>

          {/* Preview de Texto */}
          <div className="bg-muted/50 rounded-lg p-4 border border-border/40">
            <p className="text-sm text-muted-foreground mb-2">Pré-visualização:</p>
            <p style={{ fontFamily: currentFont.value }} className="text-lg font-medium">
              StreamFlix - Painel de Gerenciamento
            </p>
            <p style={{ fontFamily: currentFont.value }} className="text-sm text-muted-foreground">
              Este é um texto de exemplo para visualizar a fonte selecionada.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Configuração de Cores */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Tema de Cores
          </CardTitle>
          <CardDescription>
            Escolha a cor principal do painel ou defina uma cor personalizada
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Cores Predefinidas */}
          <div className="space-y-3">
            <Label>Cores Predefinidas</Label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
               {AVAILABLE_THEMES.map((theme) => {
                const isSelected = previewSettings.themeId === theme.id && !previewSettings.customColor;
                return (
                  <button
                    key={theme.id}
                    onClick={() => handlePreviewTheme(theme.id)}
                    className={cn(
                      "relative flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all duration-200 hover:scale-105",
                      isSelected 
                        ? "border-primary bg-primary/10" 
                        : "border-border/40 hover:border-border"
                    )}
                  >
                    <div 
                      className="w-10 h-10 rounded-full shadow-md flex items-center justify-center overflow-hidden bg-muted"
                      style={{ backgroundColor: `hsl(${theme.primary})` }}
                    >
                      {theme.logo ? (
                        <img 
                          src={theme.logo} 
                          alt={theme.name} 
                          className="w-full h-full object-contain p-1.5 brightness-0 invert" 
                        />
                      ) : isSelected && (
                        <Check className="h-5 w-5 text-white" />
                      )}
                    </div>
                    <span className="text-xs font-medium truncate w-full text-center">
                      {theme.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cor Personalizada */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Pipette className="h-4 w-4" />
                Cor Personalizada
              </Label>
              {settings.customColor && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleRemoveCustomColor}
                  className="h-7 text-xs text-muted-foreground hover:text-destructive"
                >
                  <X className="h-3 w-3 mr-1" />
                  Remover
                </Button>
              )}
            </div>
            
            <div className="flex items-center gap-3">
              {/* Color Picker Nativo */}
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    className={cn(
                      "w-14 h-14 rounded-xl border-2 transition-all duration-200 hover:scale-105 shadow-md flex items-center justify-center",
                      settings.customColor 
                        ? "border-primary ring-2 ring-primary/30" 
                        : "border-border/40 hover:border-border"
                    )}
                    style={{ backgroundColor: settings.customColor || customColorInput }}
                  >
                    {settings.customColor && <Check className="h-5 w-5 text-white drop-shadow-md" />}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-4" align="start">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Escolha uma cor</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={customColorInput}
                          onChange={(e) => handleCustomColorChange(e.target.value)}
                          className="w-12 h-10 p-1 cursor-pointer"
                        />
                        <Input
                          type="text"
                          value={customColorInput}
                          onChange={(e) => handleCustomColorChange(e.target.value)}
                          placeholder="#FF6B35"
                          className="flex-1 font-mono text-sm"
                        />
                      </div>
                    </div>
                    
                    {/* Cores Rápidas */}
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Cores Populares</Label>
                      <div className="grid grid-cols-5 gap-2">
                        {QUICK_COLORS.map((color) => (
                          <button
                            key={color}
                            onClick={() => handleCustomColorChange(color)}
                            className={cn(
                              "w-8 h-8 rounded-lg border-2 transition-all hover:scale-110",
                              customColorInput === color 
                                ? "border-foreground" 
                                : "border-transparent"
                            )}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </div>

                    <Button 
                      onClick={() => setCustomColor(customColorInput)}
                      className="w-full"
                      size="sm"
                    >
                      Aplicar Cor
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>

              <div className="flex-1">
                <p className="text-sm font-medium">
                  {settings.customColor ? 'Cor personalizada ativa' : 'Clique para escolher'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {settings.customColor || 'Nenhuma cor personalizada definida'}
                </p>
              </div>
            </div>
          </div>

          {/* Salvar nos Favoritos */}
          <div className="space-y-3 pt-3 border-t border-border/40">
            <Label className="flex items-center gap-2">
              <Star className="h-4 w-4" />
              Salvar Cor nos Favoritos
            </Label>
            <div className="flex gap-2">
              <Input
                value={newPaletteName}
                onChange={(e) => setNewPaletteName(e.target.value)}
                placeholder="Nome da cor (opcional)"
                className="flex-1"
              />
              <Button 
                onClick={handleSaveToFavorites}
                size="sm"
                className="gap-1"
                disabled={!settings.customColor && !/^#[0-9A-Fa-f]{6}$/.test(customColorInput)}
              >
                <Plus className="h-4 w-4" />
                Salvar
              </Button>
            </div>
          </div>

          {/* Paletas Favoritas */}
          {settings.favoritePalettes.length > 0 && (
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Star className="h-4 w-4 fill-current" />
                Cores Favoritas ({settings.favoritePalettes.length})
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {settings.favoritePalettes.map((palette) => (
                  <div
                    key={palette.id}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border transition-all",
                      settings.customColor === palette.color
                        ? "border-primary bg-primary/5"
                        : "border-border/40 hover:border-border"
                    )}
                  >
                    <button
                      onClick={() => applyFavoritePalette(palette.id)}
                      className="w-10 h-10 rounded-lg shadow-md flex items-center justify-center transition-transform hover:scale-105"
                      style={{ backgroundColor: palette.color }}
                    >
                      {settings.customColor === palette.color && (
                        <Check className="h-5 w-5 text-white drop-shadow-md" />
                      )}
                    </button>
                    
                    <div className="flex-1 min-w-0">
                      {editingPaletteId === palette.id ? (
                        <Input
                          value={editingPaletteName}
                          onChange={(e) => setEditingPaletteName(e.target.value)}
                          onBlur={handleFinishEditing}
                          onKeyDown={(e) => e.key === 'Enter' && handleFinishEditing()}
                          className="h-7 text-sm"
                          autoFocus
                        />
                      ) : (
                        <button
                          onClick={() => applyFavoritePalette(palette.id)}
                          className="text-left w-full"
                        >
                          <p className="text-sm font-medium truncate">{palette.name}</p>
                          <p className="text-xs text-muted-foreground font-mono">{palette.color}</p>
                        </button>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        onClick={() => handleStartEditing(palette.id, palette.name)}
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDeletePalette(palette.id, palette.name)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Preview de Cor */}
          <div className="bg-muted/50 rounded-lg p-4 border border-border/40">
            <p className="text-sm text-muted-foreground mb-3">Pré-visualização:</p>
            <div className="flex items-center gap-3 flex-wrap">
              <Button 
                size="sm"
                style={{ backgroundColor: `hsl(${activeColor})` }}
                className="text-white hover:opacity-90"
              >
                Botão Primário
              </Button>
              <Button variant="outline" size="sm">
                Botão Secundário
              </Button>
              <Badge style={{ backgroundColor: `hsl(${activeColor})` }} className="text-white">
                Badge
              </Badge>
              <div 
                className="w-6 h-6 rounded-full"
                style={{ backgroundColor: `hsl(${activeColor})` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Acessibilidade */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Acessibilidade
          </CardTitle>
          <CardDescription>
            Opções para melhorar a legibilidade e acessibilidade do painel
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Modo de Alto Contraste */}
          <div className="flex items-center justify-between p-4 rounded-lg border border-border/40 bg-muted/30">
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-2 rounded-lg",
                settings.highContrast ? "bg-primary text-primary-foreground" : "bg-muted"
              )}>
                <Contrast className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium">Modo de Alto Contraste</p>
                <p className="text-sm text-muted-foreground">
                  Aumenta o contraste das cores para melhor visibilidade
                </p>
              </div>
            </div>
            <Switch
              checked={settings.highContrast}
              onCheckedChange={setHighContrast}
              aria-label="Ativar modo de alto contraste"
            />
          </div>

          {/* Preview do Alto Contraste */}
          {settings.highContrast && (
            <div className="bg-black text-white rounded-lg p-4 border-2 border-white/40">
              <p className="text-sm text-gray-300 mb-3">Modo ativo:</p>
              <div className="space-y-2">
                <p className="font-bold text-lg">Alto Contraste Ativado</p>
                <p className="text-gray-200">
                  As cores do painel foram ajustadas para máximo contraste, 
                  facilitando a leitura para pessoas com baixa visão.
                </p>
                <div className="flex gap-2 mt-3">
                  <Badge className="bg-white text-black">Badge Claro</Badge>
                  <Badge variant="outline" className="border-white text-white">Badge Outline</Badge>
                </div>
              </div>
            </div>
          )}

          {/* Dicas de Acessibilidade */}
          <div className="bg-muted/50 rounded-lg p-4 border border-border/40">
            <p className="text-sm font-medium mb-2 flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Dicas de Acessibilidade
            </p>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Use o tamanho de texto maior (até 130%) se precisar</li>
              <li>O modo de alto contraste melhora a legibilidade</li>
              <li>Escolha fontes sans-serif para melhor leitura em telas</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Configuração de Idioma */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Idioma
          </CardTitle>
          <CardDescription>
            Selecione o idioma de exibição do painel
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Idioma do Sistema</Label>
            <Select value={settings.language} onValueChange={setLanguage}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione um idioma" />
              </SelectTrigger>
              <SelectContent>
                {AVAILABLE_LANGUAGES.map((lang) => (
                  <SelectItem key={lang.id} value={lang.id}>
                    <span className="flex items-center gap-2">
                      <span className="text-lg">{lang.flag}</span>
                      <span>{lang.name}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Idioma atual: {currentLanguage.flag} {currentLanguage.name}
            </p>
          </div>

          {/* Info sobre idiomas */}
          <div className="bg-muted/50 rounded-lg p-4 border border-border/40">
            <p className="text-sm text-muted-foreground">
              <strong>Nota:</strong> A mudança de idioma afetará a interface do painel. 
              Alguns conteúdos gerados externamente podem permanecer no idioma original.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Botão Reset */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Restaurar Padrões</h4>
              <p className="text-sm text-muted-foreground">
                Voltar às configurações originais do painel
              </p>
            </div>
            <Button variant="outline" onClick={resetToDefaults} className="gap-2">
              <RotateCcw className="h-4 w-4" />
              Restaurar
            </Button>
          </div>
        </CardContent>
      </Card>
      </div>

      {/* Live Preview Sidebar */}
      <div className="lg:col-span-4 lg:sticky lg:top-6 h-fit space-y-4">
        <Card className="overflow-hidden border-primary/20 shadow-2xl">
          <CardHeader className="pb-3 border-b bg-muted/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layout className="w-4 h-4 text-primary" />
                <CardTitle className="text-sm">Preview ao Vivo</CardTitle>
              </div>
              <div className="flex bg-muted rounded-lg p-0.5">
                <Button 
                  variant={viewport === 'desktop' ? 'secondary' : 'ghost'} 
                  size="icon" 
                  className="h-7 w-7"
                  onClick={() => setViewport('desktop')}
                >
                  <Laptop className="h-4 w-4" />
                </Button>
                <Button 
                  variant={viewport === 'mobile' ? 'secondary' : 'ghost'} 
                  size="icon" 
                  className="h-7 w-7"
                  onClick={() => setViewport('mobile')}
                >
                  <Smartphone className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 bg-background/50">
            <div 
              className={cn(
                "transition-all duration-500 mx-auto overflow-hidden border-x border-b shadow-inner",
                viewport === 'desktop' ? "w-full aspect-video" : "w-[240px] aspect-[9/16] mt-4 mb-4 rounded-2xl border-4 border-muted"
              )}
              style={{ 
                backgroundColor: `hsl(${previewBg})`,
                fontFamily: currentPreviewFont.value,
                fontSize: `${previewSettings.fontSize * 0.8}%`
              }}
            >
              {/* Mock Interface */}
              <div className="h-full flex flex-col">
                {/* Header */}
                <div className="p-3 border-b border-white/10 flex items-center gap-2 bg-black/20">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden" style={{ backgroundColor: `hsl(${previewPrimary})` }}>
                    {currentPreviewTheme.logo ? (
                      <img src={currentPreviewTheme.logo} className="w-full h-full object-contain p-1 brightness-0 invert" />
                    ) : (
                      <Play className="w-4 h-4 text-white fill-white" />
                    )}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="h-2 w-16 bg-white/20 rounded-full" />
                    <div className="h-1.5 w-10 bg-white/10 rounded-full" />
                  </div>
                </div>
                
                {/* Content */}
                <div className="flex-1 p-3 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-20 rounded-full" style={{ backgroundColor: `hsl(${previewPrimary})` }} />
                    <div className="h-3 w-10 bg-white/10 rounded-full" />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className="aspect-video rounded-lg border border-white/5 p-2 space-y-2" style={{ backgroundColor: `hsl(${previewCard})` }}>
                        <div className="w-full h-2/3 bg-white/5 rounded-md" />
                        <div className="h-1.5 w-full bg-white/10 rounded-full" />
                        <div className="h-1.5 w-2/3 bg-white/10 rounded-full" />
                      </div>
                    ))}
                  </div>
                  
                  <div className="space-y-2 pt-2">
                    <div className="h-8 w-full rounded-lg flex items-center justify-center text-[10px] text-white font-bold" style={{ backgroundColor: `hsl(${previewPrimary})` }}>
                      ASSISTIR AGORA
                    </div>
                    <div className="h-8 w-full rounded-lg border border-white/10 flex items-center justify-center text-[10px] text-white/70 font-medium">
                      MAIS INFORMAÇÕES
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 flex gap-3">
          <div className="bg-primary/20 p-2 rounded-lg h-fit text-primary">
            <Layout className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-primary">Preview Ativo</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              As mudanças acima são aplicadas imediatamente ao seu painel enquanto você navega nesta página. 
              Elas são salvas automaticamente no seu perfil.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
