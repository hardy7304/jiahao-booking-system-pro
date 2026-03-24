-- 雙人單第二位師傅
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS secondary_coach_id UUID REFERENCES public.coaches(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_store_date_secondary_coach
ON public.bookings (store_id, date, secondary_coach_id)
WHERE cancelled_at IS NULL;
