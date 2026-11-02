import React, { useEffect, useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { Sparkles, Mail, Lock, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useResellerAuth } from '@/contexts/ResellerAuthContext';

export const ResellerLogin: React.FC = () => {
  const { user, isLoading, isAuthenticated, login } = useResellerAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    document.title = 'Portal de Revendas — Entrar';
  }, []);

  if (!isLoading && isAuthenticated) return <Navigate to="/revendas-creditos/dashboard" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    const res = await login(email, password);
    if (!res.success) setError(res.message || 'Não foi possível entrar.');
    setBusy(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-slate-100">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 shadow-lg shadow-amber-500/20">
            <Sparkles className="h-7 w-7 text-slate-950" />
          </div>
          <h1 className="text-2xl font-bold">Portal de Revendas</h1>
          <p className="mt-1 text-sm text-slate-400">Gerencie suas linhas e créditos</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur">
          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-slate-300">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com"
                className="border-slate-700 bg-slate-950 pl-9 text-slate-100 placeholder:text-slate-600" required />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-slate-300">Senha</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••"
                className="border-slate-700 bg-slate-950 pl-9 text-slate-100 placeholder:text-slate-600" required />
            </div>
          </div>
          <Button type="submit" disabled={busy || isLoading}
            className="w-full bg-gradient-to-r from-amber-400 to-amber-600 font-semibold text-slate-950 hover:from-amber-300 hover:to-amber-500">
            <LogIn className="mr-2 h-4 w-4" />
            {busy ? 'Entrando…' : 'Entrar'}
          </Button>
          <p className="text-center text-sm text-slate-400">
            Ainda não tem conta?{' '}
            <Link to="/revendas-creditos/cadastro" className="text-amber-300 hover:underline">
              Cadastre-se com o link de indicação
            </Link>
          </p>
        </form>
        <p className="mt-6 text-center text-xs text-slate-600">
          Portal exclusivo para revendedores. Clientes do painel acessam pela entrada principal.
        </p>
      </div>
    </div>
  );
};

export default ResellerLogin;
