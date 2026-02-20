import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Search, Save, User, Shield, X, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { UserPermissions, Plan, AVAILABLE_FEATURES } from '@/types/planTypes';
import { FirebaseUser, FirebaseUserService } from '@/services/FirebaseUserService';
import { db } from '@/config/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';

const AdminUserPermissions = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<FirebaseUser | null>(null);
  const [userPermissions, setUserPermissions] = useState<UserPermissions | null>(null);
  const [availablePlans, setAvailablePlans] = useState<Plan[]>([]);
  const [users, setUsers] = useState<FirebaseUser[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<FirebaseUser[]>([]);
  const [loading, setLoading] = useState(false);

  // Carregar planos disponíveis (mock data)
  useEffect(() => {
    const mockPlans: Plan[] = [
      {
        id: '1',
        name: 'Básico',
        price: 'R$ 29,90/mês',
        description: 'Plano ideal para iniciantes',
        monthlyContentLimit: 100,
        features: ['dashboard', 'conteudos', 'episodios', 'categorias'],
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: '2',
        name: 'Profissional',
        price: 'R$ 59,90/mês',
        description: 'Para uso profissional avançado',
        monthlyContentLimit: 500,
        features: ['dashboard', 'conteudos', 'episodios', 'categorias', 'banners', 'duplicados', 'duplicados-episodios', 'importacao-automatica', 'automacao', 'importar-m3u', 'adicionar-conteudo', 'usuarios', 'sessoes', 'produtos', 'estatisticas', 'export', 'logs'],
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: '3',
        name: 'Empresa',
        price: 'R$ 129,90/mês',
        description: 'Soluções corporativas completas',
        monthlyContentLimit: -1, // Ilimitado
        features: ['dashboard', 'conteudos', 'episodios', 'categorias', 'banners', 'duplicados', 'duplicados-episodios', 'importacao-automatica', 'automacao', 'substituicao-urls', 'importar-m3u', 'adicionar-conteudo', 'usuarios', 'sessoes', 'plataformas', 'produtos', 'estatisticas', 'relatorios-visualizacao', 'recursos', 'clean-data', 'maxplus-import', 'precos-interno', 'configuracoes', 'perfil', 'suporte-ao-vivo', 'priority-support', 'export', 'logs'],
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    setAvailablePlans(mockPlans);
  }, []);

  // Carregar usuários do Firebase - incluindo todos os usuários autenticados
  useEffect(() => {
    const loadUsers = async () => {
      setLoading(true);
      try {
        // Carregar todos os usuários registrados no Firestore
        const firebaseUsers = await FirebaseUserService.getAllUsers();
        setUsers(firebaseUsers);
        console.log('Usuários Firebase carregados (incluindo auto-registrados):', firebaseUsers.length);

        // Log para debug dos usuários carregados
        console.log('Usuários encontrados:', firebaseUsers.map(u => ({
          email: u.email,
          name: u.name,
          createdBy: u.createdBy,
          isActive: u.isActive
        })));
      } catch (error) {
        console.error('Erro ao carregar usuários do Firebase:', error);
        toast.error('Erro ao carregar usuários');
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const filtered = users.filter(user =>
        user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredUsers(filtered);
    } else {
      setFilteredUsers([]);
    }
  }, [searchTerm, users]);

  const getOrCreateUserPermissions = async (user: FirebaseUser): Promise<UserPermissions> => {
    try {
      // Buscar permissões do Firebase
      const userDoc = await getDoc(doc(db, 'userPermissions', user.uid));

      if (userDoc.exists()) {
        const data = userDoc.data() as UserPermissions;
        console.log('Permissões carregadas do Firebase:', user.email, data);
        return data;
      }
    } catch (error) {
      console.error('Erro ao carregar permissões do Firebase:', error);
    }

    // Criar permissões padrão (1 dia grátis)
    const defaultPermissions: UserPermissions = {
      userId: user.uid,
      userEmail: user.email,
      userName: user.name || 'Usuário',
      planId: 'basic',
      planName: 'Gratuito (1 dia)',
      monthlyContentLimit: 0,
      enabledFeatures: [],
      currentMonthUsage: 0,
      lastUpdated: new Date().toISOString(),
      expiryDate: user.expiryDate,
      isActive: user.isActive
    };

    console.log('Criando permissões padrão para usuário:', user.email, defaultPermissions);
    return defaultPermissions;
  };

  const handleSelectUser = async (user: FirebaseUser) => {
    setSelectedUser(user);
    setLoading(true);

    try {
      // Obter ou criar permissões para o usuário do Firebase
      const permissions = await getOrCreateUserPermissions(user);
      setUserPermissions(permissions);
    } catch (error) {
      console.error('Erro ao carregar usuário:', error);
      toast.error('Erro ao carregar permissões do usuário');
    } finally {
      setLoading(false);
    }

    setSearchTerm('');
    setFilteredUsers([]);
  };

  const handleClearUser = () => {
    setSelectedUser(null);
    setUserPermissions(null);
  };

  const handleUpdatePermissions = async () => {
    if (!userPermissions || !selectedUser) {
      console.error('❌ Tentativa de salvar sem permissões ou usuário selecionado');
      return;
    }

    try {
      console.log('💾 Salvando permissões no Firebase para:', selectedUser.email, {
        planId: userPermissions.planId,
        planName: userPermissions.planName,
        enabledFeatures: userPermissions.enabledFeatures,
        monthlyContentLimit: userPermissions.monthlyContentLimit
      });

      // Atualizar o timestamp e garantir dados válidos
      const updatedPermissions = {
        ...userPermissions,
        lastUpdated: new Date().toISOString(),
        enabledFeatures: Array.isArray(userPermissions.enabledFeatures) ? userPermissions.enabledFeatures : []
      };

      // Salvar permissões no Firebase com merge para preservar dados existentes
      await setDoc(doc(db, 'userPermissions', selectedUser.uid), updatedPermissions, { merge: true });

      // Atualizar estado local
      setUserPermissions(updatedPermissions);

      // Aguardar um momento para garantir que o Firebase propagou
      await new Promise(resolve => setTimeout(resolve, 500));

      // Registrar log da ação
      const logs = JSON.parse(localStorage.getItem('system-logs') || '[]');
      logs.unshift({
        id: Date.now().toString(),
        timestamp: new Date().toLocaleString('pt-BR'),
        userEmail: 'admin',
        action: 'Atualização de permissões',
        details: `Permissões atualizadas para ${updatedPermissions.userEmail} - Plano: ${updatedPermissions.planName} - Funcionalidades: ${updatedPermissions.enabledFeatures.join(', ')}`
      });
      localStorage.setItem('system-logs', JSON.stringify(logs));

      console.log('✅ Permissões salvas no Firebase com sucesso!');
      toast.success(`Permissões atualizadas para ${updatedPermissions.userEmail}! 
      Plano: ${updatedPermissions.planName} 
      Funcionalidades: ${updatedPermissions.enabledFeatures.length}`);
    } catch (error) {
      console.error('❌ Erro ao salvar permissões no Firebase:', error);
      toast.error('Erro ao salvar permissões');
    }
  };

  const handleFeatureToggle = (featureId: string) => {
    if (!userPermissions) return;

    const currentFeatures = Array.isArray(userPermissions.enabledFeatures) ? userPermissions.enabledFeatures : [];
    const newEnabledFeatures = currentFeatures.includes(featureId)
      ? currentFeatures.filter(f => f !== featureId)
      : [...currentFeatures, featureId];

    console.log('🔄 Alterando funcionalidade:', featureId, {
      isEnabled: currentFeatures.includes(featureId),
      before: currentFeatures,
      after: newEnabledFeatures
    });

    setUserPermissions(prev => prev ? {
      ...prev,
      enabledFeatures: newEnabledFeatures
    } : null);
  };

  const handlePlanChange = (planId: string) => {
    const plan = availablePlans.find(p => p.id === planId);
    if (plan && userPermissions) {
      console.log('Alterando plano para:', plan.name, 'Mantendo funcionalidades atuais:', userPermissions.enabledFeatures);

      // NÃO substituir as funcionalidades, apenas atualizar o plano e limite
      setUserPermissions(prev => prev ? {
        ...prev,
        planId: planId,
        planName: plan.name,
        monthlyContentLimit: plan.monthlyContentLimit
        // Manter enabledFeatures como está
      } : null);
    }
  };

  const handleExtendAccess = async (days: number) => {
    if (!selectedUser) return;

    try {
      await FirebaseUserService.extendUserAccess(selectedUser.uid, days);

      // Atualizar dados do usuário local
      const updatedUser = await FirebaseUserService.getUserById(selectedUser.uid);
      if (updatedUser) {
        setSelectedUser(updatedUser);

        // Atualizar permissões também
        if (userPermissions) {
          setUserPermissions(prev => prev ? {
            ...prev,
            expiryDate: updatedUser.expiryDate,
            isActive: true
          } : null);
        }
      }

      toast.success(`Acesso estendido por ${days} dias com sucesso!`);
    } catch (error) {
      console.error('Erro ao estender acesso:', error);
      toast.error('Erro ao estender acesso do usuário');
    }
  };

  const selectedPlan = availablePlans.find(p => p.id === userPermissions?.planId);
  const usagePercentage = userPermissions ?
    (userPermissions.currentMonthUsage / Math.max(userPermissions.monthlyContentLimit, 1)) * 100 : 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Permissões de Usuário</h2>
        <p className="text-muted-foreground">Gerencie as permissões e planos dos usuários</p>
      </div>

      {/* User Search - Improved visibility */}
      {!selectedUser && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Search className="h-5 w-5" />
              <span>Buscar Usuário</span>
            </CardTitle>
            <CardDescription>
              Digite o nome ou email do usuário para configurar suas permissões
              {loading && <span className="text-primary"> (Carregando usuários...)</span>}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Digite o nome ou email do usuário..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full text-lg h-12 pl-10"
                  disabled={loading}
                />
              </div>

              {/* Display filtered users in a visible grid */}
              {filteredUsers.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                  {filteredUsers.slice(0, 12).map((user) => (
                    <Card
                      key={user.uid}
                      className="cursor-pointer hover:bg-muted/50 transition-colors border-2 hover:border-primary/30"
                      onClick={() => handleSelectUser(user)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start space-x-3">
                          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                            <User className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-foreground truncate">{user.name}</h3>
                            <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                            <div className="flex items-center justify-between mt-2">
                              <Badge variant={user.isActive ? 'default' : 'destructive'} className="text-xs">
                                {user.isActive ? 'Ativo' : 'Inativo'}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {user.totalLogins || 0} logins
                              </span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {filteredUsers.length > 12 && (
                    <Card className="p-4 flex items-center justify-center border-dashed">
                      <p className="text-muted-foreground text-sm">
                        +{filteredUsers.length - 12} usuários a mais...
                      </p>
                    </Card>
                  )}
                </div>
              )}

              {searchTerm && filteredUsers.length === 0 && !loading && (
                <div className="text-center py-8">
                  <User className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p className="text-muted-foreground">Nenhum usuário encontrado para "{searchTerm}"</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Tente buscar por nome ou email
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Selected User Header */}
      {selectedUser && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">{selectedUser.name}</h3>
                  <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={handleClearUser}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* User Permissions Editor */}
      {selectedUser && userPermissions && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* User Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="h-5 w-5" />
                <span>Informações do Usuário</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <span className="text-sm font-medium text-muted-foreground">Nome:</span>
                <p className="text-foreground">{selectedUser.name}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-muted-foreground">Email:</span>
                <p className="text-foreground">{selectedUser.email}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-muted-foreground">Status:</span>
                <Badge variant={selectedUser.isActive ? 'default' : 'destructive'}>
                  {selectedUser.isActive ? 'Ativo' : 'Expirado'}
                </Badge>
              </div>
              <div>
                <span className="text-sm font-medium text-muted-foreground">Data de Expiração:</span>
                <p className="text-foreground">
                  {new Date(selectedUser.expiryDate).toLocaleDateString('pt-BR')}
                </p>
              </div>
              <div>
                <span className="text-sm font-medium text-muted-foreground">Total de Logins:</span>
                <p className="text-foreground">{selectedUser.totalLogins || 0}</p>
              </div>
            </CardContent>
          </Card>

          {/* Plan and Usage */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5" />
                <span>Plano e Uso</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="plan">Plano Atual</Label>
                <Select value={userPermissions.planId} onValueChange={handlePlanChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availablePlans.map((plan) => (
                      <SelectItem key={plan.id} value={plan.id}>
                        {plan.name} - {plan.price}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="monthlyLimit">Limite Mensal de Conteúdos</Label>
                <Input
                  id="monthlyLimit"
                  type="number"
                  value={userPermissions.monthlyContentLimit === -1 ? 'Ilimitado' : userPermissions.monthlyContentLimit}
                  onChange={(e) => setUserPermissions(prev => prev ? {
                    ...prev,
                    monthlyContentLimit: parseInt(e.target.value) || 0
                  } : null)}
                  disabled={userPermissions.monthlyContentLimit === -1}
                />
              </div>

              {userPermissions.monthlyContentLimit !== -1 && (
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Uso do Mês Atual</span>
                    <span>{userPermissions.currentMonthUsage} / {userPermissions.monthlyContentLimit}</span>
                  </div>
                  <Progress value={Math.min(usagePercentage, 100)} className="h-2" />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Features */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Funcionalidades Habilitadas</CardTitle>
              <CardDescription>
                Configure quais funcionalidades o usuário pode acessar
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {AVAILABLE_FEATURES.map((feature) => {
                  const isEnabled = userPermissions.enabledFeatures.includes(feature.id);

                  return (
                    <div
                      key={feature.id}
                      className={`flex items-start space-x-3 p-3 border rounded-lg transition-all ${isEnabled
                          ? 'border-primary/30 bg-primary/5'
                          : 'border-border bg-muted/30 opacity-70'
                        }`}
                    >
                      <Switch
                        id={feature.id}
                        checked={isEnabled}
                        onCheckedChange={() => handleFeatureToggle(feature.id)}
                      />
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <Label htmlFor={feature.id} className="text-sm font-medium flex items-center gap-2">
                            {feature.name}
                            {!isEnabled && (
                              <Lock className="h-3 w-3 text-orange-500" />
                            )}
                          </Label>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {feature.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-between items-center mt-6">
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => handleExtendAccess(30)}
                    disabled={!selectedUser}
                  >
                    Estender 30 dias
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleExtendAccess(90)}
                    disabled={!selectedUser}
                  >
                    Estender 90 dias
                  </Button>
                </div>
                <Button onClick={handleUpdatePermissions}>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar Permissões
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {!selectedUser && !loading && (
        <Card>
          <CardContent className="text-center py-12">
            <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Buscar Usuário</h3>
            <p className="text-muted-foreground">
              Use a busca acima para encontrar e selecionar um usuário para configurar suas permissões
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminUserPermissions;
