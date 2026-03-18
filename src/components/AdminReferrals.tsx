import React, { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ReferralService, Referral } from '@/services/ReferralService';
import { WithdrawalService, WithdrawalRequest } from '@/services/WithdrawalService';
import { FirebaseUserService, FirebaseUser } from '@/services/FirebaseUserService';
import { TrendingUp, Wallet, CheckCircle, XCircle, AlertTriangle, Shield, RefreshCw, Eye, Download, FileText, FileSpreadsheet, CalendarIcon, X } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import jsPDF from 'jspdf';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface EnrichedReferral extends Referral {
  daysInPanel?: number;
  referredUser?: FirebaseUser | null;
  referrerUser?: FirebaseUser | null;
}

export const AdminReferrals: React.FC = () => {
  const [items, setItems] = useState<EnrichedReferral[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});
  const [detailItem, setDetailItem] = useState<EnrichedReferral | null>(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [all, wds] = await Promise.all([
        ReferralService.getAllReferrals(),
        WithdrawalService.getAllRequests()
      ]);
      const enriched: EnrichedReferral[] = await Promise.all(
        all.map(async r => {
          const [referred, referrer] = await Promise.all([
            FirebaseUserService.getUserById(r.referredUid),
            FirebaseUserService.getUserById(r.referrerUid)
          ]);
          let days = 0;
          if (referred?.startDate) {
            days = Math.max(0, Math.floor((Date.now() - new Date(referred.startDate).getTime()) / (1000 * 60 * 60 * 24)));
          }
          return { ...r, daysInPanel: days, referredUser: referred, referrerUser: referrer };
        })
      );
      setItems(enriched);
      setWithdrawals(wds);
    } finally {
      setLoading(false);
    }
  };

  const inDateRange = (dateStr: string) => {
    const d = new Date(dateStr);
    if (dateFrom && d < new Date(dateFrom.setHours(0, 0, 0, 0))) return false;
    if (dateTo && d > new Date(new Date(dateTo).setHours(23, 59, 59, 999))) return false;
    return true;
  };

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return items.filter(r => {
      if (!inDateRange(r.createdAt)) return false;
      if (!s) return true;
      return `${r.referrerEmail || ''} ${r.referredEmail || ''} ${r.referrerName || ''} ${r.referredName || ''} ${r.referrerUid} ${r.referredUid}`.toLowerCase().includes(s);
    });
  }, [search, items, dateFrom, dateTo]);

  const filteredWithdrawals = useMemo(() => {
    return withdrawals.filter(w => inDateRange(w.createdAt));
  }, [withdrawals, dateFrom, dateTo]);

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

  const stats = useMemo(() => ({
    total: filtered.length,
    subscribed: filtered.filter(r => r.subscriptionActive).length,
    registered: filtered.filter(r => r.status === 'registered').length,
    totalEarnings: filtered.reduce((s, r) => s + (r.earnedTotal || 0), 0),
    pendingWithdrawals: filteredWithdrawals.filter(w => w.status === 'pending').length,
    approvedTotal: filteredWithdrawals.filter(w => w.status === 'approved').reduce((s, w) => s + w.amount, 0),
    flagged: filtered.filter(r => r.flagged || r.sameIP).length
  }), [filtered, filteredWithdrawals]);

  // Detectar IPs duplicados entre diferentes indicações
  const suspiciousIPs = useMemo(() => {
    const ipMap = new Map<string, string[]>();
    items.forEach(r => {
      if (r.referredIP) {
        const list = ipMap.get(r.referredIP) || [];
        list.push(r.referredEmail || r.referredUid);
        ipMap.set(r.referredIP, list);
      }
    });
    const suspicious: { ip: string; users: string[] }[] = [];
    ipMap.forEach((users, ip) => {
      if (users.length > 1 && ip) {
        suspicious.push({ ip, users });
      }
    });
    return suspicious;
  }, [items]);

  const statusLabel = (s: string) => s === 'approved' ? 'Aprovado' : s === 'rejected' ? 'Rejeitado' : 'Pendente';
  const statusVariant = (s: string): 'default' | 'secondary' | 'destructive' => s === 'approved' ? 'default' : s === 'rejected' ? 'destructive' : 'secondary';

  const dateStr = () => new Date().toISOString().split('T')[0];

  const exportReferralsCSV = () => {
    const headers = ['Indicador','Email Indicador','UID Indicador','Indicado','Email Indicado','UID Indicado','Status','Assinatura Ativa','IP Indicador','IP Indicado','Mesmo IP','Suspeito','Ganho Total (R$)','Dias no Painel','Criado em'];
    const rows = filtered.map(r => [
      r.referrerName || '', r.referrerEmail || '', r.referrerUid, r.referredName || '', r.referredEmail || '', r.referredUid,
      r.status === 'subscribed' ? 'Assinante' : 'Registrado', r.subscriptionActive ? 'Sim' : 'Não',
      r.referrerIP || '', r.referredIP || '', r.sameIP ? 'Sim' : 'Não', r.flagged ? 'Sim' : 'Não',
      (r.earnedTotal || 0).toFixed(2), String(r.daysInPanel ?? 0), new Date(r.createdAt).toLocaleString('pt-BR')
    ]);
    downloadCSV(headers, rows, `indicacoes_${dateStr()}.csv`);
  };

  const exportWithdrawalsCSV = () => {
    const headers = ['Solicitante','Nome','CPF','Email','Chave Pix','Valor (R$)','Status','Notas Admin','Data Solicitação','Última Atualização'];
    const rows = filteredWithdrawals.map(w => [
      w.referrerEmail || w.referrerUid, w.name, w.cpf, w.email, w.pixKey,
      w.amount.toFixed(2), statusLabel(w.status), w.adminNotes || '',
      new Date(w.createdAt).toLocaleString('pt-BR'), new Date(w.updatedAt).toLocaleString('pt-BR')
    ]);
    downloadCSV(headers, rows, `saques_${dateStr()}.csv`);
  };

  const downloadCSV = (headers: string[], rows: string[][], filename: string) => {
    const escape = (v: string) => v.includes(',') || v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v;
    const content = [headers.map(escape).join(','), ...rows.map(r => r.map(escape).join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exportado: ${filename}`);
  };

  const exportFullPDF = () => {
    const pdf = new jsPDF({ orientation: 'landscape' });
    const now = new Date().toLocaleString('pt-BR');
    let y = 15;

    pdf.setFontSize(16);
    pdf.text('Relatório de Indicações e Saques', 14, y);
    y += 8;
    pdf.setFontSize(9);
    const periodLabel = dateFrom || dateTo
      ? `Período: ${dateFrom ? format(dateFrom, 'dd/MM/yyyy') : '...'} até ${dateTo ? format(dateTo, 'dd/MM/yyyy') : '...'}`
      : 'Período: Todos';
    pdf.text(`Gerado em: ${now} | ${periodLabel}`, 14, y);
    y += 10;

    // Resumo
    pdf.setFontSize(12);
    pdf.text('Resumo', 14, y); y += 7;
    pdf.setFontSize(9);
    const summaryLines = [
      `Total de indicações: ${stats.total}`,
      `Assinantes ativos: ${stats.subscribed}`,
      `Apenas registrados: ${stats.registered}`,
      `Indicações suspeitas: ${stats.flagged}`,
      `Ganhos totais gerados: R$ ${stats.totalEarnings.toFixed(2)}`,
      `Saques pendentes: ${stats.pendingWithdrawals}`,
      `Total aprovado em saques: R$ ${stats.approvedTotal.toFixed(2)}`,
    ];
    summaryLines.forEach(l => { pdf.text(l, 14, y); y += 5; });
    y += 5;

    // Indicações
    pdf.setFontSize(12);
    pdf.text('Indicações', 14, y); y += 7;
    pdf.setFontSize(7);
    const refHeaders = ['Indicador', 'Indicado', 'Status', 'Ativa', 'IP Ind.', 'IP Ind.do', 'Mesmo IP', 'Ganho', 'Dias', 'Data'];
    const colW = [40, 40, 20, 15, 28, 28, 18, 18, 12, 30];
    let x = 14;
    refHeaders.forEach((h, i) => { pdf.text(h, x, y); x += colW[i]; });
    y += 5;

    filtered.forEach(r => {
      if (y > 190) { pdf.addPage(); y = 15; }
      x = 14;
      const vals = [
        (r.referrerName || r.referrerEmail || '-').substring(0, 22),
        (r.referredName || r.referredEmail || '-').substring(0, 22),
        r.status === 'subscribed' ? 'Assinante' : 'Registrado',
        r.subscriptionActive ? 'Sim' : 'Não',
        (r.referrerIP || '-').substring(0, 15),
        (r.referredIP || '-').substring(0, 15),
        r.sameIP ? 'SIM' : 'Não',
        (r.earnedTotal || 0).toFixed(2),
        String(r.daysInPanel ?? 0),
        new Date(r.createdAt).toLocaleDateString('pt-BR')
      ];
      vals.forEach((v, i) => { pdf.text(v, x, y); x += colW[i]; });
      y += 4.5;
    });

    // Saques
    y += 8;
    if (y > 170) { pdf.addPage(); y = 15; }
    pdf.setFontSize(12);
    pdf.text('Solicitações de Saque', 14, y); y += 7;
    pdf.setFontSize(7);
    const wHeaders = ['Solicitante', 'Nome', 'CPF', 'Email', 'Pix', 'Valor', 'Status', 'Data'];
    const wColW = [40, 30, 25, 40, 35, 18, 18, 30];
    x = 14;
    wHeaders.forEach((h, i) => { pdf.text(h, x, y); x += wColW[i]; });
    y += 5;

    filteredWithdrawals.forEach(w => {
      if (y > 190) { pdf.addPage(); y = 15; }
      x = 14;
      const vals = [
        (w.referrerEmail || w.referrerUid).substring(0, 22),
        w.name.substring(0, 16),
        w.cpf,
        w.email.substring(0, 22),
        w.pixKey.substring(0, 18),
        w.amount.toFixed(2),
        statusLabel(w.status),
        new Date(w.createdAt).toLocaleDateString('pt-BR')
      ];
      vals.forEach((v, i) => { pdf.text(v, x, y); x += wColW[i]; });
      y += 4.5;
    });

    pdf.save(`relatorio_indicacoes_${dateStr()}.pdf`);
    toast.success('PDF exportado com sucesso');
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <Card className="modern-card bg-gradient-to-br from-card to-card/80 border-border/40">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-foreground flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Monitor Anti-Fraude de Indicações
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={exportFullPDF} disabled={loading || items.length === 0}>
                <FileText className="w-4 h-4 mr-2" />
                PDF
              </Button>
              <Button variant="outline" size="sm" onClick={exportReferralsCSV} disabled={loading || items.length === 0}>
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                CSV Indicações
              </Button>
              <Button variant="outline" size="sm" onClick={exportWithdrawalsCSV} disabled={loading || withdrawals.length === 0}>
                <Download className="w-4 h-4 mr-2" />
                CSV Saques
              </Button>
              <Button variant="outline" size="sm" onClick={load} disabled={loading}>
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-7 gap-4">
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
            <div className={`p-4 rounded-xl border ${stats.flagged > 0 ? 'border-destructive/60 bg-destructive/10' : 'border-border/40 bg-muted/10'}`}>
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Suspeitos
              </div>
              <div className={`text-2xl font-bold ${stats.flagged > 0 ? 'text-destructive' : 'text-foreground'}`}>{stats.flagged}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alertas de IP suspeito */}
      {suspiciousIPs.length > 0 && (
        <Card className="modern-card border-destructive/40 bg-destructive/5">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2 text-base">
              <AlertTriangle className="w-5 h-5" />
              Alerta: IPs compartilhados detectados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {suspiciousIPs.map((s, i) => (
                <div key={i} className="p-3 rounded-lg border border-destructive/20 bg-background/50">
                  <div className="text-sm font-medium text-foreground">IP: {s.ip}</div>
                  <div className="text-xs text-muted-foreground">Usuários indicados com este IP: {s.users.join(', ')}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="referrals" className="space-y-4">
        <TabsList>
          <TabsTrigger value="referrals">
            Indicações {stats.flagged > 0 && <Badge variant="destructive" className="ml-2">{stats.flagged}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="withdrawals">
            Solicitações de Saque {stats.pendingWithdrawals > 0 && <Badge variant="destructive" className="ml-2">{stats.pendingWithdrawals}</Badge>}
          </TabsTrigger>
        </TabsList>

        {/* Indicações tab */}
        <TabsContent value="referrals">
          <Card className="modern-card bg-gradient-to-br from-card to-card/80 border-border/40">
            <CardHeader>
              <CardTitle className="text-foreground">Todas as Indicações</CardTitle>
              <CardDescription className="text-muted-foreground">
                Informações completas de cada indicação para auditoria
                <Input placeholder="Pesquisar por nome, email ou UID..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-sm mt-2" />
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
                        <TableHead className="text-muted-foreground">⚠</TableHead>
                        <TableHead className="text-muted-foreground">Quem indicou</TableHead>
                        <TableHead className="text-muted-foreground">Indicado</TableHead>
                        <TableHead className="text-muted-foreground">Status</TableHead>
                        <TableHead className="text-muted-foreground">Assinatura</TableHead>
                        <TableHead className="text-muted-foreground">IP Indicador</TableHead>
                        <TableHead className="text-muted-foreground">IP Indicado</TableHead>
                        <TableHead className="text-muted-foreground">Ganho (R$)</TableHead>
                        <TableHead className="text-muted-foreground">Dias</TableHead>
                        <TableHead className="text-muted-foreground">Criado</TableHead>
                        <TableHead className="text-muted-foreground">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map(r => (
                        <TableRow key={r.id} className={`border-border/40 ${r.flagged || r.sameIP ? 'bg-destructive/5' : ''}`}>
                          <TableCell>
                            {(r.flagged || r.sameIP) && (
                              <AlertTriangle className="w-4 h-4 text-destructive" />
                            )}
                          </TableCell>
                          <TableCell className="text-foreground">
                            <div className="text-sm font-medium">{r.referrerName || r.referrerEmail || '-'}</div>
                            <div className="text-xs text-muted-foreground">{r.referrerEmail}</div>
                            <div className="text-[10px] text-muted-foreground/60 font-mono">{r.referrerUid}</div>
                          </TableCell>
                          <TableCell className="text-foreground">
                            <div className="text-sm font-medium">{r.referredName || r.referredEmail || '-'}</div>
                            <div className="text-xs text-muted-foreground">{r.referredEmail}</div>
                            <div className="text-[10px] text-muted-foreground/60 font-mono">{r.referredUid}</div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={r.status === 'subscribed' ? 'default' : 'secondary'}>
                              {r.status === 'subscribed' ? 'Assinante' : 'Registrado'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <Badge variant={r.subscriptionActive ? 'default' : 'destructive'}>
                                {r.subscriptionActive ? 'Ativa' : 'Inativa'}
                              </Badge>
                              {r.referredUser && (
                                <span className="text-[10px] text-muted-foreground">
                                  Expira: {r.referredUser.expiryDate ? new Date(r.referredUser.expiryDate).toLocaleDateString('pt-BR') : '-'}
                                </span>
                              )}
                              <div className="flex gap-1 mt-1">
                                {!r.subscriptionActive ? (
                                  <Button size="sm" className="h-6 text-xs" onClick={() => handleActivate(r.referredUid)}>Ativar</Button>
                                ) : (
                                  <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => handleDeactivate(r.referredUid)}>Desativar</Button>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className={`text-xs font-mono ${r.sameIP ? 'text-destructive font-bold' : 'text-muted-foreground'}`}>
                            {r.referrerIP || r.referrerUser?.deviceInfo?.ip || '-'}
                          </TableCell>
                          <TableCell className={`text-xs font-mono ${r.sameIP ? 'text-destructive font-bold' : 'text-muted-foreground'}`}>
                            {r.referredIP || r.referredUser?.deviceInfo?.ip || '-'}
                          </TableCell>
                          <TableCell className="text-foreground font-medium">{(r.earnedTotal || 0).toFixed(2)}</TableCell>
                          <TableCell className="text-muted-foreground">{r.daysInPanel ?? 0}</TableCell>
                          <TableCell className="text-muted-foreground text-xs">{new Date(r.createdAt).toLocaleString('pt-BR')}</TableCell>
                          <TableCell>
                            <Button size="sm" variant="ghost" className="h-7" onClick={() => setDetailItem(r)}>
                              <Eye className="w-3.5 h-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {filtered.length === 0 && (
                        <TableRow><TableCell colSpan={11} className="text-center text-muted-foreground py-8">Nenhuma indicação</TableCell></TableRow>
                      )}
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
              <CardDescription className="text-muted-foreground">Aprove ou rejeite solicitações — confira os dados antes de liberar</CardDescription>
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
                      <TableHead className="text-muted-foreground">Indicados ativos</TableHead>
                      <TableHead className="text-muted-foreground">Status</TableHead>
                      <TableHead className="text-muted-foreground">Data</TableHead>
                      <TableHead className="text-muted-foreground">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {withdrawals.map(w => {
                      const referrerRefs = items.filter(r => r.referrerUid === w.referrerUid);
                      const activeCount = referrerRefs.filter(r => r.subscriptionActive).length;
                      const hasFlagged = referrerRefs.some(r => r.flagged || r.sameIP);

                      return (
                        <TableRow key={w.id} className={`border-border/40 ${hasFlagged ? 'bg-destructive/5' : ''}`}>
                          <TableCell className="text-foreground">
                            <div className="text-sm">{w.referrerEmail || w.referrerUid}</div>
                            {hasFlagged && (
                              <div className="flex items-center gap-1 mt-1">
                                <AlertTriangle className="w-3 h-3 text-destructive" />
                                <span className="text-[10px] text-destructive">Indicações suspeitas</span>
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-foreground text-sm">{w.name}</TableCell>
                          <TableCell className="text-muted-foreground text-sm font-mono">{w.cpf}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">{w.email}</TableCell>
                          <TableCell className="text-muted-foreground text-sm font-mono">{w.pixKey}</TableCell>
                          <TableCell className="text-foreground font-medium">{w.amount.toFixed(2)}</TableCell>
                          <TableCell className="text-foreground">
                            <span className="font-medium">{activeCount}</span>
                            <span className="text-muted-foreground">/{referrerRefs.length}</span>
                          </TableCell>
                          <TableCell><Badge variant={statusVariant(w.status)}>{statusLabel(w.status)}</Badge></TableCell>
                          <TableCell className="text-muted-foreground text-xs">{new Date(w.createdAt).toLocaleString('pt-BR')}</TableCell>
                          <TableCell>
                            {w.status === 'pending' ? (
                              <div className="space-y-2 min-w-[180px]">
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
                      );
                    })}
                    {withdrawals.length === 0 && (
                      <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-8">Nenhuma solicitação</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Detail Dialog */}
      <Dialog open={!!detailItem} onOpenChange={open => !open && setDetailItem(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-foreground">Detalhes da Indicação</DialogTitle>
            <DialogDescription className="text-muted-foreground">Informações completas para auditoria</DialogDescription>
          </DialogHeader>
          {detailItem && (
            <div className="space-y-4 text-sm">
              {(detailItem.flagged || detailItem.sameIP) && (
                <div className="p-3 rounded-lg border border-destructive/40 bg-destructive/10 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-destructive mt-0.5" />
                  <div>
                    <div className="font-medium text-destructive">Indicação suspeita</div>
                    <div className="text-xs text-destructive/80">{detailItem.flagReason || 'Mesmo IP entre indicador e indicado'}</div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Indicador</div>
                  <div className="font-medium text-foreground">{detailItem.referrerName || '-'}</div>
                  <div className="text-xs text-muted-foreground">{detailItem.referrerEmail}</div>
                  <div className="text-[10px] font-mono text-muted-foreground/60">{detailItem.referrerUid}</div>
                  <div className="text-xs text-muted-foreground mt-1">IP: {detailItem.referrerIP || detailItem.referrerUser?.deviceInfo?.ip || 'N/A'}</div>
                  {detailItem.referrerUser?.deviceInfo?.dispositivo && (
                    <div className="text-xs text-muted-foreground">Dispositivo: {detailItem.referrerUser.deviceInfo.dispositivo}</div>
                  )}
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Indicado</div>
                  <div className="font-medium text-foreground">{detailItem.referredName || '-'}</div>
                  <div className="text-xs text-muted-foreground">{detailItem.referredEmail}</div>
                  <div className="text-[10px] font-mono text-muted-foreground/60">{detailItem.referredUid}</div>
                  <div className="text-xs text-muted-foreground mt-1">IP: {detailItem.referredIP || detailItem.referredUser?.deviceInfo?.ip || 'N/A'}</div>
                  {detailItem.referredUser?.deviceInfo?.dispositivo && (
                    <div className="text-xs text-muted-foreground">Dispositivo: {detailItem.referredUser.deviceInfo.dispositivo}</div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border/40">
                <div>
                  <div className="text-xs text-muted-foreground">Status indicado</div>
                  <div className="text-foreground">{detailItem.referredUser?.isActive ? '✅ Ativo' : '❌ Inativo'}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Expira em</div>
                  <div className="text-foreground">{detailItem.referredUser?.expiryDate ? new Date(detailItem.referredUser.expiryDate).toLocaleDateString('pt-BR') : '-'}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Dias no painel</div>
                  <div className="text-foreground">{detailItem.daysInPanel ?? 0}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Logins totais</div>
                  <div className="text-foreground">{detailItem.referredUser?.totalLogins ?? 0}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Ganho total (R$)</div>
                  <div className="text-foreground font-medium">{(detailItem.earnedTotal || 0).toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Criado em</div>
                  <div className="text-foreground">{new Date(detailItem.createdAt).toLocaleString('pt-BR')}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Criado por</div>
                  <div className="text-foreground">{detailItem.referredUser?.createdBy || '-'}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Último login</div>
                  <div className="text-foreground">{detailItem.referredUser?.lastLogin ? new Date(detailItem.referredUser.lastLogin).toLocaleString('pt-BR') : 'Nunca'}</div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
