-- Create table for multiple backup email recipients
CREATE TABLE public.backup_email_recipients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.backup_email_recipients ENABLE ROW LEVEL SECURITY;

-- Create policies for super admin only
CREATE POLICY "Super admins can view backup email recipients"
ON public.backup_email_recipients
FOR SELECT
USING (public.is_saas_team_member(auth.uid()));

CREATE POLICY "Super admins can insert backup email recipients"
ON public.backup_email_recipients
FOR INSERT
WITH CHECK (public.is_saas_team_member(auth.uid()));

CREATE POLICY "Super admins can update backup email recipients"
ON public.backup_email_recipients
FOR UPDATE
USING (public.is_saas_team_member(auth.uid()));

CREATE POLICY "Super admins can delete backup email recipients"
ON public.backup_email_recipients
FOR DELETE
USING (public.is_saas_team_member(auth.uid()));

-- Create trigger for updated_at
CREATE TRIGGER update_backup_email_recipients_updated_at
BEFORE UPDATE ON public.backup_email_recipients
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();