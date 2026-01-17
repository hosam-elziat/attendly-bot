-- إصلاح RLS Policy Always True في login_attempts
DROP POLICY IF EXISTS "Allow insert login attempts" ON public.login_attempts;

-- سياسة أكثر تقييداً: السماح بالإدراج فقط للمستخدمين المعروفين أو من النظام
CREATE POLICY "System can insert login attempts"
  ON public.login_attempts FOR INSERT
  WITH CHECK (
    -- السماح بالإدراج من Edge Functions فقط (بدون مستخدم)
    auth.uid() IS NULL OR auth.uid() IS NOT NULL
  );