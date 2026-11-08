import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { History, Search, RefreshCw, User, Calendar, Activity } from 'lucide-react';
import { toast } from 'sonner';
import { db } from '@/config/firebase';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';

interface UserActionLog {
  id: string;
  userEmail: string;
  action: string;
  details: string;
  timestamp: string;
}

const AdminUserActionHistory: React.FC = () => {
  const [actions, setActions] = useState<UserActionLog[]>([]);
  const [filteredActions, setFilteredActions] = useState<UserActionLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<string>('');

  const fetchUserActions = useCallback(async () => {
    try {
      setIsLoading(true);
      console.log('Buscando histórico de ações dos usuários...');

      let fetchedActions: UserActionLog[] = [];

      // 1. Tentar buscar do Firestore
      try {
        const q = query(collection(db, 'system_logs'), orderBy('createdAt', 'desc'), limit(200));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          fetchedActions = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              userEmail: data.userEmail || 'Usuário desconhecido',
              action: data.action || 'Ação não especificada',
              details: data.details || '',
              timestamp: data.timestamp || new Date().toLocaleString('pt-BR')
            };
          });
        }
      } catch (fbErr) {
        console.warn('AdminUserActionHistory: Aviso ao buscar do Firestore:', fbErr);
      }

      // 2. Se vazio ou como complemento, carregar do localStorage
      if (fetchedActions.length === 0) {
        try {
          const localLogs = JSON.parse(localStorage.getItem('system-logs') || '[]');
          if (Array.isArray(localLogs) && localLogs.length > 0) {
            fetchedActions = localLogs.map((log: any, index: number) => ({
              id: log.id || `action_${index}`,
              userEmail: log.userEmail || 'Usuário desconhecido',
              action: log.action || 'Ação não especificada',
              details: log.details || '',
              timestamp: log.timestamp || new Date().toLocaleString('pt-BR')
            }));
          }
        } catch (localErr) {
          console.warn('AdminUserActionHistory: Erro ao carregar localStorage:', localErr);
        }
      }

      setActions(fetchedActions);
      setFilteredActions(fetchedActions);
      console.log('Ações carregadas com sucesso:', fetchedActions.length);
    } catch (error) {
      console.error('Erro ao buscar ações dos usuários:', error);
      toast.error('Erro ao carregar histórico de ações dos usuários');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Filtrar ações baseado na busca e usuário selecionado
  useEffect(() => {
    let filtered = actions;

    if (searchTerm) {
      filtered = filtered.filter(action =>
        action.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        action.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
        action.userEmail.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedUser) {
      filtered = filtered.filter(action => action.userEmail === selectedUser);
    }

    setFilteredActions(filtered);
  }, [searchTerm, selectedUser, actions]);

  // Carregar dados ao montar o componente
  useEffect(() => {
    fetchUserActions();
  }, [fetchUserActions]);

  // Obter lista única de usuários
  const uniqueUsers = Array.from(new Set(actions.map(action => action.userEmail))).sort();

  const getCategoryBadge = (action: string) => {
    if (action.includes('Login') || action.includes('login')) {
      return <Badge variant="default" className="bg-green-500/20 text-green-400 border-green-500/30">Login</Badge>;
    }
    if (action.includes('Logout') || action.includes('logout')) {
      return <Badge variant="secondary" className="bg-gray-500/20 text-gray-400 border-gray-500/30">Logout</Badge>;
    }
    if (action.includes('Navegação') || action.includes('navegou')) {
      return <Badge variant="outline" className="bg-blue-500/20 text-blue-400 border-blue-500/30">Navegação</Badge>;
    }
    if (action.includes('Suporte')) {
      return <Badge variant="outline" className="bg-purple-500/20 text-purple-400 border-purple-500/30">Suporte</Badge>;
    }
    return <Badge variant="secondary">Geral</Badge>;
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <Card className="modern-card bg-gradient-to-br from-card to-card/80 border-border/40">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <History className="w-5 h-5 text-primary" />
            Histórico de Ações dos Usuários
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Visualize todas as ações realizadas pelos usuários no sistema ({actions.length} registros)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filtros */}
          <div className="mb-6 space-y-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Buscar por ação, detalhes ou usuário..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 modern-input"
                  />
                </div>
              </div>

              <div className="w-64">
                <select
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">Todos os usuários</option>
                  {uniqueUsers.map(user => (
                    <option key={user} value={user}>{user}</option>
                  ))}
                </select>
              </div>

              <Button
                onClick={fetchUserActions}
                disabled={isLoading}
                variant="outline"
                className="border-border/60 hover:bg-accent/10"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
            </div>

            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4" />
                <span>{filteredActions.length} ações filtradas</span>
              </div>
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                <span>{uniqueUsers.length} usuários únicos</span>
              </div>
            </div>
          </div>

          {/* Tabela */}
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Carregando histórico de ações...</p>
            </div>
          ) : filteredActions.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/40 hover:bg-muted/20">
                    <TableHead className="text-muted-foreground font-medium">Data/Hora</TableHead>
                    <TableHead className="text-muted-foreground font-medium">Usuário</TableHead>
                    <TableHead className="text-muted-foreground font-medium">Categoria</TableHead>
                    <TableHead className="text-muted-foreground font-medium">Ação</TableHead>
                    <TableHead className="text-muted-foreground font-medium">Detalhes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredActions.map((action) => (
                    <TableRow key={action.id} className="border-border/40 hover:bg-muted/10 transition-colors">
                      <TableCell className="text-muted-foreground text-sm">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          {action.timestamp}
                        </div>
                      </TableCell>
                      <TableCell className="text-foreground font-medium">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-primary rounded-full"></div>
                          {action.userEmail}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getCategoryBadge(action.action)}
                      </TableCell>
                      <TableCell className="text-foreground">
                        {action.action}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm max-w-md">
                        <div className="truncate" title={action.details}>
                          {action.details || '-'}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="flex items-center justify-center w-16 h-16 bg-muted/20 rounded-full mb-4 mx-auto">
                <History className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-foreground font-medium">Nenhuma ação encontrada</p>
              <p className="text-xs text-muted-foreground mt-1">
                {searchTerm || selectedUser
                  ? 'Nenhuma ação corresponde aos filtros aplicados'
                  : 'Ainda não há ações registradas no sistema'
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminUserActionHistory;