import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { ReferralService, Referral } from '@/services/ReferralService';
import { WithdrawalService, WithdrawalRequest } from '@/services/WithdrawalService';
import { FirebaseUserService } from '@/services/FirebaseUserService';
import { TrendingUp, Wallet, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';

export const AdminReferrals: React.FC = () => {
  const [items, setItems] = useState<(Referral & { daysInPanel?: number })[]>([]);
  const [filtered, setFiltered] = useState<(Referral & { daysInPanel?: number })[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [all, wds] = await Promise.all([
        ReferralService.getAllReferrals(),
        WithdrawalService.getAllRequests()
      ]);
      const enriched = await Promise.all(
        all.map(async r => {
          const referred = await FirebaseUserService.getUserById(r.referredUid);
          let days = 0;
          if (referred?.startDate) {
            days = Math.max(0, Math.floor((Date.now() - new Date(referred.startDate).getTime()) / (1000 * 60 * 60 * 24)));
          }
          return { ...r, daysInPanel: days };
        })
      );
      setItems(enriched);
      setFiltered(enriched);
      setWithdrawals(wds);
    } finally {
      setLoading(false);
    }
  };

  const handleActivate = async (uid: string) => {
    try {
      await FirebaseUserService.extendUserAccess(uid, 30);
      await load();
      toast.success('Assinatura ativada');
    } catch { toast.error('Falha ao ativar'); }
  };

  const handleDeactivate = async (uid: string) => {
    try {
      await FirebaseUserService.deactivateUser(uid);
      await load();
      toast.success('Assinatura desativada');
    } catch { toast.error('Falha ao desativar'); }
  };

  const handleWithdrawalAction = async (id: string, status: 'approved' | 'rejected') => {
    try {
      await WithdrawalService.updateStatus(id, status, adminNotes[id] || '');
      toast.success(status === 'approved' ? 'Saque aprovado' : 'Saque rejeitado');
      await load();
    } catch { toast.error('Erro ao processar'); }
  };

  useEffect(() => {
    const s = search.toLowerCase();
    setFiltered(items.filter(r =>
      `${r.referrerEmail || ''} ${r.referredEmail || ''} ${r.referrerUid} ${r.referredUid}`.toLowerCase().includes(s)
    ));
  }, [search, items]);

  const stats = {
    total: items.length,
    subscribed: items.filter(r => r.subscriptionActive).length,
    registered: items.filter(r => r.status === 'registered').length,
    totalEarnings: items.reduce((s, r) => s + (r.earnedTotal || 0), 0),
    pendingWithdrawals: withdrawals.filter(w => w.status === 'pending').length,
    approvedTotal: withdrawals.filter(w => w.status === 'approved').reduce((s, w) => s + w.amount, 0)
  };

  const statusLabel = (s: string) => s === 'approved' ? 'Aprovado' : s === 'rejected' ? 'Rejeitado' : 'Pendente';
  const statusVariant = (s: string): 'default' | 'secondary' | 'destructive' => s === 'approved' ? 'default' : s === 'rejected' ? 'destructive' : 'secondary';

  return (
    <div className="space-y-6">
      {/* Stats */}
      <Card className="modern-card bg-gradient-to-br from-card to-card/80 border-border/40">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Monitor de Indicações
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
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
              <div className="text-xs text-muted-foreground">Ganhos totais (R$)</div>
              <div className="text-2xl font-bold text-foreground">{stats.totalEarnings.toFixed(2)}</div>
            </div>
            <div className="p-4 rounded-xl border border-primary/40 bg-primary/5">
              <div className="text-xs text-muted-foreground">Saques pendentes</div>
              <div className="text-2xl font-bold text-primary">{stats.pendingWithdrawals}</div>
            </div>
            <div className="p-4 rounded-xl border border-border/40 bg-muted/10">
              <div className="text-xs text-muted-foreground">Total aprovado (R$)</div>
              <div className="text-2xl font-bold text-foreground">{stats.approvedTotal.toFixed(2)}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="referrals" className="space-y-4">
        <TabsList>
          <TabsTrigger value="referrals">Indicações</TabsTrigger>
          <TabsTrigger value="withdrawals">
            Solicitações de Saque {stats.pendingWithdrawals > 0 && <Badge variant="destructive" className="ml-2">{stats.pendingWithdrawals}</Badge>}
          </TabsTrigger>
        </TabsList>

        {/* Indicações tab */}
        <TabsContent value="referrals">
          <Card className="modern-card bg-gradient-to-br from-card to-card/80 border-border/40">
            <CardHeader>
              <CardTitle className="text-foreground">Indicações</CardTitle>
              <CardDescription className="text-muted-foreground">
                <Input placeholder="Pesquisar" value={search} onChange={e => setSearch(e.target.value)} className="max-w-xs mt-2" />
              </CardDescription>
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
                        <TableHead className="text-muted-foreground">Ganho (R$)</TableHead>
                        <TableHead className="text-muted-foreground">Dias</TableHead>
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
                          <TableCell className="text-foreground font-medium">{(r.earnedTotal || 0).toFixed(2)}</TableCell>
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
        </TabsContent>

        {/* Saques tab */}
        <TabsContent value="withdrawals">
          <Card className="modern-card bg-gradient-to-br from-card to-card/80 border-border/40">
            <CardHeader>
              <CardTitle className="text-foreground flex items-center gap-2">
                <Wallet className="w-5 h-5 text-primary" />
                Solicitações de Saque
              </CardTitle>
              <CardDescription className="text-muted-foreground">Aprove ou rejeite solicitações de saque dos indicadores</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/40">
                      <TableHead className="text-muted-foreground">Solicitante</TableHead>
                      <TableHead className="text-muted-foreground">Nome</TableHead>
                      <TableHead className="text-muted-foreground">CPF</TableHead>
                      <TableHead className="text-muted-foreground">E-mail</TableHead>
                      <TableHead className="text-muted-foreground">Pix</TableHead>
                      <TableHead className="text-muted-foreground">Valor (R$)</TableHead>
                      <TableHead className="text-muted-foreground">Status</TableHead>
                      <TableHead className="text-muted-foreground">Data</TableHead>
                      <TableHead className="text-muted-foreground">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {withdrawals.map(w => (
                      <TableRow key={w.id} className="border-border/40">
                        <TableCell className="text-foreground text-sm">{w.referrerEmail || w.referrerUid}</TableCell>
                        <TableCell className="text-foreground text-sm">{w.name}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{w.cpf}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{w.email}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{w.pixKey}</TableCell>
                        <TableCell className="text-foreground font-medium">{w.amount.toFixed(2)}</TableCell>
                        <TableCell><Badge variant={statusVariant(w.status)}>{statusLabel(w.status)}</Badge></TableCell>
                        <TableCell className="text-muted-foreground text-xs">{new Date(w.createdAt).toLocaleString('pt-BR')}</TableCell>
                        <TableCell>
                          {w.status === 'pending' ? (
                            <div className="space-y-2">
                              <Textarea
                                placeholder="Notas (opcional)"
                                value={adminNotes[w.id!] || ''}
                                onChange={e => setAdminNotes(prev => ({ ...prev, [w.id!]: e.target.value }))}
                                className="text-xs min-h-[40px]"
                              />
                              <div className="flex gap-2">
                                <Button size="sm" onClick={() => handleWithdrawalAction(w.id!, 'approved')}>
                                  <CheckCircle className="w-3 h-3 mr-1" />Aprovar
                                </Button>
                                <Button size="sm" variant="destructive" onClick={() => handleWithdrawalAction(w.id!, 'rejected')}>
                                  <XCircle className="w-3 h-3 mr-1" />Rejeitar
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">{w.adminNotes || '-'}</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {withdrawals.length === 0 && (
                      <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">Nenhuma solicitação</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
