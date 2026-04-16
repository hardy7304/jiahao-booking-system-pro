import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import type { LandingContent, LandingServiceItem, LandingTestimonial, LandingStoreInfo, ServiceTagColor } from "@/lib/landingContent";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/contexts/StoreContext";
import { Footprints, Hand, Sword, Clock, ArrowRight, Sparkles, Package, Layers, type LucideIcon } from "lucide-react";

const MotionLink = motion(Link);

/** 與主 Landing 一致的高質感緩動 */
const EASE_PREMIUM = [0.22, 1, 0.36, 1] as const;

const heroStagger: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.11, delayChildren: 0.1 },
  },
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 28 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.68, ease: EASE_PREMIUM },
  },
};

/** Stitch 預設服務圖（CMS 無圖時輪替使用） */
const FALLBACK_SERVICE_IMAGES = [
  "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&q=80&w=800",
  "https://images.unsplash.com/photo-1519823551278-64ac92734fb1?auto=format&fit=crop&q=80&w=800",
  "https://images.unsplash.com/photo-1600334129128-685c5582fd35?auto=format&fit=crop&q=80&w=800",
] as const;

const FALLBACK_ENV_IMAGES = [
  "https://images.unsplash.com/photo-1600334129128-685c5582fd35?auto=format&fit=crop&q=80&w=800",
  "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&q=80&w=800",
] as const;

const STITCH_FALLBACK_SERVICES = [
  {
    id: 1,
    name: "腳底按摩",
    duration: "40 分鐘起",
    price: "NT$800 起",
    description:
      "傳統腳底穴道按摩，促進血液循環，舒緩疲勞。",
    image: FALLBACK_SERVICE_IMAGES[0],
  },
  {
    id: 2,
    name: "全身指壓",
    duration: "60 分鐘起",
    price: "NT$1,100 起",
    description:
      "針對全身經絡穴位，深層放鬆肌肉緊繃。",
    image: FALLBACK_SERVICE_IMAGES[1],
  },
  {
    id: 3,
    name: "筋膜刀療程",
    duration: "40 分鐘起",
    price: "NT$1,200 起",
    description:
      "運用專業筋膜刀具，鬆解沾黏組織，改善痠痛。",
    image: FALLBACK_SERVICE_IMAGES[2],
  },
];

const TAG_COLOR_MAP: Record<ServiceTagColor, string> = {
  amber: "bg-amber-500/90",
  emerald: "bg-emerald-500/90",
  blue: "bg-blue-500/90",
  rose: "bg-rose-500/90",
  purple: "bg-purple-500/90",
};

const SERVICE_ICON_HINT: Record<string, LucideIcon> = {
  "腳底": Footprints,
  "足療": Footprints,
  "指壓": Hand,
  "全身": Hand,
  "筋膜": Sword,
  "雙拼": Layers,
  "套餐": Package,
};

function pickServiceIcon(name: string): LucideIcon {
  for (const [keyword, icon] of Object.entries(SERVICE_ICON_HINT)) {
    if (name.includes(keyword)) return icon;
  }
  return Sparkles;
}

export interface StitchServiceCardModel {
  id: number;
  name: string;
  duration: string;
  price: string;
  description: string;
  image: string;
  tag?: string;
  tagColor: string;
  Icon: LucideIcon;
}

function mapCmsServicesToStitch(services: LandingServiceItem[]): StitchServiceCardModel[] {
  if (!services.length) return STITCH_FALLBACK_SERVICES.map((s) => ({
    ...s,
    tag: undefined,
    tagColor: TAG_COLOR_MAP.amber,
    Icon: pickServiceIcon(s.name),
  }));
  return services.map((s, i) => {
    const firstTier = s.tiers?.[0];
    const duration =
      (firstTier?.label && firstTier.label.trim()) ||
      (s.tagline && s.tagline.trim()) ||
      "療程方案";
    const price =
      (firstTier?.price && firstTier.price.trim()) ||
      (s.starting_price_label && s.starting_price_label.trim()) ||
      "洽門市";
    const customImg = s.image_url?.trim();
    return {
      id: i + 1,
      name: s.name,
      duration,
      price,
      description: s.description?.trim() || s.tagline?.trim() || "",
      image:
        customImg && customImg.length > 0
          ? customImg
          : FALLBACK_SERVICE_IMAGES[i % FALLBACK_SERVICE_IMAGES.length],
      tag: s.tag?.trim() || undefined,
      tagColor: TAG_COLOR_MAP[s.tag_color || "amber"],
      Icon: pickServiceIcon(s.name),
    };
  });
}

function parseTherapistTags(line: string): string[] {
  return line
    .split(/[·•|,\n]/g)
    .map((t) => t.trim())
    .filter(Boolean);
}

/** 捲動進場（對齊主站 Reveal；尊重減少動態） */
function V2Reveal({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const reduceMotion = useReducedMotion();
  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.16 }}
      transition={{ duration: 0.65, delay, ease: EASE_PREMIUM }}
    >
      {children}
    </motion.div>
  );
}

/** Landing v2 僅 Hero 內一層環境光（避免與全頁重疊雙套無限動畫） */
function HeroAmbientOrbs() {
  const reduceMotion = useReducedMotion();
  if (reduceMotion) {
    return (
      <>
        <div
          className="pointer-events-none absolute left-1/2 top-1/3 h-[min(90vw,520px)] w-[min(90vw,520px)] -translate-x-1/2 rounded-full bg-[#f59e0b]/[0.07] blur-[100px]"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -right-[20%] bottom-[10%] h-[min(60vw,360px)] w-[min(60vw,360px)] rounded-full bg-amber-400/[0.06] blur-[90px]"
          aria-hidden
        />
      </>
    );
  }
  return (
    <>
      <motion.div
        className="pointer-events-none absolute left-1/2 top-[28%] h-[min(85vw,480px)] w-[min(85vw,480px)] -translate-x-1/2 rounded-full bg-[#f59e0b]/[0.09] blur-[110px]"
        aria-hidden
        animate={{ scale: [1, 1.06, 0.98, 1], opacity: [0.45, 0.65, 0.5, 0.45] }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="pointer-events-none absolute -right-[18%] bottom-[8%] h-[min(55vw,340px)] w-[min(55vw,340px)] rounded-full bg-amber-300/[0.07] blur-[95px]"
        aria-hidden
        animate={{ x: [0, -24, 12, 0], y: [0, 16, -10, 0] }}
        transition={{ duration: 24, repeat: Infinity, ease: "easeInOut", delay: 1.2 }}
      />
    </>
  );
}

function CtaLink({
  to,
  className,
  children,
}: {
  to: string;
  className: string;
  children: React.ReactNode;
}) {
  const reduceMotion = useReducedMotion();
  if (reduceMotion) {
    return (
      <Link to={to} className={className}>
        {children}
      </Link>
    );
  }
  return (
    <MotionLink
      to={to}
      className={className}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 420, damping: 28 }}
    >
      {children}
    </MotionLink>
  );
}

export interface ObsidianSanctuaryLandingProps {
  brandName: string;
  content: LandingContent;
}

interface NavLink {
  label: string;
  href: string;
}

function Header({ brandName, navLinks }: { brandName: string; navLinks: NavLink[] }) {
  const { buildStorePath } = useStore();
  const display = brandName.trim() || "線上預約";
  const reduceMotion = useReducedMotion();

  const brandBlock = (
    <a href="#" className="font-manrope text-xl font-bold uppercase tracking-[0.2em] text-[#ffc174]">{display}</a>
  );

  const navItems = navLinks.length > 0 ? (
    <div className="hidden items-center gap-6 md:flex">
      {navLinks.map((link) => (
        <a
          key={link.href}
          href={link.href}
          className="font-manrope text-xs uppercase tracking-widest text-[#d8c3ad]/60 transition-colors hover:text-[#f59e0b]"
        >
          {link.label}
        </a>
      ))}
    </div>
  ) : null;

  const cta = (
    <CtaLink
      to={buildStorePath("booking")}
      className="rounded-full bg-[#f59e0b] px-6 py-2 text-sm font-bold text-black shadow-lg shadow-[#f59e0b]/20 transition-colors hover:bg-[#d98206] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#151219]"
    >
      立即預約
    </CtaLink>
  );

  return (
    <header className="fixed top-0 z-50 w-full border-b border-white/5 bg-[#151219]/70 shadow-2xl backdrop-blur-xl">
      <nav
        className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4"
        aria-label="主要導覽"
      >
        {reduceMotion ? (
          brandBlock
        ) : (
          <motion.div
            initial={{ opacity: 0, x: -14 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, ease: EASE_PREMIUM }}
          >
            {brandBlock}
          </motion.div>
        )}
        {reduceMotion ? (
          navItems
        ) : navItems ? (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1, ease: EASE_PREMIUM }}
          >
            {navItems}
          </motion.div>
        ) : null}
        {reduceMotion ? (
          cta
        ) : (
          <motion.div
            initial={{ opacity: 0, x: 14 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.06, ease: EASE_PREMIUM }}
          >
            {cta}
          </motion.div>
        )}
      </nav>
    </header>
  );
}

function HeroSection({
  eyebrow,
  title,
  subtitle,
  ctaText,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  ctaText: string;
}) {
  const { buildStorePath } = useStore();
  const reduceMotion = useReducedMotion();

  const radial = (
    <div
      className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[#f59e0b]/10 via-transparent to-transparent opacity-50"
      aria-hidden
    />
  );

  const ctaHero = (
    <CtaLink
      to={buildStorePath("booking")}
      className="group relative inline-flex items-center gap-3 overflow-hidden rounded-full bg-[#f59e0b] px-10 py-5 text-lg font-bold text-black shadow-[0_0_40px_rgba(245,158,11,0.3)] transition-colors hover:bg-[#ea9b20] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200/90 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0c0a10]"
    >
      <span>{ctaText}</span>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-5 w-5 transition-transform group-hover:translate-x-1"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden
      >
        <path
          fillRule="evenodd"
          d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
          clipRule="evenodd"
        />
      </svg>
    </CtaLink>
  );

  const innerStatic = (
    <div className="relative z-10 max-w-3xl">
      <span className="mb-6 inline-block rounded-full border border-[#f59e0b]/30 bg-[#f59e0b]/5 px-4 py-1 font-manrope text-xs uppercase tracking-widest text-[#f59e0b]">
        {eyebrow}
      </span>
      <h1 className="mb-6 font-manrope text-5xl font-bold leading-tight tracking-tight text-white md:text-7xl">
        {title}
      </h1>
      <p className="mx-auto mb-10 max-w-xl font-manrope text-lg leading-relaxed text-[#d8c3ad] opacity-80 md:text-xl">
        {subtitle}
      </p>
      {ctaHero}
    </div>
  );

  const innerAnimated = (
    <motion.div
      className="relative z-10 max-w-3xl"
      variants={heroStagger}
      initial="hidden"
      animate="show"
    >
      <motion.span
        variants={fadeUp}
        className="mb-6 inline-block rounded-full border border-[#f59e0b]/30 bg-[#f59e0b]/5 px-4 py-1 font-manrope text-xs uppercase tracking-widest text-[#f59e0b]"
      >
        {eyebrow}
      </motion.span>
      <motion.h1
        variants={fadeUp}
        className="mb-6 font-manrope text-5xl font-bold leading-tight tracking-tight text-white md:text-7xl"
      >
        {title}
      </motion.h1>
      <motion.p
        variants={fadeUp}
        className="mx-auto mb-10 max-w-xl font-manrope text-lg leading-relaxed text-[#d8c3ad] opacity-80 md:text-xl"
      >
        {subtitle}
      </motion.p>
      <motion.div variants={fadeUp}>{ctaHero}</motion.div>
    </motion.div>
  );

  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#0c0a10] px-6 pb-16 pt-28 text-center">
      {radial}
      <HeroAmbientOrbs />
      {reduceMotion ? innerStatic : innerAnimated}
    </section>
  );
}

function ServiceCard({ service, index }: { service: StitchServiceCardModel; index: number }) {
  const { buildStorePath } = useStore();
  const reduceMotion = useReducedMotion();
  const IconComp = service.Icon;

  const card = (
    <article className="group overflow-hidden rounded-3xl border border-white/5 bg-[#151219] transition-all duration-500 hover:border-[#f59e0b]/30 hover:shadow-[0_0_40px_rgba(212,162,78,0.08)]">
      <div className="relative h-52 sm:h-56 overflow-hidden">
        <img
          src={service.image}
          alt={service.name}
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          loading="lazy"
          decoding="async"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#151219]/80 via-transparent to-transparent" />

        {service.tag && (
          <span className={`absolute top-4 left-4 ${service.tagColor} text-white text-xs font-bold px-3 py-1 rounded-full backdrop-blur-sm`}>
            {service.tag}
          </span>
        )}

        <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-black/50 backdrop-blur-md text-white/90 text-xs px-3 py-1.5 rounded-full border border-white/10">
          <Clock size={12} />
          {service.duration}
        </div>

        <div className="absolute bottom-4 left-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[#f59e0b]/20 backdrop-blur-md border border-[#f59e0b]/20">
          <IconComp size={20} className="text-[#f59e0b]" />
        </div>
      </div>

      <div className="p-6">
        <h3 className="mb-2 font-manrope text-2xl font-bold text-white transition-colors duration-300 group-hover:text-[#f59e0b]">
          {service.name}
        </h3>
        <p className="mb-6 line-clamp-2 font-manrope text-sm leading-relaxed text-[#d8c3ad]/70">
          {service.description}
        </p>
        <div className="flex items-center justify-between pt-4 border-t border-white/5">
          <div>
            <span className="block text-xs text-[#d8c3ad]/40 mb-0.5">單次價格</span>
            <span className="font-manrope text-xl font-bold tracking-tight text-[#f59e0b]">
              {service.price}
            </span>
          </div>
          <Link
            to={buildStorePath("booking")}
            className="group/btn inline-flex items-center gap-1.5 rounded-full bg-[#f59e0b]/10 px-4 py-2.5 font-manrope text-sm font-semibold text-[#f59e0b] transition-colors hover:bg-[#f59e0b]/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60"
          >
            預約此服務
            <ArrowRight size={14} className="transition-transform group-hover/btn:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </article>
  );

  if (reduceMotion) return card;

  return (
    <motion.div
      initial={{ opacity: 0, y: 44 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, delay: index * 0.13, ease: EASE_PREMIUM }}
    >
      {card}
    </motion.div>
  );
}

function TeamSection({
  eyebrow,
  title,
  mainCoach,
  supportCoaches,
}: {
  eyebrow: string;
  title: string;
  mainCoach: {
    id: string;
    name: string;
    role: string;
    bio: string;
    tags: string[];
    imageUrl: string;
  };
  supportCoaches: Array<{
    id: string;
    name: string;
    role: string;
    bio: string;
    tags: string[];
    imageUrl: string;
    isActive: boolean;
    availableToday: boolean;
    bookingLink: string;
  }>;
}) {
  const getStatus = (coach: { isActive: boolean; availableToday: boolean }) => {
    if (!coach.isActive) return { label: "休假中", active: false };
    if (!coach.availableToday) return { label: "今日未值班", active: false };
    return { label: "今日可搭班", active: true };
  };

  return (
    <section id="team" className="bg-[#0c0a10] px-6 py-24" aria-labelledby="stitch-team-heading">
      <div className="mx-auto max-w-7xl">
        <V2Reveal className="mb-16">
          <span className="mb-3 block font-manrope text-xs font-semibold uppercase tracking-[0.3em] text-[#f59e0b]">
            {eyebrow}
          </span>
          <h2
            id="stitch-team-heading"
            className="font-manrope text-4xl font-bold tracking-tight text-white"
          >
            {title}
          </h2>
        </V2Reveal>
        <V2Reveal delay={0.08}>
          <div className="space-y-8">
            <div className="mx-auto max-w-2xl rounded-[2.5rem] border border-[#f59e0b]/30 bg-[#19151f] p-8 text-center shadow-[0_0_0_1px_rgba(245,158,11,0.12)]">
              <div className="mx-auto mb-8 h-44 w-44 overflow-hidden rounded-full border-2 border-[#f59e0b]/30 p-2">
                <img
                  src={mainCoach.imageUrl}
                  alt={mainCoach.name}
                  className="h-full w-full rounded-full object-contain object-center bg-black/20 p-1"
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <h3 className="mb-2 font-manrope text-3xl font-bold text-white">
                {mainCoach.name}
                <span className="ml-2 text-xs text-[#f59e0b]">主師傅</span>
              </h3>
              <p className="mb-3 font-manrope text-sm uppercase tracking-widest text-[#f59e0b]">
                {mainCoach.role}
              </p>
              <div className="mx-auto mb-3 inline-flex rounded-full border border-[#f59e0b]/40 bg-[#f59e0b]/10 px-3 py-1 text-xs text-[#ffd39c]">
                以主師傅為主（雙人單才啟用搭班）
              </div>
              {mainCoach.bio ? (
                <p className="mb-6 font-manrope text-sm leading-relaxed text-[#d8c3ad]/80">{mainCoach.bio}</p>
              ) : null}
              <div className="flex flex-wrap justify-center gap-2">
                {mainCoach.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-white/10 bg-white/5 px-4 py-1.5 font-manrope text-xs text-[#d8c3ad]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {supportCoaches.map((coach) => {
              const status = getStatus(coach);
              const dimClass = status.active ? "" : "opacity-55 saturate-50";
              return (
              <button
                key={coach.id}
                type="button"
                onClick={() => {
                  const ok = window.confirm(
                    `要以「${coach.name}」作為搭班師傅進入雙人預約嗎？`,
                  );
                  if (ok) window.location.assign(coach.bookingLink);
                }}
                className={`col-span-1 block w-full rounded-[2rem] border border-white/5 bg-[#151219] p-6 text-center transition-colors hover:bg-[#1d1a21] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/70 ${dimClass}`}
              >
                <div className="mx-auto mb-8 h-40 w-40 overflow-hidden rounded-full border-2 border-[#f59e0b]/20 p-2">
                  <img
                    src={coach.imageUrl}
                    alt={coach.name}
                    className="h-full w-full rounded-full object-contain object-center bg-black/20 p-1"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
                <h3 className="mb-2 font-manrope text-2xl font-bold text-white">
                  {coach.name}
                </h3>
                <p className="mb-3 font-manrope text-sm uppercase tracking-widest text-[#f59e0b]">
                  {coach.role}
                </p>
                <div className={`mx-auto mb-3 inline-flex rounded-full border px-3 py-1 text-xs ${
                  status.active
                    ? "border-emerald-300/50 bg-emerald-500/15 text-emerald-300"
                    : "border-amber-300/40 bg-amber-500/10 text-amber-200"
                }`}>
                  {status.label}
                </div>
                {coach.bio ? (
                  <p className="mb-6 font-manrope text-sm leading-relaxed text-[#d8c3ad]/75">{coach.bio}</p>
                ) : null}
                <div className="flex flex-wrap justify-center gap-2">
                  {coach.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-white/10 bg-white/5 px-4 py-1.5 font-manrope text-xs text-[#d8c3ad]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </button>
            );
            })}
            </div>
          </div>
        </V2Reveal>
      </div>
    </section>
  );
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5" aria-label={`${rating} 顆星`}>
      {Array.from({ length: 5 }, (_, i) => (
        <svg
          key={i}
          className={`h-4 w-4 ${i < rating ? "text-[#f59e0b]" : "text-white/15"}`}
          fill="currentColor"
          viewBox="0 0 20 20"
          aria-hidden
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

function TestimonialsSection({ testimonials }: { testimonials: LandingTestimonial[] }) {
  if (!testimonials.length) return null;
  return (
    <section id="testimonials" className="bg-[#0c0a10] px-6 py-24" aria-labelledby="stitch-testimonials-heading">
      <div className="mx-auto max-w-7xl">
        <V2Reveal className="mb-16 text-center">
          <span className="mb-3 block font-manrope text-xs font-semibold uppercase tracking-[0.3em] text-[#f59e0b]">
            真實回饋
          </span>
          <h2
            id="stitch-testimonials-heading"
            className="font-manrope text-4xl font-bold tracking-tight text-white"
          >
            顧客好評
          </h2>
        </V2Reveal>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {testimonials.slice(0, 6).map((t, i) => (
            <V2Reveal key={i} delay={i * 0.08}>
              <article className="relative rounded-[2rem] border border-white/5 bg-[#151219] p-8 shadow-xl">
                <svg
                  className="absolute right-6 top-6 h-8 w-8 text-[#f59e0b]/15"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden
                >
                  <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10H14.017zM0 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151C7.546 6.068 5.983 8.789 5.983 11H10v10H0z" />
                </svg>
                <StarRating rating={t.rating} />
                <p className="mt-4 mb-6 font-manrope text-sm leading-relaxed text-[#d8c3ad]/80">
                  「{t.content}」
                </p>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f59e0b]/10 font-manrope text-sm font-bold text-[#f59e0b]">
                    {t.name.charAt(0)}
                  </div>
                  <span className="font-manrope text-sm font-medium text-white">{t.name}</span>
                </div>
              </article>
            </V2Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function StoreInfoSection({ info, brandName }: { info: LandingStoreInfo; brandName: string }) {
  const hasAny = info.address || info.phone || info.business_hours;
  if (!hasAny) return null;

  return (
    <section id="store-info" className="bg-[#151219] px-6 py-24" aria-labelledby="stitch-store-info-heading">
      <div className="mx-auto max-w-7xl">
        <V2Reveal className="mb-16 text-center">
          <span className="mb-3 block font-manrope text-xs font-semibold uppercase tracking-[0.3em] text-[#f59e0b]">
            到店指引
          </span>
          <h2
            id="stitch-store-info-heading"
            className="font-manrope text-4xl font-bold tracking-tight text-white"
          >
            店面資訊
          </h2>
        </V2Reveal>
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
          <V2Reveal>
            <div className="space-y-8">
              {info.address && (
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#f59e0b]/10">
                    <svg className="h-5 w-5 text-[#f59e0b]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="mb-1 font-manrope text-sm font-semibold uppercase tracking-wider text-[#f59e0b]">地址</h3>
                    <p className="font-manrope text-base text-[#d8c3ad]">{info.address}</p>
                    {info.google_maps_url && (
                      <a
                        href={info.google_maps_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-flex items-center gap-1.5 font-manrope text-sm font-medium text-[#f59e0b] underline-offset-4 hover:underline"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        Google Maps 導航
                      </a>
                    )}
                  </div>
                </div>
              )}

              {info.phone && (
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#f59e0b]/10">
                    <svg className="h-5 w-5 text-[#f59e0b]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="mb-1 font-manrope text-sm font-semibold uppercase tracking-wider text-[#f59e0b]">電話</h3>
                    <a
                      href={`tel:${info.phone.replace(/[^\d+]/g, "")}`}
                      className="font-manrope text-xl font-bold text-white transition-colors hover:text-[#f59e0b]"
                    >
                      {info.phone}
                    </a>
                    <div className="mt-2">
                      <a
                        href={`tel:${info.phone.replace(/[^\d+]/g, "")}`}
                        className="inline-flex items-center gap-2 rounded-full border border-[#f59e0b]/30 bg-[#f59e0b]/10 px-5 py-2.5 font-manrope text-sm font-semibold text-[#f59e0b] transition-colors hover:bg-[#f59e0b]/20"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        一鍵撥打
                      </a>
                    </div>
                  </div>
                </div>
              )}

              {info.business_hours && (
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#f59e0b]/10">
                    <svg className="h-5 w-5 text-[#f59e0b]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="mb-1 font-manrope text-sm font-semibold uppercase tracking-wider text-[#f59e0b]">營業時間</h3>
                    <p className="font-manrope text-base text-[#d8c3ad] whitespace-pre-line">{info.business_hours}</p>
                  </div>
                </div>
              )}
            </div>
          </V2Reveal>

          <V2Reveal delay={0.1}>
            {info.google_maps_embed_url ? (
              <div className="overflow-hidden rounded-[2rem] border border-white/5 shadow-2xl">
                <iframe
                  src={info.google_maps_embed_url}
                  className="h-80 w-full lg:h-full lg:min-h-[360px]"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title={`${brandName} 地圖`}
                />
              </div>
            ) : info.address ? (
              <div className="flex h-80 items-center justify-center rounded-[2rem] border border-white/5 bg-[#19151f] lg:h-full lg:min-h-[360px]">
                <div className="text-center">
                  <svg className="mx-auto mb-4 h-12 w-12 text-[#f59e0b]/30" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
                  </svg>
                  <p className="font-manrope text-sm text-[#d8c3ad]/50">
                    於後台填入 Google Maps 嵌入網址即可顯示地圖
                  </p>
                </div>
              </div>
            ) : null}
          </V2Reveal>
        </div>
      </div>
    </section>
  );
}

function StitchFooter({ brandName }: { brandName: string }) {
  const { buildStorePath } = useStore();
  const y = new Date().getFullYear();
  return (
    <footer className="border-t border-white/5 bg-[#0f0d13] px-8 py-16">
      <V2Reveal className="mx-auto flex max-w-7xl flex-col items-center gap-8 text-center">
        <div className="font-manrope text-2xl font-bold uppercase tracking-[0.2em] text-[#f59e0b]">
          {brandName}
        </div>
        <div className="flex flex-wrap justify-center gap-6 font-manrope text-sm text-[#d8c3ad]/50">
          <Link
            to="/landing-legacy"
            className="transition-colors hover:text-[#f59e0b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:rounded-sm"
          >
            舊版首頁（參考）
          </Link>
          <Link
            to={buildStorePath("booking")}
            className="transition-colors hover:text-[#f59e0b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:rounded-sm"
          >
            線上預約
          </Link>
        </div>
        <p className="font-manrope text-xs text-[#d8c3ad]/30">
          © {y} {brandName}
        </p>
      </V2Reveal>
    </footer>
  );
}

/**
 * Stitch「Obsidian Sanctuary」版型 + CMS；Framer Motion 對齊主站質感（easing、Reveal、減少動態、單層 Hero 光暈）。
 */
export function ObsidianSanctuaryLanding({ brandName, content }: ObsidianSanctuaryLandingProps) {
  const { storeId, remapLegacyAppPath, buildStorePath } = useStore();
  const [visibleCoaches, setVisibleCoaches] = useState<
    Array<{
      id: string;
      name: string;
      specialty: string | null;
      portrait_url: string | null;
      display_order: number;
      is_active: boolean;
      available_today: boolean;
    }>
  >([]);
  const services = useMemo(() => mapCmsServicesToStitch(content.services), [content.services]);
  useEffect(() => {
    const loadCoaches = async () => {
      const { data } = await supabase
        .from("coaches")
        .select("id,name,specialty,portrait_url,display_order,is_active,available_today")
        .eq("store_id", storeId)
        .eq("landing_visible", true)
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: true });
      setVisibleCoaches((data || []) as Array<{
        id: string;
        name: string;
        specialty: string | null;
        portrait_url: string | null;
        display_order: number;
        is_active: boolean;
        available_today: boolean;
      }>);
    };
    loadCoaches();
  }, [storeId]);

  const therapistTags = useMemo(() => {
    const fromLine = parseTherapistTags(content.therapist_tags_line);
    if (fromLine.length) return fromLine.slice(0, 8);
    return content.therapist_highlights?.length
      ? content.therapist_highlights.slice(0, 8)
      : ["筋膜刀", "全身指壓", "傳統整復"];
  }, [content.therapist_tags_line, content.therapist_highlights]);

  const heroEyebrow =
    content.hero_hours_badge_short?.trim() ||
    content.hero_starting_price_label?.trim() ||
    "極致感官舒壓";

  const servicesEyebrow = "喚醒感官的純粹奢華";
  const servicesTitle = "精選療癒模式";

  const teamEyebrow = "專業調理師";
  const teamTitle = "匠心大師";
  const therapistName = content.therapist_section_title?.trim() || "調理師";
  const therapistRole = "專業調理師";
  const therapistBio = content.therapist_section_body?.trim() || "";

  const closingTitle = content.footer_cta_title?.trim() || "超越表象的靜謐";
  const closingBody =
    content.footer_cta_body?.trim() ||
    "每一場儀式皆匠心打造，引導您暫時脫離日常的喧囂，進入徹底修復的微光境域。";

  const therapistFallback =
    "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=800";
  const therapistImage = content.therapist_portrait_url?.trim() || therapistFallback;
  const mainCoachCard = useMemo(() => {
    return {
      id: "main-therapist",
      name: therapistName,
      role: therapistRole,
      bio: therapistBio,
      tags: therapistTags,
      imageUrl: therapistImage,
    };
  }, [therapistBio, therapistImage, therapistName, therapistRole, therapistTags]);

  const supportCoachCards = useMemo(() => {
    return visibleCoaches
      .filter((coach) => coach.name.trim() && coach.name.trim() !== therapistName.trim())
      .map((coach) => ({
        id: coach.id,
        name: coach.name,
        role: coach.specialty?.trim() ? coach.specialty.trim() : "搭配師傅",
        bio: "",
        tags: coach.specialty?.trim() ? [coach.specialty.trim()] : ["協作調理", "預約支援"],
        imageUrl: coach.portrait_url?.trim() ? coach.portrait_url.trim() : therapistFallback,
        isActive: !!coach.is_active,
        availableToday: !!coach.available_today,
        bookingLink: remapLegacyAppPath(
          `/booking?pair=1&coach=${encodeURIComponent(coach.id)}&coachName=${encodeURIComponent(coach.name)}`,
        ),
      }));
  }, [therapistFallback, therapistName, visibleCoaches, remapLegacyAppPath]);

  const priceDisclaimer = content.price_disclaimer?.trim() || "";

  const navLinks = useMemo<NavLink[]>(() => {
    const links: NavLink[] = [
      { label: "服務項目", href: "#services" },
      { label: "師傅介紹", href: "#team" },
    ];
    if (content.testimonials.length > 0) {
      links.push({ label: "顧客好評", href: "#testimonials" });
    }
    const si = content.store_info;
    if (si.address || si.phone || si.business_hours) {
      links.push({ label: "店面資訊", href: "#store-info" });
    }
    return links;
  }, [content.testimonials, content.store_info]);

  const closingGalleryUrls = useMemo(() => {
    if (content.closing_gallery_mode === "hidden") return null;
    if (content.closing_gallery_mode === "custom") {
      const u = [content.closing_image_url_1, content.closing_image_url_2]
        .map((x) => (typeof x === "string" ? x.trim() : ""))
        .filter(Boolean);
      return u.length > 0 ? u : null;
    }
    return [...FALLBACK_ENV_IMAGES];
  }, [
    content.closing_gallery_mode,
    content.closing_image_url_1,
    content.closing_image_url_2,
  ]);

  return (
    <div className="relative min-h-screen bg-[#0c0a10] text-white selection:bg-[#f59e0b]/30 selection:text-black">
      {/* 與主 Landing 類似的細緻雜訊底紋（靜態、無動畫負擔） */}
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.35]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.05'/%3E%3C/svg%3E")`,
        }}
        aria-hidden
      />

      <div className="relative z-[1]">
        <Header brandName={brandName} navLinks={navLinks} />
        <main>
          <HeroSection
            eyebrow={heroEyebrow}
            title={content.hero_title}
            subtitle={content.hero_subtitle}
            ctaText={
              content.hero_cta_label.trim() !== "" ? content.hero_cta_label : "開啟舒壓儀式"
            }
          />

          <section id="services" className="py-20 sm:py-28" aria-labelledby="stitch-services-heading">
            <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
              <V2Reveal className="mb-16 text-center">
                <div className="mb-4 inline-flex items-center gap-2">
                  <Sparkles size={16} className="text-[#f59e0b]" />
                  <span className="font-manrope text-sm font-medium tracking-wide text-[#f59e0b]">
                    {servicesEyebrow}
                  </span>
                  <Sparkles size={16} className="text-[#f59e0b]" />
                </div>
                <h2
                  id="stitch-services-heading"
                  className="mb-4 font-manrope text-3xl font-bold tracking-tight text-white sm:text-4xl"
                >
                  {servicesTitle}
                </h2>
                <p className="mx-auto max-w-md font-manrope text-sm text-[#d8c3ad]/60">
                  為您量身打造的放鬆體驗，每一種療程都是身心修復的開始
                </p>
              </V2Reveal>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-3 lg:gap-8">
                {services.map((service, index) => (
                  <ServiceCard key={service.id} service={service} index={index} />
                ))}
              </div>
              {priceDisclaimer && (
                <p className="mt-10 text-center font-manrope text-xs text-[#d8c3ad]/40">
                  ＊{priceDisclaimer}
                </p>
              )}
            </div>
          </section>

          <TeamSection
            eyebrow={teamEyebrow}
            title={teamTitle}
            mainCoach={mainCoachCard}
            supportCoaches={supportCoachCards}
          />

          <TestimonialsSection testimonials={content.testimonials} />
          <StoreInfoSection info={content.store_info} brandName={brandName} />

          <section className="relative overflow-hidden bg-[#151219] px-6 py-32 text-center">
            <div className="pointer-events-none absolute inset-0 opacity-5" aria-hidden>
              <div
                className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-leather.png')]"
                style={{ backgroundSize: "auto" }}
              />
            </div>
            {closingGalleryUrls && closingGalleryUrls.length > 0 ? (
              <V2Reveal
                className={`relative z-10 mx-auto mb-12 grid max-w-5xl gap-4 ${
                  closingGalleryUrls.length === 1 ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"
                }`}
              >
                {closingGalleryUrls.map((src, i) => (
                  <img
                    key={`${src}-${i}`}
                    src={src}
                    alt={i === 0 ? "療癒空間氛圍" : "環境與空間氛圍"}
                    className="h-48 w-full rounded-3xl object-cover md:h-56"
                    loading="lazy"
                    decoding="async"
                  />
                ))}
              </V2Reveal>
            ) : null}
            <V2Reveal delay={0.06} className="relative z-10 mx-auto max-w-3xl">
              <h2 className="mb-8 font-manrope text-4xl font-bold leading-tight text-white md:text-5xl">
                {closingTitle}
              </h2>
              <p className="mb-12 font-manrope text-lg leading-relaxed text-[#d8c3ad] opacity-70">
                {closingBody}
              </p>
              <CtaLink
                to={buildStorePath("booking")}
                className="inline-block rounded-full bg-[#f59e0b] px-12 py-5 text-lg font-bold text-black shadow-xl transition-colors hover:bg-[#ea9b20] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200/90 focus-visible:ring-offset-2 focus-visible:ring-offset-[#151219]"
              >
                立即預約
              </CtaLink>
            </V2Reveal>
          </section>
        </main>
        <StitchFooter brandName={brandName} />
      </div>
    </div>
  );
}
