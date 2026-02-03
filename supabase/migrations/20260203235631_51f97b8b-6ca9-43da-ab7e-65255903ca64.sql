-- Create table for multiple business owners per company
CREATE TABLE public.business_owners (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID,
  UNIQUE (company_id, employee_id)
);

-- Enable RLS
ALTER TABLE public.business_owners ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view business owners in their company" 
ON public.business_owners 
FOR SELECT 
USING (
  company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  OR public.is_saas_team_member(auth.uid())
);

CREATE POLICY "Admins can manage business owners" 
ON public.business_owners 
FOR ALL 
USING (
  company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  OR public.is_saas_team_member(auth.uid())
);

-- Function to auto-assign first employee as business owner
CREATE OR REPLACE FUNCTION public.auto_assign_first_business_owner()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id UUID;
  v_has_owner BOOLEAN;
BEGIN
  v_company_id := NEW.company_id;
  
  -- Check if company already has a business owner
  SELECT EXISTS (
    SELECT 1 FROM business_owners WHERE company_id = v_company_id
  ) INTO v_has_owner;
  
  -- If no owner and the employee has a user_id, assign them
  IF NOT v_has_owner AND NEW.user_id IS NOT NULL THEN
    INSERT INTO business_owners (company_id, employee_id)
    VALUES (v_company_id, NEW.id)
    ON CONFLICT DO NOTHING;
    
    -- Also update the legacy business_owner_id
    UPDATE companies SET business_owner_id = NEW.user_id WHERE id = v_company_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for auto-assignment
CREATE TRIGGER trigger_auto_assign_business_owner
  AFTER INSERT ON public.employees
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_first_business_owner();

-- Migrate existing business_owner_id to new table
INSERT INTO public.business_owners (company_id, employee_id)
SELECT c.id, e.id
FROM companies c
JOIN employees e ON e.company_id = c.id AND e.user_id = c.business_owner_id
WHERE c.business_owner_id IS NOT NULL
ON CONFLICT DO NOTHING;