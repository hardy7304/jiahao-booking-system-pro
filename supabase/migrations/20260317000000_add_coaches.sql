-- =============================================================================
-- Migration: 新增 coaches 表（師傅/教練）
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.coaches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  specialty VARCHAR(100),
  password_hash VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.coaches ENABLE ROW LEVEL SECURITY;

-- 開發階段先全開
CREATE POLICY "coaches_all" ON public.coaches FOR ALL USING (true);

-- 插入測試資料（使用既有安平店 store_id）
INSERT INTO public.coaches (store_id, name, phone, specialty, password_hash)
SELECT id, '72號大師', '0900000000', '全身指壓、腳底按摩', 'temp'
FROM public.stores WHERE slug = 'anping' LIMIT 1;

INSERT INTO public.coaches (store_id, name, phone, specialty, password_hash)
SELECT id, '嘉豪教練', '0911111111', '基礎拳擊、體能訓練', 'temp'
FROM public.stores WHERE slug = 'anping' LIMIT 1;
