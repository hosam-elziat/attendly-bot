
-- Create salary_payments table to track paid status per employee per month
CREATE TABLE public.salary_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  month TEXT NOT NULL,
  is_paid BOOLEAN NOT NULL DEFAULT false,
  paid_at TIMESTAMPTZ,
  paid_by UUID,
  paid_by_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(employee_id, company_id, month)
);

-- Enable RLS
ALTER TABLE public.salary_payments ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view salary payments for their company"
ON public.salary_payments
FOR SELECT
USING (
  company_id IN (
    SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert salary payments for their company"
ON public.salary_payments
FOR INSERT
WITH CHECK (
  company_id IN (
    SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update salary payments for their company"
ON public.salary_payments
FOR UPDATE
USING (
  company_id IN (
    SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
  )
);

-- Index for fast lookups
CREATE INDEX idx_salary_payments_company_month ON public.salary_payments(company_id, month);
