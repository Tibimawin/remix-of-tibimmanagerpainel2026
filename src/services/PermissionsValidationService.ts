import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { UserPermissions } from '@/types/planTypes';

export const PermissionsValidationService = {
  // Validar permissões do usuário em tempo real
  async validateUserPermissions(userId: string): Promise<UserPermissions | null> {
    try {
      console.log('🔍 Validando permissões em tempo real para:', userId);
      
      const permissionsDoc = await getDoc(doc(db, 'userPermissions', userId));
      
      if (permissionsDoc.exists()) {
        const data = permissionsDoc.data() as UserPermissions;
        
        // Validar estrutura das permissões
        const validatedPermissions = {
          ...data,
          enabledFeatures: Array.isArray(data.enabledFeatures) ? data.enabledFeatures : [],
          currentMonthUsage: typeof data.currentMonthUsage === 'number' ? data.currentMonthUsage : 0,
          monthlyContentLimit: typeof data.monthlyContentLimit === 'number' ? data.monthlyContentLimit : 0
        };
        
        console.log('✅ Permissões validadas:', {
          userEmail: validatedPermissions.userEmail,
          planName: validatedPermissions.planName,
          featuresCount: validatedPermissions.enabledFeatures.length,
          features: validatedPermissions.enabledFeatures
        });
        
        return validatedPermissions;
      } else {
        console.log('❌ Documento de permissões não encontrado para:', userId);
        return null;
      }
    } catch (error) {
      console.error('❌ Erro ao validar permissões:', error);
      return null;
    }
  },

  // Verificar se uma feature específica está habilitada
  async hasFeatureAccess(userId: string, featureId: string): Promise<boolean> {
    try {
      const permissions = await this.validateUserPermissions(userId);
      const hasAccess = permissions?.enabledFeatures?.includes(featureId) || false;
      
      console.log(`🔐 Verificação de acesso direto - User: ${userId}, Feature: ${featureId}, Acesso: ${hasAccess}`);
      
      return hasAccess;
    } catch (error) {
      console.error('❌ Erro ao verificar acesso à feature:', error);
      return false;
    }
  },

  // Forçar refresh das permissões (útil para debug)
  async forceRefreshPermissions(userId: string): Promise<void> {
    try {
      console.log('🔄 Forçando refresh das permissões para:', userId);
      
      // Buscar permissões direto do Firebase
      const freshPermissions = await this.validateUserPermissions(userId);
      
      if (freshPermissions) {
        console.log('✅ Permissões atualizadas:', freshPermissions);
        
        // Emitir evento customizado para forçar refresh nos hooks
        window.dispatchEvent(new CustomEvent('permissions-refreshed', {
          detail: { userId, permissions: freshPermissions }
        }));
      }
    } catch (error) {
      console.error('❌ Erro ao forçar refresh das permissões:', error);
    }
  }
};