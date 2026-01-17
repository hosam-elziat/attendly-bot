-- Create table for company locations (max 5 per company)
CREATE TABLE public.company_locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  latitude NUMERIC NOT NULL,
  longitude NUMERIC NOT NULL,
  radius_meters INTEGER NOT NULL DEFAULT 100,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create junction table for employee-location assignments (many-to-many)
CREATE TABLE public.employee_locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES public.company_locations(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(employee_id, location_id)
);

-- Enable RLS
ALTER TABLE public.company_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_locations ENABLE ROW LEVEL SECURITY;

-- RLS policies for company_locations
CREATE POLICY "Users can view their company locations"
ON public.company_locations FOR SELECT
USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert their company locations"
ON public.company_locations FOR INSERT
WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update their company locations"
ON public.company_locations FOR UPDATE
USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete their company locations"
ON public.company_locations FOR DELETE
USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

-- RLS policies for employee_locations
CREATE POLICY "Users can view employee locations in their company"
ON public.employee_locations FOR SELECT
USING (employee_id IN (SELECT id FROM public.employees WHERE company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())));

CREATE POLICY "Users can insert employee locations in their company"
ON public.employee_locations FOR INSERT
WITH CHECK (employee_id IN (SELECT id FROM public.employees WHERE company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())));

CREATE POLICY "Users can delete employee locations in their company"
ON public.employee_locations FOR DELETE
USING (employee_id IN (SELECT id FROM public.employees WHERE company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())));

-- Add index for performance
CREATE INDEX idx_company_locations_company_id ON public.company_locations(company_id);
CREATE INDEX idx_employee_locations_employee_id ON public.employee_locations(employee_id);
CREATE INDEX idx_employee_locations_location_id ON public.employee_locations(location_id);