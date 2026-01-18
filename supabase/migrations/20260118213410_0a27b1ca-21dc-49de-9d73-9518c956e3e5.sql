-- Create scheduled_leaves table for company-wide, position-based, or individual leaves
CREATE TABLE public.scheduled_leaves (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    leave_name VARCHAR(255) NOT NULL,
    leave_date DATE NOT NULL,
    end_date DATE,
    leave_type VARCHAR(50) NOT NULL DEFAULT 'scheduled', -- 'scheduled', 'company_wide', 'position_based', 'individual'
    target_type VARCHAR(50) NOT NULL DEFAULT 'company', -- 'company', 'position', 'employee'
    target_id UUID, -- position_id or employee_id depending on target_type
    reason TEXT,
    created_by UUID,
    created_by_name VARCHAR(255),
    notified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.scheduled_leaves ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view scheduled leaves for their company"
ON public.scheduled_leaves
FOR SELECT
USING (company_id IN (
    SELECT company_id FROM profiles WHERE user_id = auth.uid()
));

CREATE POLICY "Admins can manage scheduled leaves"
ON public.scheduled_leaves
FOR ALL
USING (
    company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid())
    AND public.is_admin_or_owner(auth.uid())
);

-- Create index for faster lookups
CREATE INDEX idx_scheduled_leaves_company_date ON public.scheduled_leaves(company_id, leave_date);
CREATE INDEX idx_scheduled_leaves_target ON public.scheduled_leaves(target_type, target_id);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.scheduled_leaves;