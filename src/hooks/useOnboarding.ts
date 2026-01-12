import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

const LS_KEY = 'attendease_onboarding_step';

export const useOnboarding = () => {
  const { user } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingStep, setOnboardingStepState] = useState<number>(() => {
    const raw = localStorage.getItem(LS_KEY);
    const n = raw ? Number(raw) : 0;
    return Number.isFinite(n) ? n : 0;
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (!user?.id) {
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('onboarding_completed, onboarding_step')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Error checking onboarding status:', error);
          setIsLoading(false);
          return;
        }

        const completed = data?.onboarding_completed ?? false;
        const step = data?.onboarding_step ?? 0;

        setShowOnboarding(!completed);
        setOnboardingStepState(step);
        localStorage.setItem(LS_KEY, String(step));
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkOnboardingStatus();
  }, [user?.id]);

  const setOnboardingStep = useCallback(
    async (step: number) => {
      setOnboardingStepState(step);
      localStorage.setItem(LS_KEY, String(step));

      if (!user?.id) return;

      const { error } = await supabase
        .from('profiles')
        .update({ onboarding_step: step })
        .eq('user_id', user.id);

      if (error) console.error('Error updating onboarding step:', error);
    },
    [user?.id]
  );

  const completeOnboarding = async () => {
    setShowOnboarding(false);
    localStorage.removeItem(LS_KEY);

    if (user?.id) {
      await supabase
        .from('profiles')
        .update({ onboarding_completed: true })
        .eq('user_id', user.id);
    }
  };

  const resetOnboarding = async () => {
    if (user?.id) {
      await supabase
        .from('profiles')
        .update({ onboarding_completed: false, onboarding_step: 0 })
        .eq('user_id', user.id);

      setOnboardingStepState(0);
      localStorage.setItem(LS_KEY, '0');
      setShowOnboarding(true);
    }
  };

  return {
    showOnboarding,
    onboardingStep,
    isLoading,
    setOnboardingStep,
    completeOnboarding,
    resetOnboarding,
  };
};

