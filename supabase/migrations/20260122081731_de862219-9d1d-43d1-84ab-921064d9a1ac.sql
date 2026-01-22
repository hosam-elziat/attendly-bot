-- Add webhook_secret column to telegram_bots table for secure verification
ALTER TABLE public.telegram_bots 
ADD COLUMN IF NOT EXISTS webhook_secret text;