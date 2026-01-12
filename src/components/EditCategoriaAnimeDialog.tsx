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

interface EditCategoriaAnimeDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  item: any;
  onEditSuccess: () => void;
}

const CATEGORIA_ANIME_FIELDS = ['Nome', 'id2', 'Capa', 'Tipo'];

export const EditCategoriaAnimeDialog: React.FC<EditCategoriaAnimeDialogProps> = ({ 
  open, 
  setOpen, 
  item, 
  onEditSuccess 
}) => {
  const [formData, setFormData] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const { config } = useConfig();
  const baserowService = useBaserowService();

  useEffect(() => {
    if (item) {
      const filteredData: Record<string, any> = {};
      CATEGORIA_ANIME_FIELDS.forEach(field => {
        filteredData[field] = item[field] ?? "";
      });
      setFormData(filteredData);
    }
  }, [item]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = async () => {
    if (!formData.Nome?.trim()) {
      toast.error('O nome da categoria é obrigatório');
      return;
    }

    try {
      setSaving(true);
      const tableId = config.tableIds['categoriasAnime'];
      await baserowService.updateRow(tableId, item.id, formData);
      toast.success('Categoria Anime atualizada com sucesso!');
      onEditSuccess();
      setOpen(false);
    } catch (error) {
      console.error("Erro ao atualizar categoria Anime:", error);
      toast.error('Erro ao atualizar categoria Anime');
    } finally {
      setSaving(false);
    }
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Editar Categoria Anime</DialogTitle>
          <DialogDescription>
            Altere as informações da categoria de anime.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="Nome">Nome *</Label>
            <Input
              id="Nome"
              name="Nome"
              value={formData.Nome || ''}
              onChange={handleInputChange}
              placeholder="Nome da categoria"
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="id2">ID2</Label>
            <Input
              id="id2"
              name="id2"
              value={formData.id2 || ''}
              onChange={handleInputChange}
              placeholder="Identificador secundário"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="Capa">Capa</Label>
            <Input
              id="Capa"
              name="Capa"
              value={formData.Capa || ''}
              onChange={handleInputChange}
              placeholder="URL da imagem de capa"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="Tipo">Tipo</Label>
            <Input
              id="Tipo"
              name="Tipo"
              value={formData.Tipo || ''}
              onChange={handleInputChange}
              placeholder="Ex: Ação, Romance, Aventura..."
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
              'Salvar Alterações'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
