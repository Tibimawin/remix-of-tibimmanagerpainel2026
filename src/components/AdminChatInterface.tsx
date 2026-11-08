import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { 
  MessageCircle, 
  Send, 
  Search, 
  Filter, 
  User, 
  HeadphonesIcon, 
  Clock, 
  CheckCircle, 
  Shield, 
  UserCircle,
  MoreVertical,
  Phone,
  Video
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useChat } from '@/hooks/useChat';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';

interface AdminChatInterfaceProps {
  userId: string;
  userName: string;
  userEmail: string;
}

const AdminChatInterface: React.FC<AdminChatInterfaceProps> = ({ 
  userId, 
  userName, 
  userEmail 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  
  // Usar hook real do chat
  const {
    messages,
    conversations,
    loading,
    sendMessage,
    selectedConversationId,
    setSelectedConversationId
  } = useChat(userId, userName, userEmail, true); // isAdmin = true

  const [messageText, setMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll automático para novas mensagens
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Marcar conversa como lida quando selecionada
  useEffect(() => {
    if (selectedConversationId) {
      markConversationAsRead(selectedConversationId);
    }
  }, [selectedConversationId]);

  const markConversationAsRead = async (conversationId: string) => {
    try {
      const conversationRef = doc(db, 'conversations', conversationId);
      await updateDoc(conversationRef, {
        unreadCount: 0
      });
      console.log('Conversa marcada como lida:', conversationId);
    } catch (error) {
      console.error('Erro ao marcar conversa como lida:', error);
    }
  };

  const filteredConversations = conversations.filter(conv => {
    const matchesSearch = conv.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         conv.userEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         conv.lastMessage?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterStatus === 'all' || 
                         (filterStatus === 'unread' && (conv.unreadCount || 0) > 0) ||
                         (filterStatus === 'active' && conv.status === 'active') ||
                         (filterStatus === 'closed' && conv.status === 'closed');
    
    return matchesSearch && matchesFilter;
  });

  const handleSendMessage = async () => {
    if (!messageText.trim() || isSending) return;

    setIsSending(true);
    try {
      await sendMessage(messageText);
      setMessageText('');
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
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
      console.error('Erro ao formatar timestamp:', error);
      return '';
    }
  };

  const formatMessageTime = (timestamp: any) => {
    if (!timestamp) return '';
    
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return format(date, 'HH:mm', { locale: ptBR });
    } catch (error) {
      return '';
    }
  };

  const selectedConversation = conversations.find(conv => conv.id === selectedConversationId);

  if (loading) {
    return (
      <div className="h-[700px] flex items-center justify-center bg-background rounded-lg border border-border">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando conversas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[700px] flex bg-background rounded-lg overflow-hidden border border-border">
      {/* Sidebar - Lista de Conversas */}
      <div className="w-80 bg-card border-r border-border flex flex-col">
        {/* Header da Sidebar */}
        <div className="p-4 bg-gradient-to-r from-primary/10 to-primary/5 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-foreground flex items-center">
              <MessageCircle className="w-5 h-5 mr-2" />
              Conversas
            </h2>
            <Badge variant="secondary" className="bg-primary/20 text-primary">
              {filteredConversations.length} ativas
            </Badge>
          </div>
          
          {/* Busca */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar conversas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-background/50 border-border/50"
            />
          </div>
          
          {/* Filtros */}
          <div className="flex gap-2 flex-wrap">
            {[
              { key: 'all', label: 'Todas' },
              { key: 'unread', label: 'Não lidas' },
              { key: 'active', label: 'Ativas' },
              { key: 'closed', label: 'Fechadas' }
            ].map(filter => (
              <Button
                key={filter.key}
                variant={filterStatus === filter.key ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterStatus(filter.key)}
                className="text-xs h-7"
              >
                {filter.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Lista de Conversas */}
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {filteredConversations.length === 0 && !loading && (
              <div className="text-center py-8">
                <MessageCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-muted-foreground text-sm">Nenhuma conversa encontrada</p>
              </div>
            )}
            
            {filteredConversations.map((conversation) => {
              const isSelected = selectedConversationId === conversation.id;
              const hasUnread = (conversation.unreadCount || 0) > 0;
              
              return (
                <div
                  key={conversation.id}
                  onClick={() => setSelectedConversationId(conversation.id)}
                  className={`p-3 rounded-lg cursor-pointer transition-all duration-200 relative group ${
                    isSelected 
                      ? 'bg-primary/10 border border-primary/30' 
                      : 'hover:bg-accent/50 border border-transparent hover:border-border'
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <div className="relative">
                      <Avatar className="w-10 h-10">
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white text-sm font-medium">
                          {conversation.userName?.split(' ').map(n => n[0]).join('').substring(0, 2) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      {conversation.status === 'active' && (
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-card" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className={`font-medium truncate ${hasUnread ? 'font-bold text-foreground' : 'text-foreground'}`}>
                          {conversation.userName || 'Usuário'}
                        </h3>
                        <div className="flex items-center space-x-1">
                          <span className="text-xs text-muted-foreground">
                            {formatLastMessageTime(conversation.lastMessageTime)}
                          </span>
                          {hasUnread && (
                            <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                              <span className="text-xs text-primary-foreground font-bold">
                                {(conversation.unreadCount || 0) > 9 ? '9+' : conversation.unreadCount}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <p className="text-xs text-muted-foreground mb-1 truncate">
                        {conversation.userEmail || 'email@exemplo.com'}
                      </p>
                      
                      <p className={`text-sm truncate ${hasUnread ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
                        {conversation.lastMessage || 'Nenhuma mensagem'}
                      </p>
                      
                      <div className="flex items-center justify-between mt-2">
                        <Badge 
                          variant={conversation.status === 'active' ? 'default' : 'secondary'}
                          className="text-xs h-5"
                        >
                          {conversation.status === 'active' ? 'Ativo' : 'Fechado'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </div>

      {/* Área de Chat Principal */}
      <div className="flex-1 flex flex-col bg-background">
        {selectedConversation ? (
          <>
            {/* Header do Chat */}
            <div className="p-4 bg-card border-b border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Avatar className="w-10 h-10">
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                      {selectedConversation.userName?.split(' ').map(n => n[0]).join('').substring(0, 2) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold text-foreground">{selectedConversation.userName || 'Usuário'}</h3>
                    <p className="text-sm text-muted-foreground flex items-center">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-1" />
                      Online • {selectedConversation.userEmail || 'email@exemplo.com'}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                    <Phone className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                    <Video className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Área de Mensagens */}
            <ScrollArea className="flex-1 bg-gradient-to-b from-background to-muted/20">
              <div className="p-4 space-y-4">
                {messages.length === 0 && (
                  <div className="text-center py-8">
                    <MessageCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                    <p className="text-muted-foreground">Nenhuma mensagem ainda</p>
                  </div>
                )}
                
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.senderType === 'admin' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        message.senderType === 'admin'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-foreground'
                      }`}
                    >
                      <p className="text-sm">{message.text}</p>
                      <p className={`text-xs mt-1 ${
                        message.senderType === 'admin' 
                          ? 'text-primary-foreground/70' 
                          : 'text-muted-foreground'
                      }`}>
                        {formatMessageTime(message.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Campo de Envio */}
            <div className="p-4 bg-card border-t border-border">
              <div className="flex space-x-2">
                <Input
                  placeholder="Digite sua mensagem..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="flex-1"
                  disabled={isSending}
                />
                <Button 
                  onClick={handleSendMessage}
                  disabled={!messageText.trim() || isSending}
                  size="sm"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-muted/20">
            <div className="text-center">
              <MessageCircle className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="text-lg font-semibold text-foreground mb-2">Nenhuma conversa selecionada</h3>
              <p className="text-muted-foreground">
                Selecione uma conversa da lista à esquerda para começar o atendimento
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminChatInterface;
