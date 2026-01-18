-- Create storage bucket for bot photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('bot-photos', 'bot-photos', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to bot-photos bucket
CREATE POLICY "Authenticated users can upload bot photos"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'bot-photos' AND auth.role() = 'authenticated');

-- Allow public read access to bot photos
CREATE POLICY "Public read access for bot photos"
ON storage.objects
FOR SELECT
USING (bucket_id = 'bot-photos');

-- Allow users to update/delete their own uploads
CREATE POLICY "Users can update their own bot photos"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'bot-photos' AND auth.role() = 'authenticated');

CREATE POLICY "Users can delete their own bot photos"
ON storage.objects
FOR DELETE
USING (bucket_id = 'bot-photos' AND auth.role() = 'authenticated');