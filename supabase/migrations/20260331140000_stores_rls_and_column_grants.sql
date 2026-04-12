-- Supabase Advisor: rls_disabled_in_public + sensitive_columns_exposed on public.stores
-- 前端僅需 id, name, slug, is_active（見 StoreContext）；其餘欄位不應經 anon key 讀取。

ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "stores_select_public" ON public.stores;
CREATE POLICY "stores_select_public"
  ON public.stores
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- 縮小 anon / authenticated 可讀欄位（PostgREST 會遵守欄位層級 GRANT）
REVOKE ALL ON TABLE public.stores FROM anon;
REVOKE ALL ON TABLE public.stores FROM authenticated;
GRANT SELECT (id, name, slug, is_active) ON TABLE public.stores TO anon;
GRANT SELECT (id, name, slug, is_active) ON TABLE public.stores TO authenticated;

-- 後台／Edge Functions 使用 service_role 時需完整表權限（且 BYPASSRLS）
GRANT ALL ON TABLE public.stores TO service_role;
