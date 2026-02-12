import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { 
  AlertTriangle, 
  Calendar, 
  Play, 
  RefreshCw, 
  Search, 
  Clock,
  CheckCircle,
  XCircle,
  Mail,
  Bell,
  Save
} from 'lucide-react';
import { toast } from 'sonner';
import { ExpirationNotificationService, type ExpirationNotification } from '@/services/ExpirationNotificationService';
import { db } from '@/config/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export interface ExpirationPushConfig {
  enabled: boolean;
  daysBeforeExpiry: number;
}

const DEFAULT_PUSH_CONFIG: ExpirationPushConfig = {
  enabled: true,
  daysBeforeExpiry: 5,
};

const AdminExpirationNotifications: React.FC = () => {
  const [notifications, setNotifications] = useState<ExpirationNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [pushConfig, setPushConfig] = useState<ExpirationPushConfig>(DEFAULT_PUSH_CONFIG);
  const [savingConfig, setSavingConfig] = useState(false);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const data = await ExpirationNotificationService.getAllExpirationNotifications();
      setNotifications(data);
    } catch (error) {
      console.error('Erro ao carregar notificações:', error);
      toast.error('Erro ao carregar notificações de expiração');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
    loadPushConfig();
  }, []);

  const loadPushConfig = async () => {
    try {
      const docRef = doc(db, 'systemConfig', 'expirationPush');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setPushConfig({ ...DEFAULT_PUSH_CONFIG, ...docSnap.data() as ExpirationPushConfig });
      }
    } catch (error) {
      console.error('Erro ao carregar config push:', error);
    }
  };

  const savePushConfig = async () => {
    try {
      setSavingConfig(true);
      await setDoc(doc(db, 'systemConfig', 'expirationPush'), pushConfig);
      toast.success('Configuração de notificação push salva!');
    } catch (error) {
      console.error('Erro ao salvar config push:', error);
      toast.error('Erro ao salvar configuração');
    } finally {
      setSavingConfig(false);
    }
  };

  const runManualCheck = async () => {
    try {
      setProcessing(true);
      toast.info('Executando verificação de expirações...');
      
      await ExpirationNotificationService.runAutomaticCheck();
      await loadNotifications();
      
      toast.success('Verificação concluída com sucesso!');
    } catch (error) {
      console.error('Erro na verificação manual:', error);
      toast.error('Erro ao executar verificação');
    } finally {
      setProcessing(false);
    }
  };

  const dismissNotification = async (userId: string) => {
    try {
      await ExpirationNotificationService.dismissExpirationNotification(userId);
      await loadNotifications();
      toast.success('Notificação dispensada');
    } catch (error) {
      console.error('Erro ao dispensar notificação:', error);
      toast.error('Erro ao dispensar notificação');
    }
  };

  const filteredNotifications = notifications.filter(notification =>
    notification.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
    notification.userName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeNotifications = filteredNotifications.filter(n => !n.dismissed);
  const dismissedNotifications = filteredNotifications.filter(n => n.dismissed);

  const getUrgencyColor = (daysRemaining: number) => {
    if (daysRemaining <= 0) return 'bg-red-500';
    if (daysRemaining <= 1) return 'bg-orange-500';
    if (daysRemaining <= 3) return 'bg-yellow-500';
    return 'bg-blue-500';
  };

  const getUrgencyText = (daysRemaining: number) => {
    if (daysRemaining <= 0) return 'Expirado';
    if (daysRemaining === 1) return 'Expira amanhã';
    return `${daysRemaining} dias restantes`;
  };

  return (
    <div className="space-y-6">
      {/* Card de Configuração Push */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bell className="h-5 w-5 text-primary" />
            Configuração de Notificação Push
          </CardTitle>
          <CardDescription>
            Defina quantos dias antes da expiração o usuário receberá uma notificação push
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Notificação Push Ativa</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Ativar/desativar envio automático de push</p>
            </div>
            <Switch
              checked={pushConfig.enabled}
              onCheckedChange={(checked) => setPushConfig(prev => ({ ...prev, enabled: checked }))}
            />
          </div>
          <Separator />
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Dias antes da expiração</Label>
              <Badge variant="secondary" className="text-sm font-mono">
                {pushConfig.daysBeforeExpiry} {pushConfig.daysBeforeExpiry === 1 ? 'dia' : 'dias'}
              </Badge>
            </div>
            <Slider
              value={[pushConfig.daysBeforeExpiry]}
              onValueChange={([value]) => setPushConfig(prev => ({ ...prev, daysBeforeExpiry: value }))}
              min={1}
              max={15}
              step={1}
              disabled={!pushConfig.enabled}
            />
            <p className="text-xs text-muted-foreground">
              Usuários serão notificados quando faltarem {pushConfig.daysBeforeExpiry} dias ou menos para expirar
            </p>
          </div>
          <Button onClick={savePushConfig} disabled={savingConfig} size="sm" className="gap-1.5">
            {savingConfig ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Salvar Configuração
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2 text-yellow-500" />
                Notificações de Expiração
              </CardTitle>
              <CardDescription>
                Gerenciar avisos de expiração de assinatura dos usuários
              </CardDescription>
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                onClick={loadNotifications}
                disabled={loading}
                size="sm"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
              <Button
                onClick={runManualCheck}
                disabled={processing}
                size="sm"
              >
                <Play className={`h-4 w-4 mr-2 ${processing ? 'animate-spin' : ''}`} />
                {processing ? 'Verificando...' : 'Verificar Expirações'}
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Barra de pesquisa */}
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar por email ou nome..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>

          {/* Estatísticas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  <div>
                    <p className="text-sm font-medium">Notificações Ativas</p>
                    <p className="text-2xl font-bold">{activeNotifications.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="text-sm font-medium">Dispensadas</p>
                    <p className="text-2xl font-bold">{dismissedNotifications.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Clock className="h-5 w-5 text-yellow-500" />
                  <div>
                    <p className="text-sm font-medium">Total</p>
                    <p className="text-2xl font-bold">{filteredNotifications.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Separator />

          {/* Notificações Ativas */}
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2 text-red-500" />
              Notificações Ativas ({activeNotifications.length})
            </h3>
            
            {activeNotifications.length > 0 ? (
              <div className="space-y-3">
                {activeNotifications.map((notification) => (
                  <Card key={notification.id} className="border-l-4 border-l-red-500">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-2">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="font-medium">{notification.userName}</p>
                              <p className="text-sm text-muted-foreground">{notification.userEmail}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-sm">
                                Expira: {new Date(notification.expiryDate).toLocaleDateString('pt-BR')}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Criado: {new Date(notification.createdAt).toLocaleDateString('pt-BR')}
                              </p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Badge className={`${getUrgencyColor(notification.daysRemaining)} text-white`}>
                            {getUrgencyText(notification.daysRemaining)}
                          </Badge>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => dismissNotification(notification.userId)}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Dispensar
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <p className="text-muted-foreground">Nenhuma notificação ativa no momento</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Notificações Dispensadas */}
          {dismissedNotifications.length > 0 && (
            <>
              <Separator />
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <CheckCircle className="h-5 w-5 mr-2 text-green-500" />
                  Notificações Dispensadas ({dismissedNotifications.length})
                </h3>
                
                <div className="space-y-3">
                  {dismissedNotifications.map((notification) => (
                    <Card key={notification.id} className="border-l-4 border-l-green-500 opacity-75">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-2">
                              <Mail className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="font-medium">{notification.userName}</p>
                                <p className="text-sm text-muted-foreground">{notification.userEmail}</p>
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="text-sm">
                                  Expirava: {new Date(notification.expiryDate).toLocaleDateString('pt-BR')}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Criado: {new Date(notification.createdAt).toLocaleDateString('pt-BR')}
                                </p>
                              </div>
                            </div>
                          </div>
                          
                          <Badge className="bg-green-500 text-white">
                            Dispensada
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminExpirationNotifications;