-- =============================================
-- MULTI-TENANT HR & ATTENDANCE DATABASE SCHEMA
-- =============================================

-- 1. Create ENUM types for various statuses
CREATE TYPE public.user_role AS ENUM ('owner', 'admin', 'manager', 'employee');
CREATE TYPE public.salary_type AS ENUM ('monthly', 'daily');
CREATE TYPE public.leave_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE public.leave_type AS ENUM ('vacation', 'sick', 'personal');
CREATE TYPE public.subscription_status AS ENUM ('active', 'inactive', 'trial', 'cancelled');
CREATE TYPE public.attendance_status AS ENUM ('checked_in', 'on_break', 'checked_out');

-- 2. Companies table (tenants)
CREATE TABLE public.companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  owner_id UUID NOT NULL,
  timezone TEXT DEFAULT 'UTC+0',
  work_start_time TIME DEFAULT '09:00:00',
  work_end_time TIME DEFAULT '17:00:00',
  break_duration_minutes INTEGER DEFAULT 60,
  telegram_bot_token TEXT,
  telegram_bot_connected BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. User profiles linked to auth.users
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  avatar_url TEXT,
  language TEXT DEFAULT 'en',
  theme TEXT DEFAULT 'light',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. User roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  role public.user_role NOT NULL DEFAULT 'employee',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, company_id)
);

-- 5. Employees table (extended employee data)
CREATE TABLE public.employees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  department TEXT,
  salary_type public.salary_type DEFAULT 'monthly',
  base_salary DECIMAL(12, 2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  telegram_chat_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 6. Attendance logs
CREATE TABLE public.attendance_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  check_in_time TIMESTAMP WITH TIME ZONE,
  check_out_time TIMESTAMP WITH TIME ZONE,
  status public.attendance_status DEFAULT 'checked_in',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 7. Break logs
CREATE TABLE public.break_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  attendance_id UUID REFERENCES public.attendance_logs(id) ON DELETE CASCADE NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  end_time TIMESTAMP WITH TIME ZONE,
  duration_minutes INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 8. Leave requests
CREATE TABLE public.leave_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  leave_type public.leave_type NOT NULL DEFAULT 'vacation',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days INTEGER NOT NULL,
  reason TEXT,
  status public.leave_status DEFAULT 'pending',
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 9. Salary adjustments (bonuses and deductions)
CREATE TABLE public.salary_adjustments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  month DATE NOT NULL,
  bonus DECIMAL(12, 2) DEFAULT 0,
  deduction DECIMAL(12, 2) DEFAULT 0,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 10. Salary records (monthly calculations)
CREATE TABLE public.salary_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  month DATE NOT NULL,
  work_days INTEGER DEFAULT 0,
  total_days INTEGER DEFAULT 22,
  base_salary DECIMAL(12, 2) DEFAULT 0,
  total_bonus DECIMAL(12, 2) DEFAULT 0,
  total_deductions DECIMAL(12, 2) DEFAULT 0,
  net_salary DECIMAL(12, 2) DEFAULT 0,
  status TEXT DEFAULT 'pending',
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 11. Subscriptions table
CREATE TABLE public.subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL UNIQUE,
  status public.subscription_status DEFAULT 'trial',
  plan_name TEXT DEFAULT 'trial',
  current_period_start TIMESTAMP WITH TIME ZONE DEFAULT now(),
  current_period_end TIMESTAMP WITH TIME ZONE DEFAULT now() + INTERVAL '14 days',
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =============================================
-- ENABLE ROW LEVEL SECURITY ON ALL TABLES
-- =============================================
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.break_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salary_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salary_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- =============================================
-- SECURITY DEFINER FUNCTIONS (to avoid infinite recursion)
-- =============================================

-- Function to get user's company_id
CREATE OR REPLACE FUNCTION public.get_user_company_id(p_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM public.profiles WHERE user_id = p_user_id LIMIT 1;
$$;

-- Function to check if user has specific role in company
CREATE OR REPLACE FUNCTION public.has_role(p_user_id UUID, p_role public.user_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = p_user_id AND role = p_role
  );
$$;

-- Function to check if user is admin or owner
CREATE OR REPLACE FUNCTION public.is_admin_or_owner(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = p_user_id AND role IN ('admin', 'owner')
  );
$$;

-- Function to check if user belongs to company
CREATE OR REPLACE FUNCTION public.belongs_to_company(p_user_id UUID, p_company_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = p_user_id AND company_id = p_company_id
  );
$$;

-- =============================================
-- RLS POLICIES
-- =============================================

-- COMPANIES policies
CREATE POLICY "Users can view their own company"
  ON public.companies FOR SELECT
  USING (public.belongs_to_company(auth.uid(), id));

CREATE POLICY "Owners can update their company"
  ON public.companies FOR UPDATE
  USING (owner_id = auth.uid());

CREATE POLICY "Authenticated users can create companies"
  ON public.companies FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- PROFILES policies
CREATE POLICY "Users can view profiles in their company"
  ON public.profiles FOR SELECT
  USING (company_id = public.get_user_company_id(auth.uid()) OR user_id = auth.uid());

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Authenticated users can create their profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- USER_ROLES policies
CREATE POLICY "Users can view roles in their company"
  ON public.user_roles FOR SELECT
  USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Admins can manage roles in their company"
  ON public.user_roles FOR ALL
  USING (
    public.is_admin_or_owner(auth.uid()) AND 
    company_id = public.get_user_company_id(auth.uid())
  );

-- EMPLOYEES policies
CREATE POLICY "Company members can view employees"
  ON public.employees FOR SELECT
  USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Admins can manage employees"
  ON public.employees FOR ALL
  USING (
    public.is_admin_or_owner(auth.uid()) AND 
    company_id = public.get_user_company_id(auth.uid())
  );

-- ATTENDANCE_LOGS policies
CREATE POLICY "Company members can view attendance"
  ON public.attendance_logs FOR SELECT
  USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Company members can insert attendance"
  ON public.attendance_logs FOR INSERT
  WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Admins can update attendance"
  ON public.attendance_logs FOR UPDATE
  USING (
    public.is_admin_or_owner(auth.uid()) AND 
    company_id = public.get_user_company_id(auth.uid())
  );

-- BREAK_LOGS policies
CREATE POLICY "Company members can view breaks"
  ON public.break_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.attendance_logs a 
      WHERE a.id = attendance_id 
      AND a.company_id = public.get_user_company_id(auth.uid())
    )
  );

CREATE POLICY "Company members can manage breaks"
  ON public.break_logs FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.attendance_logs a 
      WHERE a.id = attendance_id 
      AND a.company_id = public.get_user_company_id(auth.uid())
    )
  );

-- LEAVE_REQUESTS policies
CREATE POLICY "Company members can view leave requests"
  ON public.leave_requests FOR SELECT
  USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Company members can create leave requests"
  ON public.leave_requests FOR INSERT
  WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Admins can update leave requests"
  ON public.leave_requests FOR UPDATE
  USING (
    public.is_admin_or_owner(auth.uid()) AND 
    company_id = public.get_user_company_id(auth.uid())
  );

-- SALARY_ADJUSTMENTS policies
CREATE POLICY "Admins can view salary adjustments"
  ON public.salary_adjustments FOR SELECT
  USING (
    public.is_admin_or_owner(auth.uid()) AND 
    company_id = public.get_user_company_id(auth.uid())
  );

CREATE POLICY "Admins can manage salary adjustments"
  ON public.salary_adjustments FOR ALL
  USING (
    public.is_admin_or_owner(auth.uid()) AND 
    company_id = public.get_user_company_id(auth.uid())
  );

-- SALARY_RECORDS policies
CREATE POLICY "Admins can view salary records"
  ON public.salary_records FOR SELECT
  USING (
    public.is_admin_or_owner(auth.uid()) AND 
    company_id = public.get_user_company_id(auth.uid())
  );

CREATE POLICY "Admins can manage salary records"
  ON public.salary_records FOR ALL
  USING (
    public.is_admin_or_owner(auth.uid()) AND 
    company_id = public.get_user_company_id(auth.uid())
  );

-- SUBSCRIPTIONS policies
CREATE POLICY "Company members can view subscription"
  ON public.subscriptions FOR SELECT
  USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Owners can manage subscription"
  ON public.subscriptions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.companies c 
      WHERE c.id = company_id AND c.owner_id = auth.uid()
    )
  );

-- =============================================
-- TRIGGERS FOR AUTO-UPDATING TIMESTAMPS
-- =============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_employees_updated_at
  BEFORE UPDATE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_attendance_updated_at
  BEFORE UPDATE ON public.attendance_logs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_leave_requests_updated_at
  BEFORE UPDATE ON public.leave_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================
CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX idx_profiles_company_id ON public.profiles(company_id);
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_company_id ON public.user_roles(company_id);
CREATE INDEX idx_employees_company_id ON public.employees(company_id);
CREATE INDEX idx_attendance_company_id ON public.attendance_logs(company_id);
CREATE INDEX idx_attendance_employee_id ON public.attendance_logs(employee_id);
CREATE INDEX idx_attendance_date ON public.attendance_logs(date);
CREATE INDEX idx_leave_requests_company_id ON public.leave_requests(company_id);
CREATE INDEX idx_leave_requests_status ON public.leave_requests(status);
CREATE INDEX idx_salary_records_company_id ON public.salary_records(company_id);