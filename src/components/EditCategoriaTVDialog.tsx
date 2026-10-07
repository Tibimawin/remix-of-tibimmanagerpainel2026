
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

interface EditCategoriaTVDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  item: any;
  onEditSuccess: () => void;
}

const CATEGORIA_TV_FIELDS = ['Categoria'];

export const EditCategoriaTVDialog: React.FC<EditCategoriaTVDialogProps> = ({ 
  open, 
  setOpen, 
  item, 
  onEditSuccess 
}) => {
  const [categoryName, setCategoryName] = useState('');
  const { config } = useConfig();
  const baserowService = useBaserowService();

  useEffect(() => {
    if (item) {
      const rawVal = item.Categoria || item.categoria || item.Nome || item.nome || item.Name || item.name || item.Titulo || item.Título || '';
      const stringVal = typeof rawVal === 'object' ? (rawVal?.value || rawVal?.name || '') : String(rawVal || '');
      setCategoryName(stringVal);
    }
  }, [item]);

  const handleSave = async () => {
    if (!categoryName.trim()) {
      toast.error('O nome da categoria é obrigatório');
      return;
    }

    try {
      const tableId = config.tableIds['categoriasTV'];
      if (!tableId) {
        toast.error('Tabela de Categorias TV não configurada');
        return;
      }

      const val = categoryName.trim();
      const keys = item ? Object.keys(item) : [];
      const targetKey = keys.find(k => k.toLowerCase() === 'categoria') || 
                        keys.find(k => k.toLowerCase() === 'nome') || 
                        keys.find(k => k.toLowerCase() === 'name') || 
                        'Categoria';

      try {
        await baserowService.updateRow(tableId, item.id, { [targetKey]: val });
      } catch {
        // Se a primeira chave não existir na tabela, tenta com a chave alternativa (Nome/Categoria)
        const altKey = targetKey.toLowerCase() === 'categoria' ? 'Nome' : 'Categoria';
        await baserowService.updateRow(tableId, item.id, { [altKey]: val });
      }

      toast.success('Categoria TV atualizada com sucesso!');
      onEditSuccess();
      setOpen(false);
    } catch (error) {
      console.error("Erro ao atualizar categoria TV:", error);
      toast.error('Erro ao atualizar categoria TV');
    }
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Editar Categoria TV</DialogTitle>
          <DialogDescription>
            Altere as informações da categoria de TV.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="category-input">Categoria *</Label>
            <Input
              id="category-input"
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              placeholder="Nome da categoria..."
              required
              autoFocus
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
