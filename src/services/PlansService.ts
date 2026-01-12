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

      // Verificar se já existem planos no Firebase
      const existingPlans = await this.getAllPlans();
      if (existingPlans.length > 0) {
        console.log('Planos já existem no Firebase, pulando migração');
        return;
      }

      // Migrar cada plano
      for (const plan of localPlans) {
        const { id, ...planData } = plan;
        await this.createPlan(planData);
      }

      console.log('Migração concluída com sucesso');
      
      // Opcional: remover do localStorage após migração
      // localStorage.removeItem('admin-plans');
    } catch (error) {
      console.error('Erro na migração:', error);
    }
  }
};