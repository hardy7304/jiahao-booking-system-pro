
-- Add blacklist columns to customers
ALTER TABLE public.customers 
  ADD COLUMN IF NOT EXISTS is_blacklisted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS blacklist_reason text,
  ADD COLUMN IF NOT EXISTS blacklist_action text NOT NULL DEFAULT 'warn';

-- Customer tags table
CREATE TABLE public.customer_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  tag text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(customer_id, tag)
);

ALTER TABLE public.customer_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read customer_tags" ON public.customer_tags FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can insert customer_tags" ON public.customer_tags FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can delete customer_tags" ON public.customer_tags FOR DELETE TO public USING (true);

-- Customer notes table
CREATE TABLE public.customer_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.customer_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read customer_notes" ON public.customer_notes FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can insert customer_notes" ON public.customer_notes FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can delete customer_notes" ON public.customer_notes FOR DELETE TO public USING (true);
