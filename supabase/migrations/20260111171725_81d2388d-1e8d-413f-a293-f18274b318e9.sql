-- Add adjustment_type column to salary_adjustments for day-based adjustments
ALTER TABLE public.salary_adjustments 
ADD COLUMN IF NOT EXISTS adjustment_days DECIMAL(3,2) DEFAULT NULL;

-- Add added_by column to track who added the adjustment
ALTER TABLE public.salary_adjustments 
ADD COLUMN IF NOT EXISTS added_by UUID REFERENCES auth.users(id);

-- Add added_by_name for display purposes
ALTER TABLE public.salary_adjustments 
ADD COLUMN IF NOT EXISTS added_by_name TEXT;