import { db } from '@/config/firebase';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  setDoc,
  onSnapshot,
  query,
  orderBy,
  where
} from 'firebase/firestore';

export interface LojaSpec {
  label: string;
  value: string;
}

export interface LojaProduto {
  id: string;
  nome: string;
  subtitulo: string;
  descricao: string;
  descricaoCompleta: string;
  preco: number;
  precoOriginal?: number;
  categoria: string;
  badge?: string;
  imagemPrincipal: string;
  galeriaImagens: string[];
  videoDemoUrl?: string;
  recursos: string[];
  especificacoes: LojaSpec[];
  compatibilidade: string[];
  status: 'ativo' | 'inativo';
  destaque: boolean;
  ordem: number;
  criadoEm: string;
  atualizadoEm: string;
}

export interface LojaConfig {
  nomeLoja: string;
  slogan: string;
  heroTitulo: string;
  heroSubtitulo: string;
  whatsappVendas: string;
  corDestaque: string;
  permitirPix: boolean;
  permitirWhatsapp: boolean;
  textoGarantia: string;
}

export interface LojaPedidoItem {
  id: string;
  nome: string;
  preco: number;
  quantidade: number;
  imagem?: string;
}

export interface LojaPedido {
  id: string;
  clienteNome: string;
  clienteWhatsapp: string;
  clienteEmail?: string;
  clienteObservacao?: string;
  itens: LojaPedidoItem[];
  total: number;
  metodoPagamento: 'pix' | 'whatsapp';
  status: 'pendente' | 'pago' | 'entregue' | 'cancelado';
  asaasPaymentId?: string;
  criadoEm: string;
}

export const DEFAULT_LOJA_CONFIG: LojaConfig = {
  nomeLoja: 'TIBIM STORE',
  slogan: 'Aplicativos, Painéis & Soluções Profissionais para Streaming',
  heroTitulo: 'Soluções Digitais e Aplicativos Exclusivos para seu Negócio',
  heroSubtitulo: 'Confira nossos aplicativos com layouts modernos, painéis administrativos completos e ferramentas prontas para escalar suas vendas.',
  whatsappVendas: '244930717724',
  corDestaque: '#e50914',
  permitirPix: true,
  permitirWhatsapp: true,
  textoGarantia: 'Suporte especializado na instalação e entrega rápida após confirmação.'
};

const COLLECTION_PRODUTOS = 'loja_produtos';
const COLLECTION_PEDIDOS = 'loja_pedidos';
const COLLECTION_IMAGENS = 'loja_imagens';
const DOC_CONFIG_PATH = ['config', 'loja'] as const;

export interface LojaImagemRecord {
  id: string;
  url: string;
  fileName: string;
  folder: string;
  createdAt: string;
}

// Helper para comprimir imagem mantendo nitidez e tamanho compacto (<350KB)
const compressImageToBase64 = (file: File, maxWidth = 1080, quality = 0.84): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(event.target?.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        let dataUrl = canvas.toDataURL('image/webp', quality);
        // Garante compatibilidade caso dataUrl ultrapasse 650KB
        if (dataUrl.length > 650000) {
          dataUrl = canvas.toDataURL('image/jpeg', 0.72);
        }
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error('Erro ao ler imagem'));
      img.src = event.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Erro ao abrir arquivo'));
    reader.readAsDataURL(file);
  });
};

export const LojaService = {
  // Converte imagem enviada em link HTTP real hospedado no banco/API (/api/loja-img?id=...)
  async uploadImage(file: File, folder = 'produtos'): Promise<string> {
    const compressedDataUrl = await compressImageToBase64(file, 1080, 0.84);
    try {
      const imgDocRef = await addDoc(collection(db, COLLECTION_IMAGENS), {
        dataUrl: compressedDataUrl,
        fileName: file.name || 'imagem.webp',
        folder,
        createdAt: new Date().toISOString()
      });
      return `/api/loja-img?id=${imgDocRef.id}`;
    } catch (err) {
      console.warn('Fallback para Data URL comprimida:', err);
      return compressedDataUrl;
    }
  },

  getFullImageUrl(url: string): string {
    if (!url) return '';
    if (url.startsWith('/api/')) {
      const origin = typeof window !== 'undefined' ? window.location.origin : 'https://tibimmanagerpainel.shop';
      return `${origin}${url}`;
    }
    return url;
  },

  subscribeUploadedImages(callback: (images: LojaImagemRecord[]) => void) {
    const q = query(collection(db, COLLECTION_IMAGENS), orderBy('createdAt', 'desc'));
    return onSnapshot(
      q,
      (snapshot) => {
        const items: LojaImagemRecord[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          items.push({
            id: docSnap.id,
            url: `/api/loja-img?id=${docSnap.id}`,
            fileName: data.fileName || 'imagem.webp',
            folder: data.folder || 'geral',
            createdAt: data.createdAt || new Date().toISOString()
          });
        });
        callback(items);
      },
      () => callback([])
    );
  },

  async deleteUploadedImage(id: string): Promise<void> {
    await deleteDoc(doc(db, COLLECTION_IMAGENS, id));
  },

  // Assinar produtos em tempo real
  subscribeProducts(callback: (products: LojaProduto[]) => void, onlyActive = false) {
    const colRef = collection(db, COLLECTION_PRODUTOS);
    const q = onlyActive
      ? query(colRef, where('status', '==', 'ativo'))
      : query(colRef, orderBy('criadoEm', 'desc'));

    return onSnapshot(
      q,
      (snapshot) => {
        const items: LojaProduto[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          items.push({
            id: docSnap.id,
            nome: data.nome || '',
            subtitulo: data.subtitulo || '',
            descricao: data.descricao || '',
            descricaoCompleta: data.descricaoCompleta || '',
            preco: Number(data.preco) || 0,
            precoOriginal: data.precoOriginal ? Number(data.precoOriginal) : undefined,
            categoria: data.categoria || 'Aplicativos',
            badge: data.badge || '',
            imagemPrincipal: data.imagemPrincipal || '',
            galeriaImagens: Array.isArray(data.galeriaImagens) ? data.galeriaImagens : [],
            videoDemoUrl: data.videoDemoUrl || '',
            recursos: Array.isArray(data.recursos) ? data.recursos : [],
            especificacoes: Array.isArray(data.especificacoes) ? data.especificacoes : [],
            compatibilidade: Array.isArray(data.compatibilidade) ? data.compatibilidade : [],
            status: data.status === 'inativo' ? 'inativo' : 'ativo',
            destaque: Boolean(data.destaque),
            ordem: Number(data.ordem) || 0,
            criadoEm: data.criadoEm || new Date().toISOString(),
            atualizadoEm: data.atualizadoEm || new Date().toISOString()
          });
        });

        // Ordenar por destaque, ordem e data
        items.sort((a, b) => {
          if (a.destaque !== b.destaque) return a.destaque ? -1 : 1;
          if (a.ordem !== b.ordem) return a.ordem - b.ordem;
          return new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime();
        });

        callback(items);
      },
      (error) => {
        console.error('Erro ao carregar produtos da loja:', error);
        callback([]);
      }
    );
  },

  async getProductById(id: string): Promise<LojaProduto | null> {
    try {
      const docRef = doc(db, COLLECTION_PRODUTOS, id);
      const snap = await getDoc(docRef);
      if (!snap.exists()) return null;
      const data = snap.data();
      return {
        id: snap.id,
        nome: data.nome || '',
        subtitulo: data.subtitulo || '',
        descricao: data.descricao || '',
        descricaoCompleta: data.descricaoCompleta || '',
        preco: Number(data.preco) || 0,
        precoOriginal: data.precoOriginal ? Number(data.precoOriginal) : undefined,
        categoria: data.categoria || 'Aplicativos',
        badge: data.badge || '',
        imagemPrincipal: data.imagemPrincipal || '',
        galeriaImagens: Array.isArray(data.galeriaImagens) ? data.galeriaImagens : [],
        videoDemoUrl: data.videoDemoUrl || '',
        recursos: Array.isArray(data.recursos) ? data.recursos : [],
        especificacoes: Array.isArray(data.especificacoes) ? data.especificacoes : [],
        compatibilidade: Array.isArray(data.compatibilidade) ? data.compatibilidade : [],
        status: data.status === 'inativo' ? 'inativo' : 'ativo',
        destaque: Boolean(data.destaque),
        ordem: Number(data.ordem) || 0,
        criadoEm: data.criadoEm || new Date().toISOString(),
        atualizadoEm: data.atualizadoEm || new Date().toISOString()
      };
    } catch (err) {
      console.error('Erro ao buscar produto:', err);
      return null;
    }
  },

  async createProduct(data: Omit<LojaProduto, 'id' | 'criadoEm' | 'atualizadoEm'>): Promise<string> {
    const now = new Date().toISOString();
    const docRef = await addDoc(collection(db, COLLECTION_PRODUTOS), {
      ...data,
      criadoEm: now,
      atualizadoEm: now
    });
    return docRef.id;
  },

  async updateProduct(id: string, data: Partial<LojaProduto>): Promise<void> {
    const docRef = doc(db, COLLECTION_PRODUTOS, id);
    await updateDoc(docRef, {
      ...data,
      atualizadoEm: new Date().toISOString()
    });
  },

  async deleteProduct(id: string): Promise<void> {
    await deleteDoc(doc(db, COLLECTION_PRODUTOS, id));
  },

  // Configurações da Loja
  subscribeConfig(callback: (config: LojaConfig) => void) {
    const docRef = doc(db, DOC_CONFIG_PATH[0], DOC_CONFIG_PATH[1]);
    return onSnapshot(
      docRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as Partial<LojaConfig>;
          callback({
            ...DEFAULT_LOJA_CONFIG,
            ...data,
            whatsappVendas: (data.whatsappVendas || '').trim() || DEFAULT_LOJA_CONFIG.whatsappVendas
          });
        } else {
          callback(DEFAULT_LOJA_CONFIG);
        }
      },
      () => callback(DEFAULT_LOJA_CONFIG)
    );
  },

  async saveConfig(config: LojaConfig): Promise<void> {
    const docRef = doc(db, DOC_CONFIG_PATH[0], DOC_CONFIG_PATH[1]);
    await setDoc(docRef, config, { merge: true });
  },

  async getWhatsappFallback(): Promise<string> {
    return DEFAULT_LOJA_CONFIG.whatsappVendas;
  },

  formatWhatsappUrl(rawNumber: string, encodedText?: string): string {
    const digits = (rawNumber || DEFAULT_LOJA_CONFIG.whatsappVendas).replace(/\D/g, '');
    let finalDigits = digits;
    if (digits.length === 9 && digits.startsWith('9')) {
      finalDigits = `244${digits}`;
    } else if ((digits.length === 10 || digits.length === 11) && !digits.startsWith('244') && !digits.startsWith('55')) {
      finalDigits = `55${digits}`;
    }
    return encodedText
      ? `https://wa.me/${finalDigits}?text=${encodedText}`
      : `https://wa.me/${finalDigits}`;
  },

  // Pedidos da Loja
  async createOrder(order: Omit<LojaPedido, 'id' | 'criadoEm'>): Promise<string> {
    const docRef = await addDoc(collection(db, COLLECTION_PEDIDOS), {
      ...order,
      criadoEm: new Date().toISOString()
    });
    return docRef.id;
  },

  subscribeOrders(callback: (orders: LojaPedido[]) => void) {
    const q = query(collection(db, COLLECTION_PEDIDOS), orderBy('criadoEm', 'desc'));
    return onSnapshot(
      q,
      (snapshot) => {
        const items: LojaPedido[] = [];
        snapshot.forEach((docSnap) => {
          items.push({ id: docSnap.id, ...docSnap.data() } as LojaPedido);
        });
        callback(items);
      },
      () => callback([])
    );
  },

  async updateOrderStatus(id: string, status: LojaPedido['status']): Promise<void> {
    await updateDoc(doc(db, COLLECTION_PEDIDOS, id), { status });
  },

  // Criar produtos modelo de demonstração (para o Admin testar e editar facilmente)
  async seedDemoProducts(): Promise<number> {
    const existing = await getDocs(collection(db, COLLECTION_PRODUTOS));
    if (!existing.empty) return 0;

    const demos: Omit<LojaProduto, 'id' | 'criadoEm' | 'atualizadoEm'>[] = [
      {
        nome: 'App Infinity Stream TV (Android & TV Box)',
        subtitulo: 'Aplicativo personalizado com sua marca, tela de login moderna, TV ao vivo em categorias e player 4K.',
        descricao: 'Aplicativo completo para Android TV, TV Box, Fire Stick e Celular com design estilo streaming premium e painel de controle integrado.',
        descricaoCompleta: 'O App Infinity Stream TV foi desenvolvido para quem deseja entregar uma experiência de cinema para seus clientes.\n\nConta com tela de login moderna com sua logo, menu de TV ao vivo com navegação fluida por categorias e rolagem infinita, seção de Filmes, Séries, Animes e suporte completo a EPG e múltiplos players.\n\nVocê recebe o APK personalizado com o nome e logo da sua marca pronto para distribuir aos seus clientes!',
        preco: 149.90,
        precoOriginal: 249.90,
        categoria: 'Aplicativos Android / TV',
        badge: 'MAIS VENDIDO',
        imagemPrincipal: 'https://images.unsplash.com/photo-1593784991095-a205069470b6?auto=format&fit=crop&w=1000&q=80',
        galeriaImagens: [
          'https://images.unsplash.com/photo-1593784991095-a205069470b6?auto=format&fit=crop&w=1000&q=80',
          'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?auto=format&fit=crop&w=1000&q=80',
          'https://images.unsplash.com/photo-1611162617474-5b21e879e113?auto=format&fit=crop&w=1000&q=80'
        ],
        recursos: [
          'APK 100% personalizado com sua Logo e Nome',
          'Tela de Login limpa com Teste Grátis integrado',
          'TV ao Vivo com menu flutuante e categorias fluidas',
          'Catálogo TMDB automático com capas e sinopses',
          'Compatível com Controle Remoto (D-Pad) e Touch'
        ],
        especificacoes: [
          { label: 'Plataforma', value: 'Android 6.0+ / Android TV / Fire OS' },
          { label: 'Personalização', value: 'Nome, Logo, Cores e URL do Painel' },
          { label: 'Prazo de Entrega', value: 'Até 24h após envio da logo' },
          { label: 'Suporte', value: 'Instalação e orientações via WhatsApp' }
        ],
        compatibilidade: ['Android TV', 'TV Box', 'Fire Stick', 'Celular Android'],
        status: 'ativo',
        destaque: true,
        ordem: 1
      },
      {
        nome: 'Painel Gestor Streaming Pro (Web + Admin)',
        subtitulo: 'Painel completo com importação M3U/TMDB, Gerador de Posts 4K, Revendas e Integração PIX.',
        descricao: 'Sistema completo em nuvem para gerenciar conteúdos, usuários, revendedores e artes promocionais automaticamente.',
        descricaoCompleta: 'Tenha o controle total da sua operação de streaming em um painel moderno, rápido e intuitivo.\n\nInclui importação automática via TMDB, gerador de banners de filmes e jogos esportivos em 4K, sistema de revendedores com créditos, controle de dispositivos conectados e cobrança automática via PIX.',
        preco: 299.00,
        precoOriginal: 450.00,
        categoria: 'Painéis Web',
        badge: 'SISTEMA COMPLETO',
        imagemPrincipal: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1000&q=80',
        galeriaImagens: [
          'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1000&q=80',
          'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1000&q=80'
        ],
        recursos: [
          'Importador automático de Filmes, Séries e Canais',
          'Gerador de Posts & Banner de Jogos em 4K',
          'Módulo de Revendas e Controle Financeiro PIX',
          'Painel Admin completo com gestão em tempo real'
        ],
        especificacoes: [
          { label: 'Hospedagem', value: 'Vercel / Cloud + Firebase + Baserow' },
          { label: 'Domínio', value: 'Configurado no seu domínio próprio' },
          { label: 'Licença', value: 'Uso exclusivo na sua operação' }
        ],
        compatibilidade: ['Navegador Web', 'Desktop', 'Celular'],
        status: 'ativo',
        destaque: true,
        ordem: 2
      },
      {
        nome: 'Pack Identidade Visual + Artes Divulgação',
        subtitulo: 'Logo profissional, banners para WhatsApp/Instagram e templates personalizados para seu servidor.',
        descricao: 'Pacote visual para destacar sua marca com artes profissionais de futebol, lançamentos de cinema e planos.',
        descricaoCompleta: 'Atraia muito mais clientes nas redes sociais e no status do WhatsApp com um visual profissional.\n\nCriamos a identidade da sua marca junto com um pacote de banners editáveis e modelos exclusivos para você divulgar seus planos e novidades diariamente.',
        preco: 69.90,
        precoOriginal: 119.90,
        categoria: 'Design & Artes',
        badge: 'LANÇAMENTO',
        imagemPrincipal: 'https://images.unsplash.com/photo-1626785774573-4b799315345d?auto=format&fit=crop&w=1000&q=80',
        galeriaImagens: [
          'https://images.unsplash.com/photo-1626785774573-4b799315345d?auto=format&fit=crop&w=1000&q=80'
        ],
        recursos: [
          'Logo em PNG sem fundo e alta resolução',
          '5 Banners promocionais de Planos e Teste Grátis',
          'Entrega rápida direto no WhatsApp'
        ],
        especificacoes: [
          { label: 'Formatos', value: 'PNG, JPG Ultra HD' },
          { label: 'Revisões', value: 'Até 3 ajustes inclusos' }
        ],
        compatibilidade: ['Instagram', 'WhatsApp', 'Facebook'],
        status: 'ativo',
        destaque: false,
        ordem: 3
      }
    ];

    for (const demo of demos) {
      await this.createProduct(demo);
    }
    return demos.length;
  }
};
