
-- Create audit action enum
CREATE TYPE public.audit_action AS ENUM ('insert', 'update', 'delete', 'restore');

-- Create audit_logs table
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  user_email TEXT,
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action audit_action NOT NULL,
  old_data JSONB,
  new_data JSONB,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Company members can view audit logs"
ON public.audit_logs FOR SELECT
USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Company members can insert audit logs"
ON public.audit_logs FOR INSERT
WITH CHECK (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "SaaS team can view all audit logs"
ON public.audit_logs FOR SELECT
USING (is_saas_team_member(auth.uid()));

-- Create deleted_records table for soft deletes
CREATE TABLE public.deleted_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  deleted_by UUID NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  record_data JSONB NOT NULL,
  deleted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  restored_at TIMESTAMP WITH TIME ZONE,
  is_restored BOOLEAN DEFAULT false
);

-- Enable RLS
ALTER TABLE public.deleted_records ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Company members can view deleted records"
ON public.deleted_records FOR SELECT
USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Admins can manage deleted records"
ON public.deleted_records FOR ALL
USING (is_admin_or_owner(auth.uid()) AND company_id = get_user_company_id(auth.uid()));

-- Create index for better performance
CREATE INDEX idx_audit_logs_company_id ON public.audit_logs(company_id);
CREATE INDEX idx_audit_logs_table_name ON public.audit_logs(table_name);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX idx_deleted_records_company_id ON public.deleted_records(company_id);
CREATE INDEX idx_deleted_records_table_name ON public.deleted_records(table_name);
