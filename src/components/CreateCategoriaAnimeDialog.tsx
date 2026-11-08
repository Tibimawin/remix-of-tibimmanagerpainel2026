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
import { Loader2, ImageOff, Image } from 'lucide-react';

interface CreateCategoriaAnimeDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  onCreateSuccess: () => void;
}

export const CreateCategoriaAnimeDialog: React.FC<CreateCategoriaAnimeDialogProps> = ({ 
  open, 
  setOpen, 
  onCreateSuccess 
}) => {
  const [formData, setFormData] = useState({
    Nome: '',
    id2: '',
    Capa: '',
    Tipo: ''
  });
  const [saving, setSaving] = useState(false);
  const [imageError, setImageError] = useState(false);
  const { config } = useConfig();
  const baserowService = useBaserowService();

  useEffect(() => {
    if (open) {
      setFormData({
        Nome: '',
        id2: '',
        Capa: '',
        Tipo: ''
      });
      setImageError(false);
    }
  }, [open]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (name === 'Capa') {
      setImageError(false);
    }
  };

  const handleSave = async () => {
    if (!formData.Nome.trim()) {
      toast.error('O nome da categoria é obrigatório');
      return;
    }

    try {
      setSaving(true);
      const tableId = config.tableIds['categoriasAnime'];
      
      if (!tableId) {
        toast.error('Tabela de Categorias Anime não configurada');
        return;
      }

      const dataToSave: Record<string, string> = {};
      Object.entries(formData).forEach(([key, value]) => {
        if (value.trim()) {
          dataToSave[key] = value.trim();
        }
      });

      await baserowService.createRow(tableId, dataToSave);
      toast.success('Categoria Anime criada com sucesso!');
      onCreateSuccess();
      setOpen(false);
    } catch (error) {
      console.error("Erro ao criar categoria Anime:", error);
      toast.error('Erro ao criar categoria Anime');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Nova Categoria Anime</DialogTitle>
          <DialogDescription>
            Adicione uma nova categoria para animes.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="Nome">Nome *</Label>
            <Input
              id="Nome"
              name="Nome"
              value={formData.Nome}
              onChange={handleInputChange}
              placeholder="Nome da categoria"
              required
              autoFocus
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="id2">ID2</Label>
            <Input
              id="id2"
              name="id2"
              value={formData.id2}
              onChange={handleInputChange}
              placeholder="Identificador secundário"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="Capa" className="flex items-center gap-2">
              <Image className="w-4 h-4" />
              Capa
            </Label>
            <Input
              id="Capa"
              name="Capa"
              value={formData.Capa}
              onChange={handleInputChange}
              placeholder="URL da imagem de capa"
            />
            {/* Preview da imagem */}
            {formData.Capa && (
              <div className="mt-2">
                {!imageError ? (
                  <div className="relative inline-block">
                    <img
                      src={formData.Capa}
                      alt="Preview da capa"
                      className="w-32 h-32 object-cover rounded-lg border border-border shadow-sm"
                      onError={() => setImageError(true)}
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-destructive">
                    <ImageOff className="w-4 h-4" />
                    <span>Não foi possível carregar a imagem</span>
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="Tipo">Tipo</Label>
            <Input
              id="Tipo"
              name="Tipo"
              value={formData.Tipo}
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
              'Criar Categoria'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
