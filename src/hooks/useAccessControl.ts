import { useState, useEffect } from 'react';
import { useSimpleAuth } from '@/contexts/SimpleAuthContext';
import { FirebaseUserService } from '@/services/FirebaseUserService';
import { toast } from 'sonner';

export const useAccessControl = () => {
  const { userInfo, isAuthenticated } = useSimpleAuth();
  const [hasAccess, setHasAccess] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [expiryDate, setExpiryDate] = useState<string | null>(null);

  useEffect(() => {
    const checkAccess = async () => {
      if (!userInfo?.id) {
        setHasAccess(false);
        setIsChecking(false);
        return;
      }

      try {
        // Verificar se o usuário tem acesso (não expirado)
        const hasValidAccess = await FirebaseUserService.checkUserAccess(userInfo.id);
        
        if (!hasValidAccess) {
          // Buscar dados do usuário para mostrar informações
          const userData = await FirebaseUserService.getUserById(userInfo.id);
          if (userData) {
            setExpiryDate(userData.expiryDate);
            
            // Mostrar mensagem de acesso expirado apenas uma vez
            if (!localStorage.getItem(`access-expired-${userInfo.id}`)) {
              toast.error('Seu acesso expirou. Entre em contato com o administrador para renovar.');
              localStorage.setItem(`access-expired-${userInfo.id}`, 'true');
            }
          }
          
          setHasAccess(false);
        } else {
          setHasAccess(true);
          // Limpar flag de expiração se o acesso foi renovado
          localStorage.removeItem(`access-expired-${userInfo.id}`);
        }
      } catch (error) {
        setHasAccess(false);
      } finally {
        setIsChecking(false);
      }
    };

    checkAccess();

    // Verificar acesso periodicamente (a cada 20 minutos)
    const interval = setInterval(checkAccess, 20 * 60 * 1000);

    return () => clearInterval(interval);
  }, [userInfo?.id]);

  return {
    hasAccess,
    isChecking,
    expiryDate,
    isExpired: isAuthenticated && !isChecking && !hasAccess,
  };
};