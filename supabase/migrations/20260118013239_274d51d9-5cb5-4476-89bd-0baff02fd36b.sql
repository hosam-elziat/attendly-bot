-- إصلاح سياسات RLS للبيانات الحساسة

-- 1. حماية employee_location_history (GPS و IP حساسة)
DROP POLICY IF EXISTS "Users can view their company location history" ON public.employee_location_history;
DROP POLICY IF EXISTS "Only admins can view location history" ON public.employee_location_history;

CREATE POLICY "Only admins can view location history"
  ON public.employee_location_history FOR SELECT
  USING (public.is_admin_or_owner(auth.uid()) AND company_id = public.get_user_company_id(auth.uid()));

-- 2. حماية أسباب الإجازات الحساسة
DROP POLICY IF EXISTS "Company members can view leave requests" ON public.leave_requests;
DROP POLICY IF EXISTS "Leave request privacy" ON public.leave_requests;
DROP POLICY IF EXISTS "Users can view leave requests in their company" ON public.leave_requests;

CREATE POLICY "Leave request privacy"
  ON public.leave_requests FOR SELECT
  USING (
    -- الموظف يرى طلباته فقط
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = leave_requests.employee_id 
      AND e.user_id = auth.uid()
    )
    OR
    -- المدير/الأدمن يرى الكل
    public.is_admin_or_owner(auth.uid())
  );

-- 3. إصلاح سياسات user_roles لمنع تصعيد الصلاحيات
DROP POLICY IF EXISTS "Users can insert employee role for themselves" ON public.user_roles;
DROP POLICY IF EXISTS "Company owner can set owner role for themselves" ON public.user_roles;

-- سياسة محسنة: المستخدم يمكنه إضافة دور employee فقط لنفسه في شركته
CREATE POLICY "Users can only insert employee role"
  ON public.user_roles FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    role = 'employee' AND
    company_id = public.get_user_company_id(auth.uid())
  );

-- سياسة خاصة: owner فقط عند إنشاء شركة جديدة (الشخص هو مالك الشركة)
CREATE POLICY "Owner role for company creator only"
  ON public.user_roles FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    role = 'owner' AND
    EXISTS (SELECT 1 FROM public.companies WHERE id = user_roles.company_id AND owner_id = auth.uid())
  );