
import React from 'react';
import AdminChatInterface from './AdminChatInterface';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageCircle, HeadphonesIcon, Users, Clock } from 'lucide-react';

const AdminChat: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header com estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-300">
              Conversas Ativas
            </CardTitle>
            <MessageCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-800 dark:text-blue-200">12</div>
            <p className="text-xs text-blue-600 dark:text-blue-400">Em andamento</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-700 dark:text-green-300">
              Atendimentos Hoje
            </CardTitle>
            <HeadphonesIcon className="h-4 w-4 text-green-600 dark:text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-800 dark:text-green-200">28</div>
            <p className="text-xs text-green-600 dark:text-green-400">Finalizados</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border-orange-200 dark:border-orange-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-orange-700 dark:text-orange-300">
              Tempo Médio
            </CardTitle>
            <Clock className="h-4 w-4 text-orange-600 dark:text-orange-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-800 dark:text-orange-200">3.2min</div>
            <p className="text-xs text-orange-600 dark:text-orange-400">Resposta</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-700 dark:text-purple-300">
              Satisfação
            </CardTitle>
            <Users className="h-4 w-4 text-purple-600 dark:text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-800 dark:text-purple-200">94%</div>
            <p className="text-xs text-purple-600 dark:text-purple-400">Avaliações</p>
          </CardContent>
        </Card>
      </div>

      {/* Interface Principal do Chat */}
      <Card className="bg-background border-border shadow-lg">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-foreground flex items-center text-xl">
                <MessageCircle className="w-6 h-6 mr-3 text-primary" />
                Suporte ao Vivo - Central de Atendimento
              </CardTitle>
              <CardDescription className="text-muted-foreground mt-1">
                Gerencie todas as conversas de suporte em tempo real com interface moderna e intuitiva
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <AdminChatInterface
            userId="admin"
            userName="Administrador"
            userEmail="admin@admin.com"
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminChat;
