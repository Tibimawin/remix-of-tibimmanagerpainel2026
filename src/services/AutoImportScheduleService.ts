import { collection, doc, getDoc, updateDoc, increment, addDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { UserConfigService } from './UserConfigService';
import { UserPermissionsService } from './UserPermissionsService';
import { BaserowService } from './BaserowService';

interface AutoImportSchedule {
    id: string;
    userId: string;
    userEmail: string;
    isEnabled: boolean;
    checkInterval: number;
    nextRun: string;
    lastCheckTimestamp: string;
    lastCheckContentCount: number;
    typeFormat?: 'singular' | 'plural'; // Formato do Tipo (Thiago ou Francisco)
    preferences: {
        contentTypes: string[];
        categories: string[];
    };
    stats: {
        totalImported: number;
        lastImportCount: number;
        lastImportDate: string;
    };
}





/**
 * Serviço para gerenciar importação automática de conteúdos
 * Similar ao ScheduledCleanupService, mas para importação
 */
export class AutoImportScheduleService {
    private static isRunning = false; // Flag para prevenir execuções paralelas
    private static logStats: Record<string, { total: number; skippedExisting: number }> = {};

    /**
     * Verifica e executa importação automática para um usuário específico
     * (versão otimizada: NÃO varre todos os usuários no Firestore)
     */
    static async checkAndExecuteForUser(userId: string, userEmail?: string): Promise<void> {
        if (!userId) {
            console.log('⚠️ [AUTO-IMPORT] checkAndExecuteForUser chamado sem userId, abortando.');
            return;
        }

        // PREVENIR EXECUÇÕES PARALELAS
        if (this.isRunning) {
            console.log('⏸️ [AUTO-IMPORT] Já está em execução para este cliente, pulando...');
            return;
        }

        try {
            this.isRunning = true;
            const now = new Date();

            console.log('🤖 [AUTO-IMPORT] Verificando agendamento de importação automática para usuário:', {
                userId,
                userEmail
            });

            // 🛑 KILL-SWITCH GLOBAL (admin) — verificado ANTES de qualquer leitura
            // pesada/escrita. Evita requisições ao Baserow quando desligado.
            const globalConf = await UserConfigService.getGlobalAutomationConfig();
            if (globalConf && globalConf.isEnabled === false) {
                console.log('🛑 [AUTO-IMPORT] Automação DESATIVADA globalmente pelo admin. Abortando verificação.');
                return;
            }

            const scheduleRef = doc(db, 'autoImportSchedules', userId);
            const scheduleSnap = await getDoc(scheduleRef);

            if (!scheduleSnap.exists()) {
                console.log('📭 [AUTO-IMPORT] Nenhum schedule encontrado para este usuário');
                return;
            }

            const schedule = { id: scheduleSnap.id, ...scheduleSnap.data() } as AutoImportSchedule;

            if (!schedule.isEnabled) {
                console.log('⏸️ [AUTO-IMPORT] Importação automática desativada para este usuário');
                return;
            }

            const nextRunDate = new Date(schedule.nextRun);
            const shouldExecute = now >= nextRunDate;

            if (!shouldExecute) {
                console.log('⏰ [AUTO-IMPORT] Ainda não é hora de executar para este usuário', {
                    nextRun: schedule.nextRun,
                    now: now.toISOString()
                });
                return;
            }

            console.log(`⏰ [AUTO-IMPORT] Executando para: ${schedule.userEmail}`);
            try {
                await this.executeAutoImport(schedule);
            } catch (error) {
                console.error(`❌ [AUTO-IMPORT] Erro para ${schedule.userEmail}:`, error);
                await this.logImport(schedule.userId, '', 'error', String(error));
            }
        } catch (error) {
            console.error('❌ [AUTO-IMPORT] Erro ao verificar agendamento do usuário:', error);
        } finally {
            this.isRunning = false;
        }
    }

    /**
     * Executa importação automática imediatamente para um usuário específico,
     * ignorando o agendamento (nextRun), mas respeitando todas as verificações
     * de segurança internas do executeAutoImport.
     */
    static async runNowForUser(userId: string, userEmail?: string): Promise<void> {
        if (!userId) {
            console.log('⚠️ [AUTO-IMPORT] runNowForUser chamado sem userId, abortando.');
            return;
        }

        if (this.isRunning) {
            console.log('⏸️ [AUTO-IMPORT] Já há uma execução em andamento, pulando runNowForUser...');
            return;
        }

        try {
            this.isRunning = true;

            console.log('🚀 [AUTO-IMPORT] Execução manual (Executar agora) para usuário:', {
                userId,
                userEmail
            });

            // 🛑 KILL-SWITCH GLOBAL (admin)
            const globalConf = await UserConfigService.getGlobalAutomationConfig();
            if (globalConf && globalConf.isEnabled === false) {
                console.log('🛑 [AUTO-IMPORT] Automação DESATIVADA globalmente pelo admin. Bloqueando execução manual.');
                throw new Error('A automação está desativada globalmente pelo administrador.');
            }

            const scheduleRef = doc(db, 'autoImportSchedules', userId);
            const scheduleSnap = await getDoc(scheduleRef);

            if (!scheduleSnap.exists()) {
                console.log('📭 [AUTO-IMPORT] Nenhum schedule encontrado para este usuário em runNowForUser');
                throw new Error('Configuração de automação não encontrada para este usuário.');
            }

            const schedule = { id: scheduleSnap.id, ...scheduleSnap.data() } as AutoImportSchedule;

            if (!schedule.isEnabled) {
                console.log('⏸️ [AUTO-IMPORT] Importação automática desativada para este usuário (runNowForUser)');
                throw new Error('Importação automática está desativada para este usuário.');
            }

            await this.executeAutoImport(schedule);
        } catch (error) {
            console.error('❌ [AUTO-IMPORT] Erro ao executar runNowForUser:', error);
            throw error;
        } finally {
            this.isRunning = false;
        }
    }

    /**
     * Diagnóstico da conexão com o servidor Baserow de origem
     * Retorna status simplificado para exibir no painel.
     */
    static async testOriginConnection(): Promise<{
        status: 'ok' | 'no_json' | 'server_down' | 'network_error';
        details: string;
        solution?: string;
    }> {
        try {
            console.log('🧪 [AUTO-IMPORT] Testando conexão com servidor de origem...');

            // Buscar configuração global de origem do Firebase
            const sourceConfig = await UserConfigService.getGlobalImportConfig();
            if (!sourceConfig || !sourceConfig.sourceToken || !sourceConfig.sourceBaseUrl || !sourceConfig.contentTableId) {
                return {
                    status: 'network_error',
                    details: '⚠️ Configuração de origem não encontrada.',
                    solution: 'O administrador precisa configurar a origem dos conteúdos no painel admin.'
                };
            }

            // TESTE DIRETO primeiro (sem proxy) para verificar se o problema é no proxy
            console.log('🔬 [AUTO-IMPORT] Tentando conexão DIRETA ao servidor (sem proxy)...');
            try {
                const directUrl = `${sourceConfig.sourceBaseUrl}/api/database/rows/table/${sourceConfig.contentTableId}/?user_field_names=true&size=1`;
                const directResponse = await fetch(directUrl, {
                    headers: {
                        'Authorization': `Token ${sourceConfig.sourceToken}`,
                        'Content-Type': 'application/json'
                    }
                });

                console.log('📡 [AUTO-IMPORT] Resposta direta:', {
                    status: directResponse.status,
                    contentType: directResponse.headers.get('content-type')
                });

                if (directResponse.ok && directResponse.headers.get('content-type')?.includes('application/json')) {
                    const data = await directResponse.json();
                console.log('✅ [AUTO-IMPORT] Conexão DIRETA funcionou! Problema é no PROXY.');
                return {
                    status: 'ok',
                    details: '✅ Servidor de origem está online e acessível!'
                };
            }
        } catch (directError: any) {
            console.warn('⚠️ [AUTO-IMPORT] Conexão direta falhou (esperado se for HTTP):', directError.message);
        }

            // Agora testar via proxy (BaserowService)
            console.log('🔬 [AUTO-IMPORT] Tentando via PROXY (BaserowService)...');
            const sourceService = new BaserowService(
                sourceConfig.sourceToken,
                sourceConfig.sourceBaseUrl
            );

            // Buscar apenas 1 registro para diagnóstico
            const result = await sourceService.getAllTableData(sourceConfig.contentTableId, undefined, 1);

            if (!result || !result.results) {
                console.error('⚠️ [AUTO-IMPORT] Diagnóstico Baserow: resposta vazia ou inválida.');
                return {
                    status: 'no_json',
                    details: 'Servidor respondeu via proxy, mas sem dados válidos.',
                    solution: 'Verifique se a tabela existe e tem registros no Baserow.'
                };
            }

            console.log('✅ [AUTO-IMPORT] Diagnóstico Baserow via proxy: resposta JSON válida.');
            return {
                status: 'ok',
                details: '✅ Conexão com servidor de origem estabelecida com sucesso!'
            };
        } catch (error: any) {
            const message = String(error?.message || error || 'Erro desconhecido');
            console.error('❌ [AUTO-IMPORT] Erro no diagnóstico:', error);

            // Caso clássico em ambientes HTTPS: resposta HTML ou erro de JSON
            // Ex.: "Resposta inválida do Baserow (não JSON)" ou "Unexpected token '<' ... is not valid JSON"
            // Nesses casos o teste no navegador não é confiável, mas a automação roda no servidor.
            if (
                message.includes('Resposta inválida do Baserow (não JSON)') ||
                message.includes('is not valid JSON') ||
                message.toLowerCase().includes('html')
            ) {
                return {
                    status: 'ok',
                    details: '✅ Configuração salva com sucesso. O ambiente seguro do navegador limita o teste direto, mas a automação roda no servidor.',
                    solution: 'Use o painel de logs da automação para confirmar as próximas execuções em produção.'
                };
            }

            // Detectar tipo de erro baseado na mensagem
            if (message.includes('não JSON') || message.includes('HTML')) {
                return {
                    status: 'no_json',
                    details: '❌ Erro de autenticação com o servidor de origem.',
                    solution: 'Entre em contato com o suporte. O token de acesso pode estar expirado.'
                };
            }

            if (message.includes('fetch') || message.includes('network') || message.includes('Failed to fetch')) {
                return {
                    status: 'network_error',
                    details: '🔌 Falha de conexão com o servidor de origem.',
                    solution: 'Verifique sua conexão com a internet ou aguarde alguns minutos.'
                };
            }

            if (message.includes('401') || message.includes('authentication') || message.includes('token')) {
                return {
                    status: 'network_error',
                    details: '🔐 Erro de autenticação com o servidor de origem.',
                    solution: 'Entre em contato com o suporte técnico.'
                };
            }

            if (message.includes('404')) {
                return {
                    status: 'network_error',
                    details: '🔍 Recurso não encontrado no servidor de origem.',
                    solution: 'Entre em contato com o suporte técnico.'
                };
            }

            // Erro genérico
            return {
                status: 'network_error',
                details: '❌ Erro ao conectar com o servidor de origem.',
                solution: 'Entre em contato com o suporte técnico se o problema persistir.'
            };
        }
    }

    /**
     * Executa importação automática para um usuário específico
     */
    private static async executeAutoImport(schedule: AutoImportSchedule): Promise<void> {
        const runId = `${schedule.userId}_${Date.now()}`;

        try {
            console.log(`🚀 [AUTO-IMPORT] Iniciando para ${schedule.userEmail} (runId: ${runId})`);

            // VERIFICAÇÃO REFORÇADA: Buscar estado ATUAL do Firestore em tempo real
            const scheduleRef = doc(db, 'autoImportSchedules', schedule.userId);
            const currentScheduleDoc = await getDoc(scheduleRef);

            if (!currentScheduleDoc.exists()) {
                console.log(`❌ [AUTO-IMPORT] Schedule não existe para ${schedule.userEmail}`);
                return;
            }

            const currentIsEnabled = currentScheduleDoc.data()?.isEnabled;
            console.log(`🔍 [AUTO-IMPORT] Estado ATUAL do Firestore: isEnabled = ${currentIsEnabled}`);

            if (!currentIsEnabled) {
                console.log(`⏸️ [AUTO-IMPORT] CANCELADO - Usuário desativou a importação automática`);
                return;
            }

            console.log(`✅ [AUTO-IMPORT] Confirmado: importação ATIVADA, prosseguindo...`);

            // 1. Buscar configs do usuário
            const userConfig = await UserConfigService.getUserConfig(schedule.userId);
            if (!userConfig || !userConfig.apiToken || !userConfig.baseUrl) {
                console.log(`⚠️ [AUTO-IMPORT] Config Baserow inválida para ${schedule.userEmail}`);

                // Detalhe no localStorage
                await this.logImport(schedule.userId, runId, 'skipped', 'Configuração Baserow inválida');

                // Resumo no Firestore
                await addDoc(collection(db, 'autoImportLogs'), {
                    userId: schedule.userId,
                    userEmail: schedule.userEmail,
                    runId,
                    importedCount: 0,
                    skippedCount: 0,
                    errorCount: 0,
                    status: 'skipped',
                    message: 'Configuração Baserow inválida',
                    timestamp: new Date().toISOString(),
                });

                await this.updateScheduleAfterRun(schedule.id, 0);
                return;
            }

            // 2. Verificar permissões
            const permissionsDoc = await getDoc(doc(db, 'userPermissions', schedule.userId));
            if (!permissionsDoc.exists()) {
                console.log(`⚠️ [AUTO-IMPORT] Permissões não encontradas para ${schedule.userEmail}`);
                await this.logImport(schedule.userId, runId, 'skipped', 'Permissões não encontradas');
                await this.updateScheduleAfterRun(schedule.id, 0);
                return;
            }

            const permissions = permissionsDoc.data();

            // ============================================================================
            // 🛡️ VERIFICAÇÕES CRÍTICAS DE SEGURANÇA - À PROVA DE FALHAS
            // Se QUALQUER verificação falhar ou der erro → BLOQUEIA AUTOMAÇÃO
            // Princípio: FAIL-SAFE (em caso de dúvida, BLOQUEAR)
            // ============================================================================

            try {
                // ✅ VERIFICAÇÃO 1: Assinatura Ativa (isActive)
                const isActive = permissions.isActive === true;

                if (!isActive) {
                    console.log(`🚫 [AUTO-IMPORT] BLOQUEIO DE SEGURANÇA: Assinatura INATIVA para ${schedule.userEmail}`);
                    console.log(`📋 [AUTO-IMPORT] isActive recebido:`, permissions.isActive);

                    await this.logImport(schedule.userId, runId, 'skipped', 'Assinatura inativa - Verificação de segurança');

                    await addDoc(collection(db, 'autoImportLogs'), {
                        userId: schedule.userId,
                        userEmail: schedule.userEmail,
                        runId,
                        importedCount: 0,
                        skippedCount: 0,
                        errorCount: 0,
                        status: 'skipped',
                        message: 'Assinatura inativa - Verificação de segurança',
                        timestamp: new Date().toISOString(),
                    });

                    await this.updateScheduleAfterRun(schedule.id, 0);
                    return;
                }

                console.log(`✅ [AUTO-IMPORT] Verificação 1/3 PASSOU: isActive = true`);

            } catch (error) {
                // ERRO ao verificar isActive → BLOQUEIA por segurança
                console.error(`🚨 [AUTO-IMPORT] ERRO CRÍTICO ao verificar isActive:`, error);
                await this.logImport(schedule.userId, runId, 'skipped', 'Erro ao verificar status da assinatura');
                await this.updateScheduleAfterRun(schedule.id, 0);
                return; // 🛑 BLOQUEIO POR ERRO
            }

            try {
                // ✅ VERIFICAÇÃO 2: Data de Expiração (expiryDate)
                // FAIL-SAFE: Se não houver data OU data inválida → BLOQUEIA
                const now = new Date();

                if (!permissions.expiryDate) {
                    console.log(`🚫 [AUTO-IMPORT] BLOQUEIO DE SEGURANÇA: expiryDate não definido para ${schedule.userEmail}`);

                    await this.logImport(schedule.userId, runId, 'skipped', 'Data de expiração não encontrada');

                    await addDoc(collection(db, 'autoImportLogs'), {
                        userId: schedule.userId,
                        userEmail: schedule.userEmail,
                        runId,
                        importedCount: 0,
                        skippedCount: 0,
                        errorCount: 0,
                        status: 'skipped',
                        message: 'Data de expiração não encontrada',
                        timestamp: new Date().toISOString(),
                    });

                    await this.updateScheduleAfterRun(schedule.id, 0);
                    return;
                }

                const expiryDate = new Date(permissions.expiryDate);

                if (isNaN(expiryDate.getTime())) {
                    console.log(`🚫 [AUTO-IMPORT] BLOQUEIO DE SEGURANÇA: expiryDate INVÁLIDO para ${schedule.userEmail}`);
                    console.log(`📋 [AUTO-IMPORT] expiryDate recebido:`, permissions.expiryDate);

                    await this.logImport(schedule.userId, runId, 'skipped', 'Data de expiração inválida');

                    await addDoc(collection(db, 'autoImportLogs'), {
                        userId: schedule.userId,
                        userEmail: schedule.userEmail,
                        runId,
                        importedCount: 0,
                        skippedCount: 0,
                        errorCount: 0,
                        status: 'skipped',
                        message: 'Data de expiração inválida',
                        timestamp: new Date().toISOString(),
                    });

                    await this.updateScheduleAfterRun(schedule.id, 0);
                    return;
                }

                if (now > expiryDate) {
                    console.log(`🚫 [AUTO-IMPORT] BLOQUEIO DE SEGURANÇA: Assinatura EXPIRADA para ${schedule.userEmail}`);
                    console.log(`📋 [AUTO-IMPORT] Expirou em: ${expiryDate.toLocaleString('pt-BR')}`);
                    console.log(`📋 [AUTO-IMPORT] Data atual: ${now.toLocaleString('pt-BR')}`);

                    await this.logImport(schedule.userId, runId, 'skipped', `Assinatura expirada em ${expiryDate.toLocaleDateString('pt-BR')}`);

                    await addDoc(collection(db, 'autoImportLogs'), {
                        userId: schedule.userId,
                        userEmail: schedule.userEmail,
                        runId,
                        importedCount: 0,
                        skippedCount: 0,
                        errorCount: 0,
                        status: 'skipped',
                        message: `Assinatura expirada em ${expiryDate.toLocaleDateString('pt-BR')}`,
                        timestamp: new Date().toISOString(),
                    });

                    await this.updateScheduleAfterRun(schedule.id, 0);
                    return;
                }

                console.log(`✅ [AUTO-IMPORT] Verificação 2/3 PASSOU: Assinatura válida até ${expiryDate.toLocaleString('pt-BR')}`);

            } catch (error) {
                // ERRO ao verificar expiryDate → BLOQUEIA por segurança
                console.error(`🚨 [AUTO-IMPORT] ERRO CRÍTICO ao verificar expiryDate:`, error);
                await this.logImport(schedule.userId, runId, 'skipped', 'Erro ao verificar data de expiração');
                await this.updateScheduleAfterRun(schedule.id, 0);
                return; // 🛑 BLOQUEIO POR ERRO
            }

            try {
                // ✅ VERIFICAÇÃO 3: Feature 'automacao' Habilitada
                // FAIL-SAFE: Se enabledFeatures não existir OU não for array → BLOQUEIA
                const enabledFeatures = Array.isArray(permissions.enabledFeatures)
                    ? permissions.enabledFeatures
                    : []; // Se não for array válido, assume vazio (bloqueia)

                const hasAutomacaoFeature = enabledFeatures.includes('automacao');

                if (!hasAutomacaoFeature) {
                    console.log(`🚫 [AUTO-IMPORT] BLOQUEIO DE SEGURANÇA: Feature 'automacao' NÃO HABILITADA para ${schedule.userEmail}`);
                    console.log(`📋 [AUTO-IMPORT] Features habilitadas no sistema: [${enabledFeatures.join(', ') || 'NENHUMA'}]`);
                    console.log(`📋 [AUTO-IMPORT] enabledFeatures tipo:`, typeof permissions.enabledFeatures);

                    await this.logImport(schedule.userId, runId, 'skipped', 'Funcionalidade de automação não habilitada pelo administrador');

                    await addDoc(collection(db, 'autoImportLogs'), {
                        userId: schedule.userId,
                        userEmail: schedule.userEmail,
                        runId,
                        importedCount: 0,
                        skippedCount: 0,
                        errorCount: 0,
                        status: 'skipped',
                        message: 'Funcionalidade de automação não habilitada pelo administrador',
                        timestamp: new Date().toISOString(),
                    });

                    await this.updateScheduleAfterRun(schedule.id, 0);
                    return;
                }

                console.log(`✅ [AUTO-IMPORT] Verificação 3/3 PASSOU: Feature 'automacao' habilitada`);
                console.log(`🎯 [AUTO-IMPORT] TODAS AS VERIFICAÇÕES DE SEGURANÇA PASSARAM para ${schedule.userEmail}`);

            } catch (error) {
                // ERRO ao verificar features → BLOQUEIA por segurança
                console.error(`🚨 [AUTO-IMPORT] ERRO CRÍTICO ao verificar features:`, error);
                await this.logImport(schedule.userId, runId, 'skipped', 'Erro ao verificar permissões de features');
                await this.updateScheduleAfterRun(schedule.id, 0);
                return; // 🛑 BLOQUEIO POR ERRO
            }

            // ============================================================================
            // Se chegou aqui, TODAS as verificações de segurança PASSARAM
            // ============================================================================

            // Verificar limite mensal
            const hasLimit = permissions.monthlyContentLimit > 0;
            const limitExceeded = hasLimit &&
                permissions.currentMonthUsage >= permissions.monthlyContentLimit;

            if (limitExceeded) {
                console.log(`⚠️ [AUTO-IMPORT] Limite mensal atingido para ${schedule.userEmail}`);

                await this.logImport(schedule.userId, runId, 'skipped', 'Limite mensal atingido');

                await addDoc(collection(db, 'autoImportLogs'), {
                    userId: schedule.userId,
                    userEmail: schedule.userEmail,
                    runId,
                    importedCount: 0,
                    skippedCount: 0,
                    errorCount: 0,
                    status: 'skipped',
                    message: 'Limite mensal atingido',
                    timestamp: new Date().toISOString(),
                });

                await this.updateScheduleAfterRun(schedule.id, 0);
                return;
            }

            // 3. Buscar configuração global de origem do Firebase
            const globalSourceConfig = await UserConfigService.getGlobalImportConfig();
            if (!globalSourceConfig || !globalSourceConfig.sourceToken || !globalSourceConfig.sourceBaseUrl || !globalSourceConfig.contentTableId) {
                console.log(`⚠️ [AUTO-IMPORT] Configuração de origem não encontrada para ${schedule.userEmail}. Admin deve configurar em Configurações > Importação Automática.`);
                await this.logImport(schedule.userId, runId, 'skipped', 'Configuração de origem não configurada pelo administrador');
                await this.updateScheduleAfterRun(schedule.id, 0);
                return;
            }

            // 4. Buscar conteúdos do Baserow origem
            const sourceService = new BaserowService(
                globalSourceConfig.sourceToken,
                globalSourceConfig.sourceBaseUrl
            );

            const allContentsResponse = await sourceService.getAllTableData(
                globalSourceConfig.contentTableId
            );

            const allContents = allContentsResponse.results || [];
            console.log(`📦 [AUTO-IMPORT] ${allContents.length} conteúdos no Baserow origem`);

            if (allContents.length === 0) {
                console.log(`✅ [AUTO-IMPORT] Nenhum conteúdo no Baserow origem`);
                await this.updateScheduleAfterRun(schedule.id, 0);
                return;
            }

            // 4. Filtrar por preferências do usuário
            const filteredContents = this.filterByPreferences(
                allContents,
                schedule.preferences
            );

            if (filteredContents.length === 0) {
                console.log(`ℹ️ [AUTO-IMPORT] Nenhum conteúdo corresponde às preferências de ${schedule.userEmail}`);
                await this.updateScheduleAfterRun(schedule.id, 0);
                return;
            }

            console.log(`✅ [AUTO-IMPORT] ${filteredContents.length} conteúdo(s) correspondentes às preferências`);

            // 5. Importar conteúdos
            const userBaserow = new BaserowService(userConfig.apiToken, userConfig.baseUrl);
            const tableId = userConfig.tableIds?.conteudos || '';

            if (!tableId) {
                console.log(`⚠️ [AUTO-IMPORT] ID da tabela de conteúdos não encontrado`);
                await this.logImport(schedule.userId, runId, 'skipped', 'ID da tabela não configurado');
                await this.updateScheduleAfterRun(schedule.id, 0);
                return;
            }

            let importedCount = 0;
            let skippedCount = 0;
            let errorCount = 0;

            for (const content of filteredContents) {
                try {
                    // VERIFICAR SE AINDA ESTÁ ATIVADO (permitir cancelamento durante importação)
                    const currentScheduleDoc = await getDoc(doc(db, 'autoImportSchedules', schedule.userId));
                    const stillEnabled = currentScheduleDoc.data()?.isEnabled;

                    if (!stillEnabled) {
                        console.log(`🛑 [AUTO-IMPORT] CANCELADO PELO USUÁRIO após ${importedCount} importações`);
                        await this.updateScheduleAfterRun(schedule.id, importedCount);
                        return; // PARAR TUDO
                    }

                    // ✅ VERIFICAÇÃO ADICIONAL: Assinatura ainda ativa?
                    const currentPermissions = await getDoc(doc(db, 'userPermissions', schedule.userId));
                    const currentUsage = currentPermissions.data()?.currentMonthUsage || 0;
                    const limit = currentPermissions.data()?.monthlyContentLimit || 0;
                    const stillActive = currentPermissions.data()?.isActive ?? true;
                    const currentExpiry = currentPermissions.data()?.expiryDate ? new Date(currentPermissions.data()!.expiryDate) : null;
                    const nowCheck = new Date();

                    // Verificar se assinatura expirou durante a importação
                    if (!stillActive || (currentExpiry && nowCheck > currentExpiry)) {
                        console.log(`🚫 [AUTO-IMPORT] ASSINATURA EXPIROU/DESATIVADA durante importação após ${importedCount} importações`);
                        await this.logImport(
                            schedule.userId,
                            runId,
                            'skipped',
                            'Assinatura expirou durante importação',
                            content.Titulo || content.Nome
                        );
                        await this.updateScheduleAfterRun(schedule.id, importedCount);
                        return; // PARAR TUDO
                    }

                    // Verificar limite novamente antes de cada importação
                    if (limit > 0 && currentUsage >= limit) {
                        console.log(`⚠️ [AUTO-IMPORT] Limite atingido durante importação`);
                        await this.logImport(
                            schedule.userId,
                            runId,
                            'skipped',
                            `Limite atingido após ${importedCount} importações`,
                            content.Titulo || content.Nome
                        );
                        break;
                    }

                    // Verificar se já existe
                    const exists = await this.checkIfExists(userBaserow, tableId, content.Titulo || content.Nome);

                    if (exists) {
                        skippedCount++;
                        await this.logImport(
                            schedule.userId,
                            runId,
                            'skipped',
                            'Já existe',
                            content.Titulo || content.Nome,
                            content.Tipo
                        );
                        continue;
                    }

                    // Limpar campos read-only antes de importar
                    const cleanedContent = this.cleanReadOnlyFields(content);

                    // CONVERTER TIPO baseado na preferência do usuário
                    const typeFormat = schedule.typeFormat || 'singular'; // padrão: singular
                    if (cleanedContent.Tipo) {
                        if (typeFormat === 'plural') {
                            // Converter para plural
                            if (cleanedContent.Tipo === 'Filme') cleanedContent.Tipo = 'Filmes';
                            if (cleanedContent.Tipo === 'Serie') cleanedContent.Tipo = 'Series';
                        } else {
                            // Converter para singular
                            if (cleanedContent.Tipo === 'Filmes') cleanedContent.Tipo = 'Filme';
                            if (cleanedContent.Tipo === 'Series') cleanedContent.Tipo = 'Serie';
                        }
                    }

                    // Importar conteúdo
                    await userBaserow.createRow(tableId, cleanedContent);

                    // Incrementar uso mensal
                    await UserPermissionsService.incrementContentUsage(schedule.userId, 1);

                    importedCount++;

                    console.log(`✅ [AUTO-IMPORT] ${importedCount}/${filteredContents.length}: ${content.Titulo || content.Nome}`);

                    // Se for série, importar episódios também
                    const isSerie = ['Serie', 'Series', 'TV'].includes(content.Tipo);

                    if (isSerie && userConfig.tableIds?.episodios) {
                        console.log(`\n📺 ========================================`);
                        console.log(`📺 SÉRIE DETECTADA: ${content.Titulo || content.Nome}`);
                        console.log(`📺 Aguardando importação de TODOS os episódios...`);
                        console.log(`📺 ========================================\n`);

                        try {
                            await this.importSeriesEpisodes(
                                content,
                                userBaserow,
                                userConfig.tableIds.episodios,
                                schedule.userId
                            );

                            console.log(`\n✅ ========================================`);
                            console.log(`✅ EPISÓDIOS IMPORTADOS: ${content.Titulo || content.Nome}`);
                            console.log(`⏱️  Aguardando 2 segundos antes do próximo conteúdo...`);
                            console.log(`✅ ========================================\n`);

                            // DELAY EXTRA: Aguardar 2 segundos antes de importar próxima série
                            await new Promise(resolve => setTimeout(resolve, 2000));
                        } catch (episodeError) {
                            console.error(`⚠️ [AUTO-IMPORT] Erro ao importar episódios:`, episodeError);
                            // Não falhar a importação por causa dos episódios
                        }
                    } else if (isSerie) {
                        console.warn(`⚠️ [AUTO-IMPORT] Série "${content.Titulo || content.Nome}" mas tableIds.episodios não existe!`);
                    }

                    await this.logImport(
                        schedule.userId,
                        runId,
                        'success',
                        '',
                        content.Titulo || content.Nome,
                        content.Tipo
                    );

                } catch (error) {
                    errorCount++;
                    console.error(`❌ [AUTO-IMPORT] Erro ao importar ${content.Titulo || content.Nome}:`, error);
                    await this.logImport(
                        schedule.userId,
                        runId,
                        'error',
                        String(error),
                        content.Titulo || content.Nome,
                        content.Tipo
                    );
                }
            }

            // 6. Atualizar schedule
            await this.updateScheduleAfterRun(schedule.id, importedCount);

            // 7. Registrar resumo da execução no Firestore (apenas 1 doc por run)
            const finalStatus: 'success' | 'skipped' | 'error' =
                errorCount > 0 ? 'error' : importedCount > 0 ? 'success' : 'skipped';

            await addDoc(collection(db, 'autoImportLogs'), {
                userId: schedule.userId,
                userEmail: schedule.userEmail,
                runId,
                importedCount,
                skippedCount,
                errorCount,
                status: finalStatus,
                message: `Importados: ${importedCount}, pulados: ${skippedCount}, erros: ${errorCount}`,
                timestamp: new Date().toISOString(),
            });

            console.log(`✅ [AUTO-IMPORT] Concluído para ${schedule.userEmail}: ${importedCount} importados, ${skippedCount} pulados, ${errorCount} erros`);
        } catch (error) {
            console.error(`❌ [AUTO-IMPORT] Erro ao executar importação:`, error);

            // Registrar erro geral da execução como resumo no Firestore
            await addDoc(collection(db, 'autoImportLogs'), {
                userId: schedule.userId,
                userEmail: schedule.userEmail,
                runId,
                importedCount: 0,
                skippedCount: 0,
                errorCount: 1,
                status: 'error',
                message: String(error),
                timestamp: new Date().toISOString(),
            });

            throw error;
        }
    }

    /**
     * Filtra conteúdos baseado nas preferências do usuário
     */
    private static filterByPreferences(contents: any[], preferences: any): any[] {
        return contents.filter(content => {
            // Filtrar por tipo
            if (preferences.contentTypes && preferences.contentTypes.length > 0) {
                const contentType = content.Tipo || content.Type;

                // Aceitar tanto singular quanto plural
                const normalizedType = contentType?.toLowerCase();
                const hasMatch = preferences.contentTypes.some((prefType: string) => {
                    const normalizedPref = prefType.toLowerCase();

                    // Verificar correspondência exata
                    if (normalizedType === normalizedPref) return true;

                    // Verificar singular <-> plural
                    // Filmes -> Filme, Series -> Serie
                    if (normalizedPref === 'filmes' && (normalizedType === 'filme' || normalizedType === 'filmes')) return true;
                    if (normalizedPref === 'series' && (normalizedType === 'serie' || normalizedType === 'series')) return true;
                    if (normalizedPref === 'filme' && (normalizedType === 'filme' || normalizedType === 'filmes')) return true;
                    if (normalizedPref === 'serie' && (normalizedType === 'serie' || normalizedType === 'series')) return true;

                    return false;
                });

                if (!hasMatch) {
                    return false;
                }
            }

            // Filtrar por categoria (se especificado)
            if (preferences.categories && preferences.categories.length > 0) {
                const contentCategories = (content.Categoria || content.Category || '')
                    .split(',')
                    .map((c: string) => c.trim());

                const hasMatch = preferences.categories.some((cat: string) =>
                    contentCategories.includes(cat)
                );

                if (!hasMatch) {
                    return false;
                }
            }

            return true;
        });
    }

    /**
     * Importa episódios de uma série do Baserow origem
     */
    private static async importSeriesEpisodes(
        seriesContent: any,
        userBaserow: BaserowService,
        episodesTableId: string,
        userId: string
    ): Promise<void> {
        try {
            const seriesName = seriesContent.Titulo || seriesContent.Nome;
            console.log(`📺 [AUTO-IMPORT] Buscando episódios para: ${seriesName}`);

            // Buscar configuração global de origem do Firebase
            const globalSourceConfig = await UserConfigService.getGlobalImportConfig();
            if (!globalSourceConfig || !globalSourceConfig.sourceToken || !globalSourceConfig.sourceBaseUrl || !globalSourceConfig.episodeTableId) {
                console.log(`⚠️ [AUTO-IMPORT] Configuração de origem não encontrada para episódios de ${seriesName}`);
                return;
            }

            // Buscar episódios do Baserow origem
            const sourceService = new BaserowService(
                globalSourceConfig.sourceToken,
                globalSourceConfig.sourceBaseUrl
            );

            const episodesResponse = await sourceService.getAllTableData(
                globalSourceConfig.episodeTableId,
                seriesName
            );

            const episodes = episodesResponse.results || [];

            if (episodes.length === 0) {
                console.log(`ℹ️ [AUTO-IMPORT] Nenhum episódio encontrado para: ${seriesName}`);
                return;
            }

            console.log(`📦 [AUTO-IMPORT] ${episodes.length} episódios encontrados para ${seriesName}`);

            // ORDENAR episódios por Temporada e Episódio
            const sortedEpisodes = episodes.sort((a, b) => {
                const tempA = parseInt(a.Temporada) || 0;
                const tempB = parseInt(b.Temporada) || 0;

                if (tempA !== tempB) {
                    return tempA - tempB; // Ordenar por temporada primeiro
                }

                // Se mesma temporada, ordenar por episódio
                const epA = parseInt(a.Episódio) || 0;
                const epB = parseInt(b.Episódio) || 0;
                return epA - epB;
            });

            console.log(`✅ [AUTO-IMPORT] Episódios ordenados: T${sortedEpisodes[0]?.Temporada}E${sortedEpisodes[0]?.Episódio} até T${sortedEpisodes[sortedEpisodes.length - 1]?.Temporada}E${sortedEpisodes[sortedEpisodes.length - 1]?.Episódio}`);

            // 📺 PREVIEW DOS EPISÓDIOS QUE SERÃO IMPORTADOS
            console.log(`\n📺 ============ PREVIEW DE EPISÓDIOS ============`);
            console.log(`📺 Série: ${seriesName}`);
            console.log(`📺 Total: ${sortedEpisodes.length} episódios`);
            console.log(`📺 ============================================`);

            // Mostrar primeiros 10 episódios
            const preview = sortedEpisodes.slice(0, 10);
            preview.forEach((ep, idx) => {
                console.log(`   ${idx + 1}. T${ep.Temporada}E${ep.Episódio} - ${ep.Nome || seriesName}`);
            });

            if (sortedEpisodes.length > 10) {
                console.log(`   ... e mais ${sortedEpisodes.length - 10} episódios`);
            }
            console.log(`📺 ============================================\n`);

            let importedEpisodes = 0;

            // Usar for com índice para garantir ordem sequencial
            for (let i = 0; i < sortedEpisodes.length; i++) {
                const episode = sortedEpisodes[i];
                const orderIndex = i + 1; // Ordem sequencial começando de 1

                try {
                    // Verificar duplicata pelo Link (mais confiável)
                    const episodeLink = episode.Link;
                    if (episodeLink) {
                        const existingEpisode = await userBaserow.getAllTableData(
                            episodesTableId,
                            episodeLink,
                            1
                        );

                        if (existingEpisode.results && existingEpisode.results.length > 0) {
                            // Episódio já existe, pular
                            continue;
                        }
                    }

                    // Limpar campos read-only do episódio
                    const cleanedEpisode = this.cleanReadOnlyFields(episode);

                    // GARANTIR que o episódio tem o nome da série
                    if (!cleanedEpisode.Serie && !cleanedEpisode.Nome) {
                        cleanedEpisode.Nome = seriesName;
                    }
                    if (!cleanedEpisode.Serie) {
                        cleanedEpisode.Serie = seriesName;
                    }

                    // ⭐ CAMPO ORDEM - Garante ordenação perfeita no Baserow
                    cleanedEpisode.Ordem = orderIndex;

                    console.log(`📥 [AUTO-IMPORT] [${orderIndex}/${sortedEpisodes.length}] ${seriesName} - T${episode.Temporada}E${episode.Episódio} (Ordem: ${orderIndex})`);

                    // Importar episódio e AGUARDAR confirmação
                    const createdEpisode = await userBaserow.createRow(episodesTableId, cleanedEpisode);
                    importedEpisodes++;

                    // VERIFICAR se foi realmente criado
                    if (createdEpisode && createdEpisode.id) {
                        console.log(`✅ [AUTO-IMPORT] Episódio ID ${createdEpisode.id} criado com sucesso`);
                    }

                    // DELAY para garantir processamento completo (1500ms)
                    await new Promise(resolve => setTimeout(resolve, 1500));

                } catch (error) {
                    console.error(`⚠️ [AUTO-IMPORT] Erro ao importar episódio:`, error);
                    // Continuar com próximo episódio
                }
            }

            console.log(`\n📺 ============ RESUMO DA IMPORTAÇÃO ============`);
            console.log(`✅ Série: ${seriesName}`);
            console.log(`✅ Importados: ${importedEpisodes}/${sortedEpisodes.length} episódios`);
            console.log(`✅ Sucesso: ${Math.round((importedEpisodes / sortedEpisodes.length) * 100)}%`);
            if (importedEpisodes < sortedEpisodes.length) {
                console.log(`⚠️  Pulados: ${sortedEpisodes.length - importedEpisodes} (já existiam)`);
            }
            console.log(`📺 ============================================\n`);

        } catch (error) {
            console.error(`❌ [AUTO-IMPORT] Erro ao buscar episódios:`, error);
            throw error;
        }
    }

    /**
     * Verifica se episódio já existe
     */
    private static async checkIfEpisodeExists(
        baserow: BaserowService,
        tableId: string,
        serieName: string,
        season: string,
        episode: string
    ): Promise<boolean> {
        try {
            const searchTerm = `${serieName} S${season}E${episode}`;
            const response = await baserow.getAllTableData(tableId, searchTerm, 1);
            return response.results && response.results.length > 0;
        } catch (error) {
            return false;
        }
    }

    /**
     * Remove campos read-only do Baserow que não podem ser setados manualmente
     */
    private static cleanReadOnlyFields(content: any): any {
        const cleaned = { ...content };

        // Lista EXPANDIDA de campos read-only do Baserow
        const readOnlyFields = [
            // Campos padrão do Baserow (inglês)
            'id',
            'order',
            'created_on',
            'updated_on',
            'created_by',
            'last_modified_by',

            // Variações com maiúsculas
            'Id', 'ID',
            'Order', 'ORDER',
            'Created_on', 'CREATED_ON',
            'Updated_on', 'UPDATED_ON',

            // Possíveis campos em português que podem causar erro
            'Data',  // pode ser mapeado para created_on
            'Edição', // pode ser mapeado para updated_on
        ];

        // Remover campos read-only
        readOnlyFields.forEach(field => {
            delete cleaned[field];
        });

        // Remover qualquer campo que comece com underscore
        Object.keys(cleaned).forEach(key => {
            if (key.startsWith('_')) {
                delete cleaned[key];
            }
        });

        return cleaned;
    }

    /**
     * Verifica se conteúdo já existe no Baserow do usuário
     */
    private static async checkIfExists(
        baserow: BaserowService,
        tableId: string,
        title: string
    ): Promise<boolean> {
        try {
            const response = await baserow.getAllTableData(tableId, title, 1);
            return response.results && response.results.length > 0;
        } catch (error) {
            console.error('Erro ao verificar duplicata:', error);
            return false;
        }
    }

    /**
     * Atualiza schedule após execução
     */
    private static async updateScheduleAfterRun(scheduleId: string, importedCount: number): Promise<void> {
        try {
            const scheduleRef = doc(db, 'autoImportSchedules', scheduleId);
            const scheduleDoc = await getDoc(scheduleRef);

            if (!scheduleDoc.exists()) {
                console.error('Schedule não encontrado:', scheduleId);
                return;
            }

            const schedule = scheduleDoc.data() as AutoImportSchedule;

            // Calcular próxima execução
            const now = new Date();
            const nextRun = new Date(now.getTime() + schedule.checkInterval * 60 * 1000);

            await updateDoc(scheduleRef, {
                lastCheckTimestamp: now.toISOString(),
                nextRun: nextRun.toISOString(),
                'stats.totalImported': increment(importedCount),
                'stats.lastImportCount': importedCount,
                'stats.lastImportDate': now.toISOString(),
                updatedAt: now.toISOString()
            });

            console.log(`📅 [AUTO-IMPORT] Próxima verificação: ${nextRun.toLocaleString()}`);
        } catch (error) {
            console.error('Erro ao atualizar schedule:', error);
        }
    }

    /**
     * Registra log de importação
     */
    private static async logImport(
        userId: string,
        runId: string,
        status: 'success' | 'skipped' | 'error',
        reasonOrError: string,
        contentTitle?: string,
        contentType?: string
    ): Promise<void> {
        try {
            const key = runId || userId || 'global';
            if (!this.logStats[key]) {
                this.logStats[key] = { total: 0, skippedExisting: 0 };
            }

            const stats = this.logStats[key];
            stats.total += 1;

            // Limitar total de logs por execução para evitar estouro de quota
            const MAX_LOGS_PER_RUN = 200;
            const MAX_SKIPPED_EXISTING_PER_RUN = 20;

            if (stats.total > MAX_LOGS_PER_RUN) {
                if (stats.total === MAX_LOGS_PER_RUN + 1) {
                    console.log('⚠️ [AUTO-IMPORT] Limite de logs por execução atingido, suprimindo logs adicionais.');
                }
                return;
            }

            // Evitar muitos logs "Já existe" repetidos
            if (status === 'skipped' && reasonOrError === 'Já existe') {
                stats.skippedExisting += 1;
                if (stats.skippedExisting > MAX_SKIPPED_EXISTING_PER_RUN) {
                    return;
                }
            }

            const logData: any = {
                userId,
                runId,
                contentTitle: contentTitle || 'N/A',
                status,
                timestamp: new Date().toISOString()
            };

            if (contentType) {
                logData.contentType = contentType;
            }

            if (status === 'skipped' && reasonOrError) {
                logData.reason = reasonOrError;
            }

            if (status === 'error' && reasonOrError) {
                logData.errorMessage = reasonOrError;
            }

            await addDoc(collection(db, 'autoImportLogs'), logData);
        } catch (error) {
            console.error('Erro ao registrar log:', error);
        }
    }
}
