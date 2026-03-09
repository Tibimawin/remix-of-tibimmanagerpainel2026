import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Trash2, AlertTriangle, Loader2, CheckCircle, XCircle, DatabaseZap, Clock, Calendar, Bell, Trash, Settings2, StopCircle, HelpCircle, ExternalLink, Key, Hash, Link2 } from 'lucide-react';
import { toast } from 'sonner';
import { PermissionGate } from '@/components/PermissionGate';
import { useScheduledCleanups, type ScheduledCleanup } from '@/hooks/useScheduledCleanups';
import { useCleanup } from '@/contexts/CleanupContext';
import { useSimpleAuth } from '@/contexts/SimpleAuthContext';

interface ScheduleFormData {
  name: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  time: string;
  tableId: string;
  apiToken: string;
  baseUrl: string;
  notifications: boolean;
  email?: string;
}

const LimpezaDados = () => {
  const { userInfo } = useSimpleAuth();
  const userEmail = userInfo?.email || '';
  const { scheduledCleanups, isLoading, createSchedule, deleteSchedule, toggleSchedule } = useScheduledCleanups();
  
  const {
    config,
    setConfig,
    isProcessing,
    progress,
    logs,
    totalRecords,
    processedRecords,
    showConfirmation,
    setShowConfirmation,
    wasInterrupted,
    startCleanup,
    resumeCleanup,
    confirmCleanup,
    cancelCleanup
  } = useCleanup();
  
  // Estados para agendamento automático
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [scheduleForm, setScheduleForm] = useState<ScheduleFormData>({
    name: '',
    frequency: 'daily',
    time: '02:00',
    tableId: '',
    apiToken: '',
    baseUrl: '',
    notifications: true,
    email: userEmail
  });

  // Funções para agendamento automático
  const handleCreateSchedule = async () => {
    if (!scheduleForm.name.trim() || !scheduleForm.tableId.trim() || !scheduleForm.apiToken.trim() || !scheduleForm.baseUrl.trim()) {
      toast.error('Nome, ID da tabela, Token da API e URL Base são obrigatórios');
      return;
    }

    try {
      await createSchedule({
        name: scheduleForm.name,
        frequency: scheduleForm.frequency,
        time: scheduleForm.time,
        tableId: scheduleForm.tableId,
        apiToken: scheduleForm.apiToken,
        baseUrl: scheduleForm.baseUrl,
        isActive: true,
        notifications: scheduleForm.notifications,
        email: scheduleForm.email
      });
      
      // Reset form
      setScheduleForm({
        name: '',
        frequency: 'daily',
        time: '02:00',
        tableId: '',
        apiToken: '',
        baseUrl: '',
        notifications: true,
        email: userEmail
      });
      
      setShowScheduleForm(false);
    } catch (error) {
      console.error('Erro ao criar agendamento:', error);
    }
  };

  const handleToggleSchedule = async (scheduleId: string) => {
    try {
      await toggleSchedule(scheduleId);
    } catch (error) {
      console.error('Erro ao alterar status do agendamento:', error);
    }
  };

  const handleDeleteSchedule = async (scheduleId: string) => {
    try {
      await deleteSchedule(scheduleId);
    } catch (error) {
      console.error('Erro ao remover agendamento:', error);
    }
  };

  const getFrequencyLabel = (frequency: string) => {
    const labels = {
      daily: 'Diário',
      weekly: 'Semanal',
      monthly: 'Mensal'
    };
    return labels[frequency as keyof typeof labels] || frequency;
  };

  // Debug para verificar se o usuário está autenticado
  console.log('Usuario autenticado:', !!userEmail);
  console.log('Email do usuario:', userEmail);

  return (
    <div className="w-full space-y-6 animate-fade-in">
      <div className="w-full space-y-6 animate-fade-in">
        {/* Header da Página */}
        <div className="flex flex-col space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl flex items-center justify-center shadow-lg">
                <DatabaseZap className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">Limpeza de Dados</h1>
                <p className="text-muted-foreground font-medium">
                  Remover todos os registros de uma tabela do Baserow
                </p>
              </div>
            </div>
            
            {/* Botão de Ajuda/FAQ */}
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <HelpCircle className="h-4 w-4" />
                  Ajuda
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <HelpCircle className="h-5 w-5 text-primary" />
                    Central de Ajuda - Limpeza de Dados
                  </DialogTitle>
                  <DialogDescription>
                    Aprenda como configurar corretamente a limpeza de dados no Baserow
                  </DialogDescription>
                </DialogHeader>
                
                <Accordion type="single" collapsible className="w-full">
                  {/* Como obter o Token da API */}
                  <AccordionItem value="token">
                    <AccordionTrigger className="text-left">
                      <div className="flex items-center gap-2">
                        <Key className="h-4 w-4 text-amber-500" />
                        Como obter o Token da API?
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-3 text-sm">
                      <p className="text-muted-foreground">
                        O Token da API permite que a aplicação se conecte ao seu Baserow de forma segura.
                      </p>
                      <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                        <li>Acesse o seu painel do Baserow</li>
                        <li>Clique no seu avatar/perfil no canto superior direito</li>
                        <li>Selecione <strong>"Configurações"</strong> ou <strong>"Settings"</strong></li>
                        <li>No menu lateral, clique em <strong>"API tokens"</strong></li>
                        <li>Clique em <strong>"Criar token"</strong> ou <strong>"Create token"</strong></li>
                        <li>Dê um nome ao token (ex: "Limpeza de Dados")</li>
                        <li>Selecione o <strong>workspace</strong> e a <strong>base de dados</strong></li>
                        <li><strong>IMPORTANTE:</strong> Marque as permissões <strong>"read"</strong>, <strong>"create"</strong>, <strong>"update"</strong> e <strong>"delete"</strong></li>
                        <li>Copie o token gerado e guarde-o em local seguro</li>
                      </ol>
                      <Alert className="mt-3 border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/50">
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                        <AlertDescription className="text-amber-800 dark:text-amber-200 text-xs">
                          <strong>Dica de Segurança:</strong> Nunca partilhe o seu token com terceiros. Se o token for comprometido, elimine-o imediatamente no Baserow.
                        </AlertDescription>
                      </Alert>
                    </AccordionContent>
                  </AccordionItem>

                  {/* Como encontrar o ID da Tabela */}
                  <AccordionItem value="table-id">
                    <AccordionTrigger className="text-left">
                      <div className="flex items-center gap-2">
                        <Hash className="h-4 w-4 text-blue-500" />
                        Como encontrar o ID da Tabela?
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-3 text-sm">
                      <p className="text-muted-foreground">
                        O ID da tabela identifica qual tabela específica será limpa.
                      </p>
                      <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                        <li>Abra o Baserow e navegue até a tabela desejada</li>
                        <li>Olhe para a <strong>barra de endereços</strong> do seu navegador</li>
                        <li>A URL terá um formato parecido com:<br/>
                          <code className="bg-muted px-2 py-1 rounded text-xs">
                            https://baserow.io/database/123/table/<strong>456</strong>
                          </code>
                        </li>
                        <li>O número após <strong>/table/</strong> é o ID da tabela (neste exemplo: <strong>456</strong>)</li>
                      </ol>
                      <div className="flex items-center gap-2 p-3 bg-muted rounded-lg mt-2">
                        <Link2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span className="text-xs text-muted-foreground">
                          Exemplo: <code>...baserow.io/database/XXX/table/<strong className="text-primary">12345</strong></code> → ID = <strong className="text-primary">12345</strong>
                        </span>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {/* Qual URL Base usar */}
                  <AccordionItem value="base-url">
                    <AccordionTrigger className="text-left">
                      <div className="flex items-center gap-2">
                        <ExternalLink className="h-4 w-4 text-green-500" />
                        Qual URL Base devo usar?
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-3 text-sm">
                      <p className="text-muted-foreground">
                        A URL Base depende de onde o seu Baserow está hospedado:
                      </p>
                      <div className="space-y-2">
                        <div className="p-3 bg-muted rounded-lg">
                          <p className="font-medium text-foreground">Baserow Cloud (Oficial)</p>
                          <code className="text-xs text-primary">https://api.baserow.io</code>
                        </div>
                        <div className="p-3 bg-muted rounded-lg">
                          <p className="font-medium text-foreground">Baserow Self-Hosted</p>
                          <code className="text-xs text-primary">https://seu-servidor.com</code>
                          <p className="text-xs text-muted-foreground mt-1">
                            Use a URL do seu próprio servidor onde o Baserow está instalado
                          </p>
                        </div>
                      </div>
                      <Alert className="mt-3 border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/50">
                        <HelpCircle className="h-4 w-4 text-blue-600" />
                        <AlertDescription className="text-blue-800 dark:text-blue-200 text-xs">
                          <strong>Nota:</strong> A URL deve começar com <strong>https://</strong>. URLs com <strong>http://</strong> serão processadas através de um proxy por questões de segurança.
                        </AlertDescription>
                      </Alert>
                    </AccordionContent>
                  </AccordionItem>

                  {/* Erros comuns */}
                  <AccordionItem value="errors">
                    <AccordionTrigger className="text-left">
                      <div className="flex items-center gap-2">
                        <XCircle className="h-4 w-4 text-red-500" />
                        Erros comuns e soluções
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-3 text-sm">
                      <div className="space-y-3">
                        <div className="p-3 border rounded-lg space-y-1">
                          <p className="font-medium text-red-600 dark:text-red-400">Erro 401 - Token inválido</p>
                          <p className="text-xs text-muted-foreground">O token da API está incorreto ou expirou. Gere um novo token no Baserow.</p>
                        </div>
                        <div className="p-3 border rounded-lg space-y-1">
                          <p className="font-medium text-red-600 dark:text-red-400">Erro 403 - Sem permissão</p>
                          <p className="text-xs text-muted-foreground">O token não tem permissão para deletar. Verifique se as permissões "delete" estão ativadas.</p>
                        </div>
                        <div className="p-3 border rounded-lg space-y-1">
                          <p className="font-medium text-red-600 dark:text-red-400">Erro 404 - Tabela não encontrada</p>
                          <p className="text-xs text-muted-foreground">O ID da tabela está incorreto. Verifique a URL do Baserow e copie o número correto.</p>
                        </div>
                        <div className="p-3 border rounded-lg space-y-1">
                          <p className="font-medium text-amber-600 dark:text-amber-400">Erro 429 - Rate limit</p>
                          <p className="text-xs text-muted-foreground">Muitas requisições em pouco tempo. Aguarde alguns segundos e o processo continuará automaticamente.</p>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Aviso de Perigo */}
        <Alert className="border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/50">
          <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
          <AlertDescription className="text-red-800 dark:text-red-200">
            <strong>ATENÇÃO:</strong> Esta ação é irreversível! Todos os registros da tabela selecionada serão permanentemente deletados.
            Certifique-se de fazer um backup dos dados antes de continuar.
          </AlertDescription>
        </Alert>

        {/* Configuração */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <DatabaseZap className="h-5 w-5" />
              <span>Configuração da Limpeza</span>
            </CardTitle>
            <CardDescription>
              Insira as informações necessárias para conectar à tabela do Baserow
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tableId">ID da Tabela</Label>
                <Input
                  id="tableId"
                  placeholder="Ex: 123456"
                  value={config.tableId}
                  onChange={(e) => setConfig(prev => ({ ...prev, tableId: e.target.value }))}
                  disabled={isProcessing}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="apiToken">Token da API</Label>
                <Input
                  id="apiToken"
                  type="password"
                  placeholder="Token de autenticação"
                  value={config.apiToken}
                  onChange={(e) => setConfig(prev => ({ ...prev, apiToken: e.target.value }))}
                  disabled={isProcessing}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="baseUrl">URL Base do Baserow</Label>
                <Input
                  id="baseUrl"
                  placeholder="Ex: https://api.baserow.io"
                  value={config.baseUrl}
                  onChange={(e) => setConfig(prev => ({ ...prev, baseUrl: e.target.value }))}
                  disabled={isProcessing}
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button 
                onClick={cancelCleanup}
                disabled={!isProcessing}
                variant="destructive"
                className="bg-red-800 hover:bg-red-900 text-white"
              >
                <StopCircle className="h-4 w-4 mr-2" />
                Parar Limpeza
              </Button>
              <Button 
                onClick={startCleanup}
                disabled={isProcessing || !config.tableId || !config.apiToken || !config.baseUrl}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Iniciar Limpeza
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Progresso */}
        {(isProcessing || progress > 0) && (
          <Card>
            <CardHeader>
              <CardTitle>Progresso da Limpeza</CardTitle>
              <CardDescription>
                {totalRecords > 0 && (
                  <span>{processedRecords} de {totalRecords} registros processados</span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Progress value={progress} className="w-full h-3" />
                <p className="text-sm text-muted-foreground text-center">
                  {progress}% concluído
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Agendamento Automático */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="h-5 w-5" />
              <span>Agendamento Automático</span>
            </CardTitle>
            <CardDescription>
              Configure limpezas automáticas programadas com notificações
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Botão para criar novo agendamento */}
            <div className="flex justify-between items-center">
              <div>
                <h4 className="font-medium text-foreground">Agendamentos Ativos</h4>
                <p className="text-sm text-muted-foreground">
                  {isLoading ? 'Carregando...' : `${scheduledCleanups.length} agendamento(s) configurado(s)`}
                </p>
              </div>
              <Dialog open={showScheduleForm} onOpenChange={setShowScheduleForm}>
                <DialogTrigger asChild>
                  <Button
                    disabled={isProcessing}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    Novo Agendamento
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px]">
                  <DialogHeader>
                    <DialogTitle>Criar Novo Agendamento</DialogTitle>
                    <DialogDescription>
                      Configure uma limpeza automática programada com suas credenciais
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="schedule-name" className="text-right">
                        Nome
                      </Label>
                      <Input
                        id="schedule-name"
                        value={scheduleForm.name}
                        onChange={(e) => setScheduleForm(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Ex: Limpeza diária produtos"
                        className="col-span-3"
                      />
                    </div>
                    
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="schedule-frequency" className="text-right">
                        Frequência
                      </Label>
                      <Select value={scheduleForm.frequency} onValueChange={(value: any) => setScheduleForm(prev => ({ ...prev, frequency: value }))}>
                        <SelectTrigger className="col-span-3">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Diário</SelectItem>
                          <SelectItem value="weekly">Semanal</SelectItem>
                          <SelectItem value="monthly">Mensal</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="schedule-time" className="text-right">
                        Horário
                      </Label>
                      <Input
                        id="schedule-time"
                        type="time"
                        value={scheduleForm.time}
                        onChange={(e) => setScheduleForm(prev => ({ ...prev, time: e.target.value }))}
                        className="col-span-3"
                      />
                    </div>
                    
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="schedule-table" className="text-right">
                        ID da Tabela
                      </Label>
                      <Input
                        id="schedule-table"
                        value={scheduleForm.tableId}
                        onChange={(e) => setScheduleForm(prev => ({ ...prev, tableId: e.target.value }))}
                        placeholder="Ex: 123456"
                        className="col-span-3"
                      />
                    </div>
                    
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="schedule-token" className="text-right">
                        Token da API
                      </Label>
                      <Input
                        id="schedule-token"
                        type="password"
                        value={scheduleForm.apiToken}
                        onChange={(e) => setScheduleForm(prev => ({ ...prev, apiToken: e.target.value }))}
                        placeholder="Token de autenticação"
                        className="col-span-3"
                      />
                    </div>
                    
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="schedule-url" className="text-right">
                        URL Base
                      </Label>
                      <Input
                        id="schedule-url"
                        value={scheduleForm.baseUrl}
                        onChange={(e) => setScheduleForm(prev => ({ ...prev, baseUrl: e.target.value }))}
                        placeholder="Ex: https://api.baserow.io"
                        className="col-span-3"
                      />
                    </div>
                    
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="schedule-email" className="text-right">
                        Email (opcional)
                      </Label>
                      <Input
                        id="schedule-email"
                        type="email"
                        value={scheduleForm.email}
                        onChange={(e) => setScheduleForm(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="Para notificações"
                        className="col-span-3"
                      />
                    </div>
                    
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="schedule-notifications" className="text-right">
                        Notificações
                      </Label>
                      <div className="col-span-3 flex items-center space-x-2">
                        <Switch
                          id="schedule-notifications"
                          checked={scheduleForm.notifications}
                          onCheckedChange={(checked) => setScheduleForm(prev => ({ ...prev, notifications: checked }))}
                        />
                        <Label htmlFor="schedule-notifications" className="text-sm text-muted-foreground">
                          Receber notificações por email
                        </Label>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setShowScheduleForm(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleCreateSchedule} className="bg-blue-600 hover:bg-blue-700 text-white">
                      Criar Agendamento
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <Separator />

            {/* Lista de agendamentos */}
            {scheduledCleanups.length > 0 ? (
              <div className="space-y-3">
                {scheduledCleanups.map((schedule) => (
                  <div key={schedule.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <h4 className="font-medium text-foreground">{schedule.name}</h4>
                          <Badge variant={schedule.isActive ? "default" : "secondary"}>
                            {schedule.isActive ? "Ativo" : "Inativo"}
                          </Badge>
                          {schedule.notifications && (
                            <Badge variant="outline" className="text-xs">
                              <Bell className="h-3 w-3 mr-1" />
                              Notificações
                            </Badge>
                          )}
                        </div>
                         <div className="mt-2 space-y-1">
                          <p className="text-sm text-muted-foreground">
                            <strong>Frequência:</strong> {getFrequencyLabel(schedule.frequency)} às {schedule.time}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            <strong>Tabela ID:</strong> {schedule.tableId}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            <strong>URL Base:</strong> {schedule.baseUrl}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            <strong>Próxima execução:</strong> {new Date(schedule.nextRun).toLocaleString('pt-BR')}
                          </p>
                          {schedule.lastRun && (
                            <p className="text-sm text-muted-foreground">
                              <strong>Última execução:</strong> {new Date(schedule.lastRun).toLocaleString('pt-BR')}
                            </p>
                          )}
                          {schedule.email && (
                            <p className="text-sm text-muted-foreground">
                              <strong>Email:</strong> {schedule.email}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={schedule.isActive}
                          onCheckedChange={() => handleToggleSchedule(schedule.id)}
                          disabled={isProcessing || isLoading}
                        />
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => handleDeleteSchedule(schedule.id)}
                          disabled={isProcessing || isLoading}
                          className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 border border-dashed rounded-lg">
                <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground font-medium">Nenhum agendamento configurado</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Crie um agendamento para automatizar limpezas de dados
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Formulário de Novo Agendamento */}
        {showScheduleForm && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings2 className="h-5 w-5" />
                <span>Novo Agendamento</span>
              </CardTitle>
              <CardDescription>
                Configure um agendamento automático para limpeza de dados
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="scheduleName">Nome do Agendamento</Label>
                  <Input
                    id="scheduleName"
                    placeholder="Ex: Limpeza Diária Logs"
                    value={scheduleForm.name}
                    onChange={(e) => setScheduleForm(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="scheduleTableId">ID da Tabela</Label>
                  <Input
                    id="scheduleTableId"
                    placeholder="Ex: 123456"
                    value={scheduleForm.tableId}
                    onChange={(e) => setScheduleForm(prev => ({ ...prev, tableId: e.target.value }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="frequency">Frequência</Label>
                  <Select 
                    value={scheduleForm.frequency} 
                    onValueChange={(value: 'daily' | 'weekly' | 'monthly') => 
                      setScheduleForm(prev => ({ ...prev, frequency: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a frequência" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Diário</SelectItem>
                      <SelectItem value="weekly">Semanal</SelectItem>
                      <SelectItem value="monthly">Mensal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="scheduleTime">Horário</Label>
                  <Input
                    id="scheduleTime"
                    type="time"
                    value={scheduleForm.time}
                    onChange={(e) => setScheduleForm(prev => ({ ...prev, time: e.target.value }))}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="notifications"
                  checked={scheduleForm.notifications}
                  onCheckedChange={(checked) => setScheduleForm(prev => ({ ...prev, notifications: checked }))}
                />
                <Label htmlFor="notifications" className="flex items-center space-x-2">
                  <Bell className="h-4 w-4" />
                  <span>Receber notificações por email</span>
                </Label>
              </div>
              
              <div className="flex space-x-3 justify-end">
                <Button 
                  variant="outline" 
                  onClick={() => setShowScheduleForm(false)}
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={handleCreateSchedule}
                  disabled={!scheduleForm.name || !scheduleForm.tableId}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Criar Agendamento
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Log de Atividades */}
        {logs.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Log de Atividades</CardTitle>
              <CardDescription>
                Histórico detalhado do processo de limpeza
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className={`flex items-start space-x-3 p-3 rounded-lg border ${
                      log.status === 'success' 
                        ? 'bg-green-50 border-green-200 dark:bg-green-950/50 dark:border-green-800' 
                        : 'bg-red-50 border-red-200 dark:bg-red-950/50 dark:border-red-800'
                    }`}
                  >
                    {log.status === 'success' ? (
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${
                        log.status === 'success' ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'
                      }`}>
                        {log.action}
                      </p>
                      {log.details && (
                        <p className={`text-xs mt-1 ${
                          log.status === 'success' ? 'text-green-600 dark:text-green-300' : 'text-red-600 dark:text-red-300'
                        }`}>
                          {log.details}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">{log.timestamp}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Dialog de Confirmação */}
        {showConfirmation && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-background border rounded-lg p-6 max-w-md w-full mx-4">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Confirmar Limpeza</h3>
                  <p className="text-sm text-muted-foreground">Esta ação não pode ser desfeita</p>
                </div>
              </div>
              
              <p className="text-foreground mb-6">
                Tem certeza que deseja deletar <strong>TODOS</strong> os registros da tabela <strong>{config.tableId}</strong>?
                Esta ação é <strong>irreversível</strong>.
              </p>
              
              <div className="flex space-x-3 justify-end">
                <Button 
                  variant="outline" 
                  onClick={() => setShowConfirmation(false)}
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={confirmCleanup}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  Sim, Deletar Tudo
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LimpezaDados;