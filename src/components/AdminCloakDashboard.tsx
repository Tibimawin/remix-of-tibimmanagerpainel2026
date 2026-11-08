import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { auth } from '@/config/firebase';
import { toast } from 'sonner';
import {
  Loader2, RefreshCw, Link2, ShieldAlert, ShieldCheck, Clock,
  Download, HardDrive, Users, Activity, TrendingUp,
} from 'lucide-react';
import DataErrorFallback from '@/components/DataErrorFallback';

interface DashboardData {
  days: number;
  links: { total: number; active: number; inactive: number };
  access: {
    total: number; ok: number; blocked: number; expired: number; userBlocked: number;
    featureDenied: number; invalidToken: number; notFound: number; upstreamErrors: number;
    bytes: number;
    byStatus: { status: string; count: number }[];
    blockedByDay: { day: string; count: number }[];
  };
  imports: {
    bySource: { source: string; total: number; active: number; accesses: number; bytes: number }[];
    byKind: { kind: string; count: number }[];
    byDay: { day: string; count: number }[];
    inPeriod: number;
  };
  users: { total: number; expired: number; blocked: number; active: number };
  topContent: {
    short_id: string; content_name: string | null; source: string;
    accesses: number; bytes: number; active: boolean;
  }[];
}

const formatBytes = (bytes: number) => {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
};

const STATUS_LABELS: Record<string, string> = {
  ok: 'Liberado',
  expired: 'Assinatura expirada',
  blocked: 'Usuário bloqueado',
  feature_denied: 'Sem permissão no plano',
  invalid_token: 'Token inválido',
  not_found: 'Link inexistente',
  forbidden: 'Acesso negado',
};

const SOURCE_LABELS: Record<string, string> = {
  miniseries: 'Minisséries',
  'importar-canais-tv': 'Canais de TV',
  'canais-tv': 'Canais de TV',
  padrao: 'Importação Automática',
};

const DAY_OPTIONS = [7, 30, 90];

const MiniBarChart: React.FC<{ data: { day: string; count: number }[]; color: string }> = ({ data, color }) => {
  const max = Math.max(1, ...data.map((d) => d.count));
  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground">Sem dados no período.</p>;
  }
  return (
    <div className="flex items-end gap-1 h-32 overflow-x-auto">
      {data.map((d) => (
        <div key={d.day} className="flex flex-col items-center gap-1 min-w-[14px] flex-1" title={`${d.day}: ${d.count}`}>
          <span className="text-[10px] text-muted-foreground">{d.count || ''}</span>
          <div
            className={`w-full rounded-t ${color}`}
            style={{ height: `${Math.max(4, (d.count / max) * 90)}px` }}
          />
          <span className="text-[9px] text-muted-foreground rotate-45 origin-left whitespace-nowrap">
            {d.day.slice(5)}
          </span>
        </div>
      ))}
    </div>
  );
};

const AdminCloakDashboard: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(30);

  const load = useCallback(async (period: number) => {
    setLoading(true);
    setError(null);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) throw new Error('Sessão administrativa expirada. Faça login novamente.');
      const { data: res, error: fnError } = await supabase.functions.invoke('cloak', {
        body: { action: 'admin-dashboard', idToken, days: period },
      });
      if (fnError) throw fnError;
      if ((res as any)?.error) throw new Error((res as any).error);
      setData(res as DashboardData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar o dashboard.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(days); }, [load, days]);

  const blockRate = useMemo(() => {
    if (!data || data.access.total === 0) return 0;
    return Math.round((data.access.blocked / data.access.total) * 100);
  }, [data]);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin mr-2" /> Carregando dashboard...
      </div>
    );
  }

  if (error && !data) {
    return (
      <DataErrorFallback
        title="Não foi possível carregar o dashboard"
        message={error}
        onRetry={() => load(days)}
      />
    );
  }

  if (!data) return null;

  const cards = [
    { label: 'Links camuflados ativos', value: data.links.active, sub: `${data.links.total} no total`, icon: Link2, tone: 'text-emerald-500' },
    { label: 'Links desativados', value: data.links.inactive, sub: 'Fora do ar', icon: ShieldAlert, tone: 'text-amber-500' },
    { label: 'Bloqueios por expiração', value: data.access.expired, sub: `Últimos ${data.days} dias`, icon: Clock, tone: 'text-red-500' },
    { label: 'Acessos liberados', value: data.access.ok, sub: formatBytes(data.access.bytes), icon: ShieldCheck, tone: 'text-sky-500' },
    { label: 'Itens importados', value: data.imports.inPeriod, sub: `No período (${data.days}d)`, icon: Download, tone: 'text-violet-500' },
    { label: 'Usuários com acesso', value: data.users.active, sub: `${data.users.expired} expirados · ${data.users.blocked} bloqueados`, icon: Users, tone: 'text-cyan-500' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-foreground">📊 Camuflagem & Importações</h2>
          <p className="text-sm text-muted-foreground">
            Saúde dos links protegidos, bloqueios por expiração e volume de importações.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {DAY_OPTIONS.map((d) => (
            <Button
              key={d}
              size="sm"
              variant={days === d ? 'default' : 'outline'}
              onClick={() => setDays(d)}
            >
              {d}d
            </Button>
          ))}
          <Button size="sm" variant="outline" onClick={() => load(days)} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{c.label}</span>
                <c.icon className={`h-4 w-4 ${c.tone}`} />
              </div>
              <p className="text-2xl font-bold text-foreground mt-2">{c.value.toLocaleString('pt-BR')}</p>
              <p className="text-[11px] text-muted-foreground mt-1">{c.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-red-500" /> Bloqueios por motivo
            </CardTitle>
            <CardDescription>
              {data.access.blocked.toLocaleString('pt-BR')} de {data.access.total.toLocaleString('pt-BR')} acessos bloqueados ({blockRate}%)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Progress value={blockRate} className="h-2" />
            {data.access.byStatus.filter((s) => s.status !== 'ok').length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhum bloqueio registrado no período. 🎉</p>
            )}
            {data.access.byStatus.filter((s) => s.status !== 'ok').map((s) => (
              <div key={s.status} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{STATUS_LABELS[s.status] || s.status}</span>
                <Badge variant="outline">{s.count.toLocaleString('pt-BR')}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Download className="h-4 w-4 text-violet-500" /> Importações por origem
            </CardTitle>
            <CardDescription>Links protegidos criados por cada funcionalidade</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.imports.bySource.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhuma importação registrada.</p>
            )}
            {data.imports.bySource.map((s) => (
              <div key={s.source} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-foreground">{SOURCE_LABELS[s.source] || s.source}</span>
                  <span className="text-muted-foreground">
                    {s.total.toLocaleString('pt-BR')} links · {s.active} ativos
                  </span>
                </div>
                <Progress
                  value={s.total ? (s.active / s.total) * 100 : 0}
                  className="h-1.5"
                />
                <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1"><Activity className="h-3 w-3" />{s.accesses.toLocaleString('pt-BR')} acessos</span>
                  <span className="flex items-center gap-1"><HardDrive className="h-3 w-3" />{formatBytes(s.bytes)}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-violet-500" /> Importações por dia
            </CardTitle>
          </CardHeader>
          <CardContent>
            <MiniBarChart data={data.imports.byDay} color="bg-violet-500" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-red-500" /> Bloqueios por dia
            </CardTitle>
          </CardHeader>
          <CardContent>
            <MiniBarChart data={data.access.blockedByDay} color="bg-red-500" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">🔥 Conteúdos mais acessados</CardTitle>
          <CardDescription>Top 10 links camuflados por número de acessos</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Conteúdo</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead className="text-right">Acessos</TableHead>
                <TableHead className="text-right">Tráfego</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.topContent.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Nenhum link registrado ainda.
                  </TableCell>
                </TableRow>
              )}
              {data.topContent.map((c) => (
                <TableRow key={c.short_id}>
                  <TableCell className="max-w-[240px] truncate">{c.content_name || c.short_id}</TableCell>
                  <TableCell>{SOURCE_LABELS[c.source] || c.source}</TableCell>
                  <TableCell className="text-right">{c.accesses.toLocaleString('pt-BR')}</TableCell>
                  <TableCell className="text-right">{formatBytes(c.bytes)}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant={c.active ? 'default' : 'secondary'}>
                      {c.active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminCloakDashboard;
