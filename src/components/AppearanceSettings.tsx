import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Palette, Type, RotateCcw, Check, Pipette, X } from 'lucide-react';
import { useCustomization, AVAILABLE_FONTS, AVAILABLE_THEMES } from '@/contexts/CustomizationContext';
import { cn } from '@/lib/utils';

// Cores sugeridas para escolha rápida
const QUICK_COLORS = [
  '#FF6B35', '#F7931E', '#FFD93D', '#6BCB77', '#4D96FF',
  '#6C5CE7', '#A855F7', '#EC4899', '#EF4444', '#14B8A6',
  '#8B5CF6', '#F59E0B', '#10B981', '#3B82F6', '#E11D48',
];

export const AppearanceSettings: React.FC = () => {
  const { settings, setFont, setTheme, setCustomColor, setFontSize, resetToDefaults, currentFont, activeColor } = useCustomization();
  const [customColorInput, setCustomColorInput] = useState(settings.customColor || '#FF6B35');

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

  return (
    <div className="space-y-6">
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
            <Select value={settings.fontId} onValueChange={setFont}>
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
              <Badge variant="secondary">{settings.fontSize}%</Badge>
            </div>
            <Slider
              value={[settings.fontSize]}
              onValueChange={([value]) => setFontSize(value)}
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
            <div className="grid grid-cols-5 gap-3">
              {AVAILABLE_THEMES.map((theme) => {
                const isSelected = settings.themeId === theme.id && !settings.customColor;
                return (
                  <button
                    key={theme.id}
                    onClick={() => setTheme(theme.id)}
                    className={cn(
                      "relative flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all duration-200 hover:scale-105",
                      isSelected 
                        ? "border-primary bg-primary/10" 
                        : "border-border/40 hover:border-border"
                    )}
                  >
                    <div 
                      className="w-10 h-10 rounded-full shadow-md flex items-center justify-center"
                      style={{ backgroundColor: `hsl(${theme.primary})` }}
                    >
                      {isSelected && <Check className="h-5 w-5 text-white" />}
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
  );
};
