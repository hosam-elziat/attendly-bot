import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface OnboardingTourProps {
  onComplete: () => void;
  initialStepIndex?: number;
  onStepIndexChange?: (nextIndex: number) => void;
}

interface TourStep {
  target: string;
  title: { ar: string; en: string };
  content: { ar: string; en: string };
  route: string;
  action?: 'click' | 'view';
  icon: string;
}

const tourSteps: TourStep[] = [
  {
    target: 'body',
    title: { ar: 'مرحباً بك! 🎉', en: 'Welcome! 🎉' },
    content: {
      ar: 'دعنا نأخذك في جولة سريعة لإعداد نظام الحضور الخاص بك',
      en: "Let's take you on a quick tour to set up your attendance system",
    },
    route: '/dashboard',
    action: 'view',
    icon: '👋',
  },
  {
    target: '[data-tour="subscription-card"]',
    title: { ar: 'باقتك الحالية', en: 'Your Plan' },
    content: {
      ar: 'اضغط هنا لاختيار باقة تناسب حجم فريقك',
      en: 'Click here to choose a plan that fits your team',
    },
    route: '/dashboard',
    action: 'click',
    icon: '💎',
  },
  {
    target: '[data-tour="sidebar-nav"]',
    title: { ar: 'القائمة الرئيسية', en: 'Main Menu' },
    content: {
      ar: 'استخدم هذه القائمة للتنقل بين صفحات النظام',
      en: 'Use this menu to navigate between pages',
    },
    route: '/dashboard',
    action: 'view',
    icon: '📱',
  },
  {
    target: '[data-tour="telegram-connect"]',
    title: { ar: 'بوت التليجرام 🤖', en: 'Telegram Bot 🤖' },
    content: {
      ar: 'فعّل البوت! موظفوك سيستخدمونه لتسجيل الحضور والانصراف',
      en: 'Activate the bot! Your employees will use it for attendance',
    },
    route: '/dashboard/telegram',
    action: 'click',
    icon: '🤖',
  },
  {
    target: '[data-tour="add-employee"]',
    title: { ar: 'إضافة موظفين', en: 'Add Employees' },
    content: {
      ar: 'أضف موظفيك يدوياً أو دعهم يسجلون عبر البوت',
      en: 'Add employees manually or let them register via the bot',
    },
    route: '/dashboard/employees',
    action: 'click',
    icon: '👥',
  },
  {
    target: '[data-tour="language-select"]',
    title: { ar: 'اللغة والإعدادات', en: 'Language & Settings' },
    content: {
      ar: 'خصص النظام حسب احتياجاتك - اللغة، المظهر، وساعات العمل',
      en: 'Customize the system - language, theme, and work hours',
    },
    route: '/dashboard/settings',
    action: 'view',
    icon: '⚙️',
  },
  {
    target: 'body',
    title: { ar: 'أنت جاهز! 🎊', en: "You're Ready! 🎊" },
    content: {
      ar: 'شارك رابط البوت مع موظفيك وابدأ في تتبع الحضور!',
      en: 'Share the bot link with your employees and start tracking!',
    },
    route: '/dashboard',
    action: 'view',
    icon: '🚀',
  },
];

const OnboardingTour = ({
  onComplete,
  initialStepIndex = 0,
  onStepIndexChange,
}: OnboardingTourProps) => {
  const { language } = useLanguage();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [stepIndex, setStepIndex] = useState(initialStepIndex);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null);
  const [isReady, setIsReady] = useState(false);

  const isRTL = language === 'ar';
  const currentStep = tourSteps[stepIndex];
  const isLastStep = stepIndex === tourSteps.length - 1;
  const isFirstStep = stepIndex === 0;
  const isCenterStep = currentStep.target === 'body';

  // Navigate to correct route
  useEffect(() => {
    if (currentStep.route && location.pathname !== currentStep.route) {
      navigate(currentStep.route);
    }
  }, [currentStep.route, location.pathname, navigate]);

  // Find and highlight target element
  useEffect(() => {
    const findTarget = () => {
      if (currentStep.target === 'body') {
        setHighlightRect(null);
        setTooltipPosition({ top: window.innerHeight / 2, left: window.innerWidth / 2 });
        setIsReady(true);
        return;
      }

      const element = document.querySelector(currentStep.target);
      if (element) {
        const rect = element.getBoundingClientRect();
        setHighlightRect(rect);
        
        // Calculate tooltip position
        const tooltipTop = rect.bottom + 20;
        const tooltipLeft = rect.left + rect.width / 2;
        setTooltipPosition({ top: tooltipTop, left: tooltipLeft });
        setIsReady(true);

        // Add pulse effect to target
        element.classList.add('onboarding-highlight');
        
        // Listen for click on target if action is 'click'
        if (currentStep.action === 'click') {
          const handleClick = () => {
            element.classList.remove('onboarding-highlight');
            goToNextStep();
          };
          element.addEventListener('click', handleClick, { once: true });
          return () => element.removeEventListener('click', handleClick);
        }
      } else {
        // Retry after a short delay
        setTimeout(findTarget, 300);
      }
    };

    setIsReady(false);
    const timer = setTimeout(findTarget, 100);
    return () => clearTimeout(timer);
  }, [stepIndex, location.pathname, currentStep]);

  const goToNextStep = useCallback(async () => {
    // Remove highlight from current element
    if (currentStep.target !== 'body') {
      const element = document.querySelector(currentStep.target);
      element?.classList.remove('onboarding-highlight');
    }

    if (isLastStep) {
      // Complete the tour
      onStepIndexChange?.(tourSteps.length);
      if (profile?.user_id) {
        await supabase
          .from('profiles')
          .update({ onboarding_completed: true, onboarding_step: tourSteps.length })
          .eq('user_id', profile.user_id);
      }
      onComplete();
    } else {
      const nextIndex = stepIndex + 1;
      setStepIndex(nextIndex);
      onStepIndexChange?.(nextIndex);
    }
  }, [stepIndex, isLastStep, currentStep.target, onComplete, onStepIndexChange, profile?.user_id]);

  const goToPrevStep = useCallback(() => {
    if (!isFirstStep) {
      // Remove highlight from current element
      if (currentStep.target !== 'body') {
        const element = document.querySelector(currentStep.target);
        element?.classList.remove('onboarding-highlight');
      }
      const prevIndex = stepIndex - 1;
      setStepIndex(prevIndex);
      onStepIndexChange?.(prevIndex);
    }
  }, [stepIndex, isFirstStep, currentStep.target, onStepIndexChange]);

  const skipTour = async () => {
    if (profile?.user_id) {
      await supabase
        .from('profiles')
        .update({ onboarding_completed: true, onboarding_step: tourSteps.length })
        .eq('user_id', profile.user_id);
    }
    onComplete();
  };

  return (
    <AnimatePresence>
      {isReady && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9998]"
            style={{
              background: 'rgba(0, 0, 0, 0.75)',
              backdropFilter: 'blur(4px)',
            }}
          />

          {/* Spotlight cutout for highlighted element */}
          {highlightRect && !isCenterStep && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="fixed z-[9999] pointer-events-none"
              style={{
                top: highlightRect.top - 8,
                left: highlightRect.left - 8,
                width: highlightRect.width + 16,
                height: highlightRect.height + 16,
                boxShadow: `
                  0 0 0 9999px rgba(0, 0, 0, 0.75),
                  0 0 30px 10px hsl(var(--primary) / 0.5),
                  inset 0 0 20px 5px hsl(var(--primary) / 0.3)
                `,
                borderRadius: '16px',
                border: '2px solid hsl(var(--primary))',
              }}
            />
          )}

          {/* Make highlighted element clickable */}
          {highlightRect && !isCenterStep && currentStep.action === 'click' && (
            <div
              className="fixed z-[10000] cursor-pointer"
              style={{
                top: highlightRect.top,
                left: highlightRect.left,
                width: highlightRect.width,
                height: highlightRect.height,
                pointerEvents: 'none',
              }}
            />
          )}

          {/* Tooltip */}
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={cn(
              "fixed z-[10001] w-[340px] max-w-[90vw]",
              isCenterStep && "transform -translate-x-1/2 -translate-y-1/2"
            )}
            style={
              isCenterStep
                ? { top: '50%', left: '50%' }
                : {
                    top: tooltipPosition.top,
                    left: Math.min(
                      Math.max(tooltipPosition.left - 170, 20),
                      window.innerWidth - 360
                    ),
                  }
            }
          >
            <div
              className="relative rounded-2xl overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, hsl(var(--background)) 0%, hsl(var(--card)) 100%)',
                border: '1px solid hsl(var(--border))',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              }}
            >
              {/* Decorative gradient header */}
              <div
                className="h-2"
                style={{
                  background: 'linear-gradient(90deg, hsl(var(--primary)), hsl(var(--primary) / 0.5), hsl(var(--primary)))',
                }}
              />

              {/* Close button */}
              <button
                onClick={skipTour}
                className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-muted transition-colors"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>

              {/* Content */}
              <div className={cn("p-6", isRTL && "text-right")} dir={isRTL ? 'rtl' : 'ltr'}>
                {/* Icon */}
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-3xl">{currentStep.icon}</span>
                  <div>
                    <h3 className="text-lg font-bold text-foreground">
                      {isRTL ? currentStep.title.ar : currentStep.title.en}
                    </h3>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                      <Sparkles className="w-3 h-3" />
                      <span>
                        {isRTL
                          ? `الخطوة ${stepIndex + 1} من ${tourSteps.length}`
                          : `Step ${stepIndex + 1} of ${tourSteps.length}`}
                      </span>
                    </div>
                  </div>
                </div>

                <p className="text-muted-foreground leading-relaxed mb-6">
                  {isRTL ? currentStep.content.ar : currentStep.content.en}
                </p>

                {/* Action hint for click steps */}
                {currentStep.action === 'click' && !isCenterStep && (
                  <motion.div
                    animate={{ scale: [1, 1.02, 1] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="mb-4 p-3 rounded-xl bg-primary/10 border border-primary/20"
                  >
                    <p className="text-sm text-primary font-medium text-center">
                      {isRTL ? '👆 اضغط على العنصر المضيء للمتابعة' : '👆 Click the highlighted element to continue'}
                    </p>
                  </motion.div>
                )}

                {/* Progress bar */}
                <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-4">
                  <motion.div
                    className="h-full bg-primary rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${((stepIndex + 1) / tourSteps.length) * 100}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>

                {/* Navigation buttons */}
                <div className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
                  {!isFirstStep && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={goToPrevStep}
                      className="gap-1"
                    >
                      {isRTL ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                      {isRTL ? 'السابق' : 'Back'}
                    </Button>
                  )}
                  
                  <div className="flex-1" />

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={skipTour}
                    className="text-muted-foreground"
                  >
                    {isRTL ? 'تخطي' : 'Skip'}
                  </Button>

                  {(currentStep.action === 'view' || isCenterStep) && (
                    <Button
                      size="sm"
                      onClick={goToNextStep}
                      className="gap-1 bg-primary hover:bg-primary/90"
                    >
                      {isLastStep
                        ? isRTL
                          ? 'ابدأ الآن'
                          : 'Start Now'
                        : isRTL
                          ? 'التالي'
                          : 'Next'}
                      {!isLastStep && (isRTL ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />)}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default OnboardingTour;
