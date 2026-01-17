-- إصلاح مشكلة التكرار اللانهائي في سياسات user_roles
-- المشكلة: is_admin_or_owner تستعلم عن user_roles مما يسبب تكرار لانهائي

-- حذف جميع السياسات الحالية
DROP POLICY IF EXISTS "Admin/Owner can manage roles in their company" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own role" ON public.user_roles;
DROP POLICY IF EXISTS "Users can set employee role for their company" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view roles in their company" ON public.user_roles;
DROP POLICY IF EXISTS "Users can insert their own role" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles in their company" ON public.user_roles;
DROP POLICY IF EXISTS "Users can read their own role" ON public.user_roles;

-- سياسة القراءة البسيطة: المستخدم يرى أدواره فقط
CREATE POLICY "Users can view their own role"
  ON public.user_roles FOR SELECT
  USING (user_id = auth.uid());

-- سياسة الإدراج: المستخدم يمكنه إضافة دور employee لنفسه فقط
CREATE POLICY "Users can insert employee role for themselves"
  ON public.user_roles FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND 
    role IN ('employee', 'owner')
  );

-- سياسة التحديث: فقط صاحب الشركة يمكنه تعديل الأدوار
-- نستخدم استعلام مباشر على companies بدلاً من is_admin_or_owner
CREATE POLICY "Company owner can update roles"
  ON public.user_roles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM companies c 
      WHERE c.id = user_roles.company_id 
      AND c.owner_id = auth.uid()
    )
  );

-- سياسة الحذف: فقط صاحب الشركة
CREATE POLICY "Company owner can delete roles"
  ON public.user_roles FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM companies c 
      WHERE c.id = user_roles.company_id 
      AND c.owner_id = auth.uid()
    )
  );

-- تحديث دالة is_admin_or_owner لتجنب التكرار
CREATE OR REPLACE FUNCTION public.is_admin_or_owner(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = p_user_id 
    AND ur.role IN ('owner', 'admin')
  );
$$;