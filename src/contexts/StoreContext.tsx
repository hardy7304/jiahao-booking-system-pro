import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface StoreInfo {
  id: string;
  name: string;
  slug: string;
  is_active?: boolean;
}

interface StoreContextValue {
  storeId: string;
  currentStore: StoreInfo | null;
  isLoading: boolean;
}

const DEFAULT_STORE_ID = "8e8388bf-860e-44f7-8e14-35b76c64fb52";

const resolvedStoreId = import.meta.env.VITE_STORE_ID || DEFAULT_STORE_ID;

if (!import.meta.env.VITE_STORE_ID) {
  console.warn(
    "[StoreContext] VITE_STORE_ID 未設定，使用預設值：",
    DEFAULT_STORE_ID,
  );
}

const StoreContext = createContext<StoreContextValue>({
  storeId: resolvedStoreId,
  currentStore: null,
  isLoading: true,
});

export function StoreProvider({ children }: { children: ReactNode }) {
  const [currentStore, setCurrentStore] = useState<StoreInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase
          .from("stores")
          .select("id, name, slug, is_active")
          .eq("id", resolvedStoreId)
          .maybeSingle();
        if (!cancelled && data) {
          setCurrentStore({
            id: data.id,
            name: data.name,
            slug: data.slug,
            is_active: data.is_active ?? true,
          });
        }
      } catch {
        // 忽略錯誤，保持 currentStore 為 null
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <StoreContext.Provider value={{ storeId: resolvedStoreId, currentStore, isLoading }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore(): StoreContextValue {
  return useContext(StoreContext);
}
