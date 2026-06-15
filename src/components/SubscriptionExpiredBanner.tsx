import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, X, CreditCard } from 'lucide-react';
import { useAccessControl } from '@/hooks/useAccessControl';
import { useNavigate } from 'react-router-dom';

const SubscriptionExpiredBanner: React.FC = () => {
  const { isExpired, expiryDate } = useAccessControl();
  const [dismissed, setDismissed] = useState(false);
  const navigate = useNavigate();

  if (!isExpired || dismissed) return null;

  return (
    <div className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 p-4 flex items-center gap-3 flex-wrap">
      <div className="flex items-center gap-3 flex-1 min-w-[240px]">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/20 shrink-0">
          <AlertTriangle className="h-5 w-5 text-destructive" />
        </div>
        <div>
          <p className="font-semibold text-foreground">
            Sua assinatura expirou
          </p>
          <p className="text-sm text-muted-foreground">
            {expiryDate
              ? `Expirou em ${new Date(expiryDate).toLocaleDateString('pt-BR')}. `
              : ''}
            Renove agora para liberar todas as funcionalidades do painel.
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          onClick={() => navigate('/planos')}
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