
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

interface EditPlataformaDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  item: any;
  onEditSuccess: () => void;
}

const PLATAFORMA_FIELDS = ['Categoria', 'Imagem'];

export const EditPlataformaDialog: React.FC<EditPlataformaDialogProps> = ({ 
  open, 
  setOpen, 
  item, 
  onEditSuccess 
}) => {
  const [formData, setFormData] = useState<any>({});
  const { config } = useConfig();
  const baserowService = useBaserowService();

  useEffect(() => {
    if (item) {
      const filteredData: Record<string, any> = {};
      PLATAFORMA_FIELDS.forEach(field => {
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
    try {
      const tableId = config.tableIds['plataformas'];
      await baserowService.updateRow(tableId, item.id, formData);
      toast.success('Plataforma atualizada com sucesso!');
      onEditSuccess();
      setOpen(false);
    } catch (error) {
      console.error("Erro ao atualizar plataforma:", error);
      toast.error('Erro ao atualizar plataforma');
    }
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Editar Plataforma</DialogTitle>
          <DialogDescription>
            Altere as informações da plataforma.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="Categoria">Categoria *</Label>
            <Input
              id="Categoria"
              name="Categoria"
              value={formData.Categoria || ''}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="Imagem">URL da Imagem</Label>
            <Input
              id="Imagem"
              name="Imagem"
              type="url"
              value={formData.Imagem || ''}
              onChange={handleInputChange}
              placeholder="https://exemplo.com/imagem.jpg"
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" onClick={handleSave}>
            Salvar Alterações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
