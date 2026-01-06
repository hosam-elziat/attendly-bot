-- Create table for storing available Telegram bots
CREATE TABLE public.telegram_bots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bot_token TEXT NOT NULL,
  bot_username TEXT NOT NULL,
  bot_name TEXT,
  is_available BOOLEAN DEFAULT true,
  assigned_company_id UUID REFERENCES public.companies(id),
  assigned_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.telegram_bots ENABLE ROW LEVEL SECURITY;

-- Only admins can view bots assigned to their company
CREATE POLICY "Company members can view their assigned bot"
ON public.telegram_bots
FOR SELECT
USING (assigned_company_id = get_user_company_id(auth.uid()));

-- Service role only for managing bots (edge functions will use service role)
-- No direct user access for insert/update/delete

-- Add trigger for updated_at
CREATE TRIGGER update_telegram_bots_updated_at
BEFORE UPDATE ON public.telegram_bots
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add bot_link column to companies for storing the bot link
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS telegram_bot_username TEXT;