import React, { useState, useEffect } from 'react';
import { ShoppingCart, Trash2, ArrowLeft, CreditCard, ShoppingBag, Plus, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Separator } from '@/components/ui/separator';

interface Product {
  id: string;
  nome: string;
  preco: number;
  categoria: string;
  imagem?: string;
  descricao?: string;
}

const Carrinho = () => {
  const navigate = useNavigate();
  const [cart, setCart] = useState<{ product: Product; quantity: number }[]>([]);

  // Carregar do localStorage na inicialização
  useEffect(() => {
    const savedCart = localStorage.getItem('loja-carrinho');
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch (e) {
        console.error('Erro ao carregar carrinho:', e);
      }
    }
  }, []);

  // Salvar no localStorage sempre que o carrinho mudar
  useEffect(() => {
    localStorage.setItem('loja-carrinho', JSON.stringify(cart));
  }, [cart]);

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.product.id === productId) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
    toast.error('Item removido do carrinho');
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.product.preco * item.quantity), 0);
  const total = subtotal; // Pode adicionar taxas futuramente

  if (cart.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
        <div className="bg-muted p-8 rounded-full">
          <ShoppingCart className="w-16 h-16 text-muted-foreground" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight">Seu carrinho está vazio</h2>
          <p className="text-muted-foreground max-w-sm mx-auto">
            Você ainda não adicionou nenhum item à sua sacola. Explore nossa loja e encontre os melhores aplicativos!
          </p>
        </div>
        <Button onClick={() => navigate('/produtos')} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Voltar para a Loja
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/produtos')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Meu Carrinho</h1>
            <p className="text-muted-foreground">Confira os itens selecionados e finalize seu pedido.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Lista de Itens */}
        <div className="lg:col-span-2 space-y-4">
          {cart.map((item) => (
            <Card key={item.product.id} className="overflow-hidden border-border/50 hover:border-primary/20 transition-colors">
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  {/* Imagem Placeholder */}
                  <div className="w-24 h-24 bg-muted rounded-xl flex items-center justify-center shrink-0">
                    <ShoppingBag className="w-8 h-8 text-muted-foreground/50" />
                  </div>
                  
                  {/* Detalhes do Produto */}
                  <div className="flex-1 text-center sm:text-left space-y-1">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div>
                        <Badge variant="outline" className="text-[10px] uppercase tracking-wider mb-1">
                          {item.product.categoria}
                        </Badge>
                        <h3 className="font-semibold text-lg">{item.product.nome}</h3>
                      </div>
                      <div className="text-xl font-bold text-primary">
                        R$ {(item.product.preco * item.quantity).toFixed(2)}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-1">
                      {item.product.descricao || 'Produto digital de alta qualidade para seu painel.'}
                    </p>
                  </div>

                  {/* Controles de Quantidade e Remoção */}
                  <div className="flex flex-col items-center gap-4">
                    <div className="flex items-center bg-muted/50 rounded-lg p-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 rounded-md" 
                        onClick={() => updateQuantity(item.product.id, -1)}
                      >
                        <Minus className="w-3 h-3" />
                      </Button>
                      <span className="w-10 text-center font-medium">{item.quantity}</span>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 rounded-md" 
                        onClick={() => updateQuantity(item.product.id, 1)}
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-2 h-8"
                      onClick={() => removeFromCart(item.product.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                      Remover
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Resumo do Pedido */}
        <div className="space-y-6">
          <Card className="sticky top-24 border-primary/10 shadow-lg shadow-primary/5">
            <CardHeader>
              <CardTitle>Resumo do Pedido</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>R$ {subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Descontos</span>
                <span className="text-emerald-500">- R$ 0,00</span>
              </div>
              <Separator />
              <div className="flex justify-between items-center pt-2">
                <span className="font-bold text-lg">Total</span>
                <span className="font-bold text-2xl text-primary">R$ {total.toFixed(2)}</span>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-3">
              <Button 
                onClick={() => navigate('/checkout')}
                className="w-full h-12 text-lg font-semibold gap-2 shadow-md shadow-primary/20"
              >
                <CreditCard className="w-5 h-5" />
                Finalizar Compra
              </Button>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => navigate('/produtos')}
              >
                Continuar Comprando
              </Button>
            </CardFooter>
          </Card>
          
          {/* Informações Extras */}
          <div className="bg-muted/30 p-4 rounded-xl border border-dashed text-center">
            <p className="text-xs text-muted-foreground">
              Ambiente de pagamento 100% seguro.
              Liberação imediata após a confirmação.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Carrinho;
