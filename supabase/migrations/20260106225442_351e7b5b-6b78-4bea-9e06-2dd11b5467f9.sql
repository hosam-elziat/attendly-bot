
-- Add attendance policy fields to companies table
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS daily_late_allowance_minutes integer DEFAULT 15,
ADD COLUMN IF NOT EXISTS monthly_late_allowance_minutes integer DEFAULT 60,
ADD COLUMN IF NOT EXISTS late_under_15_deduction numeric DEFAULT 0.25,
ADD COLUMN IF NOT EXISTS late_15_to_30_deduction numeric DEFAULT 0.5,
ADD COLUMN IF NOT EXISTS late_over_30_deduction numeric DEFAULT 1,
ADD COLUMN IF NOT EXISTS absence_without_permission_deduction numeric DEFAULT 2,
ADD COLUMN IF NOT EXISTS max_excused_absence_days integer DEFAULT 2;

-- Add late balance tracking to employees
ALTER TABLE public.employees
ADD COLUMN IF NOT EXISTS monthly_late_balance_minutes integer DEFAULT 60;

-- Create attendance_policies table for more flexible rules
CREATE TABLE IF NOT EXISTS public.attendance_policies (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  policy_name text NOT NULL,
  policy_description text,
  late_threshold_minutes integer NOT NULL DEFAULT 15,
  deduction_amount numeric NOT NULL DEFAULT 0.25,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.attendance_policies ENABLE ROW LEVEL SECURITY;

-- RLS Policies for attendance_policies
CREATE POLICY "Company members can view attendance policies"
ON public.attendance_policies
FOR SELECT
USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Admins can manage attendance policies"
ON public.attendance_policies
FOR ALL
USING (is_admin_or_owner(auth.uid()) AND company_id = get_user_company_id(auth.uid()));

-- Create trigger for updated_at
CREATE TRIGGER update_attendance_policies_updated_at
BEFORE UPDATE ON public.attendance_policies
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
