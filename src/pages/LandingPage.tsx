import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { useStore } from "@/contexts/StoreContext";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import BrandStatsSection from "@/components/BrandStatsSection";
import { LandingHero } from "@/components/landing/LandingHero";
import { LandingServicesSection } from "@/components/landing/LandingServicesSection";
import { LandingTherapistSection } from "@/components/landing/LandingTherapistSection";
import { LandingFooterCta } from "@/components/landing/LandingFooterCta";
import { Reveal } from "@/components/landing/Reveal";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * 首頁 — 深色質感 Landing，內容由 store_settings（CMS）驅動
 */
function PageAmbientOrbs() {
  const reduceMotion = useReducedMotion();
  if (reduceMotion) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
      <motion.div
        className="absolute -left-[20%] top-[40%] h-[min(80vw,520px)] w-[min(80vw,520px)] rounded-full bg-amber-600/[0.05] blur-[120px]"
        animate={{ x: [0, 40, 0], y: [0, -30, 0] }}
        transition={{ duration: 28, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -right-[15%] bottom-[10%] h-[min(70vw,420px)] w-[min(70vw,420px)] rounded-full bg-amber-400/[0.045] blur-[100px]"
        animate={{ x: [0, -35, 0], y: [0, 25, 0] }}
        transition={{ duration: 24, repeat: Infinity, ease: "easeInOut", delay: 2 }}
      />
    </div>
  );
}

const LandingPage = () => {
  const { currentStore } = useStore();
  const { content, loading } = useStoreSettings();

  const navLabel = currentStore?.name ?? "線上預約";

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

  return (
    <div className="relative min-h-screen flex flex-col bg-[#0c0a10] text-stone-100 antialiased">
      <PageAmbientOrbs />
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.4]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.05'/%3E%3C/svg%3E")`,
        }}
        aria-hidden
      />

      <main className="relative z-[1] flex flex-1 flex-col">
        <LandingHero content={content} navLabel={navLabel} />
        <LandingServicesSection services={content.services} />

        <BrandStatsSection
          title={content.brand_stats_title}
          subtitle={content.brand_stats_subtitle}
          reliefCount={content.relief_count}
          reviewPercent={content.review_percent}
          techniquesDisplay={content.techniques_display}
        />

        <LandingTherapistSection content={content} />
        <LandingFooterCta content={content} />
      </main>

      <footer className="relative z-[1] border-t border-white/[0.06] bg-[#08070b] py-10">
        <div className="mx-auto max-w-6xl px-6">
          <Reveal>
            <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
              <p className="text-xs text-stone-500">© {new Date().getFullYear()} {navLabel} · 舊版首頁</p>
              <div className="flex items-center gap-4">
                <Link
                  to="/"
                  className="text-xs font-medium tracking-wide text-amber-200/80 hover:text-amber-100"
                >
                  新版首頁 →
                </Link>
                <Link
                  to="/booking"
                  className="text-xs font-medium tracking-wide text-amber-200/80 hover:text-amber-100"
                >
                  前往預約 →
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
