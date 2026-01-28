-- =============================================
-- REWARDS & MARKETPLACE SYSTEM SCHEMA
-- =============================================

-- 1. REWARD RULES TABLE (قواعد النقاط لكل حدث)
CREATE TABLE public.reward_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- check_in_on_time, first_employee_checkin, early_checkin, etc.
  event_name TEXT NOT NULL, -- Display name
  event_name_ar TEXT, -- Arabic name
  points_value INTEGER NOT NULL DEFAULT 0, -- Positive or negative
  is_enabled BOOLEAN DEFAULT true,
  daily_limit INTEGER, -- Max times per day
  weekly_limit INTEGER, -- Max times per week
  monthly_limit INTEGER, -- Max times per month
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, event_type)
);

-- 2. EMPLOYEE WALLETS (محفظة الموظف)
CREATE TABLE public.employee_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  total_points INTEGER DEFAULT 0,
  earned_points INTEGER DEFAULT 0,
  spent_points INTEGER DEFAULT 0,
  current_level_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(employee_id)
);

-- 3. POINTS HISTORY (سجل النقاط)
CREATE TABLE public.points_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  points INTEGER NOT NULL,
  event_type TEXT NOT NULL,
  source TEXT NOT NULL, -- system, admin, marketplace
  description TEXT,
  reference_id UUID, -- Link to attendance_log, order, etc.
  added_by UUID, -- Admin who added manually
  added_by_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. REWARD LEVELS (المستويات)
CREATE TABLE public.reward_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  level_order INTEGER NOT NULL DEFAULT 1,
  name TEXT NOT NULL,
  name_ar TEXT,
  min_points INTEGER NOT NULL DEFAULT 0,
  icon TEXT, -- Emoji or icon name
  color TEXT, -- Hex color
  perks JSONB, -- Additional perks for this level
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add foreign key for current_level
ALTER TABLE public.employee_wallets 
ADD CONSTRAINT employee_wallets_current_level_fkey 
FOREIGN KEY (current_level_id) REFERENCES public.reward_levels(id) ON DELETE SET NULL;

-- 5. BADGES (الشارات)
CREATE TABLE public.badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  name_ar TEXT,
  description TEXT,
  description_ar TEXT,
  icon TEXT, -- Emoji or icon
  condition_type TEXT NOT NULL, -- points_milestone, attendance_streak, first_checkin_count, etc.
  condition_value INTEGER NOT NULL, -- Value to achieve
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. EMPLOYEE BADGES (شارات الموظفين)
CREATE TABLE public.employee_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(employee_id, badge_id)
);

-- 7. MARKETPLACE CATEGORIES (فئات السوق)
CREATE TABLE public.marketplace_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  name_ar TEXT,
  icon TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. MARKETPLACE ITEMS (عناصر السوق)
CREATE TABLE public.marketplace_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.marketplace_categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  name_ar TEXT,
  description TEXT,
  description_ar TEXT,
  points_price INTEGER NOT NULL,
  approval_required BOOLEAN DEFAULT false,
  usage_limit_type TEXT, -- 'monthly', 'total', 'unlimited'
  usage_limit_value INTEGER, -- Max uses
  stock_quantity INTEGER, -- NULL for unlimited
  is_premium BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  item_type TEXT DEFAULT 'benefit', -- benefit, time_off, powerup, premium
  effect_type TEXT, -- late_pass, leave_day, bonus_points, secret_message, etc.
  effect_value JSONB, -- Configuration for the effect
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 9. MARKETPLACE ORDERS (طلبات الشراء)
CREATE TABLE public.marketplace_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.marketplace_items(id) ON DELETE CASCADE,
  points_spent INTEGER NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, approved, rejected, consumed
  order_data JSONB, -- Additional data (e.g., secret message content)
  reviewed_by UUID,
  reviewed_by_name TEXT,
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 10. SECRET MESSAGES (الرسائل السرية)
CREATE TABLE public.secret_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.marketplace_orders(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  recipient_type TEXT NOT NULL, -- employee, manager, team
  recipient_id UUID, -- Employee ID or Position ID
  message_content TEXT NOT NULL,
  is_anonymous BOOLEAN DEFAULT false,
  is_delivered BOOLEAN DEFAULT false,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 11. EMPLOYEE ITEM USAGE (تتبع استخدام العناصر)
CREATE TABLE public.employee_item_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.marketplace_items(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  month_year TEXT, -- '2025-01' for monthly limits
  usage_count INTEGER DEFAULT 1,
  last_used_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(employee_id, item_id, month_year)
);

-- 12. REWARD EVENT TRACKING (تتبع أحداث النقاط لمنع التكرار)
CREATE TABLE public.reward_event_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_date DATE NOT NULL,
  event_count INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(employee_id, event_type, event_date)
);

-- 13. LEADERBOARD CACHE (تصنيف الموظفين - للأداء)
CREATE TABLE public.rewards_leaderboard (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  period_type TEXT NOT NULL, -- daily, weekly, monthly, all_time
  period_value TEXT NOT NULL, -- '2025-01-28', '2025-W04', '2025-01', 'all'
  total_points INTEGER DEFAULT 0,
  rank INTEGER,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, employee_id, period_type, period_value)
);

-- 14. REWARD MESSAGES (رسائل التحفيز المتنوعة)
CREATE TABLE public.reward_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE, -- NULL for global templates
  message_type TEXT NOT NULL, -- checkin_success, first_checkin, early_checkin, level_up, badge_earned, etc.
  message_template TEXT NOT NULL, -- With {variables}
  time_of_day TEXT, -- morning, afternoon, evening, any
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- ENABLE RLS ON ALL TABLES
-- =============================================

ALTER TABLE public.reward_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.points_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.secret_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_item_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_event_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rewards_leaderboard ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_messages ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS POLICIES
-- =============================================

-- Reward Rules
CREATE POLICY "Company members can view reward rules" ON public.reward_rules
FOR SELECT USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Admins can manage reward rules" ON public.reward_rules
FOR ALL USING (is_admin_or_owner(auth.uid()) AND company_id = get_user_company_id(auth.uid()));

-- Employee Wallets
CREATE POLICY "Employees can view own wallet" ON public.employee_wallets
FOR SELECT USING (
  EXISTS (SELECT 1 FROM employees e WHERE e.id = employee_wallets.employee_id AND e.user_id = auth.uid())
  OR (is_admin_or_owner(auth.uid()) AND company_id = get_user_company_id(auth.uid()))
);

CREATE POLICY "Admins can manage wallets" ON public.employee_wallets
FOR ALL USING (is_admin_or_owner(auth.uid()) AND company_id = get_user_company_id(auth.uid()));

-- Points History
CREATE POLICY "Employees can view own points history" ON public.points_history
FOR SELECT USING (
  EXISTS (SELECT 1 FROM employees e WHERE e.id = points_history.employee_id AND e.user_id = auth.uid())
  OR (is_admin_or_owner(auth.uid()) AND company_id = get_user_company_id(auth.uid()))
);

CREATE POLICY "Admins can manage points history" ON public.points_history
FOR ALL USING (is_admin_or_owner(auth.uid()) AND company_id = get_user_company_id(auth.uid()));

-- Reward Levels
CREATE POLICY "Company members can view levels" ON public.reward_levels
FOR SELECT USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Admins can manage levels" ON public.reward_levels
FOR ALL USING (is_admin_or_owner(auth.uid()) AND company_id = get_user_company_id(auth.uid()));

-- Badges
CREATE POLICY "Company members can view badges" ON public.badges
FOR SELECT USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Admins can manage badges" ON public.badges
FOR ALL USING (is_admin_or_owner(auth.uid()) AND company_id = get_user_company_id(auth.uid()));

-- Employee Badges
CREATE POLICY "Employees can view own badges" ON public.employee_badges
FOR SELECT USING (
  EXISTS (SELECT 1 FROM employees e WHERE e.id = employee_badges.employee_id AND e.user_id = auth.uid())
  OR (is_admin_or_owner(auth.uid()) AND company_id = get_user_company_id(auth.uid()))
);

CREATE POLICY "Admins can manage employee badges" ON public.employee_badges
FOR ALL USING (is_admin_or_owner(auth.uid()) AND company_id = get_user_company_id(auth.uid()));

-- Marketplace Categories
CREATE POLICY "Company members can view categories" ON public.marketplace_categories
FOR SELECT USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Admins can manage categories" ON public.marketplace_categories
FOR ALL USING (is_admin_or_owner(auth.uid()) AND company_id = get_user_company_id(auth.uid()));

-- Marketplace Items
CREATE POLICY "Company members can view items" ON public.marketplace_items
FOR SELECT USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Admins can manage items" ON public.marketplace_items
FOR ALL USING (is_admin_or_owner(auth.uid()) AND company_id = get_user_company_id(auth.uid()));

-- Marketplace Orders
CREATE POLICY "Employees can view own orders" ON public.marketplace_orders
FOR SELECT USING (
  EXISTS (SELECT 1 FROM employees e WHERE e.id = marketplace_orders.employee_id AND e.user_id = auth.uid())
  OR (is_admin_or_owner(auth.uid()) AND company_id = get_user_company_id(auth.uid()))
);

CREATE POLICY "Employees can create own orders" ON public.marketplace_orders
FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM employees e WHERE e.id = marketplace_orders.employee_id AND e.user_id = auth.uid())
  AND company_id = get_user_company_id(auth.uid())
);

CREATE POLICY "Admins can manage orders" ON public.marketplace_orders
FOR ALL USING (is_admin_or_owner(auth.uid()) AND company_id = get_user_company_id(auth.uid()));

-- Secret Messages
CREATE POLICY "Employees can view own sent messages" ON public.secret_messages
FOR SELECT USING (
  EXISTS (SELECT 1 FROM employees e WHERE e.id = secret_messages.sender_id AND e.user_id = auth.uid())
  OR (is_admin_or_owner(auth.uid()) AND company_id = get_user_company_id(auth.uid()))
);

CREATE POLICY "Admins can manage secret messages" ON public.secret_messages
FOR ALL USING (is_admin_or_owner(auth.uid()) AND company_id = get_user_company_id(auth.uid()));

-- Employee Item Usage
CREATE POLICY "Employees can view own usage" ON public.employee_item_usage
FOR SELECT USING (
  EXISTS (SELECT 1 FROM employees e WHERE e.id = employee_item_usage.employee_id AND e.user_id = auth.uid())
  OR (is_admin_or_owner(auth.uid()) AND company_id = get_user_company_id(auth.uid()))
);

CREATE POLICY "Admins can manage usage" ON public.employee_item_usage
FOR ALL USING (is_admin_or_owner(auth.uid()) AND company_id = get_user_company_id(auth.uid()));

-- Reward Event Tracking
CREATE POLICY "Admins can manage event tracking" ON public.reward_event_tracking
FOR ALL USING (is_admin_or_owner(auth.uid()) AND company_id = get_user_company_id(auth.uid()));

-- Rewards Leaderboard
CREATE POLICY "Company members can view leaderboard" ON public.rewards_leaderboard
FOR SELECT USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Admins can manage leaderboard" ON public.rewards_leaderboard
FOR ALL USING (is_admin_or_owner(auth.uid()) AND company_id = get_user_company_id(auth.uid()));

-- Reward Messages
CREATE POLICY "Company members can view messages" ON public.reward_messages
FOR SELECT USING (company_id IS NULL OR company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Admins can manage messages" ON public.reward_messages
FOR ALL USING (is_admin_or_owner(auth.uid()) AND (company_id IS NULL OR company_id = get_user_company_id(auth.uid())));

-- =============================================
-- HELPER FUNCTION: Award Points to Employee
-- =============================================

CREATE OR REPLACE FUNCTION public.award_points(
  p_employee_id UUID,
  p_company_id UUID,
  p_points INTEGER,
  p_event_type TEXT,
  p_source TEXT DEFAULT 'system',
  p_description TEXT DEFAULT NULL,
  p_reference_id UUID DEFAULT NULL,
  p_added_by UUID DEFAULT NULL,
  p_added_by_name TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet employee_wallets%ROWTYPE;
  v_new_total INTEGER;
  v_level_id UUID;
  v_level_name TEXT;
  v_level_changed BOOLEAN := false;
BEGIN
  -- Get or create wallet
  SELECT * INTO v_wallet FROM employee_wallets WHERE employee_id = p_employee_id;
  
  IF v_wallet IS NULL THEN
    INSERT INTO employee_wallets (employee_id, company_id, total_points, earned_points, spent_points)
    VALUES (p_employee_id, p_company_id, 0, 0, 0)
    RETURNING * INTO v_wallet;
  END IF;
  
  -- Calculate new total
  v_new_total := GREATEST(0, v_wallet.total_points + p_points);
  
  -- Update wallet
  IF p_points > 0 THEN
    UPDATE employee_wallets 
    SET total_points = v_new_total,
        earned_points = earned_points + p_points,
        updated_at = now()
    WHERE employee_id = p_employee_id;
  ELSE
    UPDATE employee_wallets 
    SET total_points = v_new_total,
        spent_points = spent_points + ABS(p_points),
        updated_at = now()
    WHERE employee_id = p_employee_id;
  END IF;
  
  -- Record in history
  INSERT INTO points_history (
    employee_id, company_id, points, event_type, source, 
    description, reference_id, added_by, added_by_name
  ) VALUES (
    p_employee_id, p_company_id, p_points, p_event_type, p_source,
    p_description, p_reference_id, p_added_by, p_added_by_name
  );
  
  -- Check for level up
  SELECT id, name INTO v_level_id, v_level_name
  FROM reward_levels
  WHERE company_id = p_company_id AND is_active = true AND min_points <= v_new_total
  ORDER BY min_points DESC
  LIMIT 1;
  
  IF v_level_id IS NOT NULL AND v_level_id IS DISTINCT FROM v_wallet.current_level_id THEN
    UPDATE employee_wallets SET current_level_id = v_level_id WHERE employee_id = p_employee_id;
    v_level_changed := true;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'new_total', v_new_total,
    'points_added', p_points,
    'level_changed', v_level_changed,
    'level_id', v_level_id,
    'level_name', v_level_name
  );
END;
$$;

-- =============================================
-- HELPER FUNCTION: Check if event can earn points (respecting limits)
-- =============================================

CREATE OR REPLACE FUNCTION public.can_earn_reward(
  p_employee_id UUID,
  p_company_id UUID,
  p_event_type TEXT,
  p_event_date DATE DEFAULT CURRENT_DATE
) RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rule reward_rules%ROWTYPE;
  v_daily_count INTEGER;
  v_weekly_count INTEGER;
  v_monthly_count INTEGER;
BEGIN
  -- Get the rule
  SELECT * INTO v_rule 
  FROM reward_rules 
  WHERE company_id = p_company_id AND event_type = p_event_type AND is_enabled = true;
  
  IF v_rule IS NULL THEN
    RETURN jsonb_build_object('can_earn', false, 'reason', 'rule_not_found');
  END IF;
  
  -- Check daily limit
  IF v_rule.daily_limit IS NOT NULL THEN
    SELECT COALESCE(event_count, 0) INTO v_daily_count
    FROM reward_event_tracking
    WHERE employee_id = p_employee_id AND event_type = p_event_type AND event_date = p_event_date;
    
    IF v_daily_count >= v_rule.daily_limit THEN
      RETURN jsonb_build_object('can_earn', false, 'reason', 'daily_limit_reached');
    END IF;
  END IF;
  
  -- Check weekly limit
  IF v_rule.weekly_limit IS NOT NULL THEN
    SELECT COALESCE(SUM(event_count), 0) INTO v_weekly_count
    FROM reward_event_tracking
    WHERE employee_id = p_employee_id 
      AND event_type = p_event_type 
      AND event_date >= date_trunc('week', p_event_date)::DATE;
    
    IF v_weekly_count >= v_rule.weekly_limit THEN
      RETURN jsonb_build_object('can_earn', false, 'reason', 'weekly_limit_reached');
    END IF;
  END IF;
  
  -- Check monthly limit
  IF v_rule.monthly_limit IS NOT NULL THEN
    SELECT COALESCE(SUM(event_count), 0) INTO v_monthly_count
    FROM reward_event_tracking
    WHERE employee_id = p_employee_id 
      AND event_type = p_event_type 
      AND event_date >= date_trunc('month', p_event_date)::DATE;
    
    IF v_monthly_count >= v_rule.monthly_limit THEN
      RETURN jsonb_build_object('can_earn', false, 'reason', 'monthly_limit_reached');
    END IF;
  END IF;
  
  RETURN jsonb_build_object(
    'can_earn', true, 
    'points', v_rule.points_value,
    'rule_id', v_rule.id
  );
END;
$$;

-- =============================================
-- HELPER FUNCTION: Get employee rank
-- =============================================

CREATE OR REPLACE FUNCTION public.get_employee_rank(
  p_employee_id UUID,
  p_company_id UUID,
  p_period_type TEXT DEFAULT 'monthly'
) RETURNS INTEGER
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rank INTEGER;
BEGIN
  SELECT rank INTO v_rank
  FROM rewards_leaderboard
  WHERE company_id = p_company_id 
    AND employee_id = p_employee_id
    AND period_type = p_period_type
    AND period_value = CASE 
      WHEN p_period_type = 'monthly' THEN to_char(CURRENT_DATE, 'YYYY-MM')
      WHEN p_period_type = 'weekly' THEN to_char(CURRENT_DATE, 'YYYY-"W"IW')
      WHEN p_period_type = 'daily' THEN to_char(CURRENT_DATE, 'YYYY-MM-DD')
      ELSE 'all'
    END;
  
  RETURN COALESCE(v_rank, 0);
END;
$$;

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

CREATE INDEX idx_reward_rules_company ON public.reward_rules(company_id);
CREATE INDEX idx_employee_wallets_company ON public.employee_wallets(company_id);
CREATE INDEX idx_employee_wallets_employee ON public.employee_wallets(employee_id);
CREATE INDEX idx_points_history_employee ON public.points_history(employee_id);
CREATE INDEX idx_points_history_company ON public.points_history(company_id);
CREATE INDEX idx_points_history_created ON public.points_history(created_at DESC);
CREATE INDEX idx_reward_levels_company ON public.reward_levels(company_id);
CREATE INDEX idx_badges_company ON public.badges(company_id);
CREATE INDEX idx_employee_badges_employee ON public.employee_badges(employee_id);
CREATE INDEX idx_marketplace_items_company ON public.marketplace_items(company_id);
CREATE INDEX idx_marketplace_orders_employee ON public.marketplace_orders(employee_id);
CREATE INDEX idx_marketplace_orders_company ON public.marketplace_orders(company_id);
CREATE INDEX idx_marketplace_orders_status ON public.marketplace_orders(status);
CREATE INDEX idx_rewards_leaderboard_company ON public.rewards_leaderboard(company_id, period_type, period_value);
CREATE INDEX idx_reward_event_tracking_employee ON public.reward_event_tracking(employee_id, event_type, event_date);