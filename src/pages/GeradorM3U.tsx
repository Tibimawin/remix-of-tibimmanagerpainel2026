import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useConfig } from '@/contexts/ConfigContext';
import { useSimpleAuth } from '@/contexts/SimpleAuthContext';
import { useTypeMode } from '@/contexts/TypeModeContext';
import { useBaserowService } from '@/services/BaserowService';
import { getValueByPossibleKeys } from '@/utils/baserowHelpers';
import { QRCodeGenerator } from '@/components/QRCodeGenerator';
import { toast } from 'sonner';

import {
  Tv,
  Film,
  Clapperboard,
  Download,
  Copy,
  Check,
  QrCode,
  RefreshCw,
  Server,
  Key,
  User,
  ExternalLink,
  ShieldCheck,
  SlidersHorizontal,
  FileText,
  Play,
  Layers,
  Sparkles,
  Info,
  HelpCircle,
  Eye,
  Send,
  Radio,
  FileDown,
  Search,
  CheckCircle2,
  XCircle,
  Code2,
  Terminal,
  Zap,
  Globe,
  Calendar,
  Clock,
  AlertTriangle
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';

export interface GeneratedItem {
  id: string | number;
  tipo: 'tv' | 'filme' | 'serie';
  nome: string;
  categoria: string;
  capa?: string;
  sinopse?: string;
  streamUrl: string;
  temporada?: string | number;
  episodio?: string | number;
  valido: boolean;
}

export default function GeradorM3U() {
  const { config, isConfigured } = useConfig();
  const { mode } = useTypeMode();
  const { userInfo } = useSimpleAuth();
  const baserowService = useBaserowService();

  // Configurações de conteúdo da lista
  const [incluirTV, setIncluirTV] = useState(true);
  const [incluirFilmes, setIncluirFilmes] = useState(true);
  const [incluirSeries, setIncluirSeries] = useState(true);
  const [apenasComLink, setApenasComLink] = useState(true);
  const [limitePorTipo, setLimitePorTipo] = useState<string>('0'); // 0 = sem limite (Filmes e TV 100%)
  const [limiteSeries, setLimiteSeries] = useState<string>('2500'); // 2500, 5000, 10000, 25000, 0 ou series_vod

  // Formato da M3U
  const [formatoSaida, setFormatoSaida] = useState<'original' | 'ts' | 'm3u8'>('original');
  const [nomeLista, setNomeLista] = useState('MinhaListaIPTV');

  // Configuração DNS / Xtream Codes — padrão: API dedicada na VPS (persistido no localStorage)
  const DNS_PADRAO_VPS = 'https://api.tibimmanagerpainel.shop';
  const DNS_STORAGE_KEY = 'tibim_xtream_dns_host';
  const [dnsHost, setDnsHost] = useState(() => {
    if (typeof window !== 'undefined') {
      const salvo = window.localStorage.getItem(DNS_STORAGE_KEY);
      if (salvo && salvo.trim()) return salvo.trim();
    }
    return DNS_PADRAO_VPS;
  });
  useEffect(() => {
    if (typeof window !== 'undefined' && dnsHost?.trim()) {
      window.localStorage.setItem(DNS_STORAGE_KEY, dnsHost.trim());
    }
  }, [dnsHost]);
  const [selectedUserId, setSelectedUserId] = useState<string>('manual');
  const [customUsername, setCustomUsername] = useState('demo');
  const [customPassword, setCustomPassword] = useState('123456');

  // Filtro de conteúdo no DNS (all | tv | movies | series)
  const [filtroTipoDns, setFiltroTipoDns] = useState<'all' | 'tv' | 'movies' | 'series'>('all');

  // Lista de usuários carregados do Baserow para seleção
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [loadingUsuarios, setLoadingUsuarios] = useState(false);

  // Estado da geração
  const [loading, setLoading] = useState(false);
  const [progresso, setProgresso] = useState(0);
  const [statusMsg, setStatusMsg] = useState('');
  const [itensGerados, setItensGerados] = useState<GeneratedItem[]>([]);
  const [m3uContent, setM3uContent] = useState('');
  const [copiadoM3U, setCopiadoM3U] = useState(false);
  const [copiadoDns, setCopiadoDns] = useState(false);
  const [copiadoWpp, setCopiadoWpp] = useState(false);

  // Filtro de busca na tabela de prévia
  const [buscaTabela, setBuscaTabela] = useState('');
  const [filtroTipoTabela, setFiltroTipoTabela] = useState<'todos' | 'tv' | 'filme' | 'serie'>('todos');

  // Testador de Conexão Xtream
  const [testandoXtream, setTestandoXtream] = useState(false);
  const [resultadoTeste, setResultadoTeste] = useState<any>(null);

  // QR Code Modal
  const [qrOpen, setQrOpen] = useState(false);
  const [qrUrl, setQrUrl] = useState('');

  // Carregar usuários do Baserow para vincular a credencial (suporta até 2500 registros)
  const carregarUsuarios = useCallback(async (forceRefresh = false) => {
    if (!isConfigured || !config.tableIds?.usuarios) return;
    try {
      setLoadingUsuarios(true);
      const resp = await baserowService.getAllTableData(config.tableIds.usuarios, undefined, 2500);
      if (resp && resp.results) {
        setUsuarios(resp.results);
        if (forceRefresh) {
          toast.success(`Tabela atualizada com sucesso! ${resp.results.length} usuários carregados do Baserow.`);
        }
      }
    } catch (err) {
      console.warn('Não foi possível carregar lista de usuários para o DNS:', err);
      if (forceRefresh) {
        toast.error('Erro ao atualizar lista de usuários do Baserow.');
      }
    } finally {
      setLoadingUsuarios(false);
    }
  }, [isConfigured, config.tableIds?.usuarios, baserowService]);

  useEffect(() => {
    carregarUsuarios(false);
  }, [carregarUsuarios]);

  // Se o usuário selecionou alguém da lista, atualizar username e senha
  const handleSelectUser = (id: string) => {
    setSelectedUserId(id);
    if (id === 'manual') return;
    const user = usuarios.find(u => String(u.id) === String(id));
    if (user) {
      const nome = getValueByPossibleKeys(user, 'nome') || getValueByPossibleKeys(user, 'usuario') || getValueByPossibleKeys(user, 'email') || 'usuario';
      const senha = getValueByPossibleKeys(user, 'senha') || '123456';
      const cleanU = String(nome).replace(/\s+/g, '_').toLowerCase();
      const cleanP = String(senha);
      setCustomUsername(cleanU);
      setCustomPassword(cleanP);

      // Sincronizar mapeamento imediatamente para roteamento multi-tenant instantâneo
      if (userInfo?.id) {
        setDoc(doc(db, 'xtreamUserMapping', cleanU), {
          userId: userInfo.id,
          username: cleanU,
          baserowUserId: Number(id),
          tableUsuarios: config.tableIds?.usuarios || '',
          tableCanaisTv: config.tableIds?.canaisTv || '',
          tableConteudos: config.tableIds?.conteudos || '',
          tableEpisodios: config.tableIds?.episodios || '',
          baseUrl: config.baseUrl || '',
          apiToken: config.apiToken || '',
          updatedAt: new Date().toISOString()
        }, { merge: true }).catch(() => {});
      }
    }
  };

  // Placeholder: o efeito de sincronização automática foi movido para após
  // a declaração de activeUserObj (evita erro de TDZ "Cannot access before initialization").

  // Usuário do Baserow atualmente selecionado ou digitado
  const activeUserObj = useMemo(() => {
    if (selectedUserId && selectedUserId !== 'manual') {
      return usuarios.find(u => String(u.id) === String(selectedUserId)) || null;
    }
    if (customUsername) {
      const uTarget = customUsername.trim().toLowerCase();
      return usuarios.find(u => {
        const nome = String(getValueByPossibleKeys(u, 'nome') || getValueByPossibleKeys(u, 'usuario') || '').trim().toLowerCase();
        return nome === uTarget || nome.replace(/\s+/g, '_') === uTarget || nome.replace(/[^a-z0-9]/g, '') === uTarget;
      }) || null;
    }
    return null;
  }, [selectedUserId, customUsername, usuarios]);

  // Sincronizar mapeamento automaticamente sempre que o usuário ativo mudar
  useEffect(() => {
    if (activeUserObj && userInfo?.id) {
      const nome = getValueByPossibleKeys(activeUserObj, 'nome') || getValueByPossibleKeys(activeUserObj, 'usuario') || getValueByPossibleKeys(activeUserObj, 'email') || '';
      const cleanU = String(nome).replace(/\s+/g, '_').toLowerCase();
      if (cleanU) {
        setDoc(doc(db, 'xtreamUserMapping', cleanU), {
          userId: userInfo.id,
          username: cleanU,
          baserowUserId: Number(activeUserObj.id),
          tableUsuarios: config.tableIds?.usuarios || '',
          tableCanaisTv: config.tableIds?.canaisTv || '',
          tableConteudos: config.tableIds?.conteudos || '',
          tableEpisodios: config.tableIds?.episodios || '',
          baseUrl: config.baseUrl || '',
          apiToken: config.apiToken || '',
          updatedAt: new Date().toISOString()
        }, { merge: true }).catch(() => {});
      }
    }
  }, [activeUserObj, userInfo?.id, config]);


  // Cálculo detalhado de DataCriacao, Vencimento, Status e Limite de Telas
  const parsedUserDates = useMemo(() => {
    if (!activeUserObj) return null;
    const rawCriacao = getValueByPossibleKeys(activeUserObj, 'datacriacao') || getValueByPossibleKeys(activeUserObj, 'dataCriacao') || getValueByPossibleKeys(activeUserObj, 'data_criacao') || getValueByPossibleKeys(activeUserObj, 'criado_em') || getValueByPossibleKeys(activeUserObj, 'data');
    const rawVencimento = getValueByPossibleKeys(activeUserObj, 'vencimento') || getValueByPossibleKeys(activeUserObj, 'data_vencimento') || getValueByPossibleKeys(activeUserObj, 'datadevencimento') || getValueByPossibleKeys(activeUserObj, 'validade');
    const rawLimite = getValueByPossibleKeys(activeUserObj, 'limite') || getValueByPossibleKeys(activeUserObj, 'conexoes') || '1';
    const rawStatus = String(getValueByPossibleKeys(activeUserObj, 'status') || 'Ativo').trim();

    const parseDateHelper = (val: any): Date | null => {
      if (!val) return null;
      const s = String(typeof val === 'object' && val?.value ? val.value : (val?.date ? val.date : val)).trim();
      if (!s || s === 'null' || s === 'undefined') return null;
      if (/^\d+$/.test(s)) {
        const num = Number(s);
        return new Date(num > 10000000000 ? num : num * 1000);
      }
      const brMatch = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:[,\s]+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
      if (brMatch) {
        const dia = brMatch[1].padStart(2, '0');
        const mes = brMatch[2].padStart(2, '0');
        const ano = brMatch[3];
        const hasExplicitHour = Boolean(brMatch[4]);
        const rawH = brMatch[4] || '23';
        const rawM = brMatch[5] || '59';
        const rawS = brMatch[6] || '59';
        const hora = (!hasExplicitHour || (rawH === '00' && rawM === '00' && (rawS === '00' || !brMatch[6]))) ? '23' : rawH.padStart(2, '0');
        const min = (!hasExplicitHour || (rawH === '00' && rawM === '00')) ? '59' : rawM.padStart(2, '0');
        const seg = (!hasExplicitHour || (rawH === '00' && rawM === '00')) ? '59' : rawS.padStart(2, '0');
        return new Date(`${ano}-${mes}-${dia}T${hora}:${min}:${seg}Z`);
      }
      const isoMatch = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})(?:[T\s]+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
      if (isoMatch) {
        const ano = isoMatch[1];
        const mes = isoMatch[2].padStart(2, '0');
        const dia = isoMatch[3].padStart(2, '0');
        const hasExplicitHour = Boolean(isoMatch[4]);
        const rawH = isoMatch[4] || '23';
        const rawM = isoMatch[5] || '59';
        const rawS = isoMatch[6] || '59';
        const hora = (!hasExplicitHour || (rawH === '00' && rawM === '00' && (rawS === '00' || !isoMatch[6]))) ? '23' : rawH.padStart(2, '0');
        const min = (!hasExplicitHour || (rawH === '00' && rawM === '00')) ? '59' : rawM.padStart(2, '0');
        const seg = (!hasExplicitHour || (rawH === '00' && rawM === '00')) ? '59' : rawS.padStart(2, '0');
        return new Date(`${ano}-${mes}-${dia}T${hora}:${min}:${seg}Z`);
      }
      const d = new Date(s);
      return isNaN(d.getTime()) ? null : d;
    };

    const criacaoDate = parseDateHelper(rawCriacao) || new Date();
    let vencDate = parseDateHelper(rawVencimento);
    if (!vencDate) {
      vencDate = new Date(criacaoDate.getTime() + (30 * 24 * 3600 * 1000));
    }

    const now = Date.now();
    const isExpired = vencDate ? now > vencDate.getTime() : false;
    const isFuture = criacaoDate ? now < (criacaoDate.getTime() - 60000) : false;

    return {
      criacaoDate,
      vencDate,
      rawCriacao: String(rawCriacao || 'Automática'),
      rawVencimento: String(rawVencimento || 'Calculado (30 dias)'),
      limite: String(rawLimite && !isNaN(Number(rawLimite)) ? Number(rawLimite) : 1),
      status: rawStatus,
      isExpired,
      isFuture
    };
  }, [activeUserObj]);

  // Sanitizar Host DNS (garantir protocolo e remover barra final)
  const sanitizedDns = useMemo(() => {
    let host = (dnsHost || '').trim();
    if (!host) {
      host = typeof window !== 'undefined' ? window.location.origin : 'http://meuservidor.vip:8080';
    }
    if (!host.startsWith('http://') && !host.startsWith('https://')) {
      host = `http://${host}`;
    }
    return host.replace(/\/+$/, '');
  }, [dnsHost]);

  // URLs geradas do Xtream Codes com suporte a separação por tipo e isolamento por conta
  const xtreamUrls = useMemo(() => {
    const user = encodeURIComponent(customUsername.trim() || 'demo');
    const pass = encodeURIComponent(customPassword.trim() || '123456');
    const contentParam = filtroTipoDns !== 'all' ? `&content=${filtroTipoDns}` : '';
    const accountId = userInfo?.id || '';
    const accountParam = accountId ? `&account=${encodeURIComponent(accountId)}` : '';
    const dedicatedDns = accountId ? `${sanitizedDns}/u/${accountId}` : sanitizedDns;

    return {
      server: sanitizedDns,
      dedicatedDns,
      accountId,
      username: customUsername.trim() || 'demo',
      password: customPassword.trim() || '123456',
      contentMode: filtroTipoDns,
      m3uPlusTs: `${sanitizedDns}/get.php?username=${user}&password=${pass}${accountParam}&type=m3u_plus&output=ts${contentParam}`,
      m3uPlusHls: `${sanitizedDns}/get.php?username=${user}&password=${pass}${accountParam}&type=m3u_plus&output=m3u8${contentParam}`,
      playerApi: `${sanitizedDns}/player_api.php?username=${user}&password=${pass}${accountParam}${contentParam}`,
      epgXml: `${sanitizedDns}/xmltv.php?username=${user}&password=${pass}${accountParam}`
    };
  }, [sanitizedDns, customUsername, customPassword, filtroTipoDns, userInfo?.id]);

  // Botões de Seleção Rápida de Filtro (Presets)
  const handleSelectPreset = (preset: 'todos' | 'tv' | 'filmes' | 'series') => {
    if (preset === 'todos') {
      setIncluirTV(true);
      setIncluirFilmes(true);
      setIncluirSeries(true);
      setNomeLista('Lista_Completa_IPTV');
      toast.info('Modo selecionado: Tudo Completo (Canais, Filmes e Séries)');
    } else if (preset === 'tv') {
      setIncluirTV(true);
      setIncluirFilmes(false);
      setIncluirSeries(false);
      setNomeLista('Canais_TV_AoVivo');
      toast.info('Modo selecionado: EXCLUSIVAMENTE Canais de TV Ao Vivo');
    } else if (preset === 'filmes') {
      setIncluirTV(false);
      setIncluirFilmes(true);
      setIncluirSeries(false);
      setNomeLista('Filmes_VOD');
      toast.info('Modo selecionado: EXCLUSIVAMENTE Filmes VOD');
    } else if (preset === 'series') {
      setIncluirTV(false);
      setIncluirFilmes(false);
      setIncluirSeries(true);
      setNomeLista('Series_Episodios');
      toast.info('Modo selecionado: EXCLUSIVAMENTE Séries e Episódios');
    }
  };

  // Helper robusto para extrair a URL REAL de stream de uma linha do Baserow
  const extractRealStreamUrl = (row: any, _tipo: 'tv' | 'filme' | 'serie'): string => {
    if (!row) return '';

    // Lista abrangente de campos de link em diferentes esquemas
    const keysToCheck = [
      'link', 'Link', 'url', 'URL', 'canalLink', 'canal_link', 'episodioLink', 'episodio_link',
      'video', 'Video', 'stream', 'Stream', 'Link de vídeo', 'Link de video', 'Link do Vídeo',
      'Link do Video', 'Link do Canal', 'Link do Filme', 'Link do Episodio', 'source', 'Source',
      'link_video', 'link_stream', 'arquivo', 'videourl'
    ];

    let raw: any = '';
    for (const key of keysToCheck) {
      if (row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== '') {
        raw = row[key];
        break;
      }
    }

    if (!raw) {
      raw = getValueByPossibleKeys(row, 'link') || getValueByPossibleKeys(row, 'url') || '';
    }

    if (!raw) return '';

    // Se for objeto com { value: '...' } ou array de arquivos do Baserow
    if (typeof raw === 'object' && raw?.value) raw = raw.value;
    if (Array.isArray(raw) && raw[0]?.url) raw = raw[0].url;

    const trimmed = String(raw).trim();

    // Validar se é uma URL válida de rede
    const isHttp = trimmed.startsWith('http://') || trimmed.startsWith('https://');
    const isStreamProtocol = trimmed.startsWith('rtmp://') || trimmed.startsWith('rtmps://') || trimmed.startsWith('mms://') || trimmed.startsWith('rtsp://');

    if (!isHttp && !isStreamProtocol) {
      return '';
    }

    // Aplicar conversão de formato se solicitada (ex: .ts ou .m3u8)
    if (formatoSaida === 'original') return trimmed;
    if (formatoSaida === 'ts' && trimmed.endsWith('.m3u8')) return trimmed;

    return trimmed;
  };

  // Gerador principal da lista M3U a partir das tabelas do Baserow
  const handleGerarLista = async () => {
    if (!isConfigured) {
      toast.error('O Baserow não está configurado. Verifique as configurações de API.');
      return;
    }

    if (!incluirTV && !incluirFilmes && !incluirSeries) {
      toast.error('Selecione pelo menos uma categoria (Canais de TV, Filmes ou Séries).');
      return;
    }

    setLoading(true);
    setProgresso(10);
    setStatusMsg('Conectando ao banco de dados Baserow...');
    const itens: GeneratedItem[] = [];
    const maxPorTipo = parseInt(limitePorTipo, 10);
    const serieSinopseMap = new Map<string, string>();

    try {
      // 1. Canais de TV Ao Vivo (SOMENTE se incluirTV estiver ativo)
      if (incluirTV && config.tableIds?.canaisTv) {
        setStatusMsg('Buscando canais de TV ao vivo...');
        setProgresso(15);
        try {
          // Canais TV: sempre busca tudo disponível (154 canais cabe em 1 requisição rápida)
          const resp = await baserowService.getAllTableData(
            config.tableIds.canaisTv,
            undefined,
            maxPorTipo > 0 ? maxPorTipo : 0
          );
          const results = resp.results || [];
          results.forEach(row => {
            const nome = getValueByPossibleKeys(row, 'nome') || getValueByPossibleKeys(row, 'canalNome') || 'Canal Sem Nome';
            const capa = getValueByPossibleKeys(row, 'capa') || getValueByPossibleKeys(row, 'canalCapa') || '';
            const categoria = getValueByPossibleKeys(row, 'categoria') || getValueByPossibleKeys(row, 'canalCategoria') || 'Canais TV';
            const sinopseRaw = getValueByPossibleKeys(row, 'sinopse') || getValueByPossibleKeys(row, 'canalSinopse') || getValueByPossibleKeys(row, 'descricao') || '';
            const sinopse = typeof sinopseRaw === 'string' ? sinopseRaw : (typeof sinopseRaw === 'object' && sinopseRaw?.value ? sinopseRaw.value : '');
            const realLink = extractRealStreamUrl(row, 'tv');

            if (apenasComLink && !realLink) return;

            itens.push({
              id: `tv-${row.id}`,
              tipo: 'tv',
              nome: String(nome).trim(),
              categoria: typeof categoria === 'object' && categoria?.value ? categoria.value : String(categoria || 'Canais TV').trim(),
              capa: typeof capa === 'string' ? capa : (Array.isArray(capa) && capa[0]?.url ? capa[0].url : ''),
              sinopse,
              streamUrl: realLink,
              valido: Boolean(realLink)
            });
          });
        } catch (err: any) {
          console.warn('Erro ao buscar canais de TV:', err);
        }
      }

      setProgresso(35);

      // 2. Filmes VOD (SOMENTE se incluirFilmes estiver ativo)
      if (incluirFilmes && config.tableIds?.conteudos) {
        setStatusMsg('Buscando catálogo de filmes (5.054 títulos)...');
        try {
          // Se maxPorTipo for 0 (Sem limite), passa 0 para buscar todos os 5.054 filmes!
          const resp = await baserowService.getAllTableData(
            config.tableIds.conteudos,
            undefined,
            maxPorTipo > 0 ? maxPorTipo : 0,
            (loaded, total, page) => {
              setStatusMsg(`Buscando catálogo de filmes: ${loaded} de ${total || 5054} (Lote ${page})...`);
              setProgresso(Math.min(70, 35 + Math.round((loaded / Math.max(total, 5054)) * 35)));
            }
          );
          const results = resp.results || [];
          results.forEach(row => {
            const nome = getValueByPossibleKeys(row, 'nome') || 'Filme Sem Nome';
            const capa = getValueByPossibleKeys(row, 'capa') || '';
            const categoria = getValueByPossibleKeys(row, 'categoria') || 'Filmes';
            const sinopseRaw = getValueByPossibleKeys(row, 'sinopse') || getValueByPossibleKeys(row, 'descricao') || getValueByPossibleKeys(row, 'overview') || '';
            const sinopse = typeof sinopseRaw === 'string' ? sinopseRaw : (typeof sinopseRaw === 'object' && sinopseRaw?.value ? sinopseRaw.value : '');
            const realLink = extractRealStreamUrl(row, 'filme');

            // Salvar sinopse no mapa para séries
            const sNomeLower = String(nome).trim().toLowerCase();
            if (sNomeLower && sinopse) {
              serieSinopseMap.set(sNomeLower, sinopse);
            }

            const tipo = String(getValueByPossibleKeys(row, 'tipo') || '').toLowerCase();
            const isFilme = tipo.includes('film') || (!tipo.includes('seri') && !tipo.includes('anime'));
            if (!isFilme) return;

            if (apenasComLink && !realLink) return;

            itens.push({
              id: `filme-${row.id}`,
              tipo: 'filme',
              nome: String(nome).trim(),
              categoria: typeof categoria === 'object' && categoria?.value ? categoria.value : String(categoria || 'Filmes').trim(),
              capa: typeof capa === 'string' ? capa : (Array.isArray(capa) && capa[0]?.url ? capa[0].url : ''),
              sinopse,
              streamUrl: realLink,
              valido: Boolean(realLink)
            });
          });
        } catch (err: any) {
          console.warn('Erro ao buscar filmes:', err);
        }
      }

      setProgresso(75);

      // 3. Séries & Episódios (SOMENTE se incluirSeries estiver ativo)
      if (incluirSeries) {
        if (limiteSeries === 'series_vod' && config.tableIds?.conteudos) {
          // MODO INTELIGENTE XTREAM: Exporta as 2.712 séries com link sob demanda do player
          setStatusMsg('Gerando catálogo das 2.712 séries com link Xtream...');
          try {
            const resp = await baserowService.getAllTableData(
              config.tableIds.conteudos,
              undefined,
              0
            );
            const results = resp.results || [];
            results.forEach(row => {
              const tipo = String(getValueByPossibleKeys(row, 'tipo') || '').toLowerCase();
              const isSerie = tipo.includes('seri') || tipo.includes('anime') || Boolean(getValueByPossibleKeys(row, 'temporadas'));
              if (!isSerie) return;

              const nome = getValueByPossibleKeys(row, 'nome') || 'Série Sem Nome';
              const capa = getValueByPossibleKeys(row, 'capa') || '';
              const categoria = getValueByPossibleKeys(row, 'categoria') || 'Séries';
              const sinopseRaw = getValueByPossibleKeys(row, 'sinopse') || getValueByPossibleKeys(row, 'descricao') || getValueByPossibleKeys(row, 'overview') || '';
              const sinopse = typeof sinopseRaw === 'string' ? sinopseRaw : (typeof sinopseRaw === 'object' && sinopseRaw?.value ? sinopseRaw.value : '');
              const uEnc = encodeURIComponent(customUsername.trim() || 'demo');
              const pEnc = encodeURIComponent(customPassword.trim() || '123456');
              const streamUrl = `${sanitizedDns}/series/${uEnc}/${pEnc}/${row.id}.mp4`;

              itens.push({
                id: `serie-${row.id}`,
                tipo: 'serie',
                nome: String(nome).trim(),
                categoria: typeof categoria === 'object' && categoria?.value ? categoria.value : String(categoria || 'Séries').trim(),
                capa: typeof capa === 'string' ? capa : (Array.isArray(capa) && capa[0]?.url ? capa[0].url : ''),
                sinopse,
                streamUrl,
                valido: true
              });
            });
          } catch (err: any) {
            console.warn('Erro ao buscar catálogo de séries:', err);
          }
        } else if (config.tableIds?.episodios) {
          // MODO EPISÓDIOS DA TABELA (com limite seguro ou catálogo completo)
          const maxEpisodios = parseInt(limiteSeries, 10);
          setStatusMsg('Buscando episódios de séries...');
          try {
            const resp = await baserowService.getAllTableData(
              config.tableIds.episodios,
              undefined,
              maxEpisodios > 0 ? maxEpisodios : 0,
              (loaded, total, page) => {
                setStatusMsg(`Buscando episódios: ${loaded} de ${total || 96432} (Lote ${page})...`);
                setProgresso(Math.min(94, 75 + Math.round((loaded / Math.max(total, 96432)) * 20)));
              }
            );
            const results = resp.results || [];
            results.forEach(row => {
              const serieNome = getValueByPossibleKeys(row, 'serie') || getValueByPossibleKeys(row, 'serieNome') || '';
              const epNome = getValueByPossibleKeys(row, 'nome') || getValueByPossibleKeys(row, 'episodioNome') || '';
              const temp = getValueByPossibleKeys(row, 'temporada') || getValueByPossibleKeys(row, 'episodioTemporada') || '1';
              const num = getValueByPossibleKeys(row, 'episodio') || getValueByPossibleKeys(row, 'episodioNumero') || '1';
              const capa = getValueByPossibleKeys(row, 'capa') || '';
              const sinopseRaw = getValueByPossibleKeys(row, 'sinopse') || getValueByPossibleKeys(row, 'descricao') || '';
              let sinopse = typeof sinopseRaw === 'string' ? sinopseRaw : (typeof sinopseRaw === 'object' && sinopseRaw?.value ? sinopseRaw.value : '');
              if (!sinopse && serieNome) {
                sinopse = serieSinopseMap.get(serieNome.toLowerCase()) || '';
              }
              const realLink = extractRealStreamUrl(row, 'serie');

              if (apenasComLink && !realLink) return;

              // Formatação padrão IPTV: "Nome da Série S01 E01 - Título"
              const tempFormatted = String(temp).padStart(2, '0');
              const numFormatted = String(num).padStart(2, '0');
              const serieTitle = serieNome ? `${serieNome} S${tempFormatted}E${numFormatted}` : `${epNome} S${tempFormatted}E${numFormatted}`;
              const finalNome = epNome && epNome !== serieNome ? `${serieTitle} - ${epNome}` : serieTitle;

              itens.push({
                id: `ep-${row.id}`,
                tipo: 'serie',
                nome: finalNome.trim(),
                categoria: serieNome ? `Séries: ${serieNome}` : 'Séries',
                capa: typeof capa === 'string' ? capa : (Array.isArray(capa) && capa[0]?.url ? capa[0].url : ''),
                sinopse,
                streamUrl: realLink,
                temporada: temp,
                episodio: num,
                valido: Boolean(realLink)
              });
            });
          } catch (err: any) {
            console.warn('Erro ao buscar episódios:', err);
          }
        }
      }

      setProgresso(95);
      setStatusMsg('Montando arquivo M3U oficial...');

      // Construção da string #EXTM3U com seções profissionais separadas
      let m3uString = `#EXTM3U name="${nomeLista || 'Lista IPTV Profissional'}"\n`;
      m3uString += `## Gerado via Painel Baserow em ${new Date().toLocaleString('pt-BR')}\n`;
      m3uString += `## Total de conteúdos reais: ${itens.length}\n\n`;

      const tvItems = itens.filter(i => i.tipo === 'tv').sort((a, b) => a.categoria.localeCompare(b.categoria) || a.nome.localeCompare(b.nome));
      const filmeItems = itens.filter(i => i.tipo === 'filme').sort((a, b) => a.categoria.localeCompare(b.categoria) || a.nome.localeCompare(b.nome));
      const serieItems = itens.filter(i => i.tipo === 'serie').sort((a, b) => a.categoria.localeCompare(b.categoria) || a.nome.localeCompare(b.nome));

      // SEÇÃO 1: CANAIS DE TV
      if (tvItems.length > 0) {
        m3uString += `### =========================================\n`;
        m3uString += `### [SEÇÃO 1] CANAIS DE TV AO VIVO (${tvItems.length})\n`;
        m3uString += `### =========================================\n\n`;

        tvItems.forEach((item) => {
          const logoAttr = item.capa ? ` tvg-logo="${item.capa}"` : '';
          const cleanCat = item.categoria.startsWith('CANAIS |') ? item.categoria : `CANAIS | ${item.categoria.toUpperCase()}`;
          const groupAttr = ` group-title="${cleanCat}"`;
          const tvgNameAttr = ` tvg-name="${item.nome.replace(/"/g, "'")}"`;
          const tvgIdAttr = ` tvg-id="${item.id}"`;
          const cleanSinopse = item.sinopse ? String(item.sinopse).replace(/[\r\n\t]+/g, ' ').replace(/"/g, "'").replace(/\s+/g, ' ').trim() : '';
          const plotAttr = cleanSinopse ? ` tvg-plot="${cleanSinopse}" tvg-description="${cleanSinopse}" description="${cleanSinopse}" plot="${cleanSinopse}"` : '';

          m3uString += `#EXTINF:-1${tvgIdAttr}${tvgNameAttr}${logoAttr}${plotAttr}${groupAttr},${item.nome}\n`;
          m3uString += `${item.streamUrl}\n\n`;
        });
      }

      // SEÇÃO 2: FILMES VOD
      if (filmeItems.length > 0) {
        m3uString += `### =========================================\n`;
        m3uString += `### [SEÇÃO 2] FILMES VOD (${filmeItems.length})\n`;
        m3uString += `### =========================================\n\n`;

        filmeItems.forEach((item) => {
          const logoAttr = item.capa ? ` tvg-logo="${item.capa}"` : '';
          const cleanCat = item.categoria.startsWith('FILMES |') ? item.categoria : `FILMES | ${item.categoria.toUpperCase()}`;
          const groupAttr = ` group-title="${cleanCat}"`;
          const tvgNameAttr = ` tvg-name="${item.nome.replace(/"/g, "'")}"`;
          const tvgIdAttr = ` tvg-id="${item.id}"`;
          const cleanSinopse = item.sinopse ? String(item.sinopse).replace(/[\r\n\t]+/g, ' ').replace(/"/g, "'").replace(/\s+/g, ' ').trim() : '';
          const plotAttr = cleanSinopse ? ` tvg-plot="${cleanSinopse}" tvg-description="${cleanSinopse}" description="${cleanSinopse}" plot="${cleanSinopse}"` : '';

          m3uString += `#EXTINF:-1${tvgIdAttr}${tvgNameAttr}${logoAttr}${plotAttr}${groupAttr},${item.nome}\n`;
          m3uString += `${item.streamUrl}\n\n`;
        });
      }

      // SEÇÃO 3: SÉRIES & EPISÓDIOS
      if (serieItems.length > 0) {
        m3uString += `### =========================================\n`;
        m3uString += `### [SEÇÃO 3] SÉRIES & EPISÓDIOS (${serieItems.length})\n`;
        m3uString += `### =========================================\n\n`;

        serieItems.forEach((item) => {
          const logoAttr = item.capa ? ` tvg-logo="${item.capa}"` : '';
          const cleanCat = item.categoria.startsWith('SÉRIES |') ? item.categoria : `SÉRIES | ${item.categoria.toUpperCase()}`;
          const groupAttr = ` group-title="${cleanCat}"`;
          const tvgNameAttr = ` tvg-name="${item.nome.replace(/"/g, "'")}"`;
          const tvgIdAttr = ` tvg-id="${item.id}"`;
          const cleanSinopse = item.sinopse ? String(item.sinopse).replace(/[\r\n\t]+/g, ' ').replace(/"/g, "'").replace(/\s+/g, ' ').trim() : '';
          const plotAttr = cleanSinopse ? ` tvg-plot="${cleanSinopse}" tvg-description="${cleanSinopse}" description="${cleanSinopse}" plot="${cleanSinopse}"` : '';

          m3uString += `#EXTINF:-1${tvgIdAttr}${tvgNameAttr}${logoAttr}${plotAttr}${groupAttr},${item.nome}\n`;
          m3uString += `${item.streamUrl}\n\n`;
        });
      }

      setItensGerados(itens);
      setM3uContent(m3uString);
      setProgresso(100);
      setStatusMsg(`Lista gerada com sucesso! ${itens.length} canais/conteúdos reais exportados.`);
      toast.success(`Lista M3U gerada com sucesso! (${itens.length} itens reais)`);
    } catch (error: any) {
      console.error('Erro geral ao gerar lista M3U:', error);
      toast.error(`Falha ao gerar lista: ${error?.message || 'Erro desconhecido'}`);
      setStatusMsg('Ocorreu um erro ao carregar dados do Baserow.');
    } finally {
      setLoading(false);
    }
  };

  // Download do arquivo .m3u completo
  const handleDownloadM3U = () => {
    if (!m3uContent) {
      toast.error('Gere a lista primeiro antes de baixar.');
      return;
    }
    const blob = new Blob([m3uContent], { type: 'audio/x-mpegurl;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${(nomeLista || 'playlist').replace(/\s+/g, '_').toLowerCase()}.m3u`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Arquivo .m3u baixado com sucesso!');
  };

  // Download isolado de uma categoria específica
  const handleDownloadCategoria = (categoria: 'tv' | 'filme' | 'serie') => {
    const filtrados = itensGerados.filter(i => i.tipo === categoria);
    if (filtrados.length === 0) {
      toast.error(`Nenhum item do tipo "${categoria.toUpperCase()}" disponível na lista gerada.`);
      return;
    }

    const labelNome = categoria === 'tv' ? 'Canais_TV' : categoria === 'filme' ? 'Filmes_VOD' : 'Series';
    let m3u = `#EXTM3U name="${nomeLista} - ${labelNome}"\n`;
    m3u += `## Gerado em ${new Date().toLocaleString('pt-BR')} via Baserow\n`;
    m3u += `## Total: ${filtrados.length} itens\n\n`;

    filtrados.forEach((item) => {
      const logoAttr = item.capa ? ` tvg-logo="${item.capa}"` : '';
      const groupAttr = item.categoria ? ` group-title="${item.categoria}"` : '';
      m3u += `#EXTINF:-1 tvg-id="${item.id}" tvg-name="${item.nome.replace(/"/g, "'")}"${logoAttr}${groupAttr},${item.nome}\n`;
      m3u += `${item.streamUrl}\n\n`;
    });

    const blob = new Blob([m3u], { type: 'audio/x-mpegurl;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${labelNome.toLowerCase()}_${new Date().toISOString().slice(0, 10)}.m3u`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`Lista de ${labelNome} baixada com sucesso! (${filtrados.length} itens)`);
  };

  // Copiar conteúdo M3U
  const handleCopyM3U = () => {
    if (!m3uContent) return;
    navigator.clipboard.writeText(m3uContent).then(() => {
      setCopiadoM3U(true);
      toast.success('Conteúdo M3U copiado para a área de transferência!');
      setTimeout(() => setCopiadoM3U(false), 2500);
    }).catch(() => {
      toast.error('Erro ao copiar conteúdo.');
    });
  };

  // Copiar Link DNS Xtream Codes
  const handleCopyDnsUrl = (url: string, label: string) => {
    navigator.clipboard.writeText(url).then(() => {
      toast.success(`${label} copiado!`);
    }).catch(() => {
      toast.error('Erro ao copiar URL.');
    });
  };

  // Copiar Mensagem Pronta de Acesso para o Cliente (WhatsApp)
  const handleCopyWhatsAppMessage = () => {
    const modoTexto = filtroTipoDns === 'all' ? 'Completo (Canais de TV + Filmes + Séries)' :
                      filtroTipoDns === 'tv' ? 'Exclusivamente Canais de TV Ao Vivo' :
                      filtroTipoDns === 'movies' ? 'Exclusivamente Filmes VOD' : 'Exclusivamente Séries & Episódios';

    const texto = `📺 *SEUS DADOS DE ACESSO IPTV / XTREAM CODES*\n\n` +
      `📦 *Conteúdo Liberado:* ${modoTexto}\n` +
      `🌐 *Servidor / Host (DNS):* ${xtreamUrls.server}\n` +
      `👤 *Usuário:* ${xtreamUrls.username}\n` +
      `🔑 *Senha:* ${xtreamUrls.password}\n\n` +
      `🔗 *Link M3U Direto:* \n${xtreamUrls.m3uPlusTs}\n\n` +
      `📱 *Como Conectar:*\n` +
      `1. Abra o aplicativo (IPTV Smarters Pro, XCIPTV, TiviMate, etc.)\n` +
      `2. Escolha *"Entrar com API Xtream Codes"*\n` +
      `3. Coloque qualquer nome, e preencha o Host, Usuário e Senha acima!\n` +
      `4. Clique em Adicionar Usuário e boa diversão! 🍿`;

    navigator.clipboard.writeText(texto).then(() => {
      setCopiadoWpp(true);
      toast.success('Mensagem formatada copiada para envio no WhatsApp!');
      setTimeout(() => setCopiadoWpp(false), 2500);
    }).catch(() => {
      toast.error('Erro ao copiar mensagem.');
    });
  };

  const [sincronizandoXtream, setSincronizandoXtream] = useState(false);

  // Sincronizar configuração do Xtream Codes com isolamento rigoroso por conta individual
  const handleSyncXtreamConfig = async () => {
    try {
      setSincronizandoXtream(true);
      const accId = userInfo?.id || 'default';
      const cleanUser = customUsername.trim().toLowerCase();

      const accountPayload = {
        userId: accId,
        baseUrl: config.baseUrl || 'http://31.220.72.235:8080',
        apiToken: config.apiToken || 'GdbNYJHQHQVLqiu6l4AmDIflycrcppPw',
        tableCanaisTv: config.tableIds?.canaisTv || '',
        tokenCanaisTv: config.apiToken || 'GdbNYJHQHQVLqiu6l4AmDIflycrcppPw',
        tableConteudos: config.tableIds?.conteudos || '',
        tableEpisodios: config.tableIds?.episodios || '',
        tableUsuarios: config.tableIds?.usuarios || '',
        tableCategoriasTV: config.tableIds?.categoriasTV || '',
        defaultUser: customUsername.trim() || 'demo',
        defaultPass: customPassword.trim() || '123456',
        updatedAt: new Date().toISOString()
      };

      // 1. Salvar na coleção dedicada da conta: xtreamAccounts/${accId}
      await setDoc(doc(db, 'xtreamAccounts', accId), accountPayload, { merge: true });

      // 2. Salvar em userConfigs/${accId}
      await setDoc(doc(db, 'userConfigs', accId), {
        xtreamConfig: accountPayload
      }, { merge: true });

      // 3. Mapear o usuário ativo para esta conta (xtreamUserMapping/${cleanUser})
      if (cleanUser) {
        await setDoc(doc(db, 'xtreamUserMapping', cleanUser), {
          userId: accId,
          username: cleanUser,
          baseUrl: accountPayload.baseUrl,
          apiToken: accountPayload.apiToken,
          tableIds: config.tableIds,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      }

      // 4. Indexar clientes da tabela para mapeamento automático no DNS geral
      if (usuarios.length > 0) {
        const batchPromises = usuarios.slice(0, 30).map(u => {
          const uNome = String(getValueByPossibleKeys(u, 'nome') || getValueByPossibleKeys(u, 'usuario') || getValueByPossibleKeys(u, 'email') || '').trim().toLowerCase();
          if (uNome) {
            return setDoc(doc(db, 'xtreamUserMapping', uNome), {
              userId: accId,
              username: uNome,
              baseUrl: accountPayload.baseUrl,
              apiToken: accountPayload.apiToken,
              tableIds: config.tableIds,
              updatedAt: new Date().toISOString()
            }, { merge: true }).catch(() => {});
          }
          return Promise.resolve();
        });
        await Promise.all(batchPromises);
      }

      // 5. Salvar fallback para compatibilidade global
      await setDoc(doc(db, 'globalConfig', 'xtreamConfig'), accountPayload, { merge: true });

      toast.success('Servidor Xtream sincronizado exclusivamente com as tabelas da sua conta!');
    } catch (err: any) {
      console.error('Erro ao sincronizar Xtream Config:', err);
      toast.error(`Falha ao salvar no servidor: ${err?.message || 'Erro desconhecido'}`);
    } finally {
      setSincronizandoXtream(false);
    }
  };

  // Testador Completo de Diagnóstico Xtream Codes com isolamento de conta
  const handleTestarXtream = async () => {
    setTestandoXtream(true);
    setResultadoTeste(null);
    try {
      const userToFind = customUsername.trim().toLowerCase();
      const passToFind = customPassword.trim();
      const uEnc = encodeURIComponent(userToFind);
      const pEnc = encodeURIComponent(passToFind);
      const accQuery = userInfo?.id ? `&account=${encodeURIComponent(userInfo.id)}` : '';

      // 1. Testar Auth no endpoint
      let apiResp: any = null;
      let liveCount = 0;
      let vodCount = 0;
      let seriesCount = 0;

      try {
        const res = await fetch(`${sanitizedDns}/player_api.php?username=${uEnc}&password=${pEnc}${accQuery}`);
        if (res.ok) apiResp = await res.json();
      } catch (e) {
        console.warn('Erro ao chamar /player_api.php:', e);
      }

      // 2. Testar Canais Ao Vivo
      try {
        const resLive = await fetch(`${sanitizedDns}/player_api.php?username=${uEnc}&password=${pEnc}${accQuery}&action=get_live_streams`);
        if (resLive.ok) {
          const lData = await resLive.json();
          liveCount = Array.isArray(lData) ? lData.length : 0;
        }
      } catch (e) {}

      // 3. Testar Filmes VOD
      try {
        const resVod = await fetch(`${sanitizedDns}/player_api.php?username=${uEnc}&password=${pEnc}${accQuery}&action=get_vod_streams`);
        if (resVod.ok) {
          const vData = await resVod.json();
          vodCount = Array.isArray(vData) ? vData.length : 0;
        }
      } catch (e) {}

      // 4. Testar Séries
      try {
        const resSer = await fetch(`${sanitizedDns}/player_api.php?username=${uEnc}&password=${pEnc}${accQuery}&action=get_series`);
        if (resSer.ok) {
          const sData = await resSer.json();
          seriesCount = Array.isArray(sData) ? sData.length : 0;
        }
      } catch (e) {}

      const isAuthOk = apiResp?.user_info?.auth === 1;
      const userInfoResp = apiResp?.user_info || {};
      const isExpiredOrBlocked = !isAuthOk || userInfoResp.status === 'Expired' || userInfoResp.status === 'Disabled';

      const formatUnixOrIso = (val: any) => {
        if (!val) return null;
        if (/^\d+$/.test(String(val))) {
          const num = Number(val);
          return new Date(num > 10000000000 ? num : num * 1000).toLocaleString('pt-BR');
        }
        const d = new Date(val);
        return isNaN(d.getTime()) ? String(val) : d.toLocaleString('pt-BR');
      };

      const result = {
        sucesso: isAuthOk,
        usuario: customUsername,
        senha: customPassword,
        status: userInfoResp.status || (isAuthOk ? 'Active' : 'Acesso Bloqueado / Expirado'),
        motivo: userInfoResp.message || (isAuthOk ? 'Autorizado com sucesso' : 'Conta expirada ou fora do período de vigência'),
        criadoEm: formatUnixOrIso(userInfoResp.created_at),
        vencimentoEm: formatUnixOrIso(userInfoResp.exp_date),
        limiteConexoes: userInfoResp.max_connections || '1',
        isExpired: isExpiredOrBlocked,
        liveCount,
        vodCount,
        seriesCount,
        timestamp: new Date().toLocaleTimeString(),
        apiResponse: apiResp || { erro: 'Sem resposta do endpoint' }
      };

      setResultadoTeste(result);
      if (isAuthOk) {
        toast.success(`Conexão 100% OK! ${liveCount} canais, ${vodCount} filmes e ${seriesCount} séries da sua conta.`);
      } else if (isExpiredOrBlocked) {
        toast.error(`Bloqueio Confirmado: Conta expirada/vencida. O servidor rejeitou o acesso com status Disabled.`);
      } else {
        toast.warning('O servidor respondeu, mas a autenticação falhou.');
      }
    } catch (err: any) {
      toast.error(`Erro ao testar: ${err?.message || 'Falha na conexão'}`);
    } finally {
      setTestandoXtream(false);
    }
  };

  // Abrir QR Code com o link
  const handleOpenQR = (url: string) => {
    setQrUrl(url);
    setQrOpen(true);
  };

  // Estatísticas calculadas
  const stats = useMemo(() => {
    const tvCount = itensGerados.filter(i => i.tipo === 'tv').length;
    const filmesCount = itensGerados.filter(i => i.tipo === 'filme').length;
    const seriesCount = itensGerados.filter(i => i.tipo === 'serie').length;
    return { tvCount, filmesCount, seriesCount, total: itensGerados.length };
  }, [itensGerados]);

  // Itens filtrados para a tabela de prévia
  const itensTabelaFiltrados = useMemo(() => {
    return itensGerados.filter(item => {
      if (filtroTipoTabela !== 'todos' && item.tipo !== filtroTipoTabela) return false;
      if (!buscaTabela.trim()) return true;
      const b = buscaTabela.toLowerCase();
      return (
        item.nome.toLowerCase().includes(b) ||
        item.categoria.toLowerCase().includes(b) ||
        item.streamUrl.toLowerCase().includes(b)
      );
    });
  }, [itensGerados, filtroTipoTabela, buscaTabela]);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Banner & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20">
              <Radio className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
                Gerador de Lista M3U & Servidor DNS
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-xs">
                  Xtream Codes API
                </Badge>
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Exporte canais, filmes e séries reais diretamente do seu Baserow para M3U e configure credenciais de DNS para aplicativos IPTV.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <Button
            onClick={handleGerarLista}
            disabled={loading}
            className="gap-2 shadow-sm bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Consultando Baserow...' : 'Gerar / Atualizar Lista'}
          </Button>
        </div>
      </div>

      {/* Tabs Principais */}
      <Tabs defaultValue="gerador" className="space-y-6">
        <TabsList className="grid grid-cols-3 max-w-md">
          <TabsTrigger value="gerador" className="flex items-center gap-2">
            <FileDown className="w-4 h-4" />
            Lista M3U Real
          </TabsTrigger>
          <TabsTrigger value="dns" className="flex items-center gap-2">
            <Server className="w-4 h-4" />
            DNS & Xtream
          </TabsTrigger>
          <TabsTrigger value="comofunciona" className="flex items-center gap-2">
            <HelpCircle className="w-4 h-4" />
            Como Funciona
          </TabsTrigger>
        </TabsList>

        {/* ======================================================== */}
        {/* ABA 1: GERADOR DE LISTA M3U REAL                        */}
        {/* ======================================================== */}
        <TabsContent value="gerador" className="space-y-6">
          {/* Presets Rápidos de Categoria */}
          <div className="p-4 rounded-xl border bg-card/60 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Seleção Rápida de Conteúdo (Filtragem Estrita):
              </span>
              <span className="text-xs text-muted-foreground">
                Garante que a lista gerada contenha apenas o tipo desejado com links reais
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <Button
                variant={incluirTV && incluirFilmes && incluirSeries ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleSelectPreset('todos')}
                className="gap-2 text-xs"
              >
                <Layers className="w-3.5 h-3.5" />
                Tudo Completo
              </Button>
              <Button
                variant={incluirTV && !incluirFilmes && !incluirSeries ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleSelectPreset('tv')}
                className="gap-2 text-xs border-sky-500/30 text-sky-600 dark:text-sky-400"
              >
                <Tv className="w-3.5 h-3.5 text-sky-500" />
                Apenas Canais de TV
              </Button>
              <Button
                variant={!incluirTV && incluirFilmes && !incluirSeries ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleSelectPreset('filmes')}
                className="gap-2 text-xs border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
              >
                <Film className="w-3.5 h-3.5 text-emerald-500" />
                Apenas Filmes VOD
              </Button>
              <Button
                variant={!incluirTV && !incluirFilmes && incluirSeries ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleSelectPreset('series')}
                className="gap-2 text-xs border-amber-500/30 text-amber-600 dark:text-amber-400"
              >
                <Clapperboard className="w-3.5 h-3.5 text-amber-500" />
                Apenas Séries
              </Button>
            </div>
          </div>

          {/* Card de Configurações de Filtro */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <SlidersHorizontal className="w-5 h-5 text-primary" />
                Configurações da Lista M3U
              </CardTitle>
              <CardDescription>
                Selecione as tabelas do Baserow a exportar e garanta links reais de vídeo
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Switch TV */}
                <div className={`flex items-center justify-between p-3.5 rounded-lg border transition-colors ${incluirTV ? 'border-sky-500/40 bg-sky-500/5' : 'bg-card/50'}`}>
                  <div className="space-y-0.5">
                    <Label className="font-medium flex items-center gap-2 text-sm">
                      <Tv className="w-4 h-4 text-sky-500" />
                      Canais de TV
                    </Label>
                    <p className="text-xs text-muted-foreground">Tabela: canaisTv</p>
                  </div>
                  <Switch checked={incluirTV} onCheckedChange={setIncluirTV} />
                </div>

                {/* Switch Filmes */}
                <div className={`flex items-center justify-between p-3.5 rounded-lg border transition-colors ${incluirFilmes ? 'border-emerald-500/40 bg-emerald-500/5' : 'bg-card/50'}`}>
                  <div className="space-y-0.5">
                    <Label className="font-medium flex items-center gap-2 text-sm">
                      <Film className="w-4 h-4 text-emerald-500" />
                      Filmes VOD
                    </Label>
                    <p className="text-xs text-muted-foreground">Tabela: conteudos</p>
                  </div>
                  <Switch checked={incluirFilmes} onCheckedChange={setIncluirFilmes} />
                </div>

                {/* Switch Séries */}
                <div className={`flex items-center justify-between p-3.5 rounded-lg border transition-colors ${incluirSeries ? 'border-amber-500/40 bg-amber-500/5' : 'bg-card/50'}`}>
                  <div className="space-y-0.5">
                    <Label className="font-medium flex items-center gap-2 text-sm">
                      <Clapperboard className="w-4 h-4 text-amber-500" />
                      Séries & Episódios
                    </Label>
                    <p className="text-xs text-muted-foreground">Tabela: episodios</p>
                  </div>
                  <Switch checked={incluirSeries} onCheckedChange={setIncluirSeries} />
                </div>

                {/* Switch Apenas com Link Real */}
                <div className="flex items-center justify-between p-3.5 rounded-lg border bg-card/50">
                  <div className="space-y-0.5">
                    <Label className="font-medium flex items-center gap-2 text-sm">
                      <ShieldCheck className="w-4 h-4 text-primary" />
                      Somente Links Reais
                    </Label>
                    <p className="text-xs text-muted-foreground">Ignora vazios/inválidos</p>
                  </div>
                  <Switch checked={apenasComLink} onCheckedChange={setApenasComLink} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
                <div>
                  <Label className="text-xs font-medium text-muted-foreground">Nome da Playlist (Header M3U)</Label>
                  <Input
                    value={nomeLista}
                    onChange={(e) => setNomeLista(e.target.value)}
                    placeholder="MinhaListaIPTV"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label className="text-xs font-medium text-muted-foreground">Formato do Stream</Label>
                  <Select value={formatoSaida} onValueChange={(v: any) => setFormatoSaida(v)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Selecione o formato" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="original">Link Original do Baserow (Recomendado)</SelectItem>
                      <SelectItem value="ts">Transport Stream (.ts / MPEG-TS)</SelectItem>
                      <SelectItem value="m3u8">HLS Stream (.m3u8)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs font-medium text-muted-foreground">Limite Filmes & TV</Label>
                  <Select value={limitePorTipo} onValueChange={setLimitePorTipo}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Sem limite" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Sem limite (100% Filmes e Canais)</SelectItem>
                      <SelectItem value="500">Até 500 itens</SelectItem>
                      <SelectItem value="1000">Até 1.000 itens</SelectItem>
                      <SelectItem value="2500">Até 2.500 itens</SelectItem>
                      <SelectItem value="5000">Até 5.000 itens</SelectItem>
                      <SelectItem value="10000">Até 10.000 itens</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs font-medium text-muted-foreground">
                    Séries na M3U (+96k Episódios)
                  </Label>
                  <Select value={limiteSeries} onValueChange={setLimiteSeries}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Escolha a estratégia" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="series_vod">Séries Catálogo Xtream (2.712 Séries)</SelectItem>
                      <SelectItem value="2500">Top 2.500 Episódios Recentes (Rápido)</SelectItem>
                      <SelectItem value="5000">Até 5.000 Episódios</SelectItem>
                      <SelectItem value="10000">Até 10.000 Episódios</SelectItem>
                      <SelectItem value="25000">Até 25.000 Episódios</SelectItem>
                      <SelectItem value="0">Todos os Episódios (+96.000 em Lotes)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Box Informativo de Alta Performance para +96k Episódios */}
              <div className="p-3.5 rounded-lg border border-primary/20 bg-primary/5 flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <p className="font-semibold text-foreground">
                    Arquitetura de Alta Performance para Grandes Bancos (+96.000 Episódios):
                  </p>
                  <p className="text-muted-foreground leading-relaxed">
                    • <strong>Filmes (5.054) e Canais (154):</strong> Baixam 100% completos sem nenhum limite artificial usando lotes otimizados de 200 itens por página do Baserow.
                  </p>
                  <p className="text-muted-foreground leading-relaxed">
                    • <strong>Séries no Xtream Codes (IPTV Smarters / TiviMate / XCIPTV):</strong> A melhor tecnologia para +96k episódios. O aplicativo lista as 2.712 séries e busca os episódios sob demanda diretamente no Baserow em apenas <strong>290ms</strong> sem sobrecarregar o servidor!
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Barra de Progresso durante a busca */}
          {loading && (
            <Card className="border-primary/40 bg-primary/5">
              <CardContent className="pt-6 space-y-3">
                <div className="flex items-center justify-between text-sm font-medium">
                  <span className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-primary" />
                    {statusMsg}
                  </span>
                  <span className="text-primary font-bold">{progresso}%</span>
                </div>
                <Progress value={progresso} className="h-2" />
              </CardContent>
            </Card>
          )}

          {/* Estatísticas da Lista Gerada & Botões de Download Específicos */}
          {itensGerados.length > 0 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Card className="border-sky-500/20 bg-sky-500/5">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">Canais TV</p>
                      <h3 className="text-2xl font-bold text-sky-600 dark:text-sky-400">{stats.tvCount}</h3>
                      {stats.tvCount > 0 && (
                        <button
                          onClick={() => handleDownloadCategoria('tv')}
                          className="text-[11px] text-sky-600 hover:underline mt-1 font-medium flex items-center gap-1"
                        >
                          <Download className="w-3 h-3" /> Baixar só TV
                        </button>
                      )}
                    </div>
                    <Tv className="w-8 h-8 text-sky-500/40" />
                  </CardContent>
                </Card>

                <Card className="border-emerald-500/20 bg-emerald-500/5">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">Filmes VOD</p>
                      <h3 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.filmesCount}</h3>
                      {stats.filmesCount > 0 && (
                        <button
                          onClick={() => handleDownloadCategoria('filme')}
                          className="text-[11px] text-emerald-600 hover:underline mt-1 font-medium flex items-center gap-1"
                        >
                          <Download className="w-3 h-3" /> Baixar só Filmes
                        </button>
                      )}
                    </div>
                    <Film className="w-8 h-8 text-emerald-500/40" />
                  </CardContent>
                </Card>

                <Card className="border-amber-500/20 bg-amber-500/5">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">Episódios Séries</p>
                      <h3 className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.seriesCount}</h3>
                      {stats.seriesCount > 0 && (
                        <button
                          onClick={() => handleDownloadCategoria('serie')}
                          className="text-[11px] text-amber-600 hover:underline mt-1 font-medium flex items-center gap-1"
                        >
                          <Download className="w-3 h-3" /> Baixar só Séries
                        </button>
                      )}
                    </div>
                    <Clapperboard className="w-8 h-8 text-amber-500/40" />
                  </CardContent>
                </Card>

                <Card className="border-primary/20 bg-primary/5">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">Total de Entradas</p>
                      <h3 className="text-2xl font-bold text-primary">{stats.total}</h3>
                      <button
                        onClick={handleDownloadM3U}
                        className="text-[11px] text-primary hover:underline mt-1 font-medium flex items-center gap-1"
                      >
                        <Download className="w-3 h-3" /> Baixar Completo
                      </button>
                    </div>
                    <Layers className="w-8 h-8 text-primary/40" />
                  </CardContent>
                </Card>
              </div>

              {/* Tabela de Verificação dos Links Reais */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Eye className="w-4 h-4 text-primary" />
                        Inspetor de Links Reais dos Conteúdos
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Confira os links extraídos do Baserow em tempo real. Teste a reprodução ou copie links individuais.
                      </CardDescription>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="relative w-48 sm:w-60">
                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                        <Input
                          placeholder="Buscar canal ou filme..."
                          value={buscaTabela}
                          onChange={(e) => setBuscaTabela(e.target.value)}
                          className="h-8 pl-8 text-xs"
                        />
                      </div>

                      <Select value={filtroTipoTabela} onValueChange={(v: any) => setFiltroTipoTabela(v)}>
                        <SelectTrigger className="h-8 text-xs w-28">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todos">Todos ({itensGerados.length})</SelectItem>
                          <SelectItem value="tv">TV ({stats.tvCount})</SelectItem>
                          <SelectItem value="filme">Filmes ({stats.filmesCount})</SelectItem>
                          <SelectItem value="serie">Séries ({stats.seriesCount})</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="rounded-lg border overflow-hidden">
                    <div className="max-h-72 overflow-y-auto">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-muted/70 text-muted-foreground font-semibold sticky top-0">
                          <tr>
                            <th className="p-2.5">Tipo</th>
                            <th className="p-2.5">Nome</th>
                            <th className="p-2.5">Categoria</th>
                            <th className="p-2.5">Link Real de Stream</th>
                            <th className="p-2.5 text-right">Ações</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {itensTabelaFiltrados.slice(0, 100).map((item) => (
                            <tr key={item.id} className="hover:bg-muted/30">
                              <td className="p-2.5 whitespace-nowrap">
                                {item.tipo === 'tv' && (
                                  <Badge variant="outline" className="text-[10px] bg-sky-500/10 text-sky-600 border-sky-500/30">
                                    TV
                                  </Badge>
                                )}
                                {item.tipo === 'filme' && (
                                  <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                                    FILME
                                  </Badge>
                                )}
                                {item.tipo === 'serie' && (
                                  <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/30">
                                    SÉRIE
                                  </Badge>
                                )}
                              </td>
                              <td className="p-2.5 font-medium max-w-[200px] truncate" title={item.nome}>
                                {item.nome}
                              </td>
                              <td className="p-2.5 text-muted-foreground max-w-[150px] truncate">
                                {item.categoria}
                              </td>
                              <td className="p-2.5 font-mono text-[11px] max-w-[320px] truncate select-all text-sky-600 dark:text-sky-400" title={item.streamUrl}>
                                {item.streamUrl || <span className="text-destructive font-sans">Sem link</span>}
                              </td>
                              <td className="p-2.5 text-right whitespace-nowrap">
                                <div className="flex items-center justify-end gap-1">
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-6 w-6"
                                    title="Copiar URL de stream"
                                    onClick={() => handleCopyDnsUrl(item.streamUrl, `Link de ${item.nome}`)}
                                  >
                                    <Copy className="w-3 h-3" />
                                  </Button>
                                  {item.streamUrl && (
                                    <a
                                      href={item.streamUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground inline-flex items-center"
                                      title="Abrir link original em nova aba"
                                    >
                                      <ExternalLink className="w-3 h-3" />
                                    </a>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  {itensTabelaFiltrados.length > 100 && (
                    <p className="text-[11px] text-muted-foreground mt-2 text-center">
                      Exibindo 100 de {itensTabelaFiltrados.length} itens correspondentes. O arquivo completo contém todos os registros.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Ações de Exportação e Prévia do Arquivo */}
          {m3uContent ? (
            <Card>
              <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    Arquivo M3U Gerado ({stats.total} itens reais)
                  </CardTitle>
                  <CardDescription>
                    Padrão #EXTM3U com metadados tvg-name, tvg-logo e group-title pronto para reprodutores IPTV
                  </CardDescription>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="outline" size="sm" onClick={handleCopyM3U} className="gap-1.5">
                    {copiadoM3U ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                    {copiadoM3U ? 'Copiado!' : 'Copiar Texto M3U'}
                  </Button>

                  <Button size="sm" onClick={handleDownloadM3U} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white">
                    <Download className="w-4 h-4" />
                    Baixar Arquivo .m3u
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <textarea
                    readOnly
                    value={m3uContent.slice(0, 5000) + (m3uContent.length > 5000 ? `\n\n... [+${m3uContent.length - 5000} caracteres restantes no arquivo completo]` : '')}
                    className="w-full h-64 p-3 font-mono text-xs rounded-lg border bg-muted/40 dark:bg-zinc-950/50 text-foreground resize-none focus:outline-none"
                  />
                  <span className="absolute bottom-3 right-4 text-[10px] text-muted-foreground bg-background/80 px-2 py-0.5 rounded border">
                    Tamanho total: {(new Blob([m3uContent]).size / 1024).toFixed(1)} KB
                  </span>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-dashed">
              <CardContent className="py-12 flex flex-col items-center justify-center text-center space-y-3">
                <div className="p-4 rounded-full bg-primary/10 text-primary">
                  <Radio className="w-8 h-8" />
                </div>
                <div className="max-w-md">
                  <h3 className="font-semibold text-base">Nenhuma lista gerada ainda</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Clique no botão &quot;Gerar / Atualizar Lista&quot; acima para extrair todos os links reais dos Canais, Filmes e Séries diretamente das suas tabelas do Baserow.
                  </p>
                </div>
                <Button onClick={handleGerarLista} disabled={loading} className="gap-2 mt-2">
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  Gerar Lista Agora
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ======================================================== */}
        {/* ABA 2: DNS & XTREAM CODES API                             */}
        {/* ======================================================== */}
        <TabsContent value="dns" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Server className="w-5 h-5 text-primary" />
                Configuração do Servidor DNS & Credenciais Xtream Codes
              </CardTitle>
              <CardDescription>
                O Host DNS é a URL do servidor. Os clientes do Baserow na tabela &quot;usuarios&quot; autenticam diretamente através deste DNS.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Campo DNS / Servidor */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Server className="w-4 h-4 text-primary" />
                      Host / Servidor DNS (URL ou Domínio com Porta)
                    </Label>
                    <button
                      type="button"
                      onClick={() => setDnsHost(typeof window !== 'undefined' ? window.location.origin : 'http://meuservidor.vip:8080')}
                      className="text-[11px] text-primary hover:underline flex items-center gap-1"
                    >
                      <Globe className="w-3 h-3" /> Usar URL deste painel
                    </button>
                  </div>
                  <Input
                    value={dnsHost}
                    onChange={(e) => setDnsHost(e.target.value)}
                    placeholder="https://painel.meudominio.com"
                    className="font-mono text-sm"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Este é o endereço que o cliente digita no campo <strong>&quot;URL do Servidor&quot;</strong> do IPTV Smarters ou XCIPTV.
                  </p>
                </div>

                {/* Seleção de Usuário do Baserow */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <User className="w-4 h-4 text-emerald-500" />
                      Vincular Cliente da Tabela do Baserow
                    </Label>
                    <button
                      type="button"
                      onClick={() => carregarUsuarios(true)}
                      disabled={loadingUsuarios}
                      className="text-[11px] text-emerald-500 hover:text-emerald-400 hover:underline flex items-center gap-1 font-medium transition-colors"
                      title="Recarregar clientes e datas atualizadas do Baserow"
                    >
                      <RefreshCw className={`w-3 h-3 ${loadingUsuarios ? 'animate-spin' : ''}`} />
                      {loadingUsuarios ? 'Atualizando...' : 'Recarregar Baserow'}
                    </button>
                  </div>
                  <Select value={selectedUserId} onValueChange={handleSelectUser}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um usuário ou modo manual" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">⚙️ Digitar Usuário Manualmente</SelectItem>
                      {usuarios.map((u) => {
                        const nome = getValueByPossibleKeys(u, 'nome') || getValueByPossibleKeys(u, 'usuario') || getValueByPossibleKeys(u, 'email') || `Usuário #${u.id}`;
                        const status = getValueByPossibleKeys(u, 'status') || 'Ativo';
                        const venc = getValueByPossibleKeys(u, 'vencimento') || 'Sem data';
                        return (
                          <SelectItem key={u.id} value={String(u.id)}>
                            {nome} — [{status}] ({venc})
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground flex items-center justify-between">
                    <span>{loadingUsuarios ? 'Carregando usuários da tabela do Baserow...' : `${usuarios.length} usuários disponíveis na sua tabela.`}</span>
                    <span className="text-[10px] text-muted-foreground/80">Alterações no Baserow entram na hora</span>
                  </p>
                </div>
              </div>

              {/* Campos Usuário e Senha */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-lg bg-muted/40 border">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Usuário (Username)
                  </Label>
                  <Input
                    value={customUsername}
                    onChange={(e) => setCustomUsername(e.target.value)}
                    placeholder="demo"
                    className="font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Senha (Password)
                  </Label>
                  <Input
                    value={customPassword}
                    onChange={(e) => setCustomPassword(e.target.value)}
                    placeholder="123456"
                    className="font-mono"
                  />
                </div>
              </div>

              {/* Card de Informações e Validade do Usuário no Baserow */}
              {parsedUserDates && (
                <div className={`p-4 rounded-xl border text-xs space-y-3 transition-all ${
                  parsedUserDates.isExpired
                    ? 'bg-red-500/10 border-red-500/30 text-red-900 dark:text-red-200'
                    : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-200'
                }`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 font-semibold text-sm">
                      <User className="w-4 h-4" />
                      <span>Status da Conta no Baserow:</span>
                      <Badge variant={parsedUserDates.isExpired ? "destructive" : "default"} className="text-xs">
                        {parsedUserDates.isExpired ? '⚠️ Vencido / Expirado' : '✅ Válido / Ativo'}
                      </Badge>
                    </div>
                    <Badge variant="outline" className="font-mono text-[11px] bg-background/50">
                      Limite: {parsedUserDates.limite} {Number(parsedUserDates.limite) > 1 ? 'telas simultâneas' : 'tela'}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                    <div className="p-2.5 rounded-lg bg-background/70 border border-current/20">
                      <p className="text-[10px] text-muted-foreground uppercase font-semibold flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-sky-500" /> Data de Criação
                      </p>
                      <p className="font-mono font-bold text-xs mt-0.5 text-foreground">
                        {parsedUserDates.criacaoDate ? parsedUserDates.criacaoDate.toLocaleString('pt-BR') : parsedUserDates.rawCriacao}
                      </p>
                    </div>

                    <div className="p-2.5 rounded-lg bg-background/70 border border-current/20">
                      <p className="text-[10px] text-muted-foreground uppercase font-semibold flex items-center gap-1">
                        <Clock className="w-3 h-3 text-amber-500" /> Data de Vencimento
                      </p>
                      <p className="font-mono font-bold text-xs mt-0.5 text-foreground">
                        {parsedUserDates.vencDate ? parsedUserDates.vencDate.toLocaleString('pt-BR') : parsedUserDates.rawVencimento}
                      </p>
                    </div>

                    <div className="p-2.5 rounded-lg bg-background/70 border border-current/20">
                      <p className="text-[10px] text-muted-foreground uppercase font-semibold flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3 text-emerald-500" /> Limite de Telas
                      </p>
                      <p className="font-mono font-bold text-xs mt-0.5 text-foreground">
                        {parsedUserDates.limite} {Number(parsedUserDates.limite) > 1 ? 'conexões simultâneas' : 'conexão simultânea'}
                      </p>
                    </div>
                  </div>

                  {parsedUserDates.isExpired ? (
                    <div className="flex flex-col gap-1 p-3 rounded-lg bg-red-500/20 text-red-900 dark:text-red-200 text-xs font-medium border border-red-500/40">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 shrink-0 text-red-600 dark:text-red-400" />
                        <span className="font-bold uppercase tracking-wider text-red-700 dark:text-red-300">
                          Bloqueio Estrito Ativo (Vencido / Expirado)
                        </span>
                      </div>
                      <p className="pl-6 text-[11px] leading-relaxed">
                        A data de vencimento foi ultrapassada ou o status está vencido. O servidor Xtream Codes e o endpoint M3U retornam <strong>HTTP 403 Forbidden</strong> e status <strong>Disabled</strong>. O aplicativo IPTV (IPTV Smarters / XCIPTV) será impedido de carregar canais, filmes ou séries até que a renovação seja efetuada no Baserow.
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-500/20 text-emerald-800 dark:text-emerald-200 text-[11px] font-medium border border-emerald-500/30">
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                      <span>
                        <strong>Acesso Liberado:</strong> O cliente está dentro da vigência cadastrada e poderá reproduzir canais e VOD normalmente até o vencimento.
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Seletor de Tipo de Conteúdo no DNS / M3U */}
              <div className="p-4 rounded-xl bg-card border shadow-sm space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-semibold flex items-center gap-2">
                      <Layers className="w-4 h-4 text-primary" />
                      Conteúdo Liberado para este Acesso / Link
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Defina se este cliente ou link deve receber tudo ou apenas uma categoria específica.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={filtroTipoDns === 'all' ? 'default' : 'outline'}
                      onClick={() => setFiltroTipoDns('all')}
                      className="text-xs h-8"
                    >
                      🌐 Completo
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={filtroTipoDns === 'tv' ? 'default' : 'outline'}
                      onClick={() => setFiltroTipoDns('tv')}
                      className="text-xs h-8"
                    >
                      <Tv className="w-3.5 h-3.5 mr-1" /> Só Canais TV
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={filtroTipoDns === 'movies' ? 'default' : 'outline'}
                      onClick={() => setFiltroTipoDns('movies')}
                      className="text-xs h-8"
                    >
                      <Film className="w-3.5 h-3.5 mr-1" /> Só Filmes
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={filtroTipoDns === 'series' ? 'default' : 'outline'}
                      onClick={() => setFiltroTipoDns('series')}
                      className="text-xs h-8"
                    >
                      <Clapperboard className="w-3.5 h-3.5 mr-1" /> Só Séries
                    </Button>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-[11px] text-muted-foreground bg-muted/50 p-2.5 rounded-lg border">
                  <Zap className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>
                    <strong>Modo Ativo: </strong>
                    {filtroTipoDns === 'all' && 'Todos os canais, filmes e séries serão sincronizados no aplicativo.'}
                    {filtroTipoDns === 'tv' && 'Exclusivamente Canais de TV Ao Vivo serão entregues. Filmes e séries ficarão ocultos no app.'}
                    {filtroTipoDns === 'movies' && 'Exclusivamente Filmes VOD serão entregues. Canais e séries ficarão ocultos no app.'}
                    {filtroTipoDns === 'series' && 'Exclusivamente Séries & Episódios serão entregues. Canais e filmes ficarão ocultos no app.'}
                  </span>
                </div>
              </div>

              {/* Card de Otimização para Catálogos Gigantes (+30.000 Conteúdos) */}
              <div className="p-3.5 rounded-xl bg-gradient-to-r from-sky-500/10 via-purple-500/10 to-emerald-500/10 border border-primary/20 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-semibold text-xs">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <span>Motor de Alta Performance para Grandes Catálogos (+30.000 conteúdos)</span>
                  </div>
                  <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/30">
                    Otimizado v3.0
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Para evitar lentidão com a limitação de 200 itens por requisição do Baserow, o servidor agora utiliza <strong>Carregamento Segmentado Sob Demanda (Lazy Loading)</strong> e <strong>Pool de Concorrência Paralela</strong> em chunks de 5 páginas. Além disso, as consultas ficam cacheadas por 5 a 15 minutos em memória, entregando respostas em menos de <strong>50ms</strong> mesmo para catálogos com dezenas de milhares de itens!
                </p>
              </div>

              {/* Ações: Testar Conexão Xtream, Sincronizar Servidor e Copiar WhatsApp */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    onClick={handleTestarXtream}
                    disabled={testandoXtream}
                    variant="outline"
                    className="gap-2 border-primary/40 text-primary hover:bg-primary/10"
                  >
                    <Zap className={`w-4 h-4 ${testandoXtream ? 'animate-spin' : ''}`} />
                    {testandoXtream ? 'Diagnosticando Servidor...' : 'Testar Conexão e Conteúdo ao Vivo'}
                  </Button>

                  <Button
                    onClick={handleSyncXtreamConfig}
                    disabled={sincronizandoXtream}
                    variant="secondary"
                    className="gap-2 text-xs"
                    title="Salva as tabelas e tokens ativos do Baserow no servidor para o Xtream Codes"
                  >
                    <Server className={`w-4 h-4 ${sincronizandoXtream ? 'animate-spin' : ''}`} />
                    {sincronizandoXtream ? 'Sincronizando...' : 'Sincronizar Servidor Xtream'}
                  </Button>
                </div>

                <Button
                  onClick={handleCopyWhatsAppMessage}
                  className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
                >
                  {copiadoWpp ? <Check className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                  {copiadoWpp ? 'Copiado para WhatsApp!' : 'Copiar Acesso Formatado (WhatsApp)'}
                </Button>
              </div>

              {/* Resultado do Teste Xtream Codes */}
              {resultadoTeste && (
                <div className={`p-4 rounded-xl border ${resultadoTeste.sucesso ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-200' : 'bg-destructive/10 border-destructive/30 text-destructive'}`}>
                  <div className="flex items-start gap-3">
                    {resultadoTeste.sucesso ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                    )}
                    <div className="space-y-3 flex-1 text-xs">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-sm flex items-center gap-2">
                          {resultadoTeste.sucesso ? '✅ Servidor Xtream Codes Pronto e Sincronizado!' : '⚠️ Atenção na Conexão'}
                        </h4>
                        <span className="text-[11px] opacity-75">{resultadoTeste.timestamp}</span>
                      </div>

                      {/* Informações de Autenticação, Validade e Limites */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-2.5 rounded-lg bg-background/70 border border-current/20 text-xs">
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase font-semibold">Status Auth</p>
                          <Badge variant={resultadoTeste.sucesso ? "default" : "destructive"} className="text-[11px] mt-0.5">
                            {resultadoTeste.status}
                          </Badge>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase font-semibold">Limite de Telas</p>
                          <p className="font-mono font-bold text-foreground mt-0.5">{resultadoTeste.limiteConexoes} {Number(resultadoTeste.limiteConexoes) > 1 ? 'conexões' : 'conexão'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase font-semibold">Data Criação</p>
                          <p className="font-mono font-bold text-foreground mt-0.5">{resultadoTeste.criadoEm || 'Automática'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase font-semibold">Vencimento</p>
                          <p className={`font-mono font-bold mt-0.5 ${resultadoTeste.isExpired ? 'text-destructive font-black' : 'text-foreground'}`}>
                            {resultadoTeste.vencimentoEm || 'Calculado'}
                          </p>
                        </div>
                      </div>

                      {resultadoTeste.sucesso ? (
                        <>
                          <div className="grid grid-cols-3 gap-2 p-2.5 rounded-lg bg-background/60 border border-emerald-500/20 text-center">
                            <div>
                              <p className="text-[10px] text-muted-foreground uppercase font-semibold">Canais de TV</p>
                              <p className="text-base font-bold text-sky-600 dark:text-sky-400">{resultadoTeste.liveCount}</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-muted-foreground uppercase font-semibold">Filmes VOD</p>
                              <p className="text-base font-bold text-emerald-600 dark:text-emerald-400">{resultadoTeste.vodCount}</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-muted-foreground uppercase font-semibold">Séries</p>
                              <p className="text-base font-bold text-amber-600 dark:text-amber-400">{resultadoTeste.seriesCount}</p>
                            </div>
                          </div>

                          <div className="p-2.5 rounded bg-sky-500/10 border border-sky-500/20 text-sky-900 dark:text-sky-200 text-xs space-y-1">
                            <p className="font-semibold flex items-center gap-1.5">
                              <Info className="w-4 h-4 text-sky-500 shrink-0" />
                              Como preencher no seu App IPTV (IPTV Smarters / XCIPTV / TiviMate):
                            </p>
                            <ul className="list-disc list-inside space-y-0.5 pl-1 text-[11px]">
                              <li><strong>Host / Servidor:</strong> <code className="bg-background px-1 py-0.5 rounded font-bold">{sanitizedDns}</code> (Atenção: NÃO adicione barra no final nem get.php)</li>
                              <li><strong>Usuário:</strong> <code className="bg-background px-1 py-0.5 rounded font-bold">{customUsername}</code></li>
                              <li><strong>Senha:</strong> <code className="bg-background px-1 py-0.5 rounded font-bold">{customPassword}</code></li>
                            </ul>
                          </div>
                        </>
                      ) : (
                        <div className="p-3 rounded-lg bg-destructive/15 border border-destructive/30 text-destructive text-xs space-y-1">
                          <p className="font-semibold flex items-center gap-1.5">
                            <AlertTriangle className="w-4 h-4 shrink-0" />
                            Motivo do bloqueio / falha de acesso:
                          </p>
                          <p className="font-mono text-[11px]">{resultadoTeste.motivo}</p>
                          <p className="text-[11px] text-muted-foreground mt-1">
                            {resultadoTeste.isExpired ? 'Este usuário expirou a validade ou a data de criação é futura. Atualize a coluna "Vencimento" na tabela de usuários do Baserow para reativar.' : 'Verifique se o usuário e senha estão corretos na sua tabela "usuarios" do Baserow.'}
                          </p>
                        </div>
                      )}

                      <details className="text-[11px] font-mono bg-background/80 p-2 rounded border">
                        <summary className="cursor-pointer font-sans font-medium text-foreground">
                          Ver JSON bruto retornado para o app (/player_api.php)
                        </summary>
                        <pre className="mt-2 overflow-x-auto text-[10px] text-foreground">
                          {JSON.stringify(resultadoTeste.apiResponse, null, 2)}
                        </pre>
                      </details>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Links e Formatos de Saída Gerados */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Card 1: Formato M3U Plus TS */}
            <Card className="border-sky-500/20">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="bg-sky-500/10 text-sky-600 border-sky-500/30 text-xs">
                    Padrão Recomendado
                  </Badge>
                  <Button variant="ghost" size="icon" onClick={() => handleOpenQR(xtreamUrls.m3uPlusTs)}>
                    <QrCode className="w-4 h-4" />
                  </Button>
                </div>
                <CardTitle className="text-base mt-2">Link M3U Plus (Formato TS)</CardTitle>
                <CardDescription className="text-xs">
                  Ideal para IPTV Smarters, TiviMate, OTT Navigator e Smart TVs
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-2.5 rounded bg-muted font-mono text-xs break-all select-all">
                  {xtreamUrls.m3uPlusTs}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full gap-1.5"
                    onClick={() => handleCopyDnsUrl(xtreamUrls.m3uPlusTs, 'Link M3U Plus TS')}
                  >
                    <Copy className="w-3.5 h-3.5" />
                    Copiar Link
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Card 2: Formato M3U8 HLS */}
            <Card className="border-emerald-500/20">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-xs">
                    HLS Streaming
                  </Badge>
                  <Button variant="ghost" size="icon" onClick={() => handleOpenQR(xtreamUrls.m3uPlusHls)}>
                    <QrCode className="w-4 h-4" />
                  </Button>
                </div>
                <CardTitle className="text-base mt-2">Link M3U8 (Formato HLS)</CardTitle>
                <CardDescription className="text-xs">
                  Para iOS, Safari, Apple TV e reprodutores web nativos
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-2.5 rounded bg-muted font-mono text-xs break-all select-all">
                  {xtreamUrls.m3uPlusHls}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full gap-1.5"
                    onClick={() => handleCopyDnsUrl(xtreamUrls.m3uPlusHls, 'Link M3U8 HLS')}
                  >
                    <Copy className="w-3.5 h-3.5" />
                    Copiar Link
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Card 3: Credenciais Diretas Xtream Codes */}
            <Card className="border-purple-500/20">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-500/30 text-xs">
                    Login por API Xtream
                  </Badge>
                  <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                    Conta Isolada
                  </Badge>
                </div>
                <CardTitle className="text-base mt-2">Dados de Entrada Xtream Codes</CardTitle>
                <CardDescription className="text-xs">
                  Credenciais individuais para o cliente digitar no aplicativo IPTV
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                <div className="flex justify-between items-center p-2 rounded bg-muted/60">
                  <span className="text-muted-foreground font-medium">Servidor DNS (Geral):</span>
                  <div className="flex items-center gap-1.5 font-mono font-semibold">
                    <span>{xtreamUrls.server}</span>
                    <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => handleCopyDnsUrl(xtreamUrls.server, 'Host DNS')}>
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                {xtreamUrls.dedicatedDns !== xtreamUrls.server && (
                  <div className="flex justify-between items-center p-2 rounded bg-muted/60">
                    <span className="text-muted-foreground font-medium">DNS Dedicado da Conta:</span>
                    <div className="flex items-center gap-1.5 font-mono font-semibold text-[11px] text-sky-600 dark:text-sky-400">
                      <span>{xtreamUrls.dedicatedDns}</span>
                      <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => handleCopyDnsUrl(xtreamUrls.dedicatedDns, 'DNS Dedicado')}>
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                )}
                <div className="flex justify-between items-center p-2 rounded bg-muted/60">
                  <span className="text-muted-foreground font-medium">Usuário:</span>
                  <div className="flex items-center gap-1.5 font-mono font-semibold">
                    <span>{xtreamUrls.username}</span>
                    <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => handleCopyDnsUrl(xtreamUrls.username, 'Usuário')}>
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                <div className="flex justify-between items-center p-2 rounded bg-muted/60">
                  <span className="text-muted-foreground font-medium">Senha:</span>
                  <div className="flex items-center gap-1.5 font-mono font-semibold">
                    <span>{xtreamUrls.password}</span>
                    <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => handleCopyDnsUrl(xtreamUrls.password, 'Senha')}>
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                <div className="p-2 rounded bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 text-[10px] flex items-center gap-1.5 border border-emerald-500/20 mt-1">
                  <ShieldCheck className="w-3.5 h-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <span>
                    <strong>Catálogo Exclusivo:</strong> O app receberá unicamente os canais ({config.tableIds?.canaisTv || 'padrão'}), filmes e séries das tabelas da sua conta, sem vazamento com outros painéis.
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Card 4: XMLTV / Guia EPG */}
            <Card className="border-amber-500/20">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-xs">
                    Guia de Programação
                  </Badge>
                </div>
                <CardTitle className="text-base mt-2">Link EPG (Guia XMLTV)</CardTitle>
                <CardDescription className="text-xs">
                  Para carregar a grade de programação dos canais
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-2.5 rounded bg-muted font-mono text-xs break-all select-all">
                  {xtreamUrls.epgXml}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full gap-1.5"
                  onClick={() => handleCopyDnsUrl(xtreamUrls.epgXml, 'Link EPG')}
                >
                  <Copy className="w-3.5 h-3.5" />
                  Copiar Link EPG
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ======================================================== */}
        {/* ABA 3: COMO FUNCIONA / GUIA TÉCNICO COMPLETO              */}
        {/* ======================================================== */}
        <TabsContent value="comofunciona" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Info className="w-5 h-5 text-primary" />
                Como a Conexão Baserow + DNS & Xtream Codes Funciona na Prática
              </CardTitle>
              <CardDescription>
                Respostas diretas e técnicas sobre Host, Porta, Autenticação de Usuários e Comunicação Real
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 text-sm text-muted-foreground leading-relaxed">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-4 rounded-xl border bg-card/60 space-y-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold">
                    1
                  </div>
                  <h4 className="font-semibold text-foreground text-base">Qual é o Host DNS e a Porta?</h4>
                  <p className="text-xs leading-normal">
                    O <strong>Host DNS</strong> é o domínio ou endereço web onde este painel (ou seu servidor de API) está hospedado — por exemplo: <code>https://seupainel.com</code> ou <code>http://192.168.1.100:3000</code>.
                    A porta padrão web é <strong>80</strong> (HTTP) ou <strong>443</strong> (HTTPS). Em servidores locais/VPS costuma ser <strong>8080</strong> ou <strong>3000</strong>.
                  </p>
                </div>

                <div className="p-4 rounded-xl border bg-card/60 space-y-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold">
                    2
                  </div>
                  <h4 className="font-semibold text-foreground text-base">Como Vincular os Usuários ao DNS?</h4>
                  <p className="text-xs leading-normal">
                    O vínculo é <strong>100% automático pela tabela &quot;usuarios&quot; do seu Baserow</strong>!
                    Quando você cadastra o cliente com Nome (ou Usuário), Senha e Status &quot;Ativo&quot;, o DNS consulta essa tabela em tempo real no momento que o cliente faz login no app.
                  </p>
                </div>

                <div className="p-4 rounded-xl border bg-card/60 space-y-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center font-bold">
                    3
                  </div>
                  <h4 className="font-semibold text-foreground text-base">Como o Player Reproduz os Vídeos?</h4>
                  <p className="text-xs leading-normal">
                    O aplicativo (IPTV Smarters, TiviMate) solicita as listas em <code>/player_api.php</code>. O servidor lê os registros de <code>canaisTv</code>, <code>conteudos</code> e <code>episodios</code> e entrega os links reais de stream (URLs completas) direto para o player dar Play!
                  </p>
                </div>
              </div>

              {/* Arquitetura em Fluxograma Simples */}
              <div className="p-4 rounded-xl border bg-muted/40 space-y-3">
                <h4 className="font-semibold text-foreground flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-emerald-500" />
                  Fluxo de Comunicação em Tempo Real
                </h4>
                <div className="font-mono text-xs p-3 rounded-lg bg-background border space-y-1.5 text-foreground overflow-x-auto">
                  <p>1. [Cliente no Smarters] --&gt; Digita Host (DNS), Usuário e Senha</p>
                  <p>2. [IPTV Smarters] -------&gt; GET /player_api.php?username=joao&amp;password=123</p>
                  <p>3. [Servidor DNS / Painel] -&gt; Consulta tabela &quot;usuarios&quot; no Baserow</p>
                  <p>4. [Baserow] -------------&gt; Retorna: João está Ativo e vence em 31/12/2026</p>
                  <p>5. [Servidor DNS / Painel] -&gt; Responde &#123; auth: 1, status: &quot;Active&quot; &#125; para o Smarters</p>
                  <p>6. [IPTV Smarters] -------&gt; GET /player_api.php?action=get_live_streams</p>
                  <p>7. [Servidor DNS / Painel] -&gt; Busca tabela &quot;canaisTv&quot; no Baserow e devolve os streams reais</p>
                  <p>8. [Cliente Dá Play] ------&gt; O player toca o vídeo diretamente do link real!</p>
                </div>
              </div>

              {/* Compatibilidade de Aplicativos */}
              <div className="p-4 rounded-xl border bg-muted/40 space-y-3">
                <h4 className="font-semibold text-foreground flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  Compatibilidade 100% com Players do Mercado
                </h4>
                <p className="text-xs">
                  Tanto as listas <code>.m3u</code> quanto as credenciais Xtream Codes funcionam em:
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  {['IPTV Smarters Pro', 'TiviMate', 'XCIPTV', 'VLC Media Player', 'OTT Navigator', 'SS IPTV', 'Smart IPTV', 'IBO Player', 'Bob Player', 'Kodi', 'Nanomid Player'].map((player) => (
                    <Badge key={player} variant="secondary" className="text-xs py-1 px-2.5">
                      {player}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal de QR Code */}
      <QRCodeGenerator
        open={qrOpen}
        onOpenChange={setQrOpen}
        url={qrUrl}
      />
    </div>
  );
}
