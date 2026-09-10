import { collection, addDoc, getDocs, query, orderBy, updateDoc, doc, serverTimestamp, onSnapshot, deleteDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Plan } from '@/types/planTypes';

export const PlansService = {
  // Criar novo plano
  async createPlan(plan: Omit<Plan, 'id' | 'createdAt' | 'updatedAt'>) {
    try {
      console.log('Criando plano:', plan);

      let durationDays = Number((plan as any).durationDays);
      if (!durationDays || isNaN(durationDays) || durationDays <= 0) {
        const n = (plan.name || '').toLowerCase();
        const p = (plan.price || '').toLowerCase();
        if (n.includes('anual') || p.includes('anual') || n.includes('ano')) {
          durationDays = 365;
        } else if (n.includes('semestral') || p.includes('semestral')) {
          durationDays = 180;
        } else if (n.includes('trimestral') || p.includes('trimestral')) {
          durationDays = 90;
        } else {
          durationDays = 30; // Padrão: 30 dias para mensal
        }
      }
      
      const planData = {
        ...plan,
        durationDays,
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
      
      // Busca a coleção completa sem orderBy para não omitir documentos sem createdAt
      const querySnapshot = await getDocs(collection(db, 'plans'));
      const plans: Plan[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const nameNorm = (data.name || '').toLowerCase();
        const priceNorm = (data.price || '').toLowerCase();
        const defaultDays = data.durationDays || (
          nameNorm.includes('anual') || priceNorm.includes('anual') ? 365 :
          nameNorm.includes('trimestral') || priceNorm.includes('trimestral') ? 90 :
          nameNorm.includes('semestral') || priceNorm.includes('semestral') ? 180 : 30
        );

        plans.push({
          id: doc.id,
          ...data,
          durationDays: Number(defaultDays) || 30,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt || '',
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt || ''
        } as Plan);
      });

      // Ordenar com segurança em memória
      plans.sort((a, b) => {
        const timeA = new Date(a.createdAt || a.updatedAt || 0).getTime() || 0;
        const timeB = new Date(b.createdAt || b.updatedAt || 0).getTime() || 0;
        return timeB - timeA;
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
      
      const updateData: any = {
        ...updates,
        updatedAt: serverTimestamp()
      };

      if (updates.durationDays !== undefined) {
        updateData.durationDays = Number(updates.durationDays) || 30;
      }

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

      // Marcar nome do plano como deletado para evitar recriação automática
      try {
        const all = await this.getAllPlans();
        const target = all.find(p => p.id === planId);
        if (target?.name) {
          const raw = localStorage.getItem('deleted-plan-names');
          const set = new Set<string>(raw ? JSON.parse(raw) : []);
          set.add(target.name.toLowerCase().trim());
          localStorage.setItem('deleted-plan-names', JSON.stringify([...set]));
        }
      } catch (e) {
        console.warn('Não foi possível marcar plano como deletado:', e);
      }

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
    const plansRef = collection(db, 'plans');

    const unsubscribe = onSnapshot(
      plansRef,
      (querySnapshot) => {
        const plans: Plan[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          const nameNorm = (data.name || '').toLowerCase();
          const priceNorm = (data.price || '').toLowerCase();
          const defaultDays = data.durationDays || (
            nameNorm.includes('anual') || priceNorm.includes('anual') ? 365 :
            nameNorm.includes('trimestral') || priceNorm.includes('trimestral') ? 90 :
            nameNorm.includes('semestral') || priceNorm.includes('semestral') ? 180 : 30
          );

          plans.push({
            id: doc.id,
            ...data,
            durationDays: Number(defaultDays) || 30,
            createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt || '',
            updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt || ''
          } as Plan);
        });

        // Ordenação segura em memória
        plans.sort((a, b) => {
          const timeA = new Date(a.createdAt || a.updatedAt || 0).getTime() || 0;
          const timeB = new Date(b.createdAt || b.updatedAt || 0).getTime() || 0;
          return timeB - timeA;
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
      // Executar migração apenas uma vez por dispositivo
      if (localStorage.getItem('plans-migrated') === 'true') return;

      const savedPlans = localStorage.getItem('admin-plans');
      if (!savedPlans) {
        localStorage.setItem('plans-migrated', 'true');
        return;
      }

      const localPlans = JSON.parse(savedPlans) as Plan[];
      console.log('Migrando planos do localStorage:', localPlans.length);

      const existingPlans = await this.getAllPlans();
      if (existingPlans.length > 0) {
        console.log('Planos já existem no Firebase, pulando migração');
        localStorage.setItem('plans-migrated', 'true');
        return;
      }

      for (const plan of localPlans) {
        const { id, ...planData } = plan;
        await this.createPlan(planData);
      }

      localStorage.setItem('plans-migrated', 'true');
      console.log('Migração concluída com sucesso');
    } catch (error) {
      console.error('Erro na migração:', error);
    }
  },

  // Removida a criação automática do plano "Integração API".
  // Planos agora são criados apenas manualmente pelo admin.
  async ensureApiPlan() {
    return;
  },

  // Remover planos duplicados (mesmo nome), mantendo o mais recente
  async removeDuplicatePlans(): Promise<number> {
    const plans = await this.getAllPlans();
    const seen = new Set<string>();
    let removed = 0;

    for (const plan of plans) {
      const key = (plan.name || '').toLowerCase().trim();
      if (!key) continue;
      if (seen.has(key)) {
        await this.deletePlan(plan.id);
        removed++;
      } else {
        seen.add(key);
      }
    }

    console.log('Planos duplicados removidos:', removed);
    return removed;
  }
};