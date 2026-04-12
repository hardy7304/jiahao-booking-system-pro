-- 症狀／部位標籤（多選），供後台「高頻疼痛部位統計」等分析使用
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS symptom_tags text[] NOT NULL DEFAULT '{}'::text[];

COMMENT ON COLUMN public.bookings.symptom_tags IS '客人勾選或填寫的症狀／部位標籤（字串陣列）';
