import { db } from '@/config/firebase';
import { 
  collection, addDoc, query, where, getDocs, doc, updateDoc, 
  serverTimestamp, orderBy, deleteDoc, getDoc, writeBatch
} from 'firebase/firestore';

export interface ApiKeyData {
  id?: string;
  key: string;
  userId: string;
  userEmail: string;
  name: string;
  active: boolean;
  createdAt: any;
  lastUsedAt: any;
  requestCount: number;
  rateLimit: number;
  allowedEndpoints: string[];
}

const API_KEYS_COLLECTION = 'apiKeys';
const MAX_KEYS_PER_USER = 3;

function generateKey(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = 'pk_live_';
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export const ApiKeyService = {
  async generateApiKey(userId: string, userEmail: string, name: string): Promise<ApiKeyData> {
    // Check max keys
    const existing = await this.listUserKeys(userId);
    if (existing.length >= MAX_KEYS_PER_USER) {
      throw new Error(`Limite de ${MAX_KEYS_PER_USER} chaves atingido. Revogue uma chave existente.`);
    }

    const key = generateKey();
    const keyData: Omit<ApiKeyData, 'id'> = {
      key,
      userId,
      userEmail,
      name: name || 'Minha API Key',
      active: true,
      createdAt: serverTimestamp(),
      lastUsedAt: null,
      requestCount: 0,
      rateLimit: 60,
      allowedEndpoints: ['conteudos', 'episodios', 'categorias', 'busca'],
    };

    const docRef = await addDoc(collection(db, API_KEYS_COLLECTION), keyData);
    return { ...keyData, id: docRef.id };
  },

  async listUserKeys(userId: string): Promise<ApiKeyData[]> {
    const q = query(
      collection(db, API_KEYS_COLLECTION),
      where('userId', '==', userId)
    );
    const snapshot = await getDocs(q);
    const keys = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ApiKeyData));
    return keys.sort((a, b) => {
      const dateA = a.createdAt?.toDate?.() || new Date(0);
      const dateB = b.createdAt?.toDate?.() || new Date(0);
      return dateB.getTime() - dateA.getTime();
    });
  },

  async listAllKeys(): Promise<ApiKeyData[]> {
    const q = query(
      collection(db, API_KEYS_COLLECTION),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ApiKeyData));
  },

  async revokeKey(keyId: string): Promise<void> {
    await updateDoc(doc(db, API_KEYS_COLLECTION, keyId), { active: false });
  },

  async activateKey(keyId: string): Promise<void> {
    await updateDoc(doc(db, API_KEYS_COLLECTION, keyId), { active: true });
  },

  async deleteKey(keyId: string): Promise<void> {
    await deleteDoc(doc(db, API_KEYS_COLLECTION, keyId));
  },

  async regenerateKey(keyId: string): Promise<string> {
    const newKey = generateKey();
    await updateDoc(doc(db, API_KEYS_COLLECTION, keyId), { 
      key: newKey, 
      active: true,
      requestCount: 0,
      lastUsedAt: null 
    });
    return newKey;
  },

  async getUserSubscriptionStatus(userId: string): Promise<{ 
    hasApiFeature: boolean; 
    isExpired: boolean; 
    planName: string;
    expiryDate: string | null;
  }> {
    try {
      const permDoc = await getDoc(doc(db, 'userPermissions', userId));
      if (!permDoc.exists()) {
        return { hasApiFeature: false, isExpired: true, planName: 'Sem plano', expiryDate: null };
      }
      const data = permDoc.data();
      const features: string[] = data.enabledFeatures || [];
      const hasApiFeature = features.includes('minha-api');
      
      let isExpired = false;
      let expiryDate: string | null = null;
      
      if (data.subscriptionExpiry) {
        const expiry = data.subscriptionExpiry.toDate ? data.subscriptionExpiry.toDate() : new Date(data.subscriptionExpiry);
        expiryDate = expiry.toLocaleDateString('pt-BR');
        isExpired = expiry < new Date();
      } else if (data.expiryDate) {
        const expiry = new Date(data.expiryDate);
        expiryDate = expiry.toLocaleDateString('pt-BR');
        isExpired = expiry < new Date();
      }
      
      return { hasApiFeature, isExpired, planName: data.planName || 'Sem plano', expiryDate };
    } catch {
      return { hasApiFeature: false, isExpired: true, planName: 'Erro', expiryDate: null };
    }
  },

  async disableAllUserKeys(userId: string): Promise<number> {
    const q = query(collection(db, API_KEYS_COLLECTION), where('userId', '==', userId), where('active', '==', true));
    const snapshot = await getDocs(q);
    const batch = writeBatch(db);
    snapshot.docs.forEach(d => batch.update(d.ref, { active: false }));
    await batch.commit();
    return snapshot.size;
  },

  async enableAllUserKeys(userId: string): Promise<number> {
    const q = query(collection(db, API_KEYS_COLLECTION), where('userId', '==', userId), where('active', '==', false));
    const snapshot = await getDocs(q);
    const batch = writeBatch(db);
    snapshot.docs.forEach(d => batch.update(d.ref, { active: true }));
    await batch.commit();
    return snapshot.size;
  },
};
