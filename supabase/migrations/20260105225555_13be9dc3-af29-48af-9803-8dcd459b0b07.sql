-- Remove the insecure telegram_bot_token column from companies table
-- We'll use Supabase secrets instead for secure token storage

ALTER TABLE public.companies DROP COLUMN IF EXISTS telegram_bot_token;

-- Add database constraints for input validation
ALTER TABLE public.employees 
ADD CONSTRAINT employees_email_format 
  CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

ALTER TABLE public.employees 
ADD CONSTRAINT employees_name_length
  CHECK (length(full_name) BETWEEN 1 AND 100);

ALTER TABLE public.employees 
ADD CONSTRAINT employees_salary_positive
  CHECK (base_salary >= 0);

ALTER TABLE public.employees 
ADD CONSTRAINT employees_break_duration_valid
  CHECK (break_duration_minutes >= 0 AND break_duration_minutes <= 480);

-- Add constraints to companies table
ALTER TABLE public.companies 
ADD CONSTRAINT companies_name_length
  CHECK (length(name) BETWEEN 1 AND 100);

ALTER TABLE public.companies 
ADD CONSTRAINT companies_break_duration_valid
  CHECK (break_duration_minutes >= 0 AND break_duration_minutes <= 480);

-- Add constraints to leave_requests
ALTER TABLE public.leave_requests 
ADD CONSTRAINT leave_requests_days_positive
  CHECK (days > 0 AND days <= 365);

ALTER TABLE public.leave_requests 
ADD CONSTRAINT leave_requests_dates_valid
  CHECK (end_date >= start_date);

-- Add constraints to profiles
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_name_length
  CHECK (length(full_name) BETWEEN 1 AND 100);

ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_email_format 
  CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');