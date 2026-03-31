-- Landing 全站 CMS：每店一列 store_settings
CREATE TABLE IF NOT EXISTS public.store_settings (
  store_id UUID PRIMARY KEY REFERENCES public.stores(id) ON DELETE CASCADE,
  hero_title TEXT,
  hero_subtitle TEXT,
  hero_hours_badge_short TEXT,
  hero_late_night_note TEXT,
  hero_starting_price_label TEXT,
  business_hours_display TEXT,
  roushou_intro TEXT,
  stats JSONB NOT NULL DEFAULT '{"relief_count":1280,"review_percent":99,"techniques_count":72}'::jsonb,
  services JSONB NOT NULL DEFAULT '[]'::jsonb,
  anping_section_title TEXT,
  anping_section_body TEXT,
  roushou_section_title TEXT,
  roushou_section_body TEXT,
  therapist_section_title TEXT,
  therapist_section_body TEXT,
  therapist_tags_line TEXT,
  therapist_highlights JSONB NOT NULL DEFAULT '["師傅親自操作","下午兩點至凌晨兩點","線上即時預約","台南安平在地"]'::jsonb,
  boxing_section_title TEXT,
  boxing_section_body TEXT,
  boxing_cta_label TEXT,
  boxing_cta_url TEXT,
  footer_cta_title TEXT,
  footer_cta_body TEXT,
  brand_stats_title TEXT,
  brand_stats_subtitle TEXT,
  is_roushou_visible BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 遠端若已有舊版 store_settings，IF NOT EXISTS 不會補欄位；以下確保與本 migration 一致
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS hero_title TEXT;
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS hero_subtitle TEXT;
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS hero_hours_badge_short TEXT;
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS hero_late_night_note TEXT;
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS hero_starting_price_label TEXT;
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS business_hours_display TEXT;
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS roushou_intro TEXT;
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS stats JSONB NOT NULL DEFAULT '{"relief_count":1280,"review_percent":99,"techniques_count":72}'::jsonb;
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS services JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS anping_section_title TEXT;
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS anping_section_body TEXT;
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS roushou_section_title TEXT;
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS roushou_section_body TEXT;
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS therapist_section_title TEXT;
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS therapist_section_body TEXT;
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS therapist_tags_line TEXT;
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS therapist_highlights JSONB NOT NULL DEFAULT '["師傅親自操作","下午兩點至凌晨兩點","線上即時預約","台南安平在地"]'::jsonb;
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS boxing_section_title TEXT;
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS boxing_section_body TEXT;
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS boxing_cta_label TEXT;
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS boxing_cta_url TEXT;
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS footer_cta_title TEXT;
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS footer_cta_body TEXT;
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS brand_stats_title TEXT;
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS brand_stats_subtitle TEXT;
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS is_roushou_visible BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_store_settings_store_id ON public.store_settings(store_id);

ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "store_settings_select_public" ON public.store_settings;
CREATE POLICY "store_settings_select_public" ON public.store_settings
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "store_settings_insert" ON public.store_settings;
CREATE POLICY "store_settings_insert" ON public.store_settings
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "store_settings_update" ON public.store_settings;
CREATE POLICY "store_settings_update" ON public.store_settings
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.set_store_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_store_settings_updated ON public.store_settings;
CREATE TRIGGER trg_store_settings_updated
  BEFORE UPDATE ON public.store_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_store_settings_updated_at();

-- 預設店資料（與 init_multi_tenant 安平店 id 一致）
INSERT INTO public.store_settings (
  store_id,
  hero_title,
  hero_subtitle,
  hero_hours_badge_short,
  hero_late_night_note,
  hero_starting_price_label,
  business_hours_display,
  roushou_intro,
  brand_stats_title,
  brand_stats_subtitle,
  anping_section_title,
  anping_section_body,
  roushou_section_title,
  roushou_section_body,
  therapist_section_title,
  therapist_section_body,
  therapist_tags_line,
  therapist_highlights,
  boxing_section_title,
  boxing_section_body,
  boxing_cta_label,
  boxing_cta_url,
  footer_cta_title,
  footer_cta_body,
  is_roushou_visible,
  services
) VALUES (
  '8e8388bf-860e-44f7-8e14-35b76c64fb52'::uuid,
  '放鬆由此開始',
  '專業調理身心的場所。腳底按摩、全身指壓、筋膜刀療程，從下午兩點一路到凌晨兩點，隨時等你來放鬆。',
  '14–02',
  '深夜也能到館',
  'NT$800 起',
  '14:00 — 02:00',
  '除了不老松門市，師傅另有私人居家工作室「柔手傳統整復推拿」，提供更私密、更個人化的傳統整復服務。空間溫馨，完全預約制。',
  '神之手 · 專業實績',
  '用數據見證每一次的極致放鬆',
  '不老松安平店',
  '台南安平在地深耕，安平 72 號。每一次療程皆由師傅親自操作，手感與力道精準。',
  '柔手傳統整復推拿',
  '居家工作室、完全預約制，一對一傳統整復推拿。需要深度調理時的另一個選擇。',
  '張嘉豪師傅',
  '扎根台南安平的按摩調理師，結合傳統手法與現代療程。不老松與柔手，皆由同一位師傅親自服務，品質一致。',
  '腳底按摩 · 全身指壓 · 筋膜刀 · 傳統整復',
  '["師傅親自操作","深夜不打烊","線上即時預約","台南安平在地"]'::jsonb,
  '師傅的另一面',
  '平日是按摩師，場下是拳擊人。在台南安平提供拳擊相關課程，歡迎有興趣的朋友洽詢。',
  '了解拳擊課程',
  '/booking',
  '今天，讓自己好好休息一下',
  '不需要等到假日，下班後、深夜都歡迎。線上預約 24 小時開放，選一個方便的時段。',
  true,
  '[
    {"name":"腳底按摩","tagline":"足部放鬆","description":"足底反射區按摩，消除疲勞、促進循環，從腳底開始放鬆全身。","featured":false,"starting_price_label":"起價 NT$800","tiers":[{"label":"40 分鐘","price":"NT$800"},{"label":"60 分鐘","price":"NT$1,200"},{"label":"80 分鐘","price":"NT$1,600"}]},
    {"name":"全身指壓","tagline":"全身調理","description":"傳統指壓技法，針對全身穴位深層放鬆，舒緩肌肉緊繃與痠痛。","featured":false,"starting_price_label":"起價 NT$1,100","tiers":[{"label":"60 分鐘","price":"NT$1,100"},{"label":"90 分鐘","price":"NT$1,650"},{"label":"120 分鐘","price":"NT$2,200"}]},
    {"name":"筋膜刀療程","tagline":"⭐ 招牌項目","description":"現代肌筋膜放鬆技術，改善筋膜沾黏、促進組織修復，適合久坐與運動族群。","featured":true,"starting_price_label":"起價 NT$1,200","tiers":[{"label":"足部 40 分鐘","price":"NT$1,200"},{"label":"足部 60 分鐘","price":"NT$1,750"},{"label":"全身 60 分鐘","price":"NT$1,800"}]},
    {"name":"深層組合套餐","tagline":"超值套餐","description":"筋膜刀 60 分＋全身指壓 60 分，雙重深度放鬆。","featured":false,"starting_price_label":"組合優惠 NT$2,900","tiers":[{"label":"筋膜刀 60min","price":"含"},{"label":"全身指壓 60min","price":"含"}]}
  ]'::jsonb
) ON CONFLICT (store_id) DO NOTHING;
