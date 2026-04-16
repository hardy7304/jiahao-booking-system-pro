-- 放行前台 anon 讀取 SEO／聯絡欄位（Helmet、JSON-LD）
-- 既有 GRANT 僅含 id, name, slug, is_active（見 20260331140000_stores_rls_and_column_grants.sql）

GRANT SELECT (seo_title, seo_description, seo_keywords, og_image, phone, address)
  ON TABLE public.stores TO anon;
GRANT SELECT (seo_title, seo_description, seo_keywords, og_image, phone, address)
  ON TABLE public.stores TO authenticated;
