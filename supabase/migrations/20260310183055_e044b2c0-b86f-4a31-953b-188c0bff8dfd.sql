-- Remove all public WRITE policies (keep only SELECT)

-- bookings
DROP POLICY IF EXISTS "Anyone can create bookings" ON public.bookings;
DROP POLICY IF EXISTS "Anyone can update bookings" ON public.bookings;
DROP POLICY IF EXISTS "Anyone can delete bookings" ON public.bookings;

-- services
DROP POLICY IF EXISTS "Anyone can insert services" ON public.services;
DROP POLICY IF EXISTS "Anyone can update services" ON public.services;
DROP POLICY IF EXISTS "Anyone can delete services" ON public.services;

-- addons
DROP POLICY IF EXISTS "Anyone can insert addons" ON public.addons;
DROP POLICY IF EXISTS "Anyone can update addons" ON public.addons;
DROP POLICY IF EXISTS "Anyone can delete addons" ON public.addons;

-- holidays
DROP POLICY IF EXISTS "Anyone can insert holidays" ON public.holidays;
DROP POLICY IF EXISTS "Anyone can delete holidays" ON public.holidays;

-- system_config
DROP POLICY IF EXISTS "Anyone can insert system_config" ON public.system_config;
DROP POLICY IF EXISTS "Anyone can update system_config" ON public.system_config;

-- customers
DROP POLICY IF EXISTS "Anyone can insert customers" ON public.customers;
DROP POLICY IF EXISTS "Anyone can update customers" ON public.customers;
DROP POLICY IF EXISTS "Anyone can delete customers" ON public.customers;

-- customer_tags
DROP POLICY IF EXISTS "Anyone can insert customer_tags" ON public.customer_tags;
DROP POLICY IF EXISTS "Anyone can delete customer_tags" ON public.customer_tags;

-- customer_notes
DROP POLICY IF EXISTS "Anyone can insert customer_notes" ON public.customer_notes;
DROP POLICY IF EXISTS "Anyone can delete customer_notes" ON public.customer_notes;

-- Bind the existing trigger function to bookings table
CREATE TRIGGER trg_update_customer_on_booking_change
  AFTER INSERT OR UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_customer_on_booking_change();