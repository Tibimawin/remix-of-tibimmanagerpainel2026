import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ReferralService, Referral } from '@/services/ReferralService';
import { WithdrawalService, WithdrawalRequest } from '@/services/WithdrawalService';
import { useSimpleAuth } from '@/contexts/SimpleAuthContext';
import { FirebaseUserService } from '@/services/FirebaseUserService';
import { Copy, Link as LinkIcon, TrendingUp, Wallet, Send, History } from 'lucide-react';

const SistemaIndicacao: React.FC = () => {
  const { userInfo } = useSimpleAuth();
  const [link, setLink] = useState('');
  const [referrals, setReferrals] = useState<(Referral & { daysInPanel?: number })[]>([]);
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState(0);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);

  // Withdrawal form
  const [wName, setWName] = useState('');
  const [wCpf, setWCpf] = useState('');
  const [wEmail, setWEmail] = useState('');
  const [wPix, setWPix] = useState('');
  const [wAmount, setWAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (userInfo?.id) {
      const l = ReferralService.generateLink(userInfo.id);
      setLink(l);
      loadAll(userInfo.id);
    }
  }, [userInfo?.id]);

  const loadAll = async (uid: string) => {
    setLoading(true);
    try {
      const [items, bal, wds] = await Promise.all([
        ReferralService.getReferralsByReferrer(uid),
        ReferralService.getWithdrawableBalance(uid),
        WithdrawalService.getRequestsByUser(uid)
      ]);

      const enriched = await Promise.all(
        items.map(async r => {
          const referred = await FirebaseUserService.getUserById(r.referredUid);
          let days = 0;
          if (referred?.startDate) {
            days = Math.max(0, Math.floor((Date.now() - new Date(referred.startDate).getTime()) / (1000 * 60 * 60 * 24)));
          }
          return { ...r, daysInPanel: days };
        })
      );

      setReferrals(enriched);
      setBalance(bal);
      setWithdrawals(wds);
    } catch {
      toast.error('Erro ao carregar indicações');
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => {
    const total = referrals.length;
    const subscribed = referrals.filter(r => r.subscriptionActive).length;
    const registered = referrals.filter(r => r.status === 'registered').length;
    const totalEarned = referrals.reduce((sum, r) => sum + (r.earnedTotal || 0), 0);
    return { total, subscribed, registered, totalEarned };
  }, [referrals]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      toast.success('Link copiado');
    } catch {
      toast.error('Não foi possível copiar');
    }
  };

  const handleWithdraw = async () => {
    if (!userInfo?.id) return;
    const amount = parseFloat(wAmount);
    if (!wName.trim() || !wCpf.trim() || !wEmail.trim() || !wPix.trim()) {
      toast.error('Preencha todos os campos');
      return;
    }
    if (isNaN(amount) || amount < 5) {
      toast.error('Valor mínimo para saque é R$5,00');
      return;
    }
    if (amount > balance) {
      toast.error(`Saldo insuficiente. Disponível: R$${balance.toFixed(2)}`);
      return;
    }

    setSubmitting(true);
    try {
      await WithdrawalService.createRequest({
        referrerUid: userInfo.id,
        referrerEmail: userInfo.email || '',
        name: wName.trim(),
        cpf: wCpf.trim(),
        email: wEmail.trim(),
        pixKey: wPix.trim(),
        amount
      });
      toast.success('Solicitação de saque enviada!');
      setWName(''); setWCpf(''); setWEmail(''); setWPix(''); setWAmount('');
      await loadAll(userInfo.id);
    } catch (e: any) {
      toast.error(e.message || 'Erro ao solicitar saque');
    } finally {
      setSubmitting(false);
    }
  };

  const statusLabel = (s: string) => {
    if (s === 'approved') return 'Aprovado';
    if (s === 'rejected') return 'Rejeitado';
    return 'Pendente';
  };

  const statusVariant = (s: string): 'default' | 'secondary' | 'destructive' => {
    if (s === 'approved') return 'default';
    if (s === 'rejected') return 'destructive';
    return 'secondary';
  };

  return (
    <div className="space-y-6">
      {/* Link de indicação */}
      <Card className="modern-card bg-gradient-to-br from-card to-card/80 border-border/40">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Sistema de Indicação
          </CardTitle>
          <CardDescription className="text-muted-foreground">Ganhe 10% da assinatura mensal indicando novas pessoas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="col-span-2 flex items-center gap-2">
              <Input value={link} readOnly className="flex-1" />
              <Button variant="secondary" onClick={copy}>
                <Copy className="w-4 h-4 mr-2" />Copiar
              </Button>
            </div>
            <Button onClick={() => window.open(link, '_blank')}>
              <LinkIcon className="w-4 h-4 mr-2" />Abrir link
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Resumo + saldo */}
      <Card className="modern-card bg-gradient-to-br from-card to-card/80 border-border/40">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <Wallet className="w-5 h-5 text-primary" />
            Resumo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="p-4 rounded-xl border border-border/40 bg-muted/10">
              <div className="text-xs text-muted-foreground">Total indicados</div>
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
              <div className="text-xs text-muted-foreground">Total ganho (R$)</div>
              <div className="text-2xl font-bold text-foreground">{stats.totalEarned.toFixed(2)}</div>
            </div>
            <div className="p-4 rounded-xl border border-primary/40 bg-primary/5">
              <div className="text-xs text-muted-foreground">Saldo disponível (R$)</div>
              <div className="text-2xl font-bold text-primary">{balance.toFixed(2)}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de indicações */}
      <Card className="modern-card bg-gradient-to-br from-card to-card/80 border-border/40">
        <CardHeader>
          <CardTitle className="text-foreground">Indicações</CardTitle>
          <CardDescription className="text-muted-foreground">Detalhes das pessoas indicadas e seus ganhos</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/40">
                    <TableHead className="text-muted-foreground">Indicado</TableHead>
                    <TableHead className="text-muted-foreground">Status</TableHead>
                    <TableHead className="text-muted-foreground">Assinatura</TableHead>
                    <TableHead className="text-muted-foreground">Ganho (R$)</TableHead>
                    <TableHead className="text-muted-foreground">Dias no painel</TableHead>
                    <TableHead className="text-muted-foreground">Criado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {referrals.map(r => (
                    <TableRow key={r.id} className="border-border/40">
                      <TableCell className="text-foreground">
                        <div className="text-sm">{r.referredEmail || r.referredUid}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={r.status === 'subscribed' ? 'default' : 'secondary'}>{r.status === 'subscribed' ? 'Assinante' : 'Registrado'}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={r.subscriptionActive ? 'default' : 'destructive'}>{r.subscriptionActive ? 'Ativa' : 'Inativa'}</Badge>
                      </TableCell>
                      <TableCell className="text-foreground font-medium">{(r.earnedTotal || 0).toFixed(2)}</TableCell>
                      <TableCell className="text-muted-foreground">{r.daysInPanel ?? 0}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">{new Date(r.createdAt).toLocaleString('pt-BR')}</TableCell>
                    </TableRow>
                  ))}
                  {referrals.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhuma indicação ainda</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Solicitar Saque */}
      <Card className="modern-card bg-gradient-to-br from-card to-card/80 border-border/40">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <Send className="w-5 h-5 text-primary" />
            Solicitar Saque
          </CardTitle>
          <CardDescription className="text-muted-foreground">Preencha seus dados para solicitar o saque (mínimo R$5,00)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-foreground">Nome completo</Label>
              <Input value={wName} onChange={e => setWName(e.target.value)} placeholder="Seu nome completo" />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">CPF</Label>
              <Input value={wCpf} onChange={e => setWCpf(e.target.value)} placeholder="000.000.000-00" />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">E-mail</Label>
              <Input type="email" value={wEmail} onChange={e => setWEmail(e.target.value)} placeholder="seu@email.com" />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Chave Pix</Label>
              <Input value={wPix} onChange={e => setWPix(e.target.value)} placeholder="CPF, e-mail, telefone ou chave aleatória" />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Valor do saque (R$)</Label>
              <Input type="number" min="5" step="0.01" value={wAmount} onChange={e => setWAmount(e.target.value)} placeholder="5.00" />
            </div>
            <div className="flex items-end">
              <Button onClick={handleWithdraw} disabled={submitting || balance < 5} className="w-full">
                {submitting ? 'Enviando...' : 'Solicitar Saque'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Histórico de saques */}
      <Card className="modern-card bg-gradient-to-br from-card to-card/80 border-border/40">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <History className="w-5 h-5 text-primary" />
            Histórico de Saques
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border/40">
                  <TableHead className="text-muted-foreground">Valor (R$)</TableHead>
                  <TableHead className="text-muted-foreground">Pix</TableHead>
                  <TableHead className="text-muted-foreground">Status</TableHead>
                  <TableHead className="text-muted-foreground">Data</TableHead>
                  <TableHead className="text-muted-foreground">Observação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {withdrawals.map(w => (
                  <TableRow key={w.id} className="border-border/40">
                    <TableCell className="text-foreground font-medium">{w.amount.toFixed(2)}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{w.pixKey}</TableCell>
                    <TableCell><Badge variant={statusVariant(w.status)}>{statusLabel(w.status)}</Badge></TableCell>
                    <TableCell className="text-muted-foreground text-xs">{new Date(w.createdAt).toLocaleString('pt-BR')}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">{w.adminNotes || '-'}</TableCell>
                  </TableRow>
                ))}
                {withdrawals.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhuma solicitação de saque</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SistemaIndicacao;
