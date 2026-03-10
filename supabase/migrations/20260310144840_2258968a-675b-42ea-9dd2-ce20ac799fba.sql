
-- Add cancel_count column to customers table
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS cancel_count integer NOT NULL DEFAULT 0;

-- Update the trigger function to also count cancellations
CREATE OR REPLACE FUNCTION public.update_customer_on_booking_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_phone text;
  v_name text;
  v_visit_count integer;
  v_no_show_count integer;
  v_cancel_count integer;
  v_last_visit date;
BEGIN
  v_phone := COALESCE(NEW.phone, OLD.phone);
  v_name := COALESCE(NEW.name, OLD.name);

  INSERT INTO public.customers (phone, name)
  VALUES (v_phone, v_name)
  ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name, updated_at = now();

  SELECT
    COUNT(*) FILTER (WHERE status = 'completed'),
    COUNT(*) FILTER (WHERE status = 'cancelled' AND cancel_reason ILIKE '%爽約%'),
    COUNT(*) FILTER (WHERE status = 'cancelled'),
    MAX(date) FILTER (WHERE status = 'completed')
  INTO v_visit_count, v_no_show_count, v_cancel_count, v_last_visit
  FROM public.bookings
  WHERE phone = v_phone;

  UPDATE public.customers
  SET visit_count = COALESCE(v_visit_count, 0),
      no_show_count = COALESCE(v_no_show_count, 0),
      cancel_count = COALESCE(v_cancel_count, 0),
      last_visit_date = v_last_visit,
      updated_at = now()
  WHERE phone = v_phone;

  RETURN NEW;
END;
$function$;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS trg_booking_change ON public.bookings;
CREATE TRIGGER trg_booking_change
  AFTER INSERT OR UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.update_customer_on_booking_change();
