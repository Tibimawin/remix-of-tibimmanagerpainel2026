import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSimpleAuth } from '@/contexts/SimpleAuthContext';
import { LogOut, User, Calendar, Clock, Smartphone, Hash, Mail, Monitor, Shield } from 'lucide-react';
import UserSecuritySettings from '@/components/UserSecuritySettings';
import UserDevices from '@/components/UserDevices';

interface UserDetails {
  id: string;
  Email: string;
  Pagamento: string;
  Dias: number;
  Restam: string;
  Logins: number;
  IMEI: string;
}

const Perfil = () => {
  const { logout, userInfo } = useSimpleAuth();
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Não informado';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'Data inválida';
      }
      const [year, month, day] = dateString.split('-');
      return `${day}/${month}/${year}`;
    } catch (error) {
      return dateString;
    }
  };

  // Função para fazer parse robusto de IMEI (objetos únicos ou concatenados)
  const parseIMEIField = (imeiString: string) => {
    if (!imeiString || typeof imeiString !== 'string') {
      return [];
    }
    
    try {
      // Primeiro tenta fazer parse direto (caso seja um array válido)
      const parsed = JSON.parse(imeiString);
      if (Array.isArray(parsed)) {
        return parsed;
      }
      // Se for um objeto único, converte para array
      if (typeof parsed === 'object') {
        return [parsed];
      }
    } catch {
      // Se falhar, tenta tratar como objetos concatenados
      try {
        // Usar regex para encontrar objetos JSON concatenados
        const jsonObjects = [];
        const regex = /\{[^}]*\}/g;
        let match;
        
        while ((match = regex.exec(imeiString)) !== null) {
          try {
            const obj = JSON.parse(match[0]);
            jsonObjects.push(obj);
          } catch (parseError) {
            // Silenciar erro de parse individual
          }
        }
        
        return jsonObjects;
      } catch (error) {
        return [];
      }
    }
    
    return [];
  };

  // Função auxiliar para fazer parse seguro do IMEI (compatibilidade)
  const safeParseIMEI = (imeiString: string) => {
    const devices = parseIMEIField(imeiString);
    // Retorna o primeiro dispositivo para compatibilidade
    return devices.length > 0 ? devices[0] : null;
  };

  const getDeviceName = (imeiJson: string) => {
    if (!imeiJson) return 'Não informado';
    
    const devices = parseIMEIField(imeiJson);
    if (devices.length === 0) return 'Dispositivo desconhecido';
    
    // Se houver múltiplos dispositivos, mostrar o primeiro + contador
    const firstDevice = devices[0];
    let deviceName = '';
    
    // Se for desktop (IMEI === "Desktop"), mostrar o sistema e navegador
    if (firstDevice.IMEI === 'Desktop') {
      deviceName = `💻 ${firstDevice.Dispositivo}`;
    } else {
      // Para dispositivos móveis, manter formato existente
      deviceName = `📱 ${firstDevice.Dispositivo || 'Dispositivo móvel'}`;
    }
    
    // Se houver mais de um dispositivo, mostrar contador
    if (devices.length > 1) {
      deviceName += ` (+${devices.length - 1} outros)`;
    }
    
    return deviceName;
  };

  const getDeviceIcon = (imeiJson: string) => {
    if (!imeiJson) return Smartphone;
    
    const parsed = safeParseIMEI(imeiJson);
    if (!parsed) return Smartphone;
    
    // Se for desktop, usar ícone de monitor
    if (parsed.IMEI === 'Desktop') {
      return Monitor;
    }
    
    // Para dispositivos móveis, usar ícone de smartphone
    return Smartphone;
  };

  const fetchUserDetails = async () => {
    if (!userInfo?.id) return;
    
    try {
      setIsLoading(true);
      const { FirebaseUserService } = await import('@/services/FirebaseUserService');
      
      // Buscar dados do usuário no Firebase
      const userData = await FirebaseUserService.getUserById(userInfo.id);
      
      if (userData) {
        // Converter dados do Firebase para o formato esperado
        const formattedUserData: UserDetails = {
          id: userData.uid,
          Email: userData.email,
          Pagamento: userData.startDate ? userData.startDate.split('T')[0] : '',
          Dias: userData.accessDays || 0,
          Restam: userData.expiryDate ? 
            Math.max(0, Math.ceil((new Date(userData.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))).toString() + ' dias' : 
            '0 dias',
          Logins: userData.totalLogins || 0,
          IMEI: userData.deviceInfo ? JSON.stringify([userData.deviceInfo]) : JSON.stringify([{
            IMEI: 'Desktop',
            Dispositivo: navigator.userAgent.includes('Windows') ? 'Windows' : 
                        navigator.userAgent.includes('Mac') ? 'Mac' : 
                        navigator.userAgent.includes('Linux') ? 'Linux' : 'Desktop'
          }])
        };
        
        setUserDetails(formattedUserData);
      }
    } catch (error) {
      // Em produção, seria enviado para serviço de monitoramento
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUserDetails();
  }, [userInfo?.id]);

  const handleLogout = async () => {
    await logout();
  };

  if (isLoading) {
    return (
      <div className="w-full max-w-full overflow-x-hidden">
        <div className="container mx-auto px-6 py-8 max-w-4xl">
          <div className="flex items-center justify-center min-h-[300px]">
            <div className="flex flex-col items-center gap-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              <p className="text-muted-foreground">Carregando perfil...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const DeviceIcon = getDeviceIcon(userDetails?.IMEI || '');

  const profileStats = [
    {
      icon: Mail,
      label: 'Email',
      value: userDetails?.Email || 'Não informado',
      color: 'text-blue-400'
    },
    {
      icon: Calendar,
      label: 'Data do Pagamento',
      value: formatDate(userDetails?.Pagamento || ''),
      color: 'text-green-400'
    },
    {
      icon: Clock,
      label: 'Dias Contratados',
      value: `${userDetails?.Dias || 0} dias`,
      color: 'text-orange-400'
    },
    {
      icon: Clock,
      label: 'Dias Restantes',
      value: userDetails?.Restam || 'Não informado',
      color: 'text-red-400'
    },
    {
      icon: DeviceIcon,
      label: 'Dispositivo',
      value: getDeviceName(userDetails?.IMEI || ''),
      color: 'text-purple-400'
    },
    {
      icon: Hash,
      label: 'Total de Logins',
      value: userDetails?.Logins?.toString() || '0',
      color: 'text-cyan-400'
    }
  ];

  return (
    <div className="w-full max-w-full overflow-x-hidden">
      <div className="container mx-auto px-6 py-8 max-w-4xl">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">Meu Perfil</h1>
              <p className="text-muted-foreground">Gerencie suas informações pessoais</p>
            </div>
            <Button 
              onClick={handleLogout}
              variant="destructive"
              size="sm"
              className="flex items-center gap-2 hover:bg-red-600"
            >
              <LogOut className="h-4 w-4" />
              Sair
            </Button>
          </div>

          {/* Abas do Perfil */}
          <Tabs defaultValue="profile" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="profile" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">Conta</span>
              </TabsTrigger>
              <TabsTrigger value="devices" className="flex items-center gap-2">
                <Smartphone className="h-4 w-4" />
                <span className="hidden sm:inline">Dispositivos</span>
              </TabsTrigger>
              <TabsTrigger value="security" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                <span className="hidden sm:inline">Segurança</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="mt-6">
              <Card className="netflix-card">
                <CardHeader className="pb-6">
                  <CardTitle className="flex items-center gap-3 text-xl">
                    <div className="p-3 bg-primary/20 rounded-xl">
                      <User className="h-6 w-6 text-primary" />
                    </div>
                    Informações da Conta
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {userDetails ? (
                    <div className="grid gap-6 md:grid-cols-2">
                      {profileStats.map((stat, index) => {
                        const Icon = stat.icon;
                        return (
                          <div key={index} className="flex items-center gap-4 p-4 bg-secondary/50 rounded-xl">
                            <div className="p-2 bg-secondary rounded-lg">
                              <Icon className={`h-5 w-5 ${stat.color}`} />
                            </div>
                            <div className="flex-1">
                              <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
                              <p className="font-medium text-foreground">{stat.value}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">Erro ao carregar informações do usuário.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="devices" className="mt-6">
              <UserDevices />
            </TabsContent>

            <TabsContent value="security" className="mt-6">
              <UserSecuritySettings />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Perfil;
