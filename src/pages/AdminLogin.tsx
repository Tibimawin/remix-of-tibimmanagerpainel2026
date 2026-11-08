
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { Loader2, AlertCircle, Shield } from 'lucide-react';

const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login, isAuthenticated, loginWithGoogle } = useAdminAuth();
  const navigate = useNavigate();

  // Se já estiver autenticado como admin, redirecionar para o dashboard admin
  useEffect(() => {
    if (isAuthenticated) {
      console.log('Admin já autenticado, redirecionando para /admin-dashboard');
      navigate('/admin-dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const success = await login(email, password);
      
      if (success) {
        navigate('/admin-dashboard', { replace: true });
      } else {
        setError('Credenciais inválidas ou usuário sem permissão de administrador.');
      }
    } catch (error) {
      setError('Erro de conexão. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="grid lg:grid-cols-2 min-h-screen">
        {/* Seção Principal */}
        <div className="flex items-center justify-center p-8">
          <div className="w-full max-w-md space-y-8 modern-animate-in">
            {/* Header */}
            <div className="text-center space-y-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-blue-600 shadow-minimal">
                <Shield className="h-8 w-8 text-white" />
              </div>
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight text-foreground">
                  Painel Administrativo
                </h1>
                <p className="text-muted-foreground">
                  Acesso restrito apenas para administradores
                </p>
              </div>
            </div>

            {/* Formulário de Login */}
            <Card className="modern-card shadow-soft">
              <CardContent className="p-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-foreground font-medium">
                        Email do Administrador
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        disabled={isLoading}
                        placeholder="admin@admin.com"
                        autoComplete="email"
                        className="modern-input text-foreground h-12"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="password" className="text-foreground font-medium">
                        Senha
                      </Label>
                      <Input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        disabled={isLoading}
                        placeholder="Digite sua senha"
                        autoComplete="current-password"
                        className="modern-input text-foreground h-12"
                      />
                    </div>
                  </div>

                  {error && (
                    <Alert variant="destructive" className="border border-red-200 bg-red-50">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="text-red-700">{error}</AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-3">
                    <Button 
                      type="submit" 
                      className="w-full h-12 modern-button text-lg font-semibold"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Verificando credenciais...
                        </>
                      ) : (
                        'Acessar Painel Admin'
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full h-12"
                      disabled={isLoading}
                      onClick={async () => {
                        setError('');
                        setIsLoading(true);
                        const ok = await loginWithGoogle();
                        setIsLoading(false);
                        if (ok) navigate('/admin-dashboard', { replace: true });
                        else setError('Falha ao autenticar com Google ou conta sem permissão.');
                      }}
                    >
                      Entrar com Google
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
            
            <div className="text-center">
              <p className="text-xs text-muted-foreground">
                Apenas administradores autorizados podem acessar este painel.
              </p>
            </div>
          </div>
        </div>

        {/* Seção de Benefícios/Info */}
        <div className="hidden lg:flex bg-gradient-to-br from-primary/5 to-blue-600/5 p-8 items-center backdrop-blur-sm border-l border-border">
          <div className="max-w-md mx-auto space-y-8">
            <div className="space-y-6">
              <h2 className="text-3xl font-bold text-foreground">
                Controle Total
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Gerencie todos os aspectos do sistema com ferramentas administrativas avançadas e seguras.
              </p>
            </div>
            
            <div className="space-y-6">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-primary to-blue-600 rounded-xl flex items-center justify-center shadow-minimal">
                  <span className="text-white font-bold">1</span>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">Gestão de Usuários</h3>
                  <p className="text-sm text-muted-foreground">
                    Controle completo sobre contas de usuário, permissões e acessos.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-primary to-blue-600 rounded-xl flex items-center justify-center shadow-minimal">
                  <span className="text-white font-bold">2</span>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">Monitoramento</h3>
                  <p className="text-sm text-muted-foreground">
                    Acompanhe atividades e logs do sistema em tempo real.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-primary to-blue-600 rounded-xl flex items-center justify-center shadow-minimal">
                  <span className="text-white font-bold">3</span>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">Configurações</h3>
                  <p className="text-sm text-muted-foreground">
                    Ajuste parâmetros globais e configurações do sistema.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
