import { collection, addDoc, getDocs, query, where, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { FirebaseUserService } from '@/services/FirebaseUserService';

export interface Referral {
  id?: string;
  referrerUid: string;
  referrerEmail?: string;
  referredUid: string;
  referredEmail?: string;
  createdAt: string;
  status: 'registered' | 'subscribed' | 'cancelled';
  subscriptionActive: boolean;
  activatedAt?: string;
  monthlyPayout: number;
  lastUpdated: string;
}

const REFERRALS_COLLECTION = 'referrals';
const MONTHLY_PRICE = 30;
const REFERRAL_RATE = 0.33;
const MONTHLY_PAYOUT = Number((MONTHLY_PRICE * REFERRAL_RATE).toFixed(2));

export const ReferralService = {
  generateLink(referrerUid: string) {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return `${origin}/cadastro?ref=${encodeURIComponent(referrerUid)}`;
  },

  async createReferral(referrerUid: string, referredUid: string): Promise<Referral> {
    const referrer = await FirebaseUserService.getUserById(referrerUid);
    const referred = await FirebaseUserService.getUserById(referredUid);

    const payload: Omit<Referral, 'id'> = {
      referrerUid,
      referrerEmail: referrer?.email,
      referredUid,
      referredEmail: referred?.email,
      createdAt: new Date().toISOString(),
      status: 'registered',
      subscriptionActive: false,
      activatedAt: undefined,
      monthlyPayout: MONTHLY_PAYOUT,
      lastUpdated: new Date().toISOString()
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
      items.push({ id: d.id, ...data });
    });
    items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return items;
  },

  async getAllReferrals(): Promise<Referral[]> {
    const snapshot = await getDocs(collection(db, REFERRALS_COLLECTION));
    const items: Referral[] = [];
    snapshot.forEach(d => {
      const data = d.data() as Referral;
      items.push({ id: d.id, ...data });
    });
    items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return items;
  },

  async updateSubscriptionStatusByReferred(referredUid: string, active: boolean): Promise<void> {
    const q = query(collection(db, REFERRALS_COLLECTION), where('referredUid', '==', referredUid));
    const snapshot = await getDocs(q);
    const now = new Date().toISOString();
    for (const d of snapshot.docs) {
      await updateDoc(doc(db, REFERRALS_COLLECTION, d.id), {
        subscriptionActive: active,
        status: active ? 'subscribed' : 'registered',
        activatedAt: active ? now : null,
        lastUpdated: now
      });
    }
  }
};