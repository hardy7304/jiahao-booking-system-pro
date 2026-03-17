import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/contexts/StoreContext";

export interface BookingSettings {
  buffer_minutes: number;
  free_addon_duration: number;
  pre_block_minutes: number;
}

const DEFAULTS: BookingSettings = {
  buffer_minutes: 10,
  free_addon_duration: 10,
  pre_block_minutes: 60,
};

const KEYS = Object.keys(DEFAULTS) as (keyof BookingSettings)[];

export function useBookingSettings() {
  const { storeId } = useStore();
  const [settings, setSettings] = useState<BookingSettings>(DEFAULTS);

  const fetchSettings = useCallback(async () => {
    const { data } = await supabase
      .from("system_config")
      .select("key, value")
      .in("key", KEYS)
      .eq("store_id", storeId);
    if (data) {
      const updated = { ...DEFAULTS };
      data.forEach((row) => {
        if (KEYS.includes(row.key as keyof BookingSettings)) {
          updated[row.key as keyof BookingSettings] = parseInt(row.value) || DEFAULTS[row.key as keyof BookingSettings];
        }
      });
      setSettings(updated);
    }
  }, [storeId]);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const updateSettings = async (newSettings: BookingSettings) => {
    const now = new Date().toISOString();
    for (const key of KEYS) {
      await supabase
        .from("system_config")
        .upsert({ key, value: newSettings[key].toString(), updated_at: now, store_id: storeId } as any);
    }
    setSettings(newSettings);
  };

  return { settings, updateSettings, refetch: fetchSettings };
}
