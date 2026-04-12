-- 搭班師傅「晚班可接」過渡欄位（低風險版，先不做完整班表）
ALTER TABLE public.coaches
ADD COLUMN IF NOT EXISTS available_tonight BOOLEAN NOT NULL DEFAULT false;

-- 既有資料相容：若原本今日可接，預設晚班也可接，避免升級後夜間全部不可約
UPDATE public.coaches
SET available_tonight = available_today
WHERE available_tonight IS DISTINCT FROM available_today;

CREATE INDEX IF NOT EXISTS idx_coaches_store_active_day_night
ON public.coaches (store_id, is_active, available_today, available_tonight, display_order);
