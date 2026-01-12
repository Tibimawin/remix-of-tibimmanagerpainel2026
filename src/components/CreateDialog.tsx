
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useBaserowService } from '@/services/BaserowService';
import { useConfig } from '@/contexts/ConfigContext';
import { toast } from '@/hooks/use-toast';
import { useUserActionHistory } from '@/hooks/useUserActionHistory';
import { useAutoNotifyCRUD } from '@/hooks/useActionNotifier';

interface CreateDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  tableKey: string;
  columns: string[];
  onCreateSuccess: () => void;
  title?: string;
}

interface FieldConfig {
  label: string;
  name: string;
  type: string;
  required: boolean;
  minLength?: number;
  min?: number;
}

const userFieldConfig: FieldConfig[] = [
  { label: 'Nome', name: 'Nome', type: 'text', required: true },
  { label: 'Email', name: 'Email', type: 'email', required: true },
  { label: 'Senha', name: 'Senha', type: 'password', required: true, minLength: 6 },
  { label: 'Dias', name: 'Dias', type: 'number', required: true, min: 1 },
  { label: 'Logins', name: 'Logins', type: 'number', required: false, min: 0 },
  { label: 'Pagamento', name: 'Pagamento', type: 'date', required: false },
];

const conteudosFieldConfig: FieldConfig[] = [
  { label: 'Nome', name: 'Nome', type: 'text', required: true },
  { label: 'Capa', name: 'Capa', type: 'url', required: false },
  { label: 'Categoria', name: 'Categoria', type: 'text', required: false },
  { label: 'Sinopse', name: 'Sinopse', type: 'textarea', required: false },
  { label: 'Link', name: 'Link', type: 'url', required: false },
  { label: 'Tipo', name: 'Tipo', type: 'text', required: false },
  { label: 'Idioma', name: 'Idioma', type: 'text', required: false },
  { label: 'Views', name: 'Views', type: 'number', required: false, min: 0 },
  { label: 'Temporadas', name: 'Temporadas', type: 'number', required: false, min: 0 },
];

const episodiosFieldConfig: FieldConfig[] = [
  { label: 'Nome', name: 'Nome', type: 'text', required: true },
  { label: 'Temporada', name: 'Temporada', type: 'number', required: true, min: 1 },
  { label: 'Episódio', name: 'Episódio', type: 'number', required: true, min: 1 },
  { label: 'Link', name: 'Link', type: 'url', required: false },
];

const bannersFieldConfig: FieldConfig[] = [
  { label: 'Nome', name: 'Nome', type: 'text', required: true },
  { label: 'Imagem', name: 'Imagem', type: 'url', required: false },
  { label: 'ID', name: 'ID', type: 'number', required: false },
  { label: 'Categoria', name: 'Categoria', type: 'text', required: false },
  { label: 'Link', name: 'Link', type: 'url', required: false },
  { label: 'Externo?', name: 'Externo?', type: 'boolean', required: false },
];


export const CreateDialog = ({
  open, setOpen, tableKey, columns, onCreateSuccess, title
}: CreateDialogProps) => {
  const { config } = useConfig();
  const baserowService = useBaserowService();
  const { addAction } = useUserActionHistory();
  const { notifyCreate } = useAutoNotifyCRUD(tableKey);

  const getFieldConfig = (): FieldConfig[] => {
    console.log('CreateDialog - tableKey recebido:', tableKey);
    
    switch (tableKey) {
      case 'usuarios':
        console.log('Usando configuração de usuários');
        return userFieldConfig;
      case 'conteudos':
        console.log('Usando configuração de conteúdos');
        return conteudosFieldConfig;
      case 'episodios':
        console.log('Usando configuração de episódios');
        return episodiosFieldConfig;
      case 'banners':
        console.log('Usando configuração de banners');
        return bannersFieldConfig;
      default:
        console.log('Usando configuração padrão para tableKey:', tableKey);
        return columns.filter((col) => col !== "ID").map((col) => ({
          label: col,
          name: col,
          type: 'text',
          required: false
        }));
    }
  };

  const handleSubmit = async (data: any) => {
    if (!config || !config.tableIds || !config.tableIds[tableKey]) {
      alert(`Table ID para ${tableKey} não configurado.`);
      return;
    }

    try {
      await baserowService.createRow(config.tableIds[tableKey], data);
      
      // Registrar ação no histórico pessoal
      const itemName = data.Nome || data.Email || `Item em ${tableKey}`;
      addAction(
        `Criou ${tableKey.slice(0, -1)}`, // Remove 's' do final
        `Criado: ${itemName}`,
        'content',
        false // Por enquanto não permitimos desfazer criações
      );
      
      // Notificar criação
      notifyCreate(itemName);
      
      toast("Registro criado com sucesso");
      if (onCreateSuccess) {
        onCreateSuccess();
      }
    } catch (error: any) {
      console.error("Erro ao criar registro:", error);
      alert(error.message || "Falha ao criar registro");
    }
  };

  const [formData, setFormData] = React.useState<any>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev: any) => ({
      ...prev,
      [name]: type === "number" ? Number(value) : value
    }));
  };

  const handleSwitchChange = (name: string, checked: boolean) => {
    setFormData((prev: any) => ({
      ...prev,
      [name]: checked
    }));
  };

  React.useEffect(() => {
    if (open) {
      setFormData({});
    }
  }, [open]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    const fieldConfig = getFieldConfig();
    console.log('Configuração de campos sendo usada:', fieldConfig);

    // Validação
    for (const field of fieldConfig) {
      if (field.required && (!formData[field.name] || formData[field.name] === '')) {
        alert(`O campo ${field.label} é obrigatório.`);
        return;
      }

      if (field.type === 'email' && formData[field.name] && !/\S+@\S+\.\S+/.test(formData[field.name])) {
        alert("Informe um e-mail válido.");
        return;
      }

      if (field.minLength && formData[field.name] && String(formData[field.name]).length < field.minLength) {
        alert(`${field.label} deve ter pelo menos ${field.minLength} caracteres.`);
        return;
      }

      if (field.min && formData[field.name] && Number(formData[field.name]) < field.min) {
        alert(`${field.label} deve ser maior ou igual a ${field.min}.`);
        return;
      }
    }

    try {
      await handleSubmit(formData);
      setOpen(false);
      if (onCreateSuccess) onCreateSuccess();
    } catch (error) {
      alert("Ocorreu um erro ao criar o registro.");
    }
  };

  const fieldConfig = getFieldConfig();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title ? `Adicionar ${title}` : "Adicionar registro"}</DialogTitle>
          <DialogDescription>
            Preencha os campos abaixo para criar um novo registro.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleCreate}>
          {fieldConfig.map(field => (
            <div key={field.name} className="space-y-2">
              <Label htmlFor={field.name} className="font-medium">
                {field.label}{field.required && " *"}
              </Label>
              
              {field.type === 'boolean' ? (
                <div className="flex items-center space-x-2">
                  <Switch
                    id={field.name}
                    checked={formData[field.name] || false}
                    onCheckedChange={(checked) => handleSwitchChange(field.name, checked)}
                  />
                  <Label htmlFor={field.name} className="text-sm text-muted-foreground">
                    {field.label}
                  </Label>
                </div>
              ) : field.type === 'textarea' ? (
                <Textarea
                  id={field.name}
                  name={field.name}
                  value={formData[field.name] || ""}
                  onChange={handleChange}
                  required={field.required}
                  placeholder={`Digite ${field.label.toLowerCase()}...`}
                  rows={3}
                />
              ) : (
                <Input
                  id={field.name}
                  name={field.name}
                  type={field.type}
                  min={field.min}
                  minLength={field.minLength}
                  value={formData[field.name] || ""}
                  onChange={handleChange}
                  required={field.required}
                  placeholder={`Digite ${field.label.toLowerCase()}...`}
                />
              )}
            </div>
          ))}

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">
              Salvar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
