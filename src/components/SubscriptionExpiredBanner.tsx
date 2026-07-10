import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, X, CreditCard, Clock } from 'lucide-react';
import { useAccessControl } from '@/hooks/useAccessControl';
import { useNavigate } from 'react-router-dom';

const SubscriptionExpiredBanner: React.FC = () => {
  const { isExpired, expiryDate } = useAccessControl();
  const [dismissed, setDismissed] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const navigate = useNavigate();

  useEffect(() => {
    if (!isExpired) return;
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, [isExpired]);

  if (!isExpired || dismissed) return null;

  const expiredAt = expiryDate ? new Date(expiryDate) : null;
  const diffMs = expiredAt ? now - expiredAt.getTime() : 0;
  const diffDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  const diffHours = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60)));

  const timeSinceLabel = expiredAt
    ? diffDays >= 1
      ? `Expirou há ${diffDays} ${diffDays === 1 ? 'dia' : 'dias'}`
      : `Expirou há ${diffHours} ${diffHours === 1 ? 'hora' : 'horas'}`
    : 'Assinatura expirada';

  return (
    <div className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 p-4 flex items-center gap-3 flex-wrap">
      <div className="flex items-center gap-3 flex-1 min-w-[240px]">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/20 shrink-0">
          <AlertTriangle className="h-5 w-5 text-destructive" />
        </div>
        <div className="space-y-1">
          <p className="font-semibold text-foreground">
            Sua assinatura expirou
          </p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1 rounded-full bg-destructive/15 text-destructive px-2 py-0.5 text-xs font-medium">
              <Clock className="h-3 w-3" />
              {timeSinceLabel}
            </span>
            {expiredAt && (
              <span className="text-xs">
                Vencimento: {expiredAt.toLocaleDateString('pt-BR')}
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Renove agora para liberar todas as funcionalidades do painel.
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          onClick={() => navigate('/pedido')}
          className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
        >
          <CreditCard className="h-4 w-4 mr-1" />
          Renovar agora
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          onClick={() => setDismissed(true)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default SubscriptionExpiredBanner;