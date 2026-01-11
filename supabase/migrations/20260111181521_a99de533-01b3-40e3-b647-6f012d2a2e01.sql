-- Add work schedule columns to join_requests table
ALTER TABLE public.join_requests
ADD COLUMN IF NOT EXISTS work_start_time TIME,
ADD COLUMN IF NOT EXISTS work_end_time TIME,
ADD COLUMN IF NOT EXISTS weekend_days TEXT[] DEFAULT ARRAY['friday', 'saturday'];