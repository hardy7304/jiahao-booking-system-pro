-- ============================================================================
-- 嘉豪預約系統 - Supabase 完整資料庫 Schema
-- 可直接在 Supabase SQL Editor 貼上執行
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. bookings - 預約表
-- ----------------------------------------------------------------------------
CREATE TABLE public.bookings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_time timestamptz NOT NULL DEFAULT now(),
  date date NOT NULL,
  start_hour double precision NOT NULL,
  start_time_str text NOT NULL,
  name text NOT NULL,
  phone text NOT NULL,
  service text NOT NULL,
  addons text[] DEFAULT '{}',
  duration integer NOT NULL,
  total_price integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  cancelled_at timestamptz,
  source text DEFAULT 'customer',
  status text DEFAULT 'confirmed',
  cancel_reason text,
  admin_note text,
  completed_at timestamptz,
  google_calendar_event_id text,
  oil_bonus integer NOT NULL DEFAULT 0
);

COMMENT ON COLUMN public.bookings.source IS 'Booking source: customer, admin, front_desk';

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read bookings" ON public.bookings FOR SELECT USING (true);

-- ----------------------------------------------------------------------------
-- 2. holidays - 假日/公休表
-- ----------------------------------------------------------------------------
CREATE TABLE public.holidays (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date date NOT NULL,
  type text NOT NULL CHECK (type IN ('整天公休', '部分時段公休')),
  start_hour double precision,
  end_hour double precision,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  google_calendar_event_id text
);

ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read holidays" ON public.holidays FOR SELECT USING (true);

-- ----------------------------------------------------------------------------
-- 3. services - 服務項目表
-- ----------------------------------------------------------------------------
CREATE TABLE public.services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  duration integer NOT NULL,
  price integer NOT NULL,
  category text NOT NULL,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  deduction integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read services" ON public.services FOR SELECT USING (true);

-- Seed services
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

-- ----------------------------------------------------------------------------
-- 4. addons - 加購項目表
-- ----------------------------------------------------------------------------
CREATE TABLE public.addons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  extra_duration integer DEFAULT 0,
  extra_price integer DEFAULT 0,
  applicable_categories text[] DEFAULT '{}',
  addon_type text DEFAULT '加購',
  deduction integer DEFAULT 0,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.addons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read addons" ON public.addons FOR SELECT USING (true);

-- Seed addons
INSERT INTO public.addons (name, extra_duration, extra_price, applicable_categories, addon_type, sort_order) VALUES
  ('加購：足湯肩頸 (20分)', 20, 450, ARRAY['foot', 'fascia-foot'], '加購', 0),
  ('加購：刮痧 (30分)', 30, 650, ARRAY['foot', 'fascia-foot', 'body', 'combo'], '加購', 1),
  ('加購：筋膜刀肩頸 (30分)', 30, 800, ARRAY['foot', 'fascia-foot'], '加購', 2),
  ('升級：腳底精油 (含乳液/油)', 0, 300, ARRAY['foot', 'fascia-foot'], '升級', 3),
  ('精油香味：苦橙 (協助放鬆)', 0, 0, ARRAY['foot', 'fascia-foot'], '精油香味', 4),
  ('精油香味：玫瑰 (愉悅心情)', 0, 0, ARRAY['foot', 'fascia-foot'], '精油香味', 5),
  ('精油香味：薰衣草 (幫助睡眠)', 0, 0, ARRAY['foot', 'fascia-foot'], '精油香味', 6);

-- ----------------------------------------------------------------------------
-- 5. system_config - 系統設定表
-- ----------------------------------------------------------------------------
CREATE TABLE public.system_config (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read system_config" ON public.system_config FOR SELECT USING (true);

INSERT INTO public.system_config (key, value) VALUES 
  ('commission_rate', '0.6')
ON CONFLICT (key) DO NOTHING;
-- 注意：admin_password 若不存在，後台預設密碼為 bulaosong2024，請儘早於管理後台修改

-- ----------------------------------------------------------------------------
-- 6. customers - 客戶表
-- ----------------------------------------------------------------------------
CREATE TABLE public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL UNIQUE,
  name text NOT NULL DEFAULT '',
  visit_count integer NOT NULL DEFAULT 0,
  no_show_count integer NOT NULL DEFAULT 0,
  cancel_count integer NOT NULL DEFAULT 0,
  last_visit_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  is_blacklisted boolean NOT NULL DEFAULT false,
  blacklist_reason text,
  blacklist_action text NOT NULL DEFAULT 'warn',
  birthday date,
  line_id text,
  email text,
  allergy_notes text,
  pressure_preference text DEFAULT 'medium',
  area text
);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read customers" ON public.customers FOR SELECT USING (true);

-- ----------------------------------------------------------------------------
-- 7. customer_tags - 客戶標籤表
-- ----------------------------------------------------------------------------
CREATE TABLE public.customer_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  tag text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(customer_id, tag)
);

ALTER TABLE public.customer_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read customer_tags" ON public.customer_tags FOR SELECT USING (true);

-- ----------------------------------------------------------------------------
-- 8. customer_notes - 客戶備註表
-- ----------------------------------------------------------------------------
CREATE TABLE public.customer_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.customer_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read customer_notes" ON public.customer_notes FOR SELECT USING (true);

-- ----------------------------------------------------------------------------
-- 9. customer_custom_fields - 客戶自訂欄位定義表
-- ----------------------------------------------------------------------------
CREATE TABLE public.customer_custom_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  field_name text NOT NULL UNIQUE,
  field_type text NOT NULL DEFAULT 'text',
  options text[] DEFAULT '{}',
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.customer_custom_fields ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read customer_custom_fields" ON public.customer_custom_fields FOR SELECT USING (true);

-- ----------------------------------------------------------------------------
-- 10. customer_field_values - 客戶自訂欄位值表
-- ----------------------------------------------------------------------------
CREATE TABLE public.customer_field_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  field_id uuid NOT NULL REFERENCES public.customer_custom_fields(id) ON DELETE CASCADE,
  value text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(customer_id, field_id)
);

ALTER TABLE public.customer_field_values ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read customer_field_values" ON public.customer_field_values FOR SELECT USING (true);

-- ----------------------------------------------------------------------------
-- 11. Trigger: 預約變更時自動更新客戶統計
-- ----------------------------------------------------------------------------
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
$$;

CREATE TRIGGER trg_update_customer_on_booking_change
  AFTER INSERT OR UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_customer_on_booking_change();

-- ============================================================================
-- 完成
-- ============================================================================
-- 注意：此專案透過 Edge Functions (api-admin, api-booking 等) 使用 service_role
-- 進行寫入操作，因此 RLS 僅開放 SELECT。請確保 Edge Functions 已部署。
