import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ReferralService, Referral } from '@/services/ReferralService';
import { FirebaseUserService } from '@/services/FirebaseUserService';
import { TrendingUp } from 'lucide-react';
import { toast } from 'sonner';

export const AdminReferrals: React.FC = () => {
  const [items, setItems] = useState<(Referral & { daysInPanel?: number })[]>([]);
  const [filtered, setFiltered] = useState<(Referral & { daysInPanel?: number })[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const all = await ReferralService.getAllReferrals();
      const enriched = await Promise.all(
        all.map(async r => {
          const referred = await FirebaseUserService.getUserById(r.referredUid);
          let days = 0;
          if (referred?.startDate) {
            const start = new Date(referred.startDate).getTime();
            const now = Date.now();
            days = Math.max(0, Math.floor((now - start) / (1000 * 60 * 60 * 24)));
          }
          return { ...r, daysInPanel: days };
        })
      );
      setItems(enriched);
      setFiltered(enriched);
    } finally {
      setLoading(false);
    }
  };

  const handleActivate = async (uid: string) => {
    try {
      await FirebaseUserService.extendUserAccess(uid, 30);
      await load();
      toast.success('Assinatura ativada');
    } catch {
      toast.error('Falha ao ativar');
    }
  };

  const handleDeactivate = async (uid: string) => {
    try {
      await FirebaseUserService.deactivateUser(uid);
      await load();
      toast.success('Assinatura desativada');
    } catch {
      toast.error('Falha ao desativar');
    }
  };

  useEffect(() => {
    const s = search.toLowerCase();
    const f = items.filter(r => {
      const a = `${r.referrerEmail || ''} ${r.referredEmail || ''} ${r.referrerUid} ${r.referredUid}`.toLowerCase();
      return a.includes(s);
    });
    setFiltered(f);
  }, [search, items]);

  const stats = {
    total: items.length,
    subscribed: items.filter(r => r.subscriptionActive).length,
    registered: items.filter(r => r.status === 'registered').length
  };

  return (
    <div className="space-y-6">
      <Card className="modern-card bg-gradient-to-br from-card to-card/80 border-border/40">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Monitor de Indicações
          </CardTitle>
          <CardDescription className="text-muted-foreground">Acompanhe quem indicou, quem foi indicado e o status da assinatura</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl border border-border/40 bg-muted/10">
              <div className="text-xs text-muted-foreground">Total</div>
              <div className="text-2xl font-bold text-foreground">{stats.total}</div>
            </div>
            <div className="p-4 rounded-xl border border-border/40 bg-muted/10">
              <div className="text-xs text-muted-foreground">Assinando</div>
              <div className="text-2xl font-bold text-foreground">{stats.subscribed}</div>
            </div>
            <div className="p-4 rounded-xl border border-border/40 bg-muted/10">
              <div className="text-xs text-muted-foreground">Registrados</div>
              <div className="text-2xl font-bold text-foreground">{stats.registered}</div>
            </div>
            <div className="p-4 rounded-xl border border-border/40 bg-muted/10">
              <Input placeholder="Pesquisar" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="modern-card bg-gradient-to-br from-card to-card/80 border-border/40">
        <CardHeader>
          <CardTitle className="text-foreground">Indicações</CardTitle>
          <CardDescription className="text-muted-foreground">Detalhamento completo</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/40">
                    <TableHead className="text-muted-foreground">Quem indicou</TableHead>
                    <TableHead className="text-muted-foreground">Indicado</TableHead>
                    <TableHead className="text-muted-foreground">Status</TableHead>
                    <TableHead className="text-muted-foreground">Assinatura</TableHead>
                    <TableHead className="text-muted-foreground">Dias no painel</TableHead>
                    <TableHead className="text-muted-foreground">Criado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(r => (
                    <TableRow key={r.id} className="border-border/40">
                      <TableCell className="text-foreground">
                        <div className="text-sm">{r.referrerEmail || r.referrerUid}</div>
                        <div className="text-xs text-muted-foreground">{r.referrerUid}</div>
                      </TableCell>
                      <TableCell className="text-foreground">
                        <div className="text-sm">{r.referredEmail || r.referredUid}</div>
                        <div className="text-xs text-muted-foreground">{r.referredUid}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={r.status === 'subscribed' ? 'default' : 'secondary'}>{r.status}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge variant={r.subscriptionActive ? 'default' : 'destructive'}>{r.subscriptionActive ? 'Ativa' : 'Inativa'}</Badge>
                          {!r.subscriptionActive ? (
                            <Button size="sm" onClick={() => handleActivate(r.referredUid)}>Ativar</Button>
                          ) : (
                            <Button size="sm" variant="outline" onClick={() => handleDeactivate(r.referredUid)}>Desativar</Button>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{r.daysInPanel ?? 0}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">{new Date(r.createdAt).toLocaleString('pt-BR')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};