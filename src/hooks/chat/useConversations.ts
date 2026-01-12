
import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Conversation } from './types';

export const useConversations = (isAdmin: boolean) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAdmin) {
      console.log('Não é admin, pulando busca de conversas');
      setLoading(false);
      return;
    }

    console.log('Admin: Configurando listener de conversas');
    const conversationsQuery = query(
      collection(db, 'conversations'),
      orderBy('lastMessageTime', 'desc')
    );

    const unsubscribe = onSnapshot(conversationsQuery, (snapshot) => {
      console.log('Admin: Snapshot de conversas recebido:', snapshot.size);
      const convs: Conversation[] = [];
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        console.log('Admin: Conversa:', doc.id, data);
        convs.push({ 
          id: doc.id, 
          ...data 
        } as Conversation);
      });
      
      setConversations(convs);
      console.log('Admin: Total de conversas carregadas:', convs.length);
      
      // Se não há conversa selecionada e há conversas disponíveis, selecione a primeira
      if (!selectedConversationId && convs.length > 0) {
        console.log('Admin: Auto-selecionando primeira conversa:', convs[0].id);
        setSelectedConversationId(convs[0].id);
      }
      
      setLoading(false);
    }, (error) => {
      console.error('Admin: Erro ao buscar conversas:', error);
      setLoading(false);
    });

    return () => {
      console.log('Admin: Limpando listener de conversas');
      unsubscribe();
    };
  }, [isAdmin, selectedConversationId]);

  return {
    conversations,
    selectedConversationId,
    setSelectedConversationId,
    loading
  };
};
