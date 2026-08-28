import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShoppingBag, 
  ShoppingCart, 
  Sparkles, 
  Download, 
  Check, 
  ShieldCheck, 
  Zap, 
  Database, 
  FileSpreadsheet, 
  CheckCircle2,
  Tv,
  Film,
  Eye,
  Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useSimpleAuth } from '@/contexts/SimpleAuthContext';
import { PRODUCTS_CATALOG, ProductItem } from '@/data/products';
import { SourceExportService } from '@/services/SourceExportService';
import { StorePixPaymentDialog } from '@/components/store/StorePixPaymentDialog';

const Produtos = () => {
  const navigate = useNavigate();
  const { userInfo } = useSimpleAuth();
  const [hasPurchasedFull, setHasPurchasedFull] = useState(false);
  const [selectedProductForPix, setSelectedProductForPix] = useState<ProductItem | null>(null);

  // Quantidade de itens no carrinho
  const [cartCount, setCartCount] = useState(0);

  const updateCartCount = () => {
    try {
      const savedCart = localStorage.getItem('loja-carrinho');
      if (savedCart) {
        const parsed = JSON.parse(savedCart);
        const count = parsed.reduce((sum: number, item: any) => sum + (item.quantity || 1), 0);
        setCartCount(count);
      } else {
        setCartCount(0);
      }
    } catch {
      setCartCount(0);
    }
  };

  const checkPurchases = async () => {
    if (!userInfo) return;
    try {
      const purchased = await SourceExportService.hasPurchasedFullExport(userInfo.id, userInfo.email);
      setHasPurchasedFull(purchased);
    } catch (e) {
      console.error('Erro ao checar compras:', e);
    }
  };

  useEffect(() => {
    checkPurchases();
    updateCartCount();
  }, [userInfo]);

  const handleAddToCart = (product: ProductItem, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const savedCart = localStorage.getItem('loja-carrinho');
      const cart: { product: any; quantity: number }[] = savedCart ? JSON.parse(savedCart) : [];
      
      const existingIndex = cart.findIndex(item => item.product.id === product.id);
      if (existingIndex > -1) {
        cart[existingIndex].quantity += 1;
      } else {
        cart.push({
          product: {
            id: product.id,
            nome: product.nome,
            preco: product.preco,
            categoria: product.categoria,
            descricao: product.descricao,
          },
          quantity: 1,
        });
      }

      localStorage.setItem('loja-carrinho', JSON.stringify(cart));
      updateCartCount();
      toast.success(`${product.nome} adicionado ao carrinho!`, {
        action: {
          label: 'Ver Carrinho',
          onClick: () => navigate('/carrinho'),
        },
      });
    } catch (err) {
      console.error('Erro ao adicionar ao carrinho:', err);
      toast.error('Erro ao adicionar ao carrinho.');
    }
  };

  return (
    <div className="space-y-8 pb-20 max-w-7xl mx-auto">
      {/* Header com Ícone do Carrinho */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b pb-6">
        <div>
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-extrabold tracking-tight">Loja Oficial do Painel</h1>
          </div>
          <p className="text-muted-foreground mt-1">
            Recursos exclusivos, pacotes de dados em massa e módulos para acelerar o seu catálogo.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            className="relative gap-2 font-medium"
            onClick={() => navigate('/carrinho')}
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Meu Carrinho</span>
            {cartCount > 0 && (
              <Badge className="bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded-full ml-1">
                {cartCount}
              </Badge>
            )}
          </Button>
        </div>
      </div>

      {/* Banner de Destaque para o Pacote de Carga Total */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/95 via-primary to-indigo-900 text-primary-foreground p-6 sm:p-8 shadow-xl">
        <div className="relative z-10 max-w-3xl space-y-4">
          <Badge className="bg-amber-400 text-amber-950 font-bold hover:bg-amber-300 border-0">
            🔥 DESTAQUE EXCLUSIVO
          </Badge>
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
            Carga Total do Painel (Acervo Completo)
          </h2>
          <p className="text-primary-foreground/90 text-sm sm:text-base leading-relaxed">
            Esqueça as limitações de importação lenta e requisições de API demoradas. Baixe todo o acervo de filmes, séries, novelas, animes e episódios sincronizados e formate seu catálogo no Baserow em minutos.
          </p>
          <div className="flex flex-wrap items-center gap-4 pt-2">
            <Button
              size="lg"
              className="bg-amber-400 hover:bg-amber-300 text-amber-950 font-bold shadow-lg shadow-amber-500/20 gap-2"
              onClick={() => navigate('/produto/source_csv_full')}
            >
              <Eye className="w-4 h-4" />
              Ver Detalhes do Produto
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="bg-primary-foreground/10 hover:bg-primary-foreground/20 text-primary-foreground border-white/20"
              onClick={() => navigate('/carrinho')}
            >
              <ShoppingCart className="w-4 h-4 mr-2" />
              Acessar Carrinho
            </Button>
          </div>
        </div>
        <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none translate-x-12 translate-y-12">
          <Database className="w-96 h-96" />
        </div>
      </div>

      {/* Grid de Produtos */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold tracking-tight">Catálogo de Produtos & Módulos</h3>
          <span className="text-xs text-muted-foreground">{PRODUCTS_CATALOG.length} produtos disponíveis</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {PRODUCTS_CATALOG.map((prod) => {
            const isFullCsv = prod.id === 'source_csv_full';
            const isUserPurchased = isFullCsv && hasPurchasedFull;

            return (
              <Card 
                key={prod.id}
                className="flex flex-col justify-between overflow-hidden border-border/60 hover:border-primary/40 transition-all duration-300 hover:shadow-md cursor-pointer group"
                onClick={() => navigate(`/produto/${prod.id}`)}
              >
                <div>
                  {/* Header do Card */}
                  <CardHeader className="space-y-2 pb-3">
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="outline" className="text-[10px] uppercase font-semibold">
                        {prod.categoria}
                      </Badge>
                      {prod.badge && (
                        <Badge className={`bg-gradient-to-r ${prod.badgeColor || 'from-amber-500 to-orange-500'} text-white border-0 text-[10px] font-bold`}>
                          {prod.badge}
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="text-lg font-bold group-hover:text-primary transition-colors">
                      {prod.nome}
                    </CardTitle>
                    <CardDescription className="text-xs line-clamp-2">
                      {prod.subtitulo}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-4 text-xs text-muted-foreground pb-4">
                    <p className="line-clamp-3 leading-relaxed">
                      {prod.descricao}
                    </p>

                    {/* Lista rápida de benefícios */}
                    <div className="space-y-1.5 pt-1">
                      {prod.beneficios.slice(0, 2).map((b, idx) => (
                        <div key={idx} className="flex items-center gap-1.5 text-foreground font-medium">
                          <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          <span className="truncate">{b.title}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </div>

                <CardFooter className="pt-3 border-t bg-muted/20 flex flex-col gap-3">
                  <div className="flex items-baseline justify-between w-full">
                    <div>
                      <span className="text-xs text-muted-foreground">Valor avulso:</span>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-xl font-extrabold text-foreground">
                          R$ {prod.preco.toFixed(2).replace('.', ',')}
                        </span>
                        {prod.precoOriginal && (
                          <span className="text-[11px] line-through text-muted-foreground">
                            R$ {prod.precoOriginal.toFixed(2).replace('.', ',')}
                          </span>
                        )}
                      </div>
                    </div>

                    {isUserPurchased ? (
                      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-xs font-semibold">
                        ✓ Comprado
                      </Badge>
                    ) : null}
                  </div>

                  <div className="grid grid-cols-2 gap-2 w-full">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full text-xs font-medium gap-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/produto/${prod.id}`);
                      }}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Detalhes
                    </Button>

                    <Button 
                      size="sm" 
                      className="w-full text-xs font-semibold gap-1"
                      onClick={(e) => handleAddToCart(prod, e)}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Ao Carrinho
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Modal de Pagamento Rápido PIX se necessário */}
      {selectedProductForPix && (
        <StorePixPaymentDialog
          isOpen={!!selectedProductForPix}
          onOpenChange={(open) => !open && setSelectedProductForPix(null)}
          productTitle={selectedProductForPix.nome}
          productPrice={selectedProductForPix.preco}
          productDescription={selectedProductForPix.descricao}
          productId={selectedProductForPix.id}
          onSuccess={() => {
            checkPurchases();
            setSelectedProductForPix(null);
          }}
        />
      )}
    </div>
  );
};

export default Produtos;
