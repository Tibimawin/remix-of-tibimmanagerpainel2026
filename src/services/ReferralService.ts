import { collection, addDoc, getDocs, query, where, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { FirebaseUserService } from '@/services/FirebaseUserService';

export interface Referral {
  id?: string;
  referrerUid: string;
  referrerEmail?: string;
  referrerName?: string;
  referredUid: string;
  referredEmail?: string;
  referredName?: string;
  createdAt: string;
  status: 'registered' | 'subscribed' | 'cancelled';
  subscriptionActive: boolean;
  activatedAt?: string;
  monthlyPayout: number;
  earnedTotal: number;
  earningPerPayment: number;
  lastUpdated: string;
  // Anti-fraude
  sameIP?: boolean;
  referrerIP?: string;
  referredIP?: string;
  flagged?: boolean;
  flagReason?: string;
}

const REFERRALS_COLLECTION = 'referrals';
const MONTHLY_PRICE = 30;
const REFERRAL_RATE = 0.10;
const MONTHLY_PAYOUT = Number((MONTHLY_PRICE * REFERRAL_RATE).toFixed(2));

export const ReferralService = {
  generateLink(referrerUid: string) {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return `${origin}/cadastro?ref=${encodeURIComponent(referrerUid)}`;
  },

  async createReferral(referrerUid: string, referredUid: string): Promise<Referral> {
    // Anti-fraude: impedir auto-indicação
    if (referrerUid === referredUid) {
      throw new Error('Não é permitido indicar a si mesmo.');
    }

    // Anti-fraude: impedir indicação duplicada
    const existing = await this.getReferralsByReferrer(referrerUid);
    if (existing.some(r => r.referredUid === referredUid)) {
      throw new Error('Este usuário já foi indicado por você.');
    }

    // Anti-fraude: verificar se o indicado já foi indicado por outra pessoa
    const allRefs = await this.getAllReferrals();
    if (allRefs.some(r => r.referredUid === referredUid)) {
      throw new Error('Este usuário já foi indicado por outra pessoa.');
    }

    const referrer = await FirebaseUserService.getUserById(referrerUid);
    const referred = await FirebaseUserService.getUserById(referredUid);

    // Anti-fraude: detectar mesmo IP
    const sameIP = referrer?.deviceInfo?.ip && referred?.deviceInfo?.ip &&
      referrer.deviceInfo.ip === referred.deviceInfo.ip;

    const payload: Omit<Referral, 'id'> = {
      referrerUid,
      referrerEmail: referrer?.email,
      referrerName: referrer?.name,
      referredUid,
      referredEmail: referred?.email,
      referredName: referred?.name,
      createdAt: new Date().toISOString(),
      status: 'registered',
      subscriptionActive: false,
      activatedAt: undefined,
      monthlyPayout: MONTHLY_PAYOUT,
      earnedTotal: 0,
      earningPerPayment: MONTHLY_PAYOUT,
      lastUpdated: new Date().toISOString(),
      sameIP: !!sameIP,
      referrerIP: referrer?.deviceInfo?.ip || '',
      referredIP: referred?.deviceInfo?.ip || '',
      flagged: !!sameIP,
      flagReason: sameIP ? 'Mesmo IP detectado entre indicador e indicado' : ''
    };

    const docRef = await addDoc(collection(db, REFERRALS_COLLECTION), payload);
    return { id: docRef.id, ...payload };
  },

  async getReferralsByReferrer(referrerUid: string): Promise<Referral[]> {
    const q = query(collection(db, REFERRALS_COLLECTION), where('referrerUid', '==', referrerUid));
    const snapshot = await getDocs(q);
    const items: Referral[] = [];
    snapshot.forEach(d => {
      const data = d.data() as Referral;
      items.push({ id: d.id, ...data, earnedTotal: data.earnedTotal || 0, earningPerPayment: data.earningPerPayment || 0 });
    });
    items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return items;
  },

  async getAllReferrals(): Promise<Referral[]> {
    const snapshot = await getDocs(collection(db, REFERRALS_COLLECTION));
    const items: Referral[] = [];
    snapshot.forEach(d => {
      const data = d.data() as Referral;
      items.push({ id: d.id, ...data, earnedTotal: data.earnedTotal || 0, earningPerPayment: data.earningPerPayment || 0 });
    });
    items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return items;
  },

  async getEarningsByReferrer(referrerUid: string): Promise<number> {
    const referrals = await this.getReferralsByReferrer(referrerUid);
    return referrals.reduce((sum, r) => sum + (r.earnedTotal || 0), 0);
  },

  async getWithdrawableBalance(referrerUid: string): Promise<number> {
    const { WithdrawalService } = await import('@/services/WithdrawalService');
    const totalEarnings = await this.getEarningsByReferrer(referrerUid);
    const requests = await WithdrawalService.getRequestsByUser(referrerUid);
    const totalWithdrawn = requests
      .filter(r => r.status === 'approved' || r.status === 'pending')
      .reduce((sum, r) => sum + r.amount, 0);
    return Math.max(0, Number((totalEarnings - totalWithdrawn).toFixed(2)));
  },

  async updateSubscriptionStatusByReferred(referredUid: string, active: boolean): Promise<void> {
    const q = query(collection(db, REFERRALS_COLLECTION), where('referredUid', '==', referredUid));
    const snapshot = await getDocs(q);
    const now = new Date().toISOString();
    for (const d of snapshot.docs) {
      const existing = d.data();
      const prevEarned = existing.earnedTotal || 0;
      const earning = active ? MONTHLY_PAYOUT : 0;
      const newEarned = active ? prevEarned + earning : prevEarned;

      await updateDoc(doc(db, REFERRALS_COLLECTION, d.id), {
        subscriptionActive: active,
        status: active ? 'subscribed' : 'registered',
        activatedAt: active ? now : null,
        lastUpdated: now,
        monthlyPayout: MONTHLY_PAYOUT,
        earningPerPayment: MONTHLY_PAYOUT,
        earnedTotal: newEarned
      });
    }
  }
};
