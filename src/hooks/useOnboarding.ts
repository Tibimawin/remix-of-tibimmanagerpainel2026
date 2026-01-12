import { useState, useEffect, useCallback } from 'react';
import { useSimpleAuth } from '@/contexts/SimpleAuthContext';

const ONBOARDING_STORAGE_KEY = 'onboarding-completed';
const ONBOARDING_SKIPPED_KEY = 'onboarding-skipped';

export const useOnboarding = () => {
  const { isAuthenticated } = useSimpleAuth();
  const [shouldShowOnboarding, setShouldShowOnboarding] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isOnboardingActive, setIsOnboardingActive] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;

    const hasCompletedOnboarding = localStorage.getItem(ONBOARDING_STORAGE_KEY) === 'true';
    const hasSkippedOnboarding = localStorage.getItem(ONBOARDING_SKIPPED_KEY) === 'true';
    
    console.log('Onboarding status:', { hasCompletedOnboarding, hasSkippedOnboarding, isAuthenticated });
    
    // Mostrar onboarding apenas para novos usuários que não completaram nem pularam
    if (!hasCompletedOnboarding && !hasSkippedOnboarding) {
      // Pequeno delay para garantir que a UI está renderizada
      setTimeout(() => {
        console.log('Starting onboarding');
        setShouldShowOnboarding(true);
        setIsOnboardingActive(true);
      }, 1000);
    }
  }, [isAuthenticated]);

  const completeOnboarding = useCallback(() => {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
    setShouldShowOnboarding(false);
    setIsOnboardingActive(false);
  }, []);

  const skipOnboarding = useCallback(() => {
    localStorage.setItem(ONBOARDING_SKIPPED_KEY, 'true');
    setShouldShowOnboarding(false);
    setIsOnboardingActive(false);
  }, []);

  const restartOnboarding = useCallback(() => {
    localStorage.removeItem(ONBOARDING_STORAGE_KEY);
    localStorage.removeItem(ONBOARDING_SKIPPED_KEY);
    setCurrentStep(0);
    setShouldShowOnboarding(true);
    setIsOnboardingActive(true);
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
    shouldShowOnboarding,
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