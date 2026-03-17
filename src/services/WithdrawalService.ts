import { collection, addDoc, getDocs, query, where, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/config/firebase';

export interface WithdrawalRequest {
  id?: string;
  referrerUid: string;
  referrerEmail?: string;
  name: string;
  cpf: string;
  email: string;
  pixKey: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt: string;
  adminNotes?: string;
}

const COLLECTION = 'withdrawalRequests';
const MIN_AMOUNT = 5;

export const WithdrawalService = {
  async createRequest(data: Omit<WithdrawalRequest, 'id' | 'status' | 'createdAt' | 'updatedAt'>): Promise<WithdrawalRequest> {
    if (data.amount < MIN_AMOUNT) {
      throw new Error(`O valor mínimo para saque é R$${MIN_AMOUNT.toFixed(2)}`);
    }

    const { ReferralService } = await import('@/services/ReferralService');
    const balance = await ReferralService.getWithdrawableBalance(data.referrerUid);
    if (data.amount > balance) {
      throw new Error(`Saldo insuficiente. Disponível: R$${balance.toFixed(2)}`);
    }

    const payload: Omit<WithdrawalRequest, 'id'> = {
      ...data,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const docRef = await addDoc(collection(db, COLLECTION), payload);
    return { id: docRef.id, ...payload };
  },

  async getRequestsByUser(uid: string): Promise<WithdrawalRequest[]> {
    const q = query(collection(db, COLLECTION), where('referrerUid', '==', uid));
    const snapshot = await getDocs(q);
    const items: WithdrawalRequest[] = [];
    snapshot.forEach(d => items.push({ id: d.id, ...d.data() } as WithdrawalRequest));
    items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return items;
  },

  async getAllRequests(): Promise<WithdrawalRequest[]> {
    const snapshot = await getDocs(collection(db, COLLECTION));
    const items: WithdrawalRequest[] = [];
    snapshot.forEach(d => items.push({ id: d.id, ...d.data() } as WithdrawalRequest));
    items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return items;
  },

  async updateStatus(id: string, status: 'approved' | 'rejected', adminNotes?: string): Promise<void> {
    // Get the request data before updating
    const allRequests = await this.getAllRequests();
    const request = allRequests.find(r => r.id === id);

    await updateDoc(doc(db, COLLECTION, id), {
      status,
      adminNotes: adminNotes || '',
      updatedAt: new Date().toISOString()
    });

    // Send notification to the user
    if (request) {
      try {
        const { UserSubscriptionNotificationService } = await import('@/services/UserSubscriptionNotificationService');
        if (status === 'approved') {
          await UserSubscriptionNotificationService.notifyWithdrawalApproved(
            request.referrerUid, request.referrerEmail || request.email, request.amount, adminNotes
          );
        } else {
          await UserSubscriptionNotificationService.notifyWithdrawalRejected(
            request.referrerUid, request.referrerEmail || request.email, request.amount, adminNotes
          );
        }
      } catch (e) {
        console.error('Erro ao enviar notificação de saque:', e);
      }
    }
  }
};
