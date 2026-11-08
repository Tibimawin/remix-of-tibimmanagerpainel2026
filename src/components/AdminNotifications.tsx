
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Bell, Send, Users, User } from 'lucide-react';
import { toast } from 'sonner';
import { db } from '@/config/firebase';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';

interface Notification {
  id: string;
  titulo: string;
  mensagem: string;
  tipo: 'info' | 'success' | 'warning' | 'error';
  destinatario: 'todos' | 'especifico';
  emailDestinatario?: string;
  dataEnvio: any;
  status: 'enviada' | 'pendente';
}

const AdminNotifications: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [formData, setFormData] = useState({
    titulo: '',
    mensagem: '',
    tipo: 'info' as 'info' | 'success' | 'warning' | 'error',
    destinatario: 'todos' as 'todos' | 'especifico',
    emailDestinatario: ''
  });

  useEffect(() => {
    const q = query(collection(db, 'notifications'), orderBy('dataEnvio', 'desc'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const notificationsData: Notification[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        notificationsData.push({
          id: doc.id,
          titulo: data.titulo,
          mensagem: data.mensagem,
          tipo: data.tipo,
          destinatario: data.destinatario,
          emailDestinatario: data.emailDestinatario,
          dataEnvio: data.dataEnvio,
          status: data.status
        });
      });
      setNotifications(notificationsData);
    });

    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.titulo || !formData.mensagem) {
      toast.error('Título e mensagem são obrigatórios');
      return;
    }

    if (formData.destinatario === 'especifico' && !formData.emailDestinatario) {
      toast.error('Email do destinatário é obrigatório');
      return;
    }

    try {
      const notificationData = {
        titulo: formData.titulo,
        mensagem: formData.mensagem,
        tipo: formData.tipo,
        destinatario: formData.destinatario,
        emailDestinatario: formData.emailDestinatario || null,
        dataEnvio: serverTimestamp(),
        status: 'enviada'
      };

      // Salvar notificação no Firestore
      await addDoc(collection(db, 'notifications'), notificationData);

      // Também salvar nas notificações dos usuários para que apareçam em tempo real
      const userNotificationData = {
        titulo: formData.titulo,
        mensagem: formData.mensagem,
        tipo: formData.tipo,
        dataRecebimento: serverTimestamp(),
        lida: false,
        destinatario: formData.destinatario,
        emailDestinatario: formData.emailDestinatario || null
      };

      await addDoc(collection(db, 'userNotifications'), userNotificationData);

      toast.success(
        formData.destinatario === 'todos' 
          ? 'Notificação enviada para todos os usuários!' 
          : `Notificação enviada para ${formData.emailDestinatario}!`
      );

      resetForm();
    } catch (error) {
      console.error('Erro ao enviar notificação:', error);
      toast.error('Erro ao enviar notificação');
    }
  };

  const resetForm = () => {
    setFormData({
      titulo: '',
      mensagem: '',
      tipo: 'info',
      destinatario: 'todos',
      emailDestinatario: ''
    });
  };

  const getTipoBadge = (tipo: string) => {
    const colors = {
      info: 'bg-blue-500',
      success: 'bg-green-500',
      warning: 'bg-yellow-500',
      error: 'bg-red-500'
    };
    
    return (
      <Badge className={colors[tipo as keyof typeof colors] || colors.info}>
        {tipo.charAt(0).toUpperCase() + tipo.slice(1)}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Formulário de Nova Notificação */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <Bell className="w-5 h-5 mr-2" />
            Enviar Notificação
          </CardTitle>
          <CardDescription className="text-slate-400">
            Envie notificações para todos os usuários ou para um usuário específico
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="titulo" className="text-slate-300">Título *</Label>
                <Input
                  id="titulo"
                  type="text"
                  value={formData.titulo}
                  onChange={(e) => setFormData({...formData, titulo: e.target.value})}
                  className="bg-slate-700 border-slate-600 text-white"
                  placeholder="Digite o título da notificação"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="tipo" className="text-slate-300">Tipo</Label>
                <select
                  id="tipo"
                  value={formData.tipo}
                  onChange={(e) => setFormData({...formData, tipo: e.target.value as any})}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white"
                >
                  <option value="info">Informação</option>
                  <option value="success">Sucesso</option>
                  <option value="warning">Aviso</option>
                  <option value="error">Erro</option>
                </select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="mensagem" className="text-slate-300">Mensagem *</Label>
              <Textarea
                id="mensagem"
                value={formData.mensagem}
                onChange={(e) => setFormData({...formData, mensagem: e.target.value})}
                className="bg-slate-700 border-slate-600 text-white"
                placeholder="Digite a mensagem da notificação"
                rows={4}
                required
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="destinatario" className="text-slate-300">Destinatário</Label>
                <select
                  id="destinatario"
                  value={formData.destinatario}
                  onChange={(e) => setFormData({...formData, destinatario: e.target.value as any})}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white"
                >
                  <option value="todos">Todos os usuários</option>
                  <option value="especifico">Usuário específico</option>
                </select>
              </div>
              
              {formData.destinatario === 'especifico' && (
                <div className="space-y-2">
                  <Label htmlFor="emailDestinatario" className="text-slate-300">Email do Usuário *</Label>
                  <Input
                    id="emailDestinatario"
                    type="email"
                    value={formData.emailDestinatario}
                    onChange={(e) => setFormData({...formData, emailDestinatario: e.target.value})}
                    className="bg-slate-700 border-slate-600 text-white"
                    placeholder="usuario@email.com"
                    required={formData.destinatario === 'especifico'}
                  />
                </div>
              )}
            </div>
            
            <div className="flex space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={resetForm}
                className="border-slate-600 text-white hover:bg-slate-700"
              >
                Limpar
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                <Send className="w-4 h-4 mr-2" />
                Enviar Notificação
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Histórico de Notificações */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Histórico de Notificações</CardTitle>
          <CardDescription className="text-slate-400">
            Visualize todas as notificações enviadas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {notifications.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow className="border-slate-700">
                  <TableHead className="text-slate-300">Título</TableHead>
                  <TableHead className="text-slate-300">Tipo</TableHead>
                  <TableHead className="text-slate-300">Destinatário</TableHead>
                  <TableHead className="text-slate-300">Data de Envio</TableHead>
                  <TableHead className="text-slate-300">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {notifications.map((notification) => (
                  <TableRow key={notification.id} className="border-slate-700">
                    <TableCell className="text-white">
                      <div>
                        <div className="font-medium">{notification.titulo}</div>
                        <div className="text-sm text-slate-400 mt-1 max-w-xs truncate">
                          {notification.mensagem}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{getTipoBadge(notification.tipo)}</TableCell>
                    <TableCell className="text-slate-300">
                      <div className="flex items-center">
                        {notification.destinatario === 'todos' ? (
                          <>
                            <Users className="w-4 h-4 mr-2" />
                            Todos os usuários
                          </>
                        ) : (
                          <>
                            <User className="w-4 h-4 mr-2" />
                            {notification.emailDestinatario}
                          </>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-300">
                      {notification.dataEnvio?.toDate ? 
                        notification.dataEnvio.toDate().toLocaleString('pt-BR') :
                        new Date(notification.dataEnvio).toLocaleString('pt-BR')
                      }
                    </TableCell>
                    <TableCell>
                      <Badge variant="default">Enviada</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <Bell className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-400">Nenhuma notificação enviada ainda.</p>
              <p className="text-sm text-slate-500 mt-2">Use o formulário acima para enviar sua primeira notificação.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminNotifications;
