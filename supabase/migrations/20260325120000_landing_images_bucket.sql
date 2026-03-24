-- 首頁 / Landing v2 圖片（僅能由 Edge Function 以 service role 上傳；公開讀取）
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'landing-images',
  'landing-images',
  true,
  5242880,
  ARRAY['image/jpeg'::text, 'image/png'::text, 'image/webp'::text, 'image/gif'::text]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "landing_images_public_read" ON storage.objects;
CREATE POLICY "landing_images_public_read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'landing-images');
