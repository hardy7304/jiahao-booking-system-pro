-- bookings 觸發器會同步 customers；多租戶後 customers.store_id NOT NULL，
-- 舊版 INSERT (phone, name) 會違反約束。改為帶入 store_id，並改唯一鍵為 (store_id, phone)。

-- 1. 移除全域 phone 唯一（改為每店獨立電話客戶）
ALTER TABLE public.customers
  DROP CONSTRAINT IF EXISTS customers_phone_key;

-- 2. 複合唯一：同一店同一電話一筆客戶
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'customers_store_id_phone_key'
  ) THEN
    ALTER TABLE public.customers
      ADD CONSTRAINT customers_store_id_phone_key UNIQUE (store_id, phone);
  END IF;
END $$;

-- 3. 觸發函式：從 NEW/OLD.store_id 寫入 customers，統計僅限同店
CREATE OR REPLACE FUNCTION public.update_customer_on_booking_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_phone text;
  v_name text;
  v_store_id uuid;
  v_visit_count integer;
  v_no_show_count integer;
  v_cancel_count integer;
  v_last_visit date;
  -- 與 Edge api-booking FALLBACK_STORE_ID 一致，僅防歷史列缺 store_id
  fallback_store uuid := '8e8388bf-860e-44f7-8e14-35b76c64fb52'::uuid;
BEGIN
  v_phone := COALESCE(NEW.phone, OLD.phone);
  v_name := COALESCE(NEW.name, OLD.name);
  v_store_id := COALESCE(NEW.store_id, OLD.store_id, fallback_store);

  IF v_phone IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.customers (phone, name, store_id)
  VALUES (v_phone, v_name, v_store_id)
  ON CONFLICT (store_id, phone) DO UPDATE SET
    name = EXCLUDED.name,
    updated_at = now();

  SELECT
    COUNT(*) FILTER (WHERE status = 'completed'),
    COUNT(*) FILTER (WHERE status = 'cancelled' AND cancel_reason ILIKE '%爽約%'),
    COUNT(*) FILTER (WHERE status = 'cancelled'),
    MAX(date) FILTER (WHERE status = 'completed')
  INTO v_visit_count, v_no_show_count, v_cancel_count, v_last_visit
  FROM public.bookings
  WHERE phone = v_phone
    AND store_id = v_store_id;

  UPDATE public.customers
  SET visit_count = COALESCE(v_visit_count, 0),
      no_show_count = COALESCE(v_no_show_count, 0),
      cancel_count = COALESCE(v_cancel_count, 0),
      last_visit_date = v_last_visit,
      updated_at = now()
  WHERE phone = v_phone
    AND store_id = v_store_id;

  RETURN NEW;
END;
$function$;

-- 4. 歷史 migration 可能留下多個同名觸發器；統一只留一個，避免客戶統計被重算多次
DROP TRIGGER IF EXISTS trg_update_customer_stats ON public.bookings;
DROP TRIGGER IF EXISTS trg_booking_change ON public.bookings;
DROP TRIGGER IF EXISTS trg_update_customer_on_booking_change ON public.bookings;

CREATE TRIGGER trg_update_customer_on_booking_change
  AFTER INSERT OR UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_customer_on_booking_change();
