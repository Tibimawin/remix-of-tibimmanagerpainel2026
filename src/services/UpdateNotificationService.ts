import { addDoc, collection, query, orderBy, getDocs, doc, updateDoc, where, getDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';

export interface UpdateNote {
    id?: string;
    version: string; // ex: "2.5.0"
    title: string; // ex: "Nova Funcionalidade de Automação"
    description: string; // Descrição curta
    changes: {
        type: 'feature' | 'improvement' | 'bugfix' | 'breaking';
        description: string;
    }[];
    releaseDate: string;
    createdBy: string; // admin que criou
    createdAt: string;
    priority: 'low' | 'medium' | 'high'; // Define se mostra modal ou só notificação
}

export interface UserUpdateView {
    userId: string;
    updateId: string;
    viewedAt: string;
    dismissed: boolean;
}

export class UpdateNotificationService {

    /**
     * Cria uma nova nota de atualização (apenas admin)
     */
    static async createUpdate(update: Omit<UpdateNote, 'id' | 'createdAt'>): Promise<string> {
        try {
            const docRef = await addDoc(collection(db, 'systemUpdates'), {
                ...update,
                createdAt: new Date().toISOString()
            });

            console.log('✅ Atualização criada com sucesso:', docRef.id);
            return docRef.id;
        } catch (error) {
            console.error('❌ Erro ao criar atualização:', error);
            throw error;
        }
    }

    /**
     * Busca todas as atualizações ordenadas por data
     */
    static async getAllUpdates(): Promise<UpdateNote[]> {
        try {
            const q = query(
                collection(db, 'systemUpdates'),
                orderBy('releaseDate', 'desc')
            );

            const snapshot = await getDocs(q);
            const updates: UpdateNote[] = [];

            snapshot.forEach((doc) => {
                updates.push({ id: doc.id, ...doc.data() } as UpdateNote);
            });

            return updates;
        } catch (error) {
            console.error('❌ Erro ao buscar atualizações:', error);
            return [];
        }
    }

    /**
     * Busca atualizações que o usuário ainda não viu
     */
    static async getUnseenUpdates(userId: string): Promise<UpdateNote[]> {
        try {
            // Buscar todas as atualizações
            const allUpdates = await this.getAllUpdates();

            // Buscar quais o usuário já viu
            const viewsQuery = query(
                collection(db, 'userUpdateViews'),
                where('userId', '==', userId)
            );

            const viewsSnapshot = await getDocs(viewsQuery);
            const viewedUpdateIds = new Set<string>();

            viewsSnapshot.forEach((doc) => {
                const data = doc.data() as UserUpdateView;
                viewedUpdateIds.add(data.updateId);
            });

            // Filtrar updates não vistos
            const unseenUpdates = allUpdates.filter(update =>
                update.id && !viewedUpdateIds.has(update.id)
            );

            console.log(`📊 Updates não vistos para usuário ${userId}:`, unseenUpdates.length);
            return unseenUpdates;
        } catch (error) {
            console.error('❌ Erro ao buscar updates não vistos:', error);
            return [];
        }
    }

    /**
     * Marca uma atualização como vista pelo usuário
     */
    static async markUpdateAsViewed(userId: string, updateId: string): Promise<void> {
        try {
            // Verificar se já existe
            const existingQuery = query(
                collection(db, 'userUpdateViews'),
                where('userId', '==', userId),
                where('updateId', '==', updateId)
            );

            const existingSnapshot = await getDocs(existingQuery);

            if (!existingSnapshot.empty) {
                console.log('ℹ️ Update já marcado como visto');
                return;
            }

            // Criar novo registro
            await addDoc(collection(db, 'userUpdateViews'), {
                userId,
                updateId,
                viewedAt: new Date().toISOString(),
                dismissed: false
            });

            console.log('✅ Update marcado como visto:', updateId);
        } catch (error) {
            console.error('❌ Erro ao marcar update como visto:', error);
        }
    }

    /**
     * Marca múltiplas atualizações como vistas
     */
    static async markMultipleAsViewed(userId: string, updateIds: string[]): Promise<void> {
        try {
            const promises = updateIds.map(updateId =>
                this.markUpdateAsViewed(userId, updateId)
            );

            await Promise.all(promises);
            console.log('✅ Múltiplos updates marcados como vistos:', updateIds.length);
        } catch (error) {
            console.error('❌ Erro ao marcar múltiplos updates:', error);
        }
    }

    /**
     * Envia notificação para todos os usuários sobre nova atualização
     */
    static async notifyAllUsers(updateId: string, updateTitle: string): Promise<void> {
        try {
            // Buscar todos os usuários
            const usersSnapshot = await getDocs(collection(db, 'users'));

            const notificationPromises = usersSnapshot.docs.map(async (userDoc) => {
                const userData = userDoc.data();

                return addDoc(collection(db, 'userNotifications'), {
                    titulo: '🎉 Nova Atualização Disponível!',
                    mensagem: `Confira as novidades: ${updateTitle}. Acesse o painel para ver todos os detalhes!`,
                    tipo: 'info',
                    dataRecebimento: new Date(),
                    lida: false,
                    destinatario: userDoc.id,
                    emailDestinatario: userData.email,
                    persistent: false,
                    systemUpdate: true,
                    metadata: {
                        updateId,
                        notificationType: 'system-update'
                    }
                });
            });

            await Promise.all(notificationPromises);
            console.log('✅ Notificações enviadas para todos os usuários');
        } catch (error) {
            console.error('❌ Erro ao notificar usuários:', error);
        }
    }

    /**
     * Busca a última atualização
     */
    static async getLatestUpdate(): Promise<UpdateNote | null> {
        try {
            const q = query(
                collection(db, 'systemUpdates'),
                orderBy('releaseDate', 'desc')
            );

            const snapshot = await getDocs(q);

            if (snapshot.empty) return null;

            const firstDoc = snapshot.docs[0];
            return { id: firstDoc.id, ...firstDoc.data() } as UpdateNote;
        } catch (error) {
            console.error('❌ Erro ao buscar última atualização:', error);
            return null;
        }
    }
}
