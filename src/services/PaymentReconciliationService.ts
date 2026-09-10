import { collection, doc, getDoc, getDocs, setDoc, addDoc, query, where, runTransaction, arrayUnion } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { AsaasPaymentService } from './AsaasPaymentService';
import { FirebaseUserService } from './FirebaseUserService';
import { PlansService } from './PlansService';
import { SourceExportService } from './SourceExportService';
import { pushEventsService } from './PushEventsService';
import { Plan, AVAILABLE_FEATURES } from '@/types/planTypes';

// Throttle em memória para evitar chamadas contínuas desnecessárias
const lastReconciliationTimestamps = new Map<string, number>();

export interface ReconcileResult {
  reconciled: boolean;
  message: string;
  activatedPlans: string[];
  daysAdded: number;
}

/**
 * Função auxiliar para resolver o ID de uma funcionalidade a partir do texto/descrição
 */
export function resolveFeatureId(nameOrId: string): string | null {
  if (!nameOrId) return null;
  const norm = nameOrId.toLowerCase().trim();

  // 1. Match direto por ID exato
  const directMatch = AVAILABLE_FEATURES.find(f => f.id.toLowerCase() === norm);
  if (directMatch) return directMatch.id;

  // 2. Mapeamentos rápidos para termos populares
  if (norm.includes('jogos') || norm.includes('jogo ao dia') || norm.includes('jogo do dia') || norm.includes('jogos-dia')) return 'jogos-dia';
  if (norm.includes('gerador de post') || norm.includes('gerador-post') || norm.includes('post')) return 'gerador-post';
  if (norm.includes('gerador de banner') || norm.includes('gerador-banner') || norm.includes('banner')) return 'gerador-banner';
  if (norm.includes('ferramentas ia') || norm.includes('ferramentas-ia') || norm.includes('inteligencia') || norm.includes('ia')) return 'ferramentas-ia';
  if (norm.includes('importar m3u') || norm.includes('importar-m3u')) return 'importar-m3u';
  if (norm.includes('canais') || norm.includes('importar-canais-tv')) return 'importar-canais-tv';
  if (norm.includes('atualizacao') || norm.includes('series') || norm.includes('atualizacao-series')) return 'atualizacao-series';
  if (norm.includes('miniseries') || norm.includes('minisséries')) return 'miniseries';
  if (norm.includes('maxplus') || norm.includes('maxplus-import')) return 'maxplus-import';
  if (norm.includes('duplicados-episodios-otimizado')) return 'duplicados-episodios-otimizado';
  if (norm.includes('duplicados-episodios')) return 'duplicados-episodios';
  if (norm.includes('duplicados')) return 'duplicados';
  if (norm.includes('automacao') || norm.includes('automação')) return 'automacao';
  if (norm.includes('importacao-automatica') || norm.includes('importacao auto')) return 'importacao-automatica';
  if (norm.includes('minha-api') || norm.includes('integracao api') || norm.includes('integração api')) return 'minha-api';
  if (norm.includes('clean-data') || norm.includes('limpeza')) return 'clean-data';
  if (norm.includes('gestao-dispositivos') || norm.includes('dispositivos')) return 'gestao-dispositivos';

  // 3. Match por nome cadastrado em AVAILABLE_FEATURES
  const nameMatch = AVAILABLE_FEATURES.find(f => {
    const fn = f.name.toLowerCase();
    return norm.includes(fn) || fn.includes(norm);
  });
  if (nameMatch) return nameMatch.id;

  return null;
}

export const PaymentReconciliationService = {
  /**
   * Executa uma transação no Firebase Firestore ao processar a liberação de funcionalidades.
   * Regras estritas:
   * 1. Lê atomicamente as permissões e o usuário no Firestore.
   * 2. Verifica se o usuário já possui um plano ativo e mantém o plano intacto.
   * 3. Apenas adiciona o novo recurso à lista de 'enabledFeatures' (sem duplicatas e preservando os existentes).
   * 4. Garante que o timestamp de expiração da assinatura (expiryDate) NÃO seja sobrescrito ou estendido.
   */
  async unlockFeatureWithTransaction(
    userId: string,
    userEmail: string,
    userName: string,
    targetFeatureId: string,
    paymentId: string,
    planPrice: number = 15
  ): Promise<{
    planName: string;
    enabledFeatures: string[];
    expiryDate: string;
    hasActivePlan: boolean;
  }> {
    const emailNorm = (userEmail || '').toLowerCase().trim();
    const cleanUserName = userName || emailNorm.split('@')[0] || 'Usuário';

    const featureObj = AVAILABLE_FEATURES.find(f => f.id === targetFeatureId);
    const featureDisplayName = featureObj?.name || targetFeatureId;

    const permissionsRef = doc(db, 'userPermissions', userId);
    const userRef = doc(db, 'users', userId);
    const unlockDocRef = doc(db, 'featureUnlocks', `${userId}_${targetFeatureId}`);
    const autoLogDocRef = doc(collection(db, 'autoPermissionLogs'));

    console.log(`🔒 [Transaction] Processando liberação atômica de '${targetFeatureId}' para ${emailNorm} (ID: ${userId})...`);

    const result = await runTransaction(db, async (transaction) => {
      // LEITURAS ATÔMICAS (Devem preceder todas as escritas)
      const permissionsSnap = await transaction.get(permissionsRef);
      const userSnap = await transaction.get(userRef);

      const permData = permissionsSnap.exists() ? permissionsSnap.data() : null;
      const userData = userSnap.exists() ? userSnap.data() : null;

      // 1. Extrair funcionalidades existentes
      const currentFeatures: string[] = (permData && Array.isArray(permData.enabledFeatures))
        ? permData.enabledFeatures
        : [];

      // 2. Verificar dados do plano existente
      const existingPlanId = permData?.planId || 'plano-atual';
      const existingPlanName = permData?.planName || 'Plano Atual';
      const existingMonthlyLimit = permData?.monthlyContentLimit ?? -1;
      const existingUsage = permData?.currentMonthUsage || 0;
      const existingIsActive = permData?.isActive !== undefined
        ? permData.isActive
        : (userData?.isActive !== undefined ? userData.isActive : true);

      // 3. ⚠️ GARANTIA ATÔMICA DO TIMESTAMP DE EXPIRAÇÃO:
      // O timestamp de expiração da assinatura do plano NÃO é sobrescrito nem estendido!
      const existingExpiryDate: string = permData?.expiryDate || userData?.expiryDate || new Date(Date.now() + 30 * 86400000).toISOString();

      const hasActivePlan = (permData?.planName && permData.planName !== 'Gratuito (1 dia)') ||
                            (userData?.expiryDate && new Date(userData.expiryDate).getTime() > Date.now());

      // 4. Adicionar apenas o novo recurso à lista de 'features' permitidas sem duplicatas
      const extraFeaturesToAdd = [targetFeatureId];
      if (targetFeatureId === 'maxplus' || targetFeatureId === 'maxplus-import') {
        extraFeaturesToAdd.push('maxplus', 'maxplus-import');
      }
      const mergedFeatures = Array.from(new Set([
        ...currentFeatures,
        ...extraFeaturesToAdd,
        'planos'
      ]));

      // ESCRITAS ATÔMICAS
      // Atualizar userPermissions preservando 100% dos dados de plano e validade
      transaction.set(permissionsRef, {
        userId,
        userEmail: emailNorm,
        userName: cleanUserName,
        planId: existingPlanId,
        planName: existingPlanName,
        monthlyContentLimit: existingMonthlyLimit,
        enabledFeatures: mergedFeatures,
        currentMonthUsage: existingUsage,
        lastUpdated: new Date().toISOString(),
        // 🛡️ TIMESTAMP PRESERVADO INTACTO (Não estendido e não sobrescrito)
        expiryDate: existingExpiryDate,
        isActive: existingIsActive
      }, { merge: true });

      // Registrar o desbloqueio permanente na coleção featureUnlocks
      transaction.set(unlockDocRef, {
        userId,
        userEmail: emailNorm,
        userName: cleanUserName,
        featureId: targetFeatureId,
        featureName: featureDisplayName,
        amount: planPrice,
        paymentId,
        unlockedAt: new Date().toISOString(),
        status: 'active'
      }, { merge: true });

      // Registrar log auditável de auto-permissão
      transaction.set(autoLogDocRef, {
        userId,
        userEmail: emailNorm,
        userName: cleanUserName,
        planName: existingPlanName,
        planId: existingPlanId,
        featureId: targetFeatureId,
        featureName: featureDisplayName,
        featuresCount: mergedFeatures.length,
        features: mergedFeatures,
        grantedAt: new Date().toISOString(),
        source: 'firebase-transaction-feature-unlock',
        paymentId,
        originalExpiryDatePreserved: existingExpiryDate
      });

      return {
        planName: existingPlanName,
        enabledFeatures: mergedFeatures,
        expiryDate: existingExpiryDate,
        hasActivePlan
      };
    });

    console.log(`✅ [Transaction] Transação concluída com sucesso! Recurso '${targetFeatureId}' liberado. Expiração preservada: ${result.expiryDate}`);

    // Push notification (após confirmação da transação)
    try {
      await pushEventsService.notifyPaymentConfirmed({
        paymentId,
        accessDays: 0,
      });
    } catch (pushErr) {
      console.warn('Falha no push pós-transação:', pushErr);
    }

    return result;
  },

  /**
   * Ativa as permissões e dias de um plano, produto ou desbloqueio avulso de funcionalidade
   */
  async activatePaidPlanOrProduct(
    userId: string,
    userEmail: string,
    userName: string,
    planInfo: {
      planName?: string;
      planPrice?: number;
      accessDays?: number;
      isUpgrade?: boolean;
      upgradeFrom?: string;
      source?: string;
      isFeatureUnlockOnly?: boolean;
      requiredFeature?: string;
      items?: Array<{ id: string; name: string; price: number; qty?: number }>;
      paymentDate?: string;
    },
    paymentId: string
  ): Promise<{ planName: string; accessDays: number }> {
    console.log(`🚀 [Reconciliation] Ativando plano/produto para ${userEmail} (${userId}) - Pagamento: ${paymentId}`, planInfo);

    const emailNorm = (userEmail || '').toLowerCase().trim();
    const cleanUserName = userName || emailNorm.split('@')[0] || 'Usuário';

    // ─────────────────────────────────────────────────────────────
    // 1. COMPRA DA LOJA (Produtos avulsos como Acervo ou Backup)
    // ─────────────────────────────────────────────────────────────
    if (planInfo.source === 'store_cart' || planInfo.items?.length) {
      if (planInfo.items && planInfo.items.length > 0) {
        for (const item of planInfo.items) {
          await SourceExportService.recordPurchase({
            paymentId: `${paymentId}_${item.id}`,
            userId,
            userEmail: emailNorm,
            userName: cleanUserName,
            amount: item.price * (item.qty || 1),
            productId: item.id,
            productName: item.name,
          });
        }
      }
      return { planName: planInfo.planName || 'Produtos da Loja', accessDays: 0 };
    }

    const normalizedName = (planInfo.planName || '').toLowerCase();

    // ─────────────────────────────────────────────────────────────
    // 2. PRODUTOS ESPECÍFICOS DA LOJA (Carga Total ou Backup em Nuvem)
    // ─────────────────────────────────────────────────────────────
    if (normalizedName.includes('carga total') || normalizedName.includes('acervo completo')) {
      await SourceExportService.recordPurchase({
        paymentId,
        userId,
        userEmail: emailNorm,
        userName: cleanUserName,
        amount: planInfo.planPrice || 10,
        productId: 'source_csv_full',
        productName: 'Carga Total do Painel (Acervo Completo)',
      });
      return { planName: 'Carga Total do Painel', accessDays: 0 };
    }

    if (normalizedName.includes('backup') || normalizedName.includes('nuvem')) {
      await SourceExportService.recordPurchase({
        paymentId,
        userId,
        userEmail: emailNorm,
        userName: cleanUserName,
        amount: planInfo.planPrice || 20,
        productId: 'backup_nuvem_auto',
        productName: 'Módulo Backup em Nuvem Automático',
      });
      return { planName: 'Módulo Backup em Nuvem Automático', accessDays: 0 };
    }

    // ─────────────────────────────────────────────────────────────
    // 3. DESBLOQUEIO DE FUNCIONALIDADE AVULSA (R$ 15,00)
    // TRANSAÇÃO NO FIREBASE:
    // - Executa via runTransaction do Firestore garantindo atomicidade.
    // - Verifica se o usuário já possui um plano ativo e dados no banco.
    // - Adiciona a funcionalidade à lista de features permitidas sem duplicatas.
    // - Garante que o timestamp de expiração da assinatura do plano NÃO seja sobrescrito ou estendido.
    // ─────────────────────────────────────────────────────────────
    const isFeatureUnlock = 
      planInfo.isFeatureUnlockOnly === true ||
      planInfo.source === 'feature_unlock' ||
      (planInfo.planPrice !== undefined && planInfo.planPrice <= 25 && (
        normalizedName.includes('desbloqueio') ||
        normalizedName.includes('unlock') ||
        normalizedName.includes('avulso') ||
        normalizedName.includes('liberar recurso')
      ));

    if (isFeatureUnlock) {
      console.log(`🔓 [Reconciliation] Desbloqueio avulso de recurso para ${emailNorm} (Transação Firestore - Plano e Validade INALTERADOS)`);
      
      // Descobrir qual é a funcionalidade
      let targetFeatureId = planInfo.requiredFeature;
      if (!targetFeatureId) {
        targetFeatureId = resolveFeatureId(planInfo.planName || '') || 'jogos-dia';
      }

      const txResult = await this.unlockFeatureWithTransaction(
        userId,
        emailNorm,
        cleanUserName,
        targetFeatureId,
        paymentId,
        planInfo.planPrice || 15
      );

      return {
        planName: txResult.planName || `Desbloqueio: ${targetFeatureId}`,
        accessDays: 0
      };
    }

    // ─────────────────────────────────────────────────────────────
    // 4. PLANO DE ASSINATURA DO PAINEL (Mensal, Trimestral, Anual)
    // ─────────────────────────────────────────────────────────────
    const price = planInfo.planPrice || 35;
    
    // Buscar planos cadastrados para sincronizar permissões e dias
    let allPlans: Plan[] = [];
    try {
      allPlans = await PlansService.getAllPlans();
    } catch (e) {
      console.warn('Não foi possível carregar planos:', e);
    }

    const cleanStr = (s: string) => (s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // remove acentos
      .replace(/jodo/g, 'jogo') // tolera digitação comum "jodo do dia" -> "jogo do dia"
      .replace(/\+/g, ' ')
      .replace(/[^a-z0-9]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const extractPrice = (priceVal: any): number => {
      if (typeof priceVal === 'number') return priceVal;
      if (!priceVal) return 0;
      const str = String(priceVal).replace(/[^\d,\.]/g, '').replace(',', '.');
      const num = parseFloat(str);
      return isNaN(num) ? 0 : num;
    };

    const targetPlanName = planInfo.planName || '';
    const targetCleanName = cleanStr(targetPlanName);
    const targetPrice = planInfo.planPrice || price;

    // Encontrar o plano mais adequado de forma inteligente, segura e determinística
    let matchedPlan: Plan | undefined;

    // 1. Match por ID direto se fornecido
    if (planInfo.planId) {
      matchedPlan = allPlans.find(p => p.id === planInfo.planId);
    }

    // 2. Match por nome exato limpo
    if (!matchedPlan && targetCleanName) {
      matchedPlan = allPlans.find(p => cleanStr(p.name) === targetCleanName);
    }

    // 3. Match por inclusão mútua de texto (ex: "Painel + Baserow + Miniseries + Jodo do Dia")
    if (!matchedPlan && targetCleanName) {
      matchedPlan = allPlans.find(p => {
        const pClean = cleanStr(p.name);
        return pClean.includes(targetCleanName) || targetCleanName.includes(pClean);
      });
    }

    // 4. Match por contagem de tokens comuns (palavras-chave como "painel", "baserow", "miniseries", "jogo")
    if (!matchedPlan && targetCleanName) {
      const targetTokens = targetCleanName.split(' ').filter(t => t.length > 2 && t !== 'plano' && t !== 'assinatura');
      let bestScore = 0;
      let bestPlan: Plan | undefined;
      for (const p of allPlans) {
        const pClean = cleanStr(p.name);
        const pTokens = pClean.split(' ').filter(t => t.length > 2);
        let score = 0;
        for (const token of targetTokens) {
          if (pTokens.includes(token) || pClean.includes(token)) score++;
        }
        if (score > bestScore) {
          bestScore = score;
          bestPlan = p;
        }
      }
      if (bestScore >= 2) {
        matchedPlan = bestPlan;
      }
    }

    // 5. Match por PREÇO MAIS PRÓXIMO (Diferença mínima)
    // Se o cliente pagou R$ 44,90, procura o plano cadastrado com valor mais próximo
    if (!matchedPlan && targetPrice > 0 && allPlans.length > 0) {
      let closestPlan: Plan | undefined;
      let minDiff = Infinity;

      for (const p of allPlans) {
        const pPriceNum = extractPrice(p.price);
        if (pPriceNum > 0) {
          const diff = Math.abs(pPriceNum - targetPrice);
          if (diff < minDiff) {
            minDiff = diff;
            closestPlan = p;
          }
        }
      }

      // Se a diferença for de até R$ 5,00
      if (closestPlan && minDiff <= 5) {
        matchedPlan = closestPlan;
        console.log(`🎯 Plano associado com precisão por proximidade de preço: "${closestPlan.name}" (R$ ${targetPrice})`);
      }
    }

    // 6. Fallback estritamente por faixa de preço - NUNCA atribuir Anual/Empresa para valores baixos!
    if (!matchedPlan && allPlans.length > 0) {
      if (targetPrice <= 65) {
        matchedPlan = allPlans.find(p => {
          const pPrice = extractPrice(p.price);
          return pPrice > 0 && pPrice <= 65;
        }) || allPlans.find(p => !cleanStr(p.name).includes('anual') && !cleanStr(p.name).includes('empresa'));
      } else if (targetPrice > 65 && targetPrice < 200) {
        matchedPlan = allPlans.find(p => {
          const pPrice = extractPrice(p.price);
          return pPrice > 65 && pPrice < 200;
        }) || allPlans.find(p => cleanStr(p.name).includes('trimestral') || cleanStr(p.name).includes('semestral'));
      } else {
        matchedPlan = allPlans.find(p => {
          const pPrice = extractPrice(p.price);
          return pPrice >= 200;
        }) || allPlans.find(p => cleanStr(p.name).includes('anual') || cleanStr(p.name).includes('empresa'));
      }
    }

    // ─────────────────────────────────────────────────────────────
    // DETERMINAÇÃO PRECISA DOS DIAS DE ACESSO (MUDANÇA DE MÊS PARA DIAS)
    // O sistema agora trabalha diretamente com DIAS:
    // - Se há durationDays configurado no plano do Admin -> USA EXATAMENTE ELE
    // - Se o plano diz "mês" ou custa <= 65 -> EXATAMENTE 30 DIAS
    // - Se trimestral -> 90 DIAS
    // - Se semestral -> 180 DIAS
    // - Se anual -> 365 DIAS
    // ─────────────────────────────────────────────────────────────
    let accessDays = 0;

    if (matchedPlan?.durationDays && Number(matchedPlan.durationDays) > 0) {
      accessDays = Number(matchedPlan.durationDays);
    } else if (planInfo.accessDays && Number(planInfo.accessDays) > 0) {
      accessDays = Number(planInfo.accessDays);
    }

    if (!accessDays || isNaN(accessDays) || accessDays <= 0) {
      const pNameNorm = cleanStr(matchedPlan?.name || targetPlanName);
      const pPriceStr = (matchedPlan?.price || '').toLowerCase();
      
      if (pPriceStr.includes('mês') || pPriceStr.includes('mes') || pNameNorm.includes('mes') || pNameNorm.includes('mensal') || targetPrice <= 65) {
        accessDays = 30; // 30 dias para mensal
      } else if (pNameNorm.includes('anual') || pNameNorm.includes('ano') || pPriceStr.includes('anual') || targetPrice >= 200) {
        accessDays = 365;
      } else if (pNameNorm.includes('semestral') || pPriceStr.includes('semestral') || (targetPrice >= 130 && targetPrice < 200)) {
        accessDays = 180;
      } else if (pNameNorm.includes('trimestral') || pPriceStr.includes('trimestral') || (targetPrice >= 65 && targetPrice < 130)) {
        accessDays = 90;
      } else if (pNameNorm.includes('quinzenal')) {
        accessDays = 15;
      } else if (pNameNorm.includes('semanal')) {
        accessDays = 7;
      } else {
        accessDays = 30; // Padrão absoluto: 30 dias
      }
    }
    accessDays = Math.max(1, Number(accessDays) || 30);

    // Data de início da assinatura: a data que ele assinou recentemente (ex: dia 28)
    const now = new Date();
    let subscriptionStart = now;
    if (planInfo.paymentDate) {
      const parsedPayDate = new Date(planInfo.paymentDate);
      if (!isNaN(parsedPayDate.getTime())) {
        subscriptionStart = parsedPayDate;
      }
    }

    // Buscar dados do usuário existente no Firestore para checar histórico e expiração anterior
    let existingUser: any = null;
    try {
      existingUser = await FirebaseUserService.getUserById(userId);
    } catch { }

    let baseExpiryDate = new Date(subscriptionStart);
    // Se o usuário já tem expiração futura válida e NÃO ANORMAL (diff <= 35 dias para plano mensal):
    if (existingUser?.expiryDate) {
      const currentExpiry = new Date(existingUser.expiryDate);
      const diffDays = (currentExpiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      const maxAllowedCarryover = accessDays <= 35 ? 35 : (accessDays * 1.2);
      if (!isNaN(currentExpiry.getTime()) && currentExpiry > now && diffDays <= maxAllowedCarryover && currentExpiry.getFullYear() <= now.getFullYear() + 1) {
        baseExpiryDate = currentExpiry;
      }
    }

    const calculatedEndDate = new Date(baseExpiryDate.getTime() + accessDays * 24 * 60 * 60 * 1000);

    // Trava de segurança rigorosa contra multiplicação indevida de anos:
    // Uma assinatura mensal NUNCA pode ter validade maior que now + 65 dias!
    // Uma assinatura anual NUNCA pode ter validade maior que now + 400 dias!
    const hardMaxDays = accessDays <= 35 ? 65 : (accessDays <= 95 ? 120 : (accessDays <= 185 ? 210 : 400));
    const maxAllowedExpiry = new Date(now.getTime() + hardMaxDays * 24 * 60 * 60 * 1000);
    const finalExpiryDate = calculatedEndDate > maxAllowedExpiry ? maxAllowedExpiry : calculatedEndDate;

    const safeStartDate = subscriptionStart.toISOString();
    const safeExpiryDate = finalExpiryDate.toISOString();

    // Atualizar registro do usuário
    try {
      const userUpdates: any = {
        accessDays, // Exatamente os dias do plano (ex: 30 dias)!
        startDate: safeStartDate,
        lastSubscriptionDate: safeStartDate,
        expiryDate: safeExpiryDate,
        isActive: true
      };
      if (paymentId) {
        userUpdates.processedPaymentIds = arrayUnion(paymentId);
      }
      if (matchedPlan) {
        userUpdates.planName = matchedPlan.name;
        userUpdates.planId = matchedPlan.id;
      }

      if (existingUser) {
        await FirebaseUserService.updateUser(userId, userUpdates);
      } else {
        await FirebaseUserService.createUserRecord({
          uid: userId,
          email: emailNorm,
          name: cleanUserName,
          accessDays,
          startDate: safeStartDate,
          expiryDate: safeExpiryDate,
          isActive: true
        });
      }
      console.log(`✅ [PaymentReconciliation] Usuário ${userId} atualizado: ${accessDays} dias, início ${safeStartDate}, expira ${safeExpiryDate}`);
    } catch (userErr) {
      console.warn('Aviso ao atualizar registro do usuário:', userErr);
    }

    const permissionsRef = doc(db, 'userPermissions', userId);
    const permissionsDoc = await getDoc(permissionsRef);
    const currentPermissions = permissionsDoc.exists() ? permissionsDoc.data() : {};
    const existingFeatures = Array.isArray(currentPermissions.enabledFeatures) ? currentPermissions.enabledFeatures : [];

    let enabledFeatures: string[] = [];
    let finalPlanName = matchedPlan?.name || targetPlanName || (targetPrice >= 200 ? 'Plano Anual' : 'Plano Painel');
    let finalPlanId = matchedPlan?.id || (targetPrice >= 200 ? 'plano-anual' : 'plano-painel');
    let monthlyContentLimit = matchedPlan?.monthlyContentLimit ?? -1;

    const planNameNorm = cleanStr(finalPlanName);
    const featuresSet = new Set<string>();

    // Se o plano tiver features configuradas no Admin, adiciona todas
    if (matchedPlan && Array.isArray(matchedPlan.features) && matchedPlan.features.length > 0) {
      matchedPlan.features.forEach(f => featuresSet.add(f));
    }

    // Se é um upgrade
    if (planInfo.isUpgrade) {
      finalPlanName = `${planInfo.upgradeFrom || 'Plano'} + API`;
      existingFeatures.forEach(f => featuresSet.add(f));
      featuresSet.add('minha-api');
    }

    // Se o plano menciona "painel" ou se a lista de features ficou vazia, libera recursos padrão do painel:
    if (planNameNorm.includes('painel') || featuresSet.size === 0) {
      const standardPanelFeatures = [
        'dashboard', 'conteudos', 'episodios', 'categorias', 'banners',
        'duplicados', 'duplicados-episodios', 'importacao-automatica', 'automacao',
        'substituicao-urls', 'importar-m3u', 'adicionar-conteudo', 'usuarios',
        'sessoes', 'plataformas', 'produtos', 'estatisticas', 'relatorios-visualizacao',
        'recursos', 'clean-data', 'precos-interno', 'configuracoes',
        'perfil', 'suporte-ao-vivo', 'priority-support', 'export', 'logs'
      ];
      standardPanelFeatures.forEach(f => featuresSet.add(f));
    }

    // Se o plano menciona "baserow"
    if (planNameNorm.includes('baserow')) {
      featuresSet.add('clean-data');
      featuresSet.add('export');
    }

    // Regra Estrita MaxPlus:
    // A liberação do MaxPlus só ocorre no plano completo ("Painel + Baserow + Miniseries + Jodo do Dia" / R$ 44,90)
    // ou em planos explicitamente dedicados ao MaxPlus
    const isMaxPlusComboPlan = 
      (planNameNorm.includes('miniseries') && (planNameNorm.includes('jodo') || planNameNorm.includes('jogo'))) ||
      (planNameNorm.includes('baserow') && (planNameNorm.includes('jodo') || planNameNorm.includes('jogo'))) ||
      planNameNorm.includes('maxplus') ||
      Math.abs(targetPrice - 44.90) <= 2;

    if (isMaxPlusComboPlan) {
      featuresSet.add('maxplus');
      featuresSet.add('maxplus-import');
      featuresSet.add('miniseries');
      featuresSet.add('jogos-dia');
      featuresSet.add('jogos');
      featuresSet.add('clean-data');
    }

    // Se o plano menciona "miniseries"
    if (planNameNorm.includes('miniseries') || planNameNorm.includes('minisserie')) {
      featuresSet.add('miniseries');
    }

    // Se o plano menciona "jogo" ou "jodo" (ex: "Jodo do Dia" ou "Jogo do Dia")
    if (planNameNorm.includes('jogo') || planNameNorm.includes('jodo') || planNameNorm.includes('jogos') || planNameNorm.includes('jogos-dia')) {
      featuresSet.add('jogos-dia');
    }

    // Sempre incluir 'planos'
    featuresSet.add('planos');

    enabledFeatures = Array.from(featuresSet);

    const permUpdates: any = {
      userId,
      userEmail: emailNorm,
      userName: cleanUserName,
      planId: finalPlanId,
      planName: finalPlanName,
      monthlyContentLimit,
      enabledFeatures,
      currentMonthUsage: currentPermissions.currentMonthUsage || 0,
      lastUpdated: new Date().toISOString(),
      accessDays,
      durationDays: accessDays,
      startDate: safeStartDate,
      lastSubscriptionDate: safeStartDate,
      expiryDate: safeExpiryDate,
      isActive: true
    };
    if (paymentId) {
      permUpdates.processedPaymentIds = arrayUnion(paymentId);
    }

    await setDoc(permissionsRef, permUpdates, { merge: true });

    console.log(`🔓 Permissões gravadas no Firestore para ${emailNorm}: ${finalPlanName} (${enabledFeatures.length} features, ${accessDays} dias)`);

    // Sincronização automática com o Baserow
    try {
      const { BaserowUserSyncService } = await import('@/services/BaserowUserSyncService');
      await BaserowUserSyncService.syncUserToBaserow({
        name: cleanUserName,
        email: emailNorm,
        accessDays,
        startDate: safeStartDate,
        expiryDate: safeExpiryDate,
        isActive: true
      });
    } catch (bErr) {
      console.warn('Aviso ao sincronizar Baserow no pagamento:', bErr);
    }

    // Registrar log
    try {
      await addDoc(collection(db, 'autoPermissionLogs'), {
        userId,
        userEmail: emailNorm,
        userName: cleanUserName,
        planName: finalPlanName,
        planId: finalPlanId,
        featuresCount: enabledFeatures.length,
        features: enabledFeatures,
        grantedAt: new Date().toISOString(),
        source: 'reconciliation-engine',
        paymentId
      });
    } catch (logErr) {
      console.warn('Erro ao salvar autoPermissionLogs:', logErr);
    }

    // Notificar push
    try {
      await pushEventsService.notifyPaymentConfirmed({
        paymentId,
        accessDays,
      });
    } catch (pushErr) {
      console.warn('Falha no push:', pushErr);
    }

    return { planName: finalPlanName, accessDays };
  },

  /**
   * Reconcilia todos os pagamentos pendentes do usuário logado
   * Checa tanto os financialRecords pendentes quanto o histórico do Asaas por email
   */
  async reconcileUserPayments(
    userId: string,
    userEmail: string,
    userName?: string,
    force: boolean = false
  ): Promise<ReconcileResult> {
    if (!userId || !userEmail) {
      return { reconciled: false, message: 'Dados do usuário ausentes', activatedPlans: [], daysAdded: 0 };
    }

    const emailNorm = userEmail.toLowerCase().trim();

    // Throttling: evitar múltiplas chamadas consecutivas em menos de 3 minutos
    if (!force) {
      const lastCheck = lastReconciliationTimestamps.get(userId) || 0;
      if (Date.now() - lastCheck < 3 * 60 * 1000) {
        return { reconciled: false, message: 'Reconciliação já executada recentemente', activatedPlans: [], daysAdded: 0 };
      }
    }
    lastReconciliationTimestamps.set(userId, Date.now());

    console.log(`🔍 [PaymentReconciliation] Iniciando reconciliação automática para: ${userEmail}`);
    const activatedPlans: string[] = [];
    let totalDaysAdded = 0;

    try {
      // Carregar lista de pagamentos já processados para nunca reprocessar
      let processedSet = new Set<string>();
      try {
        const permDoc = await getDoc(doc(db, 'userPermissions', userId));
        if (permDoc.exists()) {
          const permData = permDoc.data();
          if (Array.isArray(permData.processedPaymentIds)) {
            permData.processedPaymentIds.forEach((id: string) => processedSet.add(id));
          }
        }
      } catch (e) {
        console.warn('Aviso ao carregar processedPaymentIds:', e);
      }

      // ── PASSO 1: Verificar financialRecords pendentes no Firestore ──
      const qPending = query(
        collection(db, 'financialRecords'),
        where('userEmail', '==', emailNorm),
        where('status', '==', 'pending')
      );
      const pendingSnap = await getDocs(qPending);
      console.log(`📋 Encontrados ${pendingSnap.docs.length} registros pendentes no Firestore para ${emailNorm}`);

      for (const docSnap of pendingSnap.docs) {
        const record = docSnap.data();
        const paymentId = record.paymentId || docSnap.id;

        // Se já foi processado anteriormente, pular
        if (paymentId && processedSet.has(paymentId)) {
          continue;
        }

        try {
          const asaasStatus = await AsaasPaymentService.getPaymentStatus(paymentId);
          console.log(`Status Asaas para cobrança pendente ${paymentId}:`, asaasStatus?.status);

          if (asaasStatus?.status === 'RECEIVED' || asaasStatus?.status === 'CONFIRMED') {
            const isFeatureUnlock = record.isFeatureUnlockOnly === true || 
                                    record.source === 'feature_unlock' ||
                                    (record.planPrice !== undefined && record.planPrice <= 25 && (
                                      record.planName?.toLowerCase().includes('desbloqueio') ||
                                      record.planName?.toLowerCase().includes('unlock') ||
                                      record.planName?.toLowerCase().includes('avulso')
                                    ));

            const paymentDate = record.createdAt || asaasStatus.paymentDate || asaasStatus.clientPaymentDate;

            const { planName, accessDays } = await this.activatePaidPlanOrProduct(
              userId,
              emailNorm,
              userName || record.userName || '',
              {
                planId: record.planId,
                planName: record.planName,
                planPrice: record.planPrice || asaasStatus.value,
                accessDays: isFeatureUnlock ? 0 : (record.durationDays || record.accessDays),
                durationDays: isFeatureUnlock ? 0 : (record.durationDays || record.accessDays),
                isUpgrade: record.isUpgrade,
                upgradeFrom: record.upgradeFrom,
                source: record.source,
                isFeatureUnlockOnly: isFeatureUnlock,
                requiredFeature: isFeatureUnlock ? (record.requiredFeature || resolveFeatureId(record.planName || '') || undefined) : undefined,
                items: record.items,
                paymentDate
              },
              paymentId
            );

            // Atualizar status no Firestore para confirmed
            await setDoc(doc(db, 'financialRecords', paymentId), {
              status: 'confirmed',
              confirmedAt: new Date().toISOString(),
              asaasPaymentStatus: asaasStatus.status,
              accessDays: isFeatureUnlock ? 0 : (accessDays || record.accessDays || 30),
              durationDays: isFeatureUnlock ? 0 : (accessDays || record.durationDays || 30)
            }, { merge: true });

            processedSet.add(paymentId);
            activatedPlans.push(planName);
            totalDaysAdded += accessDays;
          } else if (asaasStatus?.status === 'OVERDUE' || asaasStatus?.status === 'REFUNDED' || asaasStatus?.status === 'CHARGEBACK') {
            await setDoc(doc(db, 'financialRecords', paymentId), {
              status: asaasStatus.status.toLowerCase(),
              updatedAt: new Date().toISOString()
            }, { merge: true });
          }
        } catch (checkErr) {
          console.error(`Erro ao consultar Asaas para ${paymentId}:`, checkErr);
        }
      }

      // ── PASSO 2: Consultar pagamentos diretos no Asaas por Email (Fallback de Segurança) ──
      try {
        const customerPayments = await AsaasPaymentService.getCustomerPaymentsByEmail(emailNorm);
        console.log(`💳 Asaas retornou ${customerPayments.length} pagamentos para ${emailNorm}`);

        const now = Date.now();
        const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

        for (const payment of customerPayments) {
          if (payment.status === 'RECEIVED' || payment.status === 'CONFIRMED') {
            // Se já processado, pular
            if (payment.id && processedSet.has(payment.id)) {
              continue;
            }

            // Verificar se o pagamento é recente (últimos 30 dias)
            const paymentDate = payment.clientPaymentDate || payment.dueDate || payment.dateCreated;
            if (paymentDate) {
              const pTime = new Date(paymentDate).getTime();
              if (pTime < thirtyDaysAgo) continue;
            }

            // Checar se já foi confirmado no Firestore
            const finDoc = await getDoc(doc(db, 'financialRecords', payment.id));
            if (!finDoc.exists() || finDoc.data()?.status !== 'confirmed') {
              console.log(`⚡ Pagamento confirmado encontrado diretamente no Asaas que não estava no Firestore! ID: ${payment.id}`);
              
              const description = payment.description || '';
              const descNorm = description.toLowerCase();
              const isUnlock = payment.value <= 25 && (
                descNorm.includes('desbloqueio') || 
                descNorm.includes('unlock') ||
                descNorm.includes('avulso')
              );
              
              const resolvedFeature = isUnlock ? (resolveFeatureId(description) || 'jogos-dia') : undefined;

              let calcDays = 0;
              if (!isUnlock) {
                calcDays = payment.value >= 200 ? 365 : (payment.value >= 130 ? 180 : (payment.value >= 65 ? 90 : 30));
              }

              const { planName, accessDays } = await this.activatePaidPlanOrProduct(
                userId,
                emailNorm,
                userName || '',
                {
                  planName: description.replace('Assinatura ', '').trim() || (isUnlock ? 'Desbloqueio de Recurso' : 'Plano Painel'),
                  planPrice: payment.value,
                  accessDays: calcDays,
                  durationDays: calcDays,
                  isFeatureUnlockOnly: isUnlock,
                  requiredFeature: resolvedFeature,
                  paymentDate
                },
                payment.id
              );

              await setDoc(doc(db, 'financialRecords', payment.id), {
                userId,
                userEmail: emailNorm,
                userName: userName || emailNorm.split('@')[0],
                planName,
                planPrice: payment.value,
                accessDays: isUnlock ? 0 : (accessDays || calcDays || 30),
                durationDays: isUnlock ? 0 : (accessDays || calcDays || 30),
                paymentMethod: payment.billingType || 'PIX',
                paymentId: payment.id,
                status: 'confirmed',
                confirmedAt: new Date().toISOString(),
                createdAt: payment.dateCreated || new Date().toISOString(),
                source: isUnlock ? 'feature_unlock' : 'asaas-direct-sync',
                isFeatureUnlockOnly: isUnlock,
                requiredFeature: resolvedFeature
              }, { merge: true });

              processedSet.add(payment.id);
              activatedPlans.push(planName);
              totalDaysAdded += accessDays;
            }
          }
        }
      } catch (asaasEmailErr) {
        console.warn('Aviso ao consultar Asaas por email:', asaasEmailErr);
      }

      if (activatedPlans.length > 0) {
        return {
          reconciled: true,
          message: `Pagamento identificado com sucesso! Ativação concluída (${activatedPlans.join(', ')}).`,
          activatedPlans,
          daysAdded: totalDaysAdded
        };
      }

      return {
        reconciled: false,
        message: 'Nenhum pagamento pendente ou novo foi localizado no Asaas.',
        activatedPlans: [],
        daysAdded: 0
      };

    } catch (error: any) {
      console.error('Erro na reconciliação de pagamentos:', error);
      return {
        reconciled: false,
        message: error.message || 'Erro ao verificar pagamentos',
        activatedPlans: [],
        daysAdded: 0
      };
    }
  }
};
