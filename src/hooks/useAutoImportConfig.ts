import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useSimpleAuth } from '@/contexts/SimpleAuthContext';

interface AutoImportConfig {
    userId: string;
    userEmail: string;
    isEnabled: boolean;
    checkInterval: number;
    nextRun: string;
    lastCheckTimestamp: string;
    lastCheckContentCount: number;
    preferences: {
        contentTypes: string[];
        categories: string[];
    };
    stats: {
        totalImported: number;
        lastImportCount: number;
        lastImportDate: string;
    };
    createdAt: string;
    updatedAt: string;
    // Formato de tipo usado na gravação no Baserow (singular/plural)
    typeFormat?: 'plural' | 'singular';
}

/**
 * Hook para gerenciar configuração de importação automática do usuário
 */
export function useAutoImportConfig() {
    const { userInfo } = useSimpleAuth();
    const [config, setConfig] = useState<AutoImportConfig | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!userInfo?.id) {
            setLoading(false);
            return;
        }

        console.log('📡 [AUTO-IMPORT-CONFIG] Iniciando listener para:', userInfo.email);

        const docRef = doc(db, 'autoImportSchedules', userInfo.id);

        const unsubscribe = onSnapshot(
            docRef,
            async (docSnap) => {
                if (docSnap.exists()) {
                    const data = docSnap.data() as AutoImportConfig;
                    console.log('✅ [AUTO-IMPORT-CONFIG] Configuração carregada:', {
                        isEnabled: data.isEnabled,
                        contentTypes: data.preferences.contentTypes
                    });
                    setConfig(data);
                } else {
                    console.log('📝 [AUTO-IMPORT-CONFIG] Criando configuração padrão');

                    // Criar configuração padrão
                    const defaultConfig = {
                        userId: userInfo.id,
                        userEmail: userInfo.email,
                        isEnabled: false, // Desativado por padrão
                        checkInterval: 15, // 15 minutos
                        nextRun: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
                        lastCheckTimestamp: new Date().toISOString(),
                        lastCheckContentCount: 0,
                        preferences: {
                            contentTypes: ['Filme', 'Serie'],
                            categories: []
                        },
                        stats: {
                            totalImported: 0,
                            lastImportCount: 0,
                            lastImportDate: ''
                        },
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    };

                    try {
                        await setDoc(docRef, defaultConfig);
                        setConfig(defaultConfig as AutoImportConfig);
                    } catch (error) {
                        console.error('Erro ao criar config padrão:', error);
                    }
                }
                setLoading(false);
            },
            (error) => {
                console.error('❌ [AUTO-IMPORT-CONFIG] Erro ao carregar:', error);
                setLoading(false);
            }
        );

        return () => {
            console.log('🔥 [AUTO-IMPORT-CONFIG] Removendo listener');
            unsubscribe();
        };
    }, [userInfo?.id, userInfo?.email]);

    const updateConfig = async (updates: Partial<AutoImportConfig>) => {
        if (!userInfo?.id) {
            throw new Error('Usuário não autenticado');
        }

        try {
            console.log('💾 [AUTO-IMPORT-CONFIG] Atualizando configuração:', updates);

            await updateDoc(doc(db, 'autoImportSchedules', userInfo.id), {
                ...updates,
                updatedAt: new Date().toISOString()
            });

            console.log('✅ [AUTO-IMPORT-CONFIG] Configuração atualizada');
        } catch (error) {
            console.error('❌ [AUTO-IMPORT-CONFIG] Erro ao atualizar:', error);
            throw error;
        }
    };

    return { config, loading, updateConfig };
}
