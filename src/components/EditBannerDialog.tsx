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
import { Switch } from "@/components/ui/switch";
import { useBaserowService } from '@/services/BaserowService';
import { useConfig } from '@/contexts/ConfigContext';

interface EditBannerDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  item: any;
  onEditSuccess: () => void;
}

const ALLOWED_FIELDS = ['Nome', 'ID', 'Categoria', 'Link', 'Externo?', 'Ordem'];

export const EditBannerDialog: React.FC<EditBannerDialogProps> = ({ 
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
        if (field === 'Externo?') {
          filteredData[field] = Boolean(item[field]);
        } else if (field === 'ID' || field === 'Ordem') {
          filteredData[field] = Number(item[field]) || 0;
        } else {
          filteredData[field] = item[field] ?? "";
        }
      });
      setFormData(filteredData);
    }
  }, [item]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === "number" ? Number(value) : value
    }));
  };

  const handleSwitchChange = (checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      'Externo?': checked
    }));
  };

  const handleSave = async () => {
    try {
      const tableId = config.tableIds.banners;
      await baserowService.updateRow(tableId, item.id, formData);
      onEditSuccess();
      setOpen(false);
    } catch (error) {
      console.error("Erro ao atualizar banner:", error);
    }
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Editar Banner</DialogTitle>
          <DialogDescription>
            Altere as informações do banner.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {ALLOWED_FIELDS.map((key) => {
            if (key === 'Externo?') {
              return (
                <div className="flex items-center space-x-2" key={key}>
                  <Switch
                    id={key}
                    checked={formData[key] || false}
                    onCheckedChange={handleSwitchChange}
                  />
                  <Label htmlFor={key}>{key}</Label>
                </div>
              );
            }
            
            return (
              <div className="grid gap-2" key={key}>
                <Label htmlFor={key}>{key}</Label>
                <Input
                  type={key === "ID" || key === "Ordem" ? "number" : "text"}
                  id={key}
                  name={key}
                  value={formData[key] || ''}
                  onChange={handleInputChange}
                  required={key === "Nome"}
                  min={key === "ID" || key === "Ordem" ? 0 : undefined}
                />
              </div>
            );
          })}
        </div>
        <DialogFooter>
          <Button type="button" onClick={handleSave}>Salvar Alterações</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};