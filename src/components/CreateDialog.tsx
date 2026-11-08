
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Eye, EyeOff } from "lucide-react";
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
import { mapToDatabaseKeys, findMatchingKey } from '@/utils/baserowHelpers';

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
  options?: { label: string; value: string }[];
}

const userFieldConfig: FieldConfig[] = [
  { label: 'Nome Completo', name: 'Nome', type: 'text', required: true },
  { label: 'E-mail', name: 'Email', type: 'email', required: true },
  { label: 'Senha de Acesso', name: 'Senha', type: 'password', required: true, minLength: 6 },
  {
    label: 'Status da Conta',
    name: 'Status',
    type: 'select',
    required: false,
    options: [
      { label: '🟢 Ativo', value: 'Ativo' },
      { label: '🔴 Expirado', value: 'Expirado' },
      { label: '⛔ Bloqueado', value: 'Bloqueado' },
      { label: '⭐ VIP / Assinante', value: 'VIP' },
      { label: '🟣 Grátis', value: 'Grátis' },
    ]
  },
  { label: 'Data de Vencimento', name: 'Vencimento', type: 'date', required: false },
  { label: 'Limite de Telas', name: 'Limite', type: 'number', required: false, min: 1 },
  { label: 'Moedas / Saldo', name: 'Moedas', type: 'number', required: false, min: 0 },
  { label: 'Data de Criação', name: 'DataCriacao', type: 'date', required: false },
  { label: 'ID do Usuário', name: 'ID', type: 'text', required: false },
  { label: 'ID do Aplicativo (AppId)', name: 'AppId', type: 'text', required: false },
  { label: 'Total de Dias de Acesso', name: 'Dias', type: 'number', required: false, min: 1 },
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

  const [formData, setFormData] = React.useState<any>({});
  const [showPassword, setShowPassword] = React.useState(false);

  const getFieldConfig = (): FieldConfig[] => {
    console.log('CreateDialog - tableKey recebido:', tableKey);
    
    switch (tableKey) {
      case 'usuarios':
        console.log('Usando configuração de usuários alinhada ao Baserow');
        return [
          { label: 'Nome Completo', name: 'Nome', type: 'text', required: true },
          { label: 'E-mail', name: 'Email', type: 'email', required: true },
          { label: 'Senha de Acesso', name: 'Senha', type: 'password', required: true, minLength: 6 },
          {
            label: 'Status da Conta',
            name: 'Status',
            type: 'select',
            required: false,
            options: [
              { label: '🟢 Ativo', value: 'Ativo' },
              { label: '🔴 Expirado', value: 'Expirado' },
              { label: '⛔ Bloqueado', value: 'Bloqueado' },
              { label: '⭐ VIP / Assinante', value: 'VIP' },
              { label: '🟣 Grátis', value: 'Grátis' },
            ]
          },
          { label: 'Data de Vencimento', name: 'Vencimento', type: 'date', required: false },
          { label: 'Limite de Telas', name: 'Limite', type: 'number', required: false, min: 1 },
          { label: 'Moedas / Saldo', name: 'Moedas', type: 'number', required: false, min: 0 },
          { label: 'Data de Criação', name: 'DataCriacao', type: 'date', required: false },
          { label: 'ID do Usuário', name: 'ID', type: 'text', required: false },
          { label: 'ID do Aplicativo (AppId)', name: 'AppId', type: 'text', required: false },
          ...(mode === 'tibim' ? [
            { label: 'Favoritos', name: 'Favoritos', type: 'textarea', required: false },
            { label: 'Histórico', name: 'Historico', type: 'textarea', required: false },
          ] : [])
        ];
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
        return columns.filter((col) => col !== "ID" && col !== "Ações").map((col) => ({
          label: col,
          name: col,
          type: 'text',
          required: false
        }));
    }
  };

  const handleSubmit = async (data: any) => {
    const tableId = config?.tableIds?.[tableKey as keyof typeof config.tableIds];
    if (!config || !config.tableIds || !tableId) {
      alert(`Table ID para ${tableKey} não configurado.`);
      return;
    }

    try {
      let mappedData = mapToDatabaseKeys(data, existingKeys);
      
      // Se tivermos as chaves reais da tabela do Baserow, filtrar para evitar enviar chaves desconhecidas
      if (existingKeys && existingKeys.length > 0) {
        const cleanPayload: Record<string, any> = {};
        Object.keys(mappedData).forEach(key => {
          const matchedKey = findMatchingKey(existingKeys, key);
          if (matchedKey) {
            cleanPayload[matchedKey] = mappedData[key];
          }
        });
        
        // Só substitui se filtrou com sucesso algum campo válido
        if (Object.keys(cleanPayload).length > 0) {
          mappedData = cleanPayload;
        }
      }

      // Converter campos de data para o formato datetime do Baserow se necessário
      Object.keys(mappedData).forEach(key => {
        const val = mappedData[key];
        const keyLower = key.toLowerCase().replace(/[\s_-]/g, '');
        if ((keyLower === 'datacriacao' || keyLower === 'vencimento' || keyLower === 'pagamento') && val && /^\d{4}-\d{2}-\d{2}$/.test(String(val))) {
          mappedData[key] = `${val}T00:00:00Z`;
        }
      });
      
      await baserowService.createRow(tableId, mappedData);
      
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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

  const handleSwitchChange = (name: string, checked: boolean) => {
    setFormData((prev: any) => ({
      ...prev,
      [name]: checked
    }));
  };

  React.useEffect(() => {
    if (open) {
      if (tableKey === 'usuarios') {
        const today = new Date().toISOString().split('T')[0];
        const thirtyDaysAhead = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        setFormData({
          Status: 'Ativo',
          Limite: 1,
          Moedas: 0,
          DataCriacao: today,
          Vencimento: thirtyDaysAhead,
        });
      } else {
        setFormData({});
      }
    }
  }, [open, tableKey]);

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

      if (field.min !== undefined && formData[field.name] !== undefined && Number(formData[field.name]) < field.min) {
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
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title ? `Adicionar ${title}` : "Adicionar registro"}</DialogTitle>
          <DialogDescription>
            Preencha os campos abaixo para criar um novo registro no sistema.
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
                  <Label htmlFor={field.name} className="text-sm text-muted-foreground cursor-pointer">
                    {field.label}
                  </Label>
                </div>
              ) : field.type === 'select' ? (
                <Select
                  value={formData[field.name] || (field.options?.[0]?.value || 'Ativo')}
                  onValueChange={(val) => handleSelectChange(field.name, val)}
                >
                  <SelectTrigger id={field.name} className="w-full">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {field.options?.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : field.type === 'password' ? (
                <div className="relative">
                  <Input
                    id={field.name}
                    name={field.name}
                    type={showPassword ? "text" : "password"}
                    minLength={field.minLength}
                    value={formData[field.name] || ""}
                    onChange={handleChange}
                    required={field.required}
                    placeholder={`Digite ${field.label.toLowerCase()}...`}
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
                  value={formData[field.name] !== undefined ? formData[field.name] : ""}
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

export default CreateDialog;
