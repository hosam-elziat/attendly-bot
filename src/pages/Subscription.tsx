import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { CreditCard, Users, Calendar, Crown, Loader2, Check, Star, Zap } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { toast } from 'sonner';

interface SubscriptionInfo {
  status: string;
  plan_name: string | null;
  max_employees: number | null;
  current_period_end: string | null;
  current_period_start: string | null;
  billing_cycle: string | null;
  plan_id: string | null;
}

interface PlanInfo {
  id: string;
  name: string;
  name_ar: string | null;
  description: string | null;
  price_monthly: number;
  price_quarterly: number | null;
  price_yearly: number | null;
  min_employees: number;
  max_employees: number | null;
  is_unlimited: boolean;
  currency: string;
  features: any;
}

const Subscription = () => {
  const { profile } = useAuth();
  const { language } = useLanguage();
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [plans, setPlans] = useState<PlanInfo[]>([]);
  const [employeeCount, setEmployeeCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'quarterly' | 'yearly'>('monthly');
  const [upgrading, setUpgrading] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    let retryCount = 0;
    const maxRetries = 5;

    const fetchData = async () => {
      // Wait for profile to be available
      if (!profile?.company_id) {
        // Retry a few times with delay for new accounts
        if (retryCount < maxRetries) {
          retryCount++;
          setTimeout(() => {
            if (isMounted) fetchData();
          }, 500);
        } else {
          if (isMounted) setLoading(false);
        }
        return;
      }

      try {
        const [subRes, plansRes, empRes] = await Promise.all([
          supabase
            .from('subscriptions')
            .select('status, plan_name, max_employees, current_period_end, current_period_start, billing_cycle, plan_id')
            .eq('company_id', profile.company_id)
            .maybeSingle(),
          supabase
            .from('subscription_plans')
            .select('id, name, name_ar, description, price_monthly, price_quarterly, price_yearly, min_employees, max_employees, is_unlimited, currency, features')
            .eq('is_active', true)
            .order('min_employees'),
          supabase
            .from('employees')
            .select('id', { count: 'exact' })
            .eq('company_id', profile.company_id)
            .eq('is_active', true),
        ]);

        if (isMounted) {
          if (subRes.data) setSubscription(subRes.data);
          if (plansRes.data) setPlans(plansRes.data);
          if (empRes.count !== null) setEmployeeCount(empRes.count);
        }
      } catch (error) {
        console.error('Error fetching subscription:', error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [profile?.company_id]);

  const handleUpgrade = async (planId: string, planName: string, plan: PlanInfo) => {
    setUpgrading(planId);
    try {
      if (!profile?.company_id) return;
      
      // Calculate 3 months from now
      const now = new Date();
      const trialEnd = new Date(now.setMonth(now.getMonth() + 3));
      
      // Update or create subscription with 3 months free trial
      const { error } = await supabase
        .from('subscriptions')
        .upsert({
          company_id: profile.company_id,
          plan_id: planId,
          plan_name: planName,
          status: 'trial',
          billing_cycle: billingCycle,
          max_employees: plan.is_unlimited ? null : plan.max_employees || plan.min_employees,
          current_period_start: new Date().toISOString(),
          current_period_end: trialEnd.toISOString(),
        }, {
          onConflict: 'company_id'
        });
      
      if (error) throw error;
      
      // Refresh data
      const { data: newSub } = await supabase
        .from('subscriptions')
        .select('status, plan_name, max_employees, current_period_end, current_period_start, billing_cycle, plan_id')
        .eq('company_id', profile.company_id)
        .single();
      
      if (newSub) setSubscription(newSub);
      
      toast.success(language === 'ar' 
        ? `تم تفعيل باقة ${planName} لمدة 3 أشهر مجاناً!`
        : `${planName} plan activated for 3 months free!`);
    } catch (error) {
      console.error('Error upgrading plan:', error);
      toast.error(language === 'ar' ? 'فشل في تغيير الباقة' : 'Failed to change plan');
    } finally {
      setUpgrading(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-success/20 text-success border-success/30">{language === 'ar' ? 'نشط' : 'Active'}</Badge>;
      case 'trial':
        return <Badge className="bg-warning/20 text-warning border-warning/30">{language === 'ar' ? 'تجريبي' : 'Trial'}</Badge>;
      case 'cancelled':
        return <Badge className="bg-destructive/20 text-destructive border-destructive/30">{language === 'ar' ? 'ملغي' : 'Cancelled'}</Badge>;
      case 'expired':
        return <Badge className="bg-destructive/20 text-destructive border-destructive/30">{language === 'ar' ? 'منتهي' : 'Expired'}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPrice = (plan: PlanInfo) => {
    switch (billingCycle) {
      case 'quarterly':
        return plan.price_quarterly || plan.price_monthly * 3;
      case 'yearly':
        return plan.price_yearly || plan.price_monthly * 12;
      default:
        return plan.price_monthly;
    }
  };

  const getBillingLabel = () => {
    switch (billingCycle) {
      case 'quarterly':
        return language === 'ar' ? '/3 أشهر' : '/quarter';
      case 'yearly':
        return language === 'ar' ? '/سنة' : '/year';
      default:
        return language === 'ar' ? '/شهر' : '/month';
    }
  };

  const employeePercentage = subscription?.max_employees 
    ? Math.min((employeeCount / subscription.max_employees) * 100, 100)
    : 0;

  const daysRemaining = subscription?.current_period_end 
    ? Math.max(0, Math.ceil((new Date(subscription.current_period_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h1 className="text-2xl font-bold text-foreground">
            {language === 'ar' ? 'الاشتراك والباقات' : 'Subscription & Plans'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {language === 'ar' ? 'إدارة اشتراكك وترقية باقتك' : 'Manage your subscription and upgrade your plan'}
          </p>
        </motion.div>

        {/* Current Subscription */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-primary" />
                {language === 'ar' ? 'اشتراكك الحالي' : 'Your Current Subscription'}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <div className="grid gap-4 sm:gap-6 grid-cols-2 lg:grid-cols-4">
                {/* Plan Name */}
                <div className="space-y-1">
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    {language === 'ar' ? 'الباقة' : 'Plan'}
                  </p>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                    <p className="text-base sm:text-xl font-bold text-foreground truncate">
                      {subscription?.plan_name || (language === 'ar' ? 'لا يوجد' : 'None')}
                    </p>
                    {subscription && getStatusBadge(subscription.status)}
                  </div>
                </div>

                {/* Billing Cycle */}
                <div className="space-y-1">
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    {language === 'ar' ? 'الدورة' : 'Cycle'}
                  </p>
                  <p className="text-base sm:text-xl font-bold text-foreground">
                    {subscription?.billing_cycle === 'monthly' 
                      ? (language === 'ar' ? 'شهري' : 'Monthly')
                      : subscription?.billing_cycle === 'quarterly'
                      ? (language === 'ar' ? 'ربع سنوي' : 'Quarterly')
                      : (language === 'ar' ? 'سنوي' : 'Yearly')}
                  </p>
                </div>

                {/* Days Remaining */}
                <div className="space-y-1">
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    {language === 'ar' ? 'المتبقي' : 'Remaining'}
                  </p>
                  <p className={`text-base sm:text-xl font-bold ${daysRemaining <= 7 ? 'text-destructive' : 'text-foreground'}`}>
                    {daysRemaining} {language === 'ar' ? 'يوم' : 'days'}
                  </p>
                </div>

                {/* Expiry Date */}
                <div className="space-y-1">
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    {language === 'ar' ? 'الانتهاء' : 'Expiry'}
                  </p>
                  <p className="text-base sm:text-xl font-bold text-foreground">
                    {subscription?.current_period_end
                      ? format(new Date(subscription.current_period_end), 'PP', { locale: language === 'ar' ? ar : undefined })
                      : '—'}
                  </p>
                </div>
              </div>

              {/* Employee Usage */}
              {subscription?.max_employees && (
                <div className="mt-6 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      {language === 'ar' ? 'استخدام الموظفين' : 'Employee Usage'}
                    </span>
                    <span className="font-medium">
                      {employeeCount} / {subscription.max_employees} 
                      <span className="text-muted-foreground ms-1">
                        ({Math.round(employeePercentage)}%)
                      </span>
                    </span>
                  </div>
                  <Progress 
                    value={employeePercentage} 
                    className={`h-3 ${employeePercentage >= 90 ? '[&>div]:bg-destructive' : employeePercentage >= 70 ? '[&>div]:bg-warning' : ''}`} 
                  />
                  {employeePercentage >= 90 && (
                    <p className="text-xs text-destructive">
                      {language === 'ar' 
                        ? 'أنت على وشك الوصول للحد الأقصى! قم بترقية باقتك.'
                        : 'You\'re approaching the limit! Consider upgrading.'}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Available Plans */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-primary" />
                    {language === 'ar' ? 'الباقات المتاحة' : 'Available Plans'}
                  </CardTitle>
                  <CardDescription>
                    {language === 'ar' ? 'اختر الباقة المناسبة لاحتياجاتك' : 'Choose the plan that fits your needs'}
                  </CardDescription>
                </div>
                
                {/* Billing Toggle */}
                <Tabs value={billingCycle} onValueChange={(v) => setBillingCycle(v as any)}>
                  <TabsList>
                    <TabsTrigger value="monthly">
                      {language === 'ar' ? 'شهري' : 'Monthly'}
                    </TabsTrigger>
                    <TabsTrigger value="quarterly">
                      {language === 'ar' ? 'ربع سنوي' : 'Quarterly'}
                    </TabsTrigger>
                    <TabsTrigger value="yearly" className="relative">
                      {language === 'ar' ? 'سنوي' : 'Yearly'}
                      <Badge className="absolute -top-2 -end-2 text-[10px] px-1 py-0 bg-success">
                        {language === 'ar' ? 'وفر 20%' : 'Save 20%'}
                      </Badge>
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" data-tour="plan-cards">
                {plans.map((plan, index) => {
                  const isCurrentPlan = subscription?.plan_id === plan.id;
                  const features = Array.isArray(plan.features) ? plan.features : [];
                  
                  return (
                    <motion.div
                      key={plan.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                    >
                      <Card className={`relative h-full transition-all ${isCurrentPlan ? 'border-primary ring-2 ring-primary/20' : 'hover:border-primary/50'}`}>
                        {isCurrentPlan && (
                          <Badge className="absolute -top-2 start-4 bg-primary">
                            {language === 'ar' ? 'باقتك الحالية' : 'Current Plan'}
                          </Badge>
                        )}
                        <CardHeader>
                          <CardTitle className="flex items-center justify-between">
                            <span>{language === 'ar' ? plan.name_ar || plan.name : plan.name}</span>
                            {index === 1 && (
                              <Badge variant="secondary" className="gap-1">
                                <Star className="w-3 h-3" />
                                {language === 'ar' ? 'الأكثر شعبية' : 'Popular'}
                              </Badge>
                            )}
                          </CardTitle>
                          <CardDescription>
                            {plan.is_unlimited 
                              ? (language === 'ar' ? 'عدد موظفين غير محدود' : 'Unlimited employees')
                              : plan.max_employees
                              ? (language === 'ar' 
                                  ? `من ${plan.min_employees} إلى ${plan.max_employees} موظف` 
                                  : `${plan.min_employees} to ${plan.max_employees} employees`)
                              : (language === 'ar' 
                                  ? `حتى ${plan.min_employees} موظف` 
                                  : `Up to ${plan.min_employees} employees`)}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div>
                            <span className="text-3xl font-bold text-primary">
                              {getPrice(plan)}
                            </span>
                            <span className="text-muted-foreground ms-1">
                              {plan.currency}{getBillingLabel()}
                            </span>
                          </div>

                          {features.length > 0 && (
                            <ul className="space-y-2">
                              {features.slice(0, 5).map((feature: string, i: number) => (
                                <li key={i} className="flex items-center gap-2 text-sm">
                                  <Check className="w-4 h-4 text-success flex-shrink-0" />
                                  <span>{feature}</span>
                                </li>
                              ))}
                            </ul>
                          )}

                          <Button 
                            className="w-full"
                            variant={isCurrentPlan ? 'outline' : 'default'}
                            disabled={upgrading === plan.id}
                            onClick={() => !isCurrentPlan && handleUpgrade(plan.id, language === 'ar' ? plan.name_ar || plan.name : plan.name, plan)}
                          >
                            {upgrading === plan.id && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
                            {isCurrentPlan 
                              ? (language === 'ar' ? 'باقتك الحالية' : 'Current Plan')
                              : (language === 'ar' ? 'تفعيل مجاناً لـ 3 أشهر' : 'Activate Free for 3 Months')}
                          </Button>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </DashboardLayout>
  );
};

export default Subscription;
