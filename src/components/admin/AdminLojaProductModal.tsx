import React, { useState, useEffect } from 'react';
import {
  ShoppingBag,
  Upload,
  Check,
  X,
  Loader2,
  Package,
  Sparkles,
  Copy,
  Smartphone,
  Tv,
  Monitor,
  Palette,
  Bot,
  Wand2,
  Download
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { LojaService, LojaProduto, LojaSpec } from '@/services/LojaService';

const COMPATIBILITY_OPTIONS = [
  'Celular Android',
  'iPhone (iOS)',
  'Android TV',
  'TV Box',
  'Fire Stick',
  'Smart TV',
  'PC / Windows',
  'Navegador Web',
  'WhatsApp / Redes'
];

const CATEGORY_PRESETS = [
  { label: 'App Celular Android', icon: Smartphone },
  { label: 'App Android TV / Box', icon: Tv },
  { label: 'App TV + Celular', icon: Sparkles },
  { label: 'Painel Web / Sistema', icon: Monitor },
  { label: 'Design & Artes', icon: Palette },
  { label: 'Scripts & Bots', icon: Bot },
  { label: 'Servidores / Planos', icon: Package },
  { label: 'Outros Produtos', icon: ShoppingBag }
];

interface CopyTemplatePreset {
  id: string;
  label: string;
  defaultNome: string;
  subtitulo: string;
  categoria: string;
  badge: string;
  compatibilidade: string[];
  recursos: string[];
  especificacoes: LojaSpec[];
  descricaoCompleta: string;
}

const COPY_TEMPLATES: CopyTemplatePreset[] = [
  {
    id: 'app_mobile',
    label: '📱 App Celular Android',
    defaultNome: 'App Streaming Mobile Pro (Celular Android)',
    subtitulo: 'Aplicativo exclusivo para celular Android com layout moderno, rápido e personalizado com sua marca.',
    categoria: 'App Celular Android',
    badge: 'APP CELULAR',
    compatibilidade: ['Celular Android'],
    recursos: [
      'APK 100% personalizado com a logo, cores e nome da sua marca',
      'Interface touch fluida otimizada para qualquer celular Android',
      'Tela de login moderna com opção de solicitar Teste Grátis',
      'Player interno rápido compatível com filmes, séries e TV ao vivo',
      'Suporte completo a catálogo com capas, sinopses e busca instantânea'
    ],
    especificacoes: [
      { label: 'Plataforma', value: 'Android 7.0 ou superior (Smartphones & Tablets)' },
      { label: 'Personalização', value: 'Nome do App, Ícone, Splash e Fundo de Login' },
      { label: 'Entrega', value: 'APK pronto para instalar após envio dos dados' },
      { label: 'Suporte', value: 'Orientação completa na instalação via WhatsApp' }
    ],
    descricaoCompleta:
      'Ofereça aos seus clientes um aplicativo exclusivo de celular Android com visual de cinema!\n\n' +
      'Desenvolvido especialmente para telas touch de smartphones, este app combina leveza, carregamento ultra rápido e uma experiência visual premium igual aos grandes serviços de streaming.\n\n' +
      'Você recebe o aplicativo personalizado com o nome da sua marca, sua logo e conectado diretamente ao seu painel/servidor. Basta enviar o APK para seus clientes instalarem com 1 toque!'
  },
  {
    id: 'app_tv',
    label: '📺 App TV Box / Android TV',
    defaultNome: 'App Cinema TV Edition (TV Box & Android TV)',
    subtitulo: 'Aplicativo feito sob medida para TVs e controles remotos, com zapping rápido e menu fluido.',
    categoria: 'App Android TV / Box',
    badge: 'TV & BOX',
    compatibilidade: ['Android TV', 'TV Box', 'Fire Stick'],
    recursos: [
      'Navegação 100% adaptada para controle remoto (D-Pad)',
      'TV ao vivo com guia de categorias e menu flutuante rápido',
      'Área de Filmes, Séries, Animes e Lançamentos em destaque',
      'Layout personalizado com sua logo e identidade visual',
      'Leve e estável mesmo em TV Box de entrada'
    ],
    especificacoes: [
      { label: 'Dispositivos', value: 'TV Box, Android TV, Fire Stick, Mi Stick' },
      { label: 'Personalização', value: 'Logo, Nome do App e Conexão com seu servidor' },
      { label: 'Prazo de Entrega', value: 'Entrega rápida após confirmação' }
    ],
    descricaoCompleta:
      'Transforme a televisão dos seus clientes com um aplicativo rápido, bonito e muito fácil de mexer pelo controle remoto!\n\n' +
      'Conta com tela inicial em destaque, organização inteligente por categorias de TV ao vivo, filmes e séries com capas em HD e player de alta performance.\n\n' +
      'Entregamos o aplicativo personalizado com a sua marca pronto para rodar em TV Box, Android TV e Fire TV Stick.'
  },
  {
    id: 'app_hibrido',
    label: '🔄 App TV + Celular',
    defaultNome: 'App Híbrido Multi-Telas (TV + Celular)',
    subtitulo: 'Um único aplicativo inteligente que se adapta perfeitamente à TV Box e ao Celular Android.',
    categoria: 'App TV + Celular',
    badge: 'MULTI-TELAS',
    compatibilidade: ['Celular Android', 'Android TV', 'TV Box', 'Fire Stick'],
    recursos: [
      'Funciona tanto por toque na tela (celular) quanto por controle remoto (TV)',
      'Design moderno com tela de login dividida e logo em destaque',
      'Catálogo completo de Filmes, Séries e Canais ao Vivo',
      'Personalizado com o nome e logo do seu negócio',
      'Maior praticidade: apenas 1 link de download para todos os clientes'
    ],
    especificacoes: [
      { label: 'Compatibilidade', value: 'Celulares Android, TV Box, Android TV e Fire Stick' },
      { label: 'Entrega', value: 'Arquivo APK compilado com sua marca' }
    ],
    descricaoCompleta:
      'A solução mais prática para sua operação: um único aplicativo compatível com celulares Android, TV Box e Smart TVs Android!\n\n' +
      'Você não precisa manter vários aplicativos diferentes — a interface detecta o uso por toque ou controle remoto e entrega sempre a melhor experiência para o seu cliente.'
  },
  {
    id: 'painel_web',
    label: '🖥️ Painel Web / Sistema',
    defaultNome: 'Painel Gestor Streaming Pro (Web + Admin)',
    subtitulo: 'Sistema completo em nuvem com gestão de clientes, importação automática e cobrança PIX.',
    categoria: 'Painel Web / Sistema',
    badge: 'SISTEMA PRO',
    compatibilidade: ['Navegador Web', 'PC / Windows', 'Celular Android'],
    recursos: [
      'Painel Administrativo moderno acessível de qualquer celular ou PC',
      'Importação automática de Filmes, Séries e Canais M3U/TMDB',
      'Gerador de Banners e Posts promocionais integrado em 4K',
      'Controle de Revendas, Vencimentos e Pagamentos via PIX',
      'Configurado e entregue pronto para uso'
    ],
    especificacoes: [
      { label: 'Acesso', value: '100% Online via Navegador (PC e Celular)' },
      { label: 'Infraestrutura', value: 'Nuvem de alta velocidade e baixa latência' },
      { label: 'Suporte', value: 'Treinamento básico e suporte na configuração' }
    ],
    descricaoCompleta:
      'Tenha o controle profissional de toda a sua operação em um painel web moderno, rápido e completo!\n\n' +
      'Gerencie clientes, catálogos, revendedores, links protegidos e gere artes profissionais de divulgação sem depender de ferramentas externas.'
  },
  {
    id: 'design_pack',
    label: '🎨 Design / Artes / Logo',
    defaultNome: 'Pack Identidade Visual + Banners Profissionais',
    subtitulo: 'Destaque sua marca com logo exclusiva, banners de planos e artes prontas para WhatsApp e Instagram.',
    categoria: 'Design & Artes',
    badge: 'DESIGN PRO',
    compatibilidade: ['WhatsApp / Redes', 'Celular Android', 'PC / Windows'],
    recursos: [
      'Criação ou vetorização da sua Logo em PNG sem fundo (Alta Definição)',
      'Banners promocionais personalizados para Status e Feed',
      'Cores e tipografia profissionais alinhadas ao seu público',
      'Entrega rápida com arquivos prontos para postar'
    ],
    especificacoes: [
      { label: 'Arquivos Entregues', value: 'PNG sem fundo + JPG em Alta Definição' },
      { label: 'Ajustes', value: 'Revisões inclusas até sua aprovação' }
    ],
    descricaoCompleta:
      'A primeira impressão é a que vende! Deixe sua marca com aparência de grande empresa usando artes profissionais feitas sob medida.\n\n' +
      'Ideal para quem quer passar mais credibilidade no WhatsApp, Instagram e dentro dos seus aplicativos.'
  },
  {
    id: 'produto_digital',
    label: '📦 Produto / Serviço Geral',
    defaultNome: 'Solução Digital Personalizada',
    subtitulo: 'Produto digital completo com entrega rápida, suporte dedicado e garantia de funcionamento.',
    categoria: 'Outros Produtos',
    badge: 'DESTAQUE',
    compatibilidade: ['Navegador Web', 'WhatsApp / Redes', 'PC / Windows'],
    recursos: [
      'Entrega digital rápida diretamente após a confirmação',
      'Suporte humano via WhatsApp para tirar dúvidas',
      'Material testado e validado antes do envio',
      'Melhor custo-benefício para impulsionar seus resultados'
    ],
    especificacoes: [
      { label: 'Modalidade', value: 'Produto / Serviço Digital' },
      { label: 'Atendimento', value: 'Via WhatsApp após confirmação do pedido' }
    ],
    descricaoCompleta:
      'Adquira agora mesmo com total segurança e suporte direto pelo nosso atendimento oficial.\n\n' +
      'Assim que seu pedido for confirmado, nossa equipe entra em contato para realizar a entrega e te auxiliar em todo o processo.'
  }
];

interface AdminLojaProductModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingProduct: LojaProduto | null;
}

export const AdminLojaProductModal: React.FC<AdminLojaProductModalProps> = React.memo(({
  open,
  onOpenChange,
  editingProduct,
}) => {
  const [savingProduct, setSavingProduct] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);

  // Campos isolados no modal (digitar não re-renderiza tabelas/listas de AdminLoja)
  const [nome, setNome] = useState('');
  const [subtitulo, setSubtitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [descricaoCompleta, setDescricaoCompleta] = useState('');
  const [preco, setPreco] = useState('');
  const [precoOriginal, setPrecoOriginal] = useState('');
  const [categoria, setCategoria] = useState('App Celular Android');
  const [badge, setBadge] = useState('');
  const [imagemPrincipal, setImagemPrincipal] = useState('');
  const [galeriaImagens, setGaleriaImagens] = useState<string[]>([]);
  const [newGalleryUrl, setNewGalleryUrl] = useState('');
  const [videoDemoUrl, setVideoDemoUrl] = useState('');
  const [liberarDemo, setLiberarDemo] = useState(false);
  const [demoAppUrl, setDemoAppUrl] = useState('');
  const [recursos, setRecursos] = useState<string[]>([]);
  const [newRecurso, setNewRecurso] = useState('');
  const [especificacoes, setEspecificacoes] = useState<LojaSpec[]>([]);
  const [newSpecLabel, setNewSpecLabel] = useState('');
  const [newSpecValue, setNewSpecValue] = useState('');
  const [compatibilidade, setCompatibilidade] = useState<string[]>(['Celular Android']);
  const [status, setStatus] = useState<'ativo' | 'inativo'>('ativo');
  const [destaque, setDestaque] = useState(false);
  const [ordem, setOrdem] = useState('0');

  useEffect(() => {
    if (!open) return;
    if (editingProduct) {
      setNome(editingProduct.nome);
      setSubtitulo(editingProduct.subtitulo);
      setDescricao(editingProduct.descricao);
      setDescricaoCompleta(editingProduct.descricaoCompleta);
      setPreco(String(editingProduct.preco));
      setPrecoOriginal(editingProduct.precoOriginal ? String(editingProduct.precoOriginal) : '');
      setCategoria(editingProduct.categoria);
      setBadge(editingProduct.badge || '');
      setImagemPrincipal(editingProduct.imagemPrincipal || '');
      setGaleriaImagens(editingProduct.galeriaImagens || []);
      setNewGalleryUrl('');
      setVideoDemoUrl(editingProduct.videoDemoUrl || '');
      setLiberarDemo(Boolean(editingProduct.liberarDemo));
      setDemoAppUrl(editingProduct.demoAppUrl || '');
      setRecursos(editingProduct.recursos || []);
      setNewRecurso('');
      setEspecificacoes(editingProduct.especificacoes || []);
      setNewSpecLabel('');
      setNewSpecValue('');
      setCompatibilidade(editingProduct.compatibilidade || []);
      setStatus(editingProduct.status);
      setDestaque(editingProduct.destaque);
      setOrdem(String(editingProduct.ordem || 0));
    } else {
      setNome('');
      setSubtitulo('');
      setDescricao('');
      setDescricaoCompleta('');
      setPreco('');
      setPrecoOriginal('');
      setCategoria('App Celular Android');
      setBadge('');
      setImagemPrincipal('');
      setGaleriaImagens([]);
      setNewGalleryUrl('');
      setVideoDemoUrl('');
      setLiberarDemo(false);
      setDemoAppUrl('');
      setRecursos([]);
      setNewRecurso('');
      setEspecificacoes([]);
      setNewSpecLabel('');
      setNewSpecValue('');
      setCompatibilidade(['Celular Android']);
      setStatus('ativo');
      setDestaque(false);
      setOrdem('0');
    }
  }, [open, editingProduct]);

  const copyLinkToClipboard = (url: string) => {
    const fullUrl = LojaService.getFullImageUrl(url);
    navigator.clipboard.writeText(fullUrl);
    toast.success('Link da imagem copiado!');
  };

  const applyCopyPreset = (preset: CopyTemplatePreset) => {
    if (!nome.trim()) setNome(preset.defaultNome);
    setSubtitulo(preset.subtitulo);
    setCategoria(preset.categoria);
    setBadge(preset.badge);
    setCompatibilidade(preset.compatibilidade);
    setRecursos(preset.recursos);
    setEspecificacoes(preset.especificacoes);
    setDescricaoCompleta(preset.descricaoCompleta);
    toast.success(`Legenda e descrição preenchidas (${preset.label})! Agora só ajuste preço e fotos.`);
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCover(true);
    try {
      const url = await LojaService.uploadImage(file, 'capas');
      setImagemPrincipal(url);
      toast.success('Imagem convertida em link e definida como capa!');
    } catch {
      toast.error('Erro ao converter imagem');
    } finally {
      setUploadingCover(false);
      e.target.value = '';
    }
  };

  // Upload paralelo de múltiplas imagens para máxima velocidade
  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploadingGallery(true);
    try {
      const fileList = Array.from(files);
      const uploaded = await Promise.all(
        fileList.map((file) => LojaService.uploadImage(file, 'galeria'))
      );
      setGaleriaImagens((prev) => [...prev, ...uploaded]);
      if (!imagemPrincipal && uploaded[0]) {
        setImagemPrincipal(uploaded[0]);
      }
      toast.success(`${uploaded.length} imagem(ns) convertida(s) em link e adicionada(s) na galeria!`);
    } catch {
      toast.error('Erro ao converter imagens da galeria');
    } finally {
      setUploadingGallery(false);
      e.target.value = '';
    }
  };

  const handleAddGalleryUrl = () => {
    if (!newGalleryUrl.trim()) return;
    setGaleriaImagens((prev) => [...prev, newGalleryUrl.trim()]);
    if (!imagemPrincipal) setImagemPrincipal(newGalleryUrl.trim());
    setNewGalleryUrl('');
  };

  const toggleCompat = (comp: string) => {
    setCompatibilidade((prev) =>
      prev.includes(comp) ? prev.filter((c) => c !== comp) : [...prev, comp]
    );
  };

  const handleAddRecurso = () => {
    if (!newRecurso.trim()) return;
    setRecursos((prev) => [...prev, newRecurso.trim()]);
    setNewRecurso('');
  };

  const handleAddSpec = () => {
    if (!newSpecLabel.trim() || !newSpecValue.trim()) return;
    setEspecificacoes((prev) => [...prev, { label: newSpecLabel.trim(), value: newSpecValue.trim() }]);
    setNewSpecLabel('');
    setNewSpecValue('');
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !preco) {
      toast.error('Nome e preço são obrigatórios');
      return;
    }
    if (liberarDemo && !demoAppUrl.trim()) {
      toast.error('Informe o link do app demo para liberar o teste na loja');
      return;
    }

    setSavingProduct(true);
    try {
      const payload = {
        nome: nome.trim(),
        subtitulo: subtitulo.trim(),
        descricao: descricao.trim() || subtitulo.trim(),
        descricaoCompleta: descricaoCompleta.trim() || descricao.trim(),
        preco: parseFloat(preco),
        precoOriginal: precoOriginal ? parseFloat(precoOriginal) : undefined,
        categoria: categoria.trim() || 'Outros Produtos',
        badge: badge.trim().toUpperCase(),
        imagemPrincipal: imagemPrincipal.trim() || galeriaImagens[0] || '',
        galeriaImagens,
        videoDemoUrl: videoDemoUrl.trim(),
        liberarDemo,
        demoAppUrl: liberarDemo ? demoAppUrl.trim() : '',
        recursos,
        especificacoes,
        compatibilidade,
        status,
        destaque,
        ordem: parseInt(ordem, 10) || 0
      };

      if (editingProduct) {
        await LojaService.updateProduct(editingProduct.id, payload);
        toast.success('Produto atualizado na loja!');
      } else {
        await LojaService.createProduct(payload);
        toast.success('Produto publicado na loja!');
      }

      onOpenChange(false);
    } catch (err) {
      console.error('Erro ao salvar produto:', err);
      toast.error('Erro ao salvar produto');
    } finally {
      setSavingProduct(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto bg-slate-900 border-slate-700 text-white custom-scrollbar">
        <DialogHeader>
          <DialogTitle className="text-xl font-black">
            {editingProduct ? 'Editar Produto da Loja' : 'Novo Produto na Loja'}
          </DialogTitle>
          <DialogDescription className="text-slate-400 text-xs">
            Escolha um modelo pronto de legenda abaixo ou preencha manualmente, converta suas fotos em link e publique!
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSaveProduct} className="space-y-5 pt-2">
          {/* MODELOS PRONTOS DE LEGENDA & DESCRIÇÃO (1 CLIQUE) */}
          <div className="p-3.5 rounded-xl bg-gradient-to-r from-purple-950/60 via-slate-800/80 to-indigo-950/60 border border-purple-500/30 space-y-2.5">
            <div className="flex items-center gap-2">
              <Wand2 className="w-4 h-4 text-purple-400" />
              <span className="text-xs font-black text-white uppercase tracking-wide">
                Preencher Legenda & Descrição Pronta em 1 Clique:
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {COPY_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => applyCopyPreset(tpl)}
                  className="px-2.5 py-2 rounded-lg bg-slate-900/90 hover:bg-purple-600/30 border border-purple-500/30 text-left text-[11px] font-bold text-white transition-all hover:scale-[1.01]"
                >
                  {tpl.label}
                </button>
              ))}
            </div>
          </div>

          {/* Nome */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold">Nome do Produto *</Label>
            <Input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: App Infinity Mobile (Celular Android) ou Painel Web Pro"
              className="bg-slate-800 border-slate-700"
              required
            />
          </div>

          {/* Categoria com Botões Visuais + Input Editável */}
          <div className="space-y-2">
            <Label className="text-xs font-bold">Categoria do Produto</Label>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORY_PRESETS.map((cat) => {
                const Icon = cat.icon;
                const active = categoria === cat.label;
                return (
                  <button
                    type="button"
                    key={cat.label}
                    onClick={() => setCategoria(cat.label)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${
                      active
                        ? 'bg-purple-600 border-purple-400 text-white shadow'
                        : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {cat.label}
                  </button>
                );
              })}
            </div>
            <Input
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              placeholder="Ou digite uma categoria personalizada..."
              className="bg-slate-800 border-slate-700 text-xs h-8"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold">Subtítulo / Legenda Curta</Label>
            <Input
              value={subtitulo}
              onChange={(e) => setSubtitulo(e.target.value)}
              placeholder="Use os botões acima para gerar automaticamente..."
              className="bg-slate-800 border-slate-700"
            />
          </div>

          {/* Preços, Badge e Status */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Preço (R$) *</Label>
              <Input
                type="number"
                step="0.01"
                value={preco}
                onChange={(e) => setPreco(e.target.value)}
                placeholder="149.90"
                className="bg-slate-800 border-slate-700"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Preço Original (De)</Label>
              <Input
                type="number"
                step="0.01"
                value={precoOriginal}
                onChange={(e) => setPrecoOriginal(e.target.value)}
                placeholder="249.90"
                className="bg-slate-800 border-slate-700"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Selo / Badge</Label>
              <Input
                value={badge}
                onChange={(e) => setBadge(e.target.value)}
                placeholder="MAIS VENDIDO"
                className="bg-slate-800 border-slate-700"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Status</Label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as 'ativo' | 'inativo')}
                className="w-full h-10 px-3 bg-slate-800 border border-slate-700 rounded-md text-xs text-white"
              >
                <option value="ativo">Ativo (Visível)</option>
                <option value="inativo">Pausado</option>
              </select>
            </div>
          </div>

          {/* Imagem Principal (Upload converte em Link automaticamente!) */}
          <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-purple-300">
                Imagem Principal / Capa (Upload gera Link automático!)
              </Label>
              {imagemPrincipal && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-6 text-[10px] text-emerald-400"
                  onClick={() => copyLinkToClipboard(imagemPrincipal)}
                >
                  <Copy className="w-3 h-3 mr-1" /> Copiar Link
                </Button>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-3 items-center">
              {imagemPrincipal && (
                <img
                  src={imagemPrincipal}
                  alt="Capa"
                  loading="lazy"
                  decoding="async"
                  className="w-24 h-16 object-cover rounded-lg border border-slate-600 shrink-0 bg-black"
                />
              )}
              <div className="flex-1 w-full flex gap-2">
                <Input
                  value={imagemPrincipal}
                  onChange={(e) => setImagemPrincipal(e.target.value)}
                  placeholder="Cole o link da imagem ou clique em Subir & Gerar Link"
                  className="bg-slate-900 border-slate-700 text-xs font-mono"
                />
                <label className="cursor-pointer inline-flex items-center px-3 py-2 rounded-md bg-purple-600 hover:bg-purple-500 text-xs font-bold text-white shrink-0">
                  {uploadingCover ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Upload className="w-3.5 h-3.5 mr-1.5" />}
                  {uploadingCover ? 'Convertendo...' : 'Subir & Gerar Link'}
                  <input type="file" className="hidden" accept="image/*" onChange={handleCoverUpload} />
                </label>
              </div>
            </div>
          </div>

          {/* Galeria de Layouts / Telas do App */}
          <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700 space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <Label className="text-xs font-bold text-amber-300">
                  Galeria de Layouts / Amostras de Fotos ({galeriaImagens.length})
                </Label>
                <p className="text-[11px] text-slate-400">
                  Cada foto enviada vira um link permanente automaticamente. Você pode subir várias de uma vez!
                </p>
              </div>
              <label className="cursor-pointer inline-flex items-center px-3 py-1.5 rounded-md bg-amber-500 hover:bg-amber-400 text-xs font-black text-black shrink-0">
                {uploadingGallery ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Upload className="w-3.5 h-3.5 mr-1.5" />}
                {uploadingGallery ? 'Convertendo...' : 'Subir Fotos & Gerar Links'}
                <input type="file" multiple className="hidden" accept="image/*" onChange={handleGalleryUpload} />
              </label>
            </div>

            <div className="flex gap-2">
              <Input
                value={newGalleryUrl}
                onChange={(e) => setNewGalleryUrl(e.target.value)}
                placeholder="Ou cole o link de outra imagem..."
                className="bg-slate-900 border-slate-700 text-xs font-mono"
              />
              <Button type="button" size="sm" variant="outline" onClick={handleAddGalleryUrl}>
                Adicionar URL
              </Button>
            </div>

            {galeriaImagens.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
                {galeriaImagens.map((url, idx) => (
                  <div key={idx} className="relative group rounded-lg overflow-hidden border border-slate-600 bg-black flex flex-col">
                    <div className="aspect-video relative">
                      <img
                        src={url}
                        alt={`Layout ${idx + 1}`}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => setGaleriaImagens((prev) => prev.filter((_, i) => i !== idx))}
                        className="absolute top-1 right-1 p-1 rounded-full bg-red-600 text-white"
                        title="Remover"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between p-1 bg-slate-900 text-[9px] gap-1">
                      <button
                        type="button"
                        onClick={() => copyLinkToClipboard(url)}
                        className="text-emerald-400 hover:underline flex items-center gap-0.5 truncate"
                      >
                        <Copy className="w-2.5 h-2.5" /> Copiar Link
                      </button>
                      <button
                        type="button"
                        onClick={() => { setImagemPrincipal(url); toast.success('Definida como capa!'); }}
                        className="text-purple-300 hover:underline shrink-0"
                      >
                        Capa
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Liberar App Demo para Download / Teste */}
          <div className="p-4 rounded-xl bg-emerald-950/25 border border-emerald-500/30 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <Label className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                  <Download className="w-3.5 h-3.5" />
                  Liberar App Demo para Teste Grátis
                </Label>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Ative apenas nos produtos que possuem aplicativo demo para o cliente baixar e testar na loja.
                </p>
              </div>
              <Switch checked={liberarDemo} onCheckedChange={setLiberarDemo} />
            </div>

            {liberarDemo && (
              <div className="space-y-1.5 pt-1">
                <Label className="text-xs font-bold text-slate-200">
                  Link de Download do App Demo (APK / Drive / MediaFire / URL Direta) *
                </Label>
                <Input
                  value={demoAppUrl}
                  onChange={(e) => setDemoAppUrl(e.target.value)}
                  placeholder="https://seusite.com/app-demo.apk"
                  className="bg-slate-900 border-emerald-500/40 text-xs font-mono"
                  required={liberarDemo}
                />
              </div>
            )}
          </div>

          {/* Vídeo Demo + Destaque */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Vídeo Demonstrativo (YouTube ou MP4 - opcional)</Label>
              <Input
                value={videoDemoUrl}
                onChange={(e) => setVideoDemoUrl(e.target.value)}
                placeholder="https://youtube.com/watch?v=..."
                className="bg-slate-800 border-slate-700 text-xs"
              />
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800 border border-slate-700 mt-4">
              <Label className="text-xs font-bold">Exibir como Produto em Destaque</Label>
              <Switch checked={destaque} onCheckedChange={setDestaque} />
            </div>
          </div>

          {/* Compatibilidade */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label className="text-xs font-bold">Compatibilidade / Onde Funciona</Label>
              <div className="flex gap-1.5 text-[10px]">
                <button
                  type="button"
                  onClick={() => setCompatibilidade(['Celular Android'])}
                  className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-300"
                >
                  Só Celular
                </button>
                <button
                  type="button"
                  onClick={() => setCompatibilidade(['Android TV', 'TV Box', 'Fire Stick'])}
                  className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-300"
                >
                  Só TV
                </button>
                <button
                  type="button"
                  onClick={() => setCompatibilidade(['Celular Android', 'Android TV', 'TV Box', 'Fire Stick'])}
                  className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-300"
                >
                  TV + Celular
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {COMPATIBILITY_OPTIONS.map((comp) => {
                const active = compatibilidade.includes(comp);
                return (
                  <button
                    type="button"
                    key={comp}
                    onClick={() => toggleCompat(comp)}
                    className={`px-3 py-1 rounded-full text-xs font-bold border transition-colors ${
                      active
                        ? 'bg-purple-600 border-purple-400 text-white'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    {active ? '✓ ' : ''}{comp}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Recursos Inclusos */}
          <div className="space-y-2">
            <Label className="text-xs font-bold">O que está incluso (Lista de Recursos)</Label>
            <div className="flex gap-2">
              <Input
                value={newRecurso}
                onChange={(e) => setNewRecurso(e.target.value)}
                placeholder="Ex: Tela de login personalizada com sua marca"
                className="bg-slate-800 border-slate-700 text-xs"
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddRecurso(); } }}
              />
              <Button type="button" size="sm" variant="secondary" onClick={handleAddRecurso}>
                Adicionar
              </Button>
            </div>
            {recursos.length > 0 && (
              <div className="space-y-1 pt-1">
                {recursos.map((r, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-slate-800 px-3 py-1.5 rounded text-xs">
                    <span>✓ {r}</span>
                    <button
                      type="button"
                      onClick={() => setRecursos((prev) => prev.filter((_, i) => i !== idx))}
                      className="text-red-400 hover:text-red-300"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Especificações */}
          <div className="space-y-2">
            <Label className="text-xs font-bold">Especificações Técnicas (Opcional)</Label>
            <div className="grid grid-cols-5 gap-2">
              <Input
                value={newSpecLabel}
                onChange={(e) => setNewSpecLabel(e.target.value)}
                placeholder="Ex: Plataforma"
                className="col-span-2 bg-slate-800 border-slate-700 text-xs"
              />
              <Input
                value={newSpecValue}
                onChange={(e) => setNewSpecValue(e.target.value)}
                placeholder="Ex: Android 7.0+"
                className="col-span-2 bg-slate-800 border-slate-700 text-xs"
              />
              <Button type="button" size="sm" variant="secondary" onClick={handleAddSpec}>
                + Add
              </Button>
            </div>
            {especificacoes.length > 0 && (
              <div className="space-y-1 pt-1">
                {especificacoes.map((s, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-slate-800 px-3 py-1.5 rounded text-xs">
                    <span><strong>{s.label}:</strong> {s.value}</span>
                    <button
                      type="button"
                      onClick={() => setEspecificacoes((prev) => prev.filter((_, i) => i !== idx))}
                      className="text-red-400 hover:text-red-300"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Descrição Completa */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold">Descrição Completa do Produto</Label>
            <Textarea
              value={descricaoCompleta}
              onChange={(e) => setDescricaoCompleta(e.target.value)}
              placeholder="Clique em um dos Modelos Prontos acima para preencher automaticamente..."
              rows={4}
              className="bg-slate-800 border-slate-700 text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={savingProduct} className="bg-purple-600 hover:bg-purple-500 font-bold">
              {savingProduct && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingProduct ? 'Salvar Alterações' : 'Publicar na Loja'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
});

AdminLojaProductModal.displayName = 'AdminLojaProductModal';
