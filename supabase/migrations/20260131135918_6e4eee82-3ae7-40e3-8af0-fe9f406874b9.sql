-- Super Admin (SaaS team) override policies
-- These policies grant SaaS team members full access to company-scoped data across all companies.
-- They are PERMISSIVE so they don't break existing company admin/owner policies.

-- Helper: create a standard FULL ACCESS policy for a table
-- (we use explicit statements because Postgres doesn't support dynamic CREATE POLICY easily in migrations)

-- Employees
DROP POLICY IF EXISTS "SaaS team can manage employees" ON public.employees;
CREATE POLICY "SaaS team can manage employees"
ON public.employees
FOR ALL
USING (is_saas_team_member(auth.uid()))
WITH CHECK (is_saas_team_member(auth.uid()));

-- Companies (allow SaaS team to update company settings, suspension, etc.)
DROP POLICY IF EXISTS "SaaS team can manage companies" ON public.companies;
CREATE POLICY "SaaS team can manage companies"
ON public.companies
FOR UPDATE
USING (is_saas_team_member(auth.uid()))
WITH CHECK (is_saas_team_member(auth.uid()));

-- Audit logs (allow SaaS team to write audit entries for actions while in company mode)
DROP POLICY IF EXISTS "SaaS team can insert audit logs" ON public.audit_logs;
CREATE POLICY "SaaS team can insert audit logs"
ON public.audit_logs
FOR INSERT
WITH CHECK (is_saas_team_member(auth.uid()));

-- Attendance
DROP POLICY IF EXISTS "SaaS team can manage attendance logs" ON public.attendance_logs;
CREATE POLICY "SaaS team can manage attendance logs"
ON public.attendance_logs
FOR ALL
USING (is_saas_team_member(auth.uid()))
WITH CHECK (is_saas_team_member(auth.uid()));

DROP POLICY IF EXISTS "SaaS team can manage attendance policies" ON public.attendance_policies;
CREATE POLICY "SaaS team can manage attendance policies"
ON public.attendance_policies
FOR ALL
USING (is_saas_team_member(auth.uid()))
WITH CHECK (is_saas_team_member(auth.uid()));

DROP POLICY IF EXISTS "SaaS team can manage pending attendance" ON public.pending_attendance;
CREATE POLICY "SaaS team can manage pending attendance"
ON public.pending_attendance
FOR ALL
USING (is_saas_team_member(auth.uid()))
WITH CHECK (is_saas_team_member(auth.uid()));

-- Leaves
DROP POLICY IF EXISTS "SaaS team can manage leave requests" ON public.leave_requests;
CREATE POLICY "SaaS team can manage leave requests"
ON public.leave_requests
FOR ALL
USING (is_saas_team_member(auth.uid()))
WITH CHECK (is_saas_team_member(auth.uid()));

DROP POLICY IF EXISTS "SaaS team can manage scheduled leaves" ON public.scheduled_leaves;
CREATE POLICY "SaaS team can manage scheduled leaves"
ON public.scheduled_leaves
FOR ALL
USING (is_saas_team_member(auth.uid()))
WITH CHECK (is_saas_team_member(auth.uid()));

-- Salaries
DROP POLICY IF EXISTS "SaaS team can manage salary records" ON public.salary_records;
CREATE POLICY "SaaS team can manage salary records"
ON public.salary_records
FOR ALL
USING (is_saas_team_member(auth.uid()))
WITH CHECK (is_saas_team_member(auth.uid()));

DROP POLICY IF EXISTS "SaaS team can manage salary adjustments" ON public.salary_adjustments;
CREATE POLICY "SaaS team can manage salary adjustments"
ON public.salary_adjustments
FOR ALL
USING (is_saas_team_member(auth.uid()))
WITH CHECK (is_saas_team_member(auth.uid()));

-- Rewards
DROP POLICY IF EXISTS "SaaS team can manage reward rules" ON public.reward_rules;
CREATE POLICY "SaaS team can manage reward rules"
ON public.reward_rules
FOR ALL
USING (is_saas_team_member(auth.uid()))
WITH CHECK (is_saas_team_member(auth.uid()));

DROP POLICY IF EXISTS "SaaS team can manage reward levels" ON public.reward_levels;
CREATE POLICY "SaaS team can manage reward levels"
ON public.reward_levels
FOR ALL
USING (is_saas_team_member(auth.uid()))
WITH CHECK (is_saas_team_member(auth.uid()));

DROP POLICY IF EXISTS "SaaS team can manage badges" ON public.badges;
CREATE POLICY "SaaS team can manage badges"
ON public.badges
FOR ALL
USING (is_saas_team_member(auth.uid()))
WITH CHECK (is_saas_team_member(auth.uid()));

DROP POLICY IF EXISTS "SaaS team can manage employee wallets" ON public.employee_wallets;
CREATE POLICY "SaaS team can manage employee wallets"
ON public.employee_wallets
FOR ALL
USING (is_saas_team_member(auth.uid()))
WITH CHECK (is_saas_team_member(auth.uid()));

DROP POLICY IF EXISTS "SaaS team can manage points history" ON public.points_history;
CREATE POLICY "SaaS team can manage points history"
ON public.points_history
FOR ALL
USING (is_saas_team_member(auth.uid()))
WITH CHECK (is_saas_team_member(auth.uid()));

DROP POLICY IF EXISTS "SaaS team can manage employee badges" ON public.employee_badges;
CREATE POLICY "SaaS team can manage employee badges"
ON public.employee_badges
FOR ALL
USING (is_saas_team_member(auth.uid()))
WITH CHECK (is_saas_team_member(auth.uid()));

DROP POLICY IF EXISTS "SaaS team can manage reward goals" ON public.reward_goals;
CREATE POLICY "SaaS team can manage reward goals"
ON public.reward_goals
FOR ALL
USING (is_saas_team_member(auth.uid()))
WITH CHECK (is_saas_team_member(auth.uid()));

DROP POLICY IF EXISTS "SaaS team can manage goal achievements" ON public.goal_achievements;
CREATE POLICY "SaaS team can manage goal achievements"
ON public.goal_achievements
FOR ALL
USING (is_saas_team_member(auth.uid()))
WITH CHECK (is_saas_team_member(auth.uid()));

DROP POLICY IF EXISTS "SaaS team can manage rewards leaderboard" ON public.rewards_leaderboard;
CREATE POLICY "SaaS team can manage rewards leaderboard"
ON public.rewards_leaderboard
FOR ALL
USING (is_saas_team_member(auth.uid()))
WITH CHECK (is_saas_team_member(auth.uid()));

DROP POLICY IF EXISTS "SaaS team can manage reward event tracking" ON public.reward_event_tracking;
CREATE POLICY "SaaS team can manage reward event tracking"
ON public.reward_event_tracking
FOR ALL
USING (is_saas_team_member(auth.uid()))
WITH CHECK (is_saas_team_member(auth.uid()));

-- Marketplace
DROP POLICY IF EXISTS "SaaS team can manage marketplace categories" ON public.marketplace_categories;
CREATE POLICY "SaaS team can manage marketplace categories"
ON public.marketplace_categories
FOR ALL
USING (is_saas_team_member(auth.uid()))
WITH CHECK (is_saas_team_member(auth.uid()));

DROP POLICY IF EXISTS "SaaS team can manage marketplace items" ON public.marketplace_items;
CREATE POLICY "SaaS team can manage marketplace items"
ON public.marketplace_items
FOR ALL
USING (is_saas_team_member(auth.uid()))
WITH CHECK (is_saas_team_member(auth.uid()));

DROP POLICY IF EXISTS "SaaS team can manage marketplace orders" ON public.marketplace_orders;
CREATE POLICY "SaaS team can manage marketplace orders"
ON public.marketplace_orders
FOR ALL
USING (is_saas_team_member(auth.uid()))
WITH CHECK (is_saas_team_member(auth.uid()));

-- Company structure / org
DROP POLICY IF EXISTS "SaaS team can manage positions" ON public.positions;
CREATE POLICY "SaaS team can manage positions"
ON public.positions
FOR ALL
USING (is_saas_team_member(auth.uid()))
WITH CHECK (is_saas_team_member(auth.uid()));

DROP POLICY IF EXISTS "SaaS team can manage position permissions" ON public.position_permissions;
CREATE POLICY "SaaS team can manage position permissions"
ON public.position_permissions
FOR ALL
USING (is_saas_team_member(auth.uid()))
WITH CHECK (is_saas_team_member(auth.uid()));

DROP POLICY IF EXISTS "SaaS team can manage position reports to" ON public.position_reports_to;
CREATE POLICY "SaaS team can manage position reports to"
ON public.position_reports_to
FOR ALL
USING (is_saas_team_member(auth.uid()))
WITH CHECK (is_saas_team_member(auth.uid()));

-- Company locations & overrides
DROP POLICY IF EXISTS "SaaS team can manage company locations" ON public.company_locations;
CREATE POLICY "SaaS team can manage company locations"
ON public.company_locations
FOR ALL
USING (is_saas_team_member(auth.uid()))
WITH CHECK (is_saas_team_member(auth.uid()));

DROP POLICY IF EXISTS "SaaS team can manage company feature overrides" ON public.company_feature_overrides;
CREATE POLICY "SaaS team can manage company feature overrides"
ON public.company_feature_overrides
FOR ALL
USING (is_saas_team_member(auth.uid()))
WITH CHECK (is_saas_team_member(auth.uid()));

DROP POLICY IF EXISTS "SaaS team can manage company menu overrides" ON public.company_menu_overrides;
CREATE POLICY "SaaS team can manage company menu overrides"
ON public.company_menu_overrides
FOR ALL
USING (is_saas_team_member(auth.uid()))
WITH CHECK (is_saas_team_member(auth.uid()));

-- Join requests
DROP POLICY IF EXISTS "SaaS team can manage join requests" ON public.join_requests;
CREATE POLICY "SaaS team can manage join requests"
ON public.join_requests
FOR ALL
USING (is_saas_team_member(auth.uid()))
WITH CHECK (is_saas_team_member(auth.uid()));

DROP POLICY IF EXISTS "SaaS team can manage join request reviewers" ON public.join_request_reviewers;
CREATE POLICY "SaaS team can manage join request reviewers"
ON public.join_request_reviewers
FOR ALL
USING (is_saas_team_member(auth.uid()))
WITH CHECK (is_saas_team_member(auth.uid()));

-- Holidays
DROP POLICY IF EXISTS "SaaS team can manage approved holidays" ON public.approved_holidays;
CREATE POLICY "SaaS team can manage approved holidays"
ON public.approved_holidays
FOR ALL
USING (is_saas_team_member(auth.uid()))
WITH CHECK (is_saas_team_member(auth.uid()));

-- Soft-delete & backups within company
DROP POLICY IF EXISTS "SaaS team can manage deleted records" ON public.deleted_records;
CREATE POLICY "SaaS team can manage deleted records"
ON public.deleted_records
FOR ALL
USING (is_saas_team_member(auth.uid()))
WITH CHECK (is_saas_team_member(auth.uid()));

DROP POLICY IF EXISTS "SaaS team can manage company snapshots" ON public.company_snapshots;
CREATE POLICY "SaaS team can manage company snapshots"
ON public.company_snapshots
FOR ALL
USING (is_saas_team_member(auth.uid()))
WITH CHECK (is_saas_team_member(auth.uid()));

-- Messaging / Telegram
DROP POLICY IF EXISTS "SaaS team can manage telegram bots" ON public.telegram_bots;
CREATE POLICY "SaaS team can manage telegram bots"
ON public.telegram_bots
FOR ALL
USING (is_saas_team_member(auth.uid()))
WITH CHECK (is_saas_team_member(auth.uid()));

DROP POLICY IF EXISTS "SaaS team can manage telegram messages" ON public.telegram_messages;
CREATE POLICY "SaaS team can manage telegram messages"
ON public.telegram_messages
FOR ALL
USING (is_saas_team_member(auth.uid()))
WITH CHECK (is_saas_team_member(auth.uid()));

-- Rewards/leaderboard motivational messages (company scoped)
DROP POLICY IF EXISTS "SaaS team can manage motivational messages" ON public.motivational_messages;
CREATE POLICY "SaaS team can manage motivational messages"
ON public.motivational_messages
FOR ALL
USING (is_saas_team_member(auth.uid()))
WITH CHECK (is_saas_team_member(auth.uid()));

-- Secret messages (company scoped)
DROP POLICY IF EXISTS "SaaS team can manage secret messages" ON public.secret_messages;
CREATE POLICY "SaaS team can manage secret messages"
ON public.secret_messages
FOR ALL
USING (is_saas_team_member(auth.uid()))
WITH CHECK (is_saas_team_member(auth.uid()));

-- Inventory logs (rewards marketplace usage)
DROP POLICY IF EXISTS "SaaS team can manage employee inventory" ON public.employee_inventory;
CREATE POLICY "SaaS team can manage employee inventory"
ON public.employee_inventory
FOR ALL
USING (is_saas_team_member(auth.uid()))
WITH CHECK (is_saas_team_member(auth.uid()));

DROP POLICY IF EXISTS "SaaS team can manage employee item usage" ON public.employee_item_usage;
CREATE POLICY "SaaS team can manage employee item usage"
ON public.employee_item_usage
FOR ALL
USING (is_saas_team_member(auth.uid()))
WITH CHECK (is_saas_team_member(auth.uid()));

DROP POLICY IF EXISTS "SaaS team can manage inventory usage logs" ON public.inventory_usage_logs;
CREATE POLICY "SaaS team can manage inventory usage logs"
ON public.inventory_usage_logs
FOR ALL
USING (is_saas_team_member(auth.uid()))
WITH CHECK (is_saas_team_member(auth.uid()));

-- User management within a company
DROP POLICY IF EXISTS "SaaS team can manage profiles" ON public.profiles;
CREATE POLICY "SaaS team can manage profiles"
ON public.profiles
FOR ALL
USING (is_saas_team_member(auth.uid()))
WITH CHECK (is_saas_team_member(auth.uid()));

DROP POLICY IF EXISTS "SaaS team can manage user roles" ON public.user_roles;
CREATE POLICY "SaaS team can manage user roles"
ON public.user_roles
FOR ALL
USING (is_saas_team_member(auth.uid()))
WITH CHECK (is_saas_team_member(auth.uid()));

-- Subscriptions (so Super Admin can modify subscriptions inside company mode)
DROP POLICY IF EXISTS "SaaS team can manage subscriptions" ON public.subscriptions;
CREATE POLICY "SaaS team can manage subscriptions"
ON public.subscriptions
FOR ALL
USING (is_saas_team_member(auth.uid()))
WITH CHECK (is_saas_team_member(auth.uid()));
