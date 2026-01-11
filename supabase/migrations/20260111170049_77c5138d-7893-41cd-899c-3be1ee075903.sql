-- Create table for registration sessions
CREATE TABLE public.registration_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  telegram_chat_id text NOT NULL,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  step text NOT NULL DEFAULT 'full_name',
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '1 hour'),
  UNIQUE(telegram_chat_id, company_id)
);

-- Add index for faster lookups
CREATE INDEX idx_registration_sessions_lookup ON public.registration_sessions(telegram_chat_id, company_id);

-- Add trigger for updated_at
CREATE TRIGGER update_registration_sessions_updated_at
  BEFORE UPDATE ON public.registration_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- No RLS needed - this is only accessed by service role from edge functions