
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bell, BellOff, X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { db } from '@/config/firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc, where, limit } from 'firebase/firestore';
import { useSimpleAuth } from '@/contexts/SimpleAuthContext';
import ExpirationWarningBanner from './ExpirationWarningBanner';

interface UserNotification {
  id: string;
  titulo: string;
  mensagem: string;
  tipo: 'info' | 'success' | 'warning' | 'error';
  dataRecebimento: any;
  lida: boolean;
  destinatario?: string;
  emailDestinatario?: string;
}

interface UserNotificationsProps {
  isOpen: boolean;
  onClose: () => void;
}

const UserNotifications: React.FC<UserNotificationsProps> = ({ isOpen, onClose }) => {
  const { userInfo } = useSimpleAuth();
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!userInfo?.email) return;
    
    // Escutar notificações recentes do Firestore
    const q = query(
      collection(db, 'userNotifications'), 
      orderBy('dataRecebimento', 'desc'),
      limit(30)
    );
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const notificationsData: UserNotification[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        // Mostrar notificação para todos ou se for específica para este usuário
        if (data.destinatario === 'todos' || data.emailDestinatario === userInfo.email) {
          notificationsData.push({
            id: doc.id,
            titulo: data.titulo,
            mensagem: data.mensagem,
            tipo: data.tipo,
            dataRecebimento: data.dataRecebimento,
            lida: data.lida || false,
            destinatario: data.destinatario,
            emailDestinatario: data.emailDestinatario
          });
        }
      });
      setNotifications(notificationsData);
      const unread = notificationsData.filter(n => !n.lida).length;
      setUnreadCount(unread);
    });

    return () => unsubscribe();
  }, [userInfo?.email]);

  const markAsRead = async (notificationId: string) => {
    try {
      const notificationRef = doc(db, 'userNotifications', notificationId);
      await updateDoc(notificationRef, {
        lida: true
      });
    } catch (error) {
      console.error('Erro ao marcar notificação como lida:', error);
      toast.error('Erro ao marcar notificação como lida');
    }
  };

  const markAllAsRead = async () => {
    try {
      const promises = notifications
        .filter(n => !n.lida)
        .map(notification => {
          const notificationRef = doc(db, 'userNotifications', notification.id);
          return updateDoc(notificationRef, { lida: true });
        });
      
      await Promise.all(promises);
      toast.success('Todas as notificações foram marcadas como lidas');
    } catch (error) {
      console.error('Erro ao marcar todas como lidas:', error);
      toast.error('Erro ao marcar todas como lidas');
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      await deleteDoc(doc(db, 'userNotifications', notificationId));
      toast.success('Notificação excluída');
    } catch (error) {
      console.error('Erro ao excluir notificação:', error);
      toast.error('Erro ao excluir notificação');
    }
  };

  const getNotificationIcon = (tipo: string) => {
    switch (tipo) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-400" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-400" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-400" />;
      default:
        return <Info className="h-5 w-5 text-blue-400" />;
    }
  };

  const getTipoBadge = (tipo: string) => {
    const colors = {
      info: 'bg-blue-500',
      success: 'bg-green-500',
      warning: 'bg-yellow-500',
      error: 'bg-red-500'
    };
    
    return (
      <Badge className={`${colors[tipo as keyof typeof colors] || colors.info} text-white`}>
        {tipo.charAt(0).toUpperCase() + tipo.slice(1)}
      </Badge>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 netflix-animate-in">
      <Card className="max-w-2xl w-full max-h-[80vh] overflow-hidden netflix-card bg-card/95 backdrop-blur-xl">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-white flex items-center">
            <Bell className="h-5 w-5 mr-2" />
            Notificações
            {unreadCount > 0 && (
              <Badge className="ml-2 bg-red-500 text-white">
                {unreadCount}
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center space-x-2">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Marcar todas como lidas
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="p-2 h-8 w-8 rounded-full netflix-button bg-red-600 hover:bg-red-700 text-white"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="overflow-y-auto max-h-[60vh] space-y-4">
          {/* Banner de Expiração */}
          <ExpirationWarningBanner 
            onRenewClick={() => {
              onClose();
              // Redirecionar para página de renovação ou planos
              window.location.href = '/precos';
            }}
          />

          {/* Indicador de status das notificações não lidas */}
          <div
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
              unreadCount > 0
                ? 'border-blue-400/40 bg-blue-500/10 text-blue-200'
                : 'border-border/40 bg-muted/30 text-muted-foreground'
            }`}
          >
            {unreadCount > 0 ? (
              <>
                <Bell className="h-4 w-4" />
                <span>
                  Você tem <strong>{unreadCount}</strong> notificação{unreadCount === 1 ? '' : 'ões'} não lida{unreadCount === 1 ? '' : 's'}.
                </span>
              </>
            ) : (
              <>
                <BellOff className="h-4 w-4" />
                <span>Você não tem notificações novas.</span>
              </>
            )}
          </div>
          
          {notifications.length > 0 ? (
            notifications.map((notification) => (
              <div
                key={notification.id}
                className={`netflix-card p-4 border transition-all duration-200 ${
                  !notification.lida 
                    ? 'border-blue-400/50 bg-blue-500/10' 
                    : 'border-border/30 bg-background/50'
                }`}
              >
                <div className="flex items-start justify-between space-x-3">
                  <div className="flex items-start space-x-3 flex-1">
                    {getNotificationIcon(notification.tipo)}
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-foreground">{notification.titulo}</h4>
                        {getTipoBadge(notification.tipo)}
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {notification.mensagem}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {notification.dataRecebimento?.toDate ? 
                          notification.dataRecebimento.toDate().toLocaleString('pt-BR') :
                          new Date(notification.dataRecebimento).toLocaleString('pt-BR')
                        }
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {!notification.lida && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => markAsRead(notification.id)}
                        className="text-xs text-blue-400 hover:text-blue-300"
                      >
                        Marcar como lida
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteNotification(notification.id)}
                      className="p-1 h-7 w-7 text-red-400 hover:text-red-300"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12">
              <Bell className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground text-lg">Nenhuma notificação</p>
              <p className="text-sm text-muted-foreground mt-2">
                Quando o sistema enviar notificações, elas aparecerão aqui.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default UserNotifications;
