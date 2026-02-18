import { collection, query, where, getDocs, addDoc, orderBy, limit } from 'firebase/firestore';
import { db } from '@/config/firebase';

/**
 * Serviço de IA que analisa comportamento e gera sugestões personalizadas
 */

export interface UserBehavior {
    userId: string;
    action: string;
    context: string;
    timestamp: string;
    metadata?: Record<string, any>;
}

export interface AISuggestion {
    id?: string;
    type: 'tip' | 'feature' | 'workflow' | 'optimization' | 'warning';
    title: string;
    description: string;
    priority: 'low' | 'medium' | 'high';
    context: string;
    actionLabel?: string;
    actionRoute?: string;
    createdAt: string;
    dismissed?: boolean;
}

export class AIAssistantService {

    /**
     * Registra uma ação do usuário para análise
     */
    static async trackUserAction(
        userId: string,
        action: string,
        context: string,
        metadata?: Record<string, any>
    ): Promise<void> {
        try {
            await addDoc(collection(db, 'userBehavior'), {
                userId,
                action,
                context,
                timestamp: new Date().toISOString(),
                metadata: metadata || {}
            });
        } catch (error) {
            console.error('Erro ao rastrear ação:', error);
        }
    }

    /**
     * Analisa comportamento e gera sugestões personalizadas
     */
    static async generateSuggestions(userId: string): Promise<AISuggestion[]> {
        try {
            const suggestions: AISuggestion[] = [];

            // Buscar histórico de ações do usuário (últimos 30 dias)
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            const behaviorQuery = query(
                collection(db, 'userBehavior'),
                where('userId', '==', userId),
                where('timestamp', '>=', thirtyDaysAgo.toISOString()),
                orderBy('timestamp', 'desc'),
                limit(100)
            );

            const behaviorSnapshot = await getDocs(behaviorQuery);
            const behaviors: UserBehavior[] = [];

            behaviorSnapshot.forEach(doc => {
                behaviors.push(doc.data() as UserBehavior);
            });

            // ANÁLISE 1: Nunca usou importação automática
            const hasUsedAutoImport = behaviors.some(b => b.context === 'auto-import');
            if (!hasUsedAutoImport) {
                suggestions.push({
                    type: 'feature',
                    title: '🤖 Economize tempo com Importação Automática',
                    description: 'Você ainda não usou a importação automática! Configure uma vez e deixe o sistema importar conteúdos automaticamente todos os dias.',
                    priority: 'high',
                    context: 'feature-discovery',
                    actionLabel: 'Configurar Agora',
                    actionRoute: '/importacao-automatica',
                    createdAt: new Date().toISOString()
                });
            }

            // ANÁLISE 2: Importa muito manualmente (pode se beneficiar de automação)
            const manualImports = behaviors.filter(b => b.action === 'manual-import').length;
            if (manualImports > 5 && !hasUsedAutoImport) {
                suggestions.push({
                    type: 'optimization',
                    title: '⚡ Detectamos que você importa muito manualmente',
                    description: `Você já fez ${manualImports} importações manuais este mês. A automação pode fazer isso por você e economizar muito tempo!`,
                    priority: 'high',
                    context: 'workflow-optimization',
                    actionLabel: 'Ativar Automação',
                    actionRoute: '/importacao-automatica',
                    createdAt: new Date().toISOString()
                });
            }

            // ANÁLISE 3: Cria conteúdo mas não usa categorias
            const contentCreations = behaviors.filter(b => b.action === 'create-content').length;
            const categoryUsage = behaviors.filter(b => b.context === 'categories').length;

            if (contentCreations > 10 && categoryUsage === 0) {
                suggestions.push({
                    type: 'tip',
                    title: '📁 Organize melhor seus conteúdos com Categorias',
                    description: 'Você criou muitos conteúdos mas não está usando categorias. Organize tudo para facilitar a busca!',
                    priority: 'medium',
                    context: 'organization',
                    actionLabel: 'Gerenciar Categorias',
                    actionRoute: '/categorias',
                    createdAt: new Date().toISOString()
                });
            }

            // ANÁLISE 4: Muitos duplicados detectados
            const duplicateChecks = behaviors.filter(b =>
                b.context === 'duplicates' && b.metadata?.foundDuplicates
            ).length;

            if (duplicateChecks > 3) {
                suggestions.push({
                    type: 'warning',
                    title: '⚠️ Detectamos muitos conteúdos duplicados',
                    description: 'Você tem vários conteúdos duplicados no sistema. Isso pode confundir seus usuários e ocupar espaço desnecessário.',
                    priority: 'high',
                    context: 'data-quality',
                    actionLabel: 'Limpar Duplicados',
                    actionRoute: '/duplicados',
                    createdAt: new Date().toISOString()
                });
            }

            // ANÁLISE 5: Não usa ferramentas de IA

            // ANÁLISE 6: Padrão de uso em horários específicos
            const hourlyActivity = this.analyzeHourlyPattern(behaviors);
            if (hourlyActivity.peakHour !== null) {
                suggestions.push({
                    type: 'tip',
                    title: `⏰ Seu horário mais produtivo: ${hourlyActivity.peakHour}h`,
                    description: `Notamos que você é mais ativo às ${hourlyActivity.peakHour}h. Configure automações para este horário para maior eficiência!`,
                    priority: 'low',
                    context: 'productivity',
                    createdAt: new Date().toISOString()
                });
            }

            // ANÁLISE 7: Nunca exportou dados (risco de perda)
            const hasExported = behaviors.some(b => b.action === 'export-data');
            if (!hasExported && contentCreations > 20) {
                suggestions.push({
                    type: 'warning',
                    title: '💾 Faça backup dos seus dados',
                    description: 'Você tem muito conteúdo criado mas nunca exportou. Recomendamos fazer backup regularmente!',
                    priority: 'medium',
                    context: 'data-safety',
                    actionLabel: 'Exportar Dados',
                    actionRoute: '/conteudos',
                    createdAt: new Date().toISOString()
                });
            }

            // ANÁLISE 8: Usuário avançado - pode ajudar outros
            if (behaviors.length > 50) {
                const hasUsedMostFeatures = this.calculateFeatureUsageDiversity(behaviors);
                if (hasUsedMostFeatures > 0.7) {
                    suggestions.push({
                        type: 'tip',
                        title: '🌟 Você é um usuário avançado!',
                        description: 'Você usa muitas funcionalidades do painel. Que tal nos ajudar deixando um feedback ou sugestão de melhoria?',
                        priority: 'low',
                        context: 'engagement',
                        actionLabel: 'Enviar Feedback',
                        actionRoute: '/suporte-ao-vivo',
                        createdAt: new Date().toISOString()
                    });
                }
            }

            // ANÁLISE 9: Novato - precisa de orientação
            if (behaviors.length < 10) {
                suggestions.push({
                    type: 'tip',
                    title: '👋 Bem-vindo! Vamos te ajudar a começar',
                    description: 'Vimos que você é novo por aqui. Explore o tour guiado para conhecer todas as funcionalidades do painel!',
                    priority: 'high',
                    context: 'onboarding',
                    actionLabel: 'Iniciar Tour',
                    createdAt: new Date().toISOString()
                });
            }

            // ANÁLISE 10: Verifica links mas tem muitos quebrados
            const brokenLinksFound = behaviors.filter(b =>
                b.context === 'link-validation' && b.metadata?.brokenLinks > 0
            ).length;

            if (brokenLinksFound > 3) {
                suggestions.push({
                    type: 'warning',
                    title: '🔗 Atenção: Links quebrados detectados',
                    description: 'Vários links quebrados foram encontrados nos seus conteúdos. Isso pode prejudicar a experiência dos seus usuários.',
                    priority: 'high',
                    context: 'data-quality',
                    actionLabel: 'Verificar Links',
                    actionRoute: '/conteudos',
                    createdAt: new Date().toISOString()
                });
            }

            return suggestions;
        } catch (error) {
            console.error('Erro ao gerar sugestões:', error);
            return [];
        }
    }

    /**
     * Analisa padrão de horário de uso
     */
    private static analyzeHourlyPattern(behaviors: UserBehavior[]): { peakHour: number | null } {
        const hourCounts: Record<number, number> = {};

        behaviors.forEach(b => {
            const hour = new Date(b.timestamp).getHours();
            hourCounts[hour] = (hourCounts[hour] || 0) + 1;
        });

        let peakHour: number | null = null;
        let maxCount = 0;

        Object.entries(hourCounts).forEach(([hour, count]) => {
            if (count > maxCount) {
                maxCount = count;
                peakHour = parseInt(hour);
            }
        });

        return { peakHour: maxCount > 5 ? peakHour : null };
    }

    /**
     * Calcula diversidade de uso de features
     */
    private static calculateFeatureUsageDiversity(behaviors: UserBehavior[]): number {
        const uniqueContexts = new Set(behaviors.map(b => b.context));
        const totalFeatures = 15; // Número estimado de features principais

        return uniqueContexts.size / totalFeatures;
    }

    /**
     * Pega sugestões específicas por contexto
     */
    static async getContextualSuggestions(
        userId: string,
        currentPage: string
    ): Promise<AISuggestion[]> {
        const allSuggestions = await this.generateSuggestions(userId);

        // Filtrar sugestões relevantes para a página atual
        return allSuggestions.filter(s => {
            if (currentPage.includes('import') && s.context === 'workflow-optimization') return true;
            if (currentPage.includes('content') && s.context === 'organization') return true;
            if (currentPage.includes('duplicados') && s.context === 'data-quality') return true;
            if (s.priority === 'high') return true; // Sempre mostrar alta prioridade
            return false;
        });
    }

    /**
     * Analisa e sugere próxima ação baseado em workflow típico
     */
    static async suggestNextAction(userId: string, lastAction: string): Promise<AISuggestion | null> {
        const workflows: Record<string, AISuggestion> = {
            'create-content': {
                type: 'workflow',
                title: 'Próximo passo: Organize em categorias',
                description: 'Você acabou de criar conteúdo. Que tal organizá-lo em uma categoria?',
                priority: 'medium',
                context: 'workflow',
                actionLabel: 'Ir para Categorias',
                actionRoute: '/categorias',
                createdAt: new Date().toISOString()
            },
            'import-content': {
                type: 'workflow',
                title: 'Próximo passo: Validar qualidade',
                description: 'Importação concluída! Verifique se há duplicados ou links quebrados.',
                priority: 'medium',
                context: 'workflow',
                actionLabel: 'Verificar Duplicados',
                actionRoute: '/duplicados',
                createdAt: new Date().toISOString()
            },
            'clean-duplicates': {
                type: 'workflow',
                title: 'Próximo passo: Organize melhor',
                description: 'Duplicados removidos! Agora organize tudo em categorias para facilitar a navegação.',
                priority: 'low',
                context: 'workflow',
                actionLabel: 'Gerenciar Categorias',
                actionRoute: '/categorias',
                createdAt: new Date().toISOString()
            }
        };

        return workflows[lastAction] || null;
    }
}
