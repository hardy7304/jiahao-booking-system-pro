-- 雙人單開關：預設 false，只有手動指定才啟用搭配師傅模式
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS needs_pair BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_bookings_store_date_needs_pair
ON public.bookings (store_id, date, needs_pair)
WHERE cancelled_at IS NULL;
