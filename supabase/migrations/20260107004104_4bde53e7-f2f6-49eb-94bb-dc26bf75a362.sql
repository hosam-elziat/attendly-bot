-- إضافة دور super_admin للـ enum
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'super_admin';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'support';

-- جدول فريق عمل SaaS
CREATE TABLE public.saas_team (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('super_admin', 'manager', 'support', 'viewer')),
  permissions JSONB DEFAULT '{"view_companies": true, "manage_companies": false, "view_employees": true, "manage_subscriptions": false}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id),
  UNIQUE(email)
);

-- تمكين RLS
ALTER TABLE public.saas_team ENABLE ROW LEVEL SECURITY;

-- دالة للتحقق من كون المستخدم super_admin
CREATE OR REPLACE FUNCTION public.is_saas_admin(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.saas_team 
    WHERE user_id = p_user_id 
    AND role = 'super_admin' 
    AND is_active = true
  );
$$;

-- دالة للتحقق من كون المستخدم عضو في فريق SaaS
CREATE OR REPLACE FUNCTION public.is_saas_team_member(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.saas_team 
    WHERE user_id = p_user_id 
    AND is_active = true
  );
$$;

-- دالة لجلب صلاحيات عضو الفريق
CREATE OR REPLACE FUNCTION public.get_saas_team_permissions(p_user_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT COALESCE(permissions, '{}'::jsonb) FROM public.saas_team 
  WHERE user_id = p_user_id AND is_active = true
  LIMIT 1;
$$;

-- سياسات RLS لجدول saas_team
CREATE POLICY "Super admins can manage team"
ON public.saas_team
FOR ALL
USING (is_saas_admin(auth.uid()));

CREATE POLICY "Team members can view their own record"
ON public.saas_team
FOR SELECT
USING (user_id = auth.uid());

-- سياسات للسماح لفريق SaaS بمشاهدة كل الشركات
CREATE POLICY "SaaS team can view all companies"
ON public.companies
FOR SELECT
USING (is_saas_team_member(auth.uid()));

CREATE POLICY "SaaS admins can update any company"
ON public.companies
FOR UPDATE
USING (is_saas_admin(auth.uid()));

-- سياسات للسماح لفريق SaaS بمشاهدة كل الموظفين
CREATE POLICY "SaaS team can view all employees"
ON public.employees
FOR SELECT
USING (is_saas_team_member(auth.uid()));

-- سياسات للسماح لفريق SaaS بمشاهدة كل الحضور
CREATE POLICY "SaaS team can view all attendance"
ON public.attendance_logs
FOR SELECT
USING (is_saas_team_member(auth.uid()));

-- سياسات للسماح لفريق SaaS بمشاهدة كل الاشتراكات
CREATE POLICY "SaaS team can view all subscriptions"
ON public.subscriptions
FOR SELECT
USING (is_saas_team_member(auth.uid()));

CREATE POLICY "SaaS admins can manage all subscriptions"
ON public.subscriptions
FOR ALL
USING (is_saas_admin(auth.uid()));

-- سياسات للسماح لفريق SaaS بمشاهدة كل الإجازات
CREATE POLICY "SaaS team can view all leave requests"
ON public.leave_requests
FOR SELECT
USING (is_saas_team_member(auth.uid()));

-- سياسات للسماح لفريق SaaS بمشاهدة كل البروفايلات
CREATE POLICY "SaaS team can view all profiles"
ON public.profiles
FOR SELECT
USING (is_saas_team_member(auth.uid()));

-- Trigger لتحديث updated_at
CREATE TRIGGER update_saas_team_updated_at
BEFORE UPDATE ON public.saas_team
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();