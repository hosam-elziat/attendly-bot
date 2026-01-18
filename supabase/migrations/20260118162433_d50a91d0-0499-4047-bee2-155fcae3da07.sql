-- Add start_date column to approved_holidays table
ALTER TABLE public.approved_holidays 
ADD COLUMN start_date date;

-- Set default start_date to holiday_date for existing records
UPDATE public.approved_holidays 
SET start_date = holiday_date::date 
WHERE start_date IS NULL;