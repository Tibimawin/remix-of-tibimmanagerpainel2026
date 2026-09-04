import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, doc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { FirebaseUser, FirebaseUserService } from '@/services/FirebaseUserService';
import { ExpirationNotificationService } from '@/services/ExpirationNotificationService';
import { useConfig } from '@/contexts/ConfigContext';
import { BaserowUserSyncService } from '@/services/BaserowUserSyncService';
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

// Utilitários de data à prova de falhas para inputs date e sincronização
const toYMD = (dateVal: any): string => {
  if (!dateVal) return '';
  if (typeof dateVal === 'string') {
    const trimmed = dateVal.trim();
    const brMatch = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (brMatch) {
      return `${brMatch[3]}-${brMatch[2].padStart(2, '0')}-${brMatch[1].padStart(2, '0')}`;
    }
    const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }
  const d = new Date(dateVal);
  return isNaN(d.getTime()) ? '' : d.toISOString().split('T')[0];
};

const toSafeISO = (dateVal: any): string => {
  if (!dateVal) return new Date().toISOString();
  if (typeof dateVal === 'string') {
    const trimmed = dateVal.trim();
    const brMatch = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (brMatch) {
      const day = parseInt(brMatch[1], 10);
      const month = parseInt(brMatch[2], 10) - 1;
      const year = parseInt(brMatch[3], 10);
      const d = new Date(Date.UTC(year, month, day, 23, 59, 59));
      if (!isNaN(d.getTime())) return d.toISOString();
    }
  }
  const ymd = toYMD(dateVal);
  if (ymd) {
    const [y, m, d] = ymd.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d, 23, 59, 59)).toISOString();
  }
  const d = new Date(dateVal);
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
};

const EditUserModal: React.FC<EditUserModalProps> = ({ user, isOpen, onClose, onSuccess }) => {
  const { config } = useConfig();
  const [loading, setLoading] = useState(false);
  const [hasAutomacaoFeature, setHasAutomacaoFeature] = useState(false);
  const [loadingPermissions, setLoadingPermissions] = useState(true);
  const [plans, setPlans] = useState<any[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [customDays, setCustomDays] = useState('');
  const [formData, setFormData] = useState({
    name: user.name || '',
    email: user.email || '',
    accessDays: user.accessDays || 0,
    startDate: toYMD(user.startDate),
    expiryDate: toYMD(user.expiryDate),
    isActive: user.isActive ?? true
  });

  // Atualizar formData sempre que o modal abrir ou o usuário mudar
  useEffect(() => {
    if (isOpen && user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        accessDays: user.accessDays || 0,
        startDate: toYMD(user.startDate),
        expiryDate: toYMD(user.expiryDate),
        isActive: user.isActive ?? true
      });
      setLoading(false);
      setCustomDays('');
    }
  }, [isOpen, user]);

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

  // Adiciona dias ao formulário e calcula nova expiração instantaneamente
  const handleAddDaysToForm = (days: number) => {
    const currentExpiryYMD = formData.expiryDate || toYMD(user.expiryDate);
    let baseDate = new Date();
    if (currentExpiryYMD) {
      const parsed = new Date(toSafeISO(currentExpiryYMD));
      // Se a data for válida, no futuro, e NÃO for anomalia de anos multiplicados
      if (!isNaN(parsed.getTime()) && parsed > new Date() && parsed.getFullYear() <= 2028) {
        baseDate = parsed;
      }
    }
    baseDate.setDate(baseDate.getDate() + days);
    const newExpiryYMD = toYMD(baseDate);

    // Se os dias atuais forem anormais (> 365), redefinir para a quantidade adicionada
    const currentDays = Number(formData.accessDays) || 0;
    const newAccessDays = currentDays > 365 ? days : Math.max(0, currentDays + days);

    setFormData(prev => ({
      ...prev,
      accessDays: newAccessDays,
      expiryDate: newExpiryYMD,
      isActive: true
    }));

    toast.info(`+${days} dias adicionados ao formulário! Expiração: ${baseDate.toLocaleDateString('pt-BR')}. Clique em "Salvar Alterações" para sincronizar com o Baserow.`);
  };

  // Corrige cálculo defeituoso e redefine para 30 dias exatos
  const handleFixAnomalousPlan = () => {
    let start = new Date();
    const existingStart = (user as any).lastSubscriptionDate || user.startDate;
    if (existingStart) {
      const parsed = new Date(existingStart);
      if (!isNaN(parsed.getTime())) {
        start = parsed;
      }
    }
    const expiry = new Date(start);
    expiry.setDate(start.getDate() + 30);

    setFormData(prev => ({
      ...prev,
      startDate: toYMD(start),
      expiryDate: toYMD(expiry),
      accessDays: 30,
      isActive: true
    }));

    toast.success('Formulário recalculado para 30 dias exatos a partir da data de assinatura! Clique em "Salvar Alterações" para sincronizar.');
  };

  // Salvar no Firebase e Sincronizar com o Baserow
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const safeStartDate = toSafeISO(formData.startDate);
      const safeExpiryDate = toSafeISO(formData.expiryDate);

      const updates = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        accessDays: Number(formData.accessDays) || 0,
        startDate: safeStartDate,
        expiryDate: safeExpiryDate,
        isActive: Boolean(formData.isActive)
      };

      console.log('💾 [EditUserModal] Salvando atualizações no Firebase:', updates);
      await FirebaseUserService.updateUser(user.uid, updates);

      // Atualizar permissões incluindo enabledFeatures
      try {
        const { getDoc } = await import('firebase/firestore');
        const permissionsRef = doc(db, 'userPermissions', user.uid);
        const permissionsDoc = await getDoc(permissionsRef);

        const currentPermissions = permissionsDoc.exists() ? permissionsDoc.data() : {};
        const currentFeatures = currentPermissions.enabledFeatures || [];

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
          userName: updates.name,
          userEmail: updates.email,
          expiryDate: updates.expiryDate,
          isActive: updates.isActive,
          enabledFeatures: updatedFeatures,
          planId: selectedPlanId,
          planName: selectedPlan ? selectedPlan.name : (currentPermissions.planName || 'Básico'),
          lastUpdated: new Date().toISOString()
        }, { merge: true });
      } catch (permErr) {
        console.warn('⚠️ Erro ao atualizar permissões (não impeditivo):', permErr);
      }

      // 🌐 SINCRONIZAÇÃO COM O BASEROW
      console.log('🌐 [EditUserModal] Sincronizando com o Baserow...');
      let baserowResult: any = null;
      try {
        baserowResult = await BaserowUserSyncService.syncUserToBaserow({
          name: updates.name,
          email: updates.email,
          accessDays: updates.accessDays,
          startDate: updates.startDate,
          expiryDate: updates.expiryDate,
          isActive: updates.isActive
        }, config);
        console.log('🌐 [EditUserModal] Resultado Baserow:', baserowResult);
      } catch (baserowErr: any) {
        console.error('❌ [EditUserModal] Erro ao sincronizar com Baserow:', baserowErr);
        baserowResult = { success: false, error: baserowErr.message };
      }

      // Limpar notificações de expiração se o acesso for superior a 5 dias
      try {
        const now = new Date();
        const newExpiryDate = new Date(safeExpiryDate);
        const daysRemaining = Math.ceil((newExpiryDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));

        if (daysRemaining > 5) {
          await ExpirationNotificationService.dismissExpirationNotification(user.uid);
          await ExpirationNotificationService.removeAllUserExpirationNotifications(updates.email);
        }
      } catch (notifErr) {
        console.warn('⚠️ Erro ao remover notificações (não crítico):', notifErr);
      }

      // Feedback final ao usuário
      if (baserowResult?.success) {
        toast.success(`Usuário salvo no Firebase e sincronizado no Baserow com sucesso!`);
      } else if (baserowResult?.error) {
        toast.success(`Usuário salvo no Firebase!`);
        toast.warning(`Baserow: ${baserowResult.error}`);
      } else {
        toast.success('Usuário atualizado com sucesso!');
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Erro ao atualizar usuário:', error);
      toast.error(`Erro ao atualizar usuário: ${error?.message || 'Falha inesperada'}`);
    } finally {
      setLoading(false);
    }
  };

  // Extensão direta em 1 clique (executa e sincroniza com Baserow imediatamente)
  const extendAccessDirectly = async (days: number) => {
    setLoading(true);
    try {
      await FirebaseUserService.extendUserAccess(user.uid, days);

      // Calcular dados atualizados para sincronização no Baserow
      const now = new Date();
      const currentExpiry = user.expiryDate ? new Date(toSafeISO(user.expiryDate)) : null;
      const baseDate = (currentExpiry && currentExpiry > now) ? currentExpiry : now;
      const newExpiry = new Date(baseDate);
      newExpiry.setDate(baseDate.getDate() + days);
      const newAccessDays = (Number(user.accessDays) || 0) + days;

      // 🌐 Sincronizar com o Baserow
      let baserowResult: any = null;
      try {
        baserowResult = await BaserowUserSyncService.syncUserToBaserow({
          name: user.name,
          email: user.email,
          accessDays: newAccessDays,
          startDate: toSafeISO(user.startDate),
          expiryDate: newExpiry.toISOString(),
          isActive: true
        }, config);
      } catch (e: any) {
        baserowResult = { success: false, error: e.message };
      }

      // Remover notificações de expiração com segurança
      try {
        await ExpirationNotificationService.dismissExpirationNotification(user.uid);
        await ExpirationNotificationService.removeAllUserExpirationNotifications(user.email);
      } catch (notifErr) {
        console.warn('Aviso não crítico ao remover notificações:', notifErr);
      }

      if (baserowResult?.success) {
        toast.success(`Acesso estendido em ${days} dias e sincronizado no Baserow!`);
      } else {
        toast.success(`Acesso estendido em ${days} dias no Firebase!`);
        if (baserowResult?.error) {
          toast.warning(`Baserow: ${baserowResult.error}`);
        }
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Erro ao estender acesso:', error);
      toast.error(`Erro ao estender acesso: ${error?.message || 'Falha inesperada'}`);
    } finally {
      setLoading(false);
    }
  };

  const toggleUserStatus = async () => {
    setLoading(true);
    try {
      const newStatus = !user.isActive;

      if (!newStatus) {
        await FirebaseUserService.deactivateUser(user.uid);
        const permissionsRef = doc(db, 'userPermissions', user.uid);
        await setDoc(permissionsRef, {
          isActive: false,
          lastUpdated: new Date().toISOString()
        }, { merge: true });

        // Sincronizar status inativo no Baserow
        try {
          await BaserowUserSyncService.syncUserToBaserow({
            name: user.name,
            email: user.email,
            accessDays: user.accessDays,
            startDate: toSafeISO(user.startDate),
            expiryDate: toSafeISO(user.expiryDate),
            isActive: false
          }, config);
        } catch (e) {
          console.warn('Erro ao sincronizar status no Baserow:', e);
        }

        toast.success('Usuário desativado no Firebase e no Baserow!');
      } else {
        await FirebaseUserService.updateUser(user.uid, { isActive: true });

        const permissionsRef = doc(db, 'userPermissions', user.uid);
        await setDoc(permissionsRef, {
          isActive: true,
          lastUpdated: new Date().toISOString()
        }, { merge: true });

        // Sincronizar status ativo no Baserow
        try {
          await BaserowUserSyncService.syncUserToBaserow({
            name: user.name,
            email: user.email,
            accessDays: user.accessDays,
            startDate: toSafeISO(user.startDate),
            expiryDate: toSafeISO(user.expiryDate),
            isActive: true
          }, config);
        } catch (e) {
          console.warn('Erro ao sincronizar status no Baserow:', e);
        }

        try {
          await ExpirationNotificationService.dismissExpirationNotification(user.uid);
          await ExpirationNotificationService.removeAllUserExpirationNotifications(user.email);
        } catch (e) {
          console.warn('Aviso não crítico ao remover notificações:', e);
        }

        toast.success('Usuário ativado no Firebase e no Baserow!');
      }
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Erro ao alterar status do usuário:', error);
      toast.error(`Erro ao alterar status: ${error?.message || 'Falha inesperada'}`);
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
    } catch (error: any) {
      console.error('Erro ao excluir usuário:', error);
      toast.error(`Erro ao excluir usuário: ${error?.message || 'Falha inesperada'}`);
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
          {(user.accessDays > 365 || (user.expiryDate && new Date(user.expiryDate).getFullYear() > 2028)) && (
            <div className="p-3 bg-amber-500/15 border border-amber-500/40 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0" />
                <div className="text-xs text-amber-900 dark:text-amber-200">
                  <span className="font-bold">Anomalia de cálculo detectada:</span> Este usuário está com {user.accessDays} dias de acesso cadastrados.
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="text-xs font-semibold border-amber-500 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-950 shrink-0 ml-2"
                onClick={handleFixAnomalousPlan}
              >
                ⚡ Corrigir para 30 Dias
              </Button>
            </div>
          )}

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

          {/* Ações de Extensão Rápida */}
          <div className="flex flex-col gap-2 p-3 bg-muted/40 rounded-lg border">
            <div className="text-xs font-semibold text-muted-foreground flex items-center justify-between">
              <span>⚡ Adicionar Dias de Acesso (Atualiza expiração no formulário):</span>
              <span className="text-[11px] text-purple-600 dark:text-purple-400 font-normal">Depois clique em Salvar Alterações</span>
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleAddDaysToForm(1)}
                disabled={loading}
                className="font-medium"
              >
                +1 Dia
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleAddDaysToForm(7)}
                disabled={loading}
                className="font-medium"
              >
                +7 Dias
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleAddDaysToForm(30)}
                disabled={loading}
                className="font-semibold text-purple-600 border-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950"
              >
                +30 Dias
              </Button>

              <div className="flex items-center gap-1.5 border border-purple-500/30 bg-purple-500/10 px-2 py-0.5 rounded-md">
                <Input
                  type="number"
                  placeholder="Outro (dias)"
                  value={customDays}
                  onChange={(e) => setCustomDays(e.target.value)}
                  disabled={loading}
                  className="w-20 h-7 text-xs bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 px-1"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-purple-600 font-semibold hover:bg-purple-500/20 px-2"
                  onClick={() => {
                    const days = parseInt(customDays);
                    if (isNaN(days) || days <= 0) {
                      toast.error('Insira um número válido de dias');
                      return;
                    }
                    handleAddDaysToForm(days);
                  }}
                  disabled={loading || !customDays}
                >
                  Aplicar
                </Button>
              </div>

              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="ml-auto text-xs bg-purple-600 hover:bg-purple-700 text-white font-medium shadow-sm"
                onClick={() => extendAccessDirectly(30)}
                disabled={loading}
                title="Aplica +30 dias e sincroniza imediatamente no Firebase e Baserow"
              >
                ⚡ Renovar +30d Imediato
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t">
            <div className="flex items-center gap-2">
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
                variant="outline"
                onClick={handleDeleteUser}
                disabled={loading}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 dark:border-red-900/50"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Excluir Usuário
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={loading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-5 shadow-sm"
              >
                {loading ? 'Salvando no Firebase e Baserow...' : 'Salvar Alterações'}
              </Button>
            </div>
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

  const [normalizing, setNormalizing] = useState(false);

  // Detecta usuários com anomalia de cálculo (mais de 365 dias ou anos no futuro extremo)
  const anomalousUsers = users.filter(u =>
    u.accessDays > 365 || (u.expiryDate && new Date(u.expiryDate).getFullYear() > 2028)
  );

  const handleNormalizeAllAnomalies = async () => {
    if (anomalousUsers.length === 0) return;
    setNormalizing(true);
    let successCount = 0;
    try {
      for (const u of anomalousUsers) {
        const res = await FirebaseUserService.normalizeUserPlanDates(u.uid, 30, u.startDate);
        if (res.success) successCount++;
      }
      toast.success(`${successCount} usuário(s) normalizados com sucesso para 30 dias de plano e sincronizados no Baserow!`);
    } catch (err) {
      console.error('Erro ao normalizar anomalias:', err);
      toast.error('Erro ao normalizar usuários');
    } finally {
      setNormalizing(false);
    }
  };

  const handleNormalizeSingleUser = async (u: FirebaseUser) => {
    try {
      toast.loading(`Normalizando ${u.name || u.email}...`, { id: `norm-${u.uid}` });
      const res = await FirebaseUserService.normalizeUserPlanDates(u.uid, 30, u.startDate);
      if (res.success) {
        toast.success(`Usuário ${u.name || u.email} normalizado para 30 dias exatos e sincronizado com o Baserow!`, { id: `norm-${u.uid}` });
      } else {
        toast.error(`Falha ao normalizar: ${res.error}`, { id: `norm-${u.uid}` });
      }
    } catch (err: any) {
      toast.error(`Erro ao normalizar: ${err.message}`, { id: `norm-${u.uid}` });
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


      {/* Aviso e Normalização Automática de Anomalias de Cálculo */}
      {anomalousUsers.length > 0 && (
        <Card className="bg-amber-500/10 border-amber-500/30">
          <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-6 w-6 text-amber-600 dark:text-amber-400 shrink-0" />
              <div>
                <div className="font-semibold text-sm text-amber-900 dark:text-amber-200">
                  Detectada anomalia de cálculo em {anomalousUsers.length} usuário(s) ({anomalousUsers.slice(0, 2).map(u => u.name || u.email).join(', ')})
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Estes usuários estão com dias inflados (mais de 365 dias ou anos duplicados). Clique para normalizar e definir exatamente 30 dias de uso do plano e sincronizar com o Baserow.
                </p>
              </div>
            </div>
            <Button
              size="sm"
              className="bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs shrink-0"
              onClick={handleNormalizeAllAnomalies}
              disabled={normalizing}
            >
              {normalizing ? 'Corrigindo...' : `Normalizar ${anomalousUsers.length} Usuário(s) para 30d`}
            </Button>
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
          const isAnomalous = user.accessDays > 365 || (user.expiryDate && new Date(user.expiryDate).getFullYear() > 2028);
          // Em Criado deve aparecer a data da assinatura recente/última vez
          const subscriptionDate = (user as any).lastSubscriptionDate || user.startDate || user.createdAt;
          const formattedSubscriptionDate = (() => {
            try {
              return format(new Date(subscriptionDate), 'dd/MM/yyyy', { locale: ptBR });
            } catch {
              return format(new Date(user.createdAt), 'dd/MM/yyyy', { locale: ptBR });
            }
          })();
          const formattedExpiryDate = (() => {
            try {
              return format(new Date(user.expiryDate), 'dd/MM/yyyy', { locale: ptBR });
            } catch {
              return 'Data inválida';
            }
          })();

          return (
            <Card 
              key={user.uid} 
              className={`hover:shadow-md transition-all duration-200 ${isAnomalous ? 'border-amber-500/40 bg-amber-500/5' : ''} ${selectedUids.includes(user.uid) ? 'border-primary bg-primary/5' : ''}`}
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
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {getStatusBadge(user)}
                        <Badge variant="outline">
                          <CalendarDays className="h-3 w-3 mr-1" />
                          {user.accessDays} dias totais
                        </Badge>
                        {isAnomalous && (
                          <Badge variant="destructive" className="bg-amber-600 hover:bg-amber-700 text-white text-[10px] py-0 h-4">
                            ⚠️ Anomalia ({user.accessDays}d)
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                <div className="text-right space-y-2">
                  <div className="text-sm text-muted-foreground">
                    <div title="Data da assinatura recente ou início">Criado: {formattedSubscriptionDate}</div>
                    <div>Expira: {formattedExpiryDate}</div>
                    <div>Total de logins: {user.totalLogins}</div>
                  </div>

                  <div className="flex items-center justify-end gap-2">
                    {isAnomalous && (
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleNormalizeSingleUser(user);
                        }}
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs border-amber-500 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-950 font-medium"
                      >
                        ⚡ Corrigir p/ 30d
                      </Button>
                    )}
                    <Button
                      onClick={() => handleEditUser(user)}
                      size="sm"
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Gerenciar
                    </Button>
                  </div>
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