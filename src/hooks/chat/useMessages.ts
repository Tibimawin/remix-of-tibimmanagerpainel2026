
import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { ChatMessage } from './types';

export const useMessages = (conversationId: string | null) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!conversationId) {
      console.log('Sem conversationId, limpando mensagens');
      setMessages([]);
      setLoading(false);
      return;
    }

    console.log('=== CONFIGURANDO LISTENER DE MENSAGENS ===');
    console.log('ConversationId para buscar:', conversationId);
    
    // Removido orderBy para evitar necessidade de índice composto
    const messagesQuery = query(
      collection(db, 'messages'),
      where('conversationId', '==', conversationId)
    );

    console.log('Query configurada para conversationId:', conversationId);

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      console.log('=== SNAPSHOT DE MENSAGENS RECEBIDO ===');
      console.log('Número de documentos no snapshot:', snapshot.size);
      console.log('ConversationId sendo filtrado:', conversationId);
      
      const msgs: ChatMessage[] = [];
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        console.log('Documento encontrado:', {
          id: doc.id,
          conversationId: data.conversationId,
          text: data.text?.substring(0, 50) + '...',
          senderType: data.senderType,
          senderId: data.senderId,
          timestamp: data.timestamp
        });
        
        msgs.push({ 
          id: doc.id, 
          ...data 
        } as ChatMessage);
      });
      
      // Ordenar mensagens por timestamp no lado do cliente
      msgs.sort((a, b) => {
        if (!a.timestamp || !b.timestamp) return 0;
        const aTime = a.timestamp.toDate().getTime();
        const bTime = b.timestamp.toDate().getTime();
        return aTime - bTime;
      });
      
      console.log('=== RESULTADO FINAL DAS MENSAGENS ===');
      console.log('Total de mensagens carregadas:', msgs.length);
      console.log('ConversationId usado na query:', conversationId);
      
      if (msgs.length > 0) {
        console.log('Primeira mensagem:', {
          id: msgs[0].id,
          text: msgs[0].text?.substring(0, 30) + '...',
          senderType: msgs[0].senderType
        });
        console.log('Última mensagem:', {
          id: msgs[msgs.length - 1].id,
          text: msgs[msgs.length - 1].text?.substring(0, 30) + '...',
          senderType: msgs[msgs.length - 1].senderType
        });
      }
      
      setMessages(msgs);
      setLoading(false);
    }, (error) => {
      console.error('=== ERRO AO BUSCAR MENSAGENS ===');
      console.error('ConversationId:', conversationId);
      console.error('Erro:', error);
      setLoading(false);
    });

    return () => {
      console.log('Limpando listener de mensagens para:', conversationId);
      unsubscribe();
    };
  }, [conversationId]);

  return { messages, loading };
};
