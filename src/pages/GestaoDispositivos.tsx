import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { 
  Smartphone, 
  Tablet, 
  Monitor, 
  Tv, 
  HelpCircle,
  RefreshCw,
  Search,
  Ban,
  Trash2,
  Users,
  ShieldAlert,
  Activity,
  Settings,
  ChevronDown,
  ChevronUp,
  AlertTriangle
} from 'lucide-react';
import { DeviceManagementService, UserDevice } from '@/services/DeviceManagementService';
import { FirebaseUser } from '@/services/FirebaseUserService';

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

interface UserDeviceGroup {
  user: Partial<FirebaseUser>;
  devices: UserDevice[];
}

export default function GestaoDispositivos() {
  const [isLoading, setIsLoading] = useState(true);
  const [deviceGroups, setDeviceGroups] = useState<Map<string, UserDeviceGroup>>(new Map());
  const [allDevices, setAllDevices] = useState<UserDevice[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const [stats, setStats] = useState({
    totalDevices: 0,
    activeDevices: 0,
    devicesByType: {} as Record<string, number>,
    devicesByBrowser: {} as Record<string, number>,
    usersOverLimit: 0
  });
  
  // Modais
  const [revokeDeviceDialog, setRevokeDeviceDialog] = useState<{ open: boolean; device: UserDevice | null }>({
    open: false,
    device: null
  });
  const [limitDialog, setLimitDialog] = useState<{ open: boolean; userId: string; currentLimit: number }>({
    open: false,
    userId: '',
    currentLimit: 3
  });
  const [newLimit, setNewLimit] = useState(3);

  const loadData = async () => {
    try {
      setIsLoading(true);
      
      const [grouped, devices, deviceStats] = await Promise.all([
        DeviceManagementService.getDevicesGroupedByUser(),
        DeviceManagementService.getAllDevices(),
        DeviceManagementService.getDeviceStats()
      ]);
      
      setDeviceGroups(grouped);
      setAllDevices(devices);
      setStats(deviceStats);
      
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dispositivos');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const toggleUserExpand = (userId: string) => {
    const newExpanded = new Set(expandedUsers);
    if (newExpanded.has(userId)) {
      newExpanded.delete(userId);
    } else {
      newExpanded.add(userId);
    }
    setExpandedUsers(newExpanded);
  };

  const handleRevokeDevice = async () => {
    if (!revokeDeviceDialog.device) return;
    
    try {
      await DeviceManagementService.revokeDeviceAccess(revokeDeviceDialog.device.id);
      toast.success('Acesso do dispositivo revogado');
      setRevokeDeviceDialog({ open: false, device: null });
      loadData();
    } catch (error) {
      toast.error('Erro ao revogar acesso');
    }
  };

  const handleRemoveDevice = async (deviceId: string) => {
    try {
      await DeviceManagementService.removeDevice(deviceId);
      toast.success('Dispositivo removido');
      loadData();
    } catch (error) {
      toast.error('Erro ao remover dispositivo');
    }
  };

  const handleRevokeAllDevices = async (userId: string) => {
    try {
      await DeviceManagementService.revokeAllUserDevices(userId);
      toast.success('Todos os dispositivos do usuário foram revogados');
      loadData();
    } catch (error) {
      toast.error('Erro ao revogar dispositivos');
    }
  };

  const handleSetLimit = async () => {
    try {
      await DeviceManagementService.setDeviceLimit(limitDialog.userId, newLimit);
      toast.success('Limite de dispositivos atualizado');
      setLimitDialog({ open: false, userId: '', currentLimit: 3 });
      loadData();
    } catch (error) {
      toast.error('Erro ao atualizar limite');
    }
  };

  const openLimitDialog = async (userId: string) => {
    const limit = await DeviceManagementService.getDeviceLimit(userId);
    setNewLimit(limit.maxDevices);
    setLimitDialog({ open: true, userId, currentLimit: limit.maxDevices });
  };

  const filteredGroups = Array.from(deviceGroups.entries()).filter(([_, group]) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      group.user.email?.toLowerCase().includes(searchLower) ||
      group.user.name?.toLowerCase().includes(searchLower) ||
      group.devices.some(d => 
        d.deviceName.toLowerCase().includes(searchLower) ||
        d.ip?.toLowerCase().includes(searchLower)
      )
    );
  });

  const DeviceIcon = ({ type }: { type: UserDevice['deviceType'] }) => {
    const Icon = deviceTypeIcons[type];
    return <Icon className="h-5 w-5 text-muted-foreground" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Gestão de Dispositivos</h1>
          <p className="text-muted-foreground">
            Gerencie dispositivos conectados e limites por usuário
          </p>
        </div>
        <Button onClick={loadData} variant="outline" disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Dispositivos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Monitor className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{stats.totalDevices}</span>
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
              <Activity className="h-5 w-5 text-green-500" />
              <span className="text-2xl font-bold">{stats.activeDevices}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Usuários com Dispositivos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-500" />
              <span className="text-2xl font-bold">{deviceGroups.size}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Acima do Limite
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <ShieldAlert className={`h-5 w-5 ${stats.usersOverLimit > 0 ? 'text-destructive' : 'text-muted-foreground'}`} />
              <span className={`text-2xl font-bold ${stats.usersOverLimit > 0 ? 'text-destructive' : ''}`}>
                {stats.usersOverLimit}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Distribuição por Tipo */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {Object.entries(stats.devicesByType).map(([type, count]) => (
          <Card key={type} className="p-3">
            <div className="flex items-center gap-3">
              <DeviceIcon type={type as UserDevice['deviceType']} />
              <div>
                <p className="text-sm font-medium">{deviceTypeLabels[type as keyof typeof deviceTypeLabels]}</p>
                <p className="text-lg font-bold">{count}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="by-user" className="space-y-4">
        <TabsList>
          <TabsTrigger value="by-user">Por Usuário</TabsTrigger>
          <TabsTrigger value="all-devices">Todos os Dispositivos</TabsTrigger>
        </TabsList>

        {/* Por Usuário */}
        <TabsContent value="by-user" className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por usuário ou dispositivo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div className="space-y-3">
            {filteredGroups.map(([userId, group]) => {
              const isExpanded = expandedUsers.has(userId);
              const activeDevices = group.devices.filter(d => d.isActive).length;
              
              return (
                <Card key={userId}>
                  <div 
                    className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => toggleUserExpand(userId)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {isExpanded ? (
                          <ChevronUp className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-muted-foreground" />
                        )}
                        <div>
                          <p className="font-medium">{group.user.name || 'Usuário'}</p>
                          <p className="text-sm text-muted-foreground">{group.user.email}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <Badge variant={activeDevices > 3 ? "destructive" : "secondary"}>
                          {activeDevices} dispositivo{activeDevices !== 1 ? 's' : ''} ativo{activeDevices !== 1 ? 's' : ''}
                        </Badge>
                        
                        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => openLimitDialog(userId)}
                          >
                            <Settings className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={() => handleRevokeAllDevices(userId)}
                            disabled={activeDevices === 0}
                          >
                            <Ban className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {isExpanded && group.devices.length > 0 && (
                    <div className="border-t">
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
                          {group.devices.map(device => (
                            <TableRow key={device.id}>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <DeviceIcon type={device.deviceType} />
                                  <div>
                                    <p className="font-medium">{device.deviceName}</p>
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
                                <div className="flex justify-end gap-1">
                                  {device.isActive && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => setRevokeDeviceDialog({ open: true, device })}
                                    >
                                      <Ban className="h-4 w-4" />
                                    </Button>
                                  )}
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => handleRemoveDevice(device.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                  
                  {isExpanded && group.devices.length === 0 && (
                    <div className="p-4 border-t text-center text-muted-foreground">
                      Nenhum dispositivo registrado
                    </div>
                  )}
                </Card>
              );
            })}

            {filteredGroups.length === 0 && (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">
                  {searchTerm ? 'Nenhum resultado encontrado' : 'Nenhum dispositivo registrado'}
                </p>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Todos os Dispositivos */}
        <TabsContent value="all-devices">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Dispositivo</TableHead>
                  <TableHead>IP</TableHead>
                  <TableHead>Última Atividade</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allDevices.map(device => (
                  <TableRow key={device.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{device.userName}</p>
                        <p className="text-xs text-muted-foreground">{device.userEmail}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <DeviceIcon type={device.deviceType} />
                        <div>
                          <p className="font-medium">{device.deviceName}</p>
                          <p className="text-xs text-muted-foreground">
                            {deviceTypeLabels[device.deviceType]}
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
                      <div className="flex justify-end gap-1">
                        {device.isActive && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setRevokeDeviceDialog({ open: true, device })}
                          >
                            <Ban className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleRemoveDevice(device.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}

                {allDevices.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Nenhum dispositivo registrado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog: Revogar Dispositivo */}
      <Dialog open={revokeDeviceDialog.open} onOpenChange={(open) => setRevokeDeviceDialog({ open, device: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Revogar Acesso do Dispositivo
            </DialogTitle>
            <DialogDescription>
              O usuário será desconectado deste dispositivo e precisará fazer login novamente. 
              Deseja continuar?
            </DialogDescription>
          </DialogHeader>
          
          {revokeDeviceDialog.device && (
            <div className="p-4 rounded-lg bg-muted">
              <div className="flex items-center gap-3">
                <DeviceIcon type={revokeDeviceDialog.device.deviceType} />
                <div>
                  <p className="font-medium">{revokeDeviceDialog.device.deviceName}</p>
                  <p className="text-sm text-muted-foreground">{revokeDeviceDialog.device.userEmail}</p>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevokeDeviceDialog({ open: false, device: null })}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleRevokeDevice}>
              Revogar Acesso
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Configurar Limite */}
      <Dialog open={limitDialog.open} onOpenChange={(open) => setLimitDialog({ ...limitDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Configurar Limite de Dispositivos
            </DialogTitle>
            <DialogDescription>
              Defina o número máximo de dispositivos simultâneos permitidos para este usuário.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <label className="text-sm font-medium mb-2 block">Limite de Dispositivos</label>
            <Select value={newLimit.toString()} onValueChange={(v) => setNewLimit(parseInt(v))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 dispositivo</SelectItem>
                <SelectItem value="2">2 dispositivos</SelectItem>
                <SelectItem value="3">3 dispositivos</SelectItem>
                <SelectItem value="5">5 dispositivos</SelectItem>
                <SelectItem value="10">10 dispositivos</SelectItem>
                <SelectItem value="999">Ilimitado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setLimitDialog({ open: false, userId: '', currentLimit: 3 })}>
              Cancelar
            </Button>
            <Button onClick={handleSetLimit}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
