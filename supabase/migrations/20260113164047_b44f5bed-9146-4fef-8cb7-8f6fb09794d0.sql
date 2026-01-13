-- Create positions table for organizational hierarchy
CREATE TABLE public.positions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  title_ar TEXT,
  description TEXT,
  reports_to UUID REFERENCES public.positions(id) ON DELETE SET NULL,
  level INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create position_permissions table
CREATE TABLE public.position_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  position_id UUID NOT NULL UNIQUE REFERENCES public.positions(id) ON DELETE CASCADE,
  can_manage_attendance BOOLEAN DEFAULT false,
  can_approve_leaves BOOLEAN DEFAULT false,
  can_make_deductions BOOLEAN DEFAULT false,
  can_add_bonuses BOOLEAN DEFAULT false,
  can_view_salaries BOOLEAN DEFAULT false,
  can_manage_subordinates BOOLEAN DEFAULT false,
  can_view_reports BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add position_id to employees table
ALTER TABLE public.employees ADD COLUMN position_id UUID REFERENCES public.positions(id) ON DELETE SET NULL;

-- Enable RLS on positions
ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;

-- Positions RLS policies
CREATE POLICY "Company members can view positions"
ON public.positions
FOR SELECT
USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Admins can insert positions"
ON public.positions
FOR INSERT
WITH CHECK (is_admin_or_owner(auth.uid()) AND company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Admins can update positions"
ON public.positions
FOR UPDATE
USING (is_admin_or_owner(auth.uid()) AND company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Admins can delete positions"
ON public.positions
FOR DELETE
USING (is_admin_or_owner(auth.uid()) AND company_id = get_user_company_id(auth.uid()));

-- Enable RLS on position_permissions
ALTER TABLE public.position_permissions ENABLE ROW LEVEL SECURITY;

-- Position permissions RLS policies
CREATE POLICY "Company members can view position permissions"
ON public.position_permissions
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.positions p
  WHERE p.id = position_permissions.position_id
  AND p.company_id = get_user_company_id(auth.uid())
));

CREATE POLICY "Admins can insert position permissions"
ON public.position_permissions
FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.positions p
  WHERE p.id = position_permissions.position_id
  AND p.company_id = get_user_company_id(auth.uid())
  AND is_admin_or_owner(auth.uid())
));

CREATE POLICY "Admins can update position permissions"
ON public.position_permissions
FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.positions p
  WHERE p.id = position_permissions.position_id
  AND p.company_id = get_user_company_id(auth.uid())
  AND is_admin_or_owner(auth.uid())
));

CREATE POLICY "Admins can delete position permissions"
ON public.position_permissions
FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.positions p
  WHERE p.id = position_permissions.position_id
  AND p.company_id = get_user_company_id(auth.uid())
  AND is_admin_or_owner(auth.uid())
));

-- Create function to check if user can manage specific employee
CREATE OR REPLACE FUNCTION public.can_manage_employee(manager_employee_id UUID, target_employee_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  manager_position_id UUID;
  manager_level INTEGER;
  target_level INTEGER;
  has_permission BOOLEAN;
BEGIN
  -- Get manager's position
  SELECT e.position_id INTO manager_position_id
  FROM employees e
  WHERE e.id = manager_employee_id;
  
  IF manager_position_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Get manager's level
  SELECT p.level INTO manager_level
  FROM positions p
  WHERE p.id = manager_position_id;
  
  -- Get target's level
  SELECT COALESCE(p.level, 999) INTO target_level
  FROM employees e
  LEFT JOIN positions p ON p.id = e.position_id
  WHERE e.id = target_employee_id;
  
  -- Check if manager has permission and is at higher level
  SELECT pp.can_manage_subordinates INTO has_permission
  FROM position_permissions pp
  WHERE pp.position_id = manager_position_id;
  
  RETURN COALESCE(has_permission, FALSE) AND manager_level < target_level;
END;
$$;

-- Create triggers for updated_at
CREATE TRIGGER update_positions_updated_at
BEFORE UPDATE ON public.positions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_position_permissions_updated_at
BEFORE UPDATE ON public.position_permissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster hierarchy queries
CREATE INDEX idx_positions_reports_to ON public.positions(reports_to);
CREATE INDEX idx_positions_company_id ON public.positions(company_id);
CREATE INDEX idx_employees_position_id ON public.employees(position_id);