import { useState, useEffect } from 'react';
import { PlansService } from '@/services/PlansService';
import { Plan } from '@/types/planTypes';
import { toast } from 'sonner';

export const usePlans = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  // Carregar planos e configurar listener em tempo real
  useEffect(() => {
    console.log('Configurando listener de planos em tempo real');
    
    // Migrar dados do localStorage se necessário (não cria planos automaticamente)
    PlansService.migrateFromLocalStorage();

    // Configurar listener em tempo real
    const unsubscribe = PlansService.onPlansChange((updatedPlans) => {
      setPlans(updatedPlans);
      setLoading(false);
    });

    // Cleanup listener ao desmontar componente
    return () => {
      console.log('Removendo listener de planos');
      unsubscribe();
    };
  }, []);

  // Criar novo plano
  const createPlan = async (planData: Omit<Plan, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      await PlansService.createPlan(planData);
      toast.success('Plano criado com sucesso!');
    } catch (error) {
      console.error('Erro ao criar plano:', error);
      toast.error('Erro ao criar plano');
      throw error;
    }
  };

  // Atualizar plano
  const updatePlan = async (planId: string, updates: Partial<Plan>) => {
    try {
      await PlansService.updatePlan(planId, updates);
      toast.success('Plano atualizado com sucesso!');
    } catch (error) {
      console.error('Erro ao atualizar plano:', error);
      toast.error('Erro ao atualizar plano');
      throw error;
    }
  };

  // Deletar plano
  const deletePlan = async (planId: string) => {
    try {
      await PlansService.deletePlan(planId);
      toast.success('Plano excluído com sucesso!');
    } catch (error) {
      console.error('Erro ao deletar plano:', error);
      toast.error('Erro ao excluir plano');
      throw error;
    }
  };
  // Remover planos duplicados (mesmo nome)
  const removeDuplicates = async () => {
    try {
      const removed = await PlansService.removeDuplicatePlans();
      toast.success(removed > 0 ? `${removed} plano(s) duplicado(s) removido(s)` : 'Nenhum duplicado encontrado');
    } catch (error) {
      console.error('Erro ao remover duplicados:', error);
      toast.error('Erro ao remover planos duplicados');
    }
  };

  // Filtrar apenas planos ativos
  const activePlans = plans.filter(plan => plan.isActive);

  return {
    plans,
    activePlans,
    loading,
    createPlan,
    updatePlan,
    deletePlan,
    removeDuplicates
  };
};