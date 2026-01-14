-- Create a junction table for multiple reports_to relationships
CREATE TABLE public.position_reports_to (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  position_id uuid NOT NULL REFERENCES public.positions(id) ON DELETE CASCADE,
  reports_to_position_id uuid NOT NULL REFERENCES public.positions(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(position_id, reports_to_position_id)
);

-- Enable RLS
ALTER TABLE public.position_reports_to ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Company members can view position reports"
ON public.position_reports_to
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM positions p
    WHERE p.id = position_reports_to.position_id
    AND p.company_id = get_user_company_id(auth.uid())
  )
);

CREATE POLICY "Admins can insert position reports"
ON public.position_reports_to
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM positions p
    WHERE p.id = position_reports_to.position_id
    AND p.company_id = get_user_company_id(auth.uid())
    AND is_admin_or_owner(auth.uid())
  )
);

CREATE POLICY "Admins can update position reports"
ON public.position_reports_to
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM positions p
    WHERE p.id = position_reports_to.position_id
    AND p.company_id = get_user_company_id(auth.uid())
    AND is_admin_or_owner(auth.uid())
  )
);

CREATE POLICY "Admins can delete position reports"
ON public.position_reports_to
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM positions p
    WHERE p.id = position_reports_to.position_id
    AND p.company_id = get_user_company_id(auth.uid())
    AND is_admin_or_owner(auth.uid())
  )
);