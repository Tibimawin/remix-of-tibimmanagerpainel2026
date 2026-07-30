import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Plus, Edit, Trash2, Save, X } from 'lucide-react';
import { Plan, AVAILABLE_FEATURES } from '@/types/planTypes';
import { usePlans } from '@/hooks/usePlans';

const AdminPlans = () => {
  const { plans, loading, createPlan, updatePlan, deletePlan, removeDuplicates } = usePlans();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    description: '',
    monthlyContentLimit: 0,
    features: [] as string[],
    blockingMessage: '',
    isActive: true
  });


  const handleOpenEditDialog = (plan?: Plan) => {
    if (plan) {
      setEditingPlan(plan);
      setFormData({
        name: plan.name,
        price: plan.price,
        description: plan.description,
        monthlyContentLimit: plan.monthlyContentLimit,
        features: plan.features,
        blockingMessage: plan.blockingMessage || '',
        isActive: plan.isActive
      });
    } else {
      setEditingPlan(null);
      setFormData({
        name: '',
        price: '',
        description: '',
        monthlyContentLimit: 0,
        features: [],
        blockingMessage: '',
        isActive: true
      });
    }
    setIsEditDialogOpen(true);
  };

  const handleSavePlan = async () => {
    try {
      if (editingPlan) {
        // Atualizar plano existente
        await updatePlan(editingPlan.id, formData);
      } else {
        // Criar novo plano
        await createPlan(formData);
      }

      setIsEditDialogOpen(false);
      setEditingPlan(null);
    } catch (error) {
      console.error('Erro ao salvar plano:', error);
    }
  };

  const handleDeletePlan = async (planId: string) => {
    try {
      await deletePlan(planId);
    } catch (error) {
      console.error('Erro ao deletar plano:', error);
    }
  };

  const handleFeatureToggle = (featureId: string) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features.includes(featureId)
        ? prev.features.filter(f => f !== featureId)
        : [...prev.features, featureId]
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Gerenciamento de Planos</h2>
          <p className="text-muted-foreground">Gerencie os planos disponíveis e suas configurações</p>
        </div>
        <div className="flex items-center gap-2">
        <Button variant="outline" onClick={removeDuplicates}>
          <Trash2 className="h-4 w-4 mr-2" />
          Remover duplicados
        </Button>
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenEditDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Plano
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingPlan ? 'Editar Plano' : 'Novo Plano'}
              </DialogTitle>
              <DialogDescription>
                Configure os detalhes e permissões do plano
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Nome do Plano</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="price">Preço</Label>
                  <Input
                    id="price"
                    value={formData.price}
                    onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                    placeholder="R$ 29,90/mês"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={2}
                />
              </div>

              <div>
                <Label htmlFor="monthlyLimit">Limite Mensal de Conteúdos</Label>
                <Input
                  id="monthlyLimit"
                  type="number"
                  value={formData.monthlyContentLimit}
                  onChange={(e) => setFormData(prev => ({ ...prev, monthlyContentLimit: parseInt(e.target.value) || 0 }))}
                  placeholder="0 = sem limite, -1 = ilimitado"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Use -1 para ilimitado ou 0 para sem acesso
                </p>
              </div>

              <div>
                <Label>Funcionalidades Incluídas</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {AVAILABLE_FEATURES.map((feature) => (
                    <div key={feature.id} className="flex items-center space-x-2">
                      <Switch
                        id={feature.id}
                        checked={formData.features.includes(feature.id)}
                        onCheckedChange={() => handleFeatureToggle(feature.id)}
                      />
                      <Label htmlFor={feature.id} className="text-sm">
                        {feature.name}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="blockingMessage">Mensagem de Bloqueio</Label>
                <Textarea
                  id="blockingMessage"
                  value={formData.blockingMessage}
                  onChange={(e) => setFormData(prev => ({ ...prev, blockingMessage: e.target.value }))}
                  rows={3}
                  placeholder="Mensagem exibida quando o usuário tentar acessar funcionalidades não disponíveis no plano"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
                />
                <Label htmlFor="isActive">Plano Ativo</Label>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
                <Button onClick={handleSavePlan}>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Planos Cadastrados</CardTitle>
          <CardDescription>
            Lista de todos os planos disponíveis no sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Preço</TableHead>
                <TableHead>Limite/Mês</TableHead>
                <TableHead>Funcionalidades</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plans.map((plan) => (
                <TableRow key={plan.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{plan.name}</div>
                      <div className="text-sm text-muted-foreground">{plan.description}</div>
                    </div>
                  </TableCell>
                  <TableCell>{plan.price}</TableCell>
                  <TableCell>
                    {plan.monthlyContentLimit === -1 ? 'Ilimitado' : 
                     plan.monthlyContentLimit === 0 ? 'Sem acesso' :
                     (plan.monthlyContentLimit ?? 0).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {plan.features.slice(0, 3).map((featureId) => {
                        const feature = AVAILABLE_FEATURES.find(f => f.id === featureId);
                        return (
                          <Badge key={featureId} variant="secondary" className="text-xs">
                            {feature?.name}
                          </Badge>
                        );
                      })}
                      {plan.features.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{plan.features.length - 3} mais
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={plan.isActive ? "default" : "destructive"}>
                      {plan.isActive ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenEditDialog(plan)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeletePlan(plan.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminPlans;
