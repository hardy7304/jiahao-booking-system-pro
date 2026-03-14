-- ============================================================================
-- 測試資料 Seed - 日曆公休、客戶、預約
-- 在 Supabase SQL Editor 貼上執行（需先執行 supabase-schema-complete.sql）
--
-- 包含：假日、5 位客戶、9 筆預約（含已完成/已確認/已取消）、標籤、備註
-- 重複執行時會略過已存在資料（holidays 同日不重複、customers 用 ON CONFLICT）
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. 假日/公休 (holidays)
-- ----------------------------------------------------------------------------
INSERT INTO public.holidays (date, type, start_hour, end_hour, note)
SELECT v.d, v.ty, v.sh, v.eh, v.n FROM (VALUES
  ('2025-03-15'::date, '整天公休'::text, NULL::double precision, NULL::double precision, '週六公休'::text),
  ('2025-03-16'::date, '整天公休', NULL, NULL, '週日公休'),
  ('2025-03-22'::date, '整天公休', NULL, NULL, '週六公休'),
  ('2025-03-23'::date, '整天公休', NULL, NULL, '週日公休'),
  ('2025-03-29'::date, '整天公休', NULL, NULL, '週六公休'),
  ('2025-03-30'::date, '整天公休', NULL, NULL, '週日公休'),
  ('2025-04-04'::date, '整天公休', NULL, NULL, '清明節'),
  ('2025-04-05'::date, '整天公休', NULL, NULL, '清明連假'),
  ('2025-04-06'::date, '整天公休', NULL, NULL, '清明連假'),
  ('2025-03-20'::date, '部分時段公休', 18::double precision, 22::double precision, '晚上時段公休')
) AS v(d, ty, sh, eh, n)
WHERE NOT EXISTS (SELECT 1 FROM public.holidays h WHERE h.date = v.d);

-- ----------------------------------------------------------------------------
-- 2. 客戶 (customers)
-- ----------------------------------------------------------------------------
INSERT INTO public.customers (phone, name, visit_count, no_show_count, cancel_count, last_visit_date, birthday, email, allergy_notes, pressure_preference, area) VALUES
  ('0912345678', '王小明', 3, 0, 1, '2025-03-10', '1985-06-15', 'wang@example.com', NULL, 'medium', '台北市'),
  ('0923456789', '陳美玲', 5, 1, 0, '2025-03-12', '1990-02-28', 'chen@example.com', '柑橘類過敏', 'light', '新北市'),
  ('0934567890', '林大偉', 1, 0, 0, '2025-02-20', NULL, NULL, NULL, 'heavy', NULL),
  ('0945678901', '黃雅婷', 2, 0, 2, '2025-03-05', '1988-11-03', 'huang@example.com', NULL, 'medium', '桃園市'),
  ('0956789012', '張志明', 0, 0, 0, NULL, '1992-08-20', NULL, NULL, 'medium', NULL)
ON CONFLICT (phone) DO UPDATE SET
  name = EXCLUDED.name,
  visit_count = EXCLUDED.visit_count,
  no_show_count = EXCLUDED.no_show_count,
  cancel_count = EXCLUDED.cancel_count,
  last_visit_date = EXCLUDED.last_visit_date,
  birthday = EXCLUDED.birthday,
  email = EXCLUDED.email,
  allergy_notes = EXCLUDED.allergy_notes,
  pressure_preference = EXCLUDED.pressure_preference,
  area = EXCLUDED.area,
  updated_at = now();

-- ----------------------------------------------------------------------------
-- 3. 預約 (bookings) - 含不同狀態
-- ----------------------------------------------------------------------------
INSERT INTO public.bookings (date, start_hour, start_time_str, name, phone, service, addons, duration, total_price, status, source) VALUES
  -- 已完成的預約
  ('2025-03-10', 10, '10:00', '王小明', '0912345678', '腳底按摩 (60分)', '{}', 60, 1200, 'completed', 'customer'),
  ('2025-03-12', 14, '14:00', '陳美玲', '0923456789', '全身指壓 (90分)', ARRAY['加購：刮痧 (30分)'], 120, 2300, 'completed', 'admin'),
  ('2025-03-13', 11, '11:00', '黃雅婷', '0945678901', '腳底按摩 (80分)', '{}', 80, 1600, 'completed', 'customer'),
  -- 已確認的預約（未來）
  ('2025-03-18', 10, '10:00', '王小明', '0912345678', '全身指壓 (60分)', '{}', 60, 1100, 'confirmed', 'customer'),
  ('2025-03-18', 14, '14:00', '林大偉', '0934567890', '筋膜刀【腳底】(60分)', ARRAY['升級：腳底精油 (含乳液/油)'], 60, 2050, 'confirmed', 'customer'),
  ('2025-03-19', 16, '16:00', '陳美玲', '0923456789', '腳底按摩 (40分)', '{}', 40, 800, 'confirmed', 'admin'),
  ('2025-03-21', 9, '09:00', '張志明', '0956789012', '全身指壓 (90分)', '{}', 90, 1650, 'confirmed', 'customer'),
  -- 已取消的預約
  ('2025-03-08', 15, '15:00', '王小明', '0912345678', '腳底按摩 (40分)', '{}', 40, 800, 'cancelled', 'customer'),
  ('2025-03-09', 13, '13:00', '黃雅婷', '0945678901', '筋膜刀【身體】(60分)', '{}', 60, 1800, 'cancelled', 'customer');

-- 為 completed 的預約補上 completed_at
UPDATE public.bookings SET completed_at = order_time WHERE status = 'completed';

-- 為 cancelled 的預約補上 cancelled_at
UPDATE public.bookings SET cancelled_at = order_time WHERE status = 'cancelled';

-- ----------------------------------------------------------------------------
-- 4. 客戶標籤 (customer_tags)
-- ----------------------------------------------------------------------------
INSERT INTO public.customer_tags (customer_id, tag)
SELECT c.id, unnest(ARRAY['常客', 'VIP'])
FROM public.customers c WHERE c.phone = '0912345678'
ON CONFLICT (customer_id, tag) DO NOTHING;

INSERT INTO public.customer_tags (customer_id, tag)
SELECT c.id, '過敏注意'
FROM public.customers c WHERE c.phone = '0923456789'
ON CONFLICT (customer_id, tag) DO NOTHING;

INSERT INTO public.customer_tags (customer_id, tag)
SELECT c.id, '新客'
FROM public.customers c WHERE c.phone = '0956789012'
ON CONFLICT (customer_id, tag) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 5. 客戶備註 (customer_notes)
-- ----------------------------------------------------------------------------
INSERT INTO public.customer_notes (customer_id, content)
SELECT c.id, '偏好靠窗位置，力道適中'
FROM public.customers c WHERE c.phone = '0912345678'
AND NOT EXISTS (SELECT 1 FROM public.customer_notes n WHERE n.customer_id = c.id AND n.content = '偏好靠窗位置，力道適中');

INSERT INTO public.customer_notes (customer_id, content)
SELECT c.id, '柑橘類精油避免使用'
FROM public.customers c WHERE c.phone = '0923456789'
AND NOT EXISTS (SELECT 1 FROM public.customer_notes n WHERE n.customer_id = c.id AND n.content = '柑橘類精油避免使用');
