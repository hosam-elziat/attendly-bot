-- Add business_owner_id column to companies table
ALTER TABLE public.companies 
ADD COLUMN business_owner_id uuid REFERENCES auth.users(id);

-- Update existing companies to set business_owner_id = owner_id
UPDATE public.companies 
SET business_owner_id = owner_id 
WHERE business_owner_id IS NULL;

-- Create admin_broadcasts table for super admin broadcast messages
CREATE TABLE public.admin_broadcasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  
  -- Content
  message_text text NOT NULL,
  image_url text,
  audio_url text,
  
  -- Targeting
  target_type text NOT NULL DEFAULT 'all', -- 'all', 'subscription', 'custom'
  target_filter jsonb, -- e.g. {"plans": ["premium", "trial"], "company_ids": [...]}
  
  -- Status
  status text NOT NULL DEFAULT 'draft', -- 'draft', 'sending', 'sent', 'failed'
  sent_at timestamp with time zone,
  total_recipients integer DEFAULT 0,
  successful_sends integer DEFAULT 0,
  failed_sends integer DEFAULT 0,
  
  -- Metadata
  notes text
);

-- Create table to track individual broadcast deliveries
CREATE TABLE public.broadcast_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  broadcast_id uuid NOT NULL REFERENCES public.admin_broadcasts(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id),
  employee_id uuid REFERENCES public.employees(id), -- The business owner employee
  telegram_chat_id text,
  status text NOT NULL DEFAULT 'pending', -- 'pending', 'sent', 'failed'
  sent_at timestamp with time zone,
  error_message text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_broadcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broadcast_deliveries ENABLE ROW LEVEL SECURITY;

-- RLS policies for admin_broadcasts (only saas_team can access)
CREATE POLICY "Saas team can manage broadcasts" 
ON public.admin_broadcasts 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.saas_team 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

-- RLS policies for broadcast_deliveries
CREATE POLICY "Saas team can view deliveries" 
ON public.broadcast_deliveries 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.saas_team 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

-- Add storage bucket for broadcast media
INSERT INTO storage.buckets (id, name, public) 
VALUES ('broadcast-media', 'broadcast-media', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for broadcast media
CREATE POLICY "Public can read broadcast media" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'broadcast-media');

CREATE POLICY "Saas team can upload broadcast media" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'broadcast-media' AND
  EXISTS (
    SELECT 1 FROM public.saas_team 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "Saas team can update broadcast media" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'broadcast-media' AND
  EXISTS (
    SELECT 1 FROM public.saas_team 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "Saas team can delete broadcast media" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'broadcast-media' AND
  EXISTS (
    SELECT 1 FROM public.saas_team 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

-- Create index for faster queries
CREATE INDEX idx_broadcast_deliveries_broadcast_id ON public.broadcast_deliveries(broadcast_id);
CREATE INDEX idx_broadcast_deliveries_status ON public.broadcast_deliveries(status);
CREATE INDEX idx_companies_business_owner ON public.companies(business_owner_id);