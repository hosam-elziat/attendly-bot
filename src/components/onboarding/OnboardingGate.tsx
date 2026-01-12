import { useLocation } from "react-router-dom";
import { useOnboarding } from "@/hooks/useOnboarding";
import OnboardingTour from "@/components/onboarding/OnboardingTour";

const OnboardingGate = () => {
  const location = useLocation();
  const {
    showOnboarding,
    isLoading,
    onboardingStep,
    setOnboardingStep,
    completeOnboarding,
  } = useOnboarding();

  // Only run the tour inside the dashboard area
  const inDashboard = location.pathname.startsWith("/dashboard");
  if (!inDashboard) return null;

  if (isLoading || !showOnboarding) return null;

  return (
    <OnboardingTour
      onComplete={completeOnboarding}
      initialStepIndex={onboardingStep ?? 0}
      onStepIndexChange={setOnboardingStep}
    />
  );
};

export default OnboardingGate;
