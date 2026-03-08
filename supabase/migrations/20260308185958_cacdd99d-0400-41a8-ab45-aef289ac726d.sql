
CREATE TABLE public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL UNIQUE,
  name text NOT NULL DEFAULT '',
  visit_count integer NOT NULL DEFAULT 0,
  no_show_count integer NOT NULL DEFAULT 0,
  last_visit_date date,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read customers" ON public.customers FOR SELECT USING (true);
CREATE POLICY "Anyone can insert customers" ON public.customers FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update customers" ON public.customers FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete customers" ON public.customers FOR DELETE USING (true);

-- Function to update customer stats when a booking is completed
CREATE OR REPLACE FUNCTION public.update_customer_on_booking_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_phone text;
  v_name text;
  v_visit_count integer;
  v_no_show_count integer;
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
    MAX(date) FILTER (WHERE status = 'completed')
  INTO v_visit_count, v_no_show_count, v_last_visit
  FROM public.bookings
  WHERE phone = v_phone;

  UPDATE public.customers
  SET visit_count = COALESCE(v_visit_count, 0),
      no_show_count = COALESCE(v_no_show_count, 0),
      last_visit_date = v_last_visit,
      updated_at = now()
  WHERE phone = v_phone;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_update_customer_stats
AFTER INSERT OR UPDATE ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.update_customer_on_booking_change();
