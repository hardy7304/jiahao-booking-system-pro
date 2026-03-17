-- =============================================================================
-- Migration: 為 system_config 加入 store_id 以支援多租戶
-- 檔名: 20260317_add_store_id_to_system_config.sql
-- 說明: 將 system_config 從單店模式改為多店模式，每間店擁有獨立設定
-- =============================================================================

-- 0. 確保 stores 表存在且預設店家存在（若已執行 init_multi_tenant 則略過）
CREATE TABLE IF NOT EXISTS public.stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(50) UNIQUE NOT NULL,
  owner_email TEXT,
  phone VARCHAR(20),
  address TEXT,
  plan VARCHAR(20) DEFAULT 'pro',
  is_active BOOLEAN DEFAULT true,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.stores (id, name, slug, is_active)
VALUES ('8e8388bf-860e-44f7-8e14-35b76c64fb52'::uuid, '不老松安平店', 'anping', true)
ON CONFLICT (id) DO NOTHING;

-- 1. 新增 store_id 欄位（先允許 NULL，以便更新既有資料）
ALTER TABLE public.system_config
  ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores(id);

-- 2. 將既有資料的 store_id 設為安平店
UPDATE public.system_config
SET store_id = '8e8388bf-860e-44f7-8e14-35b76c64fb52'::uuid
WHERE store_id IS NULL;

-- 3. 設定 store_id 為 NOT NULL
ALTER TABLE public.system_config
  ALTER COLUMN store_id SET NOT NULL;

-- 4. 調整主鍵：從單一 key 改為 (store_id, key) 複合主鍵
--    如此每間店可擁有各自的 key 設定（例如 admin_password、commission_rate 等）
ALTER TABLE public.system_config
  DROP CONSTRAINT IF EXISTS system_config_pkey;

ALTER TABLE public.system_config
  ADD PRIMARY KEY (store_id, key);
