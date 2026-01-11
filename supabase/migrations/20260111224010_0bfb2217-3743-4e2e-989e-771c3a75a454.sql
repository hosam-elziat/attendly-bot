-- Add default_weekend_days column to companies table
ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS default_weekend_days TEXT[] DEFAULT ARRAY['friday'];