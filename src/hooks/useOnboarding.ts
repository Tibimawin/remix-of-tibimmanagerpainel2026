import { useState, useEffect, useCallback } from 'react';
import { useSimpleAuth } from '@/contexts/SimpleAuthContext';
import { useLocation } from 'react-router-dom';

const ONBOARDING_STORAGE_KEY = 'onboarding-completed';
const ONBOARDING_SKIPPED_KEY = 'onboarding-skipped';

export const useOnboarding = () => {
  const { isAuthenticated } = useSimpleAuth();
  const location = useLocation();
  const [shouldShowOnboarding, setShouldShowOnboarding] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isOnboardingActive, setIsOnboardingActive] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      setShouldShowOnboarding(false);
      setIsReady(false);
      return;
    }

    const hasCompletedOnboarding = localStorage.getItem(ONBOARDING_STORAGE_KEY) === 'true';
    const hasSkippedOnboarding = localStorage.getItem(ONBOARDING_SKIPPED_KEY) === 'true';
    
    console.log('Onboarding status:', { hasCompletedOnboarding, hasSkippedOnboarding, isAuthenticated, path: location.pathname });
    
    // Mostrar onboarding apenas para novos usuários que não completaram nem pularam
    // E apenas no dashboard para garantir que os elementos existem
    if (!hasCompletedOnboarding && !hasSkippedOnboarding && location.pathname === '/dashboard') {
      // Aguardar um tempo maior para garantir que todos os elementos da UI estão renderizados
      const timer = setTimeout(() => {
        console.log('Starting onboarding - elements should be ready');
        setIsReady(true);
        setShouldShowOnboarding(true);
        setIsOnboardingActive(true);
      }, 1500);
      
      return () => clearTimeout(timer);
    } else if (hasCompletedOnboarding || hasSkippedOnboarding) {
      setShouldShowOnboarding(false);
      setIsOnboardingActive(false);
    }
  }, [isAuthenticated, location.pathname]);

  const completeOnboarding = useCallback(() => {
    console.log('Completing onboarding');
    localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
    setShouldShowOnboarding(false);
    setIsOnboardingActive(false);
    setCurrentStep(0);
  }, []);

  const skipOnboarding = useCallback(() => {
    console.log('Skipping onboarding');
    localStorage.setItem(ONBOARDING_SKIPPED_KEY, 'true');
    setShouldShowOnboarding(false);
    setIsOnboardingActive(false);
    setCurrentStep(0);
  }, []);

  const restartOnboarding = useCallback(() => {
    console.log('Restarting onboarding');
    localStorage.removeItem(ONBOARDING_STORAGE_KEY);
    localStorage.removeItem(ONBOARDING_SKIPPED_KEY);
    setCurrentStep(0);
    
    // Pequeno delay antes de iniciar
    setTimeout(() => {
      setShouldShowOnboarding(true);
      setIsOnboardingActive(true);
    }, 500);
  }, []);

  const nextStep = useCallback(() => {
    setCurrentStep(prev => {
      console.log('Next step:', prev, '->', prev + 1);
      return prev + 1;
    });
  }, []);

  const prevStep = useCallback(() => {
    setCurrentStep(prev => {
      const newStep = Math.max(0, prev - 1);
      console.log('Prev step:', prev, '->', newStep);
      return newStep;
    });
  }, []);

  return {
    shouldShowOnboarding: shouldShowOnboarding && isReady,
    currentStep,
    isOnboardingActive,
    completeOnboarding,
    skipOnboarding,
    restartOnboarding,
    nextStep,
    prevStep,
    setCurrentStep
  };
};