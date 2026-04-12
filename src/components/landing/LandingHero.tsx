import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import type { LandingContent } from "@/lib/landingContent";
import { MagneticGlowButton } from "./MagneticGlowButton";

const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.11, delayChildren: 0.06 },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] as const },
  },
};

function FloatingOrbs() {
  const reduceMotion = useReducedMotion();
  if (reduceMotion) {
    return (
      <>
        <div
          className="pointer-events-none absolute -right-20 top-0 h-[min(70vw,480px)] w-[min(70vw,480px)] rounded-full bg-amber-500/[0.12] blur-[120px]"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -left-24 bottom-0 h-[min(55vw,380px)] w-[min(55vw,380px)] rounded-full bg-amber-400/[0.08] blur-[100px]"
          aria-hidden
        />
      </>
    );
  }
  return (
    <>
      <motion.div
        className="pointer-events-none absolute -right-16 top-[8%] h-[min(65vw,440px)] w-[min(65vw,440px)] rounded-full bg-amber-500/[0.14] blur-[100px]"
        aria-hidden
        animate={{ x: [0, 28, -12, 0], y: [0, -22, 14, 0], scale: [1, 1.05, 0.98, 1] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="pointer-events-none absolute left-[-15%] top-[35%] h-[min(50vw,320px)] w-[min(50vw,320px)] rounded-full bg-amber-400/[0.1] blur-[90px]"
        aria-hidden
        animate={{ x: [0, -20, 16, 0], y: [0, 18, -10, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
      />
      <motion.div
        className="pointer-events-none absolute right-[10%] bottom-[5%] h-[min(45vw,280px)] w-[min(45vw,280px)] rounded-full bg-yellow-200/[0.07] blur-[80px]"
        aria-hidden
        animate={{ x: [0, -14, 22, 0], y: [0, 24, -8, 0], opacity: [0.5, 0.85, 0.55] }}
        transition={{ duration: 26, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
      />
    </>
  );
}

export function LandingHero({
  content,
  navLabel,
}: {
  content: LandingContent;
  navLabel: string;
}) {
  return (
    <section className="relative overflow-hidden border-b border-white/[0.06]">
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#0c0a10] via-[#12101a] to-[#0e0c12]"
        aria-hidden
      />
      <FloatingOrbs />

      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <motion.span
          className="text-xs font-medium tracking-[0.2em] text-stone-500"
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          {navLabel}
        </motion.span>
        <motion.div
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
        >
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="relative text-stone-400 hover:bg-white/5 hover:text-stone-100 motion-safe:shadow-[0_0_20px_-4px_rgba(251,191,36,0.35)] motion-safe:animate-pulse"
          >
            <Link to="/booking">立即預約</Link>
          </Button>
        </motion.div>
      </header>

      <motion.div
        className="relative z-10 mx-auto max-w-4xl px-6 pb-24 pt-10 md:pb-32 md:pt-14"
        variants={staggerContainer}
        initial="hidden"
        animate="show"
      >
        <motion.div
          className="flex flex-wrap items-center justify-center gap-3 md:gap-4"
          variants={fadeUp}
        >
          <span className="rounded-full border border-amber-500/25 bg-amber-500/10 px-4 py-1.5 text-xs font-medium tracking-wide text-amber-200/90 backdrop-blur-sm">
            {content.hero_hours_badge_short}
            <span className="mx-2 text-amber-500/40">·</span>
            每日營業
          </span>
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 text-xs text-stone-400 backdrop-blur-sm">
            {content.hero_late_night_note}
          </span>
          <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-1.5 text-xs font-medium text-emerald-200/90 backdrop-blur-sm">
            {content.hero_starting_price_label}
          </span>
        </motion.div>

        <motion.h1
          className="mt-10 text-center text-3xl font-semibold leading-tight tracking-tight text-stone-50 md:text-5xl md:leading-[1.15]"
          variants={fadeUp}
        >
          {content.hero_title}
        </motion.h1>
        <motion.p
          className="mx-auto mt-8 max-w-2xl text-center text-base leading-relaxed text-stone-400 md:text-lg"
          variants={fadeUp}
        >
          {content.hero_subtitle}
        </motion.p>

        <motion.div className="mt-12 flex justify-center" variants={fadeUp}>
          <MagneticGlowButton>
            <Button
              asChild
              size="lg"
              className="rounded-md border border-amber-400/30 bg-amber-500/95 px-10 text-stone-950 shadow-lg hover:bg-amber-400"
            >
              <Link to="/booking">立即線上預約</Link>
            </Button>
          </MagneticGlowButton>
        </motion.div>

        <motion.p
          className="mt-10 text-center text-sm text-stone-500"
          variants={fadeUp}
        >
          營業時間 <span className="text-stone-300">{content.business_hours_display}</span>
        </motion.p>
      </motion.div>
    </section>
  );
}
