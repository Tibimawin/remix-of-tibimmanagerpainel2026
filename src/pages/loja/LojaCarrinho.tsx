import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  ArrowLeft,
  ArrowRight,
  ShoppingBag,
  ShieldCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { LojaLayout } from '@/components/loja/LojaLayout';
import { useLojaCart } from '@/contexts/LojaCartContext';
import { LojaService, LojaConfig, DEFAULT_LOJA_CONFIG } from '@/services/LojaService';

const LojaCarrinho: React.FC = () => {
  const navigate = useNavigate();
  const { items, totalItems, subtotal, updateQuantity, removeItem, clearCart } = useLojaCart();
  const [config, setConfig] = useState<LojaConfig>(DEFAULT_LOJA_CONFIG);

  useEffect(() => {
    const unsub = LojaService.subscribeConfig(setConfig);
    return () => unsub();
  }, []);

  return (
    <LojaLayout>
      <div className="container mx-auto max-w-6xl px-4 py-10">
        <div className="flex items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/loja')}
              className="text-white/70 hover:text-white"
            >
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Continuar Comprando
            </Button>
          </div>
          {items.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearCart}
              className="text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" /> Limpar Carrinho
            </Button>
          )}
        </div>

        <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-3 mb-6">
          <ShoppingCart className="w-7 h-7" style={{ color: config.corDestaque }} />
          Seu Carrinho ({totalItems})
        </h1>

        {items.length === 0 ? (
          <Card className="bg-[#0B0E16] border-white/10 text-white p-12 text-center">
            <ShoppingBag className="w-16 h-16 text-white/20 mx-auto mb-4" />
            <h2 className="text-xl font-bold">Seu carrinho está vazio</h2>
            <p className="text-sm text-white/50 mt-2 max-w-md mx-auto">
              Navegue pela vitrine da {config.nomeLoja} e escolha os aplicativos ou serviços perfeitos para o seu negócio.
            </p>
            <Button
              size="lg"
              className="mt-6 font-black text-white"
              style={{ backgroundColor: config.corDestaque || '#e50914' }}
              onClick={() => navigate('/loja')}
            >
              Explorar Produtos
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Lista de Itens */}
            <div className="lg:col-span-8 space-y-4">
              {items.map(({ product, quantity }) => (
                <Card key={product.id} className="bg-[#0B0E16] border-white/10 text-white overflow-hidden">
                  <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row items-center gap-4">
                    <div
                      onClick={() => navigate(`/loja/produto/${product.id}`)}
                      className="w-full sm:w-28 h-24 rounded-xl overflow-hidden bg-black border border-white/10 flex-shrink-0 cursor-pointer"
                    >
                      {product.imagemPrincipal ? (
                        <img
                          src={product.imagemPrincipal}
                          alt={product.nome}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ShoppingBag className="w-6 h-6 text-white/25" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0 text-center sm:text-left">
                      <span className="text-[10px] font-bold uppercase text-white/50">
                        {product.categoria}
                      </span>
                      <h3
                        onClick={() => navigate(`/loja/produto/${product.id}`)}
                        className="text-base font-black text-white hover:text-primary transition-colors cursor-pointer"
                      >
                        {product.nome}
                      </h3>
                      <p className="text-xs text-white/50 mt-0.5 line-clamp-1">
                        {product.subtitulo || product.descricao}
                      </p>
                      <div className="text-sm font-bold text-emerald-400 mt-2">
                        R$ {product.preco.toFixed(2).replace('.', ',')} / un.
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-lg p-1">
                        <button
                          onClick={() => updateQuantity(product.id, -1)}
                          className="w-7 h-7 rounded hover:bg-white/10 flex items-center justify-center"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-6 text-center text-sm font-black">{quantity}</span>
                        <button
                          onClick={() => updateQuantity(product.id, 1)}
                          className="w-7 h-7 rounded hover:bg-white/10 flex items-center justify-center"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="text-right min-w-[90px]">
                        <span className="text-base font-black text-white">
                          R$ {(product.preco * quantity).toFixed(2).replace('.', ',')}
                        </span>
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(product.id)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Resumo */}
            <div className="lg:col-span-4 lg:sticky lg:top-24">
              <Card className="bg-[#0B0E16] border-white/15 text-white">
                <CardHeader className="border-b border-white/10 pb-4">
                  <CardTitle className="text-lg font-black">Resumo do Pedido</CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-3 text-sm">
                  <div className="flex justify-between text-white/70">
                    <span>Itens ({totalItems})</span>
                    <span>R$ {subtotal.toFixed(2).replace('.', ',')}</span>
                  </div>
                  <div className="flex justify-between text-white/70">
                    <span>Entrega Digital / Personalização</span>
                    <span className="text-emerald-400 font-bold">Incluso</span>
                  </div>
                  <Separator className="bg-white/10 my-2" />
                  <div className="flex justify-between items-center text-lg font-black">
                    <span>Total</span>
                    <span className="text-2xl text-emerald-400">
                      R$ {subtotal.toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                </CardContent>
                <CardFooter className="flex-col gap-3 pt-2">
                  <Button
                    size="lg"
                    className="w-full h-12 font-black text-white shadow-xl"
                    style={{ backgroundColor: config.corDestaque || '#e50914' }}
                    onClick={() => navigate('/loja/checkout')}
                  >
                    Finalizar Pedido <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                  <div className="flex items-center justify-center gap-1.5 text-[11px] text-white/50">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Atendimento rápido e compra segura</span>
                  </div>
                </CardFooter>
              </Card>
            </div>
          </div>
        )}
      </div>
    </LojaLayout>
  );
};

export default LojaCarrinho;
