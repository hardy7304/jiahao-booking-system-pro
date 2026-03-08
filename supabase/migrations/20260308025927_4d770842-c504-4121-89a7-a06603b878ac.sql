ALTER TABLE public.bookings ADD COLUMN source text DEFAULT 'customer';
COMMENT ON COLUMN public.bookings.source IS 'Booking source: customer, admin, front_desk';