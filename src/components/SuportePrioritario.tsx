
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Crown, MessageCircle, Phone, Mail, Send, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { useSuportePrioritario } from '@/hooks/useSuportePrioritario';

interface SuportePrioritarioProps {
  isVisible?: boolean;
}

export const SuportePrioritario: React.FC<SuportePrioritarioProps> = ({ isVisible = false }) => {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [assunto, setAssunto] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { enviarMensagem, configuracoes } = useSuportePrioritario();

  const handleEnviarMensagem = async () => {
    if (!nome.trim() || !email.trim() || !assunto.trim() || !mensagem.trim()) {
      toast.error('Por favor, preencha todos os campos obrigatórios');
      return;
    }

    // Validação básica de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error('Por favor, insira um email válido');
      return;
    }

    setIsLoading(true);
    
    try {
      await enviarMensagem({
        nome,
        email,
        assunto,
        mensagem
      });
      
      toast.success('Mensagem enviada com sucesso! Nossa equipe responderá em até 30 minutos.');
      
      // Limpar campos
      setNome('');
      setEmail('');
      setAssunto('');
      setMensagem('');
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      toast.error('Erro ao enviar mensagem. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
          <Crown className="h-5 w-5" />
          Suporte Prioritário
          <Badge className="bg-amber-600 text-white">PREMIUM</Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="text-center p-3 bg-amber-100 dark:bg-amber-800/30 rounded-lg">
            <MessageCircle className="h-6 w-6 text-amber-600 mx-auto mb-1" />
            <h4 className="font-medium text-amber-800 dark:text-amber-200 text-sm">Chat Direto</h4>
            <p className="text-xs text-amber-700 dark:text-amber-300">Resposta em até 5 min</p>
          </div>
          
          <div className="text-center p-3 bg-amber-100 dark:bg-amber-800/30 rounded-lg">
            <Phone className="h-6 w-6 text-amber-600 mx-auto mb-1" />
            <h4 className="font-medium text-amber-800 dark:text-amber-200 text-sm">Telefone</h4>
            <p className="text-xs text-amber-700 dark:text-amber-300">Linha direta</p>
          </div>
          
          <div className="text-center p-3 bg-amber-100 dark:bg-amber-800/30 rounded-lg">
            <Clock className="h-6 w-6 text-amber-600 mx-auto mb-1" />
            <h4 className="font-medium text-amber-800 dark:text-amber-200 text-sm">24/7</h4>
            <p className="text-xs text-amber-700 dark:text-amber-300">Suporte contínuo</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="nome" className="text-amber-800 dark:text-amber-200 text-sm">Nome *</Label>
              <Input
                id="nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Seu nome completo"
                className="border-amber-300 focus:border-amber-500 h-9"
              />
            </div>
            
            <div>
              <Label htmlFor="email" className="text-amber-800 dark:text-amber-200 text-sm">Email *</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="border-amber-300 focus:border-amber-500 h-9"
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="assunto" className="text-amber-800 dark:text-amber-200 text-sm">Assunto *</Label>
            <Input
              id="assunto"
              value={assunto}
              onChange={(e) => setAssunto(e.target.value)}
              placeholder="Descreva brevemente o problema"
              className="border-amber-300 focus:border-amber-500 h-9"
            />
          </div>
          
          <div>
            <Label htmlFor="mensagem" className="text-amber-800 dark:text-amber-200 text-sm">Mensagem *</Label>
            <Textarea
              id="mensagem"
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              placeholder="Descreva detalhadamente sua dúvida ou problema..."
              rows={3}
              className="border-amber-300 focus:border-amber-500 resize-none"
            />
          </div>
          
          <Button 
            onClick={handleEnviarMensagem}
            disabled={isLoading}
            className="w-full bg-amber-600 hover:bg-amber-700 text-white h-10"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Enviando...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Enviar Mensagem Prioritária
              </>
            )}
          </Button>
        </div>

        <div className="bg-amber-100 dark:bg-amber-800/30 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <Mail className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-amber-800 dark:text-amber-200">
              <p className="font-medium mb-1">Contato direto:</p>
              <p>Email: {configuracoes.emailSupporte}</p>
              <p>Telefone: {configuracoes.telefone}</p>
              <p>WhatsApp: {configuracoes.whatsapp}</p>
              <p>Horário: {configuracoes.horarioAtendimento}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
