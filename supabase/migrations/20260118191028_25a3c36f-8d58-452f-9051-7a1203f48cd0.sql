-- Create table for bot photo change requests
CREATE TABLE public.bot_photo_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  bot_username TEXT NOT NULL,
  requested_by UUID NOT NULL,
  requested_by_name TEXT,
  photo_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'rejected')),
  admin_notes TEXT,
  completed_at TIMESTAMP WITH TIME ZONE,
  completed_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bot_photo_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own company's requests
CREATE POLICY "Users can view own company requests"
ON public.bot_photo_requests
FOR SELECT
USING (
  company_id IN (
    SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
  )
);

-- Policy: Users can create requests for their own company
CREATE POLICY "Users can create requests for own company"
ON public.bot_photo_requests
FOR INSERT
WITH CHECK (
  company_id IN (
    SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
  )
);

-- Policy: Super admins can view all requests
CREATE POLICY "Super admins can view all requests"
ON public.bot_photo_requests
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.saas_team WHERE user_id = auth.uid() AND is_active = true
  )
);

-- Policy: Super admins can update requests
CREATE POLICY "Super admins can update requests"
ON public.bot_photo_requests
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.saas_team WHERE user_id = auth.uid() AND is_active = true
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_bot_photo_requests_updated_at
BEFORE UPDATE ON public.bot_photo_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();