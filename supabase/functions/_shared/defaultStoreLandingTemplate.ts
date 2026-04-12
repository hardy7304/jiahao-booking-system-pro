/**
 * 新店家預設 Landing（store_settings）— 供 api-admin initialize_store_settings 使用。
 * 佔位符：[店名]、[服務名稱]
 */

const PLACEHOLDER_STORE = "[店名]";
const PLACEHOLDER_SERVICE = "[服務名稱]";
const SERVICE_NAME_FALLBACK = "招牌療程";

function applyPlaceholders(text: string, storeName: string): string {
  return text
    .replaceAll(PLACEHOLDER_STORE, storeName)
    .replaceAll(PLACEHOLDER_SERVICE, SERVICE_NAME_FALLBACK);
}

/** 與前端 buildStoreSettingsUpsertPayload 的 stats 鍵一致 */
export function buildDefaultStoreSettingsInsertRow(
  storeId: string,
  storeName: string,
): Record<string, unknown> {
  const t = (s: string) => applyPlaceholders(s, storeName);

  const stats = {
    relief_count: 100,
    review_percent: 98,
    techniques_count: 12,
    techniques_display: "12 種",
    hero_hours_badge_short: "預約制",
    hero_late_night_note: "歡迎預約",
    hero_starting_price_label: "NT$800 起",
    business_hours_display: "請於後台設定營業時間",
    hero_cta_label: t("立即預約"),
    therapist_section_title: t("[店名] 主理師傅"),
    therapist_section_body: t("在 [店名] 為您把關每一次調理體驗，一對一預約服務。"),
    therapist_tags_line: "預約制 · 一對一 · 在地服務",
    therapist_highlights: [
      "師傅親自操作",
      "線上即時預約",
      "[店名] 安心體驗",
      "專業調理",
    ].map((line) => applyPlaceholders(line, storeName)),
    footer_cta_title: t("準備好在 [店名] 放鬆一下了嗎？"),
    footer_cta_body: "線上預約全天候開放，選一個方便的時段即可。",
    brand_stats_title: t("[店名] · 用心經營"),
    brand_stats_subtitle: "用每一次服務累積信任",
    therapist_portrait_url: "",
    closing_gallery_mode: "default",
    closing_image_url_1: "",
    closing_image_url_2: "",
  };

  const servicesRaw = [
    {
      name: "[店名] · 經典腳底療程",
      tagline: "舒緩久站久坐",
      description:
        "以專業手法放鬆雙足，促進循環。可依需求調整力道與時間。參考方案：[服務名稱]。",
      featured: true,
      starting_price_label: "NT$800 起",
      tiers: [
        { label: "60 分鐘", price: "NT$900" },
        { label: "90 分鐘", price: "NT$1,200" },
      ],
    },
    {
      name: "全身深層指壓",
      tagline: "釋放肩背壓力",
      description:
        "針對肩頸與背部深層放鬆，適合工作緊繃族群。可加選 [服務名稱] 加強方案。",
      featured: false,
      tiers: [{ label: "90 分鐘", price: "NT$1,400" }],
    },
    {
      name: "局部筋膜調理",
      tagline: "依部位客製",
      description: "依您的需求調整部位與力道，建議先與師傅溝通再預約。",
      featured: false,
      tiers: [{ label: "60 分鐘", price: "NT$1,000" }],
    },
  ];

  const services = servicesRaw.map((item) => ({
    ...item,
    name: applyPlaceholders(item.name, storeName),
    tagline: item.tagline ? applyPlaceholders(item.tagline, storeName) : undefined,
    description: applyPlaceholders(item.description, storeName),
    starting_price_label: item.starting_price_label
      ? applyPlaceholders(item.starting_price_label, storeName)
      : undefined,
  }));

  const studios_shell = {
    section_eyebrow: "服務據點",
    section_title: t("[店名] · 預約服務"),
    primary_badge: t("本店"),
    secondary_badge: "完全預約制",
    primary_cta_label: t("立即預約"),
    primary_cta_url: "/booking",
    secondary_cta_label: t("了解更多"),
    secondary_cta_url: "/booking",
    therapist_card_eyebrow: t("[店名] · 專業調理"),
  };

  return {
    store_id: storeId,
    hero_title: t("歡迎來到 [店名]"),
    hero_subtitle: t("[店名] 提供舒壓與調理服務，線上預約最方便。"),
    stats,
    services,
    anping_section_title: t("[店名]"),
    anping_section_body: t("在 [店名] 預約專業調理服務，每一次體驗都由我們用心安排。"),
    roushou_section_title: "加購／工作室（可自訂）",
    roushou_section_body: "此區塊文案可於後台 Landing CMS 編輯或關閉顯示。",
    roushou_intro: "可依店家需求於後台修改；若無第二據點可將相關區塊關閉。",
    boxing_section_title: "更多服務",
    boxing_section_body: "歡迎透過預約與我們聯繫，了解適合您的方案。",
    boxing_cta_label: t("前往預約"),
    boxing_cta_url: "/booking",
    is_roushou_visible: false,
    studios_shell,
  };
}
