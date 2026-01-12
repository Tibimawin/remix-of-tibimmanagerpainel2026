import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { AlertTriangle, Clock, User, CalendarClock } from 'lucide-react';
import { useMaintenanceMode } from '@/hooks/useMaintenanceMode';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { toast } from 'sonner';

export const AdminMaintenanceControl: React.FC = () => {
  const { maintenanceState, loading, isMaintenanceActive, activateMaintenance, deactivateMaintenance } = useMaintenanceMode();
  const { adminUser } = useAdminAuth();
  const [message, setMessage] = useState('');
  const [estimatedEnd, setEstimatedEnd] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleToggleMaintenance = async () => {
    if (!adminUser?.email) {
      toast.error('Admin não identificado');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isMaintenanceActive) {
        await deactivateMaintenance(adminUser.email);
      } else {
        if (!message.trim()) {
          toast.error('Mensagem de manutenção é obrigatória');
          return;
        }
        await activateMaintenance(message, estimatedEnd, adminUser.email);
      }
      
      // Limpar campos após ativar
      if (!isMaintenanceActive) {
        setMessage('');
        setEstimatedEnd('');
      }
    } catch (error) {
      console.error('Erro ao alterar modo de manutenção:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Preencher campos com dados atuais quando está ativo
  React.useEffect(() => {
    if (maintenanceState && isMaintenanceActive) {
      setMessage(maintenanceState.message || '');
      setEstimatedEnd(maintenanceState.estimatedEnd || '');
    }
  }, [maintenanceState, isMaintenanceActive]);

  if (loading) {
    return (
      <Card className="modern-card">
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Atual */}
      <Card className="modern-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Status do Sistema
          </CardTitle>
          <CardDescription>
            Controle do modo de manutenção do sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${isMaintenanceActive ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`}></div>
              <span className="font-medium">
                {isMaintenanceActive ? 'Sistema em Manutenção' : 'Sistema Operacional'}
              </span>
              <Badge variant={isMaintenanceActive ? 'destructive' : 'default'}>
                {isMaintenanceActive ? 'MANUTENÇÃO' : 'ONLINE'}
              </Badge>
            </div>
            
            <Switch
              checked={isMaintenanceActive}
              onCheckedChange={handleToggleMaintenance}
              disabled={isSubmitting}
            />
          </div>

          {/* Informações quando ativo */}
          {isMaintenanceActive && maintenanceState && (
            <div className="mt-6 p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg space-y-3">
              <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
                <AlertTriangle className="h-4 w-4" />
                <span className="font-medium">Modo de Manutenção Ativo</span>
              </div>
              
              <div className="space-y-2 text-sm">
                <p><strong>Mensagem:</strong> {maintenanceState.message}</p>
                {maintenanceState.estimatedEnd && (
                  <p><strong>Previsão de término:</strong> {new Date(maintenanceState.estimatedEnd).toLocaleString('pt-BR')}</p>
                )}
                {maintenanceState.startTime && (
                  <p><strong>Iniciado em:</strong> {new Date(maintenanceState.startTime).toLocaleString('pt-BR')}</p>
                )}
                {maintenanceState.lastUpdatedBy && (
                  <p><strong>Alterado por:</strong> {maintenanceState.lastUpdatedBy}</p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Controles de Configuração */}
      <Card className="modern-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-blue-500" />
            Configurar Manutenção
          </CardTitle>
          <CardDescription>
            Configure os detalhes do período de manutenção
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="message">Mensagem para os usuários</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ex: Sistema em manutenção para melhorias. Voltaremos em breve."
              className="min-h-20"
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="estimatedEnd">Previsão de término (opcional)</Label>
            <Input
              id="estimatedEnd"
              type="datetime-local"
              value={estimatedEnd}
              onChange={(e) => setEstimatedEnd(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <Button
            onClick={handleToggleMaintenance}
            disabled={isSubmitting || (!isMaintenanceActive && !message.trim())}
            className={`w-full ${isMaintenanceActive ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
          >
            {isSubmitting ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            ) : isMaintenanceActive ? (
              <>Desativar Manutenção</>
            ) : (
              <>Ativar Manutenção</>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Histórico */}
      {maintenanceState?.lastUpdated && (
        <Card className="modern-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <User className="h-5 w-5 text-purple-500" />
              Última Alteração
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span>{maintenanceState.lastUpdatedBy}</span>
              </div>
              <div className="flex items-center gap-2">
                <CalendarClock className="h-4 w-4" />
                <span>{new Date(maintenanceState.lastUpdated).toLocaleString('pt-BR')}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};