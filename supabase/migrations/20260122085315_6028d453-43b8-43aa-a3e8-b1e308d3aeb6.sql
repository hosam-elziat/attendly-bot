-- Fix bot-photos storage bucket security
-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Authenticated users can upload bot photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own bot photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own bot photos" ON storage.objects;

-- Create company-scoped upload policy
-- Files must be uploaded to a path starting with the user's company_id
CREATE POLICY "Users upload to own company folder"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'bot-photos' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = (
    SELECT p.company_id::text 
    FROM public.profiles p 
    WHERE p.user_id = auth.uid()
  )
);

-- Only allow update of files in own company folder
CREATE POLICY "Users update own company files"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'bot-photos' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = (
    SELECT p.company_id::text 
    FROM public.profiles p 
    WHERE p.user_id = auth.uid()
  )
);

-- Only allow delete of files in own company folder
CREATE POLICY "Users delete own company files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'bot-photos' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = (
    SELECT p.company_id::text 
    FROM public.profiles p 
    WHERE p.user_id = auth.uid()
  )
);