import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export interface StoreInfo {
  id: string;
  name: string;
  slug: string;
  is_active?: boolean;
  seo_title?: string | null;
  seo_description?: string | null;
  seo_keywords?: string | null;
  og_image?: string | null;
  phone?: string | null;
  address?: string | null;
}

export interface StoreContextValue {
  storeId: string;
  currentStore: StoreInfo | null;
  stores: StoreInfo[];
  setStore: (id: string) => void;
  /** 重新載入 stores（例如新增店家後） */
  refetchStores: () => Promise<void>;
  isLoading: boolean;
  /** 路徑為 `/s/:segment/...` 時的第一段（slug 或 uuid） */
  urlSlugSegment: string | null;
  /** 僅在 `/s/:slug/*` 且尚無法確認店家時為 true */
  isSlugRoutePending: boolean;
  /** `/s/:slug/*` 且資料載入完成後仍無對應店家 */
  slugRouteNotFound: boolean;
  /** 站內導向：在 slug 模式下會帶 `/s/:segment/...` */
  buildStorePath: (sub: "" | "booking" | "admin" | "my-bookings") => string;
  /** 將 `/booking`、`/my-bookings?x=1` 等站內路徑轉成目前 slug 模式下的路徑 */
  remapLegacyAppPath: (href: string) => string;
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

const SLUG_PATH_RE = /^\/s\/([^/]+)/;

/** 從 pathname 取得 `/s/:segment` 的 segment（未命中則 null） */
export function parseSlugSegmentFromPath(pathname: string): string | null {
  const m = pathname.match(SLUG_PATH_RE);
  return m ? m[1] : null;
}

/**
 * 依網址第一段解析店家：先比對非空 slug（不分大小寫），再以 id 相符（含 slug 為空時用 id 當網址）
 */
export function resolveStoreFromSlugSegment(segment: string, list: StoreInfo[]): StoreInfo | null {
  const raw = segment.trim();
  if (!raw) return null;
  const lower = raw.toLowerCase();
  const bySlug = list.find((s) => {
    const sg = (s.slug ?? "").trim();
    return sg !== "" && sg.toLowerCase() === lower;
  });
  if (bySlug) return bySlug;
  return list.find((s) => s.id === raw) ?? null;
}

const STORES_PUBLIC_SELECT =
  "id, name, slug, is_active, seo_title, seo_description, seo_keywords, og_image, phone, address";

function mapRowToStoreInfo(row: {
  id: string;
  name: string;
  slug: string | null;
  is_active: boolean | null;
  seo_title?: string | null;
  seo_description?: string | null;
  seo_keywords?: string | null;
  og_image?: string | null;
  phone?: string | null;
  address?: string | null;
}): StoreInfo {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug ?? "",
    is_active: row.is_active ?? undefined,
    seo_title: row.seo_title ?? undefined,
    seo_description: row.seo_description ?? undefined,
    seo_keywords: row.seo_keywords ?? undefined,
    og_image: row.og_image ?? undefined,
    phone: row.phone ?? undefined,
    address: row.address ?? undefined,
  };
}

/**
 * @param preferLastSaved true：後台路徑 — 先沿用 localStorage 上次選店，再 fallback
 * @param preferLastSaved false：前台（首頁／預約等）— 先 VITE_STORE_ID／FALLBACK（預設不老松安平），再記住上次選店
 */
function resolveStoreIdFromList(list: StoreInfo[], fallback: string, preferLastSaved: boolean): string {
  if (list.length === 0) return fallback;
  let saved: string | null = null;
  try {
    saved = localStorage.getItem(STORAGE_KEY);
  } catch {
    // localStorage 不可用時僅依 fallback / 清單第一筆
  }
  const hasFallback = list.some((s) => s.id === fallback);
  const hasSaved = !!(saved && list.some((s) => s.id === saved));

  if (preferLastSaved) {
    if (hasSaved) return saved as string;
    if (hasFallback) return fallback;
  } else {
    if (hasFallback) return fallback;
    if (hasSaved) return saved as string;
  }

  const first = list.find((s) => s.is_active !== false) ?? list[0];
  return first?.id ?? fallback;
}

function isAdminPath(pathname: string): boolean {
  if (pathname === "/admin") return true;
  return /^\/s\/[^/]+\/admin\/?$/i.test(pathname);
}

const StoreContext = createContext<StoreContextValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const urlSlugSegment = useMemo(
    () => parseSlugSegmentFromPath(location.pathname),
    [location.pathname],
  );

  const [stores, setStores] = useState<StoreInfo[]>([]);
  const [storeIdState, setStoreIdState] = useState<string>(envDefault);
  const [isLoading, setIsLoading] = useState(true);
  /** `/s/:slug` 且清單內尚無法解析時，改向 DB 單筆查詢（避免清單漏列或 slug 大小寫差異） */
  const [slugLookupPending, setSlugLookupPending] = useState(false);

  const loadStores = useCallback(async () => {
    const { data, error } = await supabase
      .from("stores")
      .select(STORES_PUBLIC_SELECT)
      .order("name");
    if (error) throw error;
    const list = (data ?? []).map(mapRowToStoreInfo);
    setStores(list);
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

  /** 非 slug 路由：前台以專案預設店為主；後台仍以 localStorage 上次選店為主 */
  useEffect(() => {
    if (isLoading) return;
    if (urlSlugSegment) return;
    setStoreIdState(
      resolveStoreIdFromList(stores, envDefault, isAdminPath(location.pathname)),
    );
  }, [isLoading, urlSlugSegment, stores, envDefault, location.pathname]);

  /** slug 路由：清單無法解析時，以 DB 後援查詢並合併進 stores */
  useEffect(() => {
    if (!urlSlugSegment || isLoading) {
      setSlugLookupPending(false);
      return;
    }
    if (resolveStoreFromSlugSegment(urlSlugSegment, stores)) {
      setSlugLookupPending(false);
      return;
    }

    let cancelled = false;
    setSlugLookupPending(true);
    const seg = urlSlugSegment.trim();

    (async () => {
      try {
        let row: {
          id: string;
          name: string;
          slug: string | null;
          is_active: boolean | null;
          seo_title?: string | null;
          seo_description?: string | null;
          seo_keywords?: string | null;
          og_image?: string | null;
          phone?: string | null;
          address?: string | null;
        } | null = null;

        const uuidLike =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(seg);
        if (uuidLike) {
          const { data } = await supabase
            .from("stores")
            .select(STORES_PUBLIC_SELECT)
            .eq("id", seg)
            .maybeSingle();
          row = data ?? null;
        }
        if (!row && !cancelled) {
          const { data, error } = await supabase
            .from("stores")
            .select(STORES_PUBLIC_SELECT)
            .ilike("slug", seg)
            .limit(1);
          if (error) throw error;
          row = data?.[0] ?? null;
        }
        if (cancelled) return;
        if (row) {
          const info = mapRowToStoreInfo(row);
          setStores((prev) => (prev.some((s) => s.id === info.id) ? prev : [...prev, info]));
        }
      } catch {
        // 後援查詢失敗時維持清單現狀，交由 slugRouteNotFound
      } finally {
        if (!cancelled) setSlugLookupPending(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [urlSlugSegment, isLoading, stores]);

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

  const storeIdFromUrl = useMemo(() => {
    if (!urlSlugSegment || isLoading) return null;
    return resolveStoreFromSlugSegment(urlSlugSegment, stores)?.id ?? null;
  }, [urlSlugSegment, stores, isLoading]);

  const isSlugRoutePending = !!urlSlugSegment && (isLoading || slugLookupPending);

  const slugRouteNotFound = useMemo(() => {
    if (!urlSlugSegment || isLoading || slugLookupPending) return false;
    return resolveStoreFromSlugSegment(urlSlugSegment, stores) === null;
  }, [urlSlugSegment, stores, isLoading, slugLookupPending]);

  const storeId = (storeIdFromUrl ?? storeIdState) as string;

  const setStore = useCallback(
    (id: string) => {
      if (stores.length > 0 && !stores.some((s) => s.id === id)) {
        return;
      }
      try {
        localStorage.setItem(STORAGE_KEY, id);
      } catch {
        // 寫入失敗時仍更新記憶體狀態
      }
      setStoreIdState(id);
    },
    [stores],
  );

  const buildStorePath = useCallback(
    (sub: "" | "booking" | "admin" | "my-bookings") => {
      if (urlSlugSegment) {
        if (sub === "") return `/s/${urlSlugSegment}`;
        return `/s/${urlSlugSegment}/${sub}`;
      }
      if (sub === "booking") return "/booking";
      if (sub === "admin") return "/admin";
      if (sub === "my-bookings") return "/my-bookings";
      return "/";
    },
    [urlSlugSegment],
  );

  const remapLegacyAppPath = useCallback(
    (href: string) => {
      if (!urlSlugSegment) return href;
      const qIdx = href.indexOf("?");
      const pathOnly = qIdx >= 0 ? href.slice(0, qIdx) : href;
      const search = qIdx >= 0 ? href.slice(qIdx) : "";
      const map: Record<string, "booking" | "admin" | "my-bookings"> = {
        "/booking": "booking",
        "/mylinecalendar": "booking",
        "/my-bookings": "my-bookings",
        "/mylinebookings": "my-bookings",
        "/admin": "admin",
      };
      const sub = map[pathOnly];
      if (sub) return buildStorePath(sub) + search;
      return href;
    },
    [urlSlugSegment, buildStorePath],
  );

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
      urlSlugSegment,
      isSlugRoutePending,
      slugRouteNotFound,
      buildStorePath,
      remapLegacyAppPath,
    }),
    [
      storeId,
      currentStore,
      stores,
      setStore,
      refetchStores,
      isLoading,
      urlSlugSegment,
      isSlugRoutePending,
      slugRouteNotFound,
      buildStorePath,
      remapLegacyAppPath,
    ],
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
