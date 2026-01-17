-- Create approved holidays table to store company-specific holiday approvals
CREATE TABLE public.approved_holidays (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  holiday_date DATE NOT NULL,
  holiday_name TEXT NOT NULL,
  holiday_name_local TEXT,
  days_count INTEGER NOT NULL DEFAULT 1,
  is_approved BOOLEAN DEFAULT false,
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID,
  notified_employees BOOLEAN DEFAULT false,
  notified_at TIMESTAMP WITH TIME ZONE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(company_id, holiday_date, year)
);

-- Enable Row Level Security
ALTER TABLE public.approved_holidays ENABLE ROW LEVEL SECURITY;

-- Create policies for approved holidays
CREATE POLICY "Users can view their company holidays" 
ON public.approved_holidays 
FOR SELECT 
USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage their company holidays" 
ON public.approved_holidays 
FOR ALL 
USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

-- Create index for better performance
CREATE INDEX idx_approved_holidays_company_date ON public.approved_holidays(company_id, holiday_date);
CREATE INDEX idx_approved_holidays_year_month ON public.approved_holidays(company_id, year, month);

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_approved_holidays_updated_at
BEFORE UPDATE ON public.approved_holidays
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();