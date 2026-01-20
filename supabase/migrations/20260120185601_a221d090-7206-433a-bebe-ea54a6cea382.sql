-- Add unique constraint for employee email and phone within same company
-- This prevents duplicate employees

-- Create unique index for email per company (only for non-null emails)
CREATE UNIQUE INDEX IF NOT EXISTS idx_employees_company_email_unique 
ON public.employees (company_id, email) 
WHERE email IS NOT NULL AND email != '';

-- Create unique index for phone per company (only for non-null phones)
CREATE UNIQUE INDEX IF NOT EXISTS idx_employees_company_phone_unique 
ON public.employees (company_id, phone) 
WHERE phone IS NOT NULL AND phone != '';

-- Create unique index for national_id per company (only for non-null national_ids)
CREATE UNIQUE INDEX IF NOT EXISTS idx_employees_company_national_id_unique 
ON public.employees (company_id, national_id) 
WHERE national_id IS NOT NULL AND national_id != '';

-- Create unique index for telegram_chat_id per company
CREATE UNIQUE INDEX IF NOT EXISTS idx_employees_company_telegram_unique 
ON public.employees (company_id, telegram_chat_id) 
WHERE telegram_chat_id IS NOT NULL AND telegram_chat_id != '';