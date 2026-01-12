import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { FirebaseUser, FirebaseUserService } from '@/services/FirebaseUserService';
import { ExpirationNotificationService } from '@/services/ExpirationNotificationService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Calendar, CalendarDays, Edit, Plus, Shield, ShieldOff, Users } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface EditUserModalProps {
  user: FirebaseUser;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const EditUserModal: React.FC<EditUserModalProps> = ({ user, isOpen, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [hasAutomacaoFeature, setHasAutomacaoFeature] = useState(false);
  const [loadingPermissions, setLoadingPermissions] = useState(true);
  const [formData, setFormData] = useState({
    name: user.name,
    email: user.email,
    accessDays: user.accessDays,
    startDate: user.startDate ? user.startDate.split('T')[0] : '',
    expiryDate: user.expiryDate ? user.expiryDate.split('T')[0] : '',
    isActive: user.isActive
  });

  // Carregar permissões atuais ao abrir o modal
  useEffect(() => {
    const loadUserPermissions = async () => {
      if (!isOpen || !user.uid) return;

      setLoadingPermissions(true);
      try {
        const { getDoc } = await import('firebase/firestore');
        const permissionsRef = doc(db, 'userPermissions', user.uid);
        const permissionsDoc = await getDoc(permissionsRef);

        if (permissionsDoc.exists()) {
          const permissions = permissionsDoc.data();
          const enabledFeatures = permissions.enabledFeatures || [];
          setHasAutomacaoFeature(enabledFeatures.includes('automacao'));
          console.log('✅ Permissões carregadas:', { enabledFeatures, hasAutomacao: enabledFeatures.includes('automacao') });
        } else {
          console.warn('⚠️ Permissões não encontradas para usuário:', user.uid);
          setHasAutomacaoFeature(false);
        }
      } catch (error) {
        console.error('❌ Erro ao carregar permissões:', error);
        setHasAutomacaoFeature(false);
      } finally {
        setLoadingPermissions(false);
      }
    };

    loadUserPermissions();
  }, [isOpen, user.uid]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const updates = {
        name: formData.name,
        email: formData.email,
        accessDays: Number(formData.accessDays),
        startDate: new Date(formData.startDate).toISOString(),
        expiryDate: new Date(formData.expiryDate).toISOString(),
        isActive: formData.isActive
      };

      await FirebaseUserService.updateUser(user.uid, updates);

      // Atualizar permissões incluindo enabledFeatures
      const { getDoc } = await import('firebase/firestore');
      const permissionsRef = doc(db, 'userPermissions', user.uid);
      const permissionsDoc = await getDoc(permissionsRef);

      // Pegar features atuais e atualizar automacao
      const currentPermissions = permissionsDoc.exists() ? permissionsDoc.data() : {};
      const currentFeatures = currentPermissions.enabledFeatures || [];

      // Adicionar ou remover 'automacao' baseado no toggle
      let updatedFeatures = [...currentFeatures];
      if (hasAutomacaoFeature && !updatedFeatures.includes('automacao')) {
        updatedFeatures.push('automacao');
        console.log('✅ Adicionando feature automacao');
      } else if (!hasAutomacaoFeature && updatedFeatures.includes('automacao')) {
        updatedFeatures = updatedFeatures.filter(f => f !== 'automacao');
        console.log('🚫 Removendo feature automacao');
      }

      await updateDoc(permissionsRef, {
        userName: formData.name,
        userEmail: formData.email,
        expiryDate: updates.expiryDate,
        isActive: formData.isActive,
        enabledFeatures: updatedFeatures,
        lastUpdated: new Date().toISOString()
      });

      // Verificar se o acesso foi estendido e remover notificações de expiração
      const now = new Date();
      const newExpiryDate = new Date(updates.expiryDate);
      const daysRemaining = Math.ceil((newExpiryDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));

      if (daysRemaining > 5) {
        console.log('🔔 Removendo notificações de expiração para usuário com acesso estendido');
        await ExpirationNotificationService.dismissExpirationNotification(user.uid);

        // Remover também notificações gerais de expiração que possam existir
        await ExpirationNotificationService.removeAllUserExpirationNotifications(user.email);
      }

      toast.success('Usuário atualizado com sucesso!');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Erro ao atualizar usuário:', error);
      toast.error('Erro ao atualizar usuário');
    } finally {
      setLoading(false);
    }
  };

  const extendAccess = async (days: number) => {
    setLoading(true);
    try {
      await FirebaseUserService.extendUserAccess(user.uid, days);

      // Remover notificações de expiração após estender acesso
      console.log('🔔 Removendo notificações de expiração após extensão de acesso');
      await ExpirationNotificationService.dismissExpirationNotification(user.uid);
      await ExpirationNotificationService.removeAllUserExpirationNotifications(user.email);

      toast.success(`Acesso estendido em ${days} dias!`);
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Erro ao estender acesso:', error);
      toast.error('Erro ao estender acesso');
    } finally {
      setLoading(false);
    }
  };

  const toggleUserStatus = async () => {
    setLoading(true);
    try {
      if (user.isActive) {
        await FirebaseUserService.deactivateUser(user.uid);
        toast.success('Usuário desativado com sucesso!');
      } else {
        await FirebaseUserService.updateUser(user.uid, { isActive: true });

        // Atualizar permissões também
        const permissionsRef = doc(db, 'userPermissions', user.uid);
        await updateDoc(permissionsRef, {
          isActive: true,
          lastUpdated: new Date().toISOString()
        });

        // Verificar se o usuário tem acesso válido e remover notificações se necessário
        const userData = await FirebaseUserService.getUserById(user.uid);
        if (userData) {
          const now = new Date();
          const expiryDate = new Date(userData.expiryDate);
          const daysRemaining = Math.ceil((expiryDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));

          if (daysRemaining > 5) {
            console.log('🔔 Removendo notificações de expiração para usuário reativado');
            await ExpirationNotificationService.dismissExpirationNotification(user.uid);
            await ExpirationNotificationService.removeAllUserExpirationNotifications(user.email);
          }
        }

        toast.success('Usuário ativado com sucesso!');
      }
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Erro ao alterar status do usuário:', error);
      toast.error('Erro ao alterar status do usuário');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            Editar Usuário: {user.name}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="accessDays">Dias de Acesso</Label>
              <Input
                id="accessDays"
                type="number"
                value={formData.accessDays}
                onChange={(e) => setFormData({ ...formData, accessDays: Number(e.target.value) })}
                required
              />
            </div>
            <div>
              <Label htmlFor="startDate">Data de Início</Label>
              <Input
                id="startDate"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="expiryDate">Data de Expiração</Label>
              <Input
                id="expiryDate"
                type="date"
                value={formData.expiryDate}
                onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="rounded"
            />
            <Label htmlFor="isActive">Usuário Ativo</Label>
          </div>

          {/* Controle de Automação */}
          <div className="p-4 rounded-lg border border-purple-500/30 bg-purple-500/5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="hasAutomacao"
                  checked={hasAutomacaoFeature}
                  onChange={(e) => setHasAutomacaoFeature(e.target.checked)}
                  disabled={loadingPermissions}
                  className="rounded"
                />
                <Label htmlFor="hasAutomacao" className="text-sm font-semibold">
                  🤖 Funcionalidade de Automação
                </Label>
              </div>
              {loadingPermissions && (
                <span className="text-xs text-muted-foreground">Carregando...</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground ml-6">
              Permite que o usuário utilize a importação automática agendada de conteúdos.
              {!formData.isActive && (
                <span className="block mt-1 text-amber-500">
                  ⚠️ Usuário precisa estar ativo para usar automação
                </span>
              )}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => extendAccess(1)}
              disabled={loading}
            >
              +1 Dia
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => extendAccess(7)}
              disabled={loading}
            >
              +7 Dias
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => extendAccess(30)}
              disabled={loading}
            >
              +30 Dias
            </Button>
            <Button
              type="button"
              variant={user.isActive ? "destructive" : "default"}
              onClick={toggleUserStatus}
              disabled={loading}
            >
              {user.isActive ? (
                <>
                  <ShieldOff className="h-4 w-4 mr-1" />
                  Desativar
                </>
              ) : (
                <>
                  <Shield className="h-4 w-4 mr-1" />
                  Ativar
                </>
              )}
            </Button>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export const AdminFirebaseUsers: React.FC = () => {
  const [users, setUsers] = useState<FirebaseUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<FirebaseUser | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    console.log('🔄 Iniciando listener em tempo real para usuários Firebase');

    const usersRef = collection(db, 'users');
    const q = query(usersRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const userData: FirebaseUser[] = [];
        snapshot.forEach((doc) => {
          userData.push({ uid: doc.id, ...doc.data() } as FirebaseUser);
        });

        console.log('📡 Dados de usuários atualizados em tempo real:', userData.length);
        setUsers(userData);
        setLoading(false);
      },
      (error) => {
        console.error('❌ Erro no listener de usuários:', error);
        setLoading(false);
        toast.error('Erro ao carregar usuários');
      }
    );

    return () => {
      console.log('🔥 Removendo listener de usuários');
      unsubscribe();
    };
  }, []);

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEditUser = (user: FirebaseUser) => {
    setSelectedUser(user);
    setEditModalOpen(true);
  };

  const handleModalClose = () => {
    setEditModalOpen(false);
    setSelectedUser(null);
  };

  const handleSuccess = () => {
    // O listener em tempo real já vai atualizar automaticamente
    toast.success('Dados atualizados em tempo real!');
  };

  const getDaysRemaining = (user: FirebaseUser): number => {
    const now = new Date();
    const expiry = new Date(user.expiryDate);
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  const getStatusBadge = (user: FirebaseUser) => {
    const daysRemaining = getDaysRemaining(user);

    if (!user.isActive) {
      return <Badge variant="destructive">Inativo</Badge>;
    }

    if (daysRemaining <= 0) {
      return <Badge variant="destructive">Expirado</Badge>;
    }

    if (daysRemaining <= 3) {
      return <Badge variant="destructive">Expira em {daysRemaining} dias</Badge>;
    }

    if (daysRemaining <= 7) {
      return <Badge variant="secondary">Expira em {daysRemaining} dias</Badge>;
    }

    return <Badge variant="default">{daysRemaining} dias restantes</Badge>;
  };

  const activeUsers = users.filter(u => u.isActive && getDaysRemaining(u) > 0).length;
  const expiredUsers = users.filter(u => !u.isActive || getDaysRemaining(u) <= 0).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Carregando usuários...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuários Ativos</CardTitle>
            <Shield className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activeUsers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuários Expirados</CardTitle>
            <ShieldOff className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{expiredUsers}</div>
          </CardContent>
        </Card>
      </div>

      {/* Barra de pesquisa */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Gerenciamento de Usuários Firebase</h2>
          <p className="text-muted-foreground">Gerencie usuários em tempo real</p>
        </div>
        <div className="w-80">
          <Input
            placeholder="Buscar por nome ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Lista de usuários */}
      <div className="grid gap-4">
        {filteredUsers.map((user) => (
          <Card key={user.uid} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{user.name}</h3>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {getStatusBadge(user)}
                      <Badge variant="outline">
                        <CalendarDays className="h-3 w-3 mr-1" />
                        {user.accessDays} dias totais
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="text-right space-y-2">
                  <div className="text-sm text-muted-foreground">
                    <div>Criado: {format(new Date(user.createdAt), 'dd/MM/yyyy', { locale: ptBR })}</div>
                    <div>Expira: {format(new Date(user.expiryDate), 'dd/MM/yyyy', { locale: ptBR })}</div>
                    <div>Total de logins: {user.totalLogins}</div>
                  </div>

                  <Button
                    onClick={() => handleEditUser(user)}
                    size="sm"
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Gerenciar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredUsers.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum usuário encontrado</h3>
            <p className="text-muted-foreground">
              {searchTerm ? 'Tente ajustar os termos de pesquisa.' : 'Não há usuários cadastrados ainda.'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Modal de edição */}
      {selectedUser && (
        <EditUserModal
          user={selectedUser}
          isOpen={editModalOpen}
          onClose={handleModalClose}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
};