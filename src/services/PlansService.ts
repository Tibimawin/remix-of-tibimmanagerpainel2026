import { collection, addDoc, getDocs, query, orderBy, updateDoc, doc, serverTimestamp, onSnapshot, deleteDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Plan } from '@/types/planTypes';

export const PlansService = {
  // Criar novo plano
  async createPlan(plan: Omit<Plan, 'id' | 'createdAt' | 'updatedAt'>) {
    try {
      console.log('Criando plano:', plan);
      
      const planData = {
        ...plan,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'plans'), planData);
      console.log('Plano criado com ID:', docRef.id);
      
      return docRef.id;
    } catch (error) {
      console.error('Erro ao criar plano:', error);
      throw error;
    }
  },

  // Buscar todos os planos
  async getAllPlans(): Promise<Plan[]> {
    try {
      console.log('Buscando todos os planos');
      
      const q = query(
        collection(db, 'plans'),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const plans: Plan[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        plans.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt
        } as Plan);
      });
      
      console.log('Planos encontrados:', plans.length);
      return plans;
    } catch (error) {
      console.error('Erro ao buscar planos:', error);
      throw error;
    }
  },

  // Atualizar plano
  async updatePlan(planId: string, updates: Partial<Plan>) {
    try {
      console.log('Atualizando plano:', planId, updates);
      
      const updateData = {
        ...updates,
        updatedAt: serverTimestamp()
      };

      // Remove campos que não devem ser atualizados
      delete updateData.id;
      delete updateData.createdAt;
      
      const planRef = doc(db, 'plans', planId);
      await updateDoc(planRef, updateData);
      
      console.log('Plano atualizado com sucesso');
    } catch (error) {
      console.error('Erro ao atualizar plano:', error);
      throw error;
    }
  },

  // Deletar plano
  async deletePlan(planId: string) {
    try {
      console.log('Deletando plano:', planId);
      
      const planRef = doc(db, 'plans', planId);
      await deleteDoc(planRef);
      
      console.log('Plano deletado com sucesso');
    } catch (error) {
      console.error('Erro ao deletar plano:', error);
      throw error;
    }
  },

  // Listener em tempo real para planos
  onPlansChange(callback: (plans: Plan[]) => void) {
    const q = query(
      collection(db, 'plans'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const plans: Plan[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          plans.push({
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
            updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt
          } as Plan);
        });
        
        console.log('Planos atualizados em tempo real:', plans.length);
        callback(plans);
      },
      (error) => {
        console.error('Erro no listener de planos:', error);
      }
    );

    return unsubscribe;
  },

  // Migrar planos do localStorage para Firebase (função auxiliar)
  async migrateFromLocalStorage() {
    try {
      const savedPlans = localStorage.getItem('admin-plans');
      if (!savedPlans) return;

      const localPlans = JSON.parse(savedPlans) as Plan[];
      console.log('Migrando planos do localStorage:', localPlans.length);

      const existingPlans = await this.getAllPlans();
      if (existingPlans.length > 0) {
        console.log('Planos já existem no Firebase, pulando migração');
        return;
      }

      for (const plan of localPlans) {
        const { id, ...planData } = plan;
        await this.createPlan(planData);
      }

      console.log('Migração concluída com sucesso');
    } catch (error) {
      console.error('Erro na migração:', error);
    }
  },

  // Garantir que o plano de Integração API existe
  async ensureApiPlan() {
    try {
      const existingPlans = await this.getAllPlans();
      const hasApiPlan = existingPlans.some(p => 
        p.features.includes('minha-api') && p.name.toLowerCase().includes('api')
      );

      if (hasApiPlan) {
        console.log('Plano de Integração API já existe');
        return;
      }

      console.log('Criando plano de Integração API...');
      await this.createPlan({
        name: 'Integração API',
        price: 'R$ 50,00/mês',
        description: 'Plano exclusivo para integrar conteúdos em sites e apps externos via API. Inclui geração de API Keys, documentação e suporte técnico.',
        monthlyContentLimit: -1,
        features: [
          'dashboard',
          'conteudos',
          'minha-api',
          'planos',
          'perfil',
          'configuracoes',
          'suporte-ao-vivo'
        ],
        blockingMessage: 'Esta funcionalidade requer o plano Integração API (R$ 50,00/mês). Faça upgrade para desbloquear.',
        isActive: true
      });

      console.log('✅ Plano de Integração API criado com sucesso');
    } catch (error) {
      console.error('Erro ao criar plano de Integração API:', error);
    }
  }
};