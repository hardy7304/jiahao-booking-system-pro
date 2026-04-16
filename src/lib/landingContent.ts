import type { Json } from "@/integrations/supabase/types";

export interface LandingServiceTier {
  label: string;
  price: string;
}

export type ServiceTagColor = "amber" | "emerald" | "blue" | "rose" | "purple";

export const SERVICE_TAG_COLOR_OPTIONS: { value: ServiceTagColor; label: string; preview: string }[] = [
  { value: "amber", label: "金色（熱門）", preview: "bg-amber-500/90" },
  { value: "emerald", label: "綠色（推薦）", preview: "bg-emerald-500/90" },
  { value: "blue", label: "藍色（專業）", preview: "bg-blue-500/90" },
  { value: "rose", label: "玫紅（招牌）", preview: "bg-rose-500/90" },
  { value: "purple", label: "紫色（限定）", preview: "bg-purple-500/90" },
];

export interface LandingServiceItem {
  name: string;
  tagline?: string;
  description: string;
  featured?: boolean;
  starting_price_label?: string;
  /** 服務卡片主圖（Landing v2 / 後台可上傳或貼網址） */
  image_url?: string;
  /** 卡片角標文字（如「熱門」「推薦」「專業」，留空不顯示） */
  tag?: string;
  /** 角標顏色 */
  tag_color?: ServiceTagColor;
  tiers: LandingServiceTier[];
}

/** Landing v2 尾段 CTA 上方「環境圖」區塊 */
export type ClosingGalleryMode = "default" | "custom" | "hidden";

export interface LandingStatTargets {
  relief_count: number;
  review_percent: number;
  techniques_count: number;
  /** 品牌實績第三卡「調理手法」自訂顯示文案（可含換行） */
  techniques_display: string;
}

/** 顧客好評：單則評價卡片 */
export interface LandingTestimonial {
  name: string;
  content: string;
  rating: number;
}

/** 店面資訊：地址、電話、營業時間、Google Maps 嵌入 */
export interface LandingStoreInfo {
  address: string;
  phone: string;
  business_hours: string;
  google_maps_url: string;
  google_maps_embed_url: string;
}

export const STORE_INFO_DEFAULTS: LandingStoreInfo = {
  address: "",
  phone: "",
  business_hours: "",
  google_maps_url: "",
  google_maps_embed_url: "",
};

export const TESTIMONIALS_DEFAULTS: LandingTestimonial[] = [];

/** 工作室／雙據點區：套版文字（多租戶可全留白或自訂） */
export interface StudiosShell {
  /** 區塊上方小字 */
  section_eyebrow: string;
  /** 區塊主標 */
  section_title: string;
  /** 第一張卡片左上角徽章 */
  primary_badge: string;
  /** 第二張卡片左上角徽章 */
  secondary_badge: string;
  /** 第一張卡片底部按鈕（留白＝不顯示按鈕） */
  primary_cta_label: string;
  primary_cta_url: string;
  /** 第二張卡片底部按鈕 */
  secondary_cta_label: string;
  secondary_cta_url: string;
  /** 師傅介紹標題下方一行小字 */
  therapist_card_eyebrow: string;
}

export const STUDIOS_SHELL_DEFAULTS: StudiosShell = {
  section_eyebrow: "另有服務",
  section_title: "雙工作室 · 同一雙手",
  primary_badge: "安平 72",
  secondary_badge: "預約制 · 私密空間",
  primary_cta_label: "",
  primary_cta_url: "/booking",
  secondary_cta_label: "詢問柔手工作室預約",
  secondary_cta_url: "/booking",
  therapist_card_eyebrow: "不老松足湯安平店 · 專業調理",
};

function pickShellString(
  raw: Record<string, unknown>,
  key: keyof StudiosShell,
  fallback: string,
): string {
  const v = raw[key];
  return typeof v === "string" ? v : fallback;
}

export function parseStudiosShellJson(raw: Json | undefined): StudiosShell {
  const d = STUDIOS_SHELL_DEFAULTS;
  if (!isRecord(raw)) return { ...d };
  return {
    section_eyebrow: pickShellString(raw, "section_eyebrow", d.section_eyebrow),
    section_title: pickShellString(raw, "section_title", d.section_title),
    primary_badge: pickShellString(raw, "primary_badge", d.primary_badge),
    secondary_badge: pickShellString(raw, "secondary_badge", d.secondary_badge),
    primary_cta_label: pickShellString(raw, "primary_cta_label", d.primary_cta_label),
    primary_cta_url: pickShellString(raw, "primary_cta_url", d.primary_cta_url),
    secondary_cta_label: pickShellString(raw, "secondary_cta_label", d.secondary_cta_label),
    secondary_cta_url: pickShellString(raw, "secondary_cta_url", d.secondary_cta_url),
    therapist_card_eyebrow: pickShellString(
      raw,
      "therapist_card_eyebrow",
      d.therapist_card_eyebrow,
    ),
  };
}

export function hasMeaningfulText(s: string | undefined | null): boolean {
  return typeof s === "string" && s.trim() !== "";
}

/** 前台與 CMS 共用的完整 Landing 設定（已合併預設值） */
export interface LandingContent extends LandingStatTargets {
  store_id: string;
  hero_title: string;
  hero_subtitle: string;
  /** 主視覺主按鈕文案（Landing v2） */
  hero_cta_label: string;
  hero_hours_badge_short: string;
  hero_late_night_note: string;
  hero_starting_price_label: string;
  business_hours_display: string;
  roushou_intro: string;
  services: LandingServiceItem[];
  anping_section_title: string;
  anping_section_body: string;
  roushou_section_title: string;
  roushou_section_body: string;
  therapist_section_title: string;
  therapist_section_body: string;
  therapist_tags_line: string;
  therapist_highlights: string[];
  boxing_section_title: string;
  boxing_section_body: string;
  boxing_cta_label: string;
  boxing_cta_url: string;
  footer_cta_title: string;
  footer_cta_body: string;
  brand_stats_title: string;
  brand_stats_subtitle: string;
  /** Landing v2 調理師頭像（空白則用版型預設示意圖） */
  therapist_portrait_url: string;
  closing_gallery_mode: ClosingGalleryMode;
  /** 自訂環境圖 1（僅 closing_gallery_mode === custom 時使用） */
  closing_image_url_1: string;
  closing_image_url_2: string;
  is_roushou_visible: boolean;
  studios_shell: StudiosShell;
  testimonials: LandingTestimonial[];
  store_info: LandingStoreInfo;
  price_disclaimer: string;
}

export const LANDING_DEFAULTS: Omit<LandingContent, "store_id"> = {
  hero_title: "放鬆由此開始",
  hero_subtitle:
    "專業調理身心的場所。腳底按摩、全身指壓、筋膜刀療程，從下午兩點一路到凌晨兩點，隨時等你來放鬆。",
  hero_cta_label: "開啟舒壓儀式",
  hero_hours_badge_short: "14–02",
  hero_late_night_note: "深夜也能到館",
  hero_starting_price_label: "NT$800 起",
  business_hours_display: "14:00 — 02:00",
  roushou_intro:
    "除了不老松門市，師傅另有私人居家工作室「柔手傳統整復推拿」，提供更私密、更個人化的傳統整復服務。",
  relief_count: 1280,
  review_percent: 99,
  techniques_count: 72,
  techniques_display: "72 種",
  services: [
    {
      name: "腳底按摩",
      tagline: "傳統穴道手法",
      description: "傳統腳底穴道按摩，促進血液循環，舒緩疲勞。讓雙腳重獲輕盈，從足底開始放鬆全身。",
      featured: false,
      tag: "熱門",
      tag_color: "amber",
      tiers: [
        { label: "40 分鐘", price: "NT$800" },
        { label: "60 分鐘", price: "NT$1,200" },
        { label: "80 分鐘", price: "NT$1,600" },
      ],
    },
    {
      name: "全身指壓",
      tagline: "深層肌肉放鬆",
      description: "針對全身經絡穴位，深層放鬆肌肉緊繃。結合傳統手法與現代理療，徹底釋放壓力。",
      featured: false,
      tag: "推薦",
      tag_color: "emerald",
      tiers: [
        { label: "60 分鐘", price: "NT$1,100" },
        { label: "90 分鐘", price: "NT$1,650" },
        { label: "120 分鐘", price: "NT$2,200" },
      ],
    },
    {
      name: "筋膜刀療程",
      tagline: "專業筋膜調理",
      description: "運用專業筋膜刀具，鬆解沾黏組織，改善痠痛。適合長期肩頸不適或運動後修復。",
      featured: true,
      tag: "專業",
      tag_color: "blue",
      tiers: [
        { label: "腳底 40 分鐘", price: "NT$1,200" },
        { label: "腳底 60 分鐘", price: "NT$1,750" },
        { label: "身體 60 分鐘", price: "NT$1,800" },
        { label: "身體 90 分鐘", price: "NT$2,600" },
        { label: "身體 120 分鐘", price: "NT$3,400" },
      ],
    },
    {
      name: "深層雙拼",
      tagline: "筋膜刀 + 全身指壓",
      description: "筋膜刀身體 60 分鐘搭配全身指壓 60 分鐘，雙重深層調理。",
      featured: true,
      tag: "招牌",
      tag_color: "rose",
      tiers: [
        { label: "120 分鐘", price: "NT$2,900" },
      ],
    },
    {
      name: "精選套餐",
      tagline: "多療程組合",
      description: "精心搭配的複合式療程，一次體驗多種手法。",
      featured: false,
      tag: "超值",
      tag_color: "purple",
      tiers: [
        { label: "延禧｜腳底精油 60 分 + 肩頸 10 分", price: "NT$1,549" },
        { label: "如懿｜腳底精油 80 分 + 肩頸 10 分", price: "NT$1,949" },
        { label: "甄環｜指壓 60 分 + 腳底 60 分 + 肩頸 10 分", price: "NT$2,349" },
        { label: "乾隆｜全身精油 60 分 + 腳底精油 40 分 + 肩頸 10 分", price: "NT$2,699" },
      ],
    },
  ],
  anping_section_title: "不老松安平店",
  anping_section_body: "台南安平在地深耕，每一次療程皆由師傅親自操作。",
  roushou_section_title: "柔手傳統整復推拿",
  roushou_section_body: "居家工作室、完全預約制，一對一傳統整復推拿。",
  therapist_section_title: "張嘉豪師傅",
  therapist_section_body:
    "扎根台南安平的按摩調理師，結合傳統手法與現代療程。品質一致。",
  therapist_tags_line: "腳底按摩 · 全身指壓 · 筋膜刀 · 傳統整復",
  therapist_highlights: ["師傅親自操作", "深夜不打烊", "線上即時預約", "台南安平在地"],
  boxing_section_title: "師傅的另一面",
  boxing_section_body:
    "平日是按摩師，場下是拳擊人。在台南安平提供拳擊相關課程，歡迎洽詢。",
  boxing_cta_label: "了解拳擊課程",
  boxing_cta_url: "/booking",
  footer_cta_title: "今天，讓自己好好休息一下",
  footer_cta_body: "線上預約 24 小時開放，選一個方便的時段。",
  brand_stats_title: "神之手 · 專業實績",
  brand_stats_subtitle: "用數據見證每一次的極致放鬆",
  therapist_portrait_url: "",
  closing_gallery_mode: "default",
  closing_image_url_1: "",
  closing_image_url_2: "",
  is_roushou_visible: true,
  studios_shell: { ...STUDIOS_SHELL_DEFAULTS },
  testimonials: [...TESTIMONIALS_DEFAULTS],
  store_info: { ...STORE_INFO_DEFAULTS },
  price_disclaimer: "實際價格以現場為準",
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** 後台 stats JSON 可能為數字或字串（避免前導 0 字串無法正確顯示） */
function coerceStatInt(v: unknown, fallback: number): number {
  if (typeof v === "number" && Number.isFinite(v)) return Math.trunc(v);
  if (typeof v === "string") {
    const trimmed = v.trim();
    if (trimmed === "") return fallback;
    const n = Number.parseInt(trimmed, 10);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

/**
 * Supabase / PostgREST 有時回傳字串 "true"/"false"，或舊庫欄位為 NULL；
 * 僅用 typeof === "boolean" 會誤判成預設 true，導致柔手 VIP 開關失效。
 */
export function coerceRoushouVisible(v: unknown, fallback: boolean): boolean {
  if (typeof v === "boolean") return v;
  if (v === null || v === undefined) return fallback;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    if (s === "true" || s === "1" || s === "yes" || s === "t") return true;
    if (s === "false" || s === "0" || s === "no" || s === "f") return false;
    return fallback;
  }
  if (typeof v === "number" && Number.isFinite(v)) return v !== 0;
  return fallback;
}

export function parseStatsJson(raw: Json | undefined): Pick<
  LandingContent,
  "relief_count" | "review_percent" | "techniques_count" | "techniques_display"
> {
  const d = LANDING_DEFAULTS;
  if (!isRecord(raw)) {
    return {
      relief_count: d.relief_count,
      review_percent: d.review_percent,
      techniques_count: d.techniques_count,
      techniques_display: d.techniques_display,
    };
  }
  const techniques_count = coerceStatInt(raw.techniques_count, d.techniques_count);
  const fromString =
    typeof raw.techniques_display === "string" ? raw.techniques_display.trim() : "";
  const techniques_display =
    fromString !== "" ? fromString : `${techniques_count} 種`;
  return {
    relief_count: coerceStatInt(raw.relief_count, d.relief_count),
    review_percent: coerceStatInt(raw.review_percent, d.review_percent),
    techniques_count,
    techniques_display,
  };
}

export function parseServicesJson(raw: Json | undefined): LandingServiceItem[] {
  if (!Array.isArray(raw)) return LANDING_DEFAULTS.services;
  const out: LandingServiceItem[] = [];
  for (const item of raw) {
    if (!isRecord(item)) continue;
    const name = typeof item.name === "string" ? item.name : "";
    const description = typeof item.description === "string" ? item.description : "";
    if (!name || !description) continue;
    const tiersRaw = Array.isArray(item.tiers) ? item.tiers : [];
    const tiers: LandingServiceTier[] = [];
    for (const t of tiersRaw) {
      if (!isRecord(t)) continue;
      const label = typeof t.label === "string" ? t.label : "";
      const price = typeof t.price === "string" ? t.price : "";
      if (label && price) tiers.push({ label, price });
    }
    const imageUrlRaw = typeof item.image_url === "string" ? item.image_url.trim() : "";
    const tagRaw = typeof item.tag === "string" ? item.tag.trim() : "";
    const tagColorRaw = typeof item.tag_color === "string" ? item.tag_color.trim() : "";
    const validColors: ServiceTagColor[] = ["amber", "emerald", "blue", "rose", "purple"];
    out.push({
      name,
      tagline: typeof item.tagline === "string" ? item.tagline : undefined,
      description,
      featured: item.featured === true,
      starting_price_label:
        typeof item.starting_price_label === "string"
          ? item.starting_price_label
          : undefined,
      image_url: imageUrlRaw !== "" ? imageUrlRaw : undefined,
      tag: tagRaw || undefined,
      tag_color: validColors.includes(tagColorRaw as ServiceTagColor) ? (tagColorRaw as ServiceTagColor) : undefined,
      tiers,
    });
  }
  return out.length > 0 ? out : LANDING_DEFAULTS.services;
}

export function parseTestimonialsJson(raw: Json | undefined): LandingTestimonial[] {
  if (!Array.isArray(raw)) return [...TESTIMONIALS_DEFAULTS];
  const out: LandingTestimonial[] = [];
  for (const item of raw) {
    if (!isRecord(item)) continue;
    const name = typeof item.name === "string" ? item.name.trim() : "";
    const content = typeof item.content === "string" ? item.content.trim() : "";
    if (!name || !content) continue;
    const rating = typeof item.rating === "number" ? Math.min(5, Math.max(1, Math.round(item.rating))) : 5;
    out.push({ name, content, rating });
  }
  return out;
}

export function parseStoreInfoJson(raw: Json | undefined): LandingStoreInfo {
  const d = STORE_INFO_DEFAULTS;
  if (!isRecord(raw)) return { ...d };
  return {
    address: typeof raw.address === "string" ? raw.address : d.address,
    phone: typeof raw.phone === "string" ? raw.phone : d.phone,
    business_hours: typeof raw.business_hours === "string" ? raw.business_hours : d.business_hours,
    google_maps_url: typeof raw.google_maps_url === "string" ? raw.google_maps_url : d.google_maps_url,
    google_maps_embed_url: typeof raw.google_maps_embed_url === "string" ? raw.google_maps_embed_url : d.google_maps_embed_url,
  };
}

export function parseHighlightsJson(raw: Json | undefined): string[] {
  if (!Array.isArray(raw)) return [...LANDING_DEFAULTS.therapist_highlights];
  return raw.filter((x): x is string => typeof x === "string" && x.trim() !== "");
}

/**
 * 補齊 studios_shell、services、therapist_highlights，避免舊資料／快取缺欄導致 CMS 讀 undefined 白屏。
 */
function coerceClosingGalleryMode(v: unknown, fallback: ClosingGalleryMode): ClosingGalleryMode {
  if (v === "custom" || v === "hidden" || v === "default") return v;
  return fallback;
}

export function normalizeLandingContent(c: LandingContent): LandingContent {
  const d = LANDING_DEFAULTS;
  return {
    ...c,
    closing_gallery_mode: coerceClosingGalleryMode(c.closing_gallery_mode, d.closing_gallery_mode),
    therapist_portrait_url:
      typeof c.therapist_portrait_url === "string" ? c.therapist_portrait_url : d.therapist_portrait_url,
    closing_image_url_1:
      typeof c.closing_image_url_1 === "string" ? c.closing_image_url_1 : d.closing_image_url_1,
    closing_image_url_2:
      typeof c.closing_image_url_2 === "string" ? c.closing_image_url_2 : d.closing_image_url_2,
    studios_shell: parseStudiosShellJson(c.studios_shell as unknown as Json),
    services: Array.isArray(c.services) ? c.services : [...LANDING_DEFAULTS.services],
    therapist_highlights: Array.isArray(c.therapist_highlights)
      ? c.therapist_highlights
      : [...LANDING_DEFAULTS.therapist_highlights],
    testimonials: Array.isArray(c.testimonials) ? c.testimonials : [...TESTIMONIALS_DEFAULTS],
    store_info: isRecord(c.store_info) ? parseStoreInfoJson(c.store_info as unknown as Json) : { ...STORE_INFO_DEFAULTS },
    price_disclaimer: typeof c.price_disclaimer === "string" ? c.price_disclaimer : LANDING_DEFAULTS.price_disclaimer,
  };
}

/**
 * 精簡版 DB 可把多欄字串存在 `stats` JSON（與 relief_count 等同層）。
 * 優先讀 stats，再讀頂層欄位，避免舊庫頂層殘值蓋過新寫入的 stats。
 */
function pickEmbeddedString(
  row: Record<string, unknown>,
  statsRecord: Record<string, unknown>,
  columnKey: keyof LandingContent,
  statsKey: string,
  fallback: string,
): string {
  const nested = statsRecord[statsKey];
  if (typeof nested === "string" && nested.trim() !== "") return nested;
  const top = row[columnKey as string];
  if (typeof top === "string" && top.trim() !== "") return top;
  return fallback;
}

/** 師傅重點列表：優先 stats 內嵌陣列，再讀頂層 therapist_highlights（不可呼叫 parseHighlightsJson(undefined)，否則會誤用預設值）。 */
function mergeTherapistHighlights(
  row: Record<string, unknown>,
  statsRecord: Record<string, unknown>,
  defaults: string[],
): string[] {
  const filterLines = (raw: unknown): string[] =>
    Array.isArray(raw)
      ? raw.filter((x): x is string => typeof x === "string" && x.trim() !== "")
      : [];

  if (Object.prototype.hasOwnProperty.call(statsRecord, "therapist_highlights")) {
    const fromStats = filterLines(statsRecord.therapist_highlights);
    if (fromStats.length > 0) return fromStats;
  }
  const fromColumn = filterLines(row.therapist_highlights);
  if (fromColumn.length > 0) return fromColumn;
  return [...defaults];
}

export function mergeLandingContent(
  storeId: string,
  row: Record<string, unknown> | null,
): LandingContent {
  const d = LANDING_DEFAULTS;
  if (!row) {
    return normalizeLandingContent({ store_id: storeId, ...d });
  }
  const statsRecord = isRecord(row.stats) ? (row.stats as Record<string, unknown>) : {};
  const stats = parseStatsJson(row.stats as Json);
  const services = parseServicesJson(row.services as Json);
  const highlights = mergeTherapistHighlights(row, statsRecord, d.therapist_highlights);
  const studios_shell = parseStudiosShellJson(row.studios_shell as Json);
  return normalizeLandingContent({
    store_id: storeId,
    hero_title: (row.hero_title as string) || d.hero_title,
    hero_subtitle: (row.hero_subtitle as string) || d.hero_subtitle,
    hero_cta_label: pickEmbeddedString(
      row,
      statsRecord,
      "hero_cta_label",
      "hero_cta_label",
      d.hero_cta_label,
    ),
    hero_hours_badge_short: pickEmbeddedString(
      row,
      statsRecord,
      "hero_hours_badge_short",
      "hero_hours_badge_short",
      d.hero_hours_badge_short,
    ),
    hero_late_night_note: pickEmbeddedString(
      row,
      statsRecord,
      "hero_late_night_note",
      "hero_late_night_note",
      d.hero_late_night_note,
    ),
    hero_starting_price_label: pickEmbeddedString(
      row,
      statsRecord,
      "hero_starting_price_label",
      "hero_starting_price_label",
      d.hero_starting_price_label,
    ),
    business_hours_display: pickEmbeddedString(
      row,
      statsRecord,
      "business_hours_display",
      "business_hours_display",
      d.business_hours_display,
    ),
    roushou_intro: (row.roushou_intro as string) || d.roushou_intro,
    ...stats,
    services: services.length > 0 ? services : d.services,
    anping_section_title: (row.anping_section_title as string) || d.anping_section_title,
    anping_section_body: (row.anping_section_body as string) || d.anping_section_body,
    roushou_section_title:
      (row.roushou_section_title as string) || d.roushou_section_title,
    roushou_section_body:
      (row.roushou_section_body as string) || d.roushou_section_body,
    therapist_section_title: pickEmbeddedString(
      row,
      statsRecord,
      "therapist_section_title",
      "therapist_section_title",
      d.therapist_section_title,
    ),
    therapist_section_body: pickEmbeddedString(
      row,
      statsRecord,
      "therapist_section_body",
      "therapist_section_body",
      d.therapist_section_body,
    ),
    therapist_tags_line: pickEmbeddedString(
      row,
      statsRecord,
      "therapist_tags_line",
      "therapist_tags_line",
      d.therapist_tags_line,
    ),
    therapist_highlights: highlights,
    boxing_section_title: (row.boxing_section_title as string) || d.boxing_section_title,
    boxing_section_body: (row.boxing_section_body as string) || d.boxing_section_body,
    boxing_cta_label: (row.boxing_cta_label as string) || d.boxing_cta_label,
    boxing_cta_url: (row.boxing_cta_url as string) || d.boxing_cta_url,
    footer_cta_title: pickEmbeddedString(
      row,
      statsRecord,
      "footer_cta_title",
      "footer_cta_title",
      d.footer_cta_title,
    ),
    footer_cta_body: pickEmbeddedString(
      row,
      statsRecord,
      "footer_cta_body",
      "footer_cta_body",
      d.footer_cta_body,
    ),
    brand_stats_title: pickEmbeddedString(
      row,
      statsRecord,
      "brand_stats_title",
      "brand_stats_title",
      d.brand_stats_title,
    ),
    brand_stats_subtitle: pickEmbeddedString(
      row,
      statsRecord,
      "brand_stats_subtitle",
      "brand_stats_subtitle",
      d.brand_stats_subtitle,
    ),
    therapist_portrait_url: pickEmbeddedString(
      row,
      statsRecord,
      "therapist_portrait_url",
      "therapist_portrait_url",
      d.therapist_portrait_url,
    ),
    closing_gallery_mode: coerceClosingGalleryMode(
      statsRecord.closing_gallery_mode ?? row.closing_gallery_mode,
      d.closing_gallery_mode,
    ),
    closing_image_url_1: pickEmbeddedString(
      row,
      statsRecord,
      "closing_image_url_1",
      "closing_image_url_1",
      d.closing_image_url_1,
    ),
    closing_image_url_2: pickEmbeddedString(
      row,
      statsRecord,
      "closing_image_url_2",
      "closing_image_url_2",
      d.closing_image_url_2,
    ),
    is_roushou_visible: coerceRoushouVisible(row.is_roushou_visible, d.is_roushou_visible),
    studios_shell,
    testimonials: parseTestimonialsJson((statsRecord.testimonials ?? row.testimonials) as Json),
    store_info: parseStoreInfoJson((statsRecord.store_info ?? row.store_info) as Json),
    price_disclaimer: pickEmbeddedString(row, statsRecord, "price_disclaimer", "price_disclaimer", d.price_disclaimer),
  });
}
