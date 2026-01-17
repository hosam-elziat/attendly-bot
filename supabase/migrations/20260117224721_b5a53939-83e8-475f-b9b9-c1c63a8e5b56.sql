-- إصلاح ثغرة تصعيد الصلاحيات في user_roles
-- حذف السياسة الحالية غير الآمنة
DROP POLICY IF EXISTS "Users can insert their own role" ON public.user_roles;

-- سياسة جديدة آمنة: السماح بالأدوار المحدودة فقط
CREATE POLICY "Users can set limited role for their company"
  ON public.user_roles FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    (
      -- يمكن أن يكون owner لشركته فقط (عند إنشاء الشركة)
      (role = 'owner' AND company_id IN (
        SELECT id FROM companies WHERE owner_id = auth.uid()
      ))
      OR
      -- يمكن أن يكون employee فقط
      role = 'employee'
    )
  );

-- إضافة سياسة للسماح للـ owner/admin بتعيين الأدوار
CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.company_id = user_roles.company_id
      AND ur.role IN ('owner', 'admin')
    )
  );

-- تقييد الوصول لطلبات الإجازة
DROP POLICY IF EXISTS "Leave requests are viewable by company members" ON public.leave_requests;

CREATE POLICY "Leave requests privacy control"
  ON public.leave_requests FOR SELECT
  USING (
    -- الموظف يرى طلباته فقط
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.id = leave_requests.employee_id 
      AND e.user_id = auth.uid()
    ) 
    -- أو المدير/الأدمن يرى كل الطلبات
    OR is_admin_or_owner(auth.uid())
  );

-- إضافة جدول لتسجيل محاولات الدخول
CREATE TABLE IF NOT EXISTS public.login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  success BOOLEAN NOT NULL DEFAULT false,
  failure_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- تفعيل RLS على جدول محاولات الدخول
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

-- السماح بالإدراج فقط (لا قراءة من العميل)
CREATE POLICY "Allow insert login attempts"
  ON public.login_attempts FOR INSERT
  WITH CHECK (true);

-- السماح للـ super admin بالقراءة فقط
CREATE POLICY "Super admins can view login attempts"
  ON public.login_attempts FOR SELECT
  USING (is_saas_team_member(auth.uid()));

-- إضافة indexes لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_attendance_logs_date_company 
ON attendance_logs(date, company_id);

CREATE INDEX IF NOT EXISTS idx_employees_company_active 
ON employees(company_id, is_active);

CREATE INDEX IF NOT EXISTS idx_leave_requests_employee_status 
ON leave_requests(employee_id, status);

CREATE INDEX IF NOT EXISTS idx_salary_adjustments_employee_month 
ON salary_adjustments(employee_id, month);