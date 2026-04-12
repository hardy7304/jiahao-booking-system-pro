import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import type { LandingContent, LandingServiceItem } from "@/lib/landingContent";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/contexts/StoreContext";

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
    name: "經絡穴道足療",
    duration: "60 分鐘",
    price: "NT$1,800",
    description:
      "精確釋放經絡壓力點，引導能量流動，達成全身性的舒緩與修復。",
    image: FALLBACK_SERVICE_IMAGES[0],
  },
  {
    id: 2,
    name: "全身經絡減壓儀式",
    duration: "90 分鐘",
    price: "NT$2,800",
    description:
      "結合深度按壓與律動緩伸，校正體內平衡，徹底釋放深層肌肉張力。",
    image: FALLBACK_SERVICE_IMAGES[1],
  },
];

export interface StitchServiceCardModel {
  id: number;
  name: string;
  duration: string;
  price: string;
  description: string;
  image: string;
}

function mapCmsServicesToStitch(services: LandingServiceItem[]): StitchServiceCardModel[] {
  if (!services.length) return STITCH_FALLBACK_SERVICES;
  return services.map((s, i) => {
    const firstTier = s.tiers?.[0];
    const duration =
      (s.tagline && s.tagline.trim()) ||
      (firstTier?.label && firstTier.label.trim()) ||
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

function Header({ brandName }: { brandName: string }) {
  const display = brandName.trim() || "線上預約";
  const reduceMotion = useReducedMotion();

  const brandBlock = (
    <div className="font-manrope text-xl font-bold uppercase tracking-[0.2em] text-[#ffc174]">{display}</div>
  );

  const cta = (
    <CtaLink
      to="/booking"
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
  const reduceMotion = useReducedMotion();

  const radial = (
    <div
      className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[#f59e0b]/10 via-transparent to-transparent opacity-50"
      aria-hidden
    />
  );

  const ctaHero = (
    <CtaLink
      to="/booking"
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
  const reduceMotion = useReducedMotion();

  const card = (
    <article className="group overflow-hidden rounded-[2.5rem] border border-white/5 bg-[#151219] shadow-2xl transition-colors duration-500 hover:border-[#f59e0b]/30">
      <div className="relative h-80 overflow-hidden">
        <img
          src={service.image}
          alt={service.name}
          className="h-full w-full object-cover object-center transition-transform duration-700 grayscale-[30%] group-hover:scale-110 group-hover:grayscale-0"
          loading="lazy"
          decoding="async"
        />
        <div className="absolute top-6 right-6 rounded-full border border-white/10 bg-black/60 px-4 py-2 font-manrope text-xs text-white/80 backdrop-blur-md">
          {service.duration}
        </div>
      </div>
      <div className="p-10">
        <h3 className="mb-3 font-manrope text-2xl font-bold text-white">{service.name}</h3>
        <p className="mb-8 line-clamp-2 font-manrope text-base leading-relaxed text-[#d8c3ad]/70">
          {service.description}
        </p>
        <div className="flex items-center justify-between">
          <span className="font-manrope text-xl font-bold tracking-tight text-[#f59e0b]">
            {service.price}
          </span>
          <Link
            to="/booking"
            className="flex items-center gap-2 font-manrope text-sm font-bold text-[#f59e0b] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60 focus-visible:rounded-sm"
          >
            瞭解更多 <span aria-hidden>→</span>
          </Link>
        </div>
      </div>
    </article>
  );

  if (reduceMotion) return card;

  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.12 }}
      transition={{ duration: 0.62, delay: index * 0.1, ease: EASE_PREMIUM }}
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
    <section className="bg-[#0c0a10] px-6 py-24" aria-labelledby="stitch-team-heading">
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

function StitchFooter({ brandName }: { brandName: string }) {
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
            to="/booking"
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
  const { storeId } = useStore();
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
        bookingLink: `/booking?pair=1&coach=${encodeURIComponent(coach.id)}&coachName=${encodeURIComponent(coach.name)}`,
      }));
  }, [therapistFallback, therapistName, visibleCoaches]);

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
        <Header brandName={brandName} />
        <main>
          <HeroSection
            eyebrow={heroEyebrow}
            title={content.hero_title}
            subtitle={content.hero_subtitle}
            ctaText={
              content.hero_cta_label.trim() !== "" ? content.hero_cta_label : "開啟舒壓儀式"
            }
          />

          <section className="mx-auto max-w-7xl px-6 py-24" aria-labelledby="stitch-services-heading">
            <V2Reveal className="mb-16">
              <span className="mb-3 block font-manrope text-xs font-semibold uppercase tracking-[0.3em] text-[#f59e0b]">
                {servicesEyebrow}
              </span>
              <h2
                id="stitch-services-heading"
                className="font-manrope text-4xl font-bold tracking-tight text-white"
              >
                {servicesTitle}
              </h2>
            </V2Reveal>
            <div className="grid grid-cols-1 gap-10 md:grid-cols-2">
              {services.map((service, index) => (
                <ServiceCard key={service.id} service={service} index={index} />
              ))}
            </div>
          </section>

          <TeamSection
            eyebrow={teamEyebrow}
            title={teamTitle}
            mainCoach={mainCoachCard}
            supportCoaches={supportCoachCards}
          />

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
                to="/booking"
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
