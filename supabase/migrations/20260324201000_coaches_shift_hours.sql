-- 搭班師傅可接時段（以 14~26 軸表示；26 = 隔日 02:00）
ALTER TABLE public.coaches
ADD COLUMN IF NOT EXISTS shift_start_hour NUMERIC NOT NULL DEFAULT 14,
ADD COLUMN IF NOT EXISTS shift_end_hour NUMERIC NOT NULL DEFAULT 26;

-- 既有資料保守預設：沿用全營業時段 14:00~02:00
UPDATE public.coaches
SET shift_start_hour = COALESCE(shift_start_hour, 14),
    shift_end_hour = COALESCE(shift_end_hour, 26)
WHERE shift_start_hour IS NULL OR shift_end_hour IS NULL;

CREATE INDEX IF NOT EXISTS idx_coaches_store_shift
ON public.coaches (store_id, is_active, available_today, shift_start_hour, shift_end_hour, display_order);
