-- Employee Inventory table to store purchased items
CREATE TABLE public.employee_inventory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  item_id UUID REFERENCES public.marketplace_items(id) ON DELETE SET NULL,
  order_id UUID REFERENCES public.marketplace_orders(id) ON DELETE SET NULL,
  -- Store item details at purchase time (in case item is deleted/changed)
  item_name TEXT NOT NULL,
  item_name_ar TEXT,
  item_type TEXT NOT NULL,
  effect_type TEXT,
  effect_value JSONB,
  points_paid INTEGER NOT NULL DEFAULT 0,
  -- Usage tracking
  quantity INTEGER NOT NULL DEFAULT 1,
  used_quantity INTEGER NOT NULL DEFAULT 0,
  is_fully_used BOOLEAN DEFAULT false,
  -- When used
  used_at TIMESTAMP WITH TIME ZONE,
  used_for_date DATE,
  usage_notes TEXT,
  -- Metadata
  purchased_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Inventory usage history (for items that can be used multiple times)
CREATE TABLE public.inventory_usage_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  inventory_id UUID NOT NULL REFERENCES public.employee_inventory(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  used_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  used_for_date DATE,
  effect_applied JSONB,
  manager_notified BOOLEAN DEFAULT false,
  manager_notified_at TIMESTAMP WITH TIME ZONE,
  notes TEXT
);

-- Enable RLS
ALTER TABLE public.employee_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_usage_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for employee_inventory
CREATE POLICY "Employees can view own inventory" ON public.employee_inventory
FOR SELECT USING (
  employee_id IN (
    SELECT id FROM employees WHERE user_id = auth.uid()
  ) OR 
  (is_admin_or_owner(auth.uid()) AND company_id = get_user_company_id(auth.uid()))
);

CREATE POLICY "Admins can manage inventory" ON public.employee_inventory
FOR ALL USING (is_admin_or_owner(auth.uid()) AND company_id = get_user_company_id(auth.uid()));

-- RLS Policies for inventory_usage_logs
CREATE POLICY "Employees can view own usage logs" ON public.inventory_usage_logs
FOR SELECT USING (
  employee_id IN (
    SELECT id FROM employees WHERE user_id = auth.uid()
  ) OR 
  (is_admin_or_owner(auth.uid()) AND company_id = get_user_company_id(auth.uid()))
);

CREATE POLICY "Admins can manage usage logs" ON public.inventory_usage_logs
FOR ALL USING (is_admin_or_owner(auth.uid()) AND company_id = get_user_company_id(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_employee_inventory_updated_at
BEFORE UPDATE ON public.employee_inventory
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();