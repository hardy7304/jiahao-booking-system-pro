-- SEO 與聯絡欄位（多租戶 stores）
-- phone：若舊庫已存在 VARCHAR phone，ADD COLUMN IF NOT EXISTS 會略過不重複建立

ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS seo_title TEXT;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS seo_description TEXT;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS seo_keywords TEXT;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS og_image TEXT;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS phone TEXT;
