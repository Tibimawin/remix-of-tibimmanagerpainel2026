import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { 
  Bell, 
  BellOff, 
  Check, 
  X, 
  AlertTriangle, 
  Smartphone,
  Shield,
  Settings,
  Info,
  Database,
  Users,
  Download,
  Clock,
  Calendar
} from 'lucide-react';
import { useActionNotifier } from '@/hooks/useActionNotifier';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface NotificationCategory {
  id: string;
  label: string;
  description: string;
  icon: any;
  enabled: boolean;
}

export const NotificationSettings: React.FC = () => {
  const { requestPermission, getPermissionStatus, isSupported } = useActionNotifier();
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>('default');
  const [categories, setCategories] = useState<NotificationCategory[]>([
    {
      id: 'crud',
      label: 'Operações CRUD',
      description: 'Notificar ao criar, atualizar ou deletar registros',
      icon: Database,
      enabled: true
    },
    {
      id: 'import',
      label: 'Importações',
      description: 'Notificar ao importar M3U, MaxPlus ou outros dados',
      icon: Download,
      enabled: true
    },
    {
      id: 'users',
      label: 'Gestão de Usuários',
      description: 'Notificar ao criar ou modificar usuários',
      icon: Users,
      enabled: true
    },
    {
      id: 'security',
      label: 'Alertas de Segurança',
      description: 'Notificar sobre tentativas de login e ações sensíveis',
      icon: Shield,
      enabled: true
    },
    {
      id: 'scheduled',
      label: 'Notificações Programadas',
      description: 'Lembretes e verificações automáticas agendadas',
      icon: Clock,
      enabled: true
    },
    {
      id: 'expiration',
      label: 'Expiração de Planos',
      description: 'Alertas sobre vencimento de assinaturas',
      icon: Calendar,
      enabled: true
    },
    {
      id: 'system',
      label: 'Sistema',
      description: 'Notificar sobre atualizações e manutenção',
      icon: Settings,
      enabled: false
    }
  ]);

  useEffect(() => {
    setPermissionStatus(getPermissionStatus());
    
    // Carregar preferências salvas
    const saved = localStorage.getItem('notification_preferences');
    if (saved) {
      try {
        const prefs = JSON.parse(saved);
        setCategories(prefs);
      } catch (error) {
        console.error('Erro ao carregar preferências:', error);
      }
    }
  }, [getPermissionStatus]);

  const handleRequestPermission = async () => {
    const granted = await requestPermission();
    setPermissionStatus(getPermissionStatus());
    
    if (granted) {
      toast.success('Notificações ativadas!', {
        description: 'Você receberá notificações sobre ações importantes.'
      });
    }
  };

  const handleToggleCategory = (categoryId: string) => {
    const updated = categories.map(cat => 
      cat.id === categoryId ? { ...cat, enabled: !cat.enabled } : cat
    );
    
    setCategories(updated);
    localStorage.setItem('notification_preferences', JSON.stringify(updated));
    
    toast.success('Preferências atualizadas');
  };

  if (!isSupported()) {
    return (
      <Card className="border-yellow-500/20 bg-yellow-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
            Notificações não suportadas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Seu navegador não suporta notificações push. Tente usar Chrome, Firefox ou Edge.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <Card className={cn(
        "relative overflow-hidden transition-all duration-500",
        permissionStatus === 'granted' 
          ? "border-green-500/20 bg-gradient-to-br from-green-500/5 to-emerald-500/5" 
          : "border-orange-500/20 bg-gradient-to-br from-orange-500/5 to-red-500/5"
      )}>
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-primary/10 to-transparent blur-3xl opacity-50" />
        
        <CardHeader className="relative">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <CardTitle className="text-2xl flex items-center gap-3">
                {permissionStatus === 'granted' ? (
                  <>
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center shadow-lg">
                      <Bell className="w-6 h-6 text-white" />
                    </div>
                    Notificações Ativas
                  </>
                ) : (
                  <>
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-lg">
                      <BellOff className="w-6 h-6 text-white" />
                    </div>
                    Notificações Desativadas
                  </>
                )}
              </CardTitle>
              <CardDescription className="text-base">
                {permissionStatus === 'granted' 
                  ? 'Você receberá notificações sobre todas as ações importantes do painel'
                  : 'Ative as notificações para ser alertado sobre ações importantes'}
              </CardDescription>
            </div>

            <Badge 
              variant={permissionStatus === 'granted' ? 'success' : 'warning'}
              size="lg"
              className="gap-2"
            >
              {permissionStatus === 'granted' ? (
                <>
                  <Check className="w-4 h-4" />
                  Ativo
                </>
              ) : (
                <>
                  <X className="w-4 h-4" />
                  Inativo
                </>
              )}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="relative space-y-4">
          {permissionStatus !== 'granted' && (
            <>
              <div className="bg-background/50 backdrop-blur-sm rounded-xl border border-border/40 p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <Smartphone className="w-5 h-5 text-primary mt-0.5" />
                  <div className="space-y-2 flex-1">
                    <h4 className="font-semibold">Por que ativar notificações?</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-500" />
                        Receba alertas instantâneos de ações importantes
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-500" />
                        Monitore atividades mesmo quando não estiver no painel
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-500" />
                        Alertas de segurança e tentativas de login
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-500" />
                        Notificações sobre importações e atualizações
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              <Button 
                onClick={handleRequestPermission}
                size="lg"
                className="w-full gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg hover:shadow-xl transition-all"
              >
                <Bell className="w-5 h-5" />
                Ativar Notificações
              </Button>
            </>
          )}

          {permissionStatus === 'denied' && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
                <div className="space-y-1 flex-1">
                  <h4 className="font-semibold text-red-700 dark:text-red-400">Permissão Negada</h4>
                  <p className="text-sm text-muted-foreground">
                    Você bloqueou as notificações. Para ativá-las novamente:
                  </p>
                  <ol className="text-sm text-muted-foreground space-y-1 ml-4 list-decimal">
                    <li>Clique no ícone de cadeado/informação na barra de endereço</li>
                    <li>Encontre a configuração de Notificações</li>
                    <li>Altere para "Permitir"</li>
                    <li>Recarregue a página</li>
                  </ol>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Categories Card */}
      {permissionStatus === 'granted' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-primary" />
              Categorias de Notificação
            </CardTitle>
            <CardDescription>
              Escolha quais tipos de ações você deseja ser notificado
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {categories.map((category, index) => {
              const Icon = category.icon;
              
              return (
                <div key={category.id}>
                  {index > 0 && <Separator className="my-4" />}
                  
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                        category.enabled 
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground"
                      )}>
                        <Icon className="w-5 h-5" />
                      </div>
                      
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <Label 
                            htmlFor={`category-${category.id}`}
                            className="text-base font-semibold cursor-pointer"
                          >
                            {category.label}
                          </Label>
                          {category.enabled && (
                            <Badge variant="success" size="sm">Ativo</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {category.description}
                        </p>
                      </div>
                    </div>

                    <Switch
                      id={`category-${category.id}`}
                      checked={category.enabled}
                      onCheckedChange={() => handleToggleCategory(category.id)}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Info Card */}
      <Card className="border-blue-500/20 bg-gradient-to-r from-blue-500/5 to-cyan-500/5">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
            <div className="space-y-2">
              <h4 className="font-semibold text-blue-700 dark:text-blue-400">Sobre as Notificações</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• As notificações são enviadas em tempo real quando ações são realizadas</li>
                <li>• Você pode desativar categorias específicas a qualquer momento</li>
                <li>• Notificações funcionam mesmo quando você não está no painel</li>
                <li>• Seus dados de notificação são armazenados localmente com segurança</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
