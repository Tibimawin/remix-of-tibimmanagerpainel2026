import React, { useState, useEffect } from 'react';
import {
  ShoppingBag,
  Plus,
  Edit,
  Trash2,
  ExternalLink,
  Upload,
  Image as ImageIcon,
  Star,
  Check,
  Loader2,
  Settings,
  Package,
  ClipboardList,
  MessageCircle,
  Sparkles,
  Copy,
  Link2,
  Key,
  ShieldAlert
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  LojaService,
  LojaProduto,
  LojaConfig,
  LojaPedido,
  LojaLicenca,
  LojaImagemRecord,
  DEFAULT_LOJA_CONFIG
} from '@/services/LojaService';
import { AdminLojaProductModal } from './AdminLojaProductModal';

export const AdminLoja: React.FC = () => {
  const [products, setProducts] = useState<LojaProduto[]>([]);
  const [orders, setOrders] = useState<LojaPedido[]>([]);
  const [licenses, setLicenses] = useState<LojaLicenca[]>([]);
  const [uploadedImages, setUploadedImages] = useState<LojaImagemRecord[]>([]);
  const [config, setConfig] = useState<LojaConfig>(DEFAULT_LOJA_CONFIG);
  const [savingConfig, setSavingConfig] = useState(false);
  const [seeding, setSeeding] = useState(false);

  // Filtros e busca de licenças
  const [licenseSearch, setLicenseSearch] = useState('');
  const [licenseFilter, setLicenseFilter] = useState<'todas' | 'ativa' | 'revogada'>('todas');

  // Modal de Licença Manual
  const [isLicenseModalOpen, setIsLicenseModalOpen] = useState(false);
  const [manualProdId, setManualProdId] = useState('');
  const [manualClienteNome, setManualClienteNome] = useState('');
  const [manualClienteWhats, setManualClienteWhats] = useState('');
  const [generatingLicense, setGeneratingLicense] = useState(false);

  // Modal de Produto (estado do formulário isolado em AdminLojaProductModal)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<LojaProduto | null>(null);
  const [uploadingConverter, setUploadingConverter] = useState(false);
  const [lastConvertedUrl, setLastConvertedUrl] = useState('');

  useEffect(() => {
    const unsubProds = LojaService.subscribeProducts(setProducts, false);
    const unsubCfg = LojaService.subscribeConfig(setConfig);
    const unsubOrders = LojaService.subscribeOrders(setOrders);
    const unsubImgs = LojaService.subscribeUploadedImages(setUploadedImages);
    const unsubLics = LojaService.subscribeLicenses(setLicenses);
    return () => {
      unsubProds();
      unsubCfg();
      unsubOrders();
      unsubImgs();
      unsubLics();
    };
  }, []);

  const openCreateModal = () => {
    setEditingProduct(null);
    setIsModalOpen(true);
  };

  const openEditModal = (p: LojaProduto) => {
    setEditingProduct(p);
    setIsModalOpen(true);
  };

  const filteredLicenses = licenses.filter((lic) => {
    const matchesFilter =
      licenseFilter === 'todas' ||
      (licenseFilter === 'ativa' && lic.status === 'ativa') ||
      (licenseFilter === 'revogada' && lic.status === 'revogada');

    const q = licenseSearch.trim().toLowerCase();
    const matchesQuery =
      !q ||
      lic.chave.toLowerCase().includes(q) ||
      lic.clienteNome.toLowerCase().includes(q) ||
      lic.clienteWhatsapp.toLowerCase().includes(q) ||
      lic.produtoNome.toLowerCase().includes(q);

    return matchesFilter && matchesQuery;
  });

  const copyLinkToClipboard = (url: string) => {
    const fullUrl = LojaService.getFullImageUrl(url);
    navigator.clipboard.writeText(fullUrl);
    toast.success('Link da imagem copiado!');
  };

  const handleStandaloneConverterUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploadingConverter(true);
    try {
      const urls = await Promise.all(
        Array.from(files).map((file) => LojaService.uploadImage(file, 'conversor'))
      );
      const lastUrl = urls[urls.length - 1];
      if (lastUrl) {
        setLastConvertedUrl(lastUrl);
        toast.success(`${urls.length} imagem(ns) convertida(s) em link permanente com sucesso!`);
      }
    } catch {
      toast.error('Erro ao converter imagem');
    } finally {
      setUploadingConverter(false);
      e.target.value = '';
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este produto da loja?')) return;
    try {
      await LojaService.deleteProduct(id);
      toast.success('Produto excluído!');
    } catch {
      toast.error('Erro ao excluir produto');
    }
  };

  const handleToggleStatus = async (p: LojaProduto) => {
    const next = p.status === 'ativo' ? 'inativo' : 'ativo';
    await LojaService.updateProduct(p.id, { status: next });
    toast.success(`Produto ${next === 'ativo' ? 'ativado' : 'pausado'}`);
  };

  const handleToggleDestaque = async (p: LojaProduto) => {
    await LojaService.updateProduct(p.id, { destaque: !p.destaque });
  };

  const handleCreateManualLicense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualProdId) {
      toast.error('Selecione o produto para a licença');
      return;
    }
    if (!manualClienteNome.trim() || !manualClienteWhats.trim()) {
      toast.error('Informe o nome e WhatsApp do cliente');
      return;
    }

    const prod = products.find((p) => p.id === manualProdId);
    if (!prod) return;

    setGeneratingLicense(true);
    try {
      const novaChave = LojaService.generateLicenseKey();
      const lic = await LojaService.createLicense({
        chave: novaChave,
        produtoId: prod.id,
        produtoNome: prod.nome,
        categoria: prod.categoria,
        clienteNome: manualClienteNome.trim(),
        clienteWhatsapp: manualClienteWhats.trim(),
        status: 'ativa',
        downloadUrl: prod.arquivoDownloadUrl || prod.demoAppUrl || '',
        instrucoes: prod.instrucoesEntrega || ''
      });

      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const msg =
        `Olá *${manualClienteNome.trim()}*! Aqui está sua *Chave de Licença Oficial* da ${config.nomeLoja}:\n\n` +
        `📦 *Produto:* ${prod.nome}\n` +
        `🔑 *Chave:* ${lic.chave}\n\n` +
        `Para baixar seu aplicativo ou acessar seu conteúdo, consulte sua chave em:\n` +
        `👉 ${origin}/loja/licenca?chave=${lic.chave}`;

      navigator.clipboard.writeText(msg);
      toast.success(`Licença ${lic.chave} gerada e mensagem copiada para o WhatsApp!`);

      setIsLicenseModalOpen(false);
      setManualProdId('');
      setManualClienteNome('');
      setManualClienteWhats('');
    } catch {
      toast.error('Erro ao gerar licença manual');
    } finally {
      setGeneratingLicense(false);
    }
  };

  const handleToggleLicenseStatus = async (lic: LojaLicenca) => {
    const next = lic.status === 'ativa' ? 'revogada' : 'ativa';
    try {
      await LojaService.updateLicenseStatus(lic.id, next);
      toast.success(`Licença ${lic.chave} ${next === 'ativa' ? 'reativada' : 'revogada'}`);
    } catch {
      toast.error('Erro ao atualizar status da licença');
    }
  };

  const handleDeleteLicense = async (id: string, chave: string) => {
    if (!confirm(`Tem certeza que deseja excluir a licença ${chave}?`)) return;
    try {
      await LojaService.deleteLicense(id);
      toast.success('Licença excluída com sucesso');
    } catch {
      toast.error('Erro ao excluir licença');
    }
  };

  const copyLicenseWhatsAppMessage = (lic: LojaLicenca) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const msg =
      `Olá *${lic.clienteNome}*! Segue sua *Chave de Licença Oficial* da ${config.nomeLoja}:\n\n` +
      `📦 *Produto:* ${lic.produtoNome}\n` +
      `🔑 *Chave de Ativação:* ${lic.chave}\n\n` +
      `Acesse a loja oficial para baixar seu app ou acessar seu método:\n` +
      `👉 ${origin}/loja/licenca?chave=${lic.chave}`;

    navigator.clipboard.writeText(msg);
    toast.success('Mensagem de suporte copiada para enviar no WhatsApp!');
  };

  const handleSeedDemos = async () => {
    setSeeding(true);
    try {
      const count = await LojaService.seedDemoProducts();
      if (count > 0) {
        toast.success(`${count} produtos modelo criados! Edite com suas fotos reais.`);
      } else {
        toast.info('Já existem produtos cadastrados na loja.');
      }
    } catch {
      toast.error('Erro ao criar produtos modelo');
    } finally {
      setSeeding(false);
    }
  };

  const handleSaveConfig = async () => {
    setSavingConfig(true);
    try {
      await LojaService.saveConfig(config);
      toast.success('Configurações da Loja salvas!');
    } catch {
      toast.error('Erro ao salvar configurações');
    } finally {
      setSavingConfig(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header do Gerenciador da Loja */}
      <Card className="bg-slate-900/70 border-purple-500/20">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-xl font-black text-white flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-purple-400" />
              Gerenciador da Loja Pública (/loja)
            </CardTitle>
            <CardDescription className="text-slate-400">
              Cadastre aplicativos de Celular, TV, Painéis ou qualquer produto digital, converta imagens em link e gerencie pedidos.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="border-purple-500/30 text-purple-200 hover:bg-purple-500/20"
              onClick={() => window.open('/loja', '_blank')}
            >
              <ExternalLink className="w-4 h-4 mr-1.5" />
              Abrir Loja (/loja)
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/loja`);
                toast.success('Link da loja copiado!');
              }}
            >
              <Copy className="w-4 h-4 mr-1.5" />
              Copiar Link
            </Button>
          </div>
        </CardHeader>
      </Card>

      <Tabs defaultValue="produtos" className="w-full">
        <TabsList className="bg-slate-900 border border-slate-800 flex-wrap h-auto">
          <TabsTrigger value="produtos" className="text-xs font-bold">
            <Package className="w-3.5 h-3.5 mr-1.5" /> Produtos ({products.length})
          </TabsTrigger>
          <TabsTrigger value="imagens" className="text-xs font-bold">
            <Link2 className="w-3.5 h-3.5 mr-1.5 text-amber-400" /> Converter Imagem → Link ({uploadedImages.length})
          </TabsTrigger>
          <TabsTrigger value="pedidos" className="text-xs font-bold">
            <ClipboardList className="w-3.5 h-3.5 mr-1.5" /> Pedidos ({orders.length})
          </TabsTrigger>
          <TabsTrigger value="licencas" className="text-xs font-bold">
            <Key className="w-3.5 h-3.5 mr-1.5 text-amber-400" /> Licenças Geradas ({licenses.length})
          </TabsTrigger>
          <TabsTrigger value="config" className="text-xs font-bold">
            <Settings className="w-3.5 h-3.5 mr-1.5" /> Configurar Vitrine
          </TabsTrigger>
        </TabsList>

        {/* ABA 1: PRODUTOS */}
        <TabsContent value="produtos" className="space-y-4 pt-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {products.length === 0 && (
                <Button variant="outline" size="sm" onClick={handleSeedDemos} disabled={seeding}>
                  <Sparkles className="w-4 h-4 mr-1.5 text-amber-400" />
                  {seeding ? 'Criando...' : 'Carregar Produtos Exemplo'}
                </Button>
              )}
            </div>
            <Button onClick={openCreateModal} className="bg-purple-600 hover:bg-purple-500 text-white font-bold">
              <Plus className="w-4 h-4 mr-1.5" /> Novo Produto na Loja
            </Button>
          </div>

          <Card className="bg-slate-900/60 border-slate-800">
            <CardContent className="p-0 overflow-x-auto">
              {products.length === 0 ? (
                <div className="p-12 text-center space-y-3">
                  <ShoppingBag className="w-12 h-12 text-slate-600 mx-auto" />
                  <p className="text-slate-300 font-bold">Nenhum produto cadastrado na loja ainda</p>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Clique em "Novo Produto na Loja" e use os modelos prontos de legenda para publicar em segundos.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-800">
                      <TableHead className="text-slate-300">Produto</TableHead>
                      <TableHead className="text-slate-300">Categoria</TableHead>
                      <TableHead className="text-slate-300">Telas / Fotos</TableHead>
                      <TableHead className="text-slate-300">Preço</TableHead>
                      <TableHead className="text-slate-300">Destaque</TableHead>
                      <TableHead className="text-slate-300">Status</TableHead>
                      <TableHead className="text-slate-300 text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((p) => (
                      <TableRow key={p.id} className="border-slate-800/80">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-lg overflow-hidden bg-black border border-slate-700 shrink-0">
                              {p.imagemPrincipal ? (
                                <img src={p.imagemPrincipal} alt={p.nome} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-600">
                                  <ImageIcon className="w-4 h-4" />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-white text-sm truncate max-w-[240px]">{p.nome}</div>
                              <div className="flex items-center gap-1 flex-wrap mt-0.5">
                                {p.badge && (
                                  <Badge variant="outline" className="text-[9px] border-purple-500/40 text-purple-300">
                                    {p.badge}
                                  </Badge>
                                )}
                                {p.liberarDemo && p.demoAppUrl && (
                                  <Badge variant="outline" className="text-[9px] border-emerald-500/40 text-emerald-300">
                                    DEMO LIBERADA
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-slate-300">{p.categoria}</TableCell>
                        <TableCell className="text-xs text-slate-300">
                          {p.galeriaImagens?.length || (p.imagemPrincipal ? 1 : 0)} foto(s)
                        </TableCell>
                        <TableCell className="text-sm font-bold text-emerald-400">
                          R$ {p.preco.toFixed(2).replace('.', ',')}
                        </TableCell>
                        <TableCell>
                          <button
                            onClick={() => handleToggleDestaque(p)}
                            className={`p-1.5 rounded-lg border transition-colors ${
                              p.destaque
                                ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                                : 'bg-slate-800 border-slate-700 text-slate-500'
                            }`}
                            title="Alternar Destaque"
                          >
                            <Star className={`w-4 h-4 ${p.destaque ? 'fill-amber-400' : ''}`} />
                          </button>
                        </TableCell>
                        <TableCell>
                          <button onClick={() => handleToggleStatus(p)}>
                            <Badge variant={p.status === 'ativo' ? 'default' : 'secondary'}>
                              {p.status === 'ativo' ? 'Ativo' : 'Pausado'}
                            </Badge>
                          </button>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 border-slate-700"
                              onClick={() => openEditModal(p)}
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="h-8"
                              onClick={() => handleDeleteProduct(p.id)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ABA 2: CONVERSOR DE IMAGEM PARA LINK */}
        <TabsContent value="imagens" className="space-y-4 pt-4">
          <Card className="bg-slate-900/60 border-slate-800 text-white">
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Link2 className="w-5 h-5 text-amber-400" />
                Conversor Rápido: Transforme Qualquer Imagem em Link
              </CardTitle>
              <CardDescription className="text-slate-400 text-xs">
                Suba prints ou fotos do seu computador/celular e receba imediatamente um link HTTP pronto para colar em qualquer produto, capa ou galeria.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-amber-500/40 bg-amber-500/5 hover:bg-amber-500/10 rounded-xl cursor-pointer transition-colors">
                {uploadingConverter ? (
                  <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
                    <Loader2 className="w-5 h-5 animate-spin" /> Convertendo imagem em link...
                  </div>
                ) : (
                  <>
                    <Upload className="w-8 h-8 text-amber-400 mb-2" />
                    <span className="text-sm font-bold text-white">Clique aqui para escolher uma ou várias imagens</span>
                    <span className="text-xs text-slate-400 mt-0.5">PNG, JPG ou WebP — gera o link na hora</span>
                  </>
                )}
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={handleStandaloneConverterUpload}
                />
              </label>

              {lastConvertedUrl && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col sm:flex-row items-center gap-3">
                  <img
                    src={lastConvertedUrl}
                    alt="Convertida"
                    className="w-16 h-12 object-cover rounded border border-emerald-500/40 shrink-0"
                  />
                  <div className="flex-1 min-w-0 w-full">
                    <p className="text-[11px] text-emerald-300 font-bold mb-1">Link gerado com sucesso:</p>
                    <Input
                      readOnly
                      value={LojaService.getFullImageUrl(lastConvertedUrl)}
                      className="h-8 text-xs bg-black/50 border-emerald-500/30 text-white font-mono"
                    />
                  </div>
                  <Button
                    size="sm"
                    onClick={() => copyLinkToClipboard(lastConvertedUrl)}
                    className="bg-emerald-600 hover:bg-emerald-500 font-bold shrink-0"
                  >
                    <Copy className="w-3.5 h-3.5 mr-1.5" /> Copiar Link
                  </Button>
                </div>
              )}

              {uploadedImages.length > 0 && (
                <div className="space-y-2 pt-2">
                  <Label className="text-xs font-bold text-slate-300">
                    Links de Imagens Gerados Recentemente ({uploadedImages.length})
                  </Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[420px] overflow-y-auto pr-1 custom-scrollbar">
                    {uploadedImages.map((img) => (
                      <div
                        key={img.id}
                        className="p-2.5 rounded-xl bg-slate-800/70 border border-slate-700 flex items-center gap-3"
                      >
                        <img
                          src={img.url}
                          alt={img.fileName}
                          className="w-14 h-14 object-cover rounded-lg bg-black border border-slate-600 shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold text-white truncate">{img.fileName}</div>
                          <div className="text-[10px] text-slate-400 font-mono truncate">{img.url}</div>
                          <div className="flex gap-1.5 mt-1.5">
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              className="h-6 text-[10px] px-2"
                              onClick={() => copyLinkToClipboard(img.url)}
                            >
                              <Copy className="w-3 h-3 mr-1" /> Copiar Link
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="h-6 text-[10px] px-2 text-red-400 hover:text-red-300"
                              onClick={() => LojaService.deleteUploadedImage(img.id)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ABA 3: PEDIDOS */}
        <TabsContent value="pedidos" className="pt-4">
          <Card className="bg-slate-900/60 border-slate-800">
            <CardContent className="p-0 overflow-x-auto">
              {orders.length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-sm">
                  Nenhum pedido recebido pela loja ainda.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-800">
                      <TableHead>Data</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Itens</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Método</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Contato</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => (
                      <TableRow key={order.id} className="border-slate-800">
                        <TableCell className="text-xs text-slate-400">
                          {new Date(order.criadoEm).toLocaleString('pt-BR')}
                        </TableCell>
                        <TableCell>
                          <div className="text-xs font-bold text-white">{order.clienteNome}</div>
                          <div className="text-[11px] text-slate-400">{order.clienteWhatsapp}</div>
                          {order.clienteObservacao && (
                            <div className="text-[10px] text-amber-300 mt-0.5">Obs: {order.clienteObservacao}</div>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-slate-300">
                          {order.itens?.map((i, idx) => (
                            <div key={idx}>
                              {i.quantidade}x {i.nome}
                            </div>
                          ))}
                        </TableCell>
                        <TableCell className="font-bold text-emerald-400 text-sm">
                          R$ {order.total.toFixed(2).replace('.', ',')}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="uppercase text-[10px]">
                            {order.metodoPagamento}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <select
                            value={order.status}
                            onChange={(e) =>
                              LojaService.updateOrderStatus(order.id, e.target.value as LojaPedido['status'])
                            }
                            className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                          >
                            <option value="pendente">Pendente</option>
                            <option value="pago">Pago</option>
                            <option value="entregue">Entregue</option>
                            <option value="cancelado">Cancelado</option>
                          </select>
                        </TableCell>
                        <TableCell className="text-right">
                          {order.clienteWhatsapp && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs border-emerald-500/40 text-emerald-400"
                              onClick={() => {
                                window.open(LojaService.formatWhatsappUrl(order.clienteWhatsapp), '_blank');
                              }}
                            >
                              <MessageCircle className="w-3.5 h-3.5 mr-1" /> WhatsApp
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ABA 4: CONFIGURAÇÕES DA VITRINE */}
        <TabsContent value="config" className="pt-4">
          <Card className="bg-slate-900/60 border-slate-800 text-white">
            <CardHeader>
              <CardTitle className="text-base font-bold">Identidade e Aparência da Loja (`/loja`)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Nome da Loja</Label>
                  <Input
                    value={config.nomeLoja}
                    onChange={(e) => setConfig({ ...config, nomeLoja: e.target.value })}
                    className="bg-slate-800 border-slate-700"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">WhatsApp de Suporte / Vendas (com código do país)</Label>
                  <Input
                    value={config.whatsappVendas}
                    onChange={(e) => setConfig({ ...config, whatsappVendas: e.target.value })}
                    placeholder="Ex: +244930717724"
                    className="bg-slate-800 border-slate-700"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Slogan (abaixo da logo)</Label>
                <Input
                  value={config.slogan}
                  onChange={(e) => setConfig({ ...config, slogan: e.target.value })}
                  className="bg-slate-800 border-slate-700"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Título Principal do Banner Hero</Label>
                <Input
                  value={config.heroTitulo}
                  onChange={(e) => setConfig({ ...config, heroTitulo: e.target.value })}
                  className="bg-slate-800 border-slate-700"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Subtítulo do Banner Hero</Label>
                <Textarea
                  value={config.heroSubtitulo}
                  onChange={(e) => setConfig({ ...config, heroSubtitulo: e.target.value })}
                  rows={2}
                  className="bg-slate-800 border-slate-700"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Cor de Destaque</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={config.corDestaque}
                      onChange={(e) => setConfig({ ...config, corDestaque: e.target.value })}
                      className="w-12 h-9 p-1 bg-transparent border-slate-700"
                    />
                    <Input
                      value={config.corDestaque}
                      onChange={(e) => setConfig({ ...config, corDestaque: e.target.value })}
                      className="bg-slate-800 border-slate-700 font-mono text-xs"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/60 border border-slate-700">
                  <Label className="text-xs">Checkout via WhatsApp</Label>
                  <Switch
                    checked={config.permitirWhatsapp}
                    onCheckedChange={(v) => setConfig({ ...config, permitirWhatsapp: v })}
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/60 border border-slate-700">
                  <Label className="text-xs">Checkout via PIX</Label>
                  <Switch
                    checked={config.permitirPix}
                    onCheckedChange={(v) => setConfig({ ...config, permitirPix: v })}
                  />
                </div>
              </div>

              <div className="pt-2">
                <Button onClick={handleSaveConfig} disabled={savingConfig} className="bg-purple-600 hover:bg-purple-500 font-bold">
                  {savingConfig ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
                  Salvar Configurações da Loja
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ABA 4: LICENÇAS GERADAS */}
        <TabsContent value="licencas" className="space-y-4 pt-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Input
                value={licenseSearch}
                onChange={(e) => setLicenseSearch(e.target.value)}
                placeholder="Buscar chave, cliente ou produto..."
                className="w-72 bg-slate-800 border-slate-700 text-xs h-9"
              />
              <div className="flex rounded-lg bg-slate-800 p-0.5 border border-slate-700">
                {(['todas', 'ativa', 'revogada'] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setLicenseFilter(st)}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md capitalize transition-colors ${
                      licenseFilter === st ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            <Button
              onClick={() => setIsLicenseModalOpen(true)}
              className="bg-amber-600 hover:bg-amber-500 text-black font-bold h-9 text-xs"
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Gerar Chave Manual para Cliente
            </Button>
          </div>

          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="pb-3 border-b border-slate-800">
              <CardTitle className="text-sm font-bold text-white flex items-center justify-between">
                <span>Total de Licenças Registradas ({filteredLicenses.length})</span>
                <span className="text-xs text-slate-400 font-normal">
                  Chaves geradas via Checkout ou pelo Administrador
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {filteredLicenses.length === 0 ? (
                <div className="p-12 text-center text-slate-500 text-xs space-y-2">
                  <Key className="w-8 h-8 mx-auto opacity-40 text-amber-400" />
                  <p>Nenhuma licença encontrada.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-800 hover:bg-transparent">
                      <TableHead className="text-xs">Chave de Licença</TableHead>
                      <TableHead className="text-xs">Produto / Categoria</TableHead>
                      <TableHead className="text-xs">Cliente / WhatsApp</TableHead>
                      <TableHead className="text-xs">Data</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                      <TableHead className="text-xs text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLicenses.map((lic) => (
                      <TableRow key={lic.id} className="border-slate-800 hover:bg-slate-800/40">
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-black text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-2 py-1 rounded select-all">
                              {lic.chave}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-slate-400 hover:text-white"
                              title="Copiar Chave"
                              onClick={() => {
                                navigator.clipboard.writeText(lic.chave);
                                toast.success(`Chave ${lic.chave} copiada!`);
                              }}
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-white max-w-[220px] truncate">
                              {lic.produtoNome}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {lic.categoria}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-xs text-slate-200 font-medium">
                              {lic.clienteNome || 'Cliente'}
                            </span>
                            {lic.clienteWhatsapp && (
                              <a
                                href={LojaService.formatWhatsappUrl(lic.clienteWhatsapp)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[11px] text-emerald-400 hover:underline flex items-center gap-1"
                              >
                                <MessageCircle className="w-3 h-3" />
                                {lic.clienteWhatsapp}
                              </a>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-slate-400 whitespace-nowrap">
                          {new Date(lic.criadoEm).toLocaleDateString('pt-BR')}
                        </TableCell>
                        <TableCell>
                          <button
                            type="button"
                            onClick={() => handleToggleLicenseStatus(lic)}
                            className="cursor-pointer"
                            title="Clique para alternar status da licença"
                          >
                            <Badge
                              className={
                                lic.status === 'ativa'
                                  ? 'bg-emerald-900/60 text-emerald-300 border-emerald-500/40 text-[10px]'
                                  : 'bg-red-900/60 text-red-300 border-red-500/40 text-[10px]'
                              }
                            >
                              {lic.status === 'ativa' ? 'Ativa' : 'Revogada'}
                            </Badge>
                          </button>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 text-xs text-emerald-400 hover:bg-emerald-950/40"
                              title="Copiar mensagem pronta para enviar ao cliente no WhatsApp"
                              onClick={() => copyLicenseWhatsAppMessage(lic)}
                            >
                              <MessageCircle className="w-3.5 h-3.5 mr-1" />
                              WhatsApp
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-950/30"
                              title="Excluir licença"
                              onClick={() => handleDeleteLicense(lic.id, lic.chave)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* MODAL DE GERAÇÃO MANUAL DE LICENÇA */}
      <Dialog open={isLicenseModalOpen} onOpenChange={setIsLicenseModalOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-400 font-bold">
              <Key className="w-5 h-5" />
              Gerar Chave de Licença Manual
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">
              Gere uma chave de licença oficial para qualquer produto da loja e copie a mensagem formatada para enviar ao cliente no WhatsApp.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateManualLicense} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Selecione o Produto da Loja *</Label>
              <select
                value={manualProdId}
                onChange={(e) => setManualProdId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-md p-2 text-xs text-white"
                required
              >
                <option value="">Selecione um produto...</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome} ({p.categoria})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Nome do Cliente *</Label>
              <Input
                value={manualClienteNome}
                onChange={(e) => setManualClienteNome(e.target.value)}
                placeholder="Ex: Carlos Silva"
                className="bg-slate-800 border-slate-700 text-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">WhatsApp do Cliente *</Label>
              <Input
                value={manualClienteWhats}
                onChange={(e) => setManualClienteWhats(e.target.value)}
                placeholder="Ex: 244930717724 ou 11999999999"
                className="bg-slate-800 border-slate-700 text-xs"
                required
              />
            </div>

            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300">
              💡 Ao clicar no botão, a chave oficial (ex: <code>TIBIM-XXXX-XXXX-XXXX</code>) será gerada no banco de dados e a mensagem completa de entrega será automaticamente copiada para sua área de transferência.
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setIsLicenseModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={generatingLicense} className="bg-amber-600 hover:bg-amber-500 text-black font-bold text-xs">
                {generatingLicense ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Key className="w-4 h-4 mr-1.5" />}
                Gerar e Copiar Licença
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL DE CADASTRO / EDIÇÃO DE PRODUTO (ISOLADO PARA MÁXIMA LEVEZA) */}
      <AdminLojaProductModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        editingProduct={editingProduct}
      />
    </div>
  );
};

export default AdminLoja;
