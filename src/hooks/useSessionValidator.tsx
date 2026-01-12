
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSimpleAuth } from '@/contexts/SimpleAuthContext';

export const useSessionValidator = () => {
  const { isAuthenticated } = useSimpleAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Apenas verificar se está autenticado, sem validações automáticas
    if (!isAuthenticated) {
      navigate('/login', { replace: true });
    }
  }, [isAuthenticated, navigate]);
};
