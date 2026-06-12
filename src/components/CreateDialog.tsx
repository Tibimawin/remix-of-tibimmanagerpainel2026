
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
import { useTypeMode } from '@/contexts/TypeModeContext';
import { toast } from '@/hooks/use-toast';
import { useUserActionHistory } from '@/hooks/useUserActionHistory';
import { useAutoNotifyCRUD } from '@/hooks/useActionNotifier';
import { mapToDatabaseKeys } from '@/utils/baserowHelpers';

interface CreateDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  tableKey: string;
  columns: string[];
  onCreateSuccess: () => void;
  title?: string;
  existingKeys?: string[];
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
  open, setOpen, tableKey, columns, onCreateSuccess, title, existingKeys = []
}: CreateDialogProps) => {
  const { config } = useConfig();
  const { mode } = useTypeMode();
  const baserowService = useBaserowService();
  const { addAction } = useUserActionHistory();
  const { notifyCreate } = useAutoNotifyCRUD(tableKey);

  const getFieldConfig = (): FieldConfig[] => {
    console.log('CreateDialog - tableKey recebido:', tableKey);
    
    switch (tableKey) {
      case 'usuarios':
        console.log('Usando configuração de usuários');
        if (mode === 'tibim') {
          return [
            { label: 'Nome', name: 'Nome', type: 'text', required: true },
            { label: 'Email', name: 'Email', type: 'email', required: true },
            { label: 'Senha', name: 'Senha', type: 'password', required: true, minLength: 6 },
            { label: 'Status', name: 'Status', type: 'text', required: false },
            { label: 'DataCriacao', name: 'DataCriacao', type: 'text', required: false },
            { label: 'Vencimento', name: 'Vencimento', type: 'text', required: false },
            { label: 'ID', name: 'ID', type: 'text', required: false },
            { label: 'Limite', name: 'Limite', type: 'text', required: false },
            { label: 'Moedas', name: 'Moedas', type: 'number', required: false, min: 0 },
            { label: 'Favoritos', name: 'Favoritos', type: 'textarea', required: false },
            { label: 'Historico', name: 'Historico', type: 'textarea', required: false },
          ];
        }
        return userFieldConfig;
      case 'conteudos':
        console.log('Usando configuração de conteúdos');
        return [
          ...conteudosFieldConfig,
          ...(mode === 'tibim' ? [
            { label: 'Visualizações', name: 'Visualizações', type: 'text', required: false },
            { label: 'Selo', name: 'Selo', type: 'text', required: false },
            { label: 'Elenco', name: 'Elenco', type: 'text', required: false },
            { label: 'Capa de fundo', name: 'Capa de fundo', type: 'url', required: false },
            { label: 'TMDB ID', name: 'TMDB ID', type: 'text', required: false },
            { label: 'Ano', name: 'Ano', type: 'text', required: false },
          ] : [])
        ];
      case 'episodios':
        console.log('Usando configuração de episódios');
        return episodiosFieldConfig;
      case 'banners':
        console.log('Usando configuração de banners');
        return bannersFieldConfig;
      case 'plano2':
        return [
          { label: 'Nome do Plano', name: 'Nome do Plano', type: 'text', required: true },
          { label: 'Tipo', name: 'Tipo', type: 'text', required: true },
          { label: 'Valor', name: 'Valor', type: 'number', required: true, min: 0 },
          { label: 'Dias', name: 'Dias', type: 'number', required: true, min: 1 },
          { label: 'Telas', name: 'Telas', type: 'number', required: true, min: 1 },
          { label: 'Tag', name: 'Tag', type: 'text', required: true },
        ];
      case 'perfil':
        return [
          { label: 'Usuario_Email', name: 'Usuario_Email', type: 'text', required: true },
          { label: 'Nome', name: 'Nome', type: 'text', required: true },
          { label: 'Avatar', name: 'Avatar', type: 'text', required: false },
          { label: 'IsKids', name: 'IsKids', type: 'boolean', required: false },
          { label: 'Pin', name: 'Pin', type: 'text', required: false },
          { label: 'IsKids + Pin', name: 'IsKids + Pin', type: 'text', required: false },
          { label: 'PinPerfil', name: 'PinPerfil', type: 'number', required: false },
        ];
      case 'meusAplicativos':
        return [
          { label: 'Nome', name: 'Nome', type: 'text', required: true },
          { label: 'Capa', name: 'Capa', type: 'url', required: false },
          { label: 'Link', name: 'Link', type: 'url', required: true },
          { label: 'Pacote', name: 'Pacote', type: 'text', required: false },
          { label: 'Tipo', name: 'Tipo', type: 'text', required: false },
        ];
      case 'carrosseu':
        return [
          { label: 'ID', name: 'ID', type: 'text', required: true },
        ];
      case 'versao':
        return [
          { label: 'Versao', name: 'Versao', type: 'text', required: true },
          { label: 'Link', name: 'Link', type: 'url', required: true },
        ];
      case 'pedido':
        return [
          { label: 'Nome', name: 'Nome', type: 'text', required: true },
          { label: 'Usuario', name: 'Usuario', type: 'text', required: true },
        ];
      case 'avaliacao':
        return [
          { label: 'Usuario', name: 'Usuario', type: 'text', required: true },
          { label: 'ConteudoID', name: 'ConteudoID', type: 'text', required: true },
          { label: 'Nota', name: 'Nota', type: 'text', required: true },
        ];
      case 'categoriaFilmes':
      case 'categoriaSeries':
      case 'categoriaDorama':
      case 'categoriaAnimes':
      case 'categoriaNovelas':
        return [
          { label: 'Nome', name: 'Nome', type: 'text', required: true },
        ];
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
      const mappedData = mapToDatabaseKeys(data, existingKeys);
      
      // Converter campos de data para o formato datetime do Baserow se necessário
      Object.keys(mappedData).forEach(key => {
        const val = mappedData[key];
        const keyLower = key.toLowerCase();
        if ((keyLower === 'datacriacao' || keyLower === 'vencimento' || keyLower === 'pagamento') && val && /^\d{4}-\d{2}-\d{2}$/.test(String(val))) {
          mappedData[key] = `${val}T00:00:00Z`;
        }
      });
      
      await baserowService.createRow(config.tableIds[tableKey], mappedData);
      
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
