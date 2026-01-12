
import { useState, useEffect } from 'react';
import { PlanRequestService, PlanRequest } from '@/services/PlanRequestService';
import { useSimpleAuth } from '@/contexts/SimpleAuthContext';
import { toast } from 'sonner';

export const usePlanRequests = () => {
  const [requests, setRequests] = useState<PlanRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const { userInfo } = useSimpleAuth();

  // Configurar listener em tempo real para solicitações
  useEffect(() => {
    console.log('Configurando listener de solicitações em tempo real');
    
    const unsubscribe = PlanRequestService.onPlanRequestsChange((updatedRequests) => {
      setRequests(updatedRequests);
      setLoading(false);
    });

    // Cleanup listener ao desmontar componente
    return () => {
      console.log('Removendo listener de solicitações');
      unsubscribe();
    };
  }, []);

  // Função para recarregar manualmente (mantida para compatibilidade)
  const loadRequests = async () => {
    try {
      setLoading(true);
      const planRequests = await PlanRequestService.getAllPlanRequests();
      setRequests(planRequests);
    } catch (error) {
      console.error('Erro ao carregar solicitações:', error);
      toast.error('Erro ao carregar solicitações de planos');
    } finally {
      setLoading(false);
    }
  };

  // Criar nova solicitação
  const createPlanRequest = async (planId: string, planName: string, planPrice: string, userMessage?: string) => {
    if (!userInfo) {
      toast.error('Você precisa estar logado para solicitar um plano');
      return;
    }

    try {
      console.log('Criando solicitação de plano:', { planId, planName, planPrice });
      
      await PlanRequestService.createPlanRequest({
        userId: userInfo.id,
        userName: userInfo.email.split('@')[0],
        userEmail: userInfo.email,
        planId,
        planName,
        planPrice,
        userMessage
      });

      toast.success(`Solicitação do plano ${planName} enviada com sucesso!`, {
        description: 'Nossa equipe analisará sua solicitação em breve.'
      });

    } catch (error) {
      console.error('Erro ao criar solicitação:', error);
      toast.error('Erro ao enviar solicitação do plano');
    }
  };

  // Atualizar status da solicitação (Admin)
  const updateRequestStatus = async (requestId: string, status: 'approved' | 'rejected', adminNotes?: string) => {
    try {
      await PlanRequestService.updatePlanRequestStatus(requestId, status, adminNotes);
      toast.success(`Solicitação ${status === 'approved' ? 'aprovada' : 'rejeitada'} com sucesso!`);
      await loadRequests(); // Recarregar lista
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast.error('Erro ao atualizar status da solicitação');
    }
  };


  return {
    requests,
    loading,
    loadRequests,
    createPlanRequest,
    updateRequestStatus
  };
};
