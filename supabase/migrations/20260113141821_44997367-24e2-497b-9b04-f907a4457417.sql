-- Allow admins/owners to delete individual attendance records (and thus fix the delete button)
DROP POLICY IF EXISTS "Admins can delete attendance" ON public.attendance_logs;
CREATE POLICY "Admins can delete attendance"
ON public.attendance_logs
FOR DELETE
USING (
  is_admin_or_owner(auth.uid())
  AND company_id = get_user_company_id(auth.uid())
);

-- Optional: allow internal SaaS team members to delete attendance across companies
DROP POLICY IF EXISTS "SaaS team can delete all attendance" ON public.attendance_logs;
CREATE POLICY "SaaS team can delete all attendance"
ON public.attendance_logs
FOR DELETE
USING (is_saas_team_member(auth.uid()));
