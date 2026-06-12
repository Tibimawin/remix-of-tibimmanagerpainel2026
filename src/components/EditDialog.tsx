
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
import { Textarea } from "@/components/ui/textarea";
import { useBaserowService } from '@/services/BaserowService';
import { useConfig } from '@/contexts/ConfigContext';
import { useTypeMode } from '@/contexts/TypeModeContext';
import { useAutoNotifyCRUD } from '@/hooks/useActionNotifier';
import { getValueByPossibleKeys, mapToDatabaseKeys } from '@/utils/baserowHelpers';

interface EditDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  item: any;
  tableKey: string;
  onEditSuccess: () => void;
}

// Lista de campos permitidos para edição em Usuários
const ALLOWED_FIELDS = ['Email', 'Nome', 'Logins', 'Senha', 'Dias', 'Pagamento'];

const formatDateForInput = (value: any) => {
  if (!value) return "";
  const str = String(value);
  if (str.includes("T")) {
    return str.split("T")[0];
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    return str.substring(0, 10);
  }
  return str;
};

export const EditDialog: React.FC<EditDialogProps> = ({ open, setOpen, item, tableKey, onEditSuccess }) => {
  const [formData, setFormData] = useState<any>({});
  const { config } = useConfig();
  const { mode } = useTypeMode();
  const baserowService = useBaserowService();
  const { notifyUpdate } = useAutoNotifyCRUD(tableKey);

  useEffect(() => {
    if (item) {
      if (tableKey === 'usuarios') {
        const filteredData: Record<string, any> = {};
        const fields = mode === 'tibim'
          ? ['Nome', 'Email', 'Senha', 'Status', 'DataCriacao', 'Vencimento', 'ID', 'Limite', 'Moedas', 'Favoritos', 'Historico']
          : ALLOWED_FIELDS;
        fields.forEach(field => {
          let val = getValueByPossibleKeys(item, field) ?? "";
          if (field === 'Pagamento') {
            val = formatDateForInput(val);
          }
          filteredData[field] = val;
        });
        setFormData(filteredData);
      } else {
        const filteredData: Record<string, any> = {};
        Object.keys(item).forEach(key => {
          // Ignorar campos internos do Baserow como id, order e objetos/arrays complexos
          if (key !== 'id' && key !== 'order' && typeof item[key] !== 'object' && !Array.isArray(item[key])) {
            filteredData[key] = item[key] ?? "";
          }
        });
        setFormData(filteredData);
      }
    }
  }, [item, tableKey, mode]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === "number" ? Number(value) : value
    }));
  };

  const handleSave = async () => {
    try {
      const tableId = config.tableIds[tableKey];
      const mappedData = mapToDatabaseKeys(formData, Object.keys(item));
      
      // Converter campos de data para o formato datetime do Baserow se necessário
      Object.keys(mappedData).forEach(key => {
        const val = mappedData[key];
        const keyLower = key.toLowerCase();
        if ((keyLower === 'datacriacao' || keyLower === 'vencimento' || keyLower === 'pagamento') && val && /^\d{4}-\d{2}-\d{2}$/.test(String(val))) {
          mappedData[key] = `${val}T00:00:00Z`;
        }
      });
      
      await baserowService.updateRow(tableId, item.id, mappedData);
      
      // Notificar atualização
      notifyUpdate(formData.Nome || formData.Email || formData.ID || formData.Versao || 'Registro');
      
      onEditSuccess();
      setOpen(false);
    } catch (error) {
      console.error("Erro ao atualizar registro:", error);
    }
  };

  if (!item) return null;

  const fieldsToRender = Object.keys(formData);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Editar {tableKey === 'usuarios' ? 'Usuário' : 'Registro'}</DialogTitle>
          <DialogDescription>
            Altere as informações do {tableKey === 'usuarios' ? 'usuário' : 'registro'}.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto px-1">
          {fieldsToRender.map((key) => {
            const isBoolean = typeof formData[key] === 'boolean' || key === 'Adulto' || key === 'IsKids';
            const isTextarea = key === 'Favoritos' || key === 'Historico' || key === 'Sinopse';
            
            return (
              <div className="grid gap-2" key={key}>
                {isBoolean ? (
                  <div className="flex items-center space-x-2 pt-2 pb-1">
                    <Switch
                      id={key}
                      checked={!!formData[key]}
                      onCheckedChange={(checked) => {
                        setFormData(prev => ({
                          ...prev,
                          [key]: checked
                        }));
                      }}
                    />
                    <Label htmlFor={key} className="cursor-pointer">{key}</Label>
                  </div>
                ) : isTextarea ? (
                  <>
                    <Label htmlFor={key}>{key}</Label>
                    <Textarea
                      id={key}
                      name={key}
                      value={formData[key] || ''}
                      onChange={handleInputChange}
                      placeholder={`Digite ${key.toLowerCase()}...`}
                      rows={3}
                    />
                  </>
                ) : (
                  <>
                    <Label htmlFor={key}>{key}</Label>
                    <Input
                      type={
                        key === "Dias" || key === "Logins" || key === "Valor" || key === "Telas" || key === "Tela" || key === "Mes" || key === "Total" || key === "Moedas" || key === "PinPerfil"
                          ? "number"
                          : key === "Senha"
                            ? "password"
                            : key === "Pagamento"
                              ? "date"
                              : "text"
                      }
                      id={key}
                      name={key}
                      value={formData[key] || ''}
                      onChange={handleInputChange}
                      min={key === "Dias" || key === "Logins" || key === "Valor" || key === "Telas" || key === "Tela" || key === "Mes" || key === "Total" || key === "Moedas" || key === "PinPerfil" ? 0 : undefined}
                      minLength={key === "Senha" ? 6 : undefined}
                      required={
                        key === "Email" ||
                        key === "Nome" ||
                        key === "Senha" ||
                        key === "Dias" ||
                        key === "Versao" ||
                        key === "Usuario"
                      }
                    />
                  </>
                )}
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
