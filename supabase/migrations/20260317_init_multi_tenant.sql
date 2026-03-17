-- 1. 建立 stores 表
CREATE TABLE IF NOT EXISTS stores (
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

-- 2. 所有關聯表安全新增 store_id 欄位
ALTER TABLE services ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id);
ALTER TABLE holidays ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id);
ALTER TABLE addons ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id);
ALTER TABLE customer_notes ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id);
ALTER TABLE customer_tags ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id);
ALTER TABLE line_message_log ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id);
ALTER TABLE customer_custom_fields ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id);
ALTER TABLE customer_field_values ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id);

-- 3. 上保險鎖 (未來新增資料必須有店家歸屬)
ALTER TABLE services ALTER COLUMN store_id SET NOT NULL;
ALTER TABLE bookings ALTER COLUMN store_id SET NOT NULL;
ALTER TABLE customers ALTER COLUMN store_id SET NOT NULL;
ALTER TABLE holidays ALTER COLUMN store_id SET NOT NULL;
ALTER TABLE addons ALTER COLUMN store_id SET NOT NULL;
ALTER TABLE customer_notes ALTER COLUMN store_id SET NOT NULL;
ALTER TABLE customer_tags ALTER COLUMN store_id SET NOT NULL;
ALTER TABLE line_message_log ALTER COLUMN store_id SET NOT NULL;
ALTER TABLE customer_custom_fields ALTER COLUMN store_id SET NOT NULL;
ALTER TABLE customer_field_values ALTER COLUMN store_id SET NOT NULL;
