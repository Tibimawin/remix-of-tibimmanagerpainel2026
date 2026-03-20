import { db } from '@/config/firebase';
import { 
  collection, addDoc, query, where, getDocs, doc, updateDoc, 
  serverTimestamp, orderBy, deleteDoc 
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
      where('userId', '==', userId),
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
};
