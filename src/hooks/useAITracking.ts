import { useEffect, useCallback, useRef } from 'react';
import { useSimpleAuth } from '@/contexts/SimpleAuthContext';
import { useLocation } from 'react-router-dom';
import { AIAssistantService } from '@/services/AIAssistantService';

/**
 * Hook para rastrear automaticamente o comportamento do usuário
 * para alimentar a IA com dados de uso
 * 
 * OTIMIZADO: Com throttling de 2 minutos para evitar quota exceeded
 */
export const useAITracking = () => {
    const { userInfo } = useSimpleAuth();
    const location = useLocation();
    const lastTrackedRef = useRef<string>('');
    const lastTrackTimeRef = useRef<number>(0);

    // Rastrear mudança de página COM THROTTLING (máx 1x a cada 2 minutos)
    useEffect(() => {
        if (!userInfo?.id) return;

        const now = Date.now();
        const timeSinceLastTrack = now - lastTrackTimeRef.current;
        const THROTTLE_TIME = 120000; // 2 minutos

        // Se passou menos de 30s desde última track, ignorar
        if (timeSinceLastTrack < THROTTLE_TIME) {
            return;
        }

        const context = getContextFromPath(location.pathname);

        // Se for o mesmo contexto, não rastrear novamente
        if (lastTrackedRef.current === context) {
            return;
        }

        // Rastrear apenas se mudou de contexto E passou tempo suficiente
        AIAssistantService.trackUserAction(
            userInfo.id,
            'page-view',
            context,
            { pathname: location.pathname }
        );

        lastTrackedRef.current = context;
        lastTrackTimeRef.current = now;
    }, [location.pathname, userInfo?.id]);

    // Função para rastrear ações específicas COM THROTTLING
    const trackAction = useCallback(
        (action: string, context: string, metadata?: Record<string, any>) => {
            if (!userInfo?.id) return;

            const now = Date.now();
            const timeSinceLastTrack = now - lastTrackTimeRef.current;
            const THROTTLE_TIME = 30000; // 30 segundos para ações

            // Throttle: permitir no máximo 1 action a cada 30s
            if (timeSinceLastTrack < THROTTLE_TIME) {
                console.log('🚫 [AI Tracking] Action throttled:', action);
                return;
            }

            AIAssistantService.trackUserAction(
                userInfo.id,
                action,
                context,
                metadata
            );

            lastTrackTimeRef.current = now;
        },
        [userInfo?.id]
    );

    // Função para sugerir próxima ação (SEM chamar Firebase)
    const suggestNextAction = useCallback(
        async (lastAction: string) => {
            if (!userInfo?.id) return null;

            return AIAssistantService.suggestNextAction(userInfo.id, lastAction);
        },
        [userInfo?.id]
    );

    return {
        trackAction,
        suggestNextAction
    };
};

/**
 * Determina o contexto baseado no caminho da URL
 */
function getContextFromPath(pathname: string): string {
    if (pathname.includes('/conteudos')) return 'content-management';
    if (pathname.includes('/episodios')) return 'episodes';
    if (pathname.includes('/import')) return 'import';
    if (pathname.includes('/importacao-automatica')) return 'auto-import';
    if (pathname.includes('/categorias')) return 'categories';
    if (pathname.includes('/duplicados')) return 'duplicates';
    if (pathname.includes('/ferramentas-ia')) return 'ai-tools';
    if (pathname.includes('/dashboard')) return 'dashboard';
    if (pathname.includes('/configuracoes')) return 'settings';
    if (pathname.includes('/perfil')) return 'profile';

    return 'general';
}
