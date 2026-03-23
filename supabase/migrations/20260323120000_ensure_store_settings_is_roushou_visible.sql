-- 既有環境若曾手動建立 store_settings 且缺少柔手 VIP 開關欄位，補上後開關與前台條件渲染才會生效
ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS is_roushou_visible BOOLEAN NOT NULL DEFAULT true;
