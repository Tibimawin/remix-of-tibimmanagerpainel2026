import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Edit, Trash2, Calendar, DollarSign, Image as ImageIcon, Tag } from 'lucide-react';
import { toast } from 'sonner';

interface Offer {
  id: string;
  title: string;
  description: string;
  price: string;
  imageUrl: string;
  expirationDate?: string;
  createdAt: string;
  updatedAt: string;
}

interface OfferFormData {
  title: string;
  description: string;
  price: string;
  imageUrl: string;
  expirationDate: string;
}

export const AdminOffers: React.FC = () => {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
  const [formData, setFormData] = useState<OfferFormData>({
    title: '',
    description: '',
    price: '',
    imageUrl: '',
    expirationDate: ''
  });

  // Carregar ofertas em tempo real
  useEffect(() => {
    const q = query(collection(db, 'offers'), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const offersData: Offer[] = [];
      querySnapshot.forEach((doc) => {
        offersData.push({ id: doc.id, ...doc.data() } as Offer);
      });
      setOffers(offersData);
      setLoading(false);
    }, (error) => {
      console.error('Erro ao carregar ofertas:', error);
      toast.error('Erro ao carregar ofertas');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Resetar formulário
  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      price: '',
      imageUrl: '',
      expirationDate: ''
    });
  };

  // Criar nova oferta
  const handleCreateOffer = async () => {
    try {
      if (!formData.title || !formData.description || !formData.price) {
        toast.error('Preencha todos os campos obrigatórios');
        return;
      }

      const newOffer = {
        ...formData,
        price: formData.price.replace(/[^\d,]/g, ''), // Remove caracteres especiais
        expirationDate: formData.expirationDate || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'offers'), newOffer);
      toast.success('Oferta criada com sucesso!');
      setIsCreateDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Erro ao criar oferta:', error);
      toast.error('Erro ao criar oferta');
    }
  };

  // Editar oferta
  const handleEditOffer = async () => {
    try {
      if (!editingOffer || !formData.title || !formData.description || !formData.price) {
        toast.error('Preencha todos os campos obrigatórios');
        return;
      }

      const updatedOffer = {
        ...formData,
        price: formData.price.replace(/[^\d,]/g, ''),
        expirationDate: formData.expirationDate || null,
        updatedAt: new Date().toISOString()
      };

      await updateDoc(doc(db, 'offers', editingOffer.id), updatedOffer);
      toast.success('Oferta atualizada com sucesso!');
      setIsEditDialogOpen(false);
      setEditingOffer(null);
      resetForm();
    } catch (error) {
      console.error('Erro ao atualizar oferta:', error);
      toast.error('Erro ao atualizar oferta');
    }
  };

  // Deletar oferta
  const handleDeleteOffer = async (offerId: string) => {
    try {
      await deleteDoc(doc(db, 'offers', offerId));
      toast.success('Oferta removida com sucesso!');
    } catch (error) {
      console.error('Erro ao deletar oferta:', error);
      toast.error('Erro ao deletar oferta');
    }
  };

  // Preparar edição
  const startEdit = (offer: Offer) => {
    setEditingOffer(offer);
    setFormData({
      title: offer.title,
      description: offer.description,
      price: offer.price,
      imageUrl: offer.imageUrl,
      expirationDate: offer.expirationDate || ''
    });
    setIsEditDialogOpen(true);
  };

  // Verificar se oferta está expirada
  const isExpired = (expirationDate?: string) => {
    if (!expirationDate) return false;
    return new Date(expirationDate) < new Date();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Gerenciar Ofertas</h2>
          <p className="text-muted-foreground">Crie e gerencie ofertas que aparecerão no painel do usuário</p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="modern-button">
              <Plus className="w-4 h-4 mr-2" />
              Nova Oferta
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Criar Nova Oferta</DialogTitle>
              <DialogDescription>
                Preencha os dados da nova oferta
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Título *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Ex: Desconto Especial"
                />
              </div>
              
              <div>
                <Label htmlFor="description">Descrição *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descreva a oferta..."
                  rows={3}
                />
              </div>
              
              <div>
                <Label htmlFor="price">Preço *</Label>
                <Input
                  id="price"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="Ex: R$ 29,90"
                />
              </div>
              
              <div>
                <Label htmlFor="imageUrl">URL da Imagem</Label>
                <Input
                  id="imageUrl"
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  placeholder="https://exemplo.com/imagem.jpg"
                />
              </div>
              
              <div>
                <Label htmlFor="expirationDate">Data de Expiração (opcional)</Label>
                <Input
                  id="expirationDate"
                  type="datetime-local"
                  value={formData.expirationDate}
                  onChange={(e) => setFormData({ ...formData, expirationDate: e.target.value })}
                />
              </div>
              
              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreateOffer}>
                  Criar Oferta
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Lista de Ofertas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {offers.map((offer) => (
          <Card key={offer.id} className="modern-card">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <CardTitle className="text-lg font-semibold text-foreground">
                    {offer.title}
                  </CardTitle>
                  <div className="flex items-center space-x-2 mt-2">
                    <Badge variant={isExpired(offer.expirationDate) ? "destructive" : "default"}>
                      {isExpired(offer.expirationDate) ? 'Expirada' : 'Ativa'}
                    </Badge>
                    <span className="text-sm font-medium text-primary">{offer.price}</span>
                  </div>
                </div>
                
                <div className="flex space-x-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => startEdit(offer)}
                  >
                    <Edit className="w-3 h-3" />
                  </Button>
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="destructive">
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tem certeza que deseja excluir a oferta "{offer.title}"? Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDeleteOffer(offer.id)}>
                          Excluir
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="pt-0">
              {offer.imageUrl && (
                <div className="w-full h-32 bg-muted rounded-lg mb-3 overflow-hidden">
                  <img 
                    src={offer.imageUrl} 
                    alt={offer.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              )}
              
              <CardDescription className="text-sm text-muted-foreground line-clamp-3">
                {offer.description}
              </CardDescription>
              
              {offer.expirationDate && (
                <div className="flex items-center text-xs text-muted-foreground mt-3">
                  <Calendar className="w-3 h-3 mr-1" />
                  Expira: {new Date(offer.expirationDate).toLocaleString('pt-BR')}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        
        {offers.length === 0 && (
          <div className="col-span-full text-center py-12">
            <Tag className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">Nenhuma oferta encontrada</h3>
            <p className="text-muted-foreground">Crie sua primeira oferta para começar</p>
          </div>
        )}
      </div>

      {/* Dialog de Edição */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Oferta</DialogTitle>
            <DialogDescription>
              Atualize os dados da oferta
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-title">Título *</Label>
              <Input
                id="edit-title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Ex: Desconto Especial"
              />
            </div>
            
            <div>
              <Label htmlFor="edit-description">Descrição *</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descreva a oferta..."
                rows={3}
              />
            </div>
            
            <div>
              <Label htmlFor="edit-price">Preço *</Label>
              <Input
                id="edit-price"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder="Ex: R$ 29,90"
              />
            </div>
            
            <div>
              <Label htmlFor="edit-imageUrl">URL da Imagem</Label>
              <Input
                id="edit-imageUrl"
                value={formData.imageUrl}
                onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                placeholder="https://exemplo.com/imagem.jpg"
              />
            </div>
            
            <div>
              <Label htmlFor="edit-expirationDate">Data de Expiração (opcional)</Label>
              <Input
                id="edit-expirationDate"
                type="datetime-local"
                value={formData.expirationDate}
                onChange={(e) => setFormData({ ...formData, expirationDate: e.target.value })}
              />
            </div>
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleEditOffer}>
                Salvar Alterações
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};