import { useEffect } from 'react';
import { AutoImportScheduleService } from '@/services/AutoImportScheduleService';
import { useSimpleAuth } from '@/contexts/SimpleAuthContext';

/**
 * Hook para executar verificações de importação automática por USUÁRIO
 * Similar ao useScheduleExecutor
 * Verifica a cada 15 minutos (900.000ms)
 */
export const useAutoImportExecutor = () => {
    const { userInfo } = useSimpleAuth();

    useEffect(() => {
        if (!userInfo?.id) {
            console.log('👤 [AUTO-IMPORT] Nenhum usuário autenticado, executor não iniciado.');
            return;
        }

        console.log('🤖 [AUTO-IMPORT] Iniciando verificador de importação automática para usuário:', {
            userId: userInfo.id,
            email: userInfo.email
        });

        // Verificação inicial (após 30s para dar tempo do app carregar)
        const initialTimeout = setTimeout(() => {
            AutoImportScheduleService.checkAndExecuteForUser(userInfo.id, userInfo.email);
        }, 30000);

        // Verificar a cada 15 minutos para reduzir consumo de Firestore
        const interval = setInterval(() => {
            AutoImportScheduleService.checkAndExecuteForUser(userInfo.id, userInfo.email);
        }, 900000); // 15 minutos

        return () => {
            console.log('🛑 [AUTO-IMPORT] Parando verificador de importação automática para usuário:', {
                userId: userInfo.id,
                email: userInfo.email
            });
            clearTimeout(initialTimeout);
            clearInterval(interval);
        };
    }, [userInfo?.id, userInfo?.email]);
};
