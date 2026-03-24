import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/contexts/StoreContext";
import type { Json } from "@/integrations/supabase/types";
import {
  mergeLandingContent,
  normalizeLandingContent,
  type LandingContent,
  type LandingServiceItem,
} from "@/lib/landingContent";

/**
 * 精簡版 `store_settings` 可能只有：store_id, hero_title, hero_subtitle, stats, services。
 * 其餘 CMS 欄位一律寫入 `stats` JSON，避免 PostgREST 報「找不到欄位」。
 */
function buildStoreSettingsUpsertPayload(
  storeId: string,
  next: LandingContent,
): Record<string, unknown> {
  const statsPayload: Json = {
    relief_count: next.relief_count,
    review_percent: next.review_percent,
    techniques_count: next.techniques_count,
    techniques_display: next.techniques_display,
    hero_hours_badge_short: next.hero_hours_badge_short,
    hero_late_night_note: next.hero_late_night_note,
    hero_starting_price_label: next.hero_starting_price_label,
    business_hours_display: next.business_hours_display,
    therapist_section_title: next.therapist_section_title,
    therapist_section_body: next.therapist_section_body,
    therapist_tags_line: next.therapist_tags_line,
    therapist_highlights: next.therapist_highlights as unknown as Json,
    footer_cta_title: next.footer_cta_title,
    footer_cta_body: next.footer_cta_body,
    brand_stats_title: next.brand_stats_title,
    brand_stats_subtitle: next.brand_stats_subtitle,
    therapist_portrait_url: next.therapist_portrait_url,
    closing_gallery_mode: next.closing_gallery_mode,
    closing_image_url_1: next.closing_image_url_1,
    closing_image_url_2: next.closing_image_url_2,
  };
  const servicesPayload: Json = next.services as unknown as Json;

  return {
    store_id: storeId,
    hero_title: next.hero_title,
    hero_subtitle: next.hero_subtitle,
    stats: statsPayload,
    services: servicesPayload,
  };
}

export function useStoreSettings() {
  const { storeId } = useStore();
  const [content, setContent] = useState<LandingContent>(() =>
    mergeLandingContent(storeId, null),
  );
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("store_settings")
      .select("*")
      .eq("store_id", storeId)
      .maybeSingle();

    if (error) {
      console.error("[useStoreSettings]", error);
      setContent(mergeLandingContent(storeId, null));
    } else {
      setContent(mergeLandingContent(storeId, data as Record<string, unknown> | null));
    }
    setLoading(false);
  }, [storeId]);

  useEffect(() => {
    void fetchSettings();
  }, [fetchSettings]);

  const saveSettings = async (patch: Partial<LandingContent>) => {
    if (!storeId || typeof storeId !== "string" || storeId.trim() === "") {
      throw new Error("無法儲存：尚未選擇店家（store_id 缺失）。");
    }

    /** 避免 Partial 裡帶 undefined 蓋掉既有欄位 */
    const cleanPatch = Object.fromEntries(
      Object.entries(patch).filter(([, v]) => v !== undefined),
    ) as Partial<LandingContent>;

    const next = normalizeLandingContent({
      ...content,
      ...cleanPatch,
      store_id: storeId,
    });

    const row = buildStoreSettingsUpsertPayload(storeId, next);

    const { error } = await supabase.from("store_settings").upsert(row, {
      onConflict: "store_id",
    });
    if (error) {
      const parts = [error.message, error.details, error.hint].filter(
        (s): s is string => typeof s === "string" && s.trim() !== "",
      );
      throw new Error(parts.length > 0 ? parts.join(" — ") : "儲存失敗（未知錯誤）");
    }
    setContent(normalizeLandingContent(next));
  };

  return {
    content,
    loading,
    refetch: fetchSettings,
    saveSettings,
    setContentLocal: (updater: (prev: LandingContent) => LandingContent) => {
      setContent((p) => updater(p));
    },
  };
}

export type { LandingContent, LandingServiceItem };
