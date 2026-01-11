import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  ChevronLeft, 
  ChevronRight, 
  CreditCard, 
  Globe, 
  Moon, 
  Sun, 
  Building, 
  Clock, 
  Bot, 
  UserPlus,
  Percent,
  Share2,
  Users,
  CheckCircle,
  Sparkles
} from 'lucide-react';

interface OnboardingStep {
  id: number;
  title: string;
  description: string;
  icon: React.ReactNode;
  route: string;
  action?: string;
  highlight?: string;
}

interface OnboardingTourProps {
  onComplete: () => void;
}

const OnboardingTour = ({ onComplete }: OnboardingTourProps) => {
  const { t, language, setLanguage, direction } = useLanguage();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  const steps: OnboardingStep[] = [
    {
      id: 1,
      title: language === 'ar' ? 'اختر باقتك' : 'Choose Your Plan',
      description: language === 'ar' 
        ? '🎉 احصل على 3 أشهر مجانية! اختر الباقة المناسبة لحجم فريقك' 
        : '🎉 Get 3 months free! Choose the plan that fits your team size',
      icon: <CreditCard className="w-6 h-6" />,
      route: '/dashboard/subscription',
      action: language === 'ar' ? 'اختر باقة' : 'Choose Plan',
      highlight: 'subscription-card'
    },
    {
      id: 2,
      title: language === 'ar' ? 'اختر اللغة' : 'Choose Language',
      description: language === 'ar' 
        ? 'حدد اللغة المناسبة لك - العربية أو الإنجليزية' 
        : 'Select your preferred language - Arabic or English',
      icon: <Globe className="w-6 h-6" />,
      route: '/dashboard/settings',
      action: language === 'ar' ? 'تغيير اللغة' : 'Change Language'
    },
    {
      id: 3,
      title: language === 'ar' ? 'اختر المظهر' : 'Choose Theme',
      description: language === 'ar' 
        ? 'هل تفضل المظهر الفاتح أم الداكن؟' 
        : 'Do you prefer light or dark mode?',
      icon: <Moon className="w-6 h-6" />,
      route: '/dashboard/settings',
      action: language === 'ar' ? 'تغيير المظهر' : 'Change Theme'
    },
    {
      id: 4,
      title: language === 'ar' ? 'معلومات الشركة' : 'Company Info',
      description: language === 'ar' 
        ? 'أدخل اسم شركتك والمنطقة الزمنية والعملة' 
        : 'Enter your company name, timezone, and currency',
      icon: <Building className="w-6 h-6" />,
      route: '/dashboard/settings',
      action: language === 'ar' ? 'إعداد الشركة' : 'Setup Company'
    },
    {
      id: 5,
      title: language === 'ar' ? 'ساعات العمل' : 'Work Hours',
      description: language === 'ar' 
        ? 'حدد أوقات بداية ونهاية الدوام وأيام الإجازة' 
        : 'Set your work start/end times and weekend days',
      icon: <Clock className="w-6 h-6" />,
      route: '/dashboard/settings',
      action: language === 'ar' ? 'ضبط الساعات' : 'Set Hours'
    },
    {
      id: 6,
      title: language === 'ar' ? 'تفعيل البوت' : 'Activate Bot',
      description: language === 'ar' 
        ? 'فعّل بوت التليجرام وغيّر اسمه ليناسب شركتك' 
        : 'Activate the Telegram bot and customize its name',
      icon: <Bot className="w-6 h-6" />,
      route: '/dashboard/telegram',
      action: language === 'ar' ? 'تفعيل البوت' : 'Activate Bot'
    },
    {
      id: 7,
      title: language === 'ar' ? 'أضف موظفين' : 'Add Employees',
      description: language === 'ar' 
        ? 'أضف أول موظف لديك يدوياً أو دعهم يسجلون عبر البوت' 
        : 'Add your first employee manually or let them register via bot',
      icon: <UserPlus className="w-6 h-6" />,
      route: '/dashboard/employees',
      action: language === 'ar' ? 'إضافة موظف' : 'Add Employee'
    },
    {
      id: 8,
      title: language === 'ar' ? 'إعداد الخصومات' : 'Setup Deductions',
      description: language === 'ar' 
        ? 'حدد قواعد خصومات التأخير والغياب' 
        : 'Set up late arrival and absence deduction rules',
      icon: <Percent className="w-6 h-6" />,
      route: '/dashboard/settings',
      action: language === 'ar' ? 'إعداد الخصومات' : 'Setup Deductions'
    },
    {
      id: 9,
      title: language === 'ar' ? 'شارك رابط البوت' : 'Share Bot Link',
      description: language === 'ar' 
        ? 'شارك رابط البوت مع موظفيك ليسجلوا بياناتهم' 
        : 'Share the bot link with your employees to register',
      icon: <Share2 className="w-6 h-6" />,
      route: '/dashboard/telegram',
      action: language === 'ar' ? 'نسخ الرابط' : 'Copy Link'
    },
    {
      id: 10,
      title: language === 'ar' ? 'إدارة طلبات الانضمام' : 'Manage Join Requests',
      description: language === 'ar' 
        ? 'راجع طلبات انضمام الموظفين الجدد ووافق عليها' 
        : 'Review and approve new employee join requests',
      icon: <Users className="w-6 h-6" />,
      route: '/dashboard/join-requests',
      action: language === 'ar' ? 'عرض الطلبات' : 'View Requests'
    },
    {
      id: 11,
      title: language === 'ar' ? 'إدارة الإجازات' : 'Manage Leaves',
      description: language === 'ar' 
        ? 'راجع طلبات الإجازات ووافق عليها أو ارفضها' 
        : 'Review leave requests and approve or reject them',
      icon: <CheckCircle className="w-6 h-6" />,
      route: '/dashboard/leaves',
      action: language === 'ar' ? 'عرض الإجازات' : 'View Leaves'
    }
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
      navigate(steps[currentStep + 1].route);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      navigate(steps[currentStep - 1].route);
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = async () => {
    setIsVisible(false);
    
    if (profile?.user_id) {
      await supabase
        .from('profiles')
        .update({ 
          onboarding_completed: true,
          onboarding_step: steps.length 
        })
        .eq('user_id', profile.user_id);
    }
    
    onComplete();
  };

  const handleGoToStep = (stepIndex: number) => {
    setCurrentStep(stepIndex);
    navigate(steps[stepIndex].route);
  };

  useEffect(() => {
    navigate(steps[currentStep].route);
  }, []);

  if (!isVisible) return null;

  const currentStepData = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4"
        dir={direction}
      >
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="w-full max-w-lg"
        >
          <Card className="p-6 shadow-2xl border-primary/20 bg-background">
            {/* Progress Bar */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">
                  {language === 'ar' ? 'خطوة' : 'Step'} {currentStep + 1} / {steps.length}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSkip}
                  className="text-muted-foreground hover:text-foreground"
                >
                  {language === 'ar' ? 'تخطي الجولة' : 'Skip Tour'}
                </Button>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-primary rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>

            {/* Step Content */}
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: direction === 'rtl' ? -20 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction === 'rtl' ? 20 : -20 }}
              className="text-center mb-6"
            >
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                {currentStepData.icon}
              </div>
              
              <h2 className="text-xl font-bold text-foreground mb-2 flex items-center justify-center gap-2">
                {currentStepData.title}
                {currentStep === 0 && <Sparkles className="w-5 h-5 text-yellow-500" />}
              </h2>
              
              <p className="text-muted-foreground">
                {currentStepData.description}
              </p>

              {/* Special highlight for first step */}
              {currentStep === 0 && (
                <div className="mt-4 p-3 rounded-lg bg-gradient-to-r from-primary/20 to-primary/10 border border-primary/30">
                  <p className="text-sm font-medium text-primary">
                    {language === 'ar' ? '✨ عرض حصري: 3 أشهر مجانية!' : '✨ Exclusive: 3 Months Free!'}
                  </p>
                </div>
              )}
            </motion.div>

            {/* Step Indicators */}
            <div className="flex justify-center gap-1.5 mb-6 flex-wrap">
              {steps.map((step, index) => (
                <button
                  key={step.id}
                  onClick={() => handleGoToStep(index)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    index === currentStep 
                      ? 'w-6 bg-primary' 
                      : index < currentStep 
                        ? 'bg-primary/50' 
                        : 'bg-muted'
                  }`}
                />
              ))}
            </div>

            {/* Navigation */}
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={handlePrev}
                disabled={currentStep === 0}
                className="flex-1"
              >
                {direction === 'rtl' ? <ChevronRight className="w-4 h-4 me-1" /> : <ChevronLeft className="w-4 h-4 me-1" />}
                {language === 'ar' ? 'السابق' : 'Previous'}
              </Button>
              
              <Button
                onClick={handleNext}
                className="flex-1 btn-primary-gradient"
              >
                {currentStep === steps.length - 1 
                  ? (language === 'ar' ? 'إنهاء الجولة' : 'Finish Tour')
                  : (language === 'ar' ? 'التالي' : 'Next')
                }
                {currentStep < steps.length - 1 && (
                  direction === 'rtl' 
                    ? <ChevronLeft className="w-4 h-4 ms-1" /> 
                    : <ChevronRight className="w-4 h-4 ms-1" />
                )}
              </Button>
            </div>
          </Card>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default OnboardingTour;
