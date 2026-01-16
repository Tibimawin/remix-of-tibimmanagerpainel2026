import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Palette, Type, RotateCcw, Check } from 'lucide-react';
import { useCustomization, AVAILABLE_FONTS, AVAILABLE_THEMES } from '@/contexts/CustomizationContext';
import { cn } from '@/lib/utils';

export const AppearanceSettings: React.FC = () => {
  const { settings, setFont, setTheme, setFontSize, resetToDefaults, currentFont, currentTheme } = useCustomization();

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
            Escolha a cor principal do painel
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Grid de Cores */}
          <div className="grid grid-cols-5 gap-3">
            {AVAILABLE_THEMES.map((theme) => {
              const isSelected = settings.themeId === theme.id;
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

          {/* Preview de Cor */}
          <div className="bg-muted/50 rounded-lg p-4 border border-border/40">
            <p className="text-sm text-muted-foreground mb-3">Pré-visualização:</p>
            <div className="flex items-center gap-3">
              <Button 
                size="sm"
                style={{ backgroundColor: `hsl(${currentTheme.primary})` }}
                className="text-white hover:opacity-90"
              >
                Botão Primário
              </Button>
              <Button variant="outline" size="sm">
                Botão Secundário
              </Button>
              <Badge style={{ backgroundColor: `hsl(${currentTheme.primary})` }} className="text-white">
                Badge
              </Badge>
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
