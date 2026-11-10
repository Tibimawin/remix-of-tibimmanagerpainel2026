import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  ShoppingCart,
  Eye,
  Sparkles,
  Image as ImageIcon,
  Monitor,
  Smartphone,
  Tv,
  ArrowRight,
  CheckCircle2,
  Package,
  Flame
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { LojaLayout } from '@/components/loja/LojaLayout';
import { LojaService, LojaProduto, LojaConfig, DEFAULT_LOJA_CONFIG } from '@/services/LojaService';
import { useLojaCart } from '@/contexts/LojaCartContext';
import { cn } from '@/lib/utils';

const LojaHome: React.FC = () => {
  const navigate = useNavigate();
  const { addItem } = useLojaCart();
  const [products, setProducts] = useState<LojaProduto[]>([]);
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<LojaConfig>(DEFAULT_LOJA_CONFIG);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');

  useEffect(() => {
    document.title = `${config.nomeLoja} - Loja Oficial`;
  }, [config.nomeLoja]);

  useEffect(() => {
    const unsubCfg = LojaService.subscribeConfig(setConfig);
    const unsubProds = LojaService.subscribeProducts((items) => {
      setProducts(items);
      setLoading(false);
    }, true);

    return () => {
      unsubCfg();
      unsubProds();
    };
  }, []);

  const categories = useMemo(() => {
    const cats = Array.from(new Set(products.map((p) => p.categoria).filter(Boolean)));
    return ['Todos', ...cats];
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesCat = selectedCategory === 'Todos' || p.categoria === selectedCategory;
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        p.nome.toLowerCase().includes(q) ||
        p.subtitulo.toLowerCase().includes(q) ||
        p.descricao.toLowerCase().includes(q) ||
        p.categoria.toLowerCase().includes(q);
      return matchesCat && matchesSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  const scrollToCatalog = () => {
    const el = document.getElementById('catalogo-loja');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <LojaLayout>
      {/* Hero Banner Showcase */}
      <section className="relative overflow-hidden border-b border-white/10 bg-[#07090F]">
        <div
          className="absolute inset-0 opacity-40 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(rgba(255,255,255,0.08) 1px, transparent 1px)',
            backgroundSize: '26px 26px'
          }}
        />
        <div
          className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[420px] rounded-full opacity-25 blur-[130px] pointer-events-none"
          style={{ backgroundColor: config.corDestaque || '#e50914' }}
        />

        <div className="container mx-auto max-w-7xl px-4 py-12 sm:py-16 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/15 text-xs font-bold uppercase tracking-wider text-white/90 mb-5 backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Vitrine Oficial • Apps Mobile, TV & Produtos Digitais</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white max-w-4xl mx-auto leading-[1.08]">
            {config.heroTitulo}
          </h1>

          <p className="text-sm sm:text-lg text-white/65 max-w-2xl mx-auto mt-4 leading-relaxed">
            {config.heroSubtitulo}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 mt-7">
            <Button
              size="lg"
              onClick={scrollToCatalog}
              className="h-12 px-8 font-black text-sm text-white shadow-xl transition-transform hover:scale-105"
              style={{ backgroundColor: config.corDestaque || '#e50914' }}
            >
              Explorar Produtos e Layouts
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>

          {/* Atalhos visuais de plataformas */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl mx-auto mt-10">
            {[
              { icon: Smartphone, title: 'Apps Celular Android', cat: 'App Celular Android' },
              { icon: Tv, title: 'Apps TV Box & Smart', cat: 'App Android TV / Box' },
              { icon: Monitor, title: 'Painéis & Sistemas', cat: 'Painel Web / Sistema' },
              { icon: Sparkles, title: 'Ver Tudo na Loja', cat: 'Todos' }
            ].map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.title}
                  onClick={() => {
                    if (item.cat === 'Todos' || categories.includes(item.cat)) {
                      setSelectedCategory(item.cat);
                    } else {
                      setSelectedCategory('Todos');
                    }
                    scrollToCatalog();
                  }}
                  className="flex items-center gap-2.5 p-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 transition-all text-left group"
                >
                  <div className="p-2 rounded-lg bg-white/5 border border-white/10 text-white/80 group-hover:text-white shrink-0">
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-white/85 group-hover:text-white leading-tight">
                    {item.title}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 mt-8 text-xs text-white/50 font-medium">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Amostra real das telas
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Personalizado com sua marca
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Suporte direto via WhatsApp
            </span>
          </div>
        </div>
      </section>

      {/* Catálogo de Produtos */}
      <section id="catalogo-loja" className="container mx-auto max-w-7xl px-4 pt-10 pb-8">
        {/* Barra de Busca e Filtros */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 no-scrollbar">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  'px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all border',
                  selectedCategory === cat
                    ? 'text-white border-transparent shadow-md'
                    : 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10'
                )}
                style={
                  selectedCategory === cat
                    ? { backgroundColor: config.corDestaque || '#e50914' }
                    : undefined
                }
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar app, painel ou serviço..."
              className="pl-9 bg-white/5 border-white/15 text-white placeholder:text-white/40 h-10 rounded-xl"
            />
          </div>
        </div>

        {/* Loading Skeleton */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="rounded-2xl border border-white/10 bg-white/5 h-[420px] animate-pulse"
              />
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-14 text-center">
            <Package className="w-12 h-12 text-white/25 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-white">Nenhum produto encontrado</h3>
            <p className="text-xs text-white/50 mt-1 max-w-md mx-auto">
              {products.length === 0
                ? 'Os produtos cadastrados no Painel Administrativo aparecerão aqui automaticamente.'
                : 'Tente limpar a busca ou selecionar outra categoria.'}
            </p>
            {(searchQuery || selectedCategory !== 'Todos') && (
              <Button
                variant="outline"
                size="sm"
                className="mt-4 border-white/20"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('Todos');
                }}
              >
                Mostrar Todos
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map((product) => {
              const screensCount =
                (product.galeriaImagens?.length || 0) > 0
                  ? product.galeriaImagens.length
                  : product.imagemPrincipal
                  ? 1
                  : 0;

              const discountPct =
                product.precoOriginal && product.precoOriginal > product.preco
                  ? Math.round(((product.precoOriginal - product.preco) / product.precoOriginal) * 100)
                  : 0;

              return (
                <div
                  key={product.id}
                  className="group rounded-2xl border border-white/10 bg-[#0B0E16] hover:border-white/25 overflow-hidden flex flex-col transition-all duration-300 hover:-translate-y-1 shadow-xl"
                >
                  {/* Imagem Principal / Capa com Prévia de Telas */}
                  <div
                    onClick={() => navigate(`/loja/produto/${product.id}`)}
                    className="relative aspect-[16/10] bg-neutral-900 overflow-hidden cursor-pointer"
                  >
                    {product.imagemPrincipal ? (
                      <img
                        src={product.imagemPrincipal}
                        alt={product.nome}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-neutral-900 to-black text-white/30">
                        <ImageIcon className="w-10 h-10 mb-1" />
                        <span className="text-xs">Sem imagem</span>
                      </div>
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-[#0B0E16] via-transparent to-black/30" />

                    {/* Top Badges */}
                    <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        {product.destaque && (
                          <Badge className="bg-amber-500 text-black font-black text-[10px] border-none shadow-md">
                            <Flame className="w-3 h-3 mr-1" /> DESTAQUE
                          </Badge>
                        )}
                        {product.badge && (
                          <Badge
                            className="text-white font-black text-[10px] border-none shadow-md"
                            style={{ backgroundColor: config.corDestaque || '#e50914' }}
                          >
                            {product.badge}
                          </Badge>
                        )}
                      </div>
                      {discountPct > 0 && (
                        <Badge className="bg-emerald-600 text-white font-black text-[10px] border-none shadow-md">
                          -{discountPct}% OFF
                        </Badge>
                      )}
                    </div>

                    {/* Screen Count Pill */}
                    {screensCount > 0 && (
                      <div className="absolute bottom-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/75 backdrop-blur-md border border-white/15 text-[10px] font-bold text-white/90">
                        <ImageIcon className="w-3 h-3 text-amber-400" />
                        <span>
                          {screensCount} {screensCount === 1 ? 'foto de layout' : 'telas de layout'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Corpo do Card */}
                  <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span
                          className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-white/5 border border-white/10"
                          style={{ color: config.corDestaque || '#f87171' }}
                        >
                          {product.categoria}
                        </span>
                      </div>

                      <h3
                        onClick={() => navigate(`/loja/produto/${product.id}`)}
                        className="text-lg font-black text-white leading-snug cursor-pointer hover:text-primary transition-colors line-clamp-2"
                      >
                        {product.nome}
                      </h3>

                      <p className="text-xs text-white/60 mt-2 line-clamp-2 leading-relaxed">
                        {product.subtitulo || product.descricao}
                      </p>

                      {/* Chips dinâmicos de compatibilidade */}
                      {product.compatibilidade && product.compatibilidade.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-3">
                          {product.compatibilidade.slice(0, 3).map((comp) => (
                            <span
                              key={comp}
                              className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/10 text-white/75"
                            >
                              {comp}
                            </span>
                          ))}
                          {product.compatibilidade.length > 3 && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 text-white/45">
                              +{product.compatibilidade.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-white/10 space-y-3">
                      <div className="flex items-end justify-between">
                        <div>
                          {product.precoOriginal && product.precoOriginal > product.preco && (
                            <span className="text-xs text-white/40 line-through block">
                              De R$ {product.precoOriginal.toFixed(2).replace('.', ',')}
                            </span>
                          )}
                          <div className="text-2xl font-black text-white">
                            R$ {product.preco.toFixed(2).replace('.', ',')}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-5 gap-2">
                        <Button
                          variant="outline"
                          onClick={() => navigate(`/loja/produto/${product.id}`)}
                          className="col-span-3 border-white/15 bg-white/5 hover:bg-white/10 text-white font-bold text-xs h-10"
                        >
                          <Eye className="w-3.5 h-3.5 mr-1.5" />
                          Ver Detalhes
                        </Button>
                        <Button
                          onClick={() => addItem(product, 1)}
                          className="col-span-2 text-white font-black text-xs h-10 shadow-md"
                          style={{ backgroundColor: config.corDestaque || '#e50914' }}
                        >
                          <ShoppingCart className="w-3.5 h-3.5 mr-1" />
                          Comprar
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </LojaLayout>
  );
};

export default LojaHome;
