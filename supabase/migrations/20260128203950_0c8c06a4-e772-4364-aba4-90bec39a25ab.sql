-- Add unique constraint for reward_event_tracking upsert
ALTER TABLE public.reward_event_tracking 
ADD CONSTRAINT reward_event_tracking_unique_daily UNIQUE (employee_id, event_type, event_date);

-- Create function to increment event count
CREATE OR REPLACE FUNCTION public.increment_event_count(
  p_employee_id uuid,
  p_event_type text,
  p_event_date date
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE reward_event_tracking 
  SET event_count = event_count + 1
  WHERE employee_id = p_employee_id 
    AND event_type = p_event_type 
    AND event_date = p_event_date;
END;
$$;