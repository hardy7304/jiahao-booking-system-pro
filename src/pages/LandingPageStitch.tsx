import { Helmet } from "react-helmet-async";
import { useLocation } from "react-router-dom";
import { useStore, type StoreInfo } from "@/contexts/StoreContext";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { DEFAULT_OG_IMAGE, SITE_ORIGIN, useSEO } from "@/hooks/useSEO";
import { ObsidianSanctuaryLanding } from "@/components/landing-v2/ObsidianSanctuaryLanding";
import { Skeleton } from "@/components/ui/skeleton";

const ROOT_TITLE = "台南按摩推拿線上預約系統 | 多店家即時預約";
const ROOT_DESCRIPTION =
  "台南專業按摩推拿服務線上預約平台，多店家選擇，即時確認，方便快速。";

function buildStoreJsonLd(store: StoreInfo, slugSegment: string): Record<string, unknown> {
  const pathSlug = (store.slug || slugSegment).trim();
  const url = `${SITE_ORIGIN}/s/${encodeURIComponent(pathSlug)}`;
  const base: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "MassageTherapist",
    name: store.name,
    url,
    openingHours: "Mo-Su 09:00-21:00",
    priceRange: "$$",
    servesCuisine: "按摩推拿整復",
  };
  const phone = store.phone?.trim();
  if (phone) base.telephone = phone;
  const img = store.og_image?.trim();
  if (img) base.image = img;
  const street = store.address?.trim();
  if (street) {
    base.address = {
      "@type": "PostalAddress",
      streetAddress: street,
      addressLocality: "台南市",
      addressCountry: "TW",
    };
  }
  return base;
}

/**
 * Stitch「Obsidian Sanctuary」版型預覽（/landing-v2）
 * - 正式首頁仍為 `/` → LandingPage
 * - 內容接 store_settings（與正式 Landing 同源），版型來自 Stitch 匯出並工程化
 */
export default function LandingPageStitch() {
  const location = useLocation();
  const { currentStore, urlSlugSegment } = useStore();
  const { content, loading } = useStoreSettings();
  const seo = useSEO(currentStore);

  const brandName = currentStore?.name?.trim() || "線上預約";

  const pathOnly = location.pathname.split("?")[0] ?? "";
  const isRoot = pathOnly === "/" || pathOnly === "";
  const isSlugLanding =
    !!urlSlugSegment && /^\/s\/[^/]+\/?$/.test(pathOnly);

  const storePageUrl =
    isSlugLanding && currentStore
      ? `${SITE_ORIGIN}/s/${encodeURIComponent((currentStore.slug || urlSlugSegment).trim())}`
      : "";

  const rootHelmet = isRoot ? (
    <Helmet>
      <title>{ROOT_TITLE}</title>
      <meta name="description" content={ROOT_DESCRIPTION} />
      <meta property="og:title" content={ROOT_TITLE} />
      <meta property="og:description" content={ROOT_DESCRIPTION} />
      <meta property="og:url" content={`${SITE_ORIGIN}/`} />
      <meta property="og:type" content="website" />
      <meta property="og:image" content={DEFAULT_OG_IMAGE} />
      <link rel="canonical" href={`${SITE_ORIGIN}/`} />
    </Helmet>
  ) : null;

  const storeHelmet =
    !isRoot && isSlugLanding && currentStore && urlSlugSegment ? (
      <Helmet>
        <title>{seo.title}</title>
        <meta name="description" content={seo.description} />
        <meta name="keywords" content={seo.keywords} />
        <meta property="og:title" content={seo.title} />
        <meta property="og:description" content={seo.description} />
        <meta property="og:image" content={seo.ogImage} />
        <meta property="og:url" content={storePageUrl} />
        <meta property="og:type" content="website" />
        <link rel="canonical" href={storePageUrl} />
        <script type="application/ld+json">
          {JSON.stringify(buildStoreJsonLd(currentStore, urlSlugSegment))}
        </script>
      </Helmet>
    ) : null;

  if (loading) {
    return (
      <>
        {rootHelmet}
        {storeHelmet}
        <div className="min-h-screen bg-[#0c0a10] text-stone-100">
          <div className="mx-auto max-w-4xl space-y-6 px-6 py-24">
            <Skeleton className="mx-auto h-8 w-48 bg-white/10" />
            <Skeleton className="mx-auto h-14 w-full max-w-lg bg-white/10" />
            <Skeleton className="mx-auto h-24 w-full max-w-2xl bg-white/10" />
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {rootHelmet}
      {storeHelmet}
      <ObsidianSanctuaryLanding brandName={brandName} content={content} />
    </>
  );
}
