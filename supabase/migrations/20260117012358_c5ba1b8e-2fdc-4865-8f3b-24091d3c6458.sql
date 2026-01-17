-- Add columns for automatic absence and reminders configuration
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS auto_absent_after_hours INTEGER DEFAULT 2,
ADD COLUMN IF NOT EXISTS checkin_reminder_count INTEGER DEFAULT 3,
ADD COLUMN IF NOT EXISTS checkin_reminder_interval_minutes INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS checkout_reminder_count INTEGER DEFAULT 2,
ADD COLUMN IF NOT EXISTS checkout_reminder_interval_minutes INTEGER DEFAULT 10;