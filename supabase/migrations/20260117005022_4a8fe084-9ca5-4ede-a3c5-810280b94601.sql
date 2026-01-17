-- Create backups table
CREATE TABLE public.backups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  backup_type TEXT NOT NULL DEFAULT 'automatic' CHECK (backup_type IN ('automatic', 'manual')),
  backup_data JSONB NOT NULL,
  tables_included TEXT[] NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  size_bytes BIGINT,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'failed', 'restoring', 'in_progress')),
  email_sent BOOLEAN DEFAULT false,
  email_sent_at TIMESTAMPTZ,
  notes TEXT
);

-- Create backup_settings table
CREATE TABLE public.backup_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE UNIQUE,
  email_enabled BOOLEAN DEFAULT true,
  email_address TEXT,
  frequency TEXT DEFAULT 'daily' CHECK (frequency IN ('daily', 'weekly', 'monthly')),
  retention_days INTEGER DEFAULT 30,
  last_backup_at TIMESTAMPTZ,
  next_backup_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_backups_company_id ON public.backups(company_id);
CREATE INDEX idx_backups_created_at ON public.backups(created_at DESC);
CREATE INDEX idx_backups_status ON public.backups(status);
CREATE INDEX idx_backup_settings_company_id ON public.backup_settings(company_id);

-- Enable RLS
ALTER TABLE public.backups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backup_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for backups (Super Admin only)
CREATE POLICY "Super admins can view all backups"
  ON public.backups
  FOR SELECT
  USING (public.is_saas_team_member(auth.uid()));

CREATE POLICY "Super admins can create backups"
  ON public.backups
  FOR INSERT
  WITH CHECK (public.is_saas_team_member(auth.uid()));

CREATE POLICY "Super admins can update backups"
  ON public.backups
  FOR UPDATE
  USING (public.is_saas_team_member(auth.uid()));

CREATE POLICY "Super admins can delete backups"
  ON public.backups
  FOR DELETE
  USING (public.is_saas_team_member(auth.uid()));

-- RLS Policies for backup_settings (Super Admin only)
CREATE POLICY "Super admins can view all backup settings"
  ON public.backup_settings
  FOR SELECT
  USING (public.is_saas_team_member(auth.uid()));

CREATE POLICY "Super admins can create backup settings"
  ON public.backup_settings
  FOR INSERT
  WITH CHECK (public.is_saas_team_member(auth.uid()));

CREATE POLICY "Super admins can update backup settings"
  ON public.backup_settings
  FOR UPDATE
  USING (public.is_saas_team_member(auth.uid()));

CREATE POLICY "Super admins can delete backup settings"
  ON public.backup_settings
  FOR DELETE
  USING (public.is_saas_team_member(auth.uid()));

-- Trigger to update updated_at
CREATE TRIGGER update_backup_settings_updated_at
  BEFORE UPDATE ON public.backup_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();