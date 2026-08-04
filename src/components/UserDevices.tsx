import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { 
  Smartphone, 
  Tablet, 
  Monitor, 
  Tv, 
  HelpCircle,
  RefreshCw,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ShieldCheck,
  LocateFixed
} from 'lucide-react';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { DeviceManagementService, UserDevice } from '@/services/DeviceManagementService';
import { useSimpleAuth } from '@/contexts/SimpleAuthContext';

const deviceTypeIcons = {
  mobile: Smartphone,
  tablet: Tablet,
  desktop: Monitor,
  tv: Tv,
  unknown: HelpCircle
};

const deviceTypeLabels = {
  mobile: 'Celular',
  tablet: 'Tablet',
  desktop: 'Computador',
  tv: 'Smart TV',
  unknown: 'Desconhecido'
};

export default function UserDevices() {
  const { userInfo } = useSimpleAuth();
  const [devices, setDevices] = useState<UserDevice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentDeviceId, setCurrentDeviceId] = useState<string | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; device: UserDevice | null }>({
    open: false,
    device: null
  });

  const loadDevices = async () => {
    if (!userInfo?.id) return;
    
    try {
      setIsLoading(true);
      const userDevices = await DeviceManagementService.getUserDevices(userInfo.id);
      setDevices(userDevices);
      
      // Identificar dispositivo atual
      const fingerprint = DeviceManagementService.getDeviceFingerprint(userInfo.id);
      setCurrentDeviceId(fingerprint);
    } catch (error) {
      console.error('Erro ao carregar dispositivos:', error);
      toast.error('Erro ao carregar dispositivos');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDevices();
  }, [userInfo?.id]);

  const handleRemoveDevice = async () => {
    try {
      if (deleteDialog.device) {
        // Remover um dispositivo específico
        await DeviceManagementService.removeDevice(deleteDialog.device.id);
        toast.success('Dispositivo removido com sucesso');
      } else {
        // Remover todos exceto o atual
        await DeviceManagementService.revokeAllUserDevices(userInfo!.id);
        // O método acima revoga, mas para limpar a lista visualmente melhor removemos mesmo
        const devicesToRemove = devices.filter(d => d.id !== currentDeviceId);
        for (const d of devicesToRemove) {
          await DeviceManagementService.removeDevice(d.id);
        }
        toast.success('Todos os outros dispositivos foram desconectados');
      }
      setDeleteDialog({ open: false, device: null });
      loadDevices();
    } catch (error) {
      toast.error('Erro ao processar solicitação');
    }
  };

  const DeviceIcon = ({ type }: { type: UserDevice['deviceType'] }) => {
    const Icon = deviceTypeIcons[type];
    return <Icon className="h-5 w-5" />;
  };

  const activeDevices = devices.filter(d => d.isActive);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-3">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Carregando dispositivos...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Smartphone className="h-5 w-5 text-primary" />
              Gestão de Dispositivos e Acessos
            </CardTitle>
            <CardDescription className="mt-1">
              {activeDevices.length} dispositivo{activeDevices.length !== 1 ? 's' : ''} conectado{activeDevices.length !== 1 ? 's' : ''}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button 
              variant="destructive" 
              size="sm" 
              onClick={() => setDeleteDialog({ open: true, device: null })}
              disabled={isLoading || activeDevices.length <= 1}
              className="flex-1 sm:flex-initial gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Desconectar Todos
            </Button>
            <Button variant="outline" size="sm" onClick={loadDevices} disabled={isLoading}>
              <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {devices.length === 0 ? (
          <div className="text-center py-8">
            <Monitor className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-muted-foreground">Nenhum dispositivo registrado</p>
            <p className="text-xs text-muted-foreground mt-1">
              Os dispositivos são registrados automaticamente no login
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {devices.map(device => {
              const isCurrentDevice = device.id === currentDeviceId;
              
              return (
                <div 
                  key={device.id}
                  className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
                    isCurrentDevice 
                      ? 'bg-primary/5 border-primary/30' 
                      : 'bg-secondary/30 hover:bg-secondary/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${isCurrentDevice ? 'bg-primary/20' : 'bg-secondary'}`}>
                      <DeviceIcon type={device.deviceType} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{device.deviceName}</p>
                        {isCurrentDevice && (
                          <Badge variant="default" className="text-xs">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Este dispositivo
                          </Badge>
                        )}
                        {!device.isActive && (
                          <Badge variant="secondary" className="text-xs">
                            Revogado
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                        <span>{deviceTypeLabels[device.deviceType]}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {DeviceManagementService.calculateTimeAgo(device.lastActivity)}
                        </span>
                        {device.ip && device.ip !== 'Desconhecido' && (
                          <>
                            <span>•</span>
                            <span className="font-mono">{device.ip}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {!isCurrentDevice && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setDeleteDialog({ open: true, device })}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Informativo de segurança */}
        <div className="mt-4 p-3 rounded-lg bg-muted/50 border border-muted">
          <div className="flex gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-muted-foreground">
              <p className="font-medium text-foreground mb-1">Dica de segurança</p>
              <p>Se você não reconhece algum dispositivo, remova-o imediatamente e altere sua senha.</p>
            </div>
          </div>
        </div>
      </CardContent>

      {/* Dialog de confirmação para remover dispositivo */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, device: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              {deleteDialog.device ? 'Remover Dispositivo' : 'Desconectar Tudo'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteDialog.device 
                ? 'Tem certeza que deseja remover este dispositivo? Ele precisará fazer login novamente.' 
                : 'Isso irá desconectar TODOS os outros dispositivos vinculados à sua conta imediatamente.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          {deleteDialog.device && (
            <div className="p-3 rounded-lg bg-muted">
              <div className="flex items-center gap-3">
                <DeviceIcon type={deleteDialog.device.deviceType} />
                <div>
                  <p className="font-medium">{deleteDialog.device.deviceName}</p>
                  <p className="text-xs text-muted-foreground">
                    Último acesso: {DeviceManagementService.calculateTimeAgo(deleteDialog.device.lastActivity)}
                  </p>
                </div>
              </div>
            </div>
          )}
          
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleRemoveDevice}
              className="bg-destructive hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
