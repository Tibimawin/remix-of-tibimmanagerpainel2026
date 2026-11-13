import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  ShoppingCart,
  ShoppingBag,
  Sparkles,
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  ShieldCheck,
  Zap,
  MessageCircle,
  Lock,
  ExternalLink,
  Key
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { useLojaCart } from '@/contexts/LojaCartContext';
import { LojaService, LojaConfig, DEFAULT_LOJA_CONFIG } from '@/services/LojaService';

interface LojaLayoutProps {
  children: React.ReactNode;
}

export const LojaLayout: React.FC<LojaLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { items, totalItems, subtotal, updateQuantity, removeItem, isDrawerOpen, setIsDrawerOpen } = useLojaCart();
  const [config, setConfig] = useState<LojaConfig>(DEFAULT_LOJA_CONFIG);
  const [whatsappNumber, setWhatsappNumber] = useState(DEFAULT_LOJA_CONFIG.whatsappVendas);

  useEffect(() => {
    const unsub = LojaService.subscribeConfig((cfg) => {
      setConfig(cfg);
      setWhatsappNumber(cfg.whatsappVendas || DEFAULT_LOJA_CONFIG.whatsappVendas);
    });
    return () => unsub();
  }, []);

  const openWhatsappSupport = () => {
    const text = encodeURIComponent(`Olá! Vim pela loja ${config.nomeLoja} e gostaria de tirar uma dúvida sobre os produtos.`);
    window.open(LojaService.formatWhatsappUrl(whatsappNumber, text), '_blank');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#06070B] text-white font-sans selection:bg-primary/30">
      {/* Navbar Fixa e Independente */}
      <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-[#06070B]/85 backdrop-blur-xl">
        <div className="container mx-auto max-w-7xl px-4 h-16 flex items-center justify-between gap-4">
          {/* Logo / Nome da Loja */}
          <Link to="/loja" className="flex items-center gap-3 group">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-105"
              style={{
                background: `linear-gradient(135deg, ${config.corDestaque || '#e50914'} 0%, #991b1b 100%)`
              }}
            >
              <ShoppingBag className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="font-black text-lg tracking-tight leading-none text-white flex items-center gap-1.5">
                {config.nomeLoja}
                <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-white/20 text-white/70 font-bold uppercase hidden sm:inline-flex">
                  OFICIAL
                </Badge>
              </span>
              <span className="text-[11px] text-white/50 hidden sm:block truncate max-w-[260px]">
                {config.slogan}
              </span>
            </div>
          </Link>

          {/* Menu e Ações */}
          <div className="flex items-center gap-2 sm:gap-3">
            <Link to="/loja">
              <Button
                variant={location.pathname === '/loja' ? 'secondary' : 'ghost'}
                size="sm"
                className="text-xs font-semibold hidden md:inline-flex"
              >
                Catálogo
              </Button>
            </Link>

            {whatsappNumber && (
              <Button
                variant="ghost"
                size="sm"
                onClick={openWhatsappSupport}
                className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 hidden sm:inline-flex"
              >
                <MessageCircle className="w-4 h-4 mr-1.5" />
                Atendimento
              </Button>
            )}

            {/* Carrinho Trigger */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDrawerOpen(true)}
              className="relative border-white/15 bg-white/5 hover:bg-white/10 text-white font-bold h-9 px-3.5"
            >
              <ShoppingCart className="w-4 h-4 mr-2 text-primary" style={{ color: config.corDestaque }} />
              <span className="text-xs">Carrinho</span>
              {totalItems > 0 && (
                <span
                  className="ml-2 px-1.5 py-0.5 text-[10px] font-black rounded-full text-white min-w-[18px] text-center"
                  style={{ backgroundColor: config.corDestaque || '#e50914' }}
                >
                  {totalItems}
                </span>
              )}
            </Button>

            <Link to="/loja/licenca" title="Consultar Chave de Licença ou Baixar Meus Apps">
              <Button
                variant={location.pathname === '/loja/licenca' ? 'secondary' : 'outline'}
                size="sm"
                className="text-xs font-bold border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 h-9 px-3"
              >
                <Key className="w-3.5 h-3.5 mr-1.5 text-amber-400" />
                <span className="hidden sm:inline">Meus Apps / </span>Licença
              </Button>
            </Link>

            <Link to="/login" title="Acessar Painel do Cliente">
              <Button variant="ghost" size="sm" className="text-xs text-white/60 hover:text-white px-2.5 hidden sm:inline-flex">
                <Lock className="w-3.5 h-3.5 mr-1.5" />
                Painel
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Conteúdo Principal da Loja */}
      <main className="flex-1">
        {children}
      </main>

      {/* Rodapé Profissional */}
      <footer className="border-t border-white/10 bg-[#040508] py-10 mt-16">
        <div className="container mx-auto max-w-7xl px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-8 border-b border-white/10">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-lg bg-white/5 border border-white/10">
                <Zap className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Entrega Rápida & Suporte</h4>
                <p className="text-xs text-white/50 mt-0.5">{config.textoGarantia}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-lg bg-white/5 border border-white/10">
                <Sparkles className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Layouts Exclusivos</h4>
                <p className="text-xs text-white/50 mt-0.5">Interfaces modernas testadas em TV Box, Smart TV, Fire Stick e Celular.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-lg bg-white/5 border border-white/10">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Compra 100% Segura</h4>
                <p className="text-xs text-white/50 mt-0.5">Pagamento facilitado via PIX ou atendimento personalizado via WhatsApp.</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 text-xs text-white/40">
            <span>© {new Date().getFullYear()} {config.nomeLoja}. Todos os direitos reservados.</span>
            <div className="flex items-center gap-4">
              <Link to="/loja" className="hover:text-white transition-colors">Vitrine</Link>
              <Link to="/loja/licenca" className="hover:text-amber-400 transition-colors text-amber-300 font-bold flex items-center gap-1">
                <Key className="w-3 h-3 text-amber-400" />
                Meus Apps / Licença
              </Link>
              <Link to="/loja/carrinho" className="hover:text-white transition-colors">Carrinho</Link>
              <Link to="/login" className="hover:text-white transition-colors inline-flex items-center gap-1">
                Área do Cliente <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>
      </footer>

      {/* Botão Flutuante WhatsApp */}
      {whatsappNumber && (
        <button
          onClick={openWhatsappSupport}
          className="fixed bottom-5 right-5 z-40 w-13 h-13 p-3.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white shadow-xl shadow-emerald-600/30 transition-transform hover:scale-110 flex items-center justify-center"
          title="Falar com Vendas no WhatsApp"
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      )}

      {/* Gaveta Lateral do Carrinho (Slide-over Drawer) */}
      <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <SheetContent className="bg-[#0A0D14] border-l border-white/10 text-white w-full sm:max-w-md flex flex-col">
          <SheetHeader className="pb-4 border-b border-white/10">
            <SheetTitle className="text-white flex items-center gap-2 font-black">
              <ShoppingCart className="w-5 h-5" style={{ color: config.corDestaque }} />
              Seu Carrinho ({totalItems})
            </SheetTitle>
            <SheetDescription className="text-white/50 text-xs">
              Revise os aplicativos e produtos selecionados antes de finalizar.
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto py-4 space-y-3 custom-scrollbar">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center px-4">
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-3">
                  <ShoppingBag className="w-8 h-8 text-white/30" />
                </div>
                <p className="text-sm font-bold text-white/80">Seu carrinho está vazio</p>
                <p className="text-xs text-white/40 mt-1">Explore o catálogo e adicione aplicativos ou soluções.</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4 border-white/20"
                  onClick={() => {
                    setIsDrawerOpen(false);
                    navigate('/loja');
                  }}
                >
                  Explorar Catálogo
                </Button>
              </div>
            ) : (
              items.map(({ product, quantity }) => (
                <div
                  key={product.id}
                  className="flex gap-3 p-3 rounded-xl bg-white/5 border border-white/10"
                >
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-black/60 border border-white/10 flex-shrink-0">
                    {product.imagemPrincipal ? (
                      <img src={product.imagemPrincipal} alt={product.nome} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ShoppingBag className="w-5 h-5 text-white/30" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-white truncate">{product.nome}</h4>
                    <p className="text-[10px] text-white/50">{product.categoria}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-sm font-black text-emerald-400">
                        R$ {(product.preco * quantity).toFixed(2).replace('.', ',')}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => updateQuantity(product.id, -1)}
                          className="w-6 h-6 rounded bg-white/10 hover:bg-white/20 flex items-center justify-center"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-xs font-bold w-4 text-center">{quantity}</span>
                        <button
                          onClick={() => updateQuantity(product.id, 1)}
                          className="w-6 h-6 rounded bg-white/10 hover:bg-white/20 flex items-center justify-center"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => removeItem(product.id)}
                          className="w-6 h-6 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 flex items-center justify-center ml-1"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {items.length > 0 && (
            <div className="pt-4 border-t border-white/10 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/60">Total do Pedido:</span>
                <span className="text-xl font-black text-white">
                  R$ {subtotal.toFixed(2).replace('.', ',')}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  className="border-white/15 bg-white/5 hover:bg-white/10 text-white text-xs font-bold"
                  onClick={() => {
                    setIsDrawerOpen(false);
                    navigate('/loja/carrinho');
                  }}
                >
                  Ver Carrinho
                </Button>
                <Button
                  className="text-white text-xs font-black"
                  style={{ backgroundColor: config.corDestaque || '#e50914' }}
                  onClick={() => {
                    setIsDrawerOpen(false);
                    navigate('/loja/checkout');
                  }}
                >
                  Finalizar <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};
