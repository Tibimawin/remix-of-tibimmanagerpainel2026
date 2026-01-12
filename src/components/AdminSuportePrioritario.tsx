
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Crown, Search, Send, Edit, MessageCircle, Clock, AlertTriangle, CheckCircle, Filter, Mail, Phone, User, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { useSuportePrioritario } from '@/hooks/useSuportePrioritario';

export const AdminSuportePrioritario = () => {
  const {
    mensagens,
    configuracoes,
    loading,
    buscarMensagens,
    responderMensagem,
    atualizarStatus,
    atualizarPrioridade,
    atualizarConfiguracoes
  } = useSuportePrioritario();

  const [filtroStatus, setFiltroStatus] = useState<string>('todos');
  const [filtroPrioridade, setFiltroPrioridade] = useState<string>('todos');
  const [termoBusca, setTermoBusca] = useState('');
  const [mensagemSelecionada, setMensagemSelecionada] = useState<any>(null);
  const [respostaTexto, setRespostaTexto] = useState('');
  const [editandoConfig, setEditandoConfig] = useState(false);
  const [novasConfiguracoes, setNovasConfiguracoes] = useState(configuracoes);

  useEffect(() => {
    buscarMensagens();
  }, []);

  useEffect(() => {
    setNovasConfiguracoes(configuracoes);
  }, [configuracoes]);

  const mensagensFiltradas = mensagens.filter(mensagem => {
    const matchStatus = filtroStatus === 'todos' || mensagem.status === filtroStatus;
    const matchPrioridade = filtroPrioridade === 'todos' || mensagem.prioridade === filtroPrioridade;
    const matchBusca = !termoBusca || 
      mensagem.nome.toLowerCase().includes(termoBusca.toLowerCase()) ||
      mensagem.email.toLowerCase().includes(termoBusca.toLowerCase()) ||
      mensagem.assunto.toLowerCase().includes(termoBusca.toLowerCase()) ||
      mensagem.mensagem.toLowerCase().includes(termoBusca.toLowerCase());
    
    return matchStatus && matchPrioridade && matchBusca;
  });

  const handleResponder = async () => {
    if (!respostaTexto.trim() || !mensagemSelecionada) return;

    try {
      await responderMensagem(mensagemSelecionada.id, respostaTexto);
      setRespostaTexto('');
      setMensagemSelecionada(null);
      toast.success('Resposta enviada com sucesso!');
      buscarMensagens();
    } catch (error) {
      toast.error('Erro ao enviar resposta');
    }
  };

  const handleAtualizarStatus = async (mensagemId: string, novoStatus: string) => {
    try {
      await atualizarStatus(mensagemId, novoStatus);
      toast.success('Status atualizado!');
      buscarMensagens();
    } catch (error) {
      toast.error('Erro ao atualizar status');
    }
  };

  const handleAtualizarPrioridade = async (mensagemId: string, novaPrioridade: string) => {
    try {
      await atualizarPrioridade(mensagemId, novaPrioridade);
      toast.success('Prioridade atualizada!');
      buscarMensagens();
    } catch (error) {
      toast.error('Erro ao atualizar prioridade');
    }
  };

  const handleSalvarConfiguracoes = async () => {
    try {
      await atualizarConfiguracoes(novasConfiguracoes);
      setEditandoConfig(false);
      toast.success('Configurações salvas com sucesso!');
    } catch (error) {
      toast.error('Erro ao salvar configurações');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pendente':
        return <Badge variant="destructive">Pendente</Badge>;
      case 'respondido':
        return <Badge variant="default">Respondido</Badge>;
      case 'urgente':
        return <Badge className="bg-orange-500 text-white">Urgente</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getPrioridadeBadge = (prioridade: string) => {
    switch (prioridade) {
      case 'alta':
        return <Badge variant="destructive">Alta</Badge>;
      case 'media':
        return <Badge className="bg-yellow-500 text-white">Média</Badge>;
      case 'baixa':
        return <Badge variant="secondary">Baixa</Badge>;
      default:
        return <Badge variant="secondary">{prioridade}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Crown className="h-6 w-6 text-amber-600" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Suporte Prioritário</h1>
            <p className="text-muted-foreground">Gerenciar mensagens do suporte premium</p>
          </div>
        </div>
        
        <Dialog open={editandoConfig} onOpenChange={setEditandoConfig}>
          <DialogTrigger asChild>
            <Button variant="outline">
              <Edit className="h-4 w-4 mr-2" />
              Configurações
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Configurações do Suporte</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Email de Suporte</Label>
                <Input
                  value={novasConfiguracoes.emailSupporte}
                  onChange={(e) => setNovasConfiguracoes({
                    ...novasConfiguracoes,
                    emailSupporte: e.target.value
                  })}
                />
              </div>
              <div>
                <Label>Telefone</Label>
                <Input
                  value={novasConfiguracoes.telefone}
                  onChange={(e) => setNovasConfiguracoes({
                    ...novasConfiguracoes,
                    telefone: e.target.value
                  })}
                />
              </div>
              <div>
                <Label>WhatsApp</Label>
                <Input
                  value={novasConfiguracoes.whatsapp}
                  onChange={(e) => setNovasConfiguracoes({
                    ...novasConfiguracoes,
                    whatsapp: e.target.value
                  })}
                />
              </div>
              <div>
                <Label>Horário de Atendimento</Label>
                <Input
                  value={novasConfiguracoes.horarioAtendimento}
                  onChange={(e) => setNovasConfiguracoes({
                    ...novasConfiguracoes,
                    horarioAtendimento: e.target.value
                  })}
                />
              </div>
              <Button onClick={handleSalvarConfiguracoes} className="w-full">
                Salvar Configurações
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filtros e Busca */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros e Busca
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label>Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Nome, email, assunto..."
                  value={termoBusca}
                  onChange={(e) => setTermoBusca(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div>
              <Label>Status</Label>
              <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="respondido">Respondido</SelectItem>
                  <SelectItem value="urgente">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Prioridade</Label>
              <Select value={filtroPrioridade} onValueChange={setFiltroPrioridade}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="media">Média</SelectItem>
                  <SelectItem value="baixa">Baixa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-end">
              <Button onClick={buscarMensagens} variant="outline" className="w-full">
                <Search className="h-4 w-4 mr-2" />
                Atualizar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Mensagens */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Mensagens ({mensagensFiltradas.length})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Remetente</TableHead>
                <TableHead>Assunto</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Prioridade</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mensagensFiltradas.map((mensagem) => (
                <TableRow key={mensagem.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{mensagem.nome}</div>
                      <div className="text-sm text-muted-foreground">{mensagem.email}</div>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">{mensagem.assunto}</TableCell>
                  <TableCell>
                    <Select
                      value={mensagem.status}
                      onValueChange={(value) => handleAtualizarStatus(mensagem.id, value)}
                    >
                      <SelectTrigger className="w-auto">
                        <SelectValue asChild>
                          {getStatusBadge(mensagem.status)}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pendente">Pendente</SelectItem>
                        <SelectItem value="respondido">Respondido</SelectItem>
                        <SelectItem value="urgente">Urgente</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={mensagem.prioridade}
                      onValueChange={(value) => handleAtualizarPrioridade(mensagem.id, value)}
                    >
                      <SelectTrigger className="w-auto">
                        <SelectValue asChild>
                          {getPrioridadeBadge(mensagem.prioridade)}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="alta">Alta</SelectItem>
                        <SelectItem value="media">Média</SelectItem>
                        <SelectItem value="baixa">Baixa</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(mensagem.dataEnvio).toLocaleDateString('pt-BR')}
                  </TableCell>
                  <TableCell>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setMensagemSelecionada(mensagem)}
                        >
                          <MessageCircle className="h-4 w-4 mr-1" />
                          Ver
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Mensagem de {mensagem.nome}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label>Remetente</Label>
                              <p className="text-sm">{mensagem.nome}</p>
                            </div>
                            <div>
                              <Label>Email</Label>
                              <p className="text-sm">{mensagem.email}</p>
                            </div>
                            <div>
                              <Label>Assunto</Label>
                              <p className="text-sm">{mensagem.assunto}</p>
                            </div>
                            <div>
                              <Label>Data</Label>
                              <p className="text-sm">{new Date(mensagem.dataEnvio).toLocaleString('pt-BR')}</p>
                            </div>
                          </div>
                          
                          <div>
                            <Label>Mensagem</Label>
                            <div className="bg-muted p-3 rounded-md mt-1">
                              <p className="text-sm whitespace-pre-wrap">{mensagem.mensagem}</p>
                            </div>
                          </div>

                          {mensagem.historico && mensagem.historico.length > 0 && (
                            <div>
                              <Label>Histórico de Respostas</Label>
                              <div className="space-y-2 mt-2">
                                {mensagem.historico.map((resposta: any, index: number) => (
                                  <div key={index} className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md">
                                    <div className="flex items-center justify-between mb-1">
                                      <Badge variant="outline">Admin</Badge>
                                      <span className="text-xs text-muted-foreground">
                                        {new Date(resposta.data).toLocaleString('pt-BR')}
                                      </span>
                                    </div>
                                    <p className="text-sm">{resposta.texto}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          <Separator />
                          
                          <div>
                            <Label>Responder</Label>
                            <Textarea
                              value={respostaTexto}
                              onChange={(e) => setRespostaTexto(e.target.value)}
                              placeholder="Digite sua resposta..."
                              rows={4}
                              className="mt-1"
                            />
                            <Button
                              onClick={handleResponder}
                              className="mt-2"
                              disabled={!respostaTexto.trim()}
                            >
                              <Send className="h-4 w-4 mr-2" />
                              Enviar Resposta
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {mensagensFiltradas.length === 0 && (
            <div className="text-center py-8">
              <MessageCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Nenhuma mensagem encontrada</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
