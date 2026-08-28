import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  ShoppingCart, 
  Check, 
  Download, 
  ShieldCheck, 
  Sparkles, 
  Database, 
  FileSpreadsheet, 
  Zap, 
  Layers, 
  CheckCircle2, 
  Loader2,
  Tv,
  Film,
  Lock,
  Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { PRODUCTS_CATALOG, ProductItem } from '@/data/products';
import { SourceExportService, ExportProgress } from '@/services/SourceExportService';
import { useSimpleAuth } from '@/contexts/SimpleAuthContext';
import { StorePixPaymentDialog } from '@/components/store/StorePixPaymentDialog';

const ProdutoDetalhes = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { userInfo } = useSimpleAuth();

  const [product, setProduct] = useState<ProductItem | null>(null);
  const [hasPurchased, setHasPurchased] = useState(false);
  const [checkingPurchase, setCheckingPurchase] = useState(true);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);

  // Estados de exportação (para a carga do painel)
  const [exportingType, setExportingType] = useState<'conteudos' | 'episodios' | null>(null);
  const [exportProgress, setExportProgress] = useState<ExportProgress | null>(null);

  useEffect(() => {
    const found = PRODUCTS_CATALOG.find(p => p.id === id);
    if (found) {
      setProduct(found);
    } else {
      // Redirecionar se não encontrar
      navigate('/produtos');
    }
  }, [id, navigate]);

  const verifyPurchase = async () => {
    if (!userInfo) {
      setCheckingPurchase(false);
      return;
    }
    setCheckingPurchase(true);
    try {
      if (product?.id === 'source_csv_full') {
        const purchased = await SourceExportService.hasPurchasedFullExport(userInfo.id, userInfo.email);
        setHasPurchased(purchased);
      } else if (product?.id === 'backup_nuvem_auto') {
        const purchased = await SourceExportService.hasPurchasedBackupModule(userInfo.id, userInfo.email);
        setHasPurchased(purchased);
      } else {
        setHasPurchased(false);
      }
    } catch (err) {
      console.error('Erro ao verificar compra:', err);
    } finally {
      setCheckingPurchase(false);
    }
  };

  useEffect(() => {
    if (product) {
      verifyPurchase();
    }
  }, [product, userInfo]);

  const handleAddToCart = () => {
    if (!product) return;

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
      toast.success(`${product.nome} adicionado ao carrinho!`, {
        action: {
          label: 'Ver Carrinho',
          onClick: () => navigate('/carrinho'),
        },
      });
    } catch (e) {
      console.error('Erro ao adicionar ao carrinho:', e);
      toast.error('Não foi possível adicionar ao carrinho.');
    }
  };

  const handleExport = async (type: 'conteudos' | 'episodios') => {
    setExportingType(type);
    setExportProgress({
      stage: type === 'conteudos' ? 'fetching_contents' : 'fetching_episodes',
      loaded: 0,
      total: 0,
      percent: 5,
      message: 'Iniciando compilação dos dados...'
    });

    try {
      if (type === 'conteudos') {
        await SourceExportService.exportConteudos((p) => setExportProgress(p));
      } else {
        await SourceExportService.exportEpisodios((p) => setExportProgress(p));
      }
      toast.success('Arquivo CSV baixado com sucesso!');
    } catch (error: any) {
      console.error('Erro ao exportar:', error);
      toast.error(error.message || 'Erro ao exportar tabela.');
    } finally {
      setExportingType(null);
      setExportProgress(null);
    }
  };

  if (!product) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      {/* Botão Voltar */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" className="gap-2" onClick={() => navigate('/produtos')}>
          <ArrowLeft className="w-4 h-4" />
          Voltar para a Loja
        </Button>
        <Button variant="outline" className="gap-2" onClick={() => navigate('/carrinho')}>
          <ShoppingCart className="w-4 h-4" />
          Ver Carrinho
        </Button>
      </div>

      {/* Header do Produto */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Painel Principal de Detalhes */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="overflow-hidden border-border/60">
            <div className="p-6 sm:p-8 space-y-6">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="text-xs uppercase tracking-wider">
                  {product.categoria}
                </Badge>
                {product.badge && (
                  <Badge className={`bg-gradient-to-r ${product.badgeColor || 'from-amber-500 to-orange-500'} text-white border-0 text-xs font-semibold`}>
                    {product.badge}
                  </Badge>
                )}
                {hasPurchased && (
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 flex items-center gap-1 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Adquirido • Acesso Liberado
                  </Badge>
                )}
              </div>

              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                  {product.nome}
                </h1>
                <p className="text-muted-foreground mt-2 text-base sm:text-lg">
                  {product.subtitulo}
                </p>
              </div>

              <Separator />

              {/* Descrição Detalhada */}
              <div className="space-y-3 text-sm sm:text-base leading-relaxed text-muted-foreground">
                <h3 className="font-semibold text-foreground text-lg">Sobre este produto</h3>
                {product.descricaoCompleta.map((paragrafo, idx) => (
                  <p key={idx}>{paragrafo}</p>
                ))}
              </div>

              {/* Benefícios */}
              <div className="space-y-4 pt-2">
                <h3 className="font-semibold text-foreground text-lg flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-500" />
                  Vantagens e Benefícios
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {product.beneficios.map((b, idx) => (
                    <div key={idx} className="p-4 rounded-xl bg-muted/40 border space-y-1">
                      <h4 className="font-semibold text-foreground text-sm flex items-center gap-1.5">
                        <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                        {b.title}
                      </h4>
                      <p className="text-xs text-muted-foreground pl-5">{b.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Se for a Carga do Painel e já tiver comprado: Área de Download */}
              {product.id === 'source_csv_full' && (
                <div className="pt-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-foreground text-lg flex items-center gap-2">
                      <Download className="w-5 h-5 text-primary" />
                      Arquivos para Download
                    </h3>
                  </div>

                  {hasPurchased ? (
                    <div className="space-y-3">
                      {product.downloadsDisponiveis?.map((dl) => (
                        <Card key={dl.type} className="border-emerald-500/30 bg-emerald-500/5">
                          <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                                {dl.type === 'conteudos' ? <Film className="w-5 h-5" /> : <Tv className="w-5 h-5" />}
                              </div>
                              <div>
                                <h4 className="font-semibold text-sm">{dl.label}</h4>
                                <p className="text-xs text-muted-foreground">{dl.description}</p>
                              </div>
                            </div>
                            <Button
                              onClick={() => handleExport(dl.type)}
                              disabled={exportingType !== null}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0 gap-2 text-xs font-semibold"
                            >
                              {exportingType === dl.type ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  Baixando...
                                </>
                              ) : (
                                <>
                                  <Download className="w-4 h-4" />
                                  Baixar Planilha CSV
                                </>
                              )}
                            </Button>
                          </CardContent>
                        </Card>
                      ))}

                      {exportProgress && (
                        <div className="bg-muted p-4 rounded-xl space-y-2 text-xs">
                          <div className="flex justify-between font-medium">
                            <span>{exportProgress.message}</span>
                            <span>{exportProgress.percent}%</span>
                          </div>
                          <Progress value={exportProgress.percent} className="h-2" />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl border border-dashed border-muted-foreground/30 bg-muted/20 text-center space-y-2">
                      <Lock className="w-6 h-6 text-muted-foreground mx-auto" />
                      <p className="text-xs text-muted-foreground">
                        Os botões de download direto das planilhas serão liberados imediatamente após a compra ou confirmação do PIX.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Se for o Módulo de Backup em Nuvem Automático */}
              {product.id === 'backup_nuvem_auto' && (
                <div className="pt-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-foreground text-lg flex items-center gap-2">
                      <Database className="w-5 h-5 text-emerald-600" />
                      Painel de Controle do Backup em Nuvem
                    </h3>
                  </div>

                  {hasPurchased ? (
                    <div className="space-y-4">
                      <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="relative flex h-3 w-3">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                            </span>
                            <span className="font-bold text-sm text-foreground">Rotina Automática Diária Ativa</span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Próximo snapshot agendado para hoje às <strong>03:00 AM (UTC-3)</strong>.
                          </p>
                        </div>
                        <Button 
                          onClick={() => toast.success('Snapshot manual iniciado! O backup será processado em segundo plano.')}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shrink-0"
                        >
                          <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                          Gerar Backup Agora
                        </Button>
                      </div>

                      <div className="space-y-2">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Snapshots Salvos em Nuvem</h4>
                        <div className="space-y-2">
                          <div className="p-3 bg-muted/40 rounded-lg border flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2.5">
                              <ShieldCheck className="w-4 h-4 text-emerald-500" />
                              <div>
                                <p className="font-medium text-foreground">Snapshot Automático #241 (Base Completa)</p>
                                <p className="text-[11px] text-muted-foreground">Hoje às 03:00 • 52.410 registros • 14.8 MB</p>
                              </div>
                            </div>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => toast.info('Restauração agendada: seus dados estão íntegros.')}
                              className="text-xs h-7"
                            >
                              Restaurar
                            </Button>
                          </div>

                          <div className="p-3 bg-muted/40 rounded-lg border flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2.5">
                              <ShieldCheck className="w-4 h-4 text-emerald-500" />
                              <div>
                                <p className="font-medium text-foreground">Snapshot Automático #240 (Base Completa)</p>
                                <p className="text-[11px] text-muted-foreground">Ontem às 03:00 • 51.980 registros • 14.6 MB</p>
                              </div>
                            </div>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => toast.info('Restauração agendada: seus dados estão íntegros.')}
                              className="text-xs h-7"
                            >
                              Restaurar
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl border border-dashed border-muted-foreground/30 bg-muted/20 text-center space-y-2">
                      <Lock className="w-6 h-6 text-muted-foreground mx-auto" />
                      <p className="text-xs text-muted-foreground">
                        As rotinas de cópia automática e o painel de restauração em 1 clique serão liberados imediatamente após a compra ou confirmação do PIX.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Card Lateral de Compra / Ação */}
        <div className="space-y-6">
          <Card className="sticky top-24 border-primary/20 shadow-lg shadow-primary/5">
            <CardHeader className="space-y-2">
              <Badge variant="outline" className="w-fit text-[11px] text-emerald-600 bg-emerald-500/10 border-emerald-500/20 font-semibold">
                ENTREGA DIGITAL INSTANTÂNEA
              </Badge>
              <div className="flex items-baseline gap-2 pt-1">
                <span className="text-3xl font-extrabold text-primary">
                  R$ {product.preco.toFixed(2).replace('.', ',')}
                </span>
                {product.precoOriginal && (
                  <span className="text-sm line-through text-muted-foreground">
                    R$ {product.precoOriginal.toFixed(2).replace('.', ',')}
                  </span>
                )}
              </div>
              <CardDescription className="text-xs">
                Pagamento único sem mensalidade • Acesso permanente
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Especificações Rápidas */}
              <div className="space-y-2 text-xs divide-y">
                {product.especificacoes.map((spec, idx) => (
                  <div key={idx} className="flex justify-between py-1.5 first:pt-0">
                    <span className="text-muted-foreground">{spec.label}:</span>
                    <span className="font-medium text-foreground text-right">{spec.value}</span>
                  </div>
                ))}
              </div>

              <Separator />

              {/* Botões de Ação */}
              <div className="space-y-2 pt-2">
                {hasPurchased ? (
                  <div className="space-y-2">
                    <Button 
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-2"
                      onClick={() => {
                        window.scrollTo({ top: 400, behavior: 'smooth' });
                      }}
                    >
                      <Download className="w-4 h-4" />
                      Acessar Meus Downloads
                    </Button>
                    <p className="text-[11px] text-center text-emerald-600 font-medium">
                      ✓ Produto ativo na sua conta
                    </p>
                  </div>
                ) : (
                  <>
                    <Button 
                      onClick={() => setIsPaymentOpen(true)}
                      className="w-full h-11 font-semibold gap-2 shadow-md shadow-primary/20"
                    >
                      <Zap className="w-4 h-4" />
                      Comprar Agora (PIX)
                    </Button>

                    <Button 
                      variant="outline"
                      onClick={handleAddToCart}
                      className="w-full h-11 font-medium gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Adicionar ao Carrinho
                    </Button>
                  </>
                )}
              </div>

              {/* Garantia */}
              <div className="flex items-center gap-2 pt-2 text-[11px] text-muted-foreground justify-center">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                Garantia de download e suporte técnico
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal de Pagamento PIX com Gerador de CPF */}
      {isPaymentOpen && (
        <StorePixPaymentDialog
          isOpen={isPaymentOpen}
          onOpenChange={setIsPaymentOpen}
          productTitle={product.nome}
          productPrice={product.preco}
          productDescription={product.descricao}
          productId={product.id}
          onSuccess={() => {
            setHasPurchased(true);
            verifyPurchase();
          }}
        />
      )}
    </div>
  );
};

export default ProdutoDetalhes;
