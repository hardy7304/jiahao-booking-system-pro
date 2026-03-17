import { createContext, useContext, type ReactNode } from "react";

interface StoreContextValue {
  storeId: string;
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
});

export function StoreProvider({ children }: { children: ReactNode }) {
  return (
    <StoreContext.Provider value={{ storeId: resolvedStoreId }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore(): StoreContextValue {
  return useContext(StoreContext);
}
