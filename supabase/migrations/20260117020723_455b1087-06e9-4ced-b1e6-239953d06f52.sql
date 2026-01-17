-- Add location tracking to attendance_logs and pending_attendance
ALTER TABLE public.attendance_logs 
ADD COLUMN IF NOT EXISTS check_in_location_id UUID REFERENCES public.company_locations(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS check_in_latitude DECIMAL(10, 8) NULL,
ADD COLUMN IF NOT EXISTS check_in_longitude DECIMAL(11, 8) NULL;

-- Add location_id to pending_attendance for tracking which location was verified
ALTER TABLE public.pending_attendance 
ADD COLUMN IF NOT EXISTS verified_location_id UUID REFERENCES public.company_locations(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS verified_location_name TEXT NULL;

-- Add comment for clarity
COMMENT ON COLUMN public.attendance_logs.check_in_location_id IS 'The company location where the employee checked in from';
COMMENT ON COLUMN public.attendance_logs.check_in_latitude IS 'Exact latitude of check-in';
COMMENT ON COLUMN public.attendance_logs.check_in_longitude IS 'Exact longitude of check-in';
COMMENT ON COLUMN public.pending_attendance.verified_location_id IS 'The verified company location for this attendance request';
COMMENT ON COLUMN public.pending_attendance.verified_location_name IS 'Name of the verified location for display';