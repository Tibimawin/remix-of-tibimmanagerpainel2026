
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
import { toast } from 'sonner';
import { useAutoNotifyCRUD } from '@/hooks/useActionNotifier';

interface EditEpisodioDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  item: any;
  onEditSuccess: () => void;
}

const EPISODIO_FIELDS = ['Nome', 'Temporada', 'Episódio', 'Link'];

export const EditEpisodioDialog: React.FC<EditEpisodioDialogProps> = ({ 
  open, 
  setOpen, 
  item, 
  onEditSuccess 
}) => {
  const [formData, setFormData] = useState<any>({});
  const { config } = useConfig();
  const baserowService = useBaserowService();
  const { notifyUpdate } = useAutoNotifyCRUD('episódios');

  useEffect(() => {
    if (item) {
      const filteredData: Record<string, any> = {};
      EPISODIO_FIELDS.forEach(field => {
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
      const tableId = config.tableIds['episodios'];
      await baserowService.updateRow(tableId, item.id, formData);
      
      // Notificar atualização
      notifyUpdate(formData.Nome || 'Episódio');
      
      toast.success('Episódio atualizado com sucesso!');
      onEditSuccess();
      setOpen(false);
    } catch (error) {
      console.error("Erro ao atualizar episódio:", error);
      toast.error('Erro ao atualizar episódio');
    }
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Editar Episódio</DialogTitle>
          <DialogDescription>
            Altere as informações do episódio.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
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
          
          <div className="grid gap-2">
            <Label htmlFor="Temporada">Temporada *</Label>
            <Input
              id="Temporada"
              name="Temporada"
              type="number"
              value={formData.Temporada || 0}
              onChange={handleInputChange}
              min={1}
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="Episódio">Episódio *</Label>
            <Input
              id="Episódio"
              name="Episódio"
              type="number"
              value={formData.Episódio || 0}
              onChange={handleInputChange}
              min={1}
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="Link">Link</Label>
            <Input
              id="Link"
              name="Link"
              type="url"
              value={formData.Link || ''}
              onChange={handleInputChange}
              placeholder="https://exemplo.com/episodio"
            />
          </div>
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
