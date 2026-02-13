import React, { useState } from 'react';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lock, Shield, Sparkles } from 'lucide-react';
import { PlansPopup } from './PlansPopup';

interface PermissionGateProps {
  feature: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const PermissionGate: React.FC<PermissionGateProps> = ({ 
  feature, 
  children, 
  fallback 
}) => {
  const { hasFeature, loading, permissions } = useUserPermissions();
  const [showPlans, setShowPlans] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!hasFeature(feature)) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <>
        <Card className="bg-muted/50 border-destructive/20">
          <CardContent className="text-center py-12">
            <Lock className="h-12 w-12 mx-auto mb-4 text-destructive" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Acesso Restrito</h3>
            <p className="text-muted-foreground mb-4">
              Você não tem permissão para acessar esta funcionalidade. Assine agora para desbloquear!
            </p>
            <Button 
              onClick={() => setShowPlans(true)}
              className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 mb-4"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Assine Agora
            </Button>
            <div className="bg-background/50 rounded-lg p-4 border">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">Plano Atual</span>
              </div>
              <p className="text-sm text-foreground">{permissions?.planName || 'Básico'}</p>
            </div>
          </CardContent>
        </Card>
        <PlansPopup forceOpen={showPlans} onClose={() => setShowPlans(false)} />
      </>
    );
  }

  return <>{children}</>;
};