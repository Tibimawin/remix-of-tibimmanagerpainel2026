import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useSimpleAuth } from '@/contexts/SimpleAuthContext';
import { UserPermissions } from '@/types/planTypes';
import { db } from '@/config/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { FirebaseUserService } from '@/services/FirebaseUserService';
import { isFreeFeatureWhenExpired } from '@/config/freeFeatures';

interface UserPermissionsContextType {
    permissions: UserPermissions | null;
    loading: boolean;
    isSubscriptionExpired: boolean;
    hasFeature: (featureId: string) => boolean;
    hasPrioritySupport: () => boolean;
    canAccessPremiumFeatures: () => boolean;
    hasContentLimit: () => boolean;
    getRemainingContent: () => number;
    canAddMoreContent: () => boolean;
    hasValidAccess: () => Promise<boolean>;
    refreshPermissions: () => void;
}

const UserPermissionsContext = createContext<UserPermissionsContextType | undefined>(undefined);

// NOTA: A expiração é determinada exclusivamente pelo documento `users/{uid}`
// via FirebaseUserService.checkUserAccess. Quando a assinatura está expirada,
// APENAS features listadas em FREE_FEATURES_WHEN_EXPIRED ficam disponíveis —
// mesmo que o admin tenha habilitado outras features no plano. O acesso pago
// volta automaticamente quando a assinatura é renovada.

export const UserPermissionsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { userInfo } = useSimpleAuth();
    const [permissions, setPermissions] = useState<UserPermissions | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [isSubscriptionExpired, setIsSubscriptionExpired] = useState(false);

    const refreshPermissions = () => {
        console.log('🔄 Forçando refresh das permissões');
        setRefreshTrigger(prev => prev + 1);
    };

    // Verifica periodicamente se a assinatura está expirada para liberar features grátis
    useEffect(() => {
        if (!userInfo?.id) {
            setIsSubscriptionExpired(false);
            return;
        }
        let cancelled = false;
        const check = async () => {
            try {
                const ok = await FirebaseUserService.checkUserAccess(userInfo.id);
                if (!cancelled) setIsSubscriptionExpired(!ok);
            } catch {
                if (!cancelled) setIsSubscriptionExpired(true);
            }
        };
        check();
        // Revalida a cada 60s para reagir rapidamente à expiração/renovação.
        const interval = setInterval(check, 60 * 1000);
        // Revalida também quando o usuário volta pra aba (focus/visibilitychange).
        const onFocus = () => check();
        const onVisibility = () => {
            if (document.visibilityState === 'visible') check();
        };
        window.addEventListener('focus', onFocus);
        document.addEventListener('visibilitychange', onVisibility);
        return () => {
            cancelled = true;
            clearInterval(interval);
            window.removeEventListener('focus', onFocus);
            document.removeEventListener('visibilitychange', onVisibility);
        };
    }, [userInfo?.id, refreshTrigger]);

    useEffect(() => {
        if (!userInfo?.id) {
            setPermissions(null);
            setLoading(false);
            return;
        }

        console.log('🔍 [SINGLETON] Iniciando listener ÚNICO de permissões para:', userInfo.email);
        setLoading(true);

        // ✅ APENAS UM LISTENER para todo o app
        const unsubscribe = onSnapshot(
            doc(db, 'userPermissions', userInfo.id),
            (docSnapshot) => {
                console.log('📡 Snapshot recebido para:', userInfo.email, 'Existe:', docSnapshot.exists());

                if (docSnapshot.exists()) {
                    const data = docSnapshot.data() as UserPermissions;
                    console.log('✅ Permissões carregadas do Firebase:', {
                        userEmail: data.userEmail,
                        planName: data.planName,
                        enabledFeatures: data.enabledFeatures,
                        lastUpdated: data.lastUpdated
                    });

                    const validatedPermissions = {
                        ...data,
                        enabledFeatures: Array.isArray(data.enabledFeatures) ? data.enabledFeatures : []
                    };

                    setPermissions(validatedPermissions);
                } else {
                    console.log('⚠️ Documento de permissões não existe, criando padrão');

                    const checkAndCreateUser = async () => {
                        try {
                            const existingUser = await FirebaseUserService.getUserById(userInfo.id);

                            if (!existingUser) {
                                console.log('👤 Usuário sem registro encontrado, criando...', userInfo.email);

                                await FirebaseUserService.createUserRecord({
                                    uid: userInfo.id,
                                    email: userInfo.email,
                                    name: userInfo.email?.split('@')[0] || 'Usuário',
                                    accessDays: 1,
                                    startDate: new Date().toISOString(),
                                    expiryDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                                    isActive: true,
                                    totalLogins: 0,
                                    createdAt: new Date().toISOString(),
                                    createdBy: 'auto-sync'
                                });
                            }
                        } catch (error) {
                            console.error('❌ Erro ao verificar/criar usuário:', error);
                        }
                    };

                    checkAndCreateUser();

                    const defaultPermissions: UserPermissions = {
                        userId: userInfo.id,
                        userEmail: userInfo.email,
                        userName: userInfo.email?.split('@')[0] || 'Usuário',
                        planId: 'basic',
                        planName: 'Básico',
                        monthlyContentLimit: 0,
                        enabledFeatures: [],
                        currentMonthUsage: 0,
                        lastUpdated: new Date().toISOString()
                    };
                    console.log('📝 Criando permissões padrão (bloqueadas):', defaultPermissions);
                    setPermissions(defaultPermissions);
                }
                setLoading(false);
            },
            (error) => {
                console.error('❌ Erro ao carregar permissões:', error);
                setLoading(false);
            }
        );

        return () => {
            console.log('🔥 [SINGLETON] Removendo listener ÚNICO de permissões para:', userInfo.email);
            unsubscribe();
        };
    }, [userInfo?.id, userInfo?.email, refreshTrigger]);

    const hasFeature = (featureId: string): boolean => {
        // Regra: expiração tem prioridade. Se a assinatura está expirada,
        // apenas features de FREE_FEATURES_WHEN_EXPIRED ficam disponíveis,
        // independentemente do que o admin habilitou no plano. Caso contrário,
        // libera as features presentes em `enabledFeatures`.
        if (isSubscriptionExpired) return isFreeFeatureWhenExpired(featureId);
        return Array.isArray(permissions?.enabledFeatures)
            ? permissions!.enabledFeatures.includes(featureId)
            : false;
    };

    const hasPrioritySupport = (): boolean => {
        return hasFeature('priority-support');
    };

    const canAccessPremiumFeatures = (): boolean => {
        if (isSubscriptionExpired) return false;
        return (permissions?.enabledFeatures?.length ?? 0) > 0;
    };

    const hasContentLimit = (): boolean => {
        return permissions?.monthlyContentLimit !== -1 && permissions?.monthlyContentLimit !== undefined;
    };

    const getRemainingContent = (): number => {
        if (!permissions || permissions.monthlyContentLimit === -1) return -1;
        return Math.max(0, permissions.monthlyContentLimit - permissions.currentMonthUsage);
    };

    const canAddMoreContent = (): boolean => {
        if (!permissions) return false;
        if (isSubscriptionExpired) return false;
        if (permissions.monthlyContentLimit === -1) return true;
        return permissions.currentMonthUsage < permissions.monthlyContentLimit;
    };

    const hasValidAccess = async (): Promise<boolean> => {
        if (!userInfo?.id) return false;

        try {
            return await FirebaseUserService.checkUserAccess(userInfo.id);
        } catch (error) {
            console.error('Erro ao verificar acesso:', error);
            return false;
        }
    };

    const value = {
        permissions,
        loading,
        isSubscriptionExpired,
        hasFeature,
        hasPrioritySupport,
        canAccessPremiumFeatures,
        hasContentLimit,
        getRemainingContent,
        canAddMoreContent,
        hasValidAccess,
        refreshPermissions
    };

    return (
        <UserPermissionsContext.Provider value={value}>
            {children}
        </UserPermissionsContext.Provider>
    );
};

// Hook para usar o contexto
export const useUserPermissions = () => {
    const context = useContext(UserPermissionsContext);
    if (!context) {
        throw new Error('useUserPermissions must be used within UserPermissionsProvider');
    }
    return context;
};
