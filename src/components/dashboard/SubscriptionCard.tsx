import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { CreditCard, Users, Calendar, Crown, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Link } from 'react-router-dom';

interface SubscriptionInfo {
  status: string;
  plan_name: string | null;
  max_employees: number | null;
  current_period_end: string | null;
  billing_cycle: string | null;
}

interface PlanInfo {
  id: string;
  name: string;
  name_ar: string | null;
  price_monthly: number;
  price_quarterly: number | null;
  price_yearly: number | null;
  min_employees: number;
  max_employees: number | null;
  is_unlimited: boolean;
  currency: string;
}

const SubscriptionCard = () => {
  const { profile } = useAuth();
  const { language } = useLanguage();
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [plans, setPlans] = useState<PlanInfo[]>([]);
  const [employeeCount, setEmployeeCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    let retryCount = 0;
    const maxRetries = 5;

    const fetchData = async () => {
      // Wait for profile to be available
      if (!profile?.company_id) {
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
            .select('status, plan_name, max_employees, current_period_end, billing_cycle')
            .eq('company_id', profile.company_id)
            .maybeSingle(),
          supabase
            .from('subscription_plans')
            .select('id, name, name_ar, price_monthly, price_quarterly, price_yearly, min_employees, max_employees, is_unlimited, currency')
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-success/20 text-success border-success/30">{language === 'ar' ? 'نشط' : 'Active'}</Badge>;
      case 'trial':
        return <Badge className="bg-warning/20 text-warning border-warning/30">{language === 'ar' ? 'تجريبي' : 'Trial'}</Badge>;
      case 'cancelled':
        return <Badge className="bg-destructive/20 text-destructive border-destructive/30">{language === 'ar' ? 'ملغي' : 'Cancelled'}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const employeePercentage = subscription?.max_employees 
    ? Math.min((employeeCount / subscription.max_employees) * 100, 100)
    : 0;

  if (loading) {
    return (
      <Card className="card-hover">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4" data-tour="subscription-card">
      {/* Current Subscription */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Crown className="w-4 h-4 text-primary" />
            {language === 'ar' ? 'اشتراكك الحالي' : 'Your Subscription'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xl font-bold text-foreground">
                {subscription?.plan_name || (language === 'ar' ? 'لا يوجد اشتراك' : 'No Subscription')}
              </p>
              {subscription?.billing_cycle && (
                <p className="text-sm text-muted-foreground">
                  {subscription.billing_cycle === 'monthly' 
                    ? (language === 'ar' ? 'شهري' : 'Monthly')
                    : subscription.billing_cycle === 'quarterly'
                    ? (language === 'ar' ? 'ربع سنوي' : 'Quarterly')
                    : (language === 'ar' ? 'سنوي' : 'Yearly')}
                </p>
              )}
            </div>
            {subscription && getStatusBadge(subscription.status)}
          </div>

          {/* Employee Usage */}
          {subscription?.max_employees && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {language === 'ar' ? 'الموظفين' : 'Employees'}
                </span>
                <span className="font-medium">
                  {employeeCount} / {subscription.max_employees}
                </span>
              </div>
              <Progress 
                value={employeePercentage} 
                className={`h-2 ${employeePercentage >= 90 ? '[&>div]:bg-destructive' : ''}`} 
              />
            </div>
          )}

          {/* Expiry Date */}
          {subscription?.current_period_end && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span>
                {language === 'ar' ? 'ينتهي في: ' : 'Expires: '}
                {format(new Date(subscription.current_period_end), 'PPP', { locale: language === 'ar' ? ar : undefined })}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Available Plans */}
      {plans.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              {language === 'ar' ? 'الباقات المتاحة' : 'Available Plans'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {plans.slice(0, 3).map((plan) => (
                <div 
                  key={plan.id} 
                  className="flex items-center justify-between p-3 rounded-lg bg-accent/50 hover:bg-accent transition-colors"
                >
                  <div>
                    <p className="font-medium text-foreground">
                      {language === 'ar' ? plan.name_ar || plan.name : plan.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {plan.is_unlimited 
                        ? (language === 'ar' ? 'موظفين غير محدود' : 'Unlimited employees')
                        : plan.max_employees
                        ? (language === 'ar' 
                            ? `${plan.min_employees} - ${plan.max_employees} موظف` 
                            : `${plan.min_employees} - ${plan.max_employees} employees`)
                        : (language === 'ar' 
                            ? `حتى ${plan.min_employees} موظف` 
                            : `Up to ${plan.min_employees} employees`)}
                    </p>
                  </div>
                  <div className="text-end">
                    <p className="font-bold text-primary">
                      {plan.price_monthly} {plan.currency}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {language === 'ar' ? '/شهر' : '/month'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            {plans.length > 3 && (
              <Button variant="link" className="w-full mt-2 text-primary" asChild>
                <Link to="/dashboard/subscription">
                  {language === 'ar' ? 'عرض جميع الباقات' : 'View all plans'}
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SubscriptionCard;
