
-- Add fixed fields to customers table
ALTER TABLE public.customers 
  ADD COLUMN IF NOT EXISTS birthday date,
  ADD COLUMN IF NOT EXISTS line_id text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS allergy_notes text,
  ADD COLUMN IF NOT EXISTS pressure_preference text DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS area text;

-- Custom field definitions table
CREATE TABLE IF NOT EXISTS public.customer_custom_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  field_name text NOT NULL UNIQUE,
  field_type text NOT NULL DEFAULT 'text', -- text, number, date, select
  options text[] DEFAULT '{}',
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Custom field values table
CREATE TABLE IF NOT EXISTS public.customer_field_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  field_id uuid NOT NULL REFERENCES public.customer_custom_fields(id) ON DELETE CASCADE,
  value text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(customer_id, field_id)
);

-- RLS: public read
ALTER TABLE public.customer_custom_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_field_values ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read customer_custom_fields" ON public.customer_custom_fields FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can read customer_field_values" ON public.customer_field_values FOR SELECT TO public USING (true);
