-- Create telegram_messages table to store all chat messages
CREATE TABLE public.telegram_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  telegram_chat_id TEXT NOT NULL,
  message_text TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('incoming', 'outgoing')),
  message_type TEXT DEFAULT 'text',
  metadata JSONB DEFAULT '{}',
  telegram_message_id BIGINT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.telegram_messages ENABLE ROW LEVEL SECURITY;

-- Create index for faster queries
CREATE INDEX idx_telegram_messages_employee_id ON public.telegram_messages(employee_id);
CREATE INDEX idx_telegram_messages_company_id ON public.telegram_messages(company_id);
CREATE INDEX idx_telegram_messages_created_at ON public.telegram_messages(created_at DESC);

-- RLS Policies
CREATE POLICY "Users can view messages from their company"
ON public.telegram_messages
FOR SELECT
USING (
  company_id IN (
    SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
  )
);

CREATE POLICY "System can insert messages"
ON public.telegram_messages
FOR INSERT
WITH CHECK (true);

-- Enable realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.telegram_messages;