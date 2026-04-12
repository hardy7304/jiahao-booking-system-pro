/**
 * 品牌實績：滾動進場後 Lottie + react-countup（數值可由 CMS 覆寫）
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import Lottie, { type LottieRefCurrentProps } from "lottie-react";
import CountUp from "react-countup";

const PLACEHOLDER_LOTTIE_URL =
  "https://assets2.lottiefiles.com/packages/lf20_aZTdD5.json";

const statCard =
  "rounded-xl border border-white/[0.08] bg-white/[0.04] px-5 py-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] backdrop-blur-md";

export interface BrandStatsSectionProps {
  title?: string;
  subtitle?: string;
  reliefCount?: number;
  reviewPercent?: number;
  /** 第三卡調理手法：自訂字串（可換行），不再使用純數字動畫 */
  techniquesDisplay?: string;
}

const DEFAULT_TITLE = "神之手 · 專業實績";
const DEFAULT_SUBTITLE = "用數據見證每一次的極致放鬆";

export default function BrandStatsSection({
  title = DEFAULT_TITLE,
  subtitle = DEFAULT_SUBTITLE,
  reliefCount = 1280,
  reviewPercent = 99,
  techniquesDisplay = "72 種",
}: BrandStatsSectionProps) {
  const lottieRef = useRef<LottieRefCurrentProps | null>(null);
  const [animationData, setAnimationData] = useState<unknown | null>(null);
  const [lottieError, setLottieError] = useState(false);
  const [hasEnteredView, setHasEnteredView] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(PLACEHOLDER_LOTTIE_URL);
        if (!res.ok) throw new Error(String(res.status));
        const json: unknown = await res.json();
        if (!cancelled) setAnimationData(json);
      } catch {
        if (!cancelled) setLottieError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleViewportEnter = useCallback(() => {
    setHasEnteredView(true);
  }, []);

  useEffect(() => {
    if (!hasEnteredView || !animationData) return;
    const t = requestAnimationFrame(() => {
      lottieRef.current?.play();
    });
    return () => cancelAnimationFrame(t);
  }, [hasEnteredView, animationData]);

  return (
    <section className="relative w-full overflow-hidden py-20 md:py-28">
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#14121a] via-[#1a171f] to-[#121018]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-1/3 top-0 h-[420px] w-[420px] rounded-full bg-amber-500/[0.07] blur-[120px]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-1/4 bottom-0 h-[380px] w-[380px] rounded-full bg-teal-600/[0.06] blur-[100px]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-px w-[min(90%,48rem)] -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-transparent via-white/[0.06] to-transparent"
        aria-hidden
      />

      <motion.div
        className="relative z-10 mx-auto max-w-5xl px-6"
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.22 }}
        transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
        onViewportEnter={handleViewportEnter}
      >
        <motion.div
          className="mb-12 text-center"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.28em] text-stone-500">
            專業實績
          </p>
          <h2 className="text-2xl font-light tracking-[0.08em] text-stone-100 md:text-3xl">
            {title}
          </h2>
          <p className="mx-auto mt-5 max-w-lg text-sm leading-relaxed text-stone-400 md:text-base">
            {subtitle}
          </p>
        </motion.div>

        <motion.div
          className="grid gap-8 lg:grid-cols-12 lg:items-stretch"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          variants={{
            hidden: {},
            show: { transition: { staggerChildren: 0.14, delayChildren: 0.08 } },
          }}
        >
          <motion.div
            className={`flex min-h-[220px] flex-col items-center justify-center lg:col-span-5 ${statCard}`}
            variants={{
              hidden: { opacity: 0, scale: 0.94, y: 20 },
              show: {
                opacity: 1,
                scale: 1,
                y: 0,
                transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] },
              },
            }}
          >
            {lottieError || !animationData ? (
              <p className="px-4 text-center text-sm text-stone-500">
                {lottieError ? "動畫無法載入，請稍後再試或更換 Lottie 網址。" : "載入中…"}
              </p>
            ) : (
              <div className="h-52 w-full max-w-[240px] md:h-56">
                <Lottie
                  lottieRef={lottieRef}
                  animationData={animationData}
                  loop
                  autoplay={false}
                  className="h-full w-full"
                />
              </div>
            )}
            <p className="mt-4 text-center text-[11px] tracking-widest text-stone-500">
              品牌吉祥物動畫預留
            </p>
          </motion.div>

          <motion.div
            className="flex flex-col justify-center gap-4 lg:col-span-7"
            variants={{
              hidden: {},
              show: { transition: { staggerChildren: 0.12, delayChildren: 0.06 } },
            }}
          >
            <motion.div
              className={statCard}
              variants={{
                hidden: { opacity: 0, x: 28 },
                show: {
                  opacity: 1,
                  x: 0,
                  transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
                },
              }}
            >
              <p className="text-sm font-medium text-stone-400">
                <span className="mr-2" aria-hidden>
                  💆‍♂️
                </span>
                累積解除痠痛
              </p>
              <p
                className="mt-2 text-3xl font-light text-amber-100/95 md:text-4xl"
                aria-live="polite"
                aria-atomic="true"
              >
                {hasEnteredView ? (
                  <CountUp
                    start={0}
                    end={reliefCount}
                    duration={2.5}
                    useEasing
                    enableScrollSpy={false}
                    formattingFn={(n) => `${Math.round(n).toLocaleString("zh-Hant-TW")} 人次`}
                  />
                ) : (
                  <span className="text-stone-600">—</span>
                )}
              </p>
            </motion.div>

            <motion.div
              className={statCard}
              variants={{
                hidden: { opacity: 0, x: 28 },
                show: {
                  opacity: 1,
                  x: 0,
                  transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
                },
              }}
            >
              <p className="text-sm font-medium text-stone-400">
                <span className="mr-2" aria-hidden>
                  ⭐
                </span>
                客戶五星好評
              </p>
              <p
                className="mt-2 text-3xl font-light text-amber-100/95 md:text-4xl"
                aria-live="polite"
                aria-atomic="true"
              >
                {hasEnteredView ? (
                  <CountUp
                    start={0}
                    end={reviewPercent}
                    duration={2.2}
                    decimals={0}
                    useEasing
                    enableScrollSpy={false}
                    formattingFn={(n) => `${Math.round(n)}％`}
                  />
                ) : (
                  <span className="text-stone-600">—</span>
                )}
              </p>
            </motion.div>

            <motion.div
              className={statCard}
              variants={{
                hidden: { opacity: 0, x: 28 },
                show: {
                  opacity: 1,
                  x: 0,
                  transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
                },
              }}
            >
              <p className="text-sm font-medium text-stone-400">
                <span className="mr-2" aria-hidden>
                  💪
                </span>
                獨家調理手法
              </p>
              <motion.p
                className="mt-2 text-xl font-light leading-relaxed text-amber-100/95 md:text-2xl whitespace-pre-wrap"
                initial={{ opacity: 0, y: 12 }}
                animate={hasEnteredView ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
                transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                aria-live="polite"
                aria-atomic="true"
              >
                {hasEnteredView ? techniquesDisplay : "—"}
              </motion.p>
            </motion.div>
          </motion.div>
        </motion.div>
      </motion.div>
    </section>
  );
}
