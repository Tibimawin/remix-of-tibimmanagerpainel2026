import { collection, doc, getDoc, getDocs, setDoc, addDoc, query, where } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { AsaasPaymentService } from './AsaasPaymentService';
import { FirebaseUserService } from './FirebaseUserService';
import { PlansService } from './PlansService';
import { SourceExportService } from './SourceExportService';
import { pushEventsService } from './PushEventsService';
import { Plan } from '@/types/planTypes';

export interface ReconcileResult {
  reconciled: boolean;
  message: string;
  activatedPlans: string[];
  daysAdded: number;
}

export const PaymentReconciliationService = {
  /**
   * Ativa as permissões e dias de um plano ou produto para o usuário
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
      items?: Array<{ id: string; name: string; price: number; qty?: number }>;
    },
    paymentId: string
  ): Promise<{ planName: string; accessDays: number }> {
    console.log(`🚀 [Reconciliation] Ativando plano/produto para ${userEmail} (${userId}) - Pagamento: ${paymentId}`);

    // 1. Se for compra da Loja (produtos avulsos como Acervo ou Backup)
    if (planInfo.source === 'store_cart' || planInfo.items?.length) {
      if (planInfo.items && planInfo.items.length > 0) {
        for (const item of planInfo.items) {
          await SourceExportService.recordPurchase({
            paymentId: `${paymentId}_${item.id}`,
            userId,
            userEmail: userEmail.toLowerCase(),
            userName: userName || userEmail.split('@')[0],
            amount: item.price * (item.qty || 1),
            productId: item.id,
            productName: item.name,
          });
        }
      }
      return { planName: planInfo.planName || 'Produtos da Loja', accessDays: 0 };
    }

    // 2. Se for produto específico da loja via nome
    const normalizedName = (planInfo.planName || '').toLowerCase();
    if (normalizedName.includes('carga total') || normalizedName.includes('acervo completo')) {
      await SourceExportService.recordPurchase({
        paymentId,
        userId,
        userEmail: userEmail.toLowerCase(),
        userName: userName || userEmail.split('@')[0],
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
        userEmail: userEmail.toLowerCase(),
        userName: userName || userEmail.split('@')[0],
        amount: planInfo.planPrice || 20,
        productId: 'backup_nuvem_auto',
        productName: 'Módulo Backup em Nuvem Automático',
      });
      return { planName: 'Módulo Backup em Nuvem Automático', accessDays: 0 };
    }

    // 3. Plano de Assinatura do Painel
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
          email: userEmail,
          name: userName || userEmail.split('@')[0],
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
      enabledFeatures = Array.from(new Set([
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
        'perfil', 'suporte-ao-vivo', 'priority-support', 'export', 'logs', 'planos'
      ];
      finalPlanName = targetPlanName || 'Plano Completo';
    }

    await setDoc(permissionsRef, {
      userId,
      userEmail: userEmail.toLowerCase(),
      userName: userName || userEmail.split('@')[0],
      planId: finalPlanId,
      planName: finalPlanName,
      monthlyContentLimit,
      enabledFeatures,
      currentMonthUsage: currentPermissions.currentMonthUsage || 0,
      lastUpdated: new Date().toISOString(),
      expiryDate: endDate.toISOString(),
      isActive: true
    }, { merge: true });

    console.log(`🔓 Permissões gravadas no Firestore para ${userEmail}:`, enabledFeatures.length, 'features');

    // Registrar log
    try {
      await addDoc(collection(db, 'autoPermissionLogs'), {
        userId,
        userEmail: userEmail.toLowerCase(),
        userName: userName || userEmail.split('@')[0],
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
              const { planName, accessDays } = await this.activatePaidPlanOrProduct(
                userId,
                emailNorm,
                userName || '',
                {
                  planName: description.replace('Assinatura ', '').trim() || 'Plano Painel',
                  planPrice: payment.value,
                  accessDays: payment.value >= 300 ? 365 : 30
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
                source: 'asaas-direct-sync'
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
          message: `Pagamento identificado com sucesso! Seu plano foi ativado e seu acesso foi estendido.`,
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
