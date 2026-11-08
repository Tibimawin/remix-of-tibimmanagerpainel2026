
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

interface EditCategoriaDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  item: any;
  onEditSuccess: () => void;
}

const CATEGORIA_FIELDS = ['Nome'];

export const EditCategoriaDialog: React.FC<EditCategoriaDialogProps> = ({ 
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
      CATEGORIA_FIELDS.forEach(field => {
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
      const tableId = config.tableIds['categorias'];
      await baserowService.updateRow(tableId, item.id, formData);
      toast.success('Categoria atualizada com sucesso!');
      onEditSuccess();
      setOpen(false);
    } catch (error) {
      console.error("Erro ao atualizar categoria:", error);
      toast.error('Erro ao atualizar categoria');
    }
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Editar Categoria</DialogTitle>
          <DialogDescription>
            Altere as informações da categoria.
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
              required
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
