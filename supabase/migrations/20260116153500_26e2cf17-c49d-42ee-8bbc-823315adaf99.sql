-- Add join_request_reviewer field to companies table
-- This field stores either a position_id or employee_id to review join requests via Telegram

ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS join_request_reviewer_type TEXT DEFAULT NULL CHECK (join_request_reviewer_type IN ('position', 'employee'));

ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS join_request_reviewer_id UUID DEFAULT NULL;

COMMENT ON COLUMN public.companies.join_request_reviewer_type IS 'Type of reviewer: position or employee';
COMMENT ON COLUMN public.companies.join_request_reviewer_id IS 'ID of the position or employee who reviews join requests';