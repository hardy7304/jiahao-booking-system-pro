import { useMemo } from "react";

/** 與 StoreContext / stores 表對齊，供 SEO 使用 */
export interface StoreSEOInput {
  name: string;
  slug: string;
  seo_title?: string | null;
  seo_description?: string | null;
  seo_keywords?: string | null;
  og_image?: string | null;
  phone?: string | null;
  address?: string | null;
}

export const SITE_ORIGIN = "https://booking.tainanboxing.com";
export const DEFAULT_OG_IMAGE = `${SITE_ORIGIN}/og-default.jpg`;

export interface SEOOutput {
  title: string;
  description: string;
  keywords: string;
  ogImage: string;
}

export function buildSEO(store: StoreSEOInput | null): SEOOutput {
  const name = store?.name?.trim() || "線上預約";
  const title =
    store?.seo_title?.trim() || `${name} 線上預約 | 台南按摩推拿服務`;
  const description =
    store?.seo_description?.trim() ||
    `${name}，台南專業按摩推拿服務，線上即時預約，快速確認。`;
  const keywords =
    store?.seo_keywords?.trim() ||
    `台南按摩,${name},推拿預約,到府按摩`;
  const ogImage = store?.og_image?.trim() || DEFAULT_OG_IMAGE;
  return { title, description, keywords, ogImage };
}

export function useSEO(store: StoreSEOInput | null): SEOOutput {
  return useMemo(() => buildSEO(store), [store]);
}
