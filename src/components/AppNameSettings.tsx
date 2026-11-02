import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Save, PanelTop, RotateCcw } from 'lucide-react';
import { useAppName } from '@/contexts/AppNameContext';

/** Cartão de personalização do nome do app — usado em Configurações. */
export const AppNameSettings: React.FC = () => {
  const { appName, appDisplayName, saveAppName } = useAppName();
  const [value, setValue] = useState(appName || '');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'warn' | 'error'; text: string } | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setFeedback(null);
    const result = await saveAppName(value);
    setSaving(false);
    if (result.success) {
      setFeedback(
        result.message
          ? { type: 'warn', text: result.message }
          : { type: 'ok', text: 'Nome do app atualizado!' }
      );
    } else {
      setFeedback({ type: 'error', text: result.message || 'Não foi possível salvar.' });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PanelTop className="h-5 w-5" />
          Nome do seu App
        </CardTitle>
        <CardDescription>
          Personalize o nome do seu painel. Ele aparece no topo do menu lateral e na aba do navegador.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <Input
            value={value}
            maxLength={40}
            placeholder="Ex: MinhaTV Plus, FlixBrasil…"
            onChange={(e) => { setValue(e.target.value); setFeedback(null); }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && value.trim().length >= 2 && !saving) handleSave();
            }}
          />
          <Button size="sm" onClick={handleSave} disabled={saving || value.trim().length < 2}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            <span className="ml-1">Salvar</span>
          </Button>
          <Button
            size="sm"
            variant="ghost"
            title="Limpar o nome do app"
            onClick={() => { setValue(''); setFeedback(null); }}
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Mostrando agora: <span className="font-medium text-foreground">{appDisplayName}</span>
        </p>
        {feedback && (
          <p
            className={
              feedback.type === 'ok'
                ? 'text-xs text-green-600'
                : feedback.type === 'warn'
                  ? 'text-xs text-amber-600'
                  : 'text-xs text-destructive'
            }
          >
            {feedback.text}
          </p>
        )}
      </CardContent>
    </Card>
  );
};
