-- =============================================================================
-- store_dashboard_prefs: 儲存後台統計儀表板可見卡片（按 store_id）
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.store_dashboard_prefs (
  store_id UUID PRIMARY KEY REFERENCES public.stores(id) ON DELETE CASCADE,
  visible_cards JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_store_dashboard_prefs_store_id ON public.store_dashboard_prefs(store_id);

ALTER TABLE public.store_dashboard_prefs ENABLE ROW LEVEL SECURITY;

-- 開發階段先全開（一致於 store_settings / 既有模式）
DROP POLICY IF EXISTS "store_dashboard_prefs_select_public" ON public.store_dashboard_prefs;
CREATE POLICY "store_dashboard_prefs_select_public" ON public.store_dashboard_prefs
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "store_dashboard_prefs_insert" ON public.store_dashboard_prefs;
CREATE POLICY "store_dashboard_prefs_insert" ON public.store_dashboard_prefs
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "store_dashboard_prefs_update" ON public.store_dashboard_prefs;
CREATE POLICY "store_dashboard_prefs_update" ON public.store_dashboard_prefs
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.set_store_dashboard_prefs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_store_dashboard_prefs_updated ON public.store_dashboard_prefs;
CREATE TRIGGER trg_store_dashboard_prefs_updated
  BEFORE UPDATE ON public.store_dashboard_prefs
  FOR EACH ROW
  EXECUTE FUNCTION public.set_store_dashboard_prefs_updated_at();

