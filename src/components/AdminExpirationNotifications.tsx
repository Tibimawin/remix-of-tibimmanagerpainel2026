import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { 
  AlertTriangle, 
  Calendar, 
  Play, 
  RefreshCw, 
  Search, 
  Clock,
  CheckCircle,
  XCircle,
  Mail
} from 'lucide-react';
import { toast } from 'sonner';
import { ExpirationNotificationService, type ExpirationNotification } from '@/services/ExpirationNotificationService';

const AdminExpirationNotifications: React.FC = () => {
  const [notifications, setNotifications] = useState<ExpirationNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

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
  }, []);

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