import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/contexts/StoreContext";

/**
 * 讀取 system_config.booking_page_url；若為 LINE 相關連結則供後台「一鍵開啟 LINE」使用。
 */
export function useStoreLineBookingUrl() {
  const { storeId } = useStore();
  const [lineLikeUrl, setLineLikeUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("system_config")
          .select("value")
          .eq("store_id", storeId)
          .eq("key", "booking_page_url")
          .maybeSingle();
        if (cancelled) return;
        if (error) throw error;
        const v = (data?.value as string | undefined)?.trim();
        if (v && /line\.me/i.test(v)) setLineLikeUrl(v);
        else setLineLikeUrl(null);
      } catch {
        if (!cancelled) setLineLikeUrl(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [storeId]);

  return { lineLikeUrl, loading };
}
