import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ShopInfo {
  store_name: string;
  therapist_name: string;
  store_location: string;
  store_address: string;
}

const DEFAULTS: ShopInfo = {
  store_name: "不老松足湯安平店",
  therapist_name: "嘉豪師傅",
  store_location: "不老松足湯安平店",
  store_address: "台南市安平區 · 不老松足湯安平店",
};

const KEYS = Object.keys(DEFAULTS) as (keyof ShopInfo)[];

export function useShopInfo() {
  const [info, setInfo] = useState<ShopInfo>(DEFAULTS);

  const fetchInfo = useCallback(async () => {
    const { data } = await supabase
      .from("system_config")
      .select("key, value")
      .in("key", KEYS);
    if (data) {
      const updated = { ...DEFAULTS };
      data.forEach((row) => {
        if (KEYS.includes(row.key as keyof ShopInfo)) {
          updated[row.key as keyof ShopInfo] = row.value;
        }
      });
      setInfo(updated);
    }
  }, []);

  useEffect(() => { fetchInfo(); }, [fetchInfo]);

  const updateInfo = async (newInfo: ShopInfo) => {
    const now = new Date().toISOString();
    for (const key of KEYS) {
      await supabase
        .from("system_config")
        .update({ value: newInfo[key], updated_at: now } as any)
        .eq("key", key);
    }
    setInfo(newInfo);
  };

  return { info, updateInfo, refetch: fetchInfo };
}
