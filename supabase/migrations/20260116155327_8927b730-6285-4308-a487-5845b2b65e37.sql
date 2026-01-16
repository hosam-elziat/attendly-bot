-- Create table for multiple join request reviewers (positions and employees)
CREATE TABLE public.join_request_reviewers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  reviewer_type TEXT NOT NULL CHECK (reviewer_type IN ('position', 'employee')),
  reviewer_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create unique constraint to prevent duplicates
CREATE UNIQUE INDEX idx_join_request_reviewers_unique 
ON public.join_request_reviewers(company_id, reviewer_type, reviewer_id);

-- Enable RLS
ALTER TABLE public.join_request_reviewers ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their company reviewers"
ON public.join_request_reviewers
FOR SELECT
USING (company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage reviewers"
ON public.join_request_reviewers
FOR ALL
USING (company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()));

-- Add function to auto-delete reviewers when position/employee is deleted
CREATE OR REPLACE FUNCTION delete_reviewer_on_entity_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete from join_request_reviewers when the referenced entity is deleted
  DELETE FROM public.join_request_reviewers 
  WHERE reviewer_id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger for positions deletion
CREATE TRIGGER trigger_delete_position_reviewer
BEFORE DELETE ON public.positions
FOR EACH ROW
EXECUTE FUNCTION delete_reviewer_on_entity_delete();

-- Trigger for employees deletion  
CREATE TRIGGER trigger_delete_employee_reviewer
BEFORE DELETE ON public.employees
FOR EACH ROW
EXECUTE FUNCTION delete_reviewer_on_entity_delete();