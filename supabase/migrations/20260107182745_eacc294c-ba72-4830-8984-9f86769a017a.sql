
-- Create subscription_plans table for managing pricing plans
CREATE TABLE public.subscription_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  name_ar TEXT,
  description TEXT,
  min_employees INTEGER NOT NULL DEFAULT 1,
  max_employees INTEGER,
  price_monthly NUMERIC NOT NULL DEFAULT 0,
  price_quarterly NUMERIC,
  price_yearly NUMERIC,
  currency TEXT NOT NULL DEFAULT 'EGP',
  trial_days INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  is_unlimited BOOLEAN DEFAULT false,
  features JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create discount_codes table
CREATE TABLE public.discount_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  discount_type TEXT NOT NULL DEFAULT 'percentage', -- percentage or fixed
  discount_value NUMERIC NOT NULL,
  max_uses INTEGER,
  used_count INTEGER DEFAULT 0,
  valid_from TIMESTAMP WITH TIME ZONE DEFAULT now(),
  valid_until TIMESTAMP WITH TIME ZONE,
  applicable_plans UUID[],
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discount_codes ENABLE ROW LEVEL SECURITY;

-- RLS policies for subscription_plans
CREATE POLICY "Everyone can view active plans" 
ON public.subscription_plans 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "SaaS admins can manage plans" 
ON public.subscription_plans 
FOR ALL 
USING (is_saas_admin(auth.uid()));

-- RLS policies for discount_codes
CREATE POLICY "SaaS team can view discount codes" 
ON public.discount_codes 
FOR SELECT 
USING (is_saas_team_member(auth.uid()));

CREATE POLICY "SaaS admins can manage discount codes" 
ON public.discount_codes 
FOR ALL 
USING (is_saas_admin(auth.uid()));

-- Add plan_id to subscriptions table
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES public.subscription_plans(id);
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS discount_code_id UUID REFERENCES public.discount_codes(id);
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS billing_cycle TEXT DEFAULT 'monthly';
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS max_employees INTEGER DEFAULT 10;

-- Add RLS for telegram_bots for SaaS team
CREATE POLICY "SaaS team can view all bots" 
ON public.telegram_bots 
FOR SELECT 
USING (is_saas_team_member(auth.uid()));

CREATE POLICY "SaaS admins can manage all bots" 
ON public.telegram_bots 
FOR ALL 
USING (is_saas_admin(auth.uid()));

-- Insert default plans
INSERT INTO public.subscription_plans (name, name_ar, description, min_employees, max_employees, price_monthly, price_quarterly, price_yearly, currency, trial_days, features) VALUES
('Starter', 'المبتدئ', 'Perfect for small teams', 1, 10, 0, 0, 0, 'EGP', 90, '["Up to 10 employees", "Basic attendance", "Telegram bot"]'),
('Pro', 'الاحترافي', 'For growing businesses', 11, 30, 200, 540, 1920, 'EGP', 14, '["Up to 30 employees", "Advanced reports", "Priority support"]'),
('Gold', 'الذهبي', 'For large organizations', 31, 50, 500, 1350, 4800, 'EGP', 14, '["Up to 50 employees", "All features", "Dedicated support"]'),
('Enterprise', 'المؤسسات', 'Unlimited everything', 51, NULL, 1000, 2700, 9600, 'EGP', 14, '["Unlimited employees", "Custom integrations", "24/7 support"]');

-- Triggers for updated_at
CREATE TRIGGER update_subscription_plans_updated_at
BEFORE UPDATE ON public.subscription_plans
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_discount_codes_updated_at
BEFORE UPDATE ON public.discount_codes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
