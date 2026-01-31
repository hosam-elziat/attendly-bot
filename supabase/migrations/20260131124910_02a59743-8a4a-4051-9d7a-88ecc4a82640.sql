-- ============================================
-- SUPER ADMIN ADVANCED SYSTEM - COMPLETE SETUP
-- ============================================

-- 1. Feature Flags System
-- ============================================
CREATE TABLE IF NOT EXISTS public.feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  name_ar TEXT,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'module',
  is_enabled_globally BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Default feature flags
INSERT INTO public.feature_flags (name, name_ar, description, category, is_enabled_globally) VALUES
  ('rewards', 'نظام المكافآت', 'نظام النقاط والمكافآت للموظفين', 'module', true),
  ('salaries', 'الرواتب', 'إدارة الرواتب والخصومات', 'module', true),
  ('attendance_approval', 'اعتماد الحضور', 'نظام اعتماد طلبات الحضور', 'module', true),
  ('marketplace', 'المتجر', 'متجر استبدال النقاط', 'module', true),
  ('ai_features', 'مميزات الذكاء الاصطناعي', 'الملخصات والتحليلات الذكية', 'module', true),
  ('biometric_verification', 'التحقق البيومتري', 'التحقق بالبصمة والوجه', 'module', true),
  ('leaves', 'الإجازات', 'إدارة الإجازات والطلبات', 'module', true),
  ('organization_chart', 'الهيكل التنظيمي', 'عرض الهيكل التنظيمي للشركة', 'module', true),
  ('chats', 'المحادثات', 'نظام المحادثات الداخلية', 'module', true),
  ('telegram_bot', 'بوت التيليجرام', 'ربط بوت التيليجرام', 'module', true)
ON CONFLICT (name) DO NOTHING;

-- Company-specific feature overrides
CREATE TABLE IF NOT EXISTS public.company_feature_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  feature_id UUID NOT NULL REFERENCES public.feature_flags(id) ON DELETE CASCADE,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  override_reason TEXT,
  overridden_by UUID,
  overridden_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(company_id, feature_id)
);

-- Plan-specific feature configuration
CREATE TABLE IF NOT EXISTS public.plan_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.subscription_plans(id) ON DELETE CASCADE,
  feature_id UUID NOT NULL REFERENCES public.feature_flags(id) ON DELETE CASCADE,
  is_included BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(plan_id, feature_id)
);

-- 2. Menu Customization System
-- ============================================
CREATE TABLE IF NOT EXISTS public.menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  name_ar TEXT NOT NULL,
  custom_label TEXT,
  icon TEXT,
  path TEXT NOT NULL,
  parent_id UUID REFERENCES public.menu_items(id),
  sort_order INTEGER DEFAULT 0,
  is_visible_globally BOOLEAN DEFAULT true,
  visible_to_roles TEXT[] DEFAULT ARRAY['owner', 'admin', 'manager', 'employee'],
  feature_flag_id UUID REFERENCES public.feature_flags(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Insert default menu items
INSERT INTO public.menu_items (name, name_ar, path, icon, sort_order, visible_to_roles) VALUES
  ('dashboard', 'لوحة التحكم', '/dashboard', 'LayoutDashboard', 1, ARRAY['owner', 'admin', 'manager', 'employee']),
  ('employees', 'الموظفين', '/dashboard/employees', 'Users', 2, ARRAY['owner', 'admin', 'manager']),
  ('attendance', 'الحضور والانصراف', '/dashboard/attendance', 'Clock', 3, ARRAY['owner', 'admin', 'manager']),
  ('leaves', 'الإجازات', '/dashboard/leaves', 'Calendar', 4, ARRAY['owner', 'admin', 'manager']),
  ('salaries', 'الرواتب', '/dashboard/salaries', 'Wallet', 5, ARRAY['owner', 'admin']),
  ('rewards', 'المكافآت', '/dashboard/rewards', 'Gift', 6, ARRAY['owner', 'admin']),
  ('telegram', 'بوت التيليجرام', '/dashboard/telegram', 'Bot', 7, ARRAY['owner', 'admin']),
  ('organization', 'الهيكل التنظيمي', '/dashboard/organization', 'Network', 8, ARRAY['owner', 'admin']),
  ('chats', 'المحادثات', '/dashboard/chats', 'MessageSquare', 9, ARRAY['owner', 'admin', 'manager']),
  ('join_requests', 'طلبات الانضمام', '/dashboard/join-requests', 'UserPlus', 10, ARRAY['owner', 'admin']),
  ('settings', 'الإعدادات', '/dashboard/settings', 'Settings', 11, ARRAY['owner', 'admin']),
  ('subscription', 'الاشتراك', '/dashboard/subscription', 'CreditCard', 12, ARRAY['owner'])
ON CONFLICT (name) DO NOTHING;

-- Company menu overrides
CREATE TABLE IF NOT EXISTS public.company_menu_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  menu_item_id UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  is_visible BOOLEAN DEFAULT true,
  custom_label TEXT,
  custom_sort_order INTEGER,
  visible_to_roles TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(company_id, menu_item_id)
);

-- 3. Enhanced Activity Logs
-- ============================================
ALTER TABLE public.super_admin_activity_logs 
ADD COLUMN IF NOT EXISTS ip_address TEXT,
ADD COLUMN IF NOT EXISTS session_id TEXT,
ADD COLUMN IF NOT EXISTS request_method TEXT,
ADD COLUMN IF NOT EXISTS severity TEXT DEFAULT 'info';

-- System Activity Feed (Real-time events)
CREATE TABLE IF NOT EXISTS public.system_activity_feed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  event_category TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  company_name TEXT,
  user_id UUID,
  user_email TEXT,
  metadata JSONB DEFAULT '{}',
  severity TEXT DEFAULT 'info',
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_feed_created ON public.system_activity_feed(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_feed_company ON public.system_activity_feed(company_id);
CREATE INDEX IF NOT EXISTS idx_activity_feed_type ON public.system_activity_feed(event_type);

-- 4. Company Snapshots (Time Travel)
-- ============================================
CREATE TABLE IF NOT EXISTS public.company_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  snapshot_type TEXT NOT NULL DEFAULT 'manual',
  snapshot_data JSONB NOT NULL,
  employees_count INTEGER,
  created_by UUID,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_snapshots_company ON public.company_snapshots(company_id, created_at DESC);

-- 5. Revenue Tracking
-- ============================================
CREATE TABLE IF NOT EXISTS public.revenue_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  amount DECIMAL(12, 2) NOT NULL,
  currency TEXT DEFAULT 'EGP',
  transaction_type TEXT NOT NULL,
  payment_method TEXT,
  status TEXT DEFAULT 'completed',
  reference_id TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_revenue_date ON public.revenue_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_revenue_company ON public.revenue_transactions(company_id);

-- 6. RLS Policies
-- ============================================
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_feature_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_menu_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_activity_feed ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revenue_transactions ENABLE ROW LEVEL SECURITY;

-- Super Admin can do everything
CREATE POLICY "Super admins have full access to feature_flags"
  ON public.feature_flags FOR ALL
  USING (public.is_saas_team_member(auth.uid()));

CREATE POLICY "Super admins have full access to company_feature_overrides"
  ON public.company_feature_overrides FOR ALL
  USING (public.is_saas_team_member(auth.uid()));

CREATE POLICY "Super admins have full access to plan_features"
  ON public.plan_features FOR ALL
  USING (public.is_saas_team_member(auth.uid()));

CREATE POLICY "Super admins have full access to menu_items"
  ON public.menu_items FOR ALL
  USING (public.is_saas_team_member(auth.uid()));

CREATE POLICY "Super admins have full access to company_menu_overrides"
  ON public.company_menu_overrides FOR ALL
  USING (public.is_saas_team_member(auth.uid()));

CREATE POLICY "Super admins have full access to system_activity_feed"
  ON public.system_activity_feed FOR ALL
  USING (public.is_saas_team_member(auth.uid()));

CREATE POLICY "Super admins have full access to company_snapshots"
  ON public.company_snapshots FOR ALL
  USING (public.is_saas_team_member(auth.uid()));

CREATE POLICY "Super admins have full access to revenue_transactions"
  ON public.revenue_transactions FOR ALL
  USING (public.is_saas_team_member(auth.uid()));

-- Companies can read their own feature config
CREATE POLICY "Companies can read their feature config"
  ON public.company_feature_overrides FOR SELECT
  USING (public.belongs_to_company(auth.uid(), company_id));

CREATE POLICY "Companies can read feature flags"
  ON public.feature_flags FOR SELECT
  USING (true);

CREATE POLICY "Companies can read menu items"
  ON public.menu_items FOR SELECT
  USING (true);

CREATE POLICY "Companies can read their menu config"
  ON public.company_menu_overrides FOR SELECT
  USING (public.belongs_to_company(auth.uid(), company_id));

-- 7. Helper functions for feature checking
-- ============================================
CREATE OR REPLACE FUNCTION public.is_feature_enabled(p_company_id UUID, p_feature_name TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_globally_enabled BOOLEAN;
  v_company_override BOOLEAN;
  v_plan_included BOOLEAN;
  v_feature_id UUID;
  v_plan_id UUID;
BEGIN
  -- Get feature
  SELECT id, is_enabled_globally INTO v_feature_id, v_globally_enabled
  FROM feature_flags WHERE name = p_feature_name;
  
  IF v_feature_id IS NULL THEN
    RETURN true; -- Feature not found, assume enabled
  END IF;
  
  -- Check company override
  SELECT is_enabled INTO v_company_override
  FROM company_feature_overrides
  WHERE company_id = p_company_id AND feature_id = v_feature_id;
  
  IF v_company_override IS NOT NULL THEN
    RETURN v_company_override;
  END IF;
  
  -- Check plan features
  SELECT s.plan_id INTO v_plan_id
  FROM subscriptions s WHERE s.company_id = p_company_id;
  
  IF v_plan_id IS NOT NULL THEN
    SELECT is_included INTO v_plan_included
    FROM plan_features WHERE plan_id = v_plan_id AND feature_id = v_feature_id;
    
    IF v_plan_included IS NOT NULL THEN
      RETURN v_plan_included;
    END IF;
  END IF;
  
  RETURN v_globally_enabled;
END;
$$;

-- Function to log system events
CREATE OR REPLACE FUNCTION public.log_system_event(
  p_event_type TEXT,
  p_event_category TEXT,
  p_title TEXT,
  p_description TEXT DEFAULT NULL,
  p_company_id UUID DEFAULT NULL,
  p_company_name TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_user_email TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}',
  p_severity TEXT DEFAULT 'info'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO system_activity_feed (
    event_type, event_category, title, description, 
    company_id, company_name, user_id, user_email, metadata, severity
  ) VALUES (
    p_event_type, p_event_category, p_title, p_description,
    p_company_id, p_company_name, p_user_id, p_user_email, p_metadata, p_severity
  ) RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$;

-- Update timestamps trigger
CREATE TRIGGER update_feature_flags_updated_at
  BEFORE UPDATE ON public.feature_flags
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();