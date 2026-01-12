
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageCircle, X, Minimize2, Maximize2 } from 'lucide-react';
import { useSimpleAuth } from '@/contexts/SimpleAuthContext';
import { useChat } from '@/hooks/useChat';
import ChatComponent from './ChatComponent';

const FloatingChat = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  const { userInfo } = useSimpleAuth();

  // Hook para monitorar mensagens não lidas
  const { 
    messages, 
    loading 
  } = useChat(
    userInfo?.id || '', 
    userInfo?.email?.split('@')[0] || '', 
    userInfo?.email || '', 
    false
  );

  useEffect(() => {
    if (!userInfo || loading || isOpen) return;

    // Verificar se há mensagens do admin que o usuário não viu
    const adminMessages = messages.filter(msg => msg.senderType === 'admin');
    const lastAdminMessage = adminMessages[adminMessages.length - 1];
    
    if (lastAdminMessage) {
      // Verificar se o usuário já viu esta mensagem
      const lastSeenMessageId = localStorage.getItem(`lastSeenMessage_${userInfo.id}`);
      if (lastSeenMessageId !== lastAdminMessage.id) {
        setHasUnreadMessages(true);
      }
    }
  }, [messages, userInfo, loading, isOpen]);

  // Marcar mensagens como lidas quando o chat é aberto
  useEffect(() => {
    if (isOpen && hasUnreadMessages && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage && userInfo) {
        localStorage.setItem(`lastSeenMessage_${userInfo.id}`, lastMessage.id);
        setHasUnreadMessages(false);
      }
    }
  }, [isOpen, hasUnreadMessages, messages, userInfo]);

  if (!userInfo) {
    return null;
  }

  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <div className="relative">
          <Button
            onClick={() => setIsOpen(true)}
            className="modern-button bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-full p-4 shadow-soft hover-lift modern-pulse"
            title="Chat ao Vivo"
          >
            <MessageCircle className="h-6 w-6" />
          </Button>
          
          {/* Indicador de mensagem não lida - estilo WhatsApp */}
          {hasUnreadMessages && (
            <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center animate-pulse">
              <span className="text-white text-xs font-bold">!</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 modern-animate-in">
      {/* Botões de controle fora do chat */}
      <div className="absolute -top-12 right-0 flex items-center space-x-2 z-50">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsMinimized(!isMinimized)}
          className="p-2 h-8 w-8 rounded-full modern-button text-muted-foreground hover:text-foreground hover:bg-accent bg-card/90 backdrop-blur-sm"
          title={isMinimized ? "Maximizar" : "Minimizar"}
        >
          {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsOpen(false)}
          className="p-2 h-8 w-8 rounded-full modern-button bg-red-600 hover:bg-red-700 text-white"
          title="Fechar"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <Card className={`modern-card bg-card/95 backdrop-blur-xl border-border transition-all duration-300 ${
        isMinimized ? 'w-80 h-16' : 'w-96 h-[500px]'
      }`}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-2 px-3 border-b border-border min-h-[60px]">
          <div className="flex items-center space-x-2 flex-1 min-w-0">
            <div className="w-3 h-3 bg-green-500 rounded-full modern-pulse flex-shrink-0"></div>
            <CardTitle className="text-card-foreground text-sm truncate">Suporte Profissional</CardTitle>
          </div>
        </CardHeader>
        
        {!isMinimized && (
          <CardContent className="p-0">
            <ChatComponent
              userId={userInfo.id}
              userName={userInfo.email.split('@')[0]}
              userEmail={userInfo.email}
              isAdmin={false}
            />
          </CardContent>
        )}
      </Card>
    </div>
  );
};

export default FloatingChat;
