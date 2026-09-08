
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Eye, EyeOff } from "lucide-react";
import { useBaserowService } from '@/services/BaserowService';
import { useConfig } from '@/contexts/ConfigContext';
import { useTypeMode } from '@/contexts/TypeModeContext';
import { useAutoNotifyCRUD } from '@/hooks/useActionNotifier';
import { getValueByPossibleKeys, mapToDatabaseKeys, findMatchingKey } from '@/utils/baserowHelpers';

interface EditDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  item: any;
  tableKey: string;
  onEditSuccess: () => void;
}

// Lista canônica de campos conhecidos em Usuários
const KNOWN_USER_FIELDS = [
  'Nome',
  'Email',
  'Senha',
  'Status',
  'Vencimento',
  'DataCriacao',
  'ID',
  'Limite',
  'Moedas',
  'AppId',
  'Dias',
  'Pagamento',
  'Logins',
  'Favoritos',
  'Historico'
];

const formatDateForInput = (value: any) => {
  if (!value) return "";
  const str = String(value).trim();
  if (str.includes("T")) {
    return str.split("T")[0];
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    return str.substring(0, 10);
  }
  // Suporte a formato DD/MM/YYYY
  if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(str)) {
    const parts = str.split(' ')[0].split('/');
    const d = parts[0].padStart(2, '0');
    const m = parts[1].padStart(2, '0');
    const y = parts[2];
    return `${y}-${m}-${d}`;
  }
  return str;
};

export const EditDialog: React.FC<EditDialogProps> = ({ open, setOpen, item, tableKey, onEditSuccess }) => {
  const [formData, setFormData] = useState<any>({});
  const [showPassword, setShowPassword] = useState(false);
  const { config } = useConfig();
  const { mode } = useTypeMode();
  const baserowService = useBaserowService();
  const { notifyUpdate } = useAutoNotifyCRUD(tableKey);

  useEffect(() => {
    if (item) {
      if (tableKey === 'usuarios') {
        const itemKeys = Object.keys(item).filter(
          k => k !== 'id' && k !== 'order' && typeof item[k] !== 'object' && !Array.isArray(item[k])
        );

        // Identificar quais campos do Baserow existem no item
        // Combinamos as chaves reais presentes no item com os campos conhecidos existentes
        const fieldsToInclude = new Set<string>();

        // 1. Chaves reais presentes no item
        itemKeys.forEach(k => fieldsToInclude.add(k));

        // 2. Garantir que campos primordiais de usuário apareçam se tiverem correspondente
        KNOWN_USER_FIELDS.forEach(canonical => {
          const matched = findMatchingKey(itemKeys, canonical);
          if (matched) {
            fieldsToInclude.add(matched);
          } else if (itemKeys.length === 0 || ['Nome', 'Email', 'Senha', 'Status', 'Vencimento'].includes(canonical)) {
            // Se o item não tem chaves ou para campos padrão básicos
            fieldsToInclude.add(canonical);
          }
        });

        const filteredData: Record<string, any> = {};
        fieldsToInclude.forEach(field => {
          let val = getValueByPossibleKeys(item, field) ?? item[field] ?? "";
          const fLower = field.toLowerCase().replace(/[\s_-]/g, '');
          if (fLower === 'vencimento' || fLower === 'datacriacao' || fLower === 'pagamento') {
            val = formatDateForInput(val);
          }
          filteredData[field] = val;
        });

        setFormData(filteredData);
      } else {
        const filteredData: Record<string, any> = {};
        Object.keys(item).forEach(key => {
          if (key !== 'id' && key !== 'order' && typeof item[key] !== 'object' && !Array.isArray(item[key])) {
            let val = item[key] ?? "";
            const kLower = key.toLowerCase();
            if (kLower.includes('data') || kLower.includes('vencimento') || kLower.includes('pagamento')) {
              val = formatDateForInput(val);
            }
            filteredData[key] = val;
          }
        });
        setFormData(filteredData);
      }
    }
  }, [item, tableKey, mode]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev: any) => ({
      ...prev,
      [name]: type === "number" ? Number(value) : value
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev: any) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = async () => {
    try {
      const tableId = config.tableIds[tableKey as keyof typeof config.tableIds];
      if (!tableId) {
        console.error("ID da tabela não encontrado para:", tableKey);
        return;
      }

      const existingKeys = Object.keys(item);
      const mappedData = mapToDatabaseKeys(formData, existingKeys);
      
      // Converter campos de data para o formato datetime do Baserow se necessário
      Object.keys(mappedData).forEach(key => {
        const val = mappedData[key];
        const keyLower = key.toLowerCase().replace(/[\s_-]/g, '');
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

  const isStatusField = (key: string) => {
    const k = key.toLowerCase().replace(/[\s_-]/g, '');
    return k === 'status' || k === 'situacao';
  };

  const isDateField = (key: string) => {
    const k = key.toLowerCase().replace(/[\s_-]/g, '');
    return k === 'vencimento' || k === 'datacriacao' || k === 'pagamento' || k === 'data';
  };

  const isNumberField = (key: string) => {
    const k = key.toLowerCase().replace(/[\s_-]/g, '');
    return ['dias', 'totaldedias', 'logins', 'valor', 'telas', 'tela', 'limite', 'moedas', 'mes', 'total', 'pinperfil'].includes(k);
  };

  const isPasswordField = (key: string) => {
    const k = key.toLowerCase().replace(/[\s_-]/g, '');
    return k === 'senha' || k === 'password';
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Editar {tableKey === 'usuarios' ? 'Usuário' : 'Registro'}</DialogTitle>
          <DialogDescription>
            Altere as informações do {tableKey === 'usuarios' ? 'usuário' : 'registro'}. Os campos correspondem à sua tabela do Baserow.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4 max-h-[65vh] overflow-y-auto px-1">
          {fieldsToRender.map((key) => {
            const isBoolean = typeof formData[key] === 'boolean' || key === 'Adulto' || key === 'IsKids' || key === 'CompartilhamentoAtivo';
            const isTextarea = key === 'Favoritos' || key === 'Historico' || key === 'Sinopse';
            
            return (
              <div className="grid gap-2" key={key}>
                {isBoolean ? (
                  <div className="flex items-center space-x-2 pt-2 pb-1">
                    <Switch
                      id={key}
                      checked={!!formData[key]}
                      onCheckedChange={(checked) => {
                        setFormData((prev: any) => ({
                          ...prev,
                          [key]: checked
                        }));
                      }}
                    />
                    <Label htmlFor={key} className="cursor-pointer font-medium">{key}</Label>
                  </div>
                ) : isStatusField(key) ? (
                  <>
                    <Label htmlFor={key} className="font-medium">{key}</Label>
                    <Select
                      value={String(formData[key] || 'Ativo')}
                      onValueChange={(val) => handleSelectChange(key, val)}
                    >
                      <SelectTrigger id={key} className="w-full">
                        <SelectValue placeholder="Selecione o status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Ativo">🟢 Ativo</SelectItem>
                        <SelectItem value="Expirado">🔴 Expirado</SelectItem>
                        <SelectItem value="Bloqueado">⛔ Bloqueado</SelectItem>
                        <SelectItem value="VIP">⭐ VIP / Assinante</SelectItem>
                        <SelectItem value="Grátis">🟣 Grátis</SelectItem>
                      </SelectContent>
                    </Select>
                  </>
                ) : isDateField(key) ? (
                  <>
                    <Label htmlFor={key} className="font-medium">{key}</Label>
                    <Input
                      type="date"
                      id={key}
                      name={key}
                      value={formData[key] || ''}
                      onChange={handleInputChange}
                      className="w-full"
                    />
                  </>
                ) : isPasswordField(key) ? (
                  <>
                    <Label htmlFor={key} className="font-medium">{key}</Label>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        id={key}
                        name={key}
                        value={formData[key] || ''}
                        onChange={handleInputChange}
                        placeholder="Senha do usuário"
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(prev => !prev)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
                        title={showPassword ? "Ocultar senha" : "Ver senha"}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </>
                ) : isTextarea ? (
                  <>
                    <Label htmlFor={key} className="font-medium">{key}</Label>
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
                    <Label htmlFor={key} className="font-medium">{key}</Label>
                    <Input
                      type={isNumberField(key) ? "number" : "text"}
                      id={key}
                      name={key}
                      value={formData[key] !== undefined && formData[key] !== null ? formData[key] : ''}
                      onChange={handleInputChange}
                      min={isNumberField(key) ? 0 : undefined}
                      placeholder={`Digite ${key.toLowerCase()}...`}
                      required={
                        key.toLowerCase() === "email" ||
                        key.toLowerCase() === "nome" ||
                        key.toLowerCase() === "usuario"
                      }
                    />
                  </>
                )}
              </div>
            );
          })}
        </div>
        <DialogFooter>
          <Button variant="outline" type="button" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleSave}>
            Salvar Alterações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
