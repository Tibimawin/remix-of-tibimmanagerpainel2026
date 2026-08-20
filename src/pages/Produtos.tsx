import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Package, ShoppingCart, Star, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { db } from '@/config/firebase';
import { collection, onSnapshot, query, where, orderBy } from 'firebase/firestore';

interface Product {
  id: string;
  nome: string;
  descricao: string;
  preco: number;
  categoria: string;
  status: 'ativo' | 'inativo';
  dataCriacao: string;
}

const Produtos = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('todas');
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // Carregamento de produtos ativos em tempo real do Firestore
  useEffect(() => {
    const q = query(
      collection(db, 'produtos'), 
      where('status', '==', 'ativo'),
      orderBy('dataCriacao', 'desc')
    );
    
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
      setIsLoading(false);
    }, (error) => {
      console.error('Erro ao carregar produtos:', error);
      toast.error('Erro ao carregar produtos');
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    filterProducts();
  }, [products, searchTerm, selectedCategory]);

  const filterProducts = () => {
    let filtered = products;

    // Filtrar por busca
    if (searchTerm) {
      filtered = filtered.filter(product =>
        product.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.descricao.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtrar por categoria
    if (selectedCategory !== 'todas') {
      filtered = filtered.filter(product => 
        product.categoria.toLowerCase() === selectedCategory.toLowerCase()
      );
    }

    setFilteredProducts(filtered);
  };

  const getCategories = () => {
    const categories = Array.from(new Set(products.map(product => product.categoria).filter(Boolean)));
    return categories;
  };

  const handlePurchase = (product: Product) => {
    // Salvar mensagem de interesse no localStorage para ser enviada automaticamente
    const interestMessage = `Olá! Tenho interesse no produto "${product.nome}" (R$ ${product.preco.toFixed(2)}). Gostaria de saber mais informações sobre ele.`;
    
    localStorage.setItem('pendingChatMessage', interestMessage);
    localStorage.setItem('productInterest', JSON.stringify(product));
    
    // Mostrar toast de confirmação
    toast.success(`Redirecionando para o chat sobre "${product.nome}"`);
    
    // Registrar log da ação
    try {
      const logs = JSON.parse(localStorage.getItem('system-logs') || '[]');
      logs.unshift({
        id: Date.now().toString(),
        timestamp: new Date().toLocaleString('pt-BR'),
        userEmail: 'usuario@exemplo.com',
        action: 'Interesse em produto - Chat iniciado',
        details: `Usuário demonstrou interesse no produto: ${product.nome} e foi redirecionado ao chat`
      });
      localStorage.setItem('system-logs', JSON.stringify(logs));
    } catch (error) {
      console.error('Erro ao salvar log:', error);
    }
    
    // Redirecionar para o chat ao vivo
    setTimeout(() => {
      navigate('/suporte-ao-vivo');
    }, 1000);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando produtos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center">
            <ShoppingCart className="w-8 h-8 mr-3" />
            Loja Oficial
          </h1>
          <p className="text-muted-foreground mt-2">
            Explore nossos produtos e serviços disponíveis
          </p>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="w-5 h-5 mr-2" />
            Filtros de Busca
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Buscar produtos</label>
              <Input
                type="text"
                placeholder="Digite o nome do produto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Categoria</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 border border-input bg-background rounded-md"
              >
                <option value="todas">Todas as categorias</option>
                {getCategories().map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Produtos */}
      {filteredProducts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product) => (
            <Card key={product.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{product.nome}</CardTitle>
                    {product.categoria && (
                      <Badge variant="secondary" className="mt-2">
                        {product.categoria}
                      </Badge>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-primary">
                      R$ {product.preco.toFixed(2)}
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {product.descricao && (
                  <CardDescription className="text-sm">
                    {product.descricao}
                  </CardDescription>
                )}
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className="w-4 h-4 fill-yellow-400 text-yellow-400"
                      />
                    ))}
                    <span className="text-sm text-muted-foreground ml-2">
                      (5.0)
                    </span>
                  </div>
                  
                  <div className="text-xs text-muted-foreground">
                    Disponível desde {new Date(product.dataCriacao).toLocaleDateString('pt-BR')}
                  </div>
                </div>
                
                <Button 
                  onClick={() => handlePurchase(product)}
                  className="w-full"
                >
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  Tenho Interesse
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="text-center py-12">
            <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">
              {products.length === 0 
                ? 'Nenhum produto disponível' 
                : 'Nenhum produto encontrado'
              }
            </h3>
            <p className="text-muted-foreground">
              {products.length === 0
                ? 'Os produtos serão exibidos aqui quando estiverem disponíveis.'
                : 'Tente ajustar os filtros de busca para encontrar outros produtos.'
              }
            </p>
            {searchTerm || selectedCategory !== 'todas' ? (
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm('');
                  setSelectedCategory('todas');
                }}
                className="mt-4"
              >
                Limpar Filtros
              </Button>
            ) : null}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Produtos;
