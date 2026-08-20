import React, { useState, useEffect } from 'react';
import { ShoppingCart, ShoppingBag, Plus, Trash2, ArrowRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from '@/components/ui/sheet';
import { useNavigate } from 'react-router-dom';

interface Product {
  id: string;
  nome: string;
  preco: number;
  categoria: string;
  imagem?: string;
}

const DEMO_PRODUCTS: Product[] = [
  { id: '1', nome: 'Licença Aplicativo Premium', preco: 49.90, categoria: 'Apps' },
  { id: '2', nome: 'Suporte Técnico 24h', preco: 29.90, categoria: 'Serviços' },
  { id: '3', nome: 'Personalização de Interface', preco: 99.00, categoria: 'Personalização' },
];

const Produtos = () => {
  const navigate = useNavigate();
  const [cart, setCart] = useState<{ product: Product; quantity: number }[]>([]);

  // Carregar do localStorage
  useEffect(() => {
    const saved = localStorage.getItem('loja-carrinho');
    if (saved) {
      try {
        setCart(JSON.parse(saved));
      } catch (e) {}
    }
  }, []);

  // Salvar no localStorage
  useEffect(() => {
    localStorage.setItem('loja-carrinho', JSON.stringify(cart));
  }, [cart]);

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
    toast.success(`${product.nome} adicionado ao carrinho`);
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.product.id === productId) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const total = cart.reduce((sum, item) => sum + (item.product.preco * item.quantity), 0);

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Loja de Aplicativos</h1>
          <p className="text-muted-foreground">Escolha os melhores complementos para sua experiência.</p>
        </div>

        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="relative">
              <ShoppingCart className="w-5 h-5" />
              {cart.length > 0 && (
                <Badge className="absolute -top-2 -right-2 px-1.5 py-0.5 min-w-[20px] h-5 flex items-center justify-center bg-primary text-primary-foreground">
                  {cart.reduce((s, i) => s + i.quantity, 0)}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" />
                Seu Carrinho
              </SheetTitle>
            </SheetHeader>
            <div className="mt-8 space-y-4 overflow-y-auto max-h-[60vh] pr-2">
              {cart.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  Seu carrinho está vazio.
                </div>
              ) : (
                cart.map(item => (
                  <div key={item.product.id} className="flex items-center justify-between gap-4 border-b pb-4">
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">{item.product.nome}</h4>
                      <p className="text-xs text-muted-foreground">R$ {item.product.preco.toFixed(2)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQuantity(item.product.id, -1)}>-</Button>
                      <span className="text-sm w-4 text-center">{item.quantity}</span>
                      <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQuantity(item.product.id, 1)}>+</Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeFromCart(item.product.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
            {cart.length > 0 && (
              <SheetFooter className="mt-auto pt-6 flex-col items-stretch gap-4">
                <div className="flex justify-between items-center font-bold text-lg border-t pt-4">
                  <span>Total</span>
                  <span>R$ {total.toFixed(2)}</span>
                </div>
                <Button className="w-full gap-2" onClick={() => navigate('/carrinho')}>
                  Ver Carrinho Completo
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </SheetFooter>
            )}
          </SheetContent>
        </Sheet>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {DEMO_PRODUCTS.map(product => (
          <Card key={product.id} className="overflow-hidden group hover:shadow-md transition-all">
            <CardContent className="p-0">
              <div className="aspect-video bg-muted flex items-center justify-center">
                <ShoppingBag className="w-12 h-12 text-muted-foreground/50 group-hover:scale-110 transition-transform" />
              </div>
              <div className="p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <Badge variant="outline" className="mb-2">{product.categoria}</Badge>
                    <h3 className="font-semibold text-lg">{product.nome}</h3>
                  </div>
                  <span className="font-bold text-primary">R$ {product.preco.toFixed(2)}</span>
                </div>
                <Button 
                  onClick={() => addToCart(product)}
                  className="w-full gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Adicionar ao Carrinho
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Produtos;
