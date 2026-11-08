import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { auth } from '@/config/firebase';
import { getCloakBaseUrl } from '@/services/CloakService';
import { toast } from 'sonner';
import {
  Link2, Users, Activity, Loader2, RefreshCw, Ban, CheckCircle2,
  Search, Copy, ShieldCheck, HardDrive,
} from 'lucide-react';

interface Overview {
  totalLinks: number;
  activeLinks: number;
  totalUsers: number;
  accesses7d: number;
  accessesToday: number;
  bytes7d: number;
  blocked7d: number;
  byDay: { day: string; count: number }[];
}

interface CloakUser {
  firebase_uid: string;
  email: string | null;
  name: string | null;
  public_token: string;
  expires_at: string | null;
  blocked: boolean;
  last_seen_at: string | null;
  stats: { links: number; accesses: number; bytes: number; last: string | null };
}

interface CloakLink {
  short_id: string;
  owner_uid: string;
  original_url: string;
  content_name: string | null;
  kind: string;
  active: boolean;
  access_count: number;
  bytes_served: number;
  last_access_at: string | null;
  created_at: string;
}

interface CloakLog {
  id: string;
  link_short_id: string | null;
  owner_uid: string | null;
  status: string;
  ip: string | null;
  bytes_served: number;
  created_at: string;
}

const formatBytes = (bytes: number) => {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
};

const AdminCloakLinks: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [users, setUsers] = useState<CloakUser[]>([]);
  const [links, setLinks] = useState<CloakLink[]>([]);
  const [logs, setLogs] = useState<CloakLog[]>([]);
  const [search, setSearch] = useState('');

  const call = useCallback(async (action: string, payload: Record<string, unknown> = {}) => {
    const idToken = await auth.currentUser?.getIdToken();
    if (!idToken) throw new Error('Sessão administrativa expirada. Faça login novamente.');
    const { data, error } = await supabase.functions.invoke('cloak', {
      body: { action, idToken, ...payload },
    });
    if (error) throw error;
    if ((data as any)?.error) throw new Error((data as any).error);
    return data as any;
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [ov, us, lk, lg] = await Promise.all([
        call('admin-overview'),
        call('admin-users'),
        call('admin-links', { search }),
        call('admin-logs'),
      ]);
      setOverview(ov);
      setUsers(us.users || []);
      setLinks(lk.links || []);
      setLogs(lg.logs || []);
    } catch (err) {
      toast.error('Erro ao carregar dados', { description: String((err as Error).message || err) });
    } finally {
      setLoading(false);
    }
  }, [call, search]);

  useEffect(() => { loadAll(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const userMap = useMemo(() => {
    const m: Record<string, CloakUser> = {};
    users.forEach(u => { m[u.firebase_uid] = u; });
    return m;
  }, [users]);

  const toggleUser = async (u: CloakUser) => {
    try {
      await call('admin-toggle-user', { firebase_uid: u.firebase_uid, blocked: !u.blocked });
      toast.success(u.blocked ? 'Usuário liberado' : 'Usuário bloqueado');
      loadAll();
    } catch (err) {
      toast.error('Falha ao atualizar usuário');
    }
  };

  const rotateToken = async (u: CloakUser) => {
    try {
      await call('admin-rotate-token', { firebase_uid: u.firebase_uid });
      toast.success('Token renovado — os links antigos deixam de funcionar');
      loadAll();
    } catch {
      toast.error('Falha ao renovar token');
    }
  };

  const toggleLink = async (l: CloakLink) => {
    try {
      await call('admin-toggle-link', { short_id: l.short_id, active: !l.active });
      loadAll();
    } catch {
      toast.error('Falha ao atualizar link');
    }
  };

  const isExpired = (date: string | null) => !!date && new Date(date) < new Date();

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado!');
  };

  const stats = [
    { label: 'Links camuflados', value: overview?.totalLinks ?? 0, sub: `${overview?.activeLinks ?? 0} ativos`, icon: Link2 },
    { label: 'Usuários com proteção', value: overview?.totalUsers ?? 0, sub: 'contas sincronizadas', icon: Users },
    { label: 'Acessos (7 dias)', value: overview?.accesses7d ?? 0, sub: `${overview?.accessesToday ?? 0} hoje`, icon: Activity },
    { label: 'Tráfego (7 dias)', value: formatBytes(overview?.bytes7d ?? 0), sub: `${overview?.blocked7d ?? 0} bloqueios`, icon: HardDrive },
  ];

  const maxDay = Math.max(1, ...(overview?.byDay || []).map(d => d.count));

  return (
    <div className="space-y-6">
      <Card className="modern-card bg-gradient-to-br from-card to-card/80 border-border/40">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <CardTitle className="text-foreground flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-primary" />
                Links Camuflados (Minisséries)
              </CardTitle>
              <CardDescription>
                Os usuários importam com links do seu domínio. Eles param de funcionar quando a assinatura vence e voltam ao renovar.
              </CardDescription>
            </div>
            <Button variant="outline" onClick={loadAll} disabled={loading} className="gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Atualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map(s => (
              <div key={s.label} className="rounded-xl border border-border/40 bg-muted/20 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-wide text-muted-foreground">{s.label}</span>
                  <s.icon className="w-4 h-4 text-primary" />
                </div>
                <p className="text-2xl font-semibold text-foreground mt-2">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.sub}</p>
              </div>
            ))}
          </div>

          {(overview?.byDay?.length ?? 0) > 0 && (
            <div className="rounded-xl border border-border/40 p-4">
              <p className="text-sm font-medium text-foreground mb-3">Acessos por dia (7 dias)</p>
              <div className="flex items-end gap-2 h-28">
                {overview!.byDay.map(d => (
                  <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full rounded-t bg-primary/70"
                      style={{ height: `${Math.max(4, (d.count / maxDay) * 100)}%` }}
                      title={`${d.count} acessos`}
                    />
                    <span className="text-[10px] text-muted-foreground">{d.day.slice(5)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Tabs defaultValue="users">
            <TabsList>
              <TabsTrigger value="users">Usuários</TabsTrigger>
              <TabsTrigger value="links">Links</TabsTrigger>
              <TabsTrigger value="logs">Acessos</TabsTrigger>
            </TabsList>

            <TabsContent value="users" className="pt-4">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/40">
                    <TableHead>Usuário</TableHead>
                    <TableHead>Expira em</TableHead>
                    <TableHead>Links</TableHead>
                    <TableHead>Acessos</TableHead>
                    <TableHead>Tráfego</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map(u => (
                    <TableRow key={u.firebase_uid} className="border-border/40">
                      <TableCell>
                        <div className="text-foreground font-medium">{u.name || '—'}</div>
                        <div className="text-xs text-muted-foreground">{u.email}</div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {u.expires_at ? new Date(u.expires_at).toLocaleString('pt-BR') : 'Sem data'}
                      </TableCell>
                      <TableCell>{u.stats.links}</TableCell>
                      <TableCell>{u.stats.accesses}</TableCell>
                      <TableCell>{formatBytes(u.stats.bytes)}</TableCell>
                      <TableCell>
                        {u.blocked ? (
                          <Badge variant="destructive">Bloqueado</Badge>
                        ) : isExpired(u.expires_at) ? (
                          <Badge variant="destructive">Expirado</Badge>
                        ) : (
                          <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Ativo</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" title="Copiar base do link"
                            onClick={() => copy(`${getCloakBaseUrl()}/api/s/${u.public_token}/`)}>
                            <Copy className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" title="Renovar token" onClick={() => rotateToken(u)}>
                            <RefreshCw className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" title={u.blocked ? 'Liberar' : 'Bloquear'}
                            onClick={() => toggleUser(u)}>
                            {u.blocked ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Ban className="w-4 h-4 text-destructive" />}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {users.length === 0 && !loading && (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhum usuário com links protegidos ainda</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="links" className="pt-4 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  className="pl-10"
                  placeholder="Buscar por nome do conteúdo ou URL original..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && loadAll()}
                />
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="border-border/40">
                    <TableHead>Conteúdo</TableHead>
                    <TableHead>Dono</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Acessos</TableHead>
                    <TableHead>Tráfego</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {links.map(l => (
                    <TableRow key={l.short_id} className="border-border/40">
                      <TableCell>
                        <div className="text-foreground font-medium max-w-[220px] truncate">{l.content_name || l.short_id}</div>
                        <div className="text-xs text-muted-foreground max-w-[220px] truncate">{l.original_url}</div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {userMap[l.owner_uid]?.email || l.owner_uid}
                      </TableCell>
                      <TableCell><Badge variant="outline">{l.kind}</Badge></TableCell>
                      <TableCell>{l.access_count}</TableCell>
                      <TableCell>{formatBytes(l.bytes_served)}</TableCell>
                      <TableCell>
                        {l.active
                          ? <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Ativo</Badge>
                          : <Badge variant="destructive">Desativado</Badge>}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" title="Copiar link protegido"
                            onClick={() => copy(`${getCloakBaseUrl()}/api/s/${userMap[l.owner_uid]?.public_token || ''}/${l.short_id}`)}>
                            <Copy className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" title={l.active ? 'Desativar' : 'Ativar'} onClick={() => toggleLink(l)}>
                            {l.active ? <Ban className="w-4 h-4 text-destructive" /> : <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {links.length === 0 && !loading && (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhum link camuflado encontrado</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="logs" className="pt-4">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/40">
                    <TableHead>Data</TableHead>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Link</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>IP</TableHead>
                    <TableHead>Tráfego</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map(log => (
                    <TableRow key={log.id} className="border-border/40">
                      <TableCell className="text-sm text-muted-foreground">{new Date(log.created_at).toLocaleString('pt-BR')}</TableCell>
                      <TableCell className="text-xs">{log.owner_uid ? (userMap[log.owner_uid]?.email || log.owner_uid) : '—'}</TableCell>
                      <TableCell className="text-xs font-mono">{log.link_short_id || '—'}</TableCell>
                      <TableCell>
                        {log.status === 'ok'
                          ? <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">ok</Badge>
                          : <Badge variant="destructive">{log.status}</Badge>}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{log.ip || '—'}</TableCell>
                      <TableCell className="text-xs">{formatBytes(log.bytes_served)}</TableCell>
                    </TableRow>
                  ))}
                  {logs.length === 0 && !loading && (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhum acesso registrado</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminCloakLinks;
