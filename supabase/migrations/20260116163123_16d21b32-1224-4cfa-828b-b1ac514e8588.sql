-- Add verification level settings to companies (default level)
ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS attendance_verification_level INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS attendance_approver_type TEXT DEFAULT 'direct_manager',
ADD COLUMN IF NOT EXISTS attendance_approver_id UUID NULL,
ADD COLUMN IF NOT EXISTS company_latitude DECIMAL(10, 8) NULL,
ADD COLUMN IF NOT EXISTS company_longitude DECIMAL(11, 8) NULL,
ADD COLUMN IF NOT EXISTS location_radius_meters INTEGER DEFAULT 100,
ADD COLUMN IF NOT EXISTS level3_verification_mode TEXT DEFAULT 'location_only';

-- Add verification level settings per employee (can override company default)
ALTER TABLE public.employees
ADD COLUMN IF NOT EXISTS attendance_verification_level INTEGER NULL,
ADD COLUMN IF NOT EXISTS attendance_approver_type TEXT NULL,
ADD COLUMN IF NOT EXISTS attendance_approver_id UUID NULL,
ADD COLUMN IF NOT EXISTS allowed_wifi_ips TEXT[] NULL;

-- Create pending attendance requests table for level 2 and 3
CREATE TABLE IF NOT EXISTS public.pending_attendance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  request_type TEXT NOT NULL DEFAULT 'check_in', -- check_in, check_out, break_start, break_end
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  requested_time TIMESTAMP WITH TIME ZONE NOT NULL,
  latitude DECIMAL(10, 8) NULL,
  longitude DECIMAL(11, 8) NULL,
  ip_address TEXT NULL,
  selfie_url TEXT NULL,
  location_verified BOOLEAN DEFAULT false,
  ip_verified BOOLEAN DEFAULT false,
  selfie_verified BOOLEAN DEFAULT false,
  vpn_detected BOOLEAN DEFAULT false,
  location_spoofing_suspected BOOLEAN DEFAULT false,
  approver_id UUID NULL,
  approver_type TEXT NULL, -- direct_manager, specific_person
  status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected, auto_rejected
  approved_time TIMESTAMP WITH TIME ZONE NULL,
  rejection_reason TEXT NULL,
  reviewed_at TIMESTAMP WITH TIME ZONE NULL,
  reviewed_by UUID NULL,
  notes TEXT NULL,
  telegram_message_id BIGINT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create location history for tracking suspicious movements
CREATE TABLE IF NOT EXISTS public.employee_location_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  ip_address TEXT NULL,
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_suspicious BOOLEAN DEFAULT false,
  suspicion_reason TEXT NULL
);

-- Enable RLS on new tables
ALTER TABLE public.pending_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_location_history ENABLE ROW LEVEL SECURITY;

-- RLS policies for pending_attendance
CREATE POLICY "Users can view their company pending attendance"
ON public.pending_attendance
FOR SELECT
USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert pending attendance for their company"
ON public.pending_attendance
FOR INSERT
WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update pending attendance in their company"
ON public.pending_attendance
FOR UPDATE
USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete pending attendance in their company"
ON public.pending_attendance
FOR DELETE
USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

-- RLS policies for employee_location_history
CREATE POLICY "Users can view their company location history"
ON public.employee_location_history
FOR SELECT
USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert location history for their company"
ON public.employee_location_history
FOR INSERT
WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_pending_attendance_company ON public.pending_attendance(company_id);
CREATE INDEX IF NOT EXISTS idx_pending_attendance_employee ON public.pending_attendance(employee_id);
CREATE INDEX IF NOT EXISTS idx_pending_attendance_status ON public.pending_attendance(status);
CREATE INDEX IF NOT EXISTS idx_location_history_employee ON public.employee_location_history(employee_id);
CREATE INDEX IF NOT EXISTS idx_location_history_recorded ON public.employee_location_history(recorded_at);

-- Add trigger for updated_at
CREATE TRIGGER update_pending_attendance_updated_at
BEFORE UPDATE ON public.pending_attendance
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Comment on columns for documentation
COMMENT ON COLUMN public.companies.attendance_verification_level IS '1=No verification, 2=Manager approval, 3=Location verification';
COMMENT ON COLUMN public.companies.level3_verification_mode IS 'location_only, location_selfie, location_ip, location_selfie_ip';
COMMENT ON COLUMN public.employees.attendance_verification_level IS 'Override company default, NULL means use company setting';