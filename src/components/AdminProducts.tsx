
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Package } from 'lucide-react';
import { toast } from 'sonner';
import { db } from '@/config/firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy } from 'firebase/firestore';

interface Product {
  id: string;
  nome: string;
  descricao: string;
  preco: number;
  categoria: string;
  status: 'ativo' | 'inativo';
  dataCriacao: string;
}

const AdminProducts: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    preco: '',
    categoria: '',
    status: 'ativo' as 'ativo' | 'inativo'
  });

  // Carregamento de produtos em tempo real do Firestore
  useEffect(() => {
    const q = query(collection(db, 'produtos'), orderBy('dataCriacao', 'desc'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const productsData: Product[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        productsData.push({
          id: doc.id,
          nome: data.nome,
          descricao: data.descricao,
          preco: data.preco,
          categoria: data.categoria,
          status: data.status,
          dataCriacao: data.dataCriacao
        });
      });
      setProducts(productsData);
    }, (error) => {
      console.error('Erro ao carregar produtos:', error);
      toast.error('Erro ao carregar produtos');
    });

    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nome || !formData.preco) {
      toast.error('Nome e preço são obrigatórios');
      return;
    }

    try {
      const productData = {
        nome: formData.nome,
        descricao: formData.descricao,
        preco: parseFloat(formData.preco),
        categoria: formData.categoria,
        status: formData.status,
        dataCriacao: editingProduct?.dataCriacao || new Date().toISOString()
      };

      if (editingProduct) {
        await updateDoc(doc(db, 'produtos', editingProduct.id), productData);
        toast.success('Produto atualizado com sucesso!');
      } else {
        await addDoc(collection(db, 'produtos'), productData);
        toast.success('Produto criado com sucesso!');
      }

      resetForm();
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Erro ao salvar produto:', error);
      toast.error('Erro ao salvar produto');
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      nome: product.nome,
      descricao: product.descricao,
      preco: product.preco.toString(),
      categoria: product.categoria,
      status: product.status
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (productId: string) => {
    if (confirm('Tem certeza que deseja excluir este produto?')) {
      try {
        await deleteDoc(doc(db, 'produtos', productId));
        toast.success('Produto excluído com sucesso!');
      } catch (error) {
        console.error('Erro ao excluir produto:', error);
        toast.error('Erro ao excluir produto');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      descricao: '',
      preco: '',
      categoria: '',
      status: 'ativo'
    });
    setEditingProduct(null);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    resetForm();
  };

  return (
    <div className="space-y-6">
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white flex items-center">
                <Package className="w-5 h-5 mr-2" />
                Gerenciamento de Produtos
              </CardTitle>
              <CardDescription className="text-slate-400">
                Adicione e gerencie produtos disponíveis para os usuários
              </CardDescription>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Produto
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-800 border-slate-700 text-white">
                <DialogHeader>
                  <DialogTitle>
                    {editingProduct ? 'Editar Produto' : 'Novo Produto'}
                  </DialogTitle>
                  <DialogDescription className="text-slate-400">
                    {editingProduct ? 'Atualize as informações do produto' : 'Adicione um novo produto ao sistema'}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="nome" className="text-slate-300">Nome do Produto *</Label>
                    <Input
                      id="nome"
                      type="text"
                      value={formData.nome}
                      onChange={(e) => setFormData({...formData, nome: e.target.value})}
                      className="bg-slate-700 border-slate-600 text-white"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="descricao" className="text-slate-300">Descrição</Label>
                    <Textarea
                      id="descricao"
                      value={formData.descricao}
                      onChange={(e) => setFormData({...formData, descricao: e.target.value})}
                      className="bg-slate-700 border-slate-600 text-white"
                      rows={3}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="preco" className="text-slate-300">Preço (R$) *</Label>
                      <Input
                        id="preco"
                        type="number"
                        step="0.01"
                        value={formData.preco}
                        onChange={(e) => setFormData({...formData, preco: e.target.value})}
                        className="bg-slate-700 border-slate-600 text-white"
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="categoria" className="text-slate-300">Categoria</Label>
                      <Input
                        id="categoria"
                        type="text"
                        value={formData.categoria}
                        onChange={(e) => setFormData({...formData, categoria: e.target.value})}
                        className="bg-slate-700 border-slate-600 text-white"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="status" className="text-slate-300">Status</Label>
                    <select
                      id="status"
                      value={formData.status}
                      onChange={(e) => setFormData({...formData, status: e.target.value as 'ativo' | 'inativo'})}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white"
                    >
                      <option value="ativo">Ativo</option>
                      <option value="inativo">Inativo</option>
                    </select>
                  </div>
                  
                  <div className="flex space-x-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleDialogClose}
                      className="flex-1 border-slate-600 text-white hover:bg-slate-700"
                    >
                      Cancelar
                    </Button>
                    <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700">
                      {editingProduct ? 'Atualizar' : 'Criar'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {products.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow className="border-slate-700">
                  <TableHead className="text-slate-300">Nome</TableHead>
                  <TableHead className="text-slate-300">Categoria</TableHead>
                  <TableHead className="text-slate-300">Preço</TableHead>
                  <TableHead className="text-slate-300">Status</TableHead>
                  <TableHead className="text-slate-300">Data de Criação</TableHead>
                  <TableHead className="text-slate-300">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow key={product.id} className="border-slate-700">
                    <TableCell className="text-white font-medium">
                      <div>
                        <div>{product.nome}</div>
                        {product.descricao && (
                          <div className="text-sm text-slate-400 mt-1">{product.descricao}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-300">{product.categoria || '-'}</TableCell>
                    <TableCell className="text-slate-300">R$ {product.preco.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant={product.status === 'ativo' ? 'default' : 'secondary'}>
                        {product.status === 'ativo' ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-300">
                      {new Date(product.dataCriacao).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(product)}
                          className="border-slate-600 text-white hover:bg-slate-700"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(product.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <Package className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-400">Nenhum produto cadastrado ainda.</p>
              <p className="text-sm text-slate-500 mt-2">Clique em "Novo Produto" para começar.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminProducts;
