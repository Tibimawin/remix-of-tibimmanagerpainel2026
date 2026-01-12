import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useSimpleAuth } from '@/contexts/SimpleAuthContext';

interface AutoImportLog {
    id: string;
    userId: string;
    userEmail?: string;
    runId: string;
    importedCount: number;
    skippedCount: number;
    errorCount: number;
    status: 'success' | 'skipped' | 'error';
    message?: string;
    timestamp: string;
}

/**
 * Hook para buscar logs de importação automática do usuário
 */
export function useAutoImportLogs(limitCount = 20) {
    const { userInfo } = useSimpleAuth();
    const [logs, setLogs] = useState<AutoImportLog[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!userInfo?.id) {
            setLoading(false);
            return;
        }

        console.log('📡 [AUTO-IMPORT-LOGS] Iniciando listener de logs para:', userInfo.email);

        const q = query(
            collection(db, 'autoImportLogs'),
            where('userId', '==', userInfo.id),
            orderBy('timestamp', 'desc'),
            limit(limitCount)
        );

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const logsData = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })) as AutoImportLog[];

                console.log(`✅ [AUTO-IMPORT-LOGS] ${logsData.length} logs carregados`);
                setLogs(logsData);
                setLoading(false);
            },
            (error) => {
                console.error('❌ [AUTO-IMPORT-LOGS] Erro ao carregar logs:', error);
                setLoading(false);
            }
        );

        return () => {
            console.log('🔥 [AUTO-IMPORT-LOGS] Removendo listener de logs');
            unsubscribe();
        };
    }, [userInfo?.id, limitCount]);

    return { logs, loading };
}
