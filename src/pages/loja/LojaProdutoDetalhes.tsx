import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  ShoppingCart,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  X,
  MessageCircle,
  ShieldCheck,
  Zap,
  PlayCircle,
  Image as ImageIcon,
  Layers,
  Cpu,
  Flame,
  Download
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { LojaLayout } from '@/components/loja/LojaLayout';
import { LojaService, LojaProduto, LojaConfig, DEFAULT_LOJA_CONFIG } from '@/services/LojaService';
import { useLojaCart } from '@/contexts/LojaCartContext';
import { cn } from '@/lib/utils';

const getEmbedUrl = (url: string): string | null => {
  if (!url) return null;
  const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (ytMatch && ytMatch[1]) {
    return `https://www.youtube.com/embed/${ytMatch[1]}`;
  }
  return url;
};

const LojaProdutoDetalhes: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addItem } = useLojaCart();

  const [product, setProduct] = useState<LojaProduto | null>(null);
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<LojaConfig>(DEFAULT_LOJA_CONFIG);
  const [whatsappNumber, setWhatsappNumber] = useState(DEFAULT_LOJA_CONFIG.whatsappVendas);

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [showVideo, setShowVideo] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const unsubCfg = LojaService.subscribeConfig((cfg) => {
      setConfig(cfg);
      setWhatsappNumber(cfg.whatsappVendas || DEFAULT_LOJA_CONFIG.whatsappVendas);
    });

    if (id) {
      setLoading(true);
      LojaService.getProductById(id).then((found) => {
        setProduct(found);
        setActiveImageIndex(0);
        setShowVideo(false);
        setLoading(false);
        if (found) {
          document.title = `${found.nome} | ${config.nomeLoja}`;
        }
      });
    }

    return () => unsubCfg();
  }, [id]);

  // Combinar imagemPrincipal + galeriaImagens sem duplicatas
  const allImages = useMemo(() => {
    if (!product) return [];
    const list: string[] = [];
    if (product.imagemPrincipal) list.push(product.imagemPrincipal);
    if (Array.isArray(product.galeriaImagens)) {
      product.galeriaImagens.forEach((img) => {
        if (img && !list.includes(img)) list.push(img);
      });
    }
    return list;
  }, [product]);

  const handlePrevImage = () => {
    if (allImages.length <= 1) return;
    setActiveImageIndex((prev) => (prev === 0 ? allImages.length - 1 : prev - 1));
  };

  const handleNextImage = () => {
    if (allImages.length <= 1) return;
    setActiveImageIndex((prev) => (prev === allImages.length - 1 ? 0 : prev + 1));
  };

  const handleBuyNow = () => {
    if (!product) return;
    addItem(product, 1);
    navigate('/loja/checkout');
  };

  const handleWhatsappDoubt = () => {
    if (!product) return;
    const msg = encodeURIComponent(
      `Olá! Estou vendo o produto "${product.nome}" (R$ ${product.preco.toFixed(2).replace('.', ',')}) na ${config.nomeLoja} e gostaria de mais informações.`
    );
    window.open(LojaService.formatWhatsappUrl(whatsappNumber, msg), '_blank');
  };

  if (loading) {
    return (
      <LojaLayout>
        <div className="container mx-auto max-w-7xl px-4 py-12">
          <div className="h-8 w-40 bg-white/10 rounded animate-pulse mb-8" />
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-7 h-[450px] bg-white/5 rounded-2xl animate-pulse" />
            <div className="lg:col-span-5 h-[450px] bg-white/5 rounded-2xl animate-pulse" />
          </div>
        </div>
      </LojaLayout>
    );
  }

  if (!product) {
    return (
      <LojaLayout>
        <div className="container mx-auto max-w-3xl px-4 py-20 text-center">
          <h2 className="text-2xl font-black text-white">Produto não encontrado</h2>
          <p className="text-sm text-white/50 mt-2">
            Este produto pode ter sido removido ou desativado temporariamente.
          </p>
          <Button className="mt-6" onClick={() => navigate('/loja')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar para a Loja
          </Button>
        </div>
      </LojaLayout>
    );
  }

  const discountPct =
    product.precoOriginal && product.precoOriginal > product.preco
      ? Math.round(((product.precoOriginal - product.preco) / product.precoOriginal) * 100)
      : 0;

  const embedVideoUrl = product.videoDemoUrl ? getEmbedUrl(product.videoDemoUrl) : null;
  const isYoutube = product.videoDemoUrl?.includes('youtu');

  return (
    <LojaLayout>
      <div className="container mx-auto max-w-7xl px-4 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-white/50 mb-6">
          <Link to="/loja" className="hover:text-white flex items-center gap-1 font-semibold">
            <ArrowLeft className="w-3.5 h-3.5" />
            Loja
          </Link>
          <span>/</span>
          <span className="text-white/70">{product.categoria}</span>
          <span>/</span>
          <span className="text-white font-semibold truncate max-w-[240px]">{product.nome}</span>
        </div>

        {/* Bloco Principal: Galeria de Layouts + Buy Box */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Esquerda: Galeria Interativa de Imagens / Layouts */}
          <div className="lg:col-span-7 space-y-4">
            <div className="relative aspect-[16/10] w-full rounded-2xl overflow-hidden border border-white/15 bg-[#0A0D14] shadow-2xl group">
              {showVideo && embedVideoUrl ? (
                isYoutube ? (
                  <iframe
                    src={embedVideoUrl}
                    title={product.nome}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <video src={embedVideoUrl} controls className="w-full h-full object-contain bg-black" />
                )
              ) : allImages.length > 0 ? (
                <>
                  <img
                    src={allImages[activeImageIndex]}
                    alt={`${product.nome} - Layout ${activeImageIndex + 1}`}
                    onClick={() => setIsLightboxOpen(true)}
                    className="w-full h-full object-contain bg-black/80 cursor-zoom-in transition-transform duration-300"
                  />

                  {/* Botão Expandir (Lightbox) */}
                  <button
                    onClick={() => setIsLightboxOpen(true)}
                    className="absolute top-3 right-3 p-2.5 rounded-xl bg-black/70 hover:bg-black text-white border border-white/20 backdrop-blur-md transition-all opacity-80 group-hover:opacity-100"
                    title="Ampliar Imagem do Layout"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>

                  {/* Contador de Tela */}
                  <div className="absolute bottom-3 left-3 px-3 py-1 rounded-full bg-black/75 border border-white/15 text-[11px] font-bold text-white backdrop-blur-md">
                    Amostra {activeImageIndex + 1} de {allImages.length}
                  </div>

                  {/* Setas de Navegação */}
                  {allImages.length > 1 && (
                    <>
                      <button
                        onClick={handlePrevImage}
                        className="absolute left-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/70 hover:bg-black text-white border border-white/20 transition-all opacity-0 group-hover:opacity-100"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <button
                        onClick={handleNextImage}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/70 hover:bg-black text-white border border-white/20 transition-all opacity-0 group-hover:opacity-100"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </>
                  )}
                </>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-white/30">
                  <ImageIcon className="w-16 h-16 mb-2" />
                  <span className="text-sm">Nenhuma imagem cadastrada</span>
                </div>
              )}
            </div>

            {/* Faixa de Miniaturas dos Layouts + Botão de Vídeo */}
            {(allImages.length > 1 || embedVideoUrl) && (
              <div className="flex items-center gap-2.5 overflow-x-auto pb-2 custom-scrollbar">
                {allImages.map((imgUrl, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setShowVideo(false);
                      setActiveImageIndex(idx);
                    }}
                    className={cn(
                      'relative w-24 h-16 rounded-xl overflow-hidden border-2 flex-shrink-0 transition-all bg-black',
                      !showVideo && activeImageIndex === idx
                        ? 'border-primary shadow-lg scale-105'
                        : 'border-white/15 opacity-60 hover:opacity-100'
                    )}
                    style={
                      !showVideo && activeImageIndex === idx
                        ? { borderColor: config.corDestaque || '#e50914' }
                        : undefined
                    }
                  >
                    <img src={imgUrl} alt={`Tela ${idx + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}

                {embedVideoUrl && (
                  <button
                    onClick={() => setShowVideo(true)}
                    className={cn(
                      'relative w-24 h-16 rounded-xl border-2 flex-shrink-0 flex flex-col items-center justify-center gap-1 bg-white/5 transition-all',
                      showVideo
                        ? 'border-primary text-white'
                        : 'border-white/15 text-white/60 hover:text-white hover:bg-white/10'
                    )}
                  >
                    <PlayCircle className="w-5 h-5 text-red-500" />
                    <span className="text-[10px] font-bold">Vídeo Demo</span>
                  </button>
                )}
              </div>
            )}

            {/* Descrição Completa e Detalhes (Desktop below gallery) */}
            <div className="space-y-6 pt-4">
              <Card className="bg-[#0B0E16] border-white/10 text-white">
                <CardHeader className="border-b border-white/10 pb-3">
                  <CardTitle className="text-base font-black flex items-center gap-2">
                    <Layers className="w-4 h-4 text-primary" style={{ color: config.corDestaque }} />
                    Sobre este Produto / Aplicativo
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-3 text-sm text-white/75 leading-relaxed whitespace-pre-line">
                  {product.descricaoCompleta || product.descricao || 'Sem descrição detalhada.'}
                </CardContent>
              </Card>

              {product.recursos && product.recursos.length > 0 && (
                <Card className="bg-[#0B0E16] border-white/10 text-white">
                  <CardHeader className="border-b border-white/10 pb-3">
                    <CardTitle className="text-base font-black flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      Principais Recursos & Benefícios
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {product.recursos.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-2.5 p-3 rounded-xl bg-white/[0.03] border border-white/10"
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span className="text-xs text-white/85 font-medium leading-snug">{item}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {product.especificacoes && product.especificacoes.length > 0 && (
                <Card className="bg-[#0B0E16] border-white/10 text-white">
                  <CardHeader className="border-b border-white/10 pb-3">
                    <CardTitle className="text-base font-black flex items-center gap-2">
                      <Cpu className="w-4 h-4 text-blue-400" />
                      Especificações Técnicas
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4 divide-y divide-white/10">
                    {product.especificacoes.map((spec, idx) => (
                      <div key={idx} className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                        <span className="text-white/50 font-semibold">{spec.label}</span>
                        <span className="text-white font-bold">{spec.value}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Direita: Painel de Compra Fixo (Sticky Buy Box) */}
          <div className="lg:col-span-5 lg:sticky lg:top-24">
            <div className="rounded-2xl border border-white/15 bg-[#0B0E16] p-6 shadow-2xl space-y-5">
              {/* Badges */}
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="border-white/20 text-white/80 text-[10px] font-bold uppercase">
                  {product.categoria}
                </Badge>
                {product.destaque && (
                  <Badge className="bg-amber-500 text-black font-black text-[10px] border-none">
                    <Flame className="w-3 h-3 mr-1" /> DESTAQUE
                  </Badge>
                )}
                {product.badge && (
                  <Badge
                    className="text-white font-black text-[10px] border-none"
                    style={{ backgroundColor: config.corDestaque || '#e50914' }}
                  >
                    {product.badge}
                  </Badge>
                )}
                {product.liberarDemo && product.demoAppUrl && (
                  <Badge className="bg-emerald-600 text-white font-black text-[10px] border-none">
                    <Download className="w-3 h-3 mr-1" /> DEMO GRÁTIS
                  </Badge>
                )}
              </div>

              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight">
                  {product.nome}
                </h1>
                {product.subtitulo && (
                  <p className="text-sm text-white/60 mt-2 leading-relaxed">{product.subtitulo}</p>
                )}
              </div>

              {/* Preço */}
              <div className="p-4 rounded-xl bg-white/[0.04] border border-white/10 space-y-1">
                {product.precoOriginal && product.precoOriginal > product.preco && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-white/40 line-through">
                      R$ {product.precoOriginal.toFixed(2).replace('.', ',')}
                    </span>
                    <Badge className="bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-black">
                      ECONOMIZE {discountPct}%
                    </Badge>
                  </div>
                )}
                <div className="text-4xl font-black text-white tracking-tight">
                  R$ {product.preco.toFixed(2).replace('.', ',')}
                </div>
                <p className="text-[11px] text-emerald-400 font-semibold">
                  Pagamento único • Suporte na entrega
                </p>
              </div>

              {/* Compatibilidade */}
              {product.compatibilidade && product.compatibilidade.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-bold text-white/60 uppercase tracking-wider">
                    Compatível com:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {product.compatibilidade.map((comp) => (
                      <span
                        key={comp}
                        className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-[11px] font-semibold text-white/90"
                      >
                        {comp}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Botões de Ação */}
              <div className="space-y-2.5 pt-2">
                <Button
                  size="lg"
                  onClick={handleBuyNow}
                  className="w-full h-12 font-black text-sm text-white shadow-xl transition-transform hover:scale-[1.01]"
                  style={{ backgroundColor: config.corDestaque || '#e50914' }}
                >
                  <Zap className="w-4 h-4 mr-2" />
                  Comprar Agora
                </Button>

                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => addItem(product, 1)}
                  className="w-full h-11 border-white/20 bg-white/5 hover:bg-white/10 text-white font-bold text-sm"
                >
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  Adicionar ao Carrinho
                </Button>

                {product.liberarDemo && product.demoAppUrl && (
                  <a
                    href={product.demoAppUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full h-11 rounded-md border border-emerald-500/40 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 font-black text-sm inline-flex items-center justify-center transition-colors"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Baixar App Demo (Testar Grátis)
                  </a>
                )}

                {whatsappNumber && (
                  <Button
                    size="lg"
                    variant="ghost"
                    onClick={handleWhatsappDoubt}
                    className="w-full h-10 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 font-bold text-xs"
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Tirar dúvidas sobre este produto no WhatsApp
                  </Button>
                )}
              </div>

              {/* Garantias */}
              <div className="pt-3 border-t border-white/10 space-y-2 text-xs text-white/50">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{config.textoGarantia}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Lightbox para Ampliar Layouts */}
      <Dialog open={isLightboxOpen} onOpenChange={setIsLightboxOpen}>
        <DialogContent className="max-w-5xl w-[95vw] bg-black/95 border-white/20 p-2 sm:p-4 text-white">
          <div className="relative flex items-center justify-center min-h-[60vh] max-h-[82vh]">
            <button
              onClick={() => setIsLightboxOpen(false)}
              className="absolute top-2 right-2 z-50 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white"
            >
              <X className="w-5 h-5" />
            </button>

            {allImages[activeImageIndex] && (
              <img
                src={allImages[activeImageIndex]}
                alt={`${product.nome} - Ampliado`}
                className="max-h-[78vh] w-auto object-contain rounded-lg"
              />
            )}

            {allImages.length > 1 && (
              <>
                <button
                  onClick={handlePrevImage}
                  className="absolute left-2 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/70 hover:bg-black text-white border border-white/20"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  onClick={handleNextImage}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/70 hover:bg-black text-white border border-white/20"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </LojaLayout>
  );
};

export default LojaProdutoDetalhes;
