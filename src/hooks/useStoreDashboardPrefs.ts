import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/contexts/StoreContext";

function normalizeVisibleCards(input: unknown, fallback: string[]): string[] {
  if (!Array.isArray(input)) return fallback;
  const cleaned = input.map((v) => (typeof v === "string" ? v : "")).filter((v) => v.trim() !== "");
  // 去重但保留順序
  const seen = new Set<string>();
  const unique: string[] = [];
  cleaned.forEach((id) => {
    if (seen.has(id)) return;
    seen.add(id);
    unique.push(id);
  });
  return unique.length > 0 ? unique : fallback;
}

/**
 * store dashboard 偏好：visible_cards（jsonb array of card ids）
 * - 以 store_id 為唯一鍵
 * - 使用 debounce 避免每次切 checkbox 就打 DB
 */
export function useStoreDashboardPrefs(defaultVisibleCards: string[]) {
  const { storeId } = useStore();
  const LS_KEY = `store_dashboard_prefs_${storeId}_visible_cards`;
  const [loadingPrefs, setLoadingPrefs] = useState(true);
  const [visibleCards, setVisibleCardsState] = useState<string[]>(defaultVisibleCards);

  const hydratedRef = useRef(false);
  const saveTimerRef = useRef<number | null>(null);

  const loadPrefs = useCallback(async () => {
    setLoadingPrefs(true);
    try {
      // LocalStorage fallback: 讓未套用 migration / 暫時 DB 不通時仍可「連動」與持久化
      try {
        const raw = localStorage.getItem(LS_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as unknown;
          const next = normalizeVisibleCards(parsed, defaultVisibleCards);
          setVisibleCardsState(next);
        }
      } catch {
        // ignore
      }

      const { data, error } = await supabase
        .from("store_dashboard_prefs" as any)
        .select("visible_cards")
        .eq("store_id", storeId)
        .maybeSingle();

      if (error) throw error;
      const next = normalizeVisibleCards((data as any)?.visible_cards, defaultVisibleCards);
      setVisibleCardsState(next);
    } catch (e) {
      console.error("[useStoreDashboardPrefs] load failed:", e);
      // DB load 失敗時：使用 localStorage（若有），否則 fallback default
      try {
        const raw = localStorage.getItem(LS_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as unknown;
          setVisibleCardsState(normalizeVisibleCards(parsed, defaultVisibleCards));
          return;
        }
      } catch {
        // ignore
      }
      setVisibleCardsState(defaultVisibleCards);
    } finally {
      setLoadingPrefs(false);
      hydratedRef.current = true;
    }
  }, [defaultVisibleCards, storeId]);

  useEffect(() => {
    void loadPrefs();
  }, [loadPrefs]);

  const persistPrefs = useCallback(
    async (cards: string[]) => {
      const payload = {
        store_id: storeId,
        visible_cards: cards,
      };

      // 先寫 localStorage，確保「立即連動 + 重新整理仍可保留」
      try {
        localStorage.setItem(LS_KEY, JSON.stringify(cards));
      } catch {
        // ignore
      }

      const { error } = await supabase
        .from("store_dashboard_prefs" as any)
        .upsert(payload as any, { onConflict: "store_id" });

      if (error) throw error;
    },
    [LS_KEY, storeId],
  );

  useEffect(() => {
    if (!hydratedRef.current) return;
    if (loadingPrefs) return;

    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => {
      void persistPrefs(visibleCards).catch((e) => {
        console.error("[useStoreDashboardPrefs] save failed:", e);
      });
    }, 450);

    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
  }, [loadingPrefs, persistPrefs, visibleCards]);

  return {
    loadingPrefs,
    visibleCards,
    setVisibleCards: setVisibleCardsState,
    refetch: loadPrefs,
  };
}

