import React from 'react';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Shield, User, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { UserPermissionsService } from '@/services/UserPermissionsService';
import { toast } from 'sonner';

export const PermissionTestComponent: React.FC = () => {
  const { 
    permissions, 
    loading, 
    hasFeature, 
    canAddMoreContent, 
    getRemainingContent,
    hasValidAccess 
  } = useUserPermissions();

  const [isTestingAccess, setIsTestingAccess] = React.useState(false);

  const testAccess = async () => {
    setIsTestingAccess(true);
    try {
      const hasAccess = await hasValidAccess();
      toast.success(`Teste de acesso: ${hasAccess ? 'Acesso válido' : 'Acesso expirado'}`);
    } catch (error) {
      toast.error('Erro ao testar acesso');
    } finally {
      setIsTestingAccess(false);
    }
  };

  const testContentUsage = async () => {
    if (!permissions?.userId) return;
    
    try {
      await UserPermissionsService.incrementContentUsage(permissions.userId, 1);
      toast.success('Uso de conteúdo incrementado para teste');
    } catch (error) {
      toast.error('Erro ao incrementar uso de conteúdo');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Carregando permissões...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Teste de Permissões do Usuário
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {permissions ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm font-medium text-muted-foreground">ID do Usuário:</span>
                  <p className="text-sm font-mono">{permissions.userId}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-muted-foreground">Email:</span>
                  <p className="text-sm">{permissions.userEmail}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-muted-foreground">Plano:</span>
                  <Badge variant="secondary">{permissions.planName}</Badge>
                </div>
                <div>
                  <span className="text-sm font-medium text-muted-foreground">Status:</span>
                  <Badge variant={permissions.isActive ? 'default' : 'destructive'}>
                    {permissions.isActive ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>
              </div>

              <div>
                <span className="text-sm font-medium text-muted-foreground">Limite de Conteúdo:</span>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm">
                    {permissions.currentMonthUsage} / {permissions.monthlyContentLimit === -1 ? '∞' : permissions.monthlyContentLimit}
                  </span>
                  {canAddMoreContent() ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                </div>
                {getRemainingContent() !== -1 && (
                  <p className="text-xs text-muted-foreground">
                    Restante: {getRemainingContent()} conteúdos
                  </p>
                )}
              </div>

              <div>
                <span className="text-sm font-medium text-muted-foreground">Funcionalidades Habilitadas:</span>
                <div className="flex flex-wrap gap-1 mt-2">
                  {permissions.enabledFeatures.length > 0 ? (
                    permissions.enabledFeatures.map(feature => (
                      <Badge key={feature} variant="outline" className="text-xs">
                        {feature}
                      </Badge>
                    ))
                  ) : (
                    <Badge variant="destructive" className="text-xs">
                      Nenhuma funcionalidade habilitada
                    </Badge>
                  )}
                </div>
              </div>

              <div>
                <span className="text-sm font-medium text-muted-foreground">Testes de Funcionalidades:</span>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <div className="flex items-center gap-1">
                    {hasFeature('dashboard') ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    <span className="text-xs">Dashboard</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {hasFeature('conteudos') ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    <span className="text-xs">Conteúdos</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {hasFeature('priority-support') ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    <span className="text-xs">Suporte VIP</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={testAccess}
                  disabled={isTestingAccess}
                >
                  {isTestingAccess ? (
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Shield className="h-4 w-4 mr-2" />
                  )}
                  Testar Acesso
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={testContentUsage}
                >
                  <User className="h-4 w-4 mr-2" />
                  Testar Uso de Conteúdo
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <XCircle className="h-12 w-12 mx-auto mb-4 text-red-500" />
              <p className="text-foreground font-medium">Nenhuma permissão encontrada</p>
              <p className="text-xs text-muted-foreground">
                O usuário não possui permissões configuradas
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};