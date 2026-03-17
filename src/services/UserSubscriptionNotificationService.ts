import { addDoc, collection, query, where, getDocs, Timestamp, deleteDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { logger } from '@/utils/logger';

/**
 * Serviço para criar notificações para os usuários sobre suas assinaturas
 */
export class UserSubscriptionNotificationService {

    /**
     * Envia notificação de boas-vindas quando uma assinatura é renovada/estendida
     */
    static async notifySubscriptionRenewal(
        userId: string,
        userEmail: string,
        userName: string,
        daysAdded: number,
        newExpiryDate: string
    ): Promise<void> {
        try {
            logger.debug('Criando notificação de renovação de assinatura', {
                userId,
                userEmail,
                daysAdded
            });

            const expiryDateFormatted = new Date(newExpiryDate).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });

            // Criar notificação no sistema
            await addDoc(collection(db, 'userNotifications'), {
                titulo: '🎉 Assinatura Renovada com Sucesso!',
                mensagem: `Parabéns ${userName}! Sua assinatura foi renovada por mais ${daysAdded} dia(s). Seu acesso agora é válido até ${expiryDateFormatted}. Aproveite todos os recursos do painel!`,
                tipo: 'success',
                dataRecebimento: new Date(),
                lida: false,
                destinatario: userId,
                emailDestinatario: userEmail,
                persistent: true, // Notificação persistente
                subscriptionRenewal: true,
                metadata: {
                    daysAdded,
                    newExpiryDate,
                    notificationType: 'renewal'
                }
            });

            logger.info('Notificação de renovação enviada com sucesso', { userId, userEmail });
        } catch (error) {
            logger.error('Erro ao enviar notificação de renovação:', error);
        }
    }

    /**
     * Envia notificação quando a assinatura está próxima de expirar
     */
    static async notifyExpirationWarning(
        userId: string,
        userEmail: string,
        userName: string,
        daysRemaining: number,
        expiryDate: string
    ): Promise<void> {
        try {
            logger.debug('Criando notificação de aviso de expiração', {
                userId,
                userEmail,
                daysRemaining
            });

            // Verificar se já existe uma notificação de expiração não lida
            const existingNotifications = query(
                collection(db, 'userNotifications'),
                where('destinatario', '==', userId),
                where('expirationWarning', '==', true),
                where('lida', '==', false)
            );

            const snapshot = await getDocs(existingNotifications);
            if (!snapshot.empty) {
                logger.debug('Notificação de expiração já existe para este usuário');
                return; // Já existe uma notificação não lida
            }

            const expiryDateFormatted = new Date(expiryDate).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });

            let titulo = '';
            let mensagem = '';
            let tipo: 'warning' | 'error' = 'warning';

            if (daysRemaining <= 1) {
                tipo = 'error';
                titulo = '🚨 Sua Assinatura Expira HOJE!';
                mensagem = `${userName}, sua assinatura expira HOJE (${expiryDateFormatted})! Renove agora para não perder o acesso ao painel e todos os seus dados.`;
            } else if (daysRemaining <= 3) {
                tipo = 'error';
                titulo = '⚠️ Assinatura Expira em Breve!';
                mensagem = `${userName}, sua assinatura expira em ${daysRemaining} dia(s) (${expiryDateFormatted}). Renove agora para garantir acesso contínuo ao painel!`;
            } else if (daysRemaining <= 7) {
                tipo = 'warning';
                titulo = '⏰ Lembrete: Assinatura Expirando';
                mensagem = `Olá ${userName}, sua assinatura expira em ${daysRemaining} dia(s) (${expiryDateFormatted}). Considere renovar para continuar aproveitando todos os recursos!`;
            } else {
                return; // Não enviar notificação se faltam mais de 7 dias
            }

            // Criar notificação
            await addDoc(collection(db, 'userNotifications'), {
                titulo,
                mensagem,
                tipo,
                dataRecebimento: new Date(),
                lida: false,
                destinatario: userId,
                emailDestinatario: userEmail,
                persistent: true, // Notificação persistente
                expirationWarning: true,
                metadata: {
                    daysRemaining,
                    expiryDate,
                    notificationType: 'expiration-warning'
                }
            });

            logger.info('Notificação de aviso de expiração enviada', { userId, userEmail, daysRemaining });
        } catch (error) {
            logger.error('Erro ao enviar notificação de expiração:', error);
        }
    }

    /**
     * Envia notificação informando que a assinatura expirou
     */
    static async notifySubscriptionExpired(
        userId: string,
        userEmail: string,
        userName: string,
        expiryDate: string
    ): Promise<void> {
        try {
            logger.debug('Criando notificação de assinatura expirada', {
                userId,
                userEmail
            });

            const expiryDateFormatted = new Date(expiryDate).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });

            // Criar notificação
            await addDoc(collection(db, 'userNotifications'), {
                titulo: '❌ Assinatura Expirada',
                mensagem: `${userName}, sua assinatura expirou em ${expiryDateFormatted}. Seu acesso ao painel foi suspenso. Entre em contato com o administrador para renovar sua assinatura e recuperar o acesso.`,
                tipo: 'error',
                dataRecebimento: new Date(),
                lida: false,
                destinatario: userId,
                emailDestinatario: userEmail,
                persistent: true, // Notificação persistente e prioritária
                subscriptionExpired: true,
                metadata: {
                    expiryDate,
                    notificationType: 'expired'
                }
            });

            logger.info('Notificação de assinatura expirada enviada', { userId, userEmail });
        } catch (error) {
            logger.error('Erro ao enviar notificação de assinatura expirada:', error);
        }
    }

    /**
     * Envia notificação de boas-vindas para novos usuários
     */
    static async notifyWelcome(
        userId: string,
        userEmail: string,
        userName: string,
        accessDays: number,
        expiryDate: string
    ): Promise<void> {
        try {
            logger.debug('Criando notificação de boas-vindas', {
                userId,
                userEmail
            });

            const expiryDateFormatted = new Date(expiryDate).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });

            // Criar notificação
            await addDoc(collection(db, 'userNotifications'), {
                titulo: '👋 Bem-vindo ao Painel!',
                mensagem: `Olá ${userName}! Seja bem-vindo! Sua conta foi criada com sucesso e você tem ${accessDays} dia(s) de acesso (válido até ${expiryDateFormatted}). Explore todos os recursos e aproveite!`,
                tipo: 'info',
                dataRecebimento: new Date(),
                lida: false,
                destinatario: userId,
                emailDestinatario: userEmail,
                persistent: false, // Notificação de boas-vindas não precisa ser persistente
                welcomeMessage: true,
                metadata: {
                    accessDays,
                    expiryDate,
                    notificationType: 'welcome'
                }
            });

            logger.info('Notificação de boas-vindas enviada', { userId, userEmail });
        } catch (error) {
            logger.error('Erro ao enviar notificação de boas-vindas:', error);
        }
    }

    /**
     * Notifica o usuário que sua solicitação de saque foi aprovada
     */
    static async notifyWithdrawalApproved(
        userId: string,
        userEmail: string,
        amount: number,
        adminNotes?: string
    ): Promise<void> {
        try {
            const noteText = adminNotes ? ` Observação do admin: "${adminNotes}"` : '';
            await addDoc(collection(db, 'userNotifications'), {
                titulo: '✅ Saque Aprovado!',
                mensagem: `Seu saque de R$${amount.toFixed(2)} foi aprovado! O valor será enviado para sua chave Pix em breve.${noteText}`,
                tipo: 'success',
                dataRecebimento: new Date(),
                lida: false,
                destinatario: userId,
                emailDestinatario: userEmail,
                persistent: true,
                withdrawalNotification: true,
                metadata: { amount, status: 'approved', adminNotes, notificationType: 'withdrawal' }
            });
            logger.info('Notificação de saque aprovado enviada', { userId, amount });
        } catch (error) {
            logger.error('Erro ao enviar notificação de saque aprovado:', error);
        }
    }

    /**
     * Notifica o usuário que sua solicitação de saque foi rejeitada
     */
    static async notifyWithdrawalRejected(
        userId: string,
        userEmail: string,
        amount: number,
        adminNotes?: string
    ): Promise<void> {
        try {
            const noteText = adminNotes ? ` Motivo: "${adminNotes}"` : '';
            await addDoc(collection(db, 'userNotifications'), {
                titulo: '❌ Saque Rejeitado',
                mensagem: `Sua solicitação de saque de R$${amount.toFixed(2)} foi rejeitada.${noteText} O valor foi devolvido ao seu saldo.`,
                tipo: 'error',
                dataRecebimento: new Date(),
                lida: false,
                destinatario: userId,
                emailDestinatario: userEmail,
                persistent: true,
                withdrawalNotification: true,
                metadata: { amount, status: 'rejected', adminNotes, notificationType: 'withdrawal' }
            });
            logger.info('Notificação de saque rejeitado enviada', { userId, amount });
        } catch (error) {
            logger.error('Erro ao enviar notificação de saque rejeitado:', error);
        }
    }

    /**
     * Remove notificações de expiração quando a assinatura é renovada
     */
    static async removeExpirationWarnings(userId: string): Promise<void> {
        try {
            logger.debug('Removendo notificações de expiração antigas', { userId });

            const q = query(
                collection(db, 'userNotifications'),
                where('destinatario', '==', userId),
                where('expirationWarning', '==', true)
            );

            const snapshot = await getDocs(q);

            for (const docSnap of snapshot.docs) {
                await deleteDoc(docSnap.ref);
            }

            logger.info('Notificações de expiração removidas', { userId, count: snapshot.size });
        } catch (error) {
            logger.error('Erro ao remover notificações de expiração:', error);
        }
    }
}
