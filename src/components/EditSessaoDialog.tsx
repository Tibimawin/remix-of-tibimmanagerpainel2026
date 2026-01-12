
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

interface EditSessaoDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  item: any;
  onEditSuccess: () => void;
}

const ALLOWED_FIELDS = ['Nome', 'Tipo'];

export const EditSessaoDialog: React.FC<EditSessaoDialogProps> = ({ 
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
      ALLOWED_FIELDS.forEach(field => {
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
      const tableId = config.tableIds.sessoes;
      await baserowService.updateRow(tableId, item.id, formData);
      onEditSuccess();
      setOpen(false);
    } catch (error) {
      console.error("Erro ao atualizar sessão:", error);
    }
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Editar Sessão</DialogTitle>
          <DialogDescription>
            Altere as informações da sessão.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {ALLOWED_FIELDS.map((key) => (
            <div className="grid gap-2" key={key}>
              <Label htmlFor={key}>{key}</Label>
              <Input
                type="text"
                id={key}
                name={key}
                value={formData[key] || ''}
                onChange={handleInputChange}
                required={key === "Nome"}
              />
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button type="button" onClick={handleSave}>Salvar Alterações</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
