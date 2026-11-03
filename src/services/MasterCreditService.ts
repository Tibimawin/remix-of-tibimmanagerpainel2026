import {
  collection, doc, getDoc, getDocs, setDoc, updateDoc, addDoc, query, where,
  serverTimestamp, runTransaction
} from 'firebase/firestore';
import { db } from '@/config/firebase';

export interface ResellerWholesalePackage {
  credits: number;
  price: number;
  label: string;
  popular?: boolean;
}

export interface ResellerWholesaleConfig {
  enabled: boolean;
  creditPrice: number;
  packages: ResellerWholesalePackage[];
  whatsappAdmin: string;
  pixKeyAdmin: string;
  pixKeyTypeAdmin?: string; // cpf, cnpj, email, telefone, aleatoria
  pixNameAdmin: string;
  instructions: string;
  updatedAt?: string;
}

export interface MasterCreditTxDoc {
  id: string;
  type: 'plano_incluso' | 'compra_atacado' | 'distribuicao_revenda' | 'ajuste_admin' | 'estorno';
  masterId: string;
  masterEmail: string;
  masterName: string;
  credits: number;
  value?: number;
  status: 'pago' | 'pendente' | 'cancelado';
  planName?: string;
  paymentMethod?: string;
  resellerId?: string;
  resellerEmail?: string;
  descricao: string;
  createdAt: string;
  paidAt?: string;
}

export const DEFAULT_WHOLESALE_CONFIG: ResellerWholesaleConfig = {
  enabled: true,
  creditPrice: 2.50, // Preço por crédito avulso
  packages: [
    { credits: 20, price: 40.00, label: 'Pacote Start (20 créditos)', popular: false },
    { credits: 50, price: 90.00, label: 'Pacote Pro (50 créditos)', popular: true },
    { credits: 100, price: 160.00, label: 'Pacote Master (100 créditos)', popular: false },
    { credits: 250, price: 350.00, label: 'Pacote Atacado Ouro (250 créditos)', popular: false },
  ],
  whatsappAdmin: '5511999999999',
  pixKeyAdmin: '',
  pixKeyTypeAdmin: 'chave_aleatoria',
  pixNameAdmin: 'Administração do Painel',
  instructions: 'Selecione o pacote desejado, realize a transferência via PIX e envie o comprovante no WhatsApp do Admin para confirmação e recarga imediata do seu estoque.',
};

export const MasterCreditService = {
  /**
   * Obtém a configuração global de atacado definida pelo Admin
   */
  async getWholesaleConfig(): Promise<ResellerWholesaleConfig> {
    try {
      const snap = await getDoc(doc(db, 'globalConfig', 'resellerWholesale'));
      if (snap.exists()) {
        const d = snap.data();
        return {
          ...DEFAULT_WHOLESALE_CONFIG,
          ...d,
          packages: Array.isArray(d.packages) && d.packages.length > 0 ? d.packages : DEFAULT_WHOLESALE_CONFIG.packages
        };
      }
    } catch (e) {
      console.warn('[MasterCreditService] Falha ao ler globalConfig/resellerWholesale:', e);
    }
    return DEFAULT_WHOLESALE_CONFIG;
  },

  /**
   * Salva a configuração global de atacado (Admin)
   */
  async saveWholesaleConfig(config: Partial<ResellerWholesaleConfig>): Promise<void> {
    const docRef = doc(db, 'globalConfig', 'resellerWholesale');
    await setDoc(docRef, {
      ...DEFAULT_WHOLESALE_CONFIG,
      ...config,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  },

  /**
   * Obtém o saldo de estoque de créditos master de um usuário do painel
   */
  async getMasterCreditBalance(masterId: string): Promise<number> {
    if (!masterId) return 0;
    try {
      const [cfgSnap, userSnap] = await Promise.all([
        getDoc(doc(db, 'userConfigs', masterId)).catch(() => null),
        getDoc(doc(db, 'users', masterId)).catch(() => null)
      ]);
      const cfgBalance = Number(cfgSnap?.data()?.resellerSettings?.masterCreditBalance);
      if (!isNaN(cfgBalance)) return Math.max(0, cfgBalance);
      const userBalance = Number(userSnap?.data()?.resellerCreditBalance);
      if (!isNaN(userBalance)) return Math.max(0, userBalance);
    } catch (e) {
      console.warn('[MasterCreditService] Erro ao ler saldo master:', e);
    }
    return 0;
  },

  /**
   * Adiciona créditos de revenda ao estoque master do usuário (ex: após assinar plano ou comprar do admin)
   */
  async addMasterCredits(
    masterId: string,
    credits: number,
    reason: string,
    meta?: {
      masterEmail?: string;
      masterName?: string;
      value?: number;
      type?: MasterCreditTxDoc['type'];
      planName?: string;
      paymentMethod?: string;
      status?: 'pago' | 'pendente';
    }
  ): Promise<number> {
    const qty = Math.max(0, Math.floor(credits));
    if (!masterId || qty === 0) return 0;

    const emailNorm = (meta?.masterEmail || '').toLowerCase();
    const cleanName = meta?.masterName || 'Master';
    const nowIso = new Date().toISOString();

    const cfgRef = doc(db, 'userConfigs', masterId);
    const userRef = doc(db, 'users', masterId);

    let newBalance = qty;

    try {
      const cfgSnap = await getDoc(cfgRef);
      const existingSettings = cfgSnap.exists() ? (cfgSnap.data().resellerSettings || {}) : {};
      const currentBalance = Number(existingSettings.masterCreditBalance) || 0;
      newBalance = currentBalance + qty;

      await setDoc(cfgRef, {
        resellerSettings: {
          ...existingSettings,
          enabled: existingSettings.enabled !== false,
          masterCreditBalance: newBalance,
          updatedAt: nowIso
        }
      }, { merge: true });

      // Atualiza também no documento users para consultas rápidas
      await setDoc(userRef, {
        resellerCreditBalance: newBalance,
        updatedAt: nowIso
      }, { merge: true });

      // Registrar transação no histórico
      await addDoc(collection(db, 'masterCreditTransactions'), {
        type: meta?.type || 'compra_atacado',
        masterId,
        masterEmail: emailNorm,
        masterName: cleanName,
        credits: qty,
        value: meta?.value ?? 0,
        status: meta?.status || 'pago',
        planName: meta?.planName || null,
        paymentMethod: meta?.paymentMethod || 'pix',
        descricao: reason,
        createdAt: nowIso,
        paidAt: nowIso
      });
    } catch (err) {
      console.error('[MasterCreditService] Erro ao adicionar créditos master:', err);
      throw err;
    }

    return newBalance;
  },

  /**
   * Transfere créditos do estoque do Master para um dos seus Revendedores
   */
  async transferCreditsToReseller(params: {
    masterId: string;
    resellerId: string;
    credits: number;
    resellerEmail?: string;
    resellerName?: string;
    masterEmail?: string;
    masterName?: string;
  }): Promise<{ ok: boolean; newMasterBalance: number; newResellerBalance: number }> {
    const { masterId, resellerId, credits, resellerEmail, resellerName, masterEmail, masterName } = params;
    const delta = Math.floor(credits);
    if (!masterId || !resellerId || delta === 0) {
      throw new Error('Parâmetros inválidos para transferência de créditos.');
    }

    const cfgRef = doc(db, 'userConfigs', masterId);
    const userRef = doc(db, 'users', masterId);
    const resellerRef = doc(db, 'resellers', resellerId);
    const nowIso = new Date().toISOString();

    const [cfgSnap, resSnap] = await Promise.all([
      getDoc(cfgRef),
      getDoc(resellerRef)
    ]);

    if (!resSnap.exists()) {
      throw new Error('Revenda não encontrada no sistema.');
    }

    const resData = resSnap.data();
    const currentResellerBalance = Number(resData.creditBalance) || 0;

    const existingSettings = cfgSnap.exists() ? (cfgSnap.data().resellerSettings || {}) : {};
    const currentMasterBalance = Number(existingSettings.masterCreditBalance) || 0;

    // Se está ADICIONANDO créditos à revenda (delta > 0), o Master precisa ter estoque suficiente
    if (delta > 0 && currentMasterBalance < delta) {
      throw new Error(
        `Saldo insuficiente no seu estoque de créditos! Você possui ${currentMasterBalance} créditos e tentou transferir ${delta}. Compre mais créditos com o Admin para abastecer suas revendas.`
      );
    }

    const newMasterBalance = Math.max(0, currentMasterBalance - delta);
    const newResellerBalance = Math.max(0, currentResellerBalance + delta);

    // Atualiza o master
    await setDoc(cfgRef, {
      resellerSettings: {
        ...existingSettings,
        masterCreditBalance: newMasterBalance,
        updatedAt: nowIso
      }
    }, { merge: true });

    await setDoc(userRef, {
      resellerCreditBalance: newMasterBalance,
      updatedAt: nowIso
    }, { merge: true });

    // Atualiza a revenda
    await updateDoc(resellerRef, {
      creditBalance: newResellerBalance,
      updatedAt: nowIso
    });

    // Registra na coleção do master
    await addDoc(collection(db, 'masterCreditTransactions'), {
      type: delta > 0 ? 'distribuicao_revenda' : 'estorno',
      masterId,
      masterEmail: (masterEmail || '').toLowerCase(),
      masterName: masterName || 'Master',
      credits: Math.abs(delta),
      resellerId,
      resellerEmail: (resellerEmail || resData.email || '').toLowerCase(),
      status: 'pago',
      descricao: delta > 0
        ? `Transferência de ${delta} crédito(s) para a revenda ${resellerName || resData.nome || resData.email}`
        : `Estorno de ${Math.abs(delta)} crédito(s) da revenda ${resellerName || resData.nome || resData.email}`,
      createdAt: nowIso,
      paidAt: nowIso
    });

    // Registra na coleção da revenda
    await addDoc(collection(db, 'resellerTransactions'), {
      type: 'transferencia_master',
      resellerId,
      resellerEmail: (resellerEmail || resData.email || '').toLowerCase(),
      masterId,
      credits: delta,
      status: 'pago',
      descricao: delta > 0
        ? `Recebimento de ${delta} crédito(s) do indicador`
        : `Ajuste manual de saldo pelo indicador (${delta})`,
      createdAt: nowIso,
      paidAt: nowIso
    });

    return {
      ok: true,
      newMasterBalance,
      newResellerBalance
    };
  },

  /**
   * Ajuste administrativo de créditos para um Master
   */
  async adminAdjustMasterCredits(
    masterId: string,
    delta: number,
    reason: string,
    adminEmail?: string
  ): Promise<number> {
    const cfgRef = doc(db, 'userConfigs', masterId);
    const userRef = doc(db, 'users', masterId);
    const nowIso = new Date().toISOString();

    const [cfgSnap, userSnap] = await Promise.all([
      getDoc(cfgRef),
      getDoc(userRef)
    ]);

    const userData = userSnap.exists() ? userSnap.data() : {};
    const existingSettings = cfgSnap.exists() ? (cfgSnap.data().resellerSettings || {}) : {};
    const currentMasterBalance = Number(existingSettings.masterCreditBalance) || 0;
    const newMasterBalance = Math.max(0, currentMasterBalance + delta);

    await setDoc(cfgRef, {
      resellerSettings: {
        ...existingSettings,
        masterCreditBalance: newMasterBalance,
        updatedAt: nowIso
      }
    }, { merge: true });

    await setDoc(userRef, {
      resellerCreditBalance: newMasterBalance,
      updatedAt: nowIso
    }, { merge: true });

    await addDoc(collection(db, 'masterCreditTransactions'), {
      type: 'ajuste_admin',
      masterId,
      masterEmail: (userData.email || '').toLowerCase(),
      masterName: userData.name || userData.userName || 'Master',
      credits: Math.abs(delta),
      status: 'pago',
      descricao: reason || `Ajuste manual pelo Admin (${delta > 0 ? '+' : ''}${delta} créditos)`,
      paymentMethod: `admin:${adminEmail || 'painel'}`,
      createdAt: nowIso,
      paidAt: nowIso
    });

    return newMasterBalance;
  },

  /**
   * Busca todas as transações de atacado e créditos master para o Admin
   */
  async getAllMasterTransactions(): Promise<MasterCreditTxDoc[]> {
    try {
      const snap = await getDocs(collection(db, 'masterCreditTransactions'));
      const list: MasterCreditTxDoc[] = snap.docs.map(d => ({
        id: d.id,
        ...d.data()
      } as MasterCreditTxDoc));
      list.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
      return list;
    } catch (e) {
      console.warn('[MasterCreditService] Erro ao buscar transações de master:', e);
      return [];
    }
  },

  /**
   * Busca métricas consolidadas de revendas para o painel Admin
   */
  async getAdminResellerOverview(): Promise<{
    totalMasters: number;
    totalResellers: number;
    totalMasterCredits: number;
    totalResellerCredits: number;
    totalLinesCreated: number;
    totalWholesaleRevenue: number;
    mastersList: Array<{
      uid: string;
      email: string;
      name: string;
      resellerCreditBalance: number;
      resellerCount: number;
      linesCount: number;
      planName?: string;
    }>;
  }> {
    try {
      const [usersSnap, resellersSnap, resellerTxSnap, masterTxSnap] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'resellers')),
        getDocs(collection(db, 'resellerTransactions')),
        getDocs(collection(db, 'masterCreditTransactions'))
      ]);

      const resellers = resellersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const resellerTxs = resellerTxSnap.docs.map(d => d.data());
      const masterTxs = masterTxSnap.docs.map(d => d.data());

      const linesCreated = resellerTxs.filter(t => t.type === 'linha' || t.type === 'teste').length;
      const wholesaleRevenue = masterTxs
        .filter(t => t.type === 'compra_atacado' && t.status === 'pago')
        .reduce((sum, t) => sum + (Number(t.value) || 0), 0);

      const totalResellerCredits = resellers.reduce((sum, r: any) => sum + (Number(r.creditBalance) || 0), 0);

      // Agrupar revendedores por masterId
      const resellersByMaster = new Map<string, any[]>();
      resellers.forEach((r: any) => {
        const mId = r.masterId || 'sem_master';
        const arr = resellersByMaster.get(mId) || [];
        arr.push(r);
        resellersByMaster.set(mId, arr);
      });

      // Linhas por master
      const linesByMaster = new Map<string, number>();
      resellerTxs.forEach((t: any) => {
        if (t.masterId && (t.type === 'linha' || t.type === 'teste')) {
          linesByMaster.set(t.masterId, (linesByMaster.get(t.masterId) || 0) + 1);
        }
      });

      let totalMasterCredits = 0;
      const mastersList: any[] = [];

      usersSnap.docs.forEach(docSnap => {
        const u = docSnap.data();
        const uid = docSnap.id;
        const bal = Number(u.resellerCreditBalance) || 0;
        totalMasterCredits += bal;

        const myResellers = resellersByMaster.get(uid) || [];
        const myLines = linesByMaster.get(uid) || 0;

        // Se tem revendas, crédito ou plano ativo
        if (myResellers.length > 0 || bal > 0 || u.planName) {
          mastersList.push({
            uid,
            email: (u.email || '').toLowerCase(),
            name: u.name || u.userName || (u.email || '').split('@')[0],
            resellerCreditBalance: bal,
            resellerCount: myResellers.length,
            linesCount: myLines,
            planName: u.planName || 'Sem plano'
          });
        }
      });

      mastersList.sort((a, b) => (b.resellerCount + b.resellerCreditBalance) - (a.resellerCount + a.resellerCreditBalance));

      return {
        totalMasters: mastersList.length,
        totalResellers: resellers.length,
        totalMasterCredits,
        totalResellerCredits,
        totalLinesCreated: linesCreated,
        totalWholesaleRevenue: wholesaleRevenue,
        mastersList
      };
    } catch (err) {
      console.error('[MasterCreditService] Erro ao compilar visão geral:', err);
      return {
        totalMasters: 0,
        totalResellers: 0,
        totalMasterCredits: 0,
        totalResellerCredits: 0,
        totalLinesCreated: 0,
        totalWholesaleRevenue: 0,
        mastersList: []
      };
    }
  }
};
