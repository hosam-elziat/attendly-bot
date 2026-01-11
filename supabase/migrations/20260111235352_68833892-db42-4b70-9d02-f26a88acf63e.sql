-- Add onboarding_completed column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false;

-- Add onboarding_step column to track current step
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS onboarding_step integer DEFAULT 0;