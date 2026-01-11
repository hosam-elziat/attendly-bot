-- Update Enterprise plan to have unlimited employees
UPDATE subscription_plans 
SET is_unlimited = true, max_employees = NULL 
WHERE name = 'Enterprise';

-- Add leave_balance column to employees if not exists
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS leave_balance integer DEFAULT 21;