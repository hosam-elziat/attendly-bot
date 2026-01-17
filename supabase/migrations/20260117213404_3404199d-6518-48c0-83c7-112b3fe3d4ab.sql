-- Add frequency column to global_backup_settings
ALTER TABLE public.global_backup_settings 
ADD COLUMN IF NOT EXISTS backup_frequency_hours INTEGER DEFAULT 24 CHECK (backup_frequency_hours >= 1 AND backup_frequency_hours <= 168);