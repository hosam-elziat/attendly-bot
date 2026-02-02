-- Create permission_requests table for late arrival / early departure requests
CREATE TABLE public.permission_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  permission_type TEXT NOT NULL CHECK (permission_type IN ('late_arrival', 'early_departure')),
  request_date DATE NOT NULL DEFAULT CURRENT_DATE,
  minutes INTEGER NOT NULL DEFAULT 60,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add index for common queries
CREATE INDEX idx_permission_requests_employee ON public.permission_requests(employee_id, request_date);
CREATE INDEX idx_permission_requests_company_status ON public.permission_requests(company_id, status);
CREATE INDEX idx_permission_requests_date ON public.permission_requests(request_date, status);

-- Enable RLS
ALTER TABLE public.permission_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Managers (owner/admin) can view all company permission requests
CREATE POLICY "Managers can view company permission requests" 
ON public.permission_requests 
FOR SELECT 
USING (
  company_id IN (
    SELECT p.company_id FROM profiles p WHERE p.user_id = auth.uid()
  ) AND (
    is_saas_team_member(auth.uid()) OR
    is_admin_or_owner(auth.uid())
  )
);

-- Employees can view their own requests
CREATE POLICY "Employees can view own permission requests"
ON public.permission_requests
FOR SELECT
USING (
  employee_id IN (
    SELECT e.id FROM employees e WHERE e.user_id = auth.uid()
  )
);

-- Managers can insert/update permission requests
CREATE POLICY "Managers can manage permission requests"
ON public.permission_requests
FOR ALL
USING (
  company_id IN (
    SELECT p.company_id FROM profiles p WHERE p.user_id = auth.uid()
  ) AND (
    is_saas_team_member(auth.uid()) OR
    is_admin_or_owner(auth.uid())
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_permission_requests_updated_at
BEFORE UPDATE ON public.permission_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();