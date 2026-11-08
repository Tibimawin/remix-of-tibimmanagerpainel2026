import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import {
  ShieldCheck, Wifi, WifiOff, RefreshCw, Search, Globe,
  ListChecks, Download, Clock, Info
} from 'lucide-react';
import { cn } from '@/lib/utils';

const DNS_STORAGE_KEY = 'tibim_xtream_dns_host';
const CREDS_STORAGE_KEY = 'verificar-links:creds';
const DNS_PADRAO = 'https://api.tibimmanagerpainel.shop';

type TipoCheck = 'live' | 'movie' | 'series';

interface ResultadoLink {
  id: number | string;
  nome: string;
  categoria: string;
  link: string;
  status: 'ok' | 'off';
  http: number;
}

interface RespostaCheck {
  tipo: string;
  total: number;
  online: number;
  offline: number;
  cached?: boolean;
  resultados: ResultadoLink[];
}

const TIPOS: { id: TipoCheck; label: string; descricao: string }[] = [
  { id: 'live', label: 'Canais', descricao: 'Canais de TV ao vivo' },
  { id: 'movie', label: 'Filmes', descricao: 'Filmes (VOD)' },
  { id: 'series', label: 'Séries', descricao: 'Episódios de séries' },
];

const normalizarHost = (raw: string): string => {
  let host = (raw || '').trim().replace(/\/+$/, '');
  if (!host) return DNS_PADRAO;
  if (!/^https?:\/\//i.test(host)) host = `https://${host}`;
  return host;
};

const VerificarLinks = () => {
  const [tipo, setTipo] = useState<TipoCheck>('live');
  const [dnsHost, setDnsHost] = useState(() => {
    try { return localStorage.getItem(DNS_STORAGE_KEY) || DNS_PADRAO; } catch { return DNS_PADRAO; }
  });
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [verificando, setVerificando] = useState(false);
  const [segundos, setSegundos] = useState(0);
  const [resposta, setResposta] = useState<RespostaCheck | null>(null);
  const [filtro, setFiltro] = useState<'todos' | 'ok' | 'off'>('todos');
  const [busca, setBusca] = useState('');

  // Restaura credenciais salvas
  useEffect(() => {
    try {
      const raw = localStorage.getItem(CREDS_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (typeof parsed?.usuario === 'string') setUsuario(parsed.usuario);
      if (typeof parsed?.senha === 'string') setSenha(parsed.senha);
    } catch { /* ignora */ }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(CREDS_STORAGE_KEY, JSON.stringify({ usuario, senha }));
    } catch { /* ignora */ }
  }, [usuario, senha]);

  // Cronômetro durante a verificação
  useEffect(() => {
    if (!verificando) return;
    const inicio = Date.now();
    const t = window.setInterval(() => setSegundos(Math.floor((Date.now() - inicio) / 1000)), 1000);
    return () => window.clearInterval(t);
  }, [verificando]);

  const resultadosFiltrados = useMemo(() => {
    if (!resposta) return [];
    const termo = busca.trim().toLowerCase();
    return resposta.resultados.filter((r) => {
      if (filtro !== 'todos' && r.status !== filtro) return false;
      if (termo && !`${r.nome} ${r.categoria}`.toLowerCase().includes(termo)) return false;
      return true;
    });
  }, [resposta, filtro, busca]);

  const verificar = async () => {
    const user = usuario.trim();
    const pass = senha.trim();
    if (!user || !pass) {
      toast.error('Informe o usuário e a senha do acesso Xtream (DNS).');
      return;
    }
    const base = normalizarHost(dnsHost);
    const limit = tipo === 'live' ? '' : '&limit=500';
    const url = `${base}/stream-check?username=${encodeURIComponent(user)}&password=${encodeURIComponent(pass)}&type=${tipo}${limit}`;

    setVerificando(true);
    setSegundos(0);
    setResposta(null);
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 10 * 60 * 1000);
    try {
      const resp = await fetch(url, { signal: controller.signal });
      const data = await resp.json();
      if (!resp.ok) {
        toast.error(data?.error || 'Não foi possível verificar os links.');
        return;
      }
      setResposta(data);
      setFiltro(data.offline > 0 ? 'off' : 'todos');
      toast.success(
        `${data.total} links verificados: ${data.online} online, ${data.offline} offline${data.cached ? ' (em cache)' : ''}`
      );
    } catch (e: any) {
      if (e?.name === 'AbortError') toast.error('A verificação demorou demais e foi cancelada.');
      else toast.error('Falha de conexão com a API. Confirme o endereço da DNS.');
    } finally {
      window.clearTimeout(timer);
      setVerificando(false);
    }
  };

  const baixarCsv = () => {
    if (!resposta) return;
    const linhas = ['Nome;Categoria;Status;Link'];
    resposta.resultados.forEach((r) => {
      linhas.push(`${r.nome};${r.categoria};${r.status === 'ok' ? 'Online' : 'Offline'};${r.link}`);
    });
    const blob = new Blob(['\ufeff' + linhas.join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `verificacao-${tipo}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const tipoAtual = TIPOS.find((t) => t.id === tipo)!;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl shadow-lg">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Verificar Links</h1>
            <p className="text-sm text-muted-foreground">
              Testa todos os links de stream da sua conta e mostra quais estão online ou offline
            </p>
          </div>
        </div>
      </div>

      {/* Formulário */}
      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="flex flex-wrap gap-2">
            {TIPOS.map((t) => (
              <Button
                key={t.id}
                variant={tipo === t.id ? 'default' : 'outline'}
                size="sm"
                className="rounded-full"
                onClick={() => { setTipo(t.id); setResposta(null); }}
                disabled={verificando}
              >
                {t.label}
              </Button>
            ))}
            <span className="text-xs text-muted-foreground self-center ml-1">{tipoAtual.descricao}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Endereço da DNS</label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={dnsHost}
                  onChange={(e) => setDnsHost(e.target.value)}
                  className="pl-9 bg-background/50"
                  placeholder={DNS_PADRAO}
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Usuário Xtream</label>
              <Input
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                placeholder="ex: toni_king"
                className="bg-background/50"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Senha</label>
              <Input
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="senha do usuário"
                className="bg-background/50"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={verificar}
              disabled={verificando}
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white"
            >
              {verificando ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Verificando... {segundos}s
                </>
              ) : (
                <>
                  <ListChecks className="w-4 h-4 mr-2" />
                  Verificar agora
                </>
              )}
            </Button>
            <div className="flex items-start gap-2 text-xs text-muted-foreground max-w-xl">
              <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>
                Use qualquer usuário e senha ativos da sua lista (DNS). Para Filmes e Séries são testados
                os primeiros 500 links por vez. A verificação roda no seu servidor e pode levar 1–3 minutos.
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resumo */}
      {resposta && (
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10"><ListChecks className="w-5 h-5 text-blue-500" /></div>
              <div>
                <p className="text-2xl font-bold">{resposta.total}</p>
                <p className="text-xs text-muted-foreground">Links testados</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10"><Wifi className="w-5 h-5 text-green-500" /></div>
              <div>
                <p className="text-2xl font-bold text-green-500">{resposta.online}</p>
                <p className="text-xs text-muted-foreground">Online</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/10"><WifiOff className="w-5 h-5 text-red-500" /></div>
              <div>
                <p className="text-2xl font-bold text-red-500">{resposta.offline}</p>
                <p className="text-xs text-muted-foreground">Offline</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Resultados */}
      {resposta && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou categoria..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="pl-9 bg-background/50"
                />
              </div>
              <Button
                size="sm"
                variant={filtro === 'todos' ? 'default' : 'outline'}
                onClick={() => setFiltro('todos')}
              >
                Todos ({resposta.total})
              </Button>
              <Button
                size="sm"
                variant={filtro === 'ok' ? 'default' : 'outline'}
                onClick={() => setFiltro('ok')}
                className={filtro === 'ok' ? 'bg-green-600 hover:bg-green-700 text-white' : ''}
              >
                <Wifi className="w-3.5 h-3.5 mr-1" /> Online ({resposta.online})
              </Button>
              <Button
                size="sm"
                variant={filtro === 'off' ? 'default' : 'outline'}
                onClick={() => setFiltro('off')}
                className={filtro === 'off' ? 'bg-red-600 hover:bg-red-700 text-white' : ''}
              >
                <WifiOff className="w-3.5 h-3.5 mr-1" /> Offline ({resposta.offline})
              </Button>
              <Button size="sm" variant="outline" onClick={baixarCsv}>
                <Download className="w-3.5 h-3.5 mr-1" /> CSV
              </Button>
            </div>

            <ScrollArea className="h-[480px] rounded-lg border">
              <div className="divide-y">
                {resultadosFiltrados.length === 0 ? (
                  <div className="py-16 text-center text-sm text-muted-foreground">
                    Nenhum resultado para este filtro.
                  </div>
                ) : (
                  resultadosFiltrados.map((r) => (
                    <div key={`${r.id}-${r.link}`} className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/40">
                      <Badge
                        className={cn(
                          'gap-1 border text-[10px] px-1.5 py-0 shrink-0',
                          r.status === 'ok'
                            ? 'bg-green-500/15 text-green-500 border-green-500/30'
                            : 'bg-red-500/15 text-red-500 border-red-500/30'
                        )}
                      >
                        {r.status === 'ok' ? <Wifi className="w-2.5 h-2.5" /> : <WifiOff className="w-2.5 h-2.5" />}
                        {r.status === 'ok' ? 'Online' : 'Offline'}
                      </Badge>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate" title={r.nome}>{r.nome}</p>
                        {r.categoria && (
                          <p className="text-[11px] text-muted-foreground truncate">{r.categoria}</p>
                        )}
                        <p className="text-[10px] text-muted-foreground truncate opacity-70" title={r.link}>{r.link}</p>
                      </div>
                      <span className="text-[10px] text-muted-foreground shrink-0 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {r.http === 0 ? 'sem resposta' : `HTTP ${r.http}`}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default VerificarLinks;
