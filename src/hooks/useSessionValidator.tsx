
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSimpleAuth } from '@/contexts/SimpleAuthContext';

export const useSessionValidator = () => {
  const { isAuthenticated, isLoading } = useSimpleAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Aguardar carregamento e verificar se importação está ativa antes de redirecionar
    if (isLoading) return;
    
    const isImportActive = sessionStorage.getItem('m3u-import-active') === 'true';
    if (isImportActive) return;
    
    if (!isAuthenticated) {
      navigate('/login', { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);
};
