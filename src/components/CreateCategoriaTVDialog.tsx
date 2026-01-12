
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useBaserowService } from '@/services/BaserowService';
import { useConfig } from '@/contexts/ConfigContext';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface CreateCategoriaTVDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  onCreateSuccess: () => void;
}

export const CreateCategoriaTVDialog: React.FC<CreateCategoriaTVDialogProps> = ({ 
  open, 
  setOpen, 
  onCreateSuccess 
}) => {
  const [categoria, setCategoria] = useState('');
  const [saving, setSaving] = useState(false);
  const { config } = useConfig();
  const baserowService = useBaserowService();

  useEffect(() => {
    if (open) {
      setCategoria('');
    }
  }, [open]);

  const handleSave = async () => {
    if (!categoria.trim()) {
      toast.error('O nome da categoria é obrigatório');
      return;
    }

    try {
      setSaving(true);
      const tableId = config.tableIds['categoriasTV'];
      
      if (!tableId) {
        toast.error('Tabela de Categorias TV não configurada');
        return;
      }

      await baserowService.createRow(tableId, { Categoria: categoria.trim() });
      toast.success('Categoria TV criada com sucesso!');
      onCreateSuccess();
      setOpen(false);
    } catch (error) {
      console.error("Erro ao criar categoria TV:", error);
      toast.error('Erro ao criar categoria TV');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Nova Categoria TV</DialogTitle>
          <DialogDescription>
            Adicione uma nova categoria para canais de TV.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="Categoria">Nome da Categoria *</Label>
            <Input
              id="Categoria"
              name="Categoria"
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              placeholder="Ex: Esportes, Notícias, Filmes..."
              required
              autoFocus
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              'Criar Categoria'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
