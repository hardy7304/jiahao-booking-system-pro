import { Link } from "react-router-dom";
import { useStore } from "@/contexts/StoreContext";
import { useShopInfo } from "@/hooks/useShopInfo";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import DynamicLobsterDashboard from "@/components/DynamicLobsterDashboard";

/**
 * 首頁 — 禪意／極簡 SaaS 著陸：留白、低飽和、專業信任感
 */
const LandingPage = () => {
  const { currentStore } = useStore();
  const { info: config } = useShopInfo();

  const mainTitle = currentStore?.name ?? "線上預約";
  const subtitle = config.frontend_subtitle || "線上預約系統";
  const businessHours = config.business_hours || "尚未設定營業時間";

  return (
    <div className="min-h-screen flex flex-col bg-[#f7f6f3] text-stone-800 antialiased">
      {/* 極淡紙質感底紋 */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.35]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E")`,
        }}
        aria-hidden
      />

      <header className="relative z-10 border-b border-stone-200/80 bg-[#f7f6f3]/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-5">
          <span className="text-xs font-medium tracking-[0.25em] text-stone-400">預約</span>
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="text-stone-500 hover:bg-stone-200/50 hover:text-stone-800"
          >
            <Link to="/booking">前往預約</Link>
          </Button>
        </div>
      </header>

      <main className="relative z-10 flex flex-1 flex-col">
        <motion.section
          className="flex flex-1 flex-col items-center justify-center px-6 py-20 md:py-28"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="mx-auto max-w-lg text-center">
            <p className="mb-8 text-[11px] font-medium uppercase tracking-[0.35em] text-stone-400">
              靜心 · 簡約 · 可靠
            </p>

            <div className="mx-auto mb-10 h-px w-12 bg-stone-300" aria-hidden />

            <h1 className="text-[2rem] font-light leading-snug tracking-tight text-stone-900 md:text-4xl md:leading-tight">
              {mainTitle}
            </h1>

            <p className="mx-auto mt-8 max-w-md text-base font-normal leading-relaxed text-stone-500 md:text-lg">
              {subtitle}
            </p>

            <p className="mt-10 text-sm text-stone-400">{businessHours}</p>

            <div className="mt-14">
              <Button
                asChild
                size="lg"
                className="rounded-none border border-stone-800 bg-stone-900 px-10 text-sm font-normal tracking-wide text-[#f7f6f3] shadow-none transition-colors hover:bg-stone-800"
              >
                <Link to="/booking">立即預約</Link>
              </Button>
            </div>
          </div>
        </motion.section>

        <div className="border-t border-stone-200/90" />

        <DynamicLobsterDashboard />
      </main>

      <footer className="relative z-10 border-t border-stone-200/80 py-8 text-center">
        <p className="text-xs text-stone-400">© {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
};

export default LandingPage;
