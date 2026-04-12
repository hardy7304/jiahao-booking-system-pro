-- 多租戶：工作室區塊套版（區塊標題、徽章、CTA、師傅區小字等），JSON 可留白由店家自填
ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS studios_shell JSONB NOT NULL DEFAULT '{}'::jsonb;
