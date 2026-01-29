-- Goals/Challenges table for the rewards system
CREATE TABLE public.reward_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  name_ar TEXT,
  description TEXT,
  description_ar TEXT,
  -- Goal type: 'first_to_reach' (first person wins), 'everyone_reaches' (all who reach get reward)
  goal_type TEXT NOT NULL DEFAULT 'everyone_reaches' CHECK (goal_type IN ('first_to_reach', 'everyone_reaches')),
  -- Duration type: 'daily', 'weekly', 'monthly', 'custom'
  duration_type TEXT NOT NULL DEFAULT 'monthly' CHECK (duration_type IN ('daily', 'weekly', 'monthly', 'custom')),
  -- For custom duration
  start_date DATE,
  end_date DATE,
  -- Points threshold to achieve the goal
  points_threshold INTEGER NOT NULL DEFAULT 100,
  -- Reward for achieving (can be points, description, or item)
  reward_type TEXT NOT NULL DEFAULT 'points' CHECK (reward_type IN ('points', 'item', 'custom')),
  reward_points INTEGER DEFAULT 0,
  reward_item_id UUID REFERENCES public.marketplace_items(id) ON DELETE SET NULL,
  reward_description TEXT,
  reward_description_ar TEXT,
  -- Status
  is_active BOOLEAN DEFAULT true,
  is_announced BOOLEAN DEFAULT false,
  announced_at TIMESTAMP WITH TIME ZONE,
  -- Winner tracking for 'first_to_reach' type
  winner_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  winner_announced_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID
);

-- Table to track goal achievements
CREATE TABLE public.goal_achievements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  goal_id UUID NOT NULL REFERENCES public.reward_goals(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  achieved_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  points_at_achievement INTEGER,
  reward_given BOOLEAN DEFAULT false,
  reward_given_at TIMESTAMP WITH TIME ZONE,
  notified BOOLEAN DEFAULT false,
  notified_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(goal_id, employee_id)
);

-- Motivational messages table
CREATE TABLE public.motivational_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  message_ar TEXT NOT NULL,
  message_en TEXT,
  message_type TEXT DEFAULT 'leaderboard' CHECK (message_type IN ('leaderboard', 'goal_achieved', 'encouragement', 'milestone')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add some default motivational messages (global - null company_id means available to all)
INSERT INTO public.motivational_messages (company_id, message_ar, message_en, message_type) VALUES
(NULL, '🔥 المنافسة شرسة اليوم!', 'Competition is fierce today!', 'leaderboard'),
(NULL, '⚡ من سيتصدر القمة؟', 'Who will reach the top?', 'leaderboard'),
(NULL, '🏆 الأبطال يتنافسون!', 'Champions are competing!', 'leaderboard'),
(NULL, '💪 أظهر قوتك اليوم!', 'Show your strength today!', 'leaderboard'),
(NULL, '🚀 السباق نحو القمة مستمر!', 'The race to the top continues!', 'leaderboard'),
(NULL, '✨ كل نقطة تحسب!', 'Every point counts!', 'leaderboard'),
(NULL, '🎯 الهدف واضح، من سيحققه؟', 'The goal is clear, who will achieve it?', 'leaderboard'),
(NULL, '🌟 تألق وأثبت نفسك!', 'Shine and prove yourself!', 'leaderboard');

-- Enable RLS
ALTER TABLE public.reward_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.motivational_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for reward_goals
CREATE POLICY "Admins can manage goals" ON public.reward_goals
FOR ALL USING (is_admin_or_owner(auth.uid()) AND company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Company members can view goals" ON public.reward_goals
FOR SELECT USING (company_id = get_user_company_id(auth.uid()));

-- RLS Policies for goal_achievements
CREATE POLICY "Admins can manage achievements" ON public.goal_achievements
FOR ALL USING (is_admin_or_owner(auth.uid()) AND company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Company members can view achievements" ON public.goal_achievements
FOR SELECT USING (company_id = get_user_company_id(auth.uid()));

-- RLS Policies for motivational_messages
CREATE POLICY "Admins can manage company messages" ON public.motivational_messages
FOR ALL USING (
  (company_id IS NULL) OR 
  (is_admin_or_owner(auth.uid()) AND company_id = get_user_company_id(auth.uid()))
);

CREATE POLICY "Everyone can view messages" ON public.motivational_messages
FOR SELECT USING (
  is_active = true AND 
  (company_id IS NULL OR company_id = get_user_company_id(auth.uid()))
);

-- Trigger for updated_at
CREATE TRIGGER update_reward_goals_updated_at
BEFORE UPDATE ON public.reward_goals
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();