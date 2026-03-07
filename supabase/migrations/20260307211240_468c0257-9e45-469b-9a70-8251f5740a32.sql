
-- Add deduction column to services
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS deduction INTEGER DEFAULT 0;

-- Create system_config table
CREATE TABLE IF NOT EXISTS public.system_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS for system_config
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read system_config" ON public.system_config FOR SELECT USING (true);
CREATE POLICY "Anyone can update system_config" ON public.system_config FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can insert system_config" ON public.system_config FOR INSERT WITH CHECK (true);

-- Insert default commission rate
INSERT INTO public.system_config (key, value) VALUES ('commission_rate', '0.6') ON CONFLICT (key) DO NOTHING;
