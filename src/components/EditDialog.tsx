
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
import { useAutoNotifyCRUD } from '@/hooks/useActionNotifier';

interface EditDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  item: any;
  tableKey: string;
  onEditSuccess: () => void;
}

// Lista de campos permitidos para edição em Usuários
const ALLOWED_FIELDS = ['Email', 'Nome', 'Logins', 'Senha', 'Dias', 'Pagamento'];

export const EditDialog: React.FC<EditDialogProps> = ({ open, setOpen, item, tableKey, onEditSuccess }) => {
  const [formData, setFormData] = useState<any>({});
  const { config } = useConfig();
  const baserowService = useBaserowService();
  const { notifyUpdate } = useAutoNotifyCRUD(tableKey);

  useEffect(() => {
    if (item) {
      // Só preenche os campos que estão em ALLOWED_FIELDS, os demais são descartados.
      const filteredData: Record<string, any> = {};
      ALLOWED_FIELDS.forEach(field => {
        filteredData[field] = item[field] ?? "";
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

  const handleSave = async () => {
    try {
      const tableId = config.tableIds[tableKey];
      await baserowService.updateRow(tableId, item.id, formData);
      
      // Notificar atualização
      notifyUpdate(formData.Nome || formData.Email || 'Registro');
      
      onEditSuccess();
      setOpen(false);
    } catch (error) {
      console.error("Erro ao atualizar registro:", error);
    }
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Editar Usuário</DialogTitle>
          <DialogDescription>
            Altere as informações do usuário.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {ALLOWED_FIELDS.map((key) => (
            <div className="grid gap-2" key={key}>
              <Label htmlFor={key}>{key}</Label>
              <Input
                type={key === "Dias" || key === "Logins" ? "number" : key === "Senha" ? "password" : key === "Pagamento" ? "date" : "text"}
                id={key}
                name={key}
                value={formData[key] || ''}
                onChange={handleInputChange}
                min={key === "Dias" || key === "Logins" ? 0 : undefined}
                minLength={key === "Senha" ? 6 : undefined}
                required={
                  key === "Email" ||
                  key === "Nome" ||
                  key === "Senha" ||
                  key === "Dias"
                }
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
