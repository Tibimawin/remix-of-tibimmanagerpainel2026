import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, doc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { FirebaseUser, FirebaseUserService } from '@/services/FirebaseUserService';
import { ExpirationNotificationService } from '@/services/ExpirationNotificationService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, Calendar, CalendarDays, Edit, Plus, Shield, ShieldOff, Users, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';


const UserPlanBadge: React.FC<{ userId: string }> = ({ userId }) => {
  const [planName, setPlanName] = useState<string>('Carregando...');

  useEffect(() => {
    const getPlan = async () => {
      try {
        const { getDoc } = await import('firebase/firestore');
        const permissionsRef = doc(db, 'userPermissions', userId);
        const permissionsDoc = await getDoc(permissionsRef);
        if (permissionsDoc.exists()) {
          setPlanName(permissionsDoc.data().planName || 'Básico');
        } else {
          setPlanName('Básico');
        }
      } catch (err) {
        setPlanName('Erro');
      }
    };
    getPlan();
  }, [userId]);

  return (
    <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-[10px] py-0 h-4 ml-2">
      {planName}
    </Badge>
  );
};

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
  const [plans, setPlans] = useState<any[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [customDays, setCustomDays] = useState('');
  const [formData, setFormData] = useState({
    name: user.name,
    email: user.email,
    accessDays: user.accessDays,
    startDate: user.startDate ? user.startDate.split('T')[0] : '',
    expiryDate: user.expiryDate ? user.expiryDate.split('T')[0] : '',
    isActive: user.isActive
  });

  // Carregar permissões atuais e planos ao abrir o modal
  useEffect(() => {
    const loadData = async () => {
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
          setSelectedPlanId(permissions.planId || '');
          console.log('✅ Permissões carregadas:', { enabledFeatures, planId: permissions.planId });
        } else {
          console.warn('⚠️ Permissões não encontradas para usuário:', user.uid);
          setHasAutomacaoFeature(false);
          setSelectedPlanId('');
        }

        // Carregar planos reais para o seletor
        const { PlansService } = await import('@/services/PlansService');
        const allPlans = await PlansService.getAllPlans();
        setPlans(allPlans);

      } catch (error) {
        console.error('❌ Erro ao carregar dados do usuário:', error);
        setHasAutomacaoFeature(false);
      } finally {
        setLoadingPermissions(false);
      }
    };

    loadData();
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

      const selectedPlan = plans.find(p => p.id === selectedPlanId);

      await setDoc(permissionsRef, {
        userName: formData.name,
        userEmail: formData.email,
        expiryDate: updates.expiryDate,
        isActive: formData.isActive,
        enabledFeatures: updatedFeatures,
        planId: selectedPlanId,
        planName: selectedPlan ? selectedPlan.name : (currentPermissions.planName || 'Básico'),
        lastUpdated: new Date().toISOString()
      }, { merge: true });

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

        // Atualizar permissões também (usando setDoc com merge para evitar quebras se o documento não existir)
        const permissionsRef = doc(db, 'userPermissions', user.uid);
        await setDoc(permissionsRef, {
          isActive: true,
          lastUpdated: new Date().toISOString()
        }, { merge: true });

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

  const handleDeleteUser = async () => {
    if (!window.confirm(`Tem certeza absoluta que deseja excluir permanentemente o usuário ${user.name} (${user.email})? Esta ação não pode ser desfeita.`)) {
      return;
    }
    setLoading(true);
    try {
      await FirebaseUserService.deleteUser(user.uid);
      toast.success('Usuário excluído com sucesso!');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Erro ao excluir usuário:', error);
      toast.error('Erro ao excluir usuário');
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

          <div className="grid grid-cols-2 gap-4 items-end">
            <div className="space-y-2">
              <Label htmlFor="planSelect">Plano Ativo (Configuração Manual)</Label>
              <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione um plano" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="basic">Gratuito (Padrão)</SelectItem>
                  {plans.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.name} (R$ {plan.price})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2 h-10">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="rounded h-4 w-4"
              />
              <Label htmlFor="isActive">Usuário Ativo</Label>
            </div>
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

          <div className="flex flex-wrap gap-2 items-center">
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

            <div className="flex items-center gap-2 border border-purple-500/20 bg-purple-500/5 p-1 rounded-md">
              <Input
                type="number"
                placeholder="Outro (dias)"
                value={customDays}
                onChange={(e) => setCustomDays(e.target.value)}
                disabled={loading}
                className="w-24 h-8 text-xs bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="h-8 text-xs bg-purple-600 hover:bg-purple-700 text-white"
                onClick={() => {
                  const days = parseInt(customDays);
                  if (isNaN(days) || days <= 0) {
                    toast.error('Insira um número válido de dias');
                    return;
                  }
                  extendAccess(days);
                }}
                disabled={loading || !customDays}
              >
                Renovar
              </Button>
            </div>

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
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteUser}
              disabled={loading}
              className="bg-red-600 hover:bg-red-700 text-white ml-auto"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Excluir Usuário
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
  const [selectedUids, setSelectedUids] = useState<string[]>([]);
  const [isBulkLoading, setIsBulkLoading] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ processed: 0, total: 0, failures: [] as { uid: string; error: string }[] });
  const [plans, setPlans] = useState<any[]>([]);


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

    // Carregar planos para troca em massa
    const loadPlans = async () => {
      try {
        const { PlansService } = await import('@/services/PlansService');
        const allPlans = await PlansService.getAllPlans();
        setPlans(allPlans);
      } catch (err) {
        console.error('Erro ao carregar planos:', err);
      }
    };
    loadPlans();

    return () => {
      console.log('🔥 Removendo listener de usuários');
      unsubscribe();
    };
  }, []);

  const toggleSelectUser = (uid: string) => {
    setSelectedUids(prev => 
      prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
    );
  };

  const toggleSelectAll = () => {
    if (selectedUids.length === filteredUsers.length) {
      setSelectedUids([]);
    } else {
      setSelectedUids(filteredUsers.map(u => u.uid));
    }
  };

  const handleBulkRenew = async (days: number) => {
    if (selectedUids.length === 0) return;
    setIsBulkLoading(true);
    setBulkProgress({ processed: 0, total: selectedUids.length, failures: [] });
    
    try {
      const result = await FirebaseUserService.bulkExtendAccess(
        selectedUids, 
        days,
        (processed, total, failures) => setBulkProgress({ processed, total, failures })
      );
      
      if (result.failures.length > 0) {
        toast.warning(`${result.success} renovados, ${result.failures.length} falharam.`);
      } else {
        toast.success(`${selectedUids.length} usuários renovados com sucesso!`);
      }
      if (result.failures.length === 0) setSelectedUids([]);
    } catch (error) {
      toast.error('Erro ao renovar usuários em massa');
    } finally {
      setIsBulkLoading(false);
    }
  };

  const handleBulkBan = async () => {
    if (selectedUids.length === 0) return;
    if (!window.confirm(`Tem certeza que deseja desativar ${selectedUids.length} usuários?`)) return;
    setIsBulkLoading(true);
    setBulkProgress({ processed: 0, total: selectedUids.length, failures: [] });
    
    try {
      const result = await FirebaseUserService.bulkUpdateUsers(
        selectedUids, 
        { isActive: false },
        (processed, total, failures) => setBulkProgress({ processed, total, failures })
      );
      
      if (result.failures.length > 0) {
        toast.warning(`${result.success} desativados, ${result.failures.length} falharam.`);
      } else {
        toast.success(`${selectedUids.length} usuários desativados!`);
      }
      if (result.failures.length === 0) setSelectedUids([]);
    } catch (error) {
      toast.error('Erro ao desativar usuários');
    } finally {
      setIsBulkLoading(false);
    }
  };

  const handleBulkChangePlan = async (planId: string, planName: string) => {
    if (selectedUids.length === 0) return;
    setIsBulkLoading(true);
    setBulkProgress({ processed: 0, total: selectedUids.length, failures: [] });
    
    try {
      const result = await FirebaseUserService.bulkUpdatePlan(
        selectedUids, 
        planId, 
        planName,
        (processed, total, failures) => setBulkProgress({ processed, total, failures })
      );
      
      if (result.failures.length > 0) {
        toast.warning(`${result.success} planos alterados, ${result.failures.length} falharam.`);
      } else {
        toast.success(`Plano alterado para ${selectedUids.length} usuários!`);
      }
      if (result.failures.length === 0) setSelectedUids([]);
    } catch (error) {
      toast.error('Erro ao alterar planos');
    } finally {
      setIsBulkLoading(false);
    }
  };


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

      {/* Barra de pesquisa e Ações em Massa */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Gerenciamento de Usuários Firebase</h2>
          <p className="text-muted-foreground">Gerencie usuários em tempo real</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <Input
            placeholder="Buscar por nome ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full md:w-80"
          />
        </div>
      </div>

      {selectedUids.length > 0 && (
        <Card className="bg-primary/5 border-primary/20 animate-in fade-in slide-in-from-top-2 overflow-hidden">
          <CardContent className="p-4 flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Badge variant="default" className="text-sm">
                  {selectedUids.length} selecionados
                </Badge>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setSelectedUids([])}
                  className="text-xs"
                  disabled={isBulkLoading}
                >
                  Cancelar
                </Button>
              </div>
              
              <div className="flex flex-wrap gap-2">
                <Select onValueChange={(val) => handleBulkRenew(Number(val))} disabled={isBulkLoading}>
                  <SelectTrigger className="w-[140px] h-8 text-xs">
                    <SelectValue placeholder="Renovar..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">+1 Dia</SelectItem>
                    <SelectItem value="7">+7 Dias</SelectItem>
                    <SelectItem value="30">+30 Dias</SelectItem>
                  </SelectContent>
                </Select>

                <Select onValueChange={(val) => {
                  const plan = plans.find(p => p.id === val);
                  if (plan) handleBulkChangePlan(plan.id, plan.name);
                }} disabled={isBulkLoading}>
                  <SelectTrigger className="w-[140px] h-8 text-xs">
                    <SelectValue placeholder="Trocar Plano..." />
                  </SelectTrigger>
                  <SelectContent>
                    {plans.map(plan => (
                      <SelectItem key={plan.id} value={plan.id}>{plan.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button 
                  variant="destructive" 
                  size="sm" 
                  className="h-8 text-xs"
                  onClick={handleBulkBan}
                  disabled={isBulkLoading}
                >
                  <ShieldOff className="h-3 w-3 mr-1" />
                  Desativar Todos
                </Button>
              </div>
            </div>

            {isBulkLoading && (
              <div className="space-y-2 py-2">
                <div className="flex justify-between text-xs font-medium">
                  <span>Processando...</span>
                  <span>{bulkProgress.processed} / {bulkProgress.total}</span>
                </div>
                <Progress value={(bulkProgress.processed / bulkProgress.total) * 100} className="h-1.5" />
              </div>
            )}

            {bulkProgress.failures.length > 0 && (
              <div className="mt-2 p-3 bg-red-500/10 border border-red-500/20 rounded-md">
                <div className="flex items-center gap-2 text-red-500 text-xs font-bold mb-2">
                  <AlertCircle className="h-3.5 w-3.5" />
                  Falhas Detectadas ({bulkProgress.failures.length})
                </div>
                <div className="max-h-24 overflow-y-auto space-y-1">
                  {bulkProgress.failures.map((failure, idx) => {
                    const user = users.find(u => u.uid === failure.uid);
                    return (
                      <div key={idx} className="text-[10px] text-red-400 flex justify-between">
                        <span>{user?.name || failure.uid}:</span>
                        <span className="italic">{failure.error}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}


      {/* Lista de usuários */}
      <div className="flex items-center gap-2 mb-2 px-2">
        <input 
          type="checkbox" 
          checked={selectedUids.length === filteredUsers.length && filteredUsers.length > 0}
          onChange={toggleSelectAll}
          className="rounded border-gray-300 text-primary focus:ring-primary"
        />
        <span className="text-sm text-muted-foreground">Selecionar Todos</span>
      </div>

      <div className="grid gap-4">
        {filteredUsers.map((user) => {
          // Vamos buscar o plano deste usuário em tempo real a partir de um mapa de permissões
          // Para evitar complexidade de N hooks, usaremos o componente UserPlanBadge
          return (
            <Card 
              key={user.uid} 
              className={`hover:shadow-md transition-all duration-200 ${selectedUids.includes(user.uid) ? 'border-primary bg-primary/5' : ''}`}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <input 
                      type="checkbox" 
                      checked={selectedUids.includes(user.uid)}
                      onChange={() => toggleSelectUser(user.uid)}
                      className="rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                      <Users className="h-6 w-6 text-primary" />
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{user.name}</h3>
                        <UserPlanBadge userId={user.uid} />
                      </div>
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
          );
        })}
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