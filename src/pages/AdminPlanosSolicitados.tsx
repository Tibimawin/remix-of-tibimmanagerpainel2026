
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Crown, Check, X, Clock, User, Mail, Calendar, MessageSquare, RefreshCw } from 'lucide-react';
import { usePlanRequests } from '@/hooks/usePlanRequests';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const AdminPlanosSolicitados = () => {
  const { requests, loading, loadRequests, updateRequestStatus } = usePlanRequests();
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Data não disponível';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return format(date, 'dd/MM/yyyy HH:mm', { locale: ptBR });
    } catch (error) {
      return 'Data inválida';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-600"><Clock className="w-3 h-3 mr-1" />Pendente</Badge>;
      case 'approved':
        return <Badge variant="outline" className="text-green-600 border-green-600"><Check className="w-3 h-3 mr-1" />Aprovado</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="text-red-600 border-red-600"><X className="w-3 h-3 mr-1" />Rejeitado</Badge>;
      default:
        return <Badge variant="outline">Desconhecido</Badge>;
    }
  };

  const handleAction = async (requestId: string, action: 'approved' | 'rejected') => {
    setActionLoading(true);
    try {
      await updateRequestStatus(requestId, action, adminNotes);
      setSelectedRequest(null);
      setAdminNotes('');
    } catch (error) {
      console.error('Erro ao processar ação:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const pendingCount = requests.filter(r => r.status === 'pending').length;
  const approvedCount = requests.filter(r => r.status === 'approved').length;
  const rejectedCount = requests.filter(r => r.status === 'rejected').length;

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Carregando solicitações...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center">
              <Crown className="w-8 h-8 mr-3 text-primary" />
              Planos Solicitados
            </h1>
            <p className="text-muted-foreground mt-2">
              Gerencie as solicitações de planos dos usuários
            </p>
          </div>
          <Button onClick={loadRequests} variant="outline" className="modern-button">
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
        </div>

        {/* Cards de Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="modern-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total</CardTitle>
              <Crown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{requests.length}</div>
              <p className="text-xs text-muted-foreground">solicitações</p>
            </CardContent>
          </Card>

          <Card className="modern-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{pendingCount}</div>
              <p className="text-xs text-muted-foreground">aguardando análise</p>
            </CardContent>
          </Card>

          <Card className="modern-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Aprovados</CardTitle>
              <Check className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{approvedCount}</div>
              <p className="text-xs text-muted-foreground">solicitações aprovadas</p>
            </CardContent>
          </Card>

          <Card className="modern-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Rejeitados</CardTitle>
              <X className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{rejectedCount}</div>
              <p className="text-xs text-muted-foreground">solicitações rejeitadas</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabela de Solicitações */}
        <Card className="modern-card">
          <CardHeader>
            <CardTitle className="text-card-foreground">Lista de Solicitações</CardTitle>
            <CardDescription>
              Gerencie todas as solicitações de planos dos usuários
            </CardDescription>
          </CardHeader>
          <CardContent>
            {requests.length === 0 ? (
              <div className="text-center py-12">
                <Crown className="w-16 h-16 mx-auto mb-4 opacity-20" />
                <p className="text-muted-foreground font-medium">Nenhuma solicitação encontrada</p>
                <p className="text-muted-foreground/70 text-sm mt-2">
                  As solicitações de planos aparecerão aqui
                </p>
              </div>
            ) : (
              <div className="modern-table">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuário</TableHead>
                      <TableHead>Plano</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <User className="w-4 h-4 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">{request.userName}</p>
                              <p className="text-sm text-muted-foreground flex items-center">
                                <Mail className="w-3 h-3 mr-1" />
                                {request.userEmail}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{request.planName}</p>
                            <p className="text-sm text-muted-foreground">{request.planPrice}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center text-sm">
                            <Calendar className="w-3 h-3 mr-1" />
                            {formatDate(request.requestDate)}
                          </div>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(request.status)}
                        </TableCell>
                        <TableCell>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => {
                                  setSelectedRequest(request);
                                  setAdminNotes('');
                                }}
                              >
                                Ver Detalhes
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-md">
                              <DialogHeader>
                                <DialogTitle>Detalhes da Solicitação</DialogTitle>
                                <DialogDescription>
                                  Solicitação de {selectedRequest?.planName}
                                </DialogDescription>
                              </DialogHeader>
                              
                              {selectedRequest && (
                                <div className="space-y-4">
                                  <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                      <p className="font-medium text-muted-foreground">Usuário:</p>
                                      <p>{selectedRequest.userName}</p>
                                    </div>
                                    <div>
                                      <p className="font-medium text-muted-foreground">Email:</p>
                                      <p>{selectedRequest.userEmail}</p>
                                    </div>
                                    <div>
                                      <p className="font-medium text-muted-foreground">Plano:</p>
                                      <p>{selectedRequest.planName}</p>
                                    </div>
                                    <div>
                                      <p className="font-medium text-muted-foreground">Preço:</p>
                                      <p>{selectedRequest.planPrice}</p>
                                    </div>
                                    <div className="col-span-2">
                                      <p className="font-medium text-muted-foreground">Data:</p>
                                      <p>{formatDate(selectedRequest.requestDate)}</p>
                                    </div>
                                    <div className="col-span-2">
                                      <p className="font-medium text-muted-foreground">Status:</p>
                                      {getStatusBadge(selectedRequest.status)}
                                    </div>
                                  </div>

                                  {selectedRequest.userMessage && (
                                    <div>
                                      <p className="font-medium text-muted-foreground mb-2 flex items-center">
                                        <MessageSquare className="w-3 h-3 mr-1" />
                                        Mensagem do usuário:
                                      </p>
                                      <p className="text-sm bg-muted p-3 rounded-lg">{selectedRequest.userMessage}</p>
                                    </div>
                                  )}

                                  {selectedRequest.adminNotes && (
                                    <div>
                                      <p className="font-medium text-muted-foreground mb-2">Notas do administrador:</p>
                                      <p className="text-sm bg-muted p-3 rounded-lg">{selectedRequest.adminNotes}</p>
                                    </div>
                                  )}

                                  {selectedRequest.status === 'pending' && (
                                    <div>
                                      <p className="font-medium text-muted-foreground mb-2">Notas do administrador:</p>
                                      <Textarea
                                        value={adminNotes}
                                        onChange={(e) => setAdminNotes(e.target.value)}
                                        placeholder="Adicione observações sobre esta solicitação (opcional)..."
                                        rows={3}
                                      />
                                    </div>
                                  )}
                                </div>
                              )}

                              {selectedRequest?.status === 'pending' && (
                                <DialogFooter className="flex space-x-2">
                                  <Button
                                    variant="outline"
                                    onClick={() => handleAction(selectedRequest.id!, 'rejected')}
                                    disabled={actionLoading}
                                    className="text-red-600 border-red-600 hover:bg-red-50"
                                  >
                                    <X className="w-4 h-4 mr-2" />
                                    Rejeitar
                                  </Button>
                                  <Button
                                    onClick={() => handleAction(selectedRequest.id!, 'approved')}
                                    disabled={actionLoading}
                                    className="modern-button bg-green-600 hover:bg-green-700"
                                  >
                                    <Check className="w-4 h-4 mr-2" />
                                    Aprovar
                                  </Button>
                                </DialogFooter>
                              )}
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminPlanosSolicitados;
