
-- Create services table
CREATE TABLE public.services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  duration integer NOT NULL,
  price integer NOT NULL,
  category text NOT NULL,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create addons table
CREATE TABLE public.addons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  extra_duration integer DEFAULT 0,
  extra_price integer DEFAULT 0,
  applicable_categories text[] DEFAULT '{}',
  addon_type text DEFAULT '加購',
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addons ENABLE ROW LEVEL SECURITY;

-- RLS policies for services (public read, admin write)
CREATE POLICY "Anyone can read services" ON public.services FOR SELECT USING (true);
CREATE POLICY "Anyone can insert services" ON public.services FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update services" ON public.services FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete services" ON public.services FOR DELETE USING (true);

-- RLS policies for addons
CREATE POLICY "Anyone can read addons" ON public.addons FOR SELECT USING (true);
CREATE POLICY "Anyone can insert addons" ON public.addons FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update addons" ON public.addons FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete addons" ON public.addons FOR DELETE USING (true);

-- Seed services data
INSERT INTO public.services (name, duration, price, category, sort_order) VALUES
  ('深層雙拼 (筋膜刀身體60分 + 全身指壓60分)', 120, 2900, 'combo', 0),
  ('腳底按摩 (40分)', 40, 800, 'foot', 1),
  ('腳底按摩 (60分)', 60, 1200, 'foot', 2),
  ('腳底按摩 (80分)', 80, 1600, 'foot', 3),
  ('全身指壓 (60分)', 60, 1100, 'body', 4),
  ('全身指壓 (90分)', 90, 1650, 'body', 5),
  ('全身指壓 (120分)', 120, 2200, 'body', 6),
  ('筋膜刀【腳底】(40分)', 40, 1200, 'fascia-foot', 7),
  ('筋膜刀【腳底】(60分)', 60, 1750, 'fascia-foot', 8),
  ('筋膜刀【身體】(60分)', 60, 1800, 'fascia-body', 9),
  ('筋膜刀【身體】(90分)', 90, 2600, 'fascia-body', 10),
  ('筋膜刀【身體】(120分)', 120, 3400, 'fascia-body', 11),
  ('延禧套餐 (腳底精油60分+肩頸10分)', 70, 1549, 'package', 12),
  ('如懿套餐 (腳底精油80分+肩頸10分)', 90, 1949, 'package', 13),
  ('甄環套餐 (指壓60分+腳底60分+肩頸10分)', 130, 2349, 'package', 14),
  ('乾隆套餐 (全身精油60分+腳底精油40分+肩頸10分)', 110, 2699, 'package', 15);

-- Seed addons data
INSERT INTO public.addons (name, extra_duration, extra_price, applicable_categories, addon_type, sort_order) VALUES
  ('加購：足湯肩頸 (20分)', 20, 450, ARRAY['foot', 'fascia-foot'], '加購', 0),
  ('加購：刮痧 (30分)', 30, 650, ARRAY['foot', 'fascia-foot', 'body', 'combo'], '加購', 1),
  ('加購：筋膜刀肩頸 (30分)', 30, 800, ARRAY['foot', 'fascia-foot'], '加購', 2),
  ('升級：腳底精油 (含乳液/油)', 0, 300, ARRAY['foot', 'fascia-foot'], '升級', 3),
  ('精油香味：苦橙 (協助放鬆)', 0, 0, ARRAY['foot', 'fascia-foot'], '精油香味', 4),
  ('精油香味：玫瑰 (愉悅心情)', 0, 0, ARRAY['foot', 'fascia-foot'], '精油香味', 5),
  ('精油香味：薰衣草 (幫助睡眠)', 0, 0, ARRAY['foot', 'fascia-foot'], '精油香味', 6);
