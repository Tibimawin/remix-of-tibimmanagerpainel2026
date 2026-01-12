
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Send, User, HeadphonesIcon, Clock, CheckCircle, Shield, Crown, UserCircle } from 'lucide-react';
import { useChat, ChatMessage } from '@/hooks/useChat';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ChatComponentProps {
  userId: string;
  userName: string;
  userEmail: string;
  isAdmin?: boolean;
}

const ChatComponent: React.FC<ChatComponentProps> = ({ 
  userId, 
  userName, 
  userEmail, 
  isAdmin = false 
}) => {
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Usar useRef para controlar se a mensagem pendente já foi processada
  const pendingMessageProcessed = useRef(false);
  
  const { 
    messages, 
    conversations, 
    loading, 
    sendMessage,
    selectedConversationId,
    setSelectedConversationId 
  } = useChat(userId, userName, userEmail, isAdmin);

  console.log('ChatComponent renderizando:', { 
    loading, 
    messagesCount: messages.length, 
    conversationsCount: conversations.length,
    selectedConversationId,
    isAdmin,
    userId,
    sending,
    pendingProcessed: pendingMessageProcessed.current
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Função para processar mensagem pendente
  const processPendingMessage = useCallback(async () => {
    if (pendingMessageProcessed.current) {
      console.log('Mensagem pendente já foi processada, pulando...');
      return;
    }

    const pendingMessage = localStorage.getItem('pendingChatMessage');
    const productInterest = localStorage.getItem('productInterest');
    
    console.log('=== VERIFICANDO MENSAGEM PENDENTE ===');
    console.log('Pending message:', pendingMessage);
    console.log('Product interest:', productInterest);
    console.log('Is admin:', isAdmin);
    console.log('Loading:', loading);
    console.log('Pending processed ref:', pendingMessageProcessed.current);
    
    if (pendingMessage && !isAdmin && !loading) {
      console.log('Processando mensagem pendente (ÚNICA VEZ):', pendingMessage);
      
      // Marcar como processado IMEDIATAMENTE
      pendingMessageProcessed.current = true;
      
      try {
        setSending(true);
        console.log('=== ENVIANDO MENSAGEM AUTOMÁTICA ===');
        console.log('Texto da mensagem:', pendingMessage);
        console.log('UserId:', userId);
        console.log('UserName:', userName);
        console.log('UserEmail:', userEmail);
        
        await sendMessage(pendingMessage);
        
        // Limpar dados do localStorage após envio
        localStorage.removeItem('pendingChatMessage');
        localStorage.removeItem('productInterest');
        
        console.log('=== MENSAGEM AUTOMÁTICA ENVIADA COM SUCESSO ===');
        console.log('LocalStorage limpo');
      } catch (error) {
        console.error('=== ERRO AO ENVIAR MENSAGEM AUTOMÁTICA ===');
        console.error('Erro:', error);
        // Em caso de erro, permitir nova tentativa
        pendingMessageProcessed.current = false;
      } finally {
        setSending(false);
      }
    } else {
      console.log('Condições não atendidas para processar mensagem pendente:', {
        isAdmin,
        loading,
        hasPendingMessage: !!pendingMessage,
        pendingProcessed: pendingMessageProcessed.current
      });
      
      if (!pendingMessage) {
        // Se não há mensagem pendente, marcar como processado
        pendingMessageProcessed.current = true;
      }
    }
  }, [isAdmin, loading, sendMessage, userId, userName, userEmail]);

  // Verificar e enviar mensagem pendente quando o componente carregar
  useEffect(() => {
    if (!loading) {
      // Pequeno delay para garantir que tudo está inicializado
      const timeoutId = setTimeout(() => {
        processPendingMessage();
      }, 500);

      return () => clearTimeout(timeoutId);
    }
  }, [loading, processPendingMessage]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || sending) return;

    console.log('=== COMPONENTE: Enviando mensagem manual ===');
    console.log('Texto:', messageText);

    setSending(true);
    
    try {
      await sendMessage(messageText);
      setMessageText('');
      console.log('=== COMPONENTE: Mensagem manual enviada com sucesso ===');
    } catch (error) {
      console.error('=== COMPONENTE: Erro ao enviar mensagem manual ===');
      console.error('Erro:', error);
    } finally {
      setSending(false);
    }
  };

  const formatMessageTime = (timestamp: any) => {
    if (!timestamp) return '';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return format(date, 'HH:mm', { locale: ptBR });
    } catch (error) {
      console.error('Erro ao formatar data:', error);
      return '';
    }
  };

  const formatLastMessageTime = (timestamp: any) => {
    if (!timestamp) return '';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      const now = new Date();
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
      
      if (diffInMinutes < 1) return 'Agora';
      if (diffInMinutes < 60) return `${diffInMinutes}min`;
      if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`;
      return format(date, 'dd/MM', { locale: ptBR });
    } catch (error) {
      console.error('Erro ao formatar data:', error);
      return '';
    }
  };

  // Função para renderizar avatar profissional
  const renderUserAvatar = (senderType: 'user' | 'admin', size: 'sm' | 'md' = 'md') => {
    const sizeClasses = size === 'sm' ? 'w-7 h-7' : 'w-10 h-10';
    const iconSize = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';
    
    if (senderType === 'admin') {
      return (
        <div className={`${sizeClasses} rounded-full bg-gradient-to-br from-red-600 to-red-700 flex items-center justify-center text-white shadow-lg border-2 border-red-500/30`}>
          <Shield className={`${iconSize} fill-white`} />
        </div>
      );
    } else {
      return (
        <div className={`${sizeClasses} rounded-full bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center text-white shadow-lg border-2 border-blue-500/30`}>
          <UserCircle className={`${iconSize} fill-white`} />
        </div>
      );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando sistema de chat...</p>
          <p className="text-muted-foreground/70 text-sm mt-1">Conectando ao servidor...</p>
        </div>
      </div>
    );
  }

  // Layout para Admin - Lista de conversas + Chat
  if (isAdmin) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[700px]">
        {/* Lista de Conversas */}
        <Card className="modern-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-card-foreground flex items-center justify-between">
              <div className="flex items-center">
                <MessageCircle className="w-5 h-5 mr-2" />
                Conversas Ativas
              </div>
              <Badge variant="secondary" className="modern-badge">
                {conversations.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[580px] px-4">
              {conversations.length === 0 ? (
                <div className="text-center text-muted-foreground py-12">
                  <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p className="font-medium">Nenhuma conversa ativa</p>
                  <p className="text-sm mt-2 opacity-75">
                    As conversas dos usuários aparecerão aqui
                  </p>
                </div>
              ) : (
                <div className="space-y-2 pb-4">
                  {conversations.map((conv) => {
                    const isSelected = selectedConversationId === conv.id;
                    const hasUnreadMessages = conv.unreadCount > 0 && conv.lastSenderType === 'user';
                    
                    return (
                      <div
                        key={conv.id}
                        onClick={() => {
                          console.log('Admin: Selecionando conversa:', conv.id);
                          setSelectedConversationId(conv.id);
                        }}
                        className={`p-4 rounded-xl cursor-pointer transition-all hover:scale-[1.02] relative modern-card ${
                          isSelected
                            ? 'bg-primary/10 border-primary/30 shadow-lg'
                            : 'hover:bg-accent'
                        }`}
                      >
                        {hasUnreadMessages && (
                          <div className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-xs font-bold">
                              {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                            </span>
                          </div>
                        )}
                        <div className="flex items-start space-x-3">
                          {renderUserAvatar('user')}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <p className={`font-semibold truncate ${hasUnreadMessages ? 'font-bold' : ''}`}>
                                {conv.userName || 'Usuário'}
                              </p>
                              <span className="text-xs opacity-60 flex items-center">
                                <Clock className="w-3 h-3 mr-1" />
                                {formatLastMessageTime(conv.lastMessageTime)}
                              </span>
                            </div>
                            <p className="text-sm opacity-80 truncate mb-1">
                              {conv.userEmail}
                            </p>
                            <p className={`text-sm opacity-75 truncate ${hasUnreadMessages ? 'font-semibold' : ''}`}>
                              {conv.lastMessage}
                            </p>
                            <div className="flex items-center justify-between mt-2">
                              <Badge 
                                variant={conv.status === 'active' ? 'default' : 'secondary'}
                                className="text-xs"
                              >
                                {conv.status === 'active' ? 'Ativo' : 'Fechado'}
                              </Badge>
                              {hasUnreadMessages && (
                                <Badge variant="destructive" className="text-xs">
                                  Nova mensagem
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Área do Chat */}
        <Card className="lg:col-span-2 modern-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-card-foreground flex items-center justify-between">
              <div className="flex items-center">
                <HeadphonesIcon className="w-5 h-5 mr-2" />
                {selectedConversationId ? (
                  <>
                    Atendimento Profissional
                    <Badge variant="outline" className="ml-2 border-border">
                      {messages.length} mensagens
                    </Badge>
                  </>
                ) : (
                  'Selecione uma conversa'
                )}
              </div>
            </CardTitle>
            {selectedConversationId && (
              <p className="text-muted-foreground text-sm">
                Conversando com {conversations.find(c => c.id === selectedConversationId)?.userName || 'Usuário'}
              </p>
            )}
          </CardHeader>
          <CardContent className="p-0">
            {selectedConversationId ? (
              <div className="flex flex-col h-[580px]">
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-4">
                    {messages.length === 0 ? (
                      <div className="text-center text-muted-foreground py-12">
                        <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-30" />
                        <p className="font-medium">Conversa iniciada</p>
                        <p className="text-sm mt-2 opacity-75">
                          Envie uma mensagem para começar o atendimento
                        </p>
                      </div>
                    ) : (
                      messages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${message.senderType === 'admin' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div className={`flex items-end space-x-3 max-w-[75%] ${
                            message.senderType === 'admin' ? 'flex-row-reverse space-x-reverse' : ''
                          }`}>
                            {renderUserAvatar(message.senderType, 'sm')}
                            <div className={`px-4 py-3 rounded-2xl shadow-soft ${
                              message.senderType === 'admin'
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-card border border-border text-card-foreground'
                            }`}>
                              <p className="text-sm leading-relaxed">{message.text}</p>
                              <div className="flex items-center justify-between mt-2">
                                <p className="text-xs opacity-70">
                                  {formatMessageTime(message.timestamp)}
                                </p>
                                <CheckCircle className="w-3 h-3 opacity-70" />
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>
                
                <div className="p-4 border-t border-border">
                  <form onSubmit={handleSendMessage} className="flex space-x-2">
                    <Input
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      placeholder="Digite sua resposta profissional..."
                      className="modern-input"
                      disabled={sending}
                    />
                    <Button 
                      type="submit" 
                      size="sm" 
                      className="modern-button min-w-[44px]"
                      disabled={sending || !messageText.trim()}
                    >
                      {sending ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </Button>
                  </form>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[580px] text-muted-foreground">
                <div className="text-center">
                  <MessageCircle className="w-20 h-20 mx-auto mb-6 opacity-20" />
                  <p className="text-lg font-medium mb-2">Selecione uma conversa</p>
                  <p className="text-sm opacity-75">
                    Escolha uma conversa da lista à esquerda para começar o atendimento
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Layout para Usuário - Chat compacto e elegante
  return (
    <div className="flex flex-col h-[500px]">
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium mb-1">Olá! Como posso ajudar?</p>
              <p className="text-sm opacity-75">
                {localStorage.getItem('pendingChatMessage') && !pendingMessageProcessed.current ? 
                  'Enviando sua mensagem sobre o produto...' : 
                  'Envie sua mensagem e nossa equipe responderá em breve'
                }
              </p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.senderType === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex items-end space-x-3 max-w-[85%] ${
                  message.senderType === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                }`}>
                  {renderUserAvatar(message.senderType, 'sm')}
                  <div className={`px-4 py-3 rounded-2xl shadow-soft ${
                    message.senderType === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-card border border-border text-card-foreground'
                  }`}>
                    <p className="text-sm leading-relaxed">{message.text}</p>
                    <p className="text-xs opacity-70 mt-2">
                      {formatMessageTime(message.timestamp)}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>
      
      <div className="p-4 border-t border-border">
        <form onSubmit={handleSendMessage} className="flex space-x-2">
          <Input
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            placeholder="Digite sua mensagem..."
            className="modern-input"
            disabled={sending}
          />
          <Button 
            type="submit" 
            size="sm" 
            className="modern-button min-w-[44px]"
            disabled={sending || !messageText.trim()}
          >
            {sending ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </form>
        <p className="text-muted-foreground text-xs mt-2">
          {sending ? 
            'Enviando mensagem...' : 
            'Pressione Enter para enviar • Nossa equipe responde rapidamente'
          }
        </p>
      </div>
    </div>
  );
};

export default ChatComponent;
