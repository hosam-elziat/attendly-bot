-- Fix RLS policy for deleted_records to allow INSERT
DROP POLICY IF EXISTS "Admins can manage deleted records" ON public.deleted_records;

CREATE POLICY "Admins can insert deleted records" 
ON public.deleted_records 
FOR INSERT 
WITH CHECK (is_admin_or_owner(auth.uid()) AND company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Admins can update deleted records" 
ON public.deleted_records 
FOR UPDATE 
USING (is_admin_or_owner(auth.uid()) AND company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Admins can delete deleted records" 
ON public.deleted_records 
FOR DELETE 
USING (is_admin_or_owner(auth.uid()) AND company_id = get_user_company_id(auth.uid()));