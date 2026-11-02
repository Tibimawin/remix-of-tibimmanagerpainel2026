import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Sparkles } from 'lucide-react';
import { useAppName } from '@/contexts/AppNameContext';

/**
 * Diálogo que pergunta o nome do app do cliente no primeiro acesso.
 * Aparece automaticamente (controlado por AppNameContext.needsAsk)
 * e também pode ser aberto pelas Configurações.
 */
export const AppNamingDialog: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const { saveAppName, skipAsking } = useAppName();
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setValue('');
      setError(null);
    }
  }, [open]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    const result = await saveAppName(value);
    setSaving(false);
    if (result.success) {
      onClose();
    } else {
      setError(result.message || 'Não foi possível salvar.');
    }
  };

  const handleSkip = () => {
    skipAsking();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) handleSkip(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center text-lg">
            Dê um nome ao seu painel
          </DialogTitle>
          <DialogDescription className="text-center">
            Qual é o nome do seu app? Ele vai aparecer no topo do seu painel, no menu lateral e na aba do navegador.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 pt-1">
          <Input
            autoFocus
            placeholder="Ex: MinhaTV Plus, FlixBrasil…"
            value={value}
            maxLength={40}
            onChange={(e) => { setValue(e.target.value); setError(null); }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && value.trim().length >= 2 && !saving) {
                handleSave();
              }
            }}
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex items-center justify-between gap-2 pt-1">
            <Button variant="ghost" size="sm" onClick={handleSkip} disabled={saving}>
              Definir depois
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving || value.trim().length < 2}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando…
                </>
              ) : (
                'Salvar nome'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
