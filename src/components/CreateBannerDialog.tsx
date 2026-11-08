import React, { useState } from 'react';
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
import { toast } from "sonner";

interface CreateBannerDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  onCreateSuccess: () => void;
}

export const CreateBannerDialog: React.FC<CreateBannerDialogProps> = ({ 
  open, 
  setOpen, 
  onCreateSuccess 
}) => {
  const [formData, setFormData] = useState({
    Nome: '',
    Imagem: '',
    Categoria: '',
    Link: '',
    'Externo?': false,
    Ordem: 0
  });
  const [loading, setLoading] = useState(false);
  const { config } = useConfig();
  const baserowService = useBaserowService();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === "number" ? Number(value) || 0 : value
    }));
  };

  const handleSwitchChange = (checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      'Externo?': checked
    }));
  };

  const handleSave = async () => {
    if (!formData.Nome.trim()) {
      toast.error('O nome do anúncio é obrigatório');
      return;
    }

    if (!formData.Imagem.trim()) {
      toast.error('A URL da imagem é obrigatória');
      return;
    }

    try {
      setLoading(true);
      const tableId = config.tableIds.banners;
      await baserowService.createRow(tableId, formData);
      
      toast.success('Anúncio criado com sucesso!');
      onCreateSuccess();
      setOpen(false);
      
      // Reset form
      setFormData({
        Nome: '',
        Imagem: '',
        Categoria: '',
        Link: '',
        'Externo?': false,
        Ordem: 0
      });
    } catch (error) {
      console.error("Erro ao criar anúncio:", error);
      toast.error('Erro ao criar anúncio. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    // Reset form when closing
    setFormData({
      Nome: '',
      Imagem: '',
      Categoria: '',
      Link: '',
      'Externo?': false,
      Ordem: 0
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Criar Novo Anúncio</DialogTitle>
          <DialogDescription>
            Crie um anúncio que será exibido no painel dos usuários. Preencha as informações abaixo.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="Nome">Nome do Anúncio *</Label>
            <Input
              id="Nome"
              name="Nome"
              value={formData.Nome}
              onChange={handleInputChange}
              placeholder="Ex: Promoção Especial, Novo Produto..."
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="Imagem">URL da Imagem *</Label>
            <Input
              id="Imagem"
              name="Imagem"
              type="url"
              value={formData.Imagem}
              onChange={handleInputChange}
              placeholder="https://exemplo.com/imagem.jpg"
              required
            />
            {formData.Imagem && (
              <div className="mt-2">
                <img 
                  src={formData.Imagem} 
                  alt="Preview" 
                  className="w-full max-w-xs h-20 object-cover rounded border"
                  onError={(e) => {
                    e.currentTarget.src = '/placeholder.svg';
                  }}
                />
              </div>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="Categoria">Categoria</Label>
            <Input
              id="Categoria"
              name="Categoria"
              value={formData.Categoria}
              onChange={handleInputChange}
              placeholder="Ex: Promoção, Novidade, Oferta Especial..."
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="Link">Link de Destino</Label>
            <Input
              id="Link"
              name="Link"
              type="url"
              value={formData.Link}
              onChange={handleInputChange}
              placeholder="https://exemplo.com/oferta"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="externo"
              checked={formData['Externo?']}
              onCheckedChange={handleSwitchChange}
            />
            <Label htmlFor="externo">Abrir link em nova aba</Label>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="Ordem">Ordem de Exibição</Label>
            <Input
              id="Ordem"
              name="Ordem"
              type="number"
              min="0"
              value={formData.Ordem}
              onChange={handleInputChange}
              placeholder="0"
            />
            <p className="text-xs text-muted-foreground">
              Números menores aparecem primeiro. 0 = primeira posição.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleSave} disabled={loading}>
            {loading ? 'Criando...' : 'Criar Anúncio'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};