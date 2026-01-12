import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserPlus, User } from 'lucide-react';
import { toast } from 'sonner';
import { FirebaseUserService } from '@/services/FirebaseUserService';

interface AdminUsersProps {
  onUserCreated: () => void;
}

const AdminUsers: React.FC<AdminUsersProps> = ({ onUserCreated }) => {
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    senha: '',
    dias: '30',
    pagamento: new Date().toISOString().split('T')[0]
  });
  const [isSubmitting, setIsSubmitting] = useState(false);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nome || !formData.email || !formData.senha) {
      toast.error('Todos os campos são obrigatórios');
      return;
    }

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error('Por favor, insira um email válido');
      return;
    }

    // Validar dias
    const dias = parseInt(formData.dias);
    if (isNaN(dias) || dias <= 0) {
      toast.error('Número de dias deve ser maior que zero');
      return;
    }

    setIsSubmitting(true);

    try {
      // Criar usuário no Firebase Auth e Firestore
      const userData = {
        name: formData.nome,
        email: formData.email,
        password: formData.senha,
        accessDays: dias,
        startDate: new Date(formData.pagamento).toISOString()
      };

      console.log('Criando usuário no Firebase:', userData);
      
      const createdUser = await FirebaseUserService.createUser(userData);
      console.log('Usuário criado com sucesso:', createdUser);
      
      toast.success(`Usuário ${formData.nome} criado com sucesso!`);
      
      // Registrar log da ação no Firebase
      try {
        const { firebaseLogService } = await import('@/services/FirebaseLogService');
        await firebaseLogService.addLog(
          'admin',
          'Cadastro de usuário',
          `Novo usuário cadastrado: ${formData.email} (${formData.nome})`
        );
      } catch (error) {
        console.error('Erro ao salvar log no Firebase:', error);
      }

      // Limpar formulário
      setFormData({
        nome: '',
        email: '',
        senha: '',
        dias: '30',
        pagamento: new Date().toISOString().split('T')[0]
      });

      // Notificar o componente pai para atualizar a lista
      onUserCreated();
      
    } catch (error: any) {
      console.error('Erro ao criar usuário:', error);
      toast.error('Erro ao criar usuário. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      email: '',
      senha: '',
      dias: '30',
      pagamento: new Date().toISOString().split('T')[0]
    });
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <Card className="modern-card border-border/40">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <UserPlus className="w-5 h-5 mr-2 text-primary" />
            Cadastrar Novo Usuário
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Adicione um novo usuário ao sistema com acesso personalizado
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nome" className="text-foreground">Nome Completo *</Label>
                <Input
                  id="nome"
                  type="text"
                  value={formData.nome}
                  onChange={(e) => setFormData({...formData, nome: e.target.value})}
                  className="modern-input text-white"
                  placeholder="Digite o nome completo"
                  required
                  disabled={isSubmitting}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="modern-input text-white"
                  placeholder="usuario@email.com"
                  required
                  disabled={isSubmitting}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="senha" className="text-foreground">Senha *</Label>
              <Input
                id="senha"
                type="password"
                value={formData.senha}
                onChange={(e) => setFormData({...formData, senha: e.target.value})}
                className="modern-input text-white"
                placeholder="Digite uma senha segura"
                required
                disabled={isSubmitting}
                minLength={6}
              />
              <p className="text-xs text-muted-foreground">Mínimo de 6 caracteres</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dias" className="text-foreground">Dias de Acesso *</Label>
                <Input
                  id="dias"
                  type="number"
                  value={formData.dias}
                  onChange={(e) => setFormData({...formData, dias: e.target.value})}
                  className="modern-input text-white"
                  placeholder="30"
                  min="1"
                  required
                  disabled={isSubmitting}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="pagamento" className="text-foreground">Data de Início</Label>
                <Input
                  id="pagamento"
                  type="date"
                  value={formData.pagamento}
                  onChange={(e) => setFormData({...formData, pagamento: e.target.value})}
                  className="modern-input text-white"
                  disabled={isSubmitting}
                />
              </div>
            </div>
            
            <div className="flex space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={resetForm}
                disabled={isSubmitting}
                className="flex-1 border-border/60 text-foreground hover:bg-accent/10"
              >
                Limpar
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="flex-1 btn-primary"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Criando...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Criar Usuário
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Informações Adicionais */}
      <Card className="modern-card border-border/40">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <User className="w-5 h-5 mr-2 text-primary" />
            Informações sobre Cadastro
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-foreground">
            <h4 className="font-medium mb-2">Como funciona:</h4>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>• O usuário será cadastrado no sistema com as credenciais fornecidas</li>
              <li>• O período de acesso começará na data especificada</li>
              <li>• O usuário poderá fazer login imediatamente após a criação</li>
              <li>• Todos os cadastros são registrados nos logs do sistema</li>
            </ul>
          </div>
          
          <div className="text-foreground">
            <h4 className="font-medium mb-2">Requisitos:</h4>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>• Email deve ser único no sistema</li>
              <li>• Senha deve ter pelo menos 6 caracteres</li>
              <li>• Período de acesso deve ser maior que zero</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminUsers;
