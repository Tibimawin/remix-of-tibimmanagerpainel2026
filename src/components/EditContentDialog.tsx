
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
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useBaserowService } from '@/services/BaserowService';
import { useConfig } from '@/contexts/ConfigContext';
import { useTypeMode } from '@/contexts/TypeModeContext';
import { toast } from 'sonner';
import { useAutoNotifyCRUD } from '@/hooks/useActionNotifier';

interface EditContentDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  item: any;
  onEditSuccess: () => void;
}

// Campos permitidos para edição em Conteúdos
const CONTENT_FIELDS = [
  'Nome', 'Categoria', 'Tipo', 'Views', 'Temporadas', 'Idioma', 
  'Sinopse', 'Link', 'Capa', 'Duracao', 'IMDb'
];

export const EditContentDialog: React.FC<EditContentDialogProps> = ({ 
  open, 
  setOpen, 
  item, 
  onEditSuccess 
}) => {
  const [formData, setFormData] = useState<any>({});
  const { config } = useConfig();
  const { mode } = useTypeMode();
  const baserowService = useBaserowService();
  const { notifyUpdate } = useAutoNotifyCRUD('conteúdos');

  useEffect(() => {
    if (item) {
      const filteredData: Record<string, any> = {};
      const fields = [
        ...CONTENT_FIELDS,
        ...(mode === 'tibim' ? ['Visualizações', 'Selo', 'Elenco', 'Capa de fundo', 'TMDB ID', 'Ano'] : [])
      ];
      fields.forEach(field => {
        filteredData[field] = item[field] ?? "";
      });
      setFormData(filteredData);
    }
  }, [item, mode]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === "number" ? Number(value) : value
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = async () => {
    try {
      const tableId = config.tableIds['conteudos'];
      await baserowService.updateRow(tableId, item.id, formData);
      
      // Notificar atualização
      notifyUpdate(formData.Nome || 'Conteúdo');
      
      toast.success('Conteúdo atualizado com sucesso!');
      onEditSuccess();
      setOpen(false);
    } catch (error) {
      console.error("Erro ao atualizar conteúdo:", error);
      toast.error('Erro ao atualizar conteúdo');
    }
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Conteúdo</DialogTitle>
          <DialogDescription>
            Altere as informações do conteúdo.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {/* Nome */}
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

          {/* Tipo */}
          <div className="grid gap-2">
            <Label htmlFor="Tipo">Tipo *</Label>
            <Select 
              value={formData.Tipo || ''} 
              onValueChange={(value) => handleSelectChange('Tipo', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Filme">Filme</SelectItem>
                <SelectItem value="Série">Série</SelectItem>
                <SelectItem value="TV">TV</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Categoria */}
          <div className="grid gap-2">
            <Label htmlFor="Categoria">Categoria</Label>
            <Input
              id="Categoria"
              name="Categoria"
              value={formData.Categoria || ''}
              onChange={handleInputChange}
            />
          </div>

          {/* Idioma */}
          <div className="grid gap-2">
            <Label htmlFor="Idioma">Idioma</Label>
            <Select 
              value={formData.Idioma || ''} 
              onValueChange={(value) => handleSelectChange('Idioma', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o idioma" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DUB">DUB</SelectItem>
                <SelectItem value="LEG">LEG</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Views */}
          <div className="grid gap-2">
            <Label htmlFor="Views">Views</Label>
            <Input
              id="Views"
              name="Views"
              type="number"
              value={formData.Views || 0}
              onChange={handleInputChange}
              min={0}
            />
          </div>

          {/* Temporadas */}
          <div className="grid gap-2">
            <Label htmlFor="Temporadas">Temporadas</Label>
            <Input
              id="Temporadas"
              name="Temporadas"
              type="number"
              value={formData.Temporadas || 0}
              onChange={handleInputChange}
              min={0}
            />
          </div>

          {/* Duração */}
          <div className="grid gap-2">
            <Label htmlFor="Duracao">Duração</Label>
            <Input
              id="Duracao"
              name="Duracao"
              value={formData.Duracao || ''}
              onChange={handleInputChange}
              placeholder="Ex: 120 min"
            />
          </div>

          {/* IMDb */}
          <div className="grid gap-2">
            <Label htmlFor="IMDb">Avaliação IMDb</Label>
            <Input
              id="IMDb"
              name="IMDb"
              value={formData.IMDb || ''}
              onChange={handleInputChange}
              placeholder="Ex: 8.5"
            />
          </div>

          {/* Link */}
          <div className="grid gap-2">
            <Label htmlFor="Link">Link do Conteúdo</Label>
            <Input
              id="Link"
              name="Link"
              type="url"
              value={formData.Link || ''}
              onChange={handleInputChange}
              placeholder="https://exemplo.com/link"
            />
          </div>

          {/* Capa */}
          <div className="grid gap-2">
            <Label htmlFor="Capa">URL da Capa</Label>
            <Input
              id="Capa"
              name="Capa"
              type="url"
              value={formData.Capa || ''}
              onChange={handleInputChange}
              placeholder="https://exemplo.com/capa.jpg"
            />
          </div>

          {/* Sinopse */}
          <div className="grid gap-2">
            <Label htmlFor="Sinopse">Sinopse</Label>
            <Textarea
              id="Sinopse"
              name="Sinopse"
              rows={4}
              value={formData.Sinopse || ''}
              onChange={handleInputChange}
              placeholder="Digite a sinopse do conteúdo..."
            />
          </div>

          {/* Campos exclusivos do Modo Tibim */}
          {mode === 'tibim' && (
            <>
              {/* Visualizações */}
              <div className="grid gap-2">
                <Label htmlFor="Visualizações">Visualizações</Label>
                <Input
                  id="Visualizações"
                  name="Visualizações"
                  value={formData.Visualizações || ''}
                  onChange={handleInputChange}
                />
              </div>

              {/* Selo */}
              <div className="grid gap-2">
                <Label htmlFor="Selo">Selo</Label>
                <Input
                  id="Selo"
                  name="Selo"
                  value={formData.Selo || ''}
                  onChange={handleInputChange}
                />
              </div>

              {/* Elenco */}
              <div className="grid gap-2">
                <Label htmlFor="Elenco">Elenco</Label>
                <Input
                  id="Elenco"
                  name="Elenco"
                  value={formData.Elenco || ''}
                  onChange={handleInputChange}
                />
              </div>

              {/* Capa de fundo */}
              <div className="grid gap-2">
                <Label htmlFor="Capa de fundo">Capa de Fundo</Label>
                <Input
                  id="Capa de fundo"
                  name="Capa de fundo"
                  value={formData['Capa de fundo'] || ''}
                  onChange={handleInputChange}
                />
              </div>

              {/* TMDB ID */}
              <div className="grid gap-2">
                <Label htmlFor="TMDB ID">TMDB ID</Label>
                <Input
                  id="TMDB ID"
                  name="TMDB ID"
                  value={formData['TMDB ID'] || ''}
                  onChange={handleInputChange}
                />
              </div>

              {/* Ano */}
              <div className="grid gap-2">
                <Label htmlFor="Ano">Ano</Label>
                <Input
                  id="Ano"
                  name="Ano"
                  value={formData.Ano || ''}
                  onChange={handleInputChange}
                />
              </div>
            </>
          )}
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
