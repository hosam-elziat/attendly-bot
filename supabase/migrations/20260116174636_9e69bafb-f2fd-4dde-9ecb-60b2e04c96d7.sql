-- Add level3_verification_mode column to employees table
ALTER TABLE public.employees 
ADD COLUMN IF NOT EXISTS level3_verification_mode TEXT DEFAULT NULL;