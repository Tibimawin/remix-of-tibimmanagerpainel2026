import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSimpleAuth } from '@/contexts/SimpleAuthContext';
import { Button } from '@/components/ui/button';
import { Sparkles, UserPlus, LogOut, ShieldAlert } from 'lucide-react';

export const DemoModeBanner: React.FC = () => {
  const { userInfo, logout } = useSimpleAuth();
  const navigate = useNavigate();

  if (!userInfo?.isDemo) {
    return null;
  }

  return (
    <aside aria-label="Aviso de Modo Demonstração" className="relative mb-6 rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/15 p-4 sm:p-5 shadow-lg overflow-hidden backdrop-blur-md">
      {/* Luz ambiente animada de fundo */}
      <div className="absolute -top-12 -left-12 w-32 h-32 bg-amber-500/20 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-orange-500/20 rounded-full blur-2xl pointer-events-none" />

      <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/30 shrink-0">
            <Sparkles className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 border border-amber-500/30 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-amber-300">
                <ShieldAlert className="w-3.5 h-3.5" />
                Modo Demonstração Ativo
              </span>
              <span className="text-xs text-muted-foreground hidden sm:inline">
                Ambiente de Testes Seguro
              </span>
            </div>
            <p className="text-xs sm:text-sm text-foreground/90 mt-1 font-medium leading-relaxed">
              Você está explorando o painel em modo prévia. Todos os conteúdos, métricas e opções são simulados — nenhuma alteração afetará bancos de dados reais.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto shrink-0 pt-1 md:pt-0">
          <Button
            size="sm"
            onClick={() => navigate('/cadastro')}
            className="flex-1 md:flex-initial h-9 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold text-xs shadow-md shadow-orange-500/20 gap-1.5 transition-all hover:scale-[1.02]"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Criar Conta Real
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => logout()}
            className="flex-1 md:flex-initial h-9 rounded-xl border-amber-500/30 hover:bg-amber-500/10 text-foreground text-xs font-medium gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5 text-muted-foreground" />
            Sair da Demo
          </Button>
        </div>
      </div>
    </aside>
  );
};
