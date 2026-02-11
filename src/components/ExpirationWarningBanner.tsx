import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Calendar, X } from 'lucide-react';
import { useExpirationNotifications } from '@/hooks/useExpirationNotifications';

interface ExpirationWarningBannerProps {
  onRenewClick?: () => void;
  showDismiss?: boolean;
}

const ExpirationWarningBanner: React.FC<ExpirationWarningBannerProps> = ({ 
  onRenewClick, 
  showDismiss = false 
}) => {
  const navigate = useNavigate();
  const { 
    hasExpirationWarning, 
    getDaysRemaining, 
    getExpiryDate,
    dismissNotification
  } = useExpirationNotifications();

  if (!hasExpirationWarning()) {
    return null;
  }

  const daysRemaining = getDaysRemaining();
  const expiryDate = getExpiryDate();

  const getBannerVariant = () => {
    if (daysRemaining <= 1) return 'destructive';
    if (daysRemaining <= 3) return 'default';
    return 'default';
  };

  const getUrgencyText = () => {
    if (daysRemaining === 0) return 'hoje';
    if (daysRemaining === 1) return 'amanhã';
    return `em ${daysRemaining} dias`;
  };

  return (
    <Alert variant={getBannerVariant()} className="mb-4 border-l-4 border-l-yellow-500">
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div>
            <p className="font-semibold">
              ⚠️ Sua assinatura expira {getUrgencyText()}!
            </p>
            <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-1">
              <div className="flex items-center space-x-1">
                <Calendar className="h-3 w-3" />
                <span>
                  Vencimento: {expiryDate ? new Date(expiryDate).toLocaleDateString('pt-BR') : 'N/A'}
                </span>
              </div>
              <span>•</span>
              <span>Renove agora para continuar aproveitando todos os recursos</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            size="sm"
            onClick={onRenewClick || (() => navigate('/assinatura'))}
            className="bg-yellow-600 hover:bg-yellow-700 text-white"
          >
            Renovar Agora
          </Button>
          
          {showDismiss && (
            <Button
              variant="ghost"
              size="sm"
              onClick={dismissNotification}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
};

export default ExpirationWarningBanner;