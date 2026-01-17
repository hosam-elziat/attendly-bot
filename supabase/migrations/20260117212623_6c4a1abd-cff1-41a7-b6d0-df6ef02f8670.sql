-- Create table for global backup schedule settings (for full system backups)
CREATE TABLE IF NOT EXISTS public.global_backup_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  auto_backup_enabled BOOLEAN DEFAULT false,
  backup_hour INTEGER DEFAULT 0 CHECK (backup_hour >= 0 AND backup_hour <= 23),
  backup_minute INTEGER DEFAULT 0 CHECK (backup_minute >= 0 AND backup_minute <= 59),
  auto_email_enabled BOOLEAN DEFAULT true,
  last_auto_backup_at TIMESTAMP WITH TIME ZONE,
  next_auto_backup_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.global_backup_settings ENABLE ROW LEVEL SECURITY;

-- Create policies - only super admins can access
CREATE POLICY "Super admins can view global backup settings"
ON public.global_backup_settings
FOR SELECT
USING (public.is_saas_team_member(auth.uid()));

CREATE POLICY "Super admins can update global backup settings"
ON public.global_backup_settings
FOR UPDATE
USING (public.is_saas_team_member(auth.uid()));

CREATE POLICY "Super admins can insert global backup settings"
ON public.global_backup_settings
FOR INSERT
WITH CHECK (public.is_saas_team_member(auth.uid()));

-- Insert default settings if not exists
INSERT INTO public.global_backup_settings (auto_backup_enabled, backup_hour, backup_minute, auto_email_enabled)
VALUES (false, 3, 0, true)
ON CONFLICT DO NOTHING;