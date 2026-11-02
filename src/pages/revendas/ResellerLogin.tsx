import React, { useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { Sparkles, Loader2, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { useResellerAuth } from '@/contexts/ResellerAuthContext';
import { ResellerService } from '@/services/ResellerService';

/**
 * /revendas-creditos/login — login do revendedor com conta própria,
 * totalmente isolada do painel master.
 */
export const ResellerLogin: React.FC = () => {
  const { user, isAuthenticated, isLoading, isResellerAccount, login, logout } = useResellerAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (isAuthenticated && !isLoading && isResellerAccount) {
    return <Navigate to="/revendas-creditos/dashboard" replace />;
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(email, password);
      // Sincroniza o vínculo de indicação pendente caso haja
      try {
        const ref = localStorage.getItem('reseller-pending-ref') || '';
        if (ref) await ResellerService.signup({ ref });
        localStorage.removeItem('reseller-pending-ref');
      } catch { /* vínculo será feito pela tela de cadastro */ }
      toast.success('Login realizado!');
      window.location.assign('/revendas-creditos/dashboard');
    } catch (err: any) {
      setError(err?.message || 'Não foi possível entrar.');
    } finally {
      setBusy(false);
    }
  };

  const handleSwitchAccount = async () => {
    await logout();
    setEmail('');
    setPassword('');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10 text-slate-100">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 shadow-lg shadow-amber-500/20">
            <Sparkles className="h-7 w-7 text-slate-950" />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold">Portal de Revendas</h1>
            <p className="text-sm text-slate-400">Acesse sua carteira de créditos</p>
          </div>
        </div>

        {isAuthenticated && (
          <div className="mb-4 rounded-xl border border-amber-400/30 bg-amber-400/10 p-3 text-xs text-amber-200">
            <p className="font-semibold">Conectado como {user?.email}</p>
            <p className="mt-1 text-slate-400">Para entrar como revendedor, faça login abaixo ou saia da conta atual.</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSwitchAccount}
              className="mt-2 w-full border-amber-400/40 text-amber-300 hover:bg-amber-400/20"
            >
              Entrar com outra conta
            </Button>
          </div>
        )}

        <form onSubmit={submit} className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</div>
          )}
          <div className="space-y-2">
            <Label htmlFor="reseller-email" className="text-slate-300">E-mail</Label>
            <Input id="reseller-email" type="email" required value={email}
              onChange={e => setEmail(e.target.value)} placeholder="voce@email.com"
              className="border-slate-700 bg-slate-950 text-slate-100" autoComplete="email" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reseller-pass" className="text-slate-300">Senha</Label>
            <Input id="reseller-pass" type="password" required value={password}
              onChange={e => setPassword(e.target.value)} placeholder="••••••••"
              className="border-slate-700 bg-slate-950 text-slate-100" autoComplete="current-password" />
          </div>
          <Button type="submit" disabled={busy}
            className="w-full bg-gradient-to-r from-amber-400 to-amber-600 font-semibold text-slate-950 hover:from-amber-300 hover:to-amber-500">
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
            {busy ? 'Entrando…' : 'Entrar'}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-400">
          Ainda não tem conta?{' '}
          <Link to="/revendas-creditos/cadastro" className="font-medium text-amber-300 hover:underline">
            Cadastrar com o link de indicação
          </Link>
        </p>
      </div>
    </div>
  );
};

export default ResellerLogin;
