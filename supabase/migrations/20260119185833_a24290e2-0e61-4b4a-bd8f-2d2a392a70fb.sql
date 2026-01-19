-- إضافة عمود is_suspended للشركات لدعم الإيقاف المؤقت
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS is_suspended boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS suspended_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS suspended_by uuid,
ADD COLUMN IF NOT EXISTS suspended_reason text,
ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS deleted_by uuid,
ADD COLUMN IF NOT EXISTS last_activity_at timestamp with time zone DEFAULT now(),
ADD COLUMN IF NOT EXISTS phone text;

-- جدول سجل عمليات Super Admin
CREATE TABLE IF NOT EXISTS public.super_admin_activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  admin_email text,
  admin_name text,
  action text NOT NULL,
  action_type text NOT NULL CHECK (action_type IN ('view', 'create', 'update', 'delete', 'suspend', 'activate', 'password_reset', 'force_logout', 'subscription_change', 'other')),
  target_type text NOT NULL CHECK (target_type IN ('company', 'employee', 'subscription', 'telegram_bot', 'backup', 'system', 'user_account', 'other')),
  target_id uuid,
  target_name text,
  company_id uuid,
  company_name text,
  ip_address text,
  user_agent text,
  details jsonb,
  created_at timestamp with time zone DEFAULT now()
);

-- جدول تنبيهات النظام
CREATE TABLE IF NOT EXISTS public.system_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type text NOT NULL CHECK (alert_type IN ('subscription_expiring', 'limit_reached', 'bot_disconnected', 'unusual_activity', 'system_error', 'payment_failed', 'new_company', 'other')),
  severity text NOT NULL CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  title text NOT NULL,
  message text NOT NULL,
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  company_name text,
  is_read boolean DEFAULT false,
  is_resolved boolean DEFAULT false,
  resolved_at timestamp with time zone,
  resolved_by uuid,
  metadata jsonb,
  created_at timestamp with time zone DEFAULT now()
);

-- جدول جلسات المستخدمين (لتتبع تسجيل الدخول)
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  email text,
  ip_address text,
  user_agent text,
  device_info jsonb,
  is_active boolean DEFAULT true,
  last_activity_at timestamp with time zone DEFAULT now(),
  logged_in_at timestamp with time zone DEFAULT now(),
  logged_out_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.super_admin_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- RLS policies for super_admin_activity_logs
CREATE POLICY "SaaS team can insert activity logs"
ON public.super_admin_activity_logs
FOR INSERT
WITH CHECK (is_saas_team_member(auth.uid()));

CREATE POLICY "SaaS team can view activity logs"
ON public.super_admin_activity_logs
FOR SELECT
USING (is_saas_team_member(auth.uid()));

-- RLS policies for system_alerts
CREATE POLICY "SaaS team can manage alerts"
ON public.system_alerts
FOR ALL
USING (is_saas_team_member(auth.uid()));

-- RLS policies for user_sessions
CREATE POLICY "SaaS team can view all sessions"
ON public.user_sessions
FOR SELECT
USING (is_saas_team_member(auth.uid()));

CREATE POLICY "SaaS team can manage sessions"
ON public.user_sessions
FOR ALL
USING (is_saas_team_member(auth.uid()));

CREATE POLICY "Users can view their own sessions"
ON public.user_sessions
FOR SELECT
USING (user_id = auth.uid());

-- Add policy for SaaS admins to delete companies (soft delete)
CREATE POLICY "SaaS admins can soft delete companies"
ON public.companies
FOR UPDATE
USING (is_saas_admin(auth.uid()))
WITH CHECK (is_saas_admin(auth.uid()));

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_super_admin_activity_logs_admin_id ON public.super_admin_activity_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_super_admin_activity_logs_created_at ON public.super_admin_activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_super_admin_activity_logs_company_id ON public.super_admin_activity_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_super_admin_activity_logs_action_type ON public.super_admin_activity_logs(action_type);

CREATE INDEX IF NOT EXISTS idx_system_alerts_is_read ON public.system_alerts(is_read);
CREATE INDEX IF NOT EXISTS idx_system_alerts_severity ON public.system_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_system_alerts_created_at ON public.system_alerts(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_is_active ON public.user_sessions(is_active);

CREATE INDEX IF NOT EXISTS idx_companies_is_suspended ON public.companies(is_suspended);
CREATE INDEX IF NOT EXISTS idx_companies_is_deleted ON public.companies(is_deleted);
CREATE INDEX IF NOT EXISTS idx_companies_last_activity_at ON public.companies(last_activity_at DESC);