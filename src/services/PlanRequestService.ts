
import { collection, addDoc, getDocs, query, orderBy, updateDoc, doc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { UserPermissions } from '@/types/planTypes';

export interface PlanRequest {
  id?: string;
  userId: string;
  userName: string;
  userEmail: string;
  planId: string;
  planName: string;
  planPrice: string;
  requestDate: any;
  status: 'pending' | 'approved' | 'rejected';
  adminNotes?: string;
  userMessage?: string;
}

export const PlanRequestService = {
  // Criar nova solicitação de plano
  async createPlanRequest(planRequest: Omit<PlanRequest, 'id' | 'requestDate' | 'status'>) {
    try {
      console.log('Criando solicitação de plano:', planRequest);
      
      const requestData: any = {
        userId: planRequest.userId,
        userName: planRequest.userName,
        userEmail: planRequest.userEmail,
        planId: planRequest.planId,
        planName: planRequest.planName,
        planPrice: planRequest.planPrice,
        requestDate: serverTimestamp(),
        status: 'pending' as const
      };

      // Só adicionar userMessage se não for undefined ou vazio
      if (planRequest.userMessage && planRequest.userMessage.trim()) {
        requestData.userMessage = planRequest.userMessage.trim();
      }

      const docRef = await addDoc(collection(db, 'planRequests'), requestData);
      console.log('Solicitação criada com ID:', docRef.id);
      
      return docRef.id;
    } catch (error) {
      console.error('Erro ao criar solicitação de plano:', error);
      throw error;
    }
  },

  // Buscar todas as solicitações
  async getAllPlanRequests(): Promise<PlanRequest[]> {
    try {
      console.log('Buscando todas as solicitações de plano');
      
      const q = query(
        collection(db, 'planRequests'),
        orderBy('requestDate', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const requests: PlanRequest[] = [];
      
      querySnapshot.forEach((doc) => {
        requests.push({
          id: doc.id,
          ...doc.data()
        } as PlanRequest);
      });
      
      console.log('Solicitações encontradas:', requests.length);
      return requests;
    } catch (error) {
      console.error('Erro ao buscar solicitações:', error);
      throw error;
    }
  },

  // Atualizar status da solicitação e ativar plano se aprovado
  async updatePlanRequestStatus(requestId: string, status: 'approved' | 'rejected', adminNotes?: string) {
    try {
      console.log('Atualizando status da solicitação:', requestId, status);
      
      const updateData: any = {
        status,
        updatedAt: serverTimestamp()
      };

      // Só adicionar adminNotes se não for undefined ou vazio
      if (adminNotes && adminNotes.trim()) {
        updateData.adminNotes = adminNotes.trim();
      }
      
      const requestRef = doc(db, 'planRequests', requestId);
      await updateDoc(requestRef, updateData);
      
      console.log('Status atualizado com sucesso');

      // Se aprovado, ativar o plano automaticamente
      if (status === 'approved') {
        await this.activatePlanForUser(requestId);
      }
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      throw error;
    }
  },

  // Ativar plano para o usuário quando aprovado
  async activatePlanForUser(requestId: string) {
    try {
      console.log('Ativando plano para usuário após aprovação:', requestId);
      
      // Buscar a solicitação aprovada
      const requests = await this.getAllPlanRequests();
      const approvedRequest = requests.find(r => r.id === requestId && r.status === 'approved');
      
      if (!approvedRequest) {
        console.error('Solicitação aprovada não encontrada:', requestId);
        return;
      }

      // Carregar planos disponíveis
      const savedPlans = localStorage.getItem('admin-plans');
      const plans = savedPlans ? JSON.parse(savedPlans) : [];
      const selectedPlan = plans.find((p: any) => p.id === approvedRequest.planId);
      
      if (!selectedPlan) {
        console.error('Plano não encontrado:', approvedRequest.planId);
        return;
      }

      // Criar/atualizar permissões do usuário
      const userPermissions: UserPermissions = {
        userId: approvedRequest.userId,
        userEmail: approvedRequest.userEmail,
        userName: approvedRequest.userName,
        planId: selectedPlan.id,
        planName: selectedPlan.name,
        monthlyContentLimit: selectedPlan.monthlyContentLimit,
        enabledFeatures: selectedPlan.features || [],
        currentMonthUsage: 0,
        lastUpdated: new Date().toISOString()
      };

      // Salvar permissões no localStorage
      localStorage.setItem(`user-permissions-${approvedRequest.userId}`, JSON.stringify(userPermissions));
      
      // Registrar log da ativação
      const logs = JSON.parse(localStorage.getItem('system-logs') || '[]');
      logs.unshift({
        id: Date.now().toString(),
        timestamp: new Date().toLocaleString('pt-BR'),
        userEmail: 'admin',
        action: 'Plano ativado automaticamente',
        details: `Plano ${selectedPlan.name} ativado para ${approvedRequest.userEmail} após aprovação da solicitação`
      });
      localStorage.setItem('system-logs', JSON.stringify(logs));

      console.log('Plano ativado com sucesso para:', approvedRequest.userEmail);
    } catch (error) {
      console.error('Erro ao ativar plano:', error);
    }
  },

  // Listener em tempo real para solicitações de planos
  onPlanRequestsChange(callback: (requests: PlanRequest[]) => void) {
    const q = query(
      collection(db, 'planRequests'),
      orderBy('requestDate', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const requests: PlanRequest[] = [];
        querySnapshot.forEach((doc) => {
          requests.push({
            id: doc.id,
            ...doc.data()
          } as PlanRequest);
        });
        
        console.log('Solicitações de planos atualizadas em tempo real:', requests.length);
        callback(requests);
      },
      (error) => {
        console.error('Erro no listener de solicitações:', error);
      }
    );

    return unsubscribe;
  }
};
