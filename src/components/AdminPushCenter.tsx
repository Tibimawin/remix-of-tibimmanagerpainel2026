import React, { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { auth } from '@/config/firebase';
import { toast } from 'sonner';
import { Bell, Loader2, RefreshCw, Send, ShieldCheck, ShieldAlert, Smartphone, Clock } from 'lucide-react';

interface PushStatus {
  ready: boolean;
  hasServiceAccount: boolean;
  hasVapidPublicKey: boolean;
  activeTokens: number;
}

interface PushEvent {
  id: string;
  firebase_uid: string | null;
  type: string;
  title: string;
  body: string;
  status: string;
  tokens_total: number;
  tokens_sent: number;
  error: string | null;
  created_at: string;
}

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  sent: 'default',
  sending: 'secondary',
  failed: 'destructive',
  no_tokens: 'outline',
};

const AdminPushCenter: React.FC = () => {
  const [status, setStatus] = useState<PushStatus | null>(null);
  const [events, setEvents] = useState<PushEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [running, setRunning] = useState(false);
  const [title, setTitle] = useState('📢 Aviso do painel');
  const [body, setBody] = useState('');
  const [uid, setUid] = useState('');

  const call = useCallback(async (action: string, payload: Record<string, unknown> = {}) => {
    const idToken = await auth.currentUser?.getIdToken();
    const { data, error } = await supabase.functions.invoke('push', {
      body: { action, idToken, ...payload },
    });
    if (error) throw error;
    if ((data as any)?.error) throw new Error((data as any).error);
    return data as any;
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, e] = await Promise.all([call('status'), call('admin-events')]);
      setStatus(s);
      setEvents(e.events || []);
    } catch (err) {
      toast.error('Falha ao carregar', { description: err instanceof Error ? err.message : '' });
    } finally {
      setLoading(false);
    }
  }, [call]);

  useEffect(() => { load(); }, [load]);

  const handleSend = async () => {
    if (!body.trim()) return toast.error('Escreva a mensagem.');
    setSending(true);
    try {
      const res = await call('admin-send', {
        title,
        body,
        firebase_uid: uid.trim() || undefined,
      });
      toast.success(`Enviado para ${res.sent || 0} de ${res.total || 0} dispositivos`);
      setBody('');
      load();
    } catch (err) {
      toast.error('Falha ao enviar', { description: err instanceof Error ? err.message : '' });
    } finally {
      setSending(false);
    }
  };

  const handleExpirationRun = async () => {
    setRunning(true);
    try {
      const res = await call('admin-run-expiration-check');
      toast.success(`Verificação concluída: ${res.notified} avisados, ${res.skipped} já notificados`);
      load();
    } catch (err) {
      toast.error('Falha na verificação', { description: err instanceof Error ? err.message : '' });
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
            <Bell className="h-5 w-5" /> Central de Notificações Push
          </h2>
          <p className="text-sm text-muted-foreground">
            Envio real via FCM para alertas de pagamento e expiração.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            {status?.hasServiceAccount
              ? <ShieldCheck className="h-5 w-5 text-emerald-500" />
              : <ShieldAlert className="h-5 w-5 text-red-500" />}
            <div>
              <p className="text-sm font-medium text-foreground">Credencial de envio</p>
              <p className="text-xs text-muted-foreground">
                {status?.hasServiceAccount ? 'Configurada' : 'FIREBASE_SERVICE_ACCOUNT ausente'}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            {status?.hasVapidPublicKey
              ? <ShieldCheck className="h-5 w-5 text-emerald-500" />
              : <ShieldAlert className="h-5 w-5 text-amber-500" />}
            <div>
              <p className="text-sm font-medium text-foreground">Chave VAPID</p>
              <p className="text-xs text-muted-foreground">
                {status?.hasVapidPublicKey ? 'Configurada' : 'FIREBASE_VAPID_PUBLIC_KEY ausente'}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Smartphone className="h-5 w-5 text-sky-500" />
            <div>
              <p className="text-sm font-medium text-foreground">
                {status?.activeTokens ?? 0} dispositivos
              </p>
              <p className="text-xs text-muted-foreground">Inscritos e ativos</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Enviar notificação</CardTitle>
            <CardDescription>Deixe o UID vazio para enviar a todos os dispositivos.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título" />
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Mensagem" rows={3} />
            <Input value={uid} onChange={(e) => setUid(e.target.value)} placeholder="UID do usuário (opcional)" />
            <Button onClick={handleSend} disabled={sending} className="w-full">
              {sending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
              Enviar
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Alertas de expiração</CardTitle>
            <CardDescription>
              Avisa quem expira em até 3 dias (e quem já expirou), sem repetir o mesmo aviso.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={handleExpirationRun} disabled={running}>
              {running ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Clock className="h-4 w-4 mr-2" />}
              Rodar verificação agora
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Histórico de envios</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Título</TableHead>
                <TableHead className="text-right">Enviados</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Nenhum envio registrado ainda.
                  </TableCell>
                </TableRow>
              )}
              {events.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="whitespace-nowrap text-xs">
                    {new Date(e.created_at).toLocaleString('pt-BR')}
                  </TableCell>
                  <TableCell>{e.type}</TableCell>
                  <TableCell className="max-w-[240px] truncate" title={e.error || e.body}>{e.title}</TableCell>
                  <TableCell className="text-right">{e.tokens_sent}/{e.tokens_total}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant={STATUS_VARIANT[e.status] || 'outline'}>{e.status}</Badge>
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

export default AdminPushCenter;
