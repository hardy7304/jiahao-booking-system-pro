
-- Create bookings table
CREATE TABLE public.bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  date DATE NOT NULL,
  start_hour DOUBLE PRECISION NOT NULL,
  start_time_str TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  service TEXT NOT NULL,
  addons TEXT[] DEFAULT '{}',
  duration INTEGER NOT NULL,
  total_price INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create holidays table
CREATE TABLE public.holidays (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('整天公休', '部分時段公休')),
  start_hour DOUBLE PRECISION,
  end_hour DOUBLE PRECISION,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;

-- Public can insert bookings
CREATE POLICY "Anyone can create bookings" ON public.bookings FOR INSERT WITH CHECK (true);
-- Public can read bookings (for time slot checking)
CREATE POLICY "Anyone can read bookings" ON public.bookings FOR SELECT USING (true);
-- Admin delete (protected at app level)
CREATE POLICY "Anyone can delete bookings" ON public.bookings FOR DELETE USING (true);

-- Public can read holidays
CREATE POLICY "Anyone can read holidays" ON public.holidays FOR SELECT USING (true);
CREATE POLICY "Anyone can insert holidays" ON public.holidays FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can delete holidays" ON public.holidays FOR DELETE USING (true);
