import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, 
  Search, 
  RefreshCw, 
  Filter, 
  Calendar, 
  ChevronRight, 
  Plus, 
  Check, 
  AlertTriangle,
  Info,
  ExternalLink,
  Users,
  Clock,
  Activity,
  ChevronDown,
  History
} from 'lucide-react';
import { useConfig } from '@/contexts/ConfigContext';
import { useGlobalJogosDiaConfig } from '@/hooks/useGlobalJogosDiaConfig';
import { makeProxyRequest } from '@/utils/proxyRequest';
import { useBaserowService } from '@/services/BaserowService';
import { toast } from 'sonner';
import { useSimpleAuth } from '@/contexts/SimpleAuthContext';
import { db } from '@/config/firebase';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface JogoDia {
  id: string;
  Nome: string;
  'Time Casa': string;
  'Logo Casa': string;
  'Time Fora': string;
  'Logo Fora': string;
  'Data Horario': string;
  Link: string;
  Campeonato: string;
  'Link 1'?: string;
  'Link 2'?: string;
  imported?: boolean;
}

const JogosDia = () => {
  const { config } = useConfig();
  const { userInfo } = useSimpleAuth();
  const { globalConfig, loading: loadingConfig } = useGlobalJogosDiaConfig();
  const [jogos, setJogos] = useState<JogoDia[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [importingIds, setImportingIds] = useState<Set<string>>(new Set());
  const baserowService = useBaserowService();
  const [logs, setLogs] = useState<any[]>([]);
  const [showLogs, setShowLogs] = useState(false);

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

  useEffect(() => {
    if (!userInfo?.id) return;

    const q = query(
      collection(db, 'jogosDiaLogs'),
      where('userId', '==', userInfo.id),
      orderBy('timestamp', 'desc'),
      limit(10)
    );

    const unsub = onSnapshot(q, (snap) => {
      setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => unsub();
  }, [userInfo?.id]);

  const handleImport = async (jogo: JogoDia) => {
    if (!config?.tableIds?.canaisTv) {
      toast.error('Tabela de Canais/Jogos não configurada no seu painel');
      return;
    }

    setImportingIds(prev => new Set(prev).add(jogo.id));
    
    try {
      // Mapeamento para o formato da tabela de Canais TV/Jogos do usuário
      // Assumindo campos padrão: Nome, Link, Categoria, Logo (ou similar)
      const data = {
        'Nome': jogo.Nome,
        'Link': jogo.Link,
        'Categoria': jogo.Campeonato || 'Jogos do Dia',
        'Capa': jogo['Logo Casa'] || '', // Usamos o logo do time da casa como capa se necessário
        'Logo': jogo['Logo Casa'] || '',
        'Data': jogo['Data Horario'] || '',
        'TimeCasa': jogo['Time Casa'],
        'TimeFora': jogo['Time Fora'],
        'Campeonato': jogo.Campeonato
      };

      const success = await baserowService.createRow(config.tableIds.canaisTv, data);

      if (success) {
        toast.success(`Jogo ${jogo.Nome} importado com sucesso!`);
        setJogos(prev => prev.map(j => j.id === jogo.id ? { ...j, imported: true } : j));
      } else {
        toast.error('Falha ao importar jogo');
      }
    } catch (error) {
      toast.error('Erro durante a importação');
    } finally {
      setImportingIds(prev => {
        const next = new Set(prev);
        next.delete(jogo.id);
        return next;
      });
    }
  };

  const filteredJogos = jogos.filter(jogo => 
    jogo.Nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    jogo.Campeonato?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    jogo['Time Casa']?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    jogo['Time Fora']?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 uppercase tracking-wider text-[10px] font-bold">
              Sports Central
            </Badge>
          </div>

          <h1 className="text-4xl lg:text-5xl font-black tracking-tight mb-4 bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
            Jogos do Dia
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl">
            Importe os principais eventos esportivos de hoje diretamente para sua grade de canais com apenas um clique.
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

        {/* Controls */}
        <div className="bg-card/50 backdrop-blur-md border border-white/5 rounded-2xl p-4 shadow-xl flex flex-col md:flex-row gap-4 items-center justify-between mb-8">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar por time ou campeonato..." 
              className="pl-10 bg-white/5 border-white/10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
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
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white flex-1 md:flex-none">
              <Filter className="w-4 h-4 mr-2" />
              Filtros
            </Button>
          </div>
        </div>

        {/* Grid Content */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Skeleton key={i} className="h-48 rounded-2xl bg-white/5" />
            ))}
          </div>
        ) : filteredJogos.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence mode="popLayout">
              {filteredJogos.map((jogo, index) => (
                <motion.div
                  key={jogo.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="group relative overflow-hidden bg-card/40 border-white/5 hover:border-emerald-500/30 transition-all duration-500 hover:shadow-2xl hover:shadow-emerald-500/10 rounded-2xl">
                    <CardContent className="p-0">
                      {/* Match Header */}
                      <div className="p-4 bg-emerald-500/5 flex items-center justify-between border-b border-white/5">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-500/80 truncate pr-2">
                          {jogo.Campeonato || 'Evento'}
                        </span>
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          <span className="text-[11px] font-medium">{jogo['Data Horario'] || 'Hoje'}</span>
                        </div>
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
                          {jogo.imported ? 'Importado' : 'Importar'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="bg-card/30 border border-white/5 rounded-3xl p-20 text-center">
            <div className="bg-white/5 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Search className="w-8 h-8 text-muted-foreground/30" />
            </div>
            <h3 className="text-xl font-bold mb-2">Nenhum jogo encontrado</h3>
            <p className="text-muted-foreground max-w-sm mx-auto">
              Tente ajustar seus termos de busca ou sincronize novamente para buscar novos eventos.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default JogosDia;
