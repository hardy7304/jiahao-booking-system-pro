-- 供 GitHub Actions keepalive 使用的極小公開讀表（僅 anon SELECT）。
-- Workflow：GET /rest/v1/health_check?select=id&limit=1

CREATE TABLE IF NOT EXISTS public.health_check (
  id smallint PRIMARY KEY
);

INSERT INTO public.health_check (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.health_check ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "health_check_select_anon" ON public.health_check;
CREATE POLICY "health_check_select_anon"
  ON public.health_check
  FOR SELECT
  TO anon, authenticated
  USING (true);

REVOKE ALL ON TABLE public.health_check FROM anon;
REVOKE ALL ON TABLE public.health_check FROM authenticated;
GRANT SELECT ON TABLE public.health_check TO anon;
GRANT SELECT ON TABLE public.health_check TO authenticated;

GRANT ALL ON TABLE public.health_check TO service_role;
