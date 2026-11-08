
import { addDoc, collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { ChatUser, Conversation } from './types';

export const useSendMessage = (user: ChatUser, selectedConversationId: string | null) => {
  const sendMessage = async (text: string) => {
    if (!text.trim()) {
      console.log('Mensagem vazia, cancelando envio');
      return;
    }

    // Determinar o conversationId baseado no contexto
    let targetConversationId: string;
    
    if (user.isAdmin) {
      // Admin: usar a conversa selecionada
      if (!selectedConversationId) {
        console.error('Admin: Nenhuma conversa selecionada');
        throw new Error('Selecione uma conversa para responder');
      }
      targetConversationId = selectedConversationId;
    } else {
      // Usuário: sempre usar user_${userId}
      targetConversationId = `user_${user.userId}`;
    }
    
    console.log('=== HOOK: ENVIANDO MENSAGEM ===');
    console.log('Texto:', text);
    console.log('ConversationId:', targetConversationId);
    console.log('User:', user);
    console.log('Selected conversation ID:', selectedConversationId);

    try {
      // Dados da mensagem
      const messageData = {
        text: text.trim(),
        senderId: user.isAdmin ? 'admin' : user.userId,
        senderName: user.isAdmin ? 'Administrador' : user.userName,
        senderType: user.isAdmin ? 'admin' as const : 'user' as const,
        timestamp: serverTimestamp(),
        conversationId: targetConversationId,
      };

      console.log('=== HOOK: Dados da mensagem ===', messageData);
      
      // Salvar mensagem
      const docRef = await addDoc(collection(db, 'messages'), messageData);
      console.log('=== HOOK: Mensagem salva com ID ===', docRef.id);

      // Atualizar conversa com informações corretas
      await updateConversation(targetConversationId, text.trim(), user);
      
      console.log('=== HOOK: MENSAGEM ENVIADA COM SUCESSO ===');

    } catch (error) {
      console.error('=== HOOK: ERRO AO ENVIAR MENSAGEM ===');
      console.error('Erro:', error);
      throw error;
    }
  };

  return { sendMessage };
};

const updateConversation = async (
  conversationId: string,
  lastMessage: string,
  user: ChatUser
) => {
  // Extrair o userId real do conversationId (sempre no formato user_${userId})
  const realUserId = conversationId.replace('user_', '');
  
  const conversationRef = doc(db, 'conversations', conversationId);
  
  // Manter sempre os dados do usuário real na conversa
  // Isso é importante para que o admin veja as informações corretas do usuário
  let conversationData;
  
  if (user.isAdmin) {
    // Admin respondendo: manter dados do usuário, mas atualizar última mensagem
    conversationData = {
      userId: realUserId,
      userName: `Usuário ${realUserId}`, // Nome genérico se não temos o nome real
      userEmail: `user${realUserId}@exemplo.com`, // Email genérico se não temos o email real
      lastMessage,
      lastMessageTime: serverTimestamp(),
      unreadCount: 0, // Admin leu, então sem mensagens não lidas para o admin
      status: 'active',
      lastSenderType: 'admin' // Indica quem enviou a última mensagem
    };
  } else {
    // Usuário enviando: usar dados reais do usuário
    conversationData = {
      userId: realUserId,
      userName: user.userName,
      userEmail: user.userEmail,
      lastMessage,
      lastMessageTime: serverTimestamp(),
      unreadCount: 1, // Nova mensagem do usuário para o admin
      status: 'active',
      lastSenderType: 'user' // Indica quem enviou a última mensagem
    };
  }

  console.log('=== HOOK: Atualizando conversa ===', conversationId, conversationData);
  
  await setDoc(conversationRef, conversationData, { merge: true });
  console.log('=== HOOK: Conversa atualizada com sucesso ===');
};
