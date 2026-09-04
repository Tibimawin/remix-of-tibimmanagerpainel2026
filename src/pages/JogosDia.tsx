import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, 
  Search, 
  RefreshCw, 
  Filter, 
  Calendar, 
  Plus, 
  Check, 
  AlertTriangle,
  Users,
  Clock,
  Activity,
  History,
  Settings,
  Lock,
  ArrowRight,
  Sparkles,
  Download,
  CalendarDays
} from 'lucide-react';
import { useConfig } from '@/contexts/ConfigContext';
import { useGlobalJogosDiaConfig } from '@/hooks/useGlobalJogosDiaConfig';
import { makeProxyRequest } from '@/utils/proxyRequest';
import { useBaserowService } from '@/services/BaserowService';
import { toast } from 'sonner';
import { useSimpleAuth } from '@/contexts/SimpleAuthContext';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { usePlans } from '@/hooks/usePlans';
import { db } from '@/config/firebase';
import { collection, query, where, orderBy, limit, doc, getDocs, getDoc } from 'firebase/firestore';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { useNavigate } from 'react-router-dom';
import { PermissionGate } from '@/components/PermissionGate';
import { 
  analyzeJogoDate, 
  JogoDateInfo, 
  isBlankOrSeparatorRow, 
  getSeparatorLabel,
  sanitizeAndFilterActiveJogos 
} from '@/utils/jogosDiaDateUtils';


interface JogoDia {
  id: string;
  Nome: string;
  'Time Casa': string;
  'Logo Casa': string;
  'Time Fora': string;
  'Logo Fora': string;
  'Data Horario'?: string;
  Data?: string;
  Link: string;
  Campeonato: string;
  'Link 1'?: string;
  'Link 2'?: string;
  imported?: boolean;
}

const JogosDia = () => {
  const { config } = useConfig();
  const { userInfo } = useSimpleAuth();
  const navigate = useNavigate();
  const { hasFeature, isSubscriptionExpired } = useUserPermissions();
  const { globalConfig, loading: loadingConfig } = useGlobalJogosDiaConfig();
  const [jogos, setJogos] = useState<JogoDia[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [importingIds, setImportingIds] = useState<Set<string>>(new Set());
  const [isImportingAllToday, setIsImportingAllToday] = useState(false);
  const baserowService = useBaserowService();
  const [logs, setLogs] = useState<any[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const [selectedCampeonato, setSelectedCampeonato] = useState<string>('todos');
  const [selectedDateFilter, setSelectedDateFilter] = useState<'todos' | 'hoje' | 'amanha' | 'proximos'>('todos');
  const [importProgress, setImportProgress] = useState<{
    status: 'running' | 'completed' | 'error' | 'idle';
    current: number;
    total: number;
    message?: string;
  } | null>(null);


  const fetchJogos = async () => {
    if (!globalConfig?.isActive || !globalConfig?.contentTableId) return;

    setLoading(true);
    try {
      const endpoint = `/api/database/rows/table/${globalConfig.contentTableId}/?user_field_names=true`;
      const url = `${globalConfig.sourceBaseUrl}${endpoint}`;

      const response = await makeProxyRequest({
        url,
        method: 'GET',
        token: globalConfig.sourceToken
      });

      if (response.ok) {
        setJogos(response.data.results || []);
      } else {
        toast.error('Erro ao carregar jogos da fonte global');
      }
    } catch (error) {
      console.error('Error fetching matches:', error);
      toast.error('Erro de conexão ao buscar jogos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (globalConfig?.isActive) {
      fetchJogos();
    }
  }, [globalConfig]);

  // Carrega histórico de logs sob demanda para economizar quota do Firestore
  useEffect(() => {
    if (!userInfo?.id) return;

    const loadLogs = async () => {
      try {
        const q = query(
          collection(db, 'jogosDiaLogs'),
          where('userId', '==', userInfo.id),
          orderBy('timestamp', 'desc'),
          limit(10)
        );
        const snap = await getDocs(q);
        setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.warn('Não foi possível carregar logs de jogos do dia:', err);
      }
    };

    loadLogs();
  }, [userInfo?.id]);

  // Jogos ativos higienizados: Remove eventos do passado (ontem, anteontem) e limpa separadores órfãos
  const activeJogos = useMemo(() => {
    return sanitizeAndFilterActiveJogos(jogos);
  }, [jogos]);

  // Contagem dinâmica por data (ignora eventos passados e linhas em branco/separadores)
  const dateCounts = useMemo(() => {
    let hoje = 0;
    let amanha = 0;
    let proximos = 0;

    activeJogos.forEach(jogo => {
      if (isBlankOrSeparatorRow(jogo)) return;
      const dateInfo = analyzeJogoDate(jogo.Data || (jogo as any)['Data'], jogo['Data Horario'] || (jogo as any)['Data Horario']);
      if (dateInfo.isPast) return;
      if (dateInfo.isToday) hoje++;
      else if (dateInfo.isTomorrow) amanha++;
      else if (dateInfo.isFuture) proximos++;
    });

    return { hoje, amanha, proximos, todos: hoje + amanha + proximos };
  }, [activeJogos]);

  const handleImport = async (jogo: JogoDia) => {
    if (isBlankOrSeparatorRow(jogo)) return;

    const dateInfo = analyzeJogoDate(jogo.Data || (jogo as any)['Data'], jogo['Data Horario'] || (jogo as any)['Data Horario']);

    // 🔒 BLOQUEIO SEGURO: Não permitir importação de jogos passados ou de datas futuras
    if (dateInfo.isPast) {
      toast.error('Este jogo já foi encerrado em data anterior e não pode ser importado.');
      return;
    }

    if (!dateInfo.canImport) {
      toast.error(`Importação bloqueada: Este jogo está agendado para ${dateInfo.displayDate}. Só pode ser importado no dia da partida.`);
      return;
    }

    const targetTableId = config?.tableIds?.jogosDia;
    
    if (!targetTableId) {
      toast.custom((t) => (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-white/10 rounded-xl p-4 shadow-xl max-w-md"
        >
          <div className="flex items-start gap-3">
            <div className="p-2 bg-yellow-500/10 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-sm mb-1">Tabela de Jogos do Dia não configurada</h4>
              <p className="text-xs text-muted-foreground mb-3">
                Você precisa configurar o ID do jogo ao dia nas configurações dos Ids das tabelas antes de importar.
              </p>
              <Button
                size="sm"
                className="w-full gap-2"
                onClick={() => {
                  toast.dismiss(t);
                  navigate('/configuracoes', { state: { focusField: 'jogosDia' } });
                }}
              >
                <Settings className="w-4 h-4" />
                Configurar ID da Tabela
              </Button>
            </div>
          </div>
        </motion.div>
      ), { duration: 8000 });
      return;
    }

    setImportingIds(prev => new Set(prev).add(jogo.id));
    
    try {
      const data = {
        'Nome': jogo.Nome,
        'Link': jogo.Link,
        'Categoria': jogo.Campeonato || 'Jogos do Dia',
        'Capa': jogo['Logo Casa'] || '',
        'Logo': jogo['Logo Casa'] || '',
        'Data': jogo.Data || jogo['Data Horario'] || '',
        'TimeCasa': jogo['Time Casa'],
        'TimeFora': jogo['Time Fora'],
        'Campeonato': jogo.Campeonato,
        'LogoCasa': jogo['Logo Casa'] || '',
        'LogoFora': jogo['Logo Fora'] || '',
        'Link1': jogo['Link 1'] || '',
        'Link2': jogo['Link 2'] || '',
        'Time Casa': jogo['Time Casa'],
        'Time Fora': jogo['Time Fora'],
        'Logo Casa': jogo['Logo Casa'],
        'Logo Fora': jogo['Logo Fora'],
        'Data Horario': jogo['Data Horario'] || jogo.Data || '',
        'Link 1': jogo['Link 1'] || '',
        'Link 2': jogo['Link 2'] || ''
      };

      const existing = await baserowService.getTableData(targetTableId, 1, 10, jogo.Nome);
      const match = existing.results?.find((r: any) => r.Link === jogo.Link || r['Link'] === jogo.Link);

      if (match) {
        await baserowService.updateRow(targetTableId, String(match.id), data);
        toast.success(`Jogo '${jogo.Nome}' atualizado na grade com sucesso!`);
      } else {
        await baserowService.createRow(targetTableId, data);
        toast.success(`Jogo '${jogo.Nome}' importado para a grade!`);
      }
    } catch (error) {
      toast.error('Erro durante a importação do jogo');
    } finally {
      setImportingIds(prev => {
        const next = new Set(prev);
        next.delete(jogo.id);
        return next;
      });
    }
  };

  // Importar todos os jogos liberados de HOJE em 1 clique
  const handleImportAllToday = async () => {
    const todayGames = activeJogos.filter(j => {
      if (isBlankOrSeparatorRow(j)) return false;
      const dateInfo = analyzeJogoDate(j.Data || (j as any)['Data'], j['Data Horario'] || (j as any)['Data Horario']);
      return dateInfo.canImport;
    });

    if (todayGames.length === 0) {
      toast.info('Não há jogos agendados para hoje disponíveis para importação.');
      return;
    }

    const targetTableId = config?.tableIds?.jogosDia;
    if (!targetTableId) {
      toast.error('Configure o ID da tabela de Jogos do Dia em Configurações antes de importar.');
      return;
    }

    setIsImportingAllToday(true);
    let imported = 0;
    let errors = 0;

    for (const jogo of todayGames) {
      try {
        const data = {
          'Nome': jogo.Nome,
          'Link': jogo.Link,
          'Categoria': jogo.Campeonato || 'Jogos do Dia',
          'Capa': jogo['Logo Casa'] || '',
          'Logo': jogo['Logo Casa'] || '',
          'Data': jogo.Data || jogo['Data Horario'] || '',
          'TimeCasa': jogo['Time Casa'],
          'TimeFora': jogo['Time Fora'],
          'Campeonato': jogo.Campeonato,
          'LogoCasa': jogo['Logo Casa'] || '',
          'LogoFora': jogo['Logo Fora'] || '',
          'Link1': jogo['Link 1'] || '',
          'Link2': jogo['Link 2'] || '',
          'Time Casa': jogo['Time Casa'],
          'Time Fora': jogo['Time Fora'],
          'Logo Casa': jogo['Logo Casa'],
          'Logo Fora': jogo['Logo Fora'],
          'Data Horario': jogo['Data Horario'] || jogo.Data || '',
          'Link 1': jogo['Link 1'] || '',
          'Link 2': jogo['Link 2'] || ''
        };

        const existing = await baserowService.getTableData(targetTableId, 1, 5, jogo.Nome);
        const match = existing.results?.find((r: any) => r.Link === jogo.Link);

        if (match) {
          await baserowService.updateRow(targetTableId, String(match.id), data);
        } else {
          await baserowService.createRow(targetTableId, data);
        }
        imported++;
      } catch (err) {
        errors++;
      }
    }

    setIsImportingAllToday(false);
    if (imported > 0) {
      toast.success(`${imported} jogos de hoje foram importados/atualizados na sua grade!`);
    }
    if (errors > 0) {
      toast.warning(`${errors} jogos falharam ao importar.`);
    }
  };

  const campeonatos = useMemo(() => {
    return Array.from(new Set(
      activeJogos
        .filter(j => !isBlankOrSeparatorRow(j))
        .map(j => j.Campeonato)
        .filter(Boolean)
    )).sort();
  }, [activeJogos]);

  const filteredJogos = useMemo(() => {
    const list = activeJogos.filter(jogo => {
      const isSeparator = isBlankOrSeparatorRow(jogo);

      // Se for um jogo normal, garante que jamais apareça se for do passado
      if (!isSeparator) {
        const dateInfo = analyzeJogoDate(jogo.Data || (jogo as any)['Data'], jogo['Data Horario'] || (jogo as any)['Data Horario']);
        if (dateInfo.isPast) return false;
      }

      // Se estiver pesquisando por termo, esconde separadores a menos que coincida com a busca
      if (searchTerm.trim()) {
        if (isSeparator) return false;
        const term = searchTerm.toLowerCase();
        const matchesSearch = 
          jogo.Nome?.toLowerCase().includes(term) ||
          jogo.Campeonato?.toLowerCase().includes(term) ||
          jogo['Time Casa']?.toLowerCase().includes(term) ||
          jogo['Time Fora']?.toLowerCase().includes(term);
        return matchesSearch;
      }

      // Se filtrou por campeonato específico, esconde separadores que não pertençam ao campeonato
      if (selectedCampeonato !== 'todos') {
        if (isSeparator) return false;
        return jogo.Campeonato === selectedCampeonato;
      }

      // Filtro por Data
      if (selectedDateFilter !== 'todos') {
        if (isSeparator) {
          const rawDate = jogo.Data || (jogo as any)['Data'] || jogo['Data Horario'] || (jogo as any)['Data Horario'];
          if (rawDate) {
            const dateInfo = analyzeJogoDate(rawDate);
            if (dateInfo.isPast) return false;
            if (selectedDateFilter === 'hoje') return dateInfo.isToday;
            if (selectedDateFilter === 'amanha') return dateInfo.isTomorrow;
            if (selectedDateFilter === 'proximos') return dateInfo.isFuture && !dateInfo.isTomorrow;
          }
          // Se for linha em branco sem data e filtramos por uma aba específica, não polui
          return false;
        }

        const dateInfo = analyzeJogoDate(jogo.Data || (jogo as any)['Data'], jogo['Data Horario'] || (jogo as any)['Data Horario']);
        if (dateInfo.isPast) return false;
        if (selectedDateFilter === 'hoje') return dateInfo.isToday;
        if (selectedDateFilter === 'amanha') return dateInfo.isTomorrow;
        if (selectedDateFilter === 'proximos') return dateInfo.isFuture && !dateInfo.isTomorrow;
      }
      
      return true;
    });

    // Higienização de separadores após os filtros
    const cleanList: typeof list = [];
    for (let i = 0; i < list.length; i++) {
      const cur = list[i];
      if (isBlankOrSeparatorRow(cur)) {
        if (cleanList.length === 0 && !(cur.Data || (cur as any)['Data'] || cur['Data Horario'] || (cur as any)['Data Horario'])) {
          continue;
        }
        if (cleanList.length > 0 && isBlankOrSeparatorRow(cleanList[cleanList.length - 1])) {
          continue;
        }
      }
      cleanList.push(cur);
    }
    if (cleanList.length > 0 && isBlankOrSeparatorRow(cleanList[cleanList.length - 1])) {
      cleanList.pop();
    }
    return cleanList;
  }, [activeJogos, searchTerm, selectedCampeonato, selectedDateFilter]);

  if (loadingConfig) {
    return (
      <div className="p-8 space-y-4">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!globalConfig?.isActive) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center p-8">
        <div className="bg-yellow-500/10 p-4 rounded-full mb-4">
          <AlertTriangle className="w-12 h-12 text-yellow-500" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Importação de Jogos Desativada</h2>
        <p className="text-muted-foreground max-w-md">
          A fonte global de Jogos do Dia não está ativa ou configurada. 
          Entre em contato com o administrador.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen pb-20">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-emerald-600/20 via-background to-background border-b border-emerald-500/10 px-6 py-12 lg:px-12">
        <div className="absolute top-0 right-0 -mt-20 -mr-20 w-96 h-96 bg-emerald-500/10 blur-[100px] rounded-full" />
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 max-w-5xl mx-auto"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-emerald-500/20 rounded-lg backdrop-blur-sm border border-emerald-500/20">
              <Trophy className="w-6 h-6 text-emerald-500" />
            </div>
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 uppercase tracking-wider text-[10px] font-bold flex items-center">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse mr-2" />
              Jogos ao Vivo
            </Badge>
          </div>

          <h1 className="text-4xl lg:text-5xl font-black tracking-tight mb-4 bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
            Jogos ao Vivo & Programação
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl">
            Acompanhe a grade esportiva em tempo real. Os jogos de <span className="text-emerald-400 font-semibold">Hoje</span> estão liberados para importação imediata, eventos de datas passadas são automaticamente filtrados e as próximas rodadas ficam disponíveis para consulta.
          </p>
        </motion.div>
      </div>

      <div className="max-w-7xl mx-auto px-6 lg:px-12 -mt-8">
        {/* Status & Logs Summary */}
        <div className="mb-8 grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2 bg-card/40 border-white/5 backdrop-blur-md overflow-hidden">
            <CardContent className="p-0">
              <div className="p-4 flex items-center justify-between border-b border-white/5 bg-emerald-500/5">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-500" />
                  <span className="text-sm font-bold uppercase tracking-wider">Status da Automação</span>
                </div>
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                  {globalConfig?.frequency === 'hourly' ? 'De hora em hora' : 'Diariamente'}
                </Badge>
              </div>
              <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold">Última Importação</p>
                  <p className="text-sm font-medium">{logs[0]?.timestamp ? new Date(logs[0].timestamp).toLocaleString('pt-BR') : 'Nunca'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold">Criados</p>
                  <p className="text-sm font-bold text-emerald-500">{logs[0]?.created || 0}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold">Atualizados</p>
                  <p className="text-sm font-bold text-blue-500">{logs[0]?.updated || 0}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold">Status Final</p>
                  <Badge className={logs[0]?.status === 'success' ? 'bg-emerald-500' : logs[0]?.status === 'error' ? 'bg-red-500' : 'bg-gray-500'}>
                    {logs[0]?.status === 'success' ? 'Sucesso' : logs[0]?.status === 'error' ? 'Erro' : 'Aguardando'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Button 
            variant="outline" 
            className="h-full border-white/5 bg-card/40 hover:bg-white/5 flex flex-col gap-2 p-6"
            onClick={() => setShowLogs(!showLogs)}
          >
            <History className="w-6 h-6 text-emerald-500" />
            <span className="font-bold">Histórico de Logs</span>
            <span className="text-[10px] text-muted-foreground uppercase">Ver detalhes das importações</span>
          </Button>
        </div>

        <AnimatePresence>
          {showLogs && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mb-8"
            >
              <Card className="bg-card/40 border-white/5 backdrop-blur-md">
                <CardContent className="p-4">
                  <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
                    <History className="w-4 h-4 text-emerald-500" />
                    Últimos 10 Logs
                  </h3>
                  <div className="space-y-2">
                    {logs.map(log => (
                      <div key={log.id} className="p-3 rounded-lg bg-white/5 border border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${log.status === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                          <span className="text-xs font-mono">{new Date(log.timestamp).toLocaleString('pt-BR')}</span>
                        </div>
                        <div className="flex items-center gap-4 text-[11px]">
                          <span>Criados: <b className="text-emerald-500">{log.created}</b></span>
                          <span>Atualizados: <b className="text-blue-500">{log.updated}</b></span>
                          {log.message && <span className="text-red-400 italic max-w-xs truncate">{log.message}</span>}
                        </div>
                      </div>
                    ))}
                    {logs.length === 0 && <p className="text-center py-4 text-xs text-muted-foreground">Nenhum log registrado ainda.</p>}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Real-time Import Progress */}
        <AnimatePresence>
          {importProgress && importProgress.status === 'running' && (
            <motion.div
              initial={{ height: 0, opacity: 0, marginBottom: 0 }}
              animate={{ height: 'auto', opacity: 1, marginBottom: 32 }}
              exit={{ height: 0, opacity: 0, marginBottom: 0 }}
              className="overflow-hidden"
            >
              <Card className="bg-emerald-500/10 border-emerald-500/20 backdrop-blur-md">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-500/20 rounded-lg animate-pulse">
                        <RefreshCw className="w-5 h-5 text-emerald-500 animate-spin" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-emerald-500 uppercase tracking-wider">Importação em Andamento</h3>
                        <p className="text-xs text-emerald-500/70">Sincronizando jogos com seu painel...</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-black text-emerald-500">
                        {importProgress.total > 0 ? Math.round((importProgress.current / importProgress.total) * 100) : 0}%
                      </p>
                      <p className="text-[10px] text-emerald-500/60 uppercase font-bold">
                        {importProgress.current} de {importProgress.total} itens
                      </p>
                    </div>
                  </div>

                  <div className="w-full h-3 bg-emerald-500/10 rounded-full overflow-hidden border border-emerald-500/20">
                    <motion.div 
                      className="h-full bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.5)]"
                      initial={{ width: 0 }}
                      animate={{ width: `${importProgress.total > 0 ? (importProgress.current / importProgress.total) * 100 : 0}%` }}
                      transition={{ type: "spring", bounce: 0, duration: 0.5 }}
                    />
                  </div>

                  <div className="mt-4 flex items-center justify-between text-[10px] text-emerald-500/60 uppercase font-bold">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3 h-3" />
                      <span>Tempo restante estimado: {
                        importProgress.current > 0 
                          ? `${Math.ceil(((importProgress.total - importProgress.current) * 2))} segundos`
                          : 'Calculando...'
                      }</span>
                    </div>
                    <span>Não feche esta página</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {importProgress && importProgress.status === 'completed' && (
             <motion.div
              initial={{ height: 0, opacity: 0, marginBottom: 0 }}
              animate={{ height: 'auto', opacity: 1, marginBottom: 32 }}
              exit={{ height: 0, opacity: 0, marginBottom: 0 }}
              className="overflow-hidden"
            >
              <Card className="bg-emerald-500/5 border-emerald-500/10 backdrop-blur-md">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-emerald-500/20 rounded-full">
                      <Check className="w-4 h-4 text-emerald-500" />
                    </div>
                    <span className="text-sm font-bold text-emerald-500">Importação concluída com sucesso!</span>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-emerald-500 hover:bg-emerald-500/10"
                    onClick={() => setImportProgress(null)}
                  >
                    Fechar
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Date Filter Tabs */}
        <div className="mb-6 flex flex-wrap items-center gap-2 p-1.5 bg-card/60 border border-white/5 rounded-2xl backdrop-blur-md">
          <button
            type="button"
            onClick={() => setSelectedDateFilter('todos')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              selectedDateFilter === 'todos'
                ? 'bg-white/10 text-white shadow-lg border border-white/10'
                : 'text-muted-foreground hover:text-white hover:bg-white/5'
            }`}
          >
            <CalendarDays className="w-4 h-4" />
            <span>Todos os Jogos Ativos</span>
            <Badge variant="secondary" className="text-[10px] ml-1 bg-white/10 text-white">
              {dateCounts.todos}
            </Badge>
          </button>

          <button
            type="button"
            onClick={() => setSelectedDateFilter('hoje')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              selectedDateFilter === 'hoje'
                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                : 'text-muted-foreground hover:text-emerald-400 hover:bg-emerald-500/5'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Jogos ao Vivo / Hoje (Liberados)</span>
            <Badge variant="secondary" className="text-[10px] ml-1 bg-emerald-500/20 text-emerald-300">
              {dateCounts.hoje}
            </Badge>
          </button>

          <button
            type="button"
            onClick={() => setSelectedDateFilter('amanha')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              selectedDateFilter === 'amanha'
                ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20'
                : 'text-muted-foreground hover:text-amber-400 hover:bg-amber-500/5'
            }`}
          >
            <Clock className="w-4 h-4 text-amber-400" />
            <span>Amanhã (Programação)</span>
            <Badge variant="secondary" className="text-[10px] ml-1 bg-amber-500/20 text-amber-300">
              {dateCounts.amanha}
            </Badge>
          </button>

          <button
            type="button"
            onClick={() => setSelectedDateFilter('proximos')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              selectedDateFilter === 'proximos'
                ? 'bg-sky-600 text-white shadow-lg shadow-sky-500/20'
                : 'text-muted-foreground hover:text-sky-400 hover:bg-sky-500/5'
            }`}
          >
            <Calendar className="w-4 h-4 text-sky-400" />
            <span>Próximos Dias</span>
            <Badge variant="secondary" className="text-[10px] ml-1 bg-sky-500/20 text-sky-300">
              {dateCounts.proximos}
            </Badge>
          </button>

          {dateCounts.hoje > 0 && (
            <div className="ml-auto flex items-center pr-1">
              <Button
                size="sm"
                onClick={handleImportAllToday}
                disabled={isImportingAllToday || loading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-2 rounded-xl"
              >
                {isImportingAllToday ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                Importar {dateCounts.hoje} Jogos de Hoje
              </Button>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="bg-card/50 backdrop-blur-md border border-white/5 rounded-2xl p-4 shadow-xl flex flex-col md:flex-row gap-4 items-center justify-between mb-8">
          <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto flex-1">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar por time ou campeonato..." 
                className="pl-10 bg-white/5 border-white/10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="relative w-full md:w-64">
              <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10 pointer-events-none" />
              <Select
                value={selectedCampeonato}
                onValueChange={(val) => setSelectedCampeonato(val)}
              >
                <SelectTrigger className="w-full h-10 pl-10 pr-3 bg-white/5 border border-white/10 hover:border-emerald-500/40 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 text-foreground transition-all">
                  <SelectValue placeholder="Todos os Campeonatos" />
                </SelectTrigger>
                <SelectContent className="bg-[#0b101b]/95 border border-white/10 text-white rounded-2xl shadow-2xl backdrop-blur-xl p-1.5 z-50 max-h-72">
                  <SelectItem value="todos" className="rounded-xl text-xs py-2 px-3 focus:bg-emerald-500/20 focus:text-emerald-300 text-white hover:bg-white/5 cursor-pointer font-medium">
                    Todos os Campeonatos
                  </SelectItem>
                  {campeonatos.map(camp => (
                    <SelectItem 
                      key={camp} 
                      value={camp} 
                      className="rounded-xl text-xs py-2 px-3 focus:bg-emerald-500/20 focus:text-emerald-300 text-white/90 hover:bg-white/5 cursor-pointer"
                    >
                      {camp}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2 w-full md:w-auto">
            <Button 
              variant="outline" 
              onClick={fetchJogos} 
              disabled={loading}
              className="flex-1 md:flex-none border-white/10"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Sincronizar
            </Button>
          </div>
        </div>

        {/* Notice Info Box */}
        <div className="mb-6 p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/15 flex items-start gap-3">
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 mt-0.5">
            <Calendar className="w-5 h-5" />
          </div>
          <div className="text-xs space-y-1">
            <p className="font-bold text-foreground">Regra de Liberação Automática por Data</p>
            <p className="text-muted-foreground">
              Apenas os confrontos com data de <strong>Hoje</strong> podem ser adicionados à sua tabela de canais. Os jogos de <strong>Amanhã</strong> e dos <strong>Próximos Dias</strong> ficam visíveis para você planejar a programação e serão desbloqueados automaticamente à meia-noite do dia da partida.
            </p>
          </div>
        </div>

        {/* Grid Content */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Skeleton key={i} className="h-56 rounded-2xl bg-white/5" />
            ))}
          </div>
        ) : filteredJogos.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence mode="popLayout">
              {filteredJogos.map((jogo, index) => {
                if (isBlankOrSeparatorRow(jogo)) {
                  const label = getSeparatorLabel(jogo);
                  return (
                    <motion.div
                      key={jogo.id || `separator-${index}`}
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: index * 0.02 }}
                      className="col-span-1 md:col-span-2 lg:col-span-3 my-3"
                    >
                      <div className="relative flex items-center justify-center">
                        {/* Linha gradiente esquerda */}
                        <div className="flex-grow h-px bg-gradient-to-r from-transparent via-emerald-500/30 to-emerald-500/60" />
                        
                        {/* Pill central */}
                        <div className="relative mx-3 sm:mx-6 px-4 sm:px-6 py-2.5 rounded-2xl bg-card/90 border border-emerald-500/30 backdrop-blur-xl shadow-xl shadow-emerald-500/10 flex items-center gap-3">
                          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                            <Calendar className="w-4 h-4" />
                          </div>
                          <div className="flex flex-col text-left">
                            <span className="text-xs sm:text-sm font-black tracking-wide text-foreground uppercase">
                              {label.title}
                            </span>
                            {label.subtitle && (
                              <span className="text-[10px] text-muted-foreground font-medium">
                                {label.subtitle}
                              </span>
                            )}
                          </div>
                          <div className="hidden sm:flex items-center gap-1.5 ml-2 pl-3 border-l border-white/10 text-[10px] text-emerald-400 font-bold tracking-wider uppercase">
                            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Data dos Eventos</span>
                          </div>
                        </div>

                        {/* Linha gradiente direita */}
                        <div className="flex-grow h-px bg-gradient-to-l from-transparent via-emerald-500/30 to-emerald-500/60" />
                      </div>
                    </motion.div>
                  );
                }

                const dateInfo = analyzeJogoDate(jogo.Data || (jogo as any)['Data'], jogo['Data Horario'] || (jogo as any)['Data Horario']);

                return (
                  <motion.div
                    key={jogo.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ delay: index * 0.04 }}
                  >
                    <Card className={`group relative overflow-hidden bg-card/40 transition-all duration-500 hover:shadow-2xl rounded-2xl ${
                      dateInfo.canImport
                        ? 'border-white/5 hover:border-emerald-500/40 hover:shadow-emerald-500/10'
                        : 'border-amber-500/20 hover:border-amber-500/40 bg-card/30'
                    }`}>
                      <CardContent className="p-0">
                        {/* Match Header */}
                        <div className="p-4 bg-emerald-500/5 flex items-center justify-between border-b border-white/5">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-500/80 truncate pr-2">
                            {jogo.Campeonato || 'Evento'}
                          </span>
                          
                          {/* Date status badge */}
                          {dateInfo.isToday ? (
                            <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              Hoje
                            </Badge>
                          ) : dateInfo.isTomorrow ? (
                            <Badge className="bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px] font-bold flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {dateInfo.displayDate}
                            </Badge>
                          ) : dateInfo.isFuture ? (
                            <Badge className="bg-sky-500/15 text-sky-300 border border-sky-500/30 text-[10px] font-bold flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {dateInfo.displayDate}
                            </Badge>
                          ) : (
                            <Badge className="bg-zinc-500/15 text-zinc-400 border border-zinc-500/30 text-[10px]">
                              {dateInfo.displayDate}
                            </Badge>
                          )}
                        </div>

                        {/* Match Content */}
                        <div className="p-6">
                          <div className="flex items-center justify-between gap-4">
                            {/* Team A */}
                            <div className="flex flex-col items-center gap-3 flex-1">
                              <div className="w-14 h-14 rounded-full bg-white/5 p-2 border border-white/5 flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                                {jogo['Logo Casa'] ? (
                                  <img src={jogo['Logo Casa']} alt={jogo['Time Casa']} className="w-full h-full object-contain" />
                                ) : (
                                  <Users className="w-6 h-6 text-muted-foreground/50" />
                                )}
                              </div>
                              <span className="text-xs font-bold text-center line-clamp-2 min-h-[2rem]">
                                {jogo['Time Casa'] || 'Time A'}
                              </span>
                            </div>

                            <div className="flex flex-col items-center">
                              <div className="text-xl font-black text-white/20 italic tracking-tighter">VS</div>
                              {(jogo['Data Horario'] || jogo.Data) && (
                                <span className="text-[10px] text-muted-foreground mt-1 font-mono">
                                  {jogo['Data Horario'] || jogo.Data}
                                </span>
                              )}
                            </div>

                            {/* Team B */}
                            <div className="flex flex-col items-center gap-3 flex-1">
                              <div className="w-14 h-14 rounded-full bg-white/5 p-2 border border-white/5 flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                                {jogo['Logo Fora'] ? (
                                  <img src={jogo['Logo Fora']} alt={jogo['Time Fora']} className="w-full h-full object-contain" />
                                ) : (
                                  <Users className="w-6 h-6 text-muted-foreground/50" />
                                )}
                              </div>
                              <span className="text-xs font-bold text-center line-clamp-2 min-h-[2rem]">
                                {jogo['Time Fora'] || 'Time B'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="p-4 pt-0">
                          {dateInfo.canImport ? (
                            <Button 
                              className={`w-full rounded-xl font-bold transition-all duration-300 ${
                                jogo.imported 
                                  ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                              }`}
                              onClick={() => handleImport(jogo)}
                              disabled={importingIds.has(jogo.id) || jogo.imported}
                            >
                              {importingIds.has(jogo.id) ? (
                                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                              ) : jogo.imported ? (
                                <Check className="w-4 h-4 mr-2" />
                              ) : (
                                <Plus className="w-4 h-4 mr-2" />
                              )}
                              {jogo.imported ? 'Importado' : 'Importar para Grade'}
                            </Button>
                          ) : (
                            <Button 
                              variant="outline"
                              className="w-full rounded-xl font-medium text-xs bg-amber-500/10 text-amber-300 border border-amber-500/20 hover:bg-amber-500/20 cursor-not-allowed opacity-90"
                              onClick={() => toast.info(`Este jogo está programado para ${dateInfo.displayDate} e só poderá ser importado no dia da partida.`)}
                            >
                              <Lock className="w-3.5 h-3.5 mr-2 text-amber-400" />
                              Disponível no dia ({dateInfo.displayDate})
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        ) : (
          <div className="bg-card/30 border border-white/5 rounded-3xl p-20 text-center">
            <div className="bg-white/5 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Search className="w-8 h-8 text-muted-foreground/30" />
            </div>
            <h3 className="text-xl font-bold mb-2">Nenhum jogo encontrado</h3>
            <p className="text-muted-foreground max-w-sm mx-auto">
              {selectedDateFilter !== 'todos'
                ? `Não há jogos cadastrados na categoria '${selectedDateFilter}'. Tente selecionar 'Todos os Jogos'.`
                : 'Tente ajustar seus termos de busca ou sincronize novamente para buscar novos eventos.'}
            </p>
          </div>
        )}
      </div>
    </div>
    </>
  );
};

export default JogosDia;

