-- Add attendance_log_id column to link adjustments to attendance records
ALTER TABLE public.salary_adjustments 
ADD COLUMN IF NOT EXISTS attendance_log_id uuid REFERENCES public.attendance_logs(id) ON DELETE SET NULL;

-- Add is_auto_generated column to track system-generated deductions
ALTER TABLE public.salary_adjustments 
ADD COLUMN IF NOT EXISTS is_auto_generated boolean DEFAULT false;

-- Add updated_at column for tracking edits
ALTER TABLE public.salary_adjustments 
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();

-- Create trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_salary_adjustments_updated_at ON public.salary_adjustments;

CREATE TRIGGER update_salary_adjustments_updated_at
BEFORE UPDATE ON public.salary_adjustments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for faster lookups by attendance_log_id
CREATE INDEX IF NOT EXISTS idx_salary_adjustments_attendance_log_id ON public.salary_adjustments(attendance_log_id);

-- Enable RLS policy for DELETE operations on salary_adjustments
CREATE POLICY "Admins can delete salary adjustments" 
ON public.salary_adjustments 
FOR DELETE 
USING (is_admin_or_owner(auth.uid()) AND company_id = get_user_company_id(auth.uid()));