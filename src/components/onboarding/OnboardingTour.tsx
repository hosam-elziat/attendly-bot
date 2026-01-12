import { useState, useEffect } from 'react';
import Joyride, { CallBackProps, STATUS, Step, ACTIONS, EVENTS } from 'react-joyride';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface OnboardingTourProps {
  onComplete: () => void;
}

const OnboardingTour = ({ onComplete }: OnboardingTourProps) => {
  const { language } = useLanguage();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  const isRTL = language === 'ar';

  // Define all steps with their target routes and elements
  const tourSteps: (Step & { route?: string })[] = [
    // Step 0: Welcome
    {
      target: 'body',
      content: isRTL 
        ? '🎉 مرحباً بك في AttendEase! دعنا نأخذك في جولة سريعة لتتعرف على النظام ونساعدك في إعداده.'
        : '🎉 Welcome to AttendEase! Let us take you on a quick tour to help you set up.',
      placement: 'center',
      disableBeacon: true,
      route: '/dashboard',
    },
    // Step 1: Subscription Card
    {
      target: '[data-tour="subscription-card"]',
      content: isRTL 
        ? '✨ هنا يمكنك رؤية باقتك الحالية. اضغط لاختيار باقة واحصل على 3 أشهر مجانية!'
        : '✨ Here you can see your current plan. Click to choose a plan and get 3 months free!',
      placement: 'bottom',
      route: '/dashboard',
    },
    // Step 2: Navigate to Subscription
    {
      target: '[data-tour="plan-cards"]',
      content: isRTL 
        ? '🎁 اختر الباقة المناسبة لحجم فريقك. جميع الباقات تأتي مع 3 أشهر مجانية!'
        : '🎁 Choose the plan that fits your team size. All plans come with 3 months free!',
      placement: 'top',
      route: '/dashboard/subscription',
    },
    // Step 3: Settings - Language
    {
      target: '[data-tour="language-select"]',
      content: isRTL 
        ? '🌍 اختر لغتك المفضلة - العربية أو الإنجليزية'
        : '🌍 Choose your preferred language - Arabic or English',
      placement: 'bottom',
      route: '/dashboard/settings',
    },
    // Step 4: Settings - Theme
    {
      target: '[data-tour="theme-select"]',
      content: isRTL 
        ? '🌓 هل تفضل المظهر الفاتح أم الداكن؟ اختر ما يناسبك!'
        : '🌓 Do you prefer light or dark mode? Choose what suits you!',
      placement: 'bottom',
      route: '/dashboard/settings',
    },
    // Step 5: Company Info
    {
      target: '[data-tour="company-info"]',
      content: isRTL 
        ? '🏢 أدخل معلومات شركتك: الاسم، المنطقة الزمنية، والعملة'
        : '🏢 Enter your company info: name, timezone, and currency',
      placement: 'bottom',
      route: '/dashboard/settings',
    },
    // Step 6: Work Hours
    {
      target: '[data-tour="work-hours"]',
      content: isRTL 
        ? '⏰ حدد ساعات العمل الرسمية وأيام العطلة الأسبوعية'
        : '⏰ Set your official work hours and weekend days',
      placement: 'top',
      route: '/dashboard/settings',
    },
    // Step 7: Deductions
    {
      target: '[data-tour="deductions-section"]',
      content: isRTL 
        ? '💰 حدد قواعد الخصومات للتأخير والغياب'
        : '💰 Set deduction rules for late arrivals and absences',
      placement: 'top',
      route: '/dashboard/settings',
    },
    // Step 8: Telegram Bot
    {
      target: '[data-tour="telegram-connect"]',
      content: isRTL 
        ? '🤖 فعّل بوت التليجرام! هذا هو قلب النظام - موظفوك سيستخدمونه لتسجيل الحضور'
        : '🤖 Activate the Telegram bot! This is the heart of the system - your employees will use it for attendance',
      placement: 'bottom',
      route: '/dashboard/telegram',
    },
    // Step 9: Bot Link
    {
      target: '[data-tour="bot-link"]',
      content: isRTL 
        ? '📤 انسخ رابط البوت وشاركه مع موظفيك ليسجلوا بياناتهم'
        : '📤 Copy the bot link and share it with your employees to register',
      placement: 'bottom',
      route: '/dashboard/telegram',
    },
    // Step 10: Add Employee
    {
      target: '[data-tour="add-employee"]',
      content: isRTL 
        ? '👤 أضف موظفين يدوياً من هنا، أو دعهم يسجلون عبر البوت'
        : '👤 Add employees manually here, or let them register via the bot',
      placement: 'bottom',
      route: '/dashboard/employees',
    },
    // Step 11: Join Requests
    {
      target: '[data-tour="join-requests"]',
      content: isRTL 
        ? '📋 هنا ستظهر طلبات انضمام الموظفين الجدد عبر البوت. راجعها ووافق عليها!'
        : '📋 New employee join requests via bot will appear here. Review and approve them!',
      placement: 'bottom',
      route: '/dashboard/join-requests',
    },
    // Step 12: Leaves
    {
      target: '[data-tour="leaves-section"]',
      content: isRTL 
        ? '🏖️ إدارة طلبات الإجازات - راجع، وافق، أو ارفض الطلبات'
        : '🏖️ Manage leave requests - review, approve, or reject them',
      placement: 'bottom',
      route: '/dashboard/leaves',
    },
    // Step 13: Sidebar Navigation
    {
      target: '[data-tour="sidebar-nav"]',
      content: isRTL 
        ? '📱 استخدم القائمة الجانبية للتنقل بين صفحات النظام'
        : '📱 Use the sidebar to navigate between system pages',
      placement: 'right',
      route: '/dashboard',
    },
    // Step 14: Complete
    {
      target: 'body',
      content: isRTL 
        ? '🎊 تهانينا! أنت جاهز للبدء. شارك رابط البوت مع موظفيك وابدأ في تتبع الحضور!'
        : '🎊 Congratulations! You are ready to start. Share the bot link with your employees and start tracking attendance!',
      placement: 'center',
      route: '/dashboard',
    },
  ];

  // Start tour after component mounts
  useEffect(() => {
    const timer = setTimeout(() => {
      setRun(true);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  // Handle route changes for steps
  useEffect(() => {
    const currentStep = tourSteps[stepIndex];
    if (currentStep?.route && location.pathname !== currentStep.route) {
      navigate(currentStep.route);
    }
  }, [stepIndex]);

  const handleJoyrideCallback = async (data: CallBackProps) => {
    const { status, action, index, type } = data;

    // Handle step changes
    if (type === EVENTS.STEP_AFTER) {
      if (action === ACTIONS.NEXT) {
        const nextStep = tourSteps[index + 1];
        if (nextStep?.route && location.pathname !== nextStep.route) {
          navigate(nextStep.route);
          // Wait for navigation before moving to next step
          setTimeout(() => {
            setStepIndex(index + 1);
          }, 300);
        } else {
          setStepIndex(index + 1);
        }
      } else if (action === ACTIONS.PREV) {
        const prevStep = tourSteps[index - 1];
        if (prevStep?.route && location.pathname !== prevStep.route) {
          navigate(prevStep.route);
          setTimeout(() => {
            setStepIndex(index - 1);
          }, 300);
        } else {
          setStepIndex(index - 1);
        }
      }
    }

    // Handle tour completion or skip
    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status as any)) {
      setRun(false);
      
      if (profile?.user_id) {
        await supabase
          .from('profiles')
          .update({ 
            onboarding_completed: true,
            onboarding_step: tourSteps.length 
          })
          .eq('user_id', profile.user_id);
      }
      
      onComplete();
    }
  };

  return (
    <Joyride
      steps={tourSteps}
      run={run}
      stepIndex={stepIndex}
      continuous
      showProgress
      showSkipButton
      disableOverlayClose
      spotlightClicks
      callback={handleJoyrideCallback}
      locale={{
        back: isRTL ? 'السابق' : 'Back',
        close: isRTL ? 'إغلاق' : 'Close',
        last: isRTL ? 'إنهاء' : 'Finish',
        next: isRTL ? 'التالي' : 'Next',
        skip: isRTL ? 'تخطي الجولة' : 'Skip Tour',
      }}
      styles={{
        options: {
          primaryColor: 'hsl(var(--primary))',
          backgroundColor: 'hsl(var(--background))',
          textColor: 'hsl(var(--foreground))',
          arrowColor: 'hsl(var(--background))',
          overlayColor: 'rgba(0, 0, 0, 0.6)',
          zIndex: 10000,
        },
        tooltip: {
          borderRadius: '12px',
          padding: '20px',
          fontSize: '15px',
          direction: isRTL ? 'rtl' : 'ltr',
        },
        tooltipContainer: {
          textAlign: isRTL ? 'right' : 'left',
        },
        tooltipContent: {
          padding: '10px 0',
        },
        tooltipTitle: {
          fontSize: '18px',
          fontWeight: 'bold',
        },
        buttonNext: {
          backgroundColor: 'hsl(var(--primary))',
          borderRadius: '8px',
          padding: '10px 20px',
          fontSize: '14px',
        },
        buttonBack: {
          color: 'hsl(var(--muted-foreground))',
          marginRight: isRTL ? 0 : 10,
          marginLeft: isRTL ? 10 : 0,
        },
        buttonSkip: {
          color: 'hsl(var(--muted-foreground))',
        },
        spotlight: {
          borderRadius: '12px',
        },
        beacon: {
          display: 'none',
        },
      }}
      floaterProps={{
        disableAnimation: false,
      }}
    />
  );
};

export default OnboardingTour;
