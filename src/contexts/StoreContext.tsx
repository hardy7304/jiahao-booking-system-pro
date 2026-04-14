import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface StoreInfo {
  id: string;
  name: string;
  slug: string;
  is_active?: boolean;
}

export interface StoreContextValue {
  storeId: string;
  currentStore: StoreInfo | null;
  stores: StoreInfo[];
  setStore: (id: string) => void;
  /** 重新載入 stores（例如新增店家後） */
  refetchStores: () => Promise<void>;
  isLoading: boolean;
}

const STORAGE_KEY = "selected_store_id";

/** 安平店預設 UUID；前端／Edge 在 store_id 缺失時共用此 fallback */
export const FALLBACK_STORE_ID = "8e8388bf-860e-44f7-8e14-35b76c64fb52";

const DEFAULT_STORE_ID = FALLBACK_STORE_ID;

const envDefault =
  typeof import.meta.env.VITE_STORE_ID === "string" && import.meta.env.VITE_STORE_ID.trim() !== ""
    ? import.meta.env.VITE_STORE_ID.trim()
    : DEFAULT_STORE_ID;

if (!import.meta.env.VITE_STORE_ID) {
  console.warn("[StoreContext] VITE_STORE_ID 未設定，使用預設值：", DEFAULT_STORE_ID);
}

function mapRowToStoreInfo(row: {
  id: string;
  name: string;
  slug: string;
  is_active: boolean | null;
}): StoreInfo {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    is_active: row.is_active ?? undefined,
  };
}

function resolveStoreIdFromList(list: StoreInfo[], fallback: string): string {
  if (list.length === 0) return fallback;
  let saved: string | null = null;
  try {
    saved = localStorage.getItem(STORAGE_KEY);
  } catch {
    // TODO: localStorage 不可用時僅依 fallback / 清單第一筆
  }
  if (saved && list.some((s) => s.id === saved)) return saved;
  if (list.some((s) => s.id === fallback)) return fallback;
  const first = list.find((s) => s.is_active !== false) ?? list[0];
  return first?.id ?? fallback;
}

const StoreContext = createContext<StoreContextValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [stores, setStores] = useState<StoreInfo[]>([]);
  const [storeId, setStoreIdState] = useState<string>(envDefault);
  const [isLoading, setIsLoading] = useState(true);

  const loadStores = useCallback(async () => {
    const { data, error } = await supabase
      .from("stores")
      .select("id, name, slug, is_active")
      .order("name");
    if (error) throw error;
    const list = (data ?? []).map(mapRowToStoreInfo);
    setStores(list);
    setStoreIdState((prev) =>
      list.some((s) => s.id === prev) ? prev : resolveStoreIdFromList(list, envDefault),
    );
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await loadStores();
      } catch {
        if (!cancelled) setStores([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadStores]);

  const refetchStores = useCallback(async () => {
    setIsLoading(true);
    try {
      await loadStores();
    } catch {
      setStores([]);
    } finally {
      setIsLoading(false);
    }
  }, [loadStores]);

  const setStore = useCallback((id: string) => {
    if (stores.length > 0 && !stores.some((s) => s.id === id)) {
      // TODO: 無效 store id 時是否提示使用者 — 目前靜默略過
      return;
    }
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      // TODO: 寫入失敗時仍更新記憶體狀態，可能造成與下次載入不一致
    }
    setStoreIdState(id);
  }, [stores]);

  const currentStore = useMemo(
    () => stores.find((s) => s.id === storeId) ?? null,
    [stores, storeId],
  );

  const value = useMemo<StoreContextValue>(
    () => ({
      storeId,
      currentStore,
      stores,
      setStore,
      refetchStores,
      isLoading,
    }),
    [storeId, currentStore, stores, setStore, refetchStores, isLoading],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext);
  if (!ctx) {
    throw new Error("useStore must be used within StoreProvider");
  }
  return ctx;
}
