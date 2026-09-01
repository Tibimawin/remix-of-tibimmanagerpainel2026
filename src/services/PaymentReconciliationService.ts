import { collection, doc, getDoc, getDocs, setDoc, addDoc, query, where } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { AsaasPaymentService } from './AsaasPaymentService';
import { FirebaseUserService } from './FirebaseUserService';
import { PlansService } from './PlansService';
import { SourceExportService } from './SourceExportService';
import { pushEventsService } from './PushEventsService';
import { Plan, AVAILABLE_FEATURES } from '@/types/planTypes';

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
  if (norm.includes('jogos') || norm.includes('jogo do dia') || norm.includes('jogos-dia')) return 'jogos-dia';
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
    // ─────────────────────────────────────────────────────────────
    const isFeatureUnlock = 
      planInfo.isFeatureUnlockOnly === true ||
      !!planInfo.requiredFeature ||
      planInfo.source === 'feature_unlock' ||
      normalizedName.includes('desbloqueio') ||
      normalizedName.includes('unlock') ||
      (planInfo.planPrice !== undefined && Math.abs(planInfo.planPrice - 15) < 2);

    if (isFeatureUnlock) {
      console.log(`🔓 [Reconciliation] Processando desbloqueio avulso de funcionalidade (R$ 15) para ${emailNorm}`);
      
      // Descobrir qual é a funcionalidade
      let targetFeatureId = planInfo.requiredFeature;
      if (!targetFeatureId) {
        targetFeatureId = resolveFeatureId(planInfo.planName || '') || 'jogos-dia';
      }

      const featureObj = AVAILABLE_FEATURES.find(f => f.id === targetFeatureId);
      const featureDisplayName = featureObj?.name || targetFeatureId;

      // Buscar as permissões atuais do usuário
      const permissionsRef = doc(db, 'userPermissions', userId);
      const permissionsDoc = await getDoc(permissionsRef);
      const currentPermissions = permissionsDoc.exists() ? permissionsDoc.data() : {};
      const currentFeatures: string[] = Array.isArray(currentPermissions.enabledFeatures) ? currentPermissions.enabledFeatures : [];

      // Mesclar mantendo tudo o que o usuário já tinha + a nova feature desbloqueada + 'planos'
      const mergedFeatures = Array.from(new Set([
        ...currentFeatures,
        targetFeatureId,
        'planos'
      ]));

      // Determinar data de expiração
      let finalExpiry = currentPermissions.expiryDate;
      const now = new Date();
      if (!finalExpiry || new Date(finalExpiry) <= now) {
        // Se estava sem data ou expirado, garante 30 dias de acesso
        const expDate = new Date();
        expDate.setDate(expDate.getDate() + 30);
        finalExpiry = expDate.toISOString();
        try {
          await FirebaseUserService.extendUserAccess(userId, 30);
        } catch (e) {
          console.warn('Aviso ao estender usuário no desbloqueio:', e);
        }
      }

      const finalPlanName = currentPermissions.planName || 'Plano com Recursos Desbloqueados';
      const finalPlanId = currentPermissions.planId || 'feature-unlocked';

      await setDoc(permissionsRef, {
        userId,
        userEmail: emailNorm,
        userName: cleanUserName,
        planId: finalPlanId,
        planName: finalPlanName,
        monthlyContentLimit: currentPermissions.monthlyContentLimit ?? -1,
        enabledFeatures: mergedFeatures,
        currentMonthUsage: currentPermissions.currentMonthUsage || 0,
        lastUpdated: new Date().toISOString(),
        expiryDate: finalExpiry,
        isActive: true
      }, { merge: true });

      console.log(`✅ Feature '${targetFeatureId}' desbloqueada com sucesso para ${emailNorm}! Total de features: ${mergedFeatures.length}`);

      // Registrar na coleção featureUnlocks (persistência permanente e auditável)
      try {
        await setDoc(doc(db, 'featureUnlocks', `${userId}_${targetFeatureId}`), {
          userId,
          userEmail: emailNorm,
          userName: cleanUserName,
          featureId: targetFeatureId,
          featureName: featureDisplayName,
          amount: planInfo.planPrice || 15,
          paymentId,
          unlockedAt: new Date().toISOString(),
          status: 'active'
        }, { merge: true });
      } catch (errUnlock) {
        console.warn('Aviso ao registrar featureUnlocks:', errUnlock);
      }

      // Registrar log de auto-permissão
      try {
        await addDoc(collection(db, 'autoPermissionLogs'), {
          userId,
          userEmail: emailNorm,
          userName: cleanUserName,
          planName: `Desbloqueio: ${featureDisplayName}`,
          planId: `unlock-${targetFeatureId}`,
          featureId: targetFeatureId,
          featuresCount: mergedFeatures.length,
          features: mergedFeatures,
          grantedAt: new Date().toISOString(),
          source: 'payment-feature-unlock',
          paymentId
        });
      } catch (logErr) {
        console.warn('Erro ao salvar autoPermissionLogs:', logErr);
      }

      // Push notification
      try {
        await pushEventsService.notifyPaymentConfirmed({
          paymentId,
          accessDays: 0,
        });
      } catch (pushErr) {
        console.warn('Falha no push:', pushErr);
      }

      return { planName: `Desbloqueio: ${featureDisplayName}`, accessDays: 0 };
    }

    // ─────────────────────────────────────────────────────────────
    // 4. PLANO DE ASSINATURA DO PAINEL (Mensal, Trimestral, Anual, etc.)
    // ─────────────────────────────────────────────────────────────
    const price = planInfo.planPrice || 35;
    const accessDays = planInfo.accessDays || (price >= 300 ? 365 : 30);
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + accessDays);

    // Estender o acesso no registro do usuário
    try {
      await FirebaseUserService.extendUserAccess(userId, accessDays);
      console.log(`✅ Acesso estendido por ${accessDays} dias para ${userId}`);
    } catch (userErr) {
      console.warn('Aviso ao estender usuário (tentando criar se não existir):', userErr);
      try {
        await FirebaseUserService.createUserRecord({
          uid: userId,
          email: emailNorm,
          name: cleanUserName,
          accessDays,
          startDate: startDate.toISOString(),
          expiryDate: endDate.toISOString(),
          isActive: true
        });
      } catch (createErr) {
        console.error('Erro crítico ao registrar usuário:', createErr);
      }
    }

    // Buscar planos cadastrados para sincronizar permissões
    let allPlans: Plan[] = [];
    try {
      allPlans = await PlansService.getAllPlans();
    } catch (e) {
      console.warn('Não foi possível carregar planos:', e);
    }

    const norm = (s: string) => (s || '').toLowerCase().trim();
    const targetPlanName = planInfo.planName || '';

    // Encontrar o plano mais adequado
    let matchedPlan = allPlans.find(p => norm(p.name) === norm(targetPlanName));
    if (!matchedPlan && targetPlanName) {
      matchedPlan = allPlans.find(p => norm(p.name).includes(norm(targetPlanName)) || norm(targetPlanName).includes(norm(p.name)));
    }
    if (!matchedPlan && planInfo.planPrice) {
      matchedPlan = allPlans.find(p => {
        const pPrice = typeof p.price === 'number' ? p.price : parseFloat(String(p.price).replace(/[^\d,]/g, '').replace(',', '.'));
        return Math.abs(pPrice - planInfo.planPrice!) < 3;
      });
    }

    // Fallback: se não encontrar correspondência exata, selecionar o plano com mais recursos (Empresa / Completo)
    if (!matchedPlan) {
      matchedPlan = allPlans.find(p => norm(p.name).includes('empresa')) ||
                    allPlans.find(p => p.monthlyContentLimit === -1) ||
                    [...allPlans].sort((a, b) => (b.features?.length || 0) - (a.features?.length || 0))[0];
    }

    const permissionsRef = doc(db, 'userPermissions', userId);
    const permissionsDoc = await getDoc(permissionsRef);
    const currentPermissions = permissionsDoc.exists() ? permissionsDoc.data() : {};
    const existingFeatures = Array.isArray(currentPermissions.enabledFeatures) ? currentPermissions.enabledFeatures : [];

    let enabledFeatures: string[] = [];
    let finalPlanName = targetPlanName || 'Plano Painel';
    let finalPlanId = matchedPlan?.id || 'plano-auto';
    let monthlyContentLimit = matchedPlan?.monthlyContentLimit ?? -1;

    if (planInfo.isUpgrade) {
      finalPlanName = `${planInfo.upgradeFrom || 'Plano'} + API`;
      enabledFeatures = Array.from(new Set([...existingFeatures, 'minha-api', 'planos', ...(matchedPlan?.features || [])]));
    } else if (matchedPlan) {
      finalPlanName = matchedPlan.name;
      finalPlanId = matchedPlan.id;
      // Garante que também mantém recursos que o usuário já havia desbloqueado avulsamente
      enabledFeatures = Array.from(new Set([
        ...existingFeatures,
        ...(Array.isArray(matchedPlan.features) ? matchedPlan.features : []),
        'planos'
      ]));
    } else {
      // Super fallback completo para garantir que o cliente nunca fique travado
      enabledFeatures = [
        'dashboard', 'conteudos', 'episodios', 'categorias', 'banners',
        'duplicados', 'duplicados-episodios', 'importacao-automatica', 'automacao',
        'substituicao-urls', 'importar-m3u', 'adicionar-conteudo', 'usuarios',
        'sessoes', 'plataformas', 'produtos', 'estatisticas', 'relatorios-visualizacao',
        'recursos', 'clean-data', 'maxplus-import', 'precos-interno', 'configuracoes',
        'perfil', 'suporte-ao-vivo', 'priority-support', 'export', 'logs', 'planos',
        'jogos-dia', 'gerador-post', 'gerador-banner'
      ];
      finalPlanName = targetPlanName || 'Plano Completo';
    }

    await setDoc(permissionsRef, {
      userId,
      userEmail: emailNorm,
      userName: cleanUserName,
      planId: finalPlanId,
      planName: finalPlanName,
      monthlyContentLimit,
      enabledFeatures,
      currentMonthUsage: currentPermissions.currentMonthUsage || 0,
      lastUpdated: new Date().toISOString(),
      expiryDate: endDate.toISOString(),
      isActive: true
    }, { merge: true });

    console.log(`🔓 Permissões gravadas no Firestore para ${emailNorm}:`, enabledFeatures.length, 'features');

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
    userName?: string
  ): Promise<ReconcileResult> {
    if (!userId || !userEmail) {
      return { reconciled: false, message: 'Dados do usuário ausentes', activatedPlans: [], daysAdded: 0 };
    }

    console.log(`🔍 [PaymentReconciliation] Iniciando reconciliação automática para: ${userEmail}`);
    const activatedPlans: string[] = [];
    let totalDaysAdded = 0;
    const emailNorm = userEmail.toLowerCase().trim();

    try {
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

        try {
          const asaasStatus = await AsaasPaymentService.getPaymentStatus(paymentId);
          console.log(`Status Asaas para cobrança pendente ${paymentId}:`, asaasStatus?.status);

          if (asaasStatus?.status === 'RECEIVED' || asaasStatus?.status === 'CONFIRMED') {
            const { planName, accessDays } = await this.activatePaidPlanOrProduct(
              userId,
              emailNorm,
              userName || record.userName || '',
              {
                planName: record.planName,
                planPrice: record.planPrice || asaasStatus.value,
                accessDays: record.accessDays,
                isUpgrade: record.isUpgrade,
                upgradeFrom: record.upgradeFrom,
                source: record.source,
                isFeatureUnlockOnly: record.isFeatureUnlockOnly || (record.planPrice === 15) || (record.planName?.toLowerCase().includes('desbloqueio')),
                requiredFeature: record.requiredFeature || resolveFeatureId(record.planName || '') || undefined,
                items: record.items
              },
              paymentId
            );

            // Atualizar status no Firestore para confirmed
            await setDoc(doc(db, 'financialRecords', paymentId), {
              status: 'confirmed',
              confirmedAt: new Date().toISOString(),
              asaasPaymentStatus: asaasStatus.status
            }, { merge: true });

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
            // Verificar se o pagamento é recente (últimos 30 dias)
            const paymentDate = payment.clientPaymentDate || payment.dueDate;
            if (paymentDate) {
              const pTime = new Date(paymentDate).getTime();
              if (pTime < thirtyDaysAgo) continue;
            }

            // Checar se já foi confirmado no Firestore
            const finDoc = await getDoc(doc(db, 'financialRecords', payment.id));
            if (!finDoc.exists() || finDoc.data()?.status !== 'confirmed') {
              console.log(`⚡ Pagamento confirmado encontrado diretamente no Asaas que não estava no Firestore! ID: ${payment.id}`);
              
              const description = payment.description || '';
              const isUnlock15 = Math.abs(payment.value - 15) < 2 || description.toLowerCase().includes('desbloqueio') || description.toLowerCase().includes('unlock');
              const resolvedFeature = resolveFeatureId(description) || (isUnlock15 ? 'jogos-dia' : undefined);

              const { planName, accessDays } = await this.activatePaidPlanOrProduct(
                userId,
                emailNorm,
                userName || '',
                {
                  planName: description.replace('Assinatura ', '').trim() || (isUnlock15 ? 'Desbloqueio: Funcionalidade' : 'Plano Painel'),
                  planPrice: payment.value,
                  accessDays: payment.value >= 300 ? 365 : (isUnlock15 ? 0 : 30),
                  isFeatureUnlockOnly: isUnlock15,
                  requiredFeature: resolvedFeature
                },
                payment.id
              );

              await setDoc(doc(db, 'financialRecords', payment.id), {
                userId,
                userEmail: emailNorm,
                userName: userName || emailNorm.split('@')[0],
                planName,
                planPrice: payment.value,
                accessDays,
                paymentMethod: payment.billingType || 'PIX',
                paymentId: payment.id,
                status: 'confirmed',
                confirmedAt: new Date().toISOString(),
                createdAt: payment.dateCreated || new Date().toISOString(),
                source: isUnlock15 ? 'feature_unlock' : 'asaas-direct-sync',
                isFeatureUnlockOnly: isUnlock15,
                requiredFeature: resolvedFeature
              }, { merge: true });

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
          message: `Pagamento identificado com sucesso! Seu recurso/plano (${activatedPlans.join(', ')}) foi ativado.`,
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
