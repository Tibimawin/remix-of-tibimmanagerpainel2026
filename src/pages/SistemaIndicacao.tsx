import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ReferralService, Referral } from '@/services/ReferralService';
import { useSimpleAuth } from '@/contexts/SimpleAuthContext';
import { FirebaseUserService } from '@/services/FirebaseUserService';
import { Copy, Link as LinkIcon, TrendingUp } from 'lucide-react';

const SistemaIndicacao: React.FC = () => {
  const { userInfo } = useSimpleAuth();
  const [link, setLink] = useState('');
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (userInfo?.id) {
      const l = ReferralService.generateLink(userInfo.id);
      setLink(l);
      loadReferrals(userInfo.id);
    }
  }, [userInfo?.id]);

  const loadReferrals = async (uid: string) => {
    setLoading(true);
    try {
      const items = await ReferralService.getReferralsByReferrer(uid);
      const enriched = await Promise.all(
        items.map(async r => {
          const referred = await FirebaseUserService.getUserById(r.referredUid);
          let days = 0;
          if (referred?.startDate) {
            const start = new Date(referred.startDate).getTime();
            const now = Date.now();
            days = Math.max(0, Math.floor((now - start) / (1000 * 60 * 60 * 24)));
          }
          return { ...r, monthlyPayout: r.monthlyPayout, subscriptionActive: r.subscriptionActive, status: r.status, lastUpdated: r.lastUpdated, createdAt: r.createdAt, activatedAt: r.activatedAt, referrerUid: r.referrerUid, referrerEmail: r.referrerEmail, referredUid: r.referredUid, referredEmail: r.referredEmail, id: r.id, daysInPanel: days } as any;
        })
      );
      setReferrals(enriched as Referral[]);
    } catch (e) {
      toast.error('Erro ao carregar indicações');
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => {
    const total = referrals.length;
    const subscribed = referrals.filter(r => r.subscriptionActive).length;
    const registered = referrals.filter(r => r.status === 'registered').length;
    const potentialMonthly = referrals.filter(r => r.subscriptionActive).reduce((sum, r) => sum + (r.monthlyPayout || 0), 0);
    return { total, subscribed, registered, potentialMonthly };
  }, [referrals]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      toast.success('Link copiado');
    } catch {
      toast.error('Não foi possível copiar');
    }
  };

  return (
    <div className="space-y-6">
      <Card className="modern-card bg-gradient-to-br from-card to-card/80 border-border/40">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Sistema de Indicação
          </CardTitle>
          <CardDescription className="text-muted-foreground">Ganhe 33% da assinatura mensal indicando novas pessoas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="col-span-2 flex items-center gap-2">
              <Input value={link} readOnly className="flex-1" />
              <Button variant="secondary" onClick={copy}>
                <Copy className="w-4 h-4 mr-2" />
                Copiar
              </Button>
            </div>
            <Button onClick={() => window.open(link, '_blank')}>
              <LinkIcon className="w-4 h-4 mr-2" />
              Abrir link
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="modern-card bg-gradient-to-br from-card to-card/80 border-border/40">
        <CardHeader>
          <CardTitle className="text-foreground">Resumo</CardTitle>
          <CardDescription className="text-muted-foreground">Acompanhe suas indicações</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
              <div className="text-xs text-muted-foreground">Potencial mensal (R$)</div>
              <div className="text-2xl font-bold text-foreground">{stats.potentialMonthly.toFixed(2)}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="modern-card bg-gradient-to-br from-card to-card/80 border-border/40">
        <CardHeader>
          <CardTitle className="text-foreground">Indicações</CardTitle>
          <CardDescription className="text-muted-foreground">Detalhes das pessoas indicadas</CardDescription>
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
                    <TableHead className="text-muted-foreground">Dias no painel</TableHead>
                    <TableHead className="text-muted-foreground">Criado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {referrals.map(r => (
                    <TableRow key={r.id} className="border-border/40">
                      <TableCell className="text-foreground">
                        <div className="text-sm">{r.referredEmail || r.referredUid}</div>
                        <div className="text-xs text-muted-foreground">{r.referredUid}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={r.status === 'subscribed' ? 'default' : 'secondary'}>{r.status}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={r.subscriptionActive ? 'default' : 'destructive'}>{r.subscriptionActive ? 'Ativa' : 'Inativa'}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{(r as any).daysInPanel ?? 0}</TableCell>
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

export default SistemaIndicacao;