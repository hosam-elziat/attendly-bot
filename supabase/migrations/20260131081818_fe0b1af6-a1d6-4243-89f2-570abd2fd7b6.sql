-- Add flex_hours_today column to track adjusted shift hours for the day
-- This stores how many minutes of flex time (late/early) have been applied for this day

-- Add columns to track used permission hours per day
ALTER TABLE public.attendance_logs 
ADD COLUMN IF NOT EXISTS late_permission_minutes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS early_leave_permission_minutes INTEGER DEFAULT 0;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_attendance_logs_permissions ON public.attendance_logs (employee_id, date, late_permission_minutes, early_leave_permission_minutes);

-- Function to get total permission minutes used today
CREATE OR REPLACE FUNCTION public.get_permission_usage_today(
  p_employee_id UUID,
  p_date DATE,
  p_permission_type TEXT -- 'late_permission' or 'early_leave'
)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total INTEGER := 0;
BEGIN
  -- Check from inventory_usage_logs for today
  SELECT COALESCE(SUM(
    CASE 
      WHEN (effect_applied->>'minutes') IS NOT NULL THEN (effect_applied->>'minutes')::INTEGER
      ELSE 60  -- Default to 60 minutes if not specified
    END
  ), 0) INTO v_total
  FROM inventory_usage_logs
  WHERE employee_id = p_employee_id
    AND used_for_date = p_date
    AND effect_applied->>'type' = p_permission_type;
  
  RETURN v_total;
END;
$$;

-- Create default marketplace items template table for new companies
CREATE TABLE IF NOT EXISTS public.default_marketplace_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  name_ar TEXT,
  description TEXT,
  description_ar TEXT,
  item_type TEXT DEFAULT 'benefit',
  effect_type TEXT,
  effect_value JSONB,
  points_price INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  is_premium BOOLEAN DEFAULT false,
  approval_required BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Insert default marketplace items (for new companies)
INSERT INTO public.default_marketplace_items (name, name_ar, item_type, effect_type, points_price, is_premium)
VALUES 
  ('يوم اجازة', 'يوم اجازة', 'time_off', 'leave_day', 1500, false),
  ('ساعة تاخير', 'ساعة تاخير', 'benefit', 'late_permission', 500, false),
  ('ساعة اذن', 'ساعة اذن', 'time_off', 'early_leave', 400, false),
  ('رسالة سرية', 'رسالة سرية', 'secret_message', 'secret_message', 10000, true)
ON CONFLICT DO NOTHING;

-- Enable RLS on the default items table
ALTER TABLE public.default_marketplace_items ENABLE ROW LEVEL SECURITY;

-- Allow read access to all authenticated users (only admins will use this via edge functions)
CREATE POLICY "Allow read access to authenticated users"
ON public.default_marketplace_items
FOR SELECT
USING (true);