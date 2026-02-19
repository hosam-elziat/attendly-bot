
-- Add prayer reminder settings to companies
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS prayer_reminders_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS prayer_reminders_prayers TEXT[] DEFAULT ARRAY['fajr','dhuhr','asr','maghrib','isha'],
ADD COLUMN IF NOT EXISTS prayer_reminder_minutes_before INTEGER DEFAULT 10;

-- Add Ramadan quiz settings to companies
ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS ramadan_quiz_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS ramadan_quiz_auto_in_ramadan BOOLEAN DEFAULT true;

-- Ramadan quiz questions bank
CREATE TABLE public.ramadan_quiz_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question_text TEXT NOT NULL,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT NOT NULL,
  option_d TEXT NOT NULL,
  correct_option TEXT NOT NULL CHECK (correct_option IN ('a','b','c','d')),
  category TEXT DEFAULT 'religious',
  difficulty TEXT DEFAULT 'medium',
  day_number INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Track daily quiz per company
CREATE TABLE public.ramadan_daily_quiz (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id),
  question_id UUID NOT NULL REFERENCES public.ramadan_quiz_questions(id),
  quiz_date DATE NOT NULL DEFAULT CURRENT_DATE,
  sent_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  first_correct_employee_id UUID REFERENCES public.employees(id),
  second_correct_employee_id UUID REFERENCES public.employees(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, quiz_date)
);

-- Track employee answers
CREATE TABLE public.ramadan_quiz_answers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  daily_quiz_id UUID NOT NULL REFERENCES public.ramadan_daily_quiz(id),
  employee_id UUID NOT NULL REFERENCES public.employees(id),
  company_id UUID NOT NULL REFERENCES public.companies(id),
  selected_option TEXT NOT NULL CHECK (selected_option IN ('a','b','c','d')),
  is_correct BOOLEAN NOT NULL,
  answered_at TIMESTAMPTZ DEFAULT now(),
  points_awarded INTEGER DEFAULT 0,
  answer_rank INTEGER,
  UNIQUE(daily_quiz_id, employee_id)
);

-- Enable RLS
ALTER TABLE public.ramadan_quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ramadan_daily_quiz ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ramadan_quiz_answers ENABLE ROW LEVEL SECURITY;

-- RLS policies for quiz questions (read by all authenticated, managed by super admin)
CREATE POLICY "Anyone can read quiz questions" ON public.ramadan_quiz_questions FOR SELECT USING (true);
CREATE POLICY "Super admins manage quiz questions" ON public.ramadan_quiz_questions FOR ALL USING (public.is_saas_admin(auth.uid()));

-- RLS for daily quiz
CREATE POLICY "Company members can read daily quiz" ON public.ramadan_daily_quiz FOR SELECT USING (
  public.belongs_to_company(auth.uid(), company_id) OR public.is_saas_admin(auth.uid())
);
CREATE POLICY "Admins manage daily quiz" ON public.ramadan_daily_quiz FOR ALL USING (
  public.is_admin_or_owner(auth.uid()) OR public.is_saas_admin(auth.uid())
);

-- RLS for quiz answers
CREATE POLICY "Company members can read answers" ON public.ramadan_quiz_answers FOR SELECT USING (
  public.belongs_to_company(auth.uid(), company_id) OR public.is_saas_admin(auth.uid())
);
CREATE POLICY "Employees can insert their own answer" ON public.ramadan_quiz_answers FOR INSERT WITH CHECK (
  public.belongs_to_company(auth.uid(), company_id)
);

-- Enable realtime for daily quiz
ALTER PUBLICATION supabase_realtime ADD TABLE public.ramadan_daily_quiz;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ramadan_quiz_answers;
