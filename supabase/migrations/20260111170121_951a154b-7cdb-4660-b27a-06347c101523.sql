-- Enable RLS on registration_sessions but allow service role full access
ALTER TABLE public.registration_sessions ENABLE ROW LEVEL SECURITY;

-- Since this table is only accessed by edge functions using service_role key,
-- we don't need user-facing policies. Service role bypasses RLS.