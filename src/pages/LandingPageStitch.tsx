import { useStore } from "@/contexts/StoreContext";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { ObsidianSanctuaryLanding } from "@/components/landing-v2/ObsidianSanctuaryLanding";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Stitch「Obsidian Sanctuary」版型預覽（/landing-v2）
 * - 正式首頁仍為 `/` → LandingPage
 * - 內容接 store_settings（與正式 Landing 同源），版型來自 Stitch 匯出並工程化
 */
export default function LandingPageStitch() {
  const { currentStore } = useStore();
  const { content, loading } = useStoreSettings();

  const brandName = currentStore?.name?.trim() || "線上預約";

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0c0a10] text-stone-100">
        <div className="mx-auto max-w-4xl space-y-6 px-6 py-24">
          <Skeleton className="mx-auto h-8 w-48 bg-white/10" />
          <Skeleton className="mx-auto h-14 w-full max-w-lg bg-white/10" />
          <Skeleton className="mx-auto h-24 w-full max-w-2xl bg-white/10" />
        </div>
      </div>
    );
  }

  return <ObsidianSanctuaryLanding brandName={brandName} content={content} />;
}
