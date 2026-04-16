-- Sitemap lastmod 使用；若舊列無值則以 created_at 回填
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

UPDATE public.stores
SET updated_at = COALESCE(created_at, NOW())
WHERE updated_at IS NULL;

ALTER TABLE public.stores ALTER COLUMN updated_at SET DEFAULT NOW();
