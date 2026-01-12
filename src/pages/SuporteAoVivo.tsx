
import React, { useEffect } from 'react';
import { useSimpleAuth } from '@/contexts/SimpleAuthContext';
import ChatComponent from '@/components/ChatComponent';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageCircle } from 'lucide-react';
import { toast } from 'sonner';

const SuporteAoVivo = () => {
  const { userInfo } = useSimpleAuth();

  useEffect(() => {
    // Verificar se há uma mensagem de interesse pendente
    const pendingMessage = localStorage.getItem('pendingChatMessage');
    const productInterest = localStorage.getItem('productInterest');
    
    if (pendingMessage && productInterest) {
      // Mostrar toast informativo
      const product = JSON.parse(productInterest);
      toast.info(`Chat iniciado sobre: ${product.nome}`, {
        description: 'Sua mensagem será enviada automaticamente'
      });
      
      // A mensagem será enviada pelo ChatComponent quando ele detectar a pendingChatMessage
    }
  }, []);

  if (!userInfo) {
    return <div>Carregando...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold text-white mb-2">Suporte ao Vivo</h1>
          <p className="text-slate-400">
            Entre em contato conosco para obter ajuda em tempo real
          </p>
        </div>
        
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <MessageCircle className="w-5 h-5 mr-2" />
              Central de Atendimento
            </CardTitle>
            <CardDescription className="text-slate-400">
              Nossa equipe está pronta para ajudar você com qualquer dúvida
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChatComponent
              userId={userInfo.id}
              userName={userInfo.email.split('@')[0]}
              userEmail={userInfo.email}
              isAdmin={false}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SuporteAoVivo;
