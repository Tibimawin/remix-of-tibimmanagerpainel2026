
import React from 'react';
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from "@/components/ui/accordion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  HelpCircle, 
  PlayCircle, 
  Download, 
  Key, 
  Smartphone, 
  CreditCard,
  MessageCircle,
  ExternalLink
} from "lucide-react";

const FAQ_ITEMS = [
  {
    id: 'intro',
    question: 'Como começar a usar o painel?',
    answer: 'Para começar, você deve configurar suas credenciais do Baserow nas Configurações. Após isso, você poderá importar conteúdos e gerenciar seus episódios. Certifique-se de que a API Key e o ID da Tabela estão corretos no seu painel admin.',
    icon: HelpCircle
  },
  {
    id: 'player',
    question: 'Como configurar o Player no meu aplicativo?',
    answer: 'Na seção "Minha API", você encontrará os links de integração. Copie o link M3U ou JSON e cole nas configurações do seu player favorito (VLC, IPTV Smarters, etc). Se estiver usando um player mobile, recomendamos baixar o link diretamente para evitar problemas de carregamento.',
    icon: PlayCircle
  },
  {
    id: 'import',
    question: 'Como funciona a Importação Automática?',
    answer: 'A importação automática busca novos episódios nas fontes configuradas a cada hora. O sistema verifica se o episódio já existe usando o link ou o número da temporada/episódio para evitar duplicatas. Você pode acompanhar o sucesso das importações em tempo real no dashboard.',
    icon: Download
  },
  {
    id: 'security',
    question: 'Esqueci minha senha ou quero mudar o PIN',
    answer: 'Você pode alterar sua senha na aba "Segurança" do seu perfil. O PIN do aplicativo, usado para bloquear o acesso a conteúdos específicos, pode ser redefinido na aba "Dispositivos". Lembre-se que o PIN deve ser numérico.',
    icon: Key
  },
  {
    id: 'devices',
    question: 'Quantos dispositivos posso conectar?',
    answer: 'O limite padrão depende do seu plano contratado (geralmente 3 dispositivos ativos simultaneamente). Se você atingir o limite, o novo dispositivo não conseguirá carregar a lista. Você pode remover conexões antigas na aba "Dispositivos" para liberar espaço.',
    icon: Smartphone
  }
];

export const UserFAQ = () => {
  return (
    <div className="space-y-6">
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-primary" />
            Central de Ajuda e Tutoriais
          </CardTitle>
          <CardDescription>
            Encontre respostas rápidas e aprenda a usar todas as ferramentas da plataforma
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {FAQ_ITEMS.map((item) => (
              <AccordionItem key={item.id} value={item.id} className="border-border/40">
                <AccordionTrigger className="hover:no-underline py-4">
                  <div className="flex items-center gap-3 text-left">
                    <div className="p-2 bg-secondary rounded-lg">
                      <item.icon className="h-4 w-4 text-primary" />
                    </div>
                    <span className="font-medium">{item.question}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-4 px-2">
                  <div className="space-y-4">
                    <p className="text-muted-foreground leading-relaxed">
                      {item.answer}
                    </p>
                    

                    <div className="flex justify-end">
                      <a 
                        href="/suporte-ao-vivo" 
                        className="text-xs flex items-center gap-1 text-primary hover:underline"
                      >
                        Ainda com dúvidas? Fale com o suporte
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="hover:border-primary/30 transition-colors cursor-pointer" onClick={() => window.location.href='/suporte-ao-vivo'}>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
              <MessageCircle className="h-6 w-6 text-green-500" />
            </div>
            <div>
              <h4 className="font-bold">Suporte via WhatsApp</h4>
              <p className="text-sm text-muted-foreground">Atendimento humano em tempo real</p>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/30 transition-colors cursor-pointer" onClick={() => window.location.href='/perfil?tab=payments'}>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center">
              <CreditCard className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <h4 className="font-bold">Central de Pagamentos</h4>
              <p className="text-sm text-muted-foreground">Renovação rápida e histórico</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
