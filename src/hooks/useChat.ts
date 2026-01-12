
import { useConversations } from './chat/useConversations';
import { useMessages } from './chat/useMessages';
import { useSendMessage } from './chat/useSendMessage';
import { ChatUser } from './chat/types';

export type { ChatMessage, Conversation } from './chat/types';

export const useChat = (userId: string, userName: string, userEmail: string, isAdmin: boolean = false) => {
  console.log('useChat hook iniciando:', { 
    userId, 
    userName, 
    userEmail, 
    isAdmin
  });

  const user: ChatUser = {
    userId,
    userName,
    userEmail,
    isAdmin
  };

  // Gerenciar conversas (apenas para admin)
  const {
    conversations,
    selectedConversationId,
    setSelectedConversationId,
    loading: conversationsLoading
  } = useConversations(isAdmin);

  // Determinar o conversationId correto
  let conversationId: string | null = null;
  
  if (isAdmin) {
    // Admin: usar a conversa selecionada
    conversationId = selectedConversationId;
  } else {
    // Usuário: sempre usar user_${userId}
    conversationId = `user_${userId}`;
  }

  console.log('ConversationId determinado:', conversationId);
  console.log('Configurações:', { isAdmin, selectedConversationId, conversationId });

  // Gerenciar mensagens da conversa atual
  const { messages, loading: messagesLoading } = useMessages(conversationId);

  // Gerenciar envio de mensagens
  const { sendMessage } = useSendMessage(user, selectedConversationId);

  const loading = isAdmin ? conversationsLoading || messagesLoading : messagesLoading;

  console.log('Hook useChat estado final:', {
    messagesCount: messages.length,
    conversationsCount: conversations.length,
    loading,
    conversationId
  });

  return {
    messages,
    conversations,
    loading,
    sendMessage,
    selectedConversationId,
    setSelectedConversationId
  };
};
