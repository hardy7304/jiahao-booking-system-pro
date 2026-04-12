import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Reveal } from "./Reveal";
import { MagneticGlowButton } from "./MagneticGlowButton";
import type { LandingServiceItem } from "@/lib/landingContent";

const sectionHeaderVariants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
  },
};

export function LandingServicesSection({ services }: { services: LandingServiceItem[] }) {
  const reduceMotion = useReducedMotion();

  if (services.length === 0) return null;

  return (
    <section className="relative border-b border-white/[0.06] bg-[#0f0d14] py-20 md:py-28">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(251,191,36,0.08),transparent)]"
        aria-hidden
      />
      <div className="relative mx-auto max-w-6xl px-6">
        <motion.div
          className="text-center"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.35 }}
          variants={sectionHeaderVariants}
        >
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-stone-500">服務項目</p>
          <h2 className="mt-4 text-2xl font-semibold text-stone-100 md:text-3xl">
            選一個適合你的療程
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm text-stone-400">
            每種療程皆由師傅親自操作，用手感取代機器，讓身體真正放鬆。
          </p>
        </motion.div>

        <div className="mt-14 grid gap-6 md:grid-cols-2">
          {services.map((svc, i) => (
            <motion.article
              key={`${svc.name}-${i}`}
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{
                duration: 0.55,
                delay: i * 0.07,
                ease: [0.22, 1, 0.36, 1],
              }}
              whileHover={
                reduceMotion
                  ? undefined
                  : {
                      scale: 1.02,
                      y: -6,
                      transition: { type: "spring", stiffness: 400, damping: 22 },
                    }
              }
              className={`group relative flex h-full flex-col overflow-hidden rounded-2xl border p-6 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.5)] backdrop-blur-xl md:p-8 ${
                svc.featured
                  ? "border-amber-400/35 bg-gradient-to-br from-amber-500/[0.12] via-white/[0.04] to-transparent shadow-[0_0_48px_-12px_rgba(251,191,36,0.35)]"
                  : "border-white/[0.12] bg-white/[0.04]"
              }`}
            >
              <div
                className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                style={{
                  background:
                    "linear-gradient(125deg, transparent 40%, rgba(255,255,255,0.07) 50%, transparent 60%)",
                }}
                aria-hidden
              />
              <div className="relative flex flex-wrap items-baseline gap-2">
                {svc.tagline ? (
                  <span className="text-xs font-medium uppercase tracking-wider text-stone-500">
                    {svc.tagline}
                  </span>
                ) : null}
                {svc.featured ? (
                  <span className="rounded bg-amber-500/25 px-2 py-0.5 text-[10px] font-semibold text-amber-100 ring-1 ring-amber-400/30">
                    招牌
                  </span>
                ) : null}
              </div>
              <h3 className="relative mt-2 text-xl font-semibold text-stone-50">{svc.name}</h3>
              <p className="relative mt-3 flex-1 text-sm leading-relaxed text-stone-400">
                {svc.description}
              </p>
              {svc.tiers.length > 0 ? (
                <ul className="relative mt-6 space-y-2 border-t border-white/[0.08] pt-6">
                  {svc.tiers.map((t) => (
                    <li
                      key={`${t.label}-${t.price}`}
                      className="flex items-center justify-between text-sm text-stone-300"
                    >
                      <span>{t.label}</span>
                      <span className="font-medium text-amber-200/95 tabular-nums">{t.price}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
              {svc.starting_price_label ? (
                <p className="relative mt-4 text-sm font-medium text-amber-200/85">
                  {svc.starting_price_label}
                </p>
              ) : null}
            </motion.article>
          ))}
        </div>

        <Reveal className="mt-12 flex justify-center" delay={0.12}>
          <MagneticGlowButton magneticStrength={0.12}>
            <Button
              asChild
              variant="outline"
              className="border-amber-500/30 bg-white/[0.03] text-stone-100 backdrop-blur-md hover:border-amber-400/50 hover:bg-amber-500/10"
            >
              <Link to="/booking">查看全部項目並立即預約</Link>
            </Button>
          </MagneticGlowButton>
        </Reveal>
      </div>
    </section>
  );
}
