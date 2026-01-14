import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { 
  Smartphone, 
  Tablet, 
  Monitor, 
  Tv, 
  HelpCircle,
  RefreshCw,
  Trash2,
  Shield,
  AlertTriangle
} from 'lucide-react';
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

export default function GestaoDispositivos() {
  const { userInfo } = useSimpleAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [devices, setDevices] = useState<UserDevice[]>([]);
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
      const currentId = DeviceManagementService.getDeviceFingerprint(userInfo.id);
      setCurrentDeviceId(currentId);
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
    if (!deleteDialog.device) return;
    
    try {
      await DeviceManagementService.removeDevice(deleteDialog.device.id);
      toast.success('Dispositivo removido com sucesso');
      setDeleteDialog({ open: false, device: null });
      loadDevices();
    } catch (error) {
      toast.error('Erro ao remover dispositivo');
    }
  };

  const DeviceIcon = ({ type }: { type: UserDevice['deviceType'] }) => {
    const Icon = deviceTypeIcons[type];
    return <Icon className="h-5 w-5 text-muted-foreground" />;
  };

  const activeDevices = devices.filter(d => d.isActive).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Meus Dispositivos</h1>
          <p className="text-muted-foreground">
            Gerencie os dispositivos conectados à sua conta
          </p>
        </div>
        <Button onClick={loadDevices} variant="outline" disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Estatísticas simples */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Dispositivos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Monitor className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{devices.length}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Dispositivos Ativos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-green-500" />
              <span className="text-2xl font-bold">{activeDevices}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-2 md:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Este Dispositivo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="default" className="text-xs">
              {currentDeviceId ? 'Identificado' : 'Carregando...'}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Lista de dispositivos */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Dispositivos Conectados</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Carregando...</span>
            </div>
          ) : devices.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Monitor className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum dispositivo registrado</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dispositivo</TableHead>
                  <TableHead>IP</TableHead>
                  <TableHead>Última Atividade</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {devices.map(device => {
                  const isCurrentDevice = device.id === currentDeviceId;
                  
                  return (
                    <TableRow key={device.id} className={isCurrentDevice ? 'bg-primary/5' : ''}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <DeviceIcon type={device.deviceType} />
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{device.deviceName}</p>
                              {isCurrentDevice && (
                                <Badge variant="outline" className="text-xs">
                                  Este dispositivo
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {device.browser} • {device.os}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {device.ip || 'Desconhecido'}
                      </TableCell>
                      <TableCell>
                        {DeviceManagementService.calculateTimeAgo(device.lastActivity)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={device.isActive ? "default" : "secondary"}>
                          {device.isActive ? 'Ativo' : 'Revogado'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {!isCurrentDevice && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => setDeleteDialog({ open: true, device })}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dica de segurança */}
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>Dica de segurança:</strong> Se você não reconhece algum dispositivo, 
          remova-o imediatamente e considere trocar sua senha.
        </AlertDescription>
      </Alert>

      {/* Dialog de confirmação */}
      <Dialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, device: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remover Dispositivo</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja remover este dispositivo? Ele precisará fazer login novamente para acessar sua conta.
            </DialogDescription>
          </DialogHeader>
          
          {deleteDialog.device && (
            <div className="py-4 space-y-2">
              <p><strong>Dispositivo:</strong> {deleteDialog.device.deviceName}</p>
              <p><strong>Tipo:</strong> {deviceTypeLabels[deleteDialog.device.deviceType]}</p>
              <p><strong>IP:</strong> {deleteDialog.device.ip || 'Desconhecido'}</p>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog({ open: false, device: null })}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleRemoveDevice}>
              Remover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
