-- 為 coaches 補齊快速調度欄位，並讓 bookings 可記錄分配到的師傅
ALTER TABLE public.coaches
ADD COLUMN IF NOT EXISTS available_today BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS display_order INTEGER NOT NULL DEFAULT 100,
ADD COLUMN IF NOT EXISTS landing_visible BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS coach_id UUID REFERENCES public.coaches(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_store_date_coach
ON public.bookings (store_id, date, coach_id)
WHERE cancelled_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_coaches_store_active_today
ON public.coaches (store_id, is_active, available_today, display_order);

-- 既有資料：依建立順序補一個穩定排序
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY store_id ORDER BY created_at ASC, id ASC) AS rn
  FROM public.coaches
)
UPDATE public.coaches c
SET display_order = ranked.rn
FROM ranked
WHERE c.id = ranked.id
  AND (c.display_order IS NULL OR c.display_order = 100);
