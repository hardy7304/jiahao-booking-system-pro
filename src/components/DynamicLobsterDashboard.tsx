/**
 * 禪意 SaaS：滾動進場後 Lottie + CountUp（技術棧同前：lottie-react / framer-motion / react-countup）
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import Lottie, { type LottieRefCurrentProps } from "lottie-react";
import CountUp from "react-countup";

/** 可替換為品牌動畫；建議選色調單純、線條乾淨的 Lottie */
const PLACEHOLDER_LOTTIE_URL =
  "https://assets2.lottiefiles.com/packages/lf20_aZTdD5.json";

const zenPanel =
  "rounded-sm border border-stone-200/90 bg-white/70 shadow-[0_1px_2px_rgba(0,0,0,0.04)] backdrop-blur-[2px]";

export default function DynamicLobsterDashboard() {
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
    <section className="relative w-full bg-[#f0efe9] py-20 md:py-28">
      <motion.div
        className="relative z-10 mx-auto max-w-4xl px-6"
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.25 }}
        transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
        onViewportEnter={handleViewportEnter}
      >
        <div className="mb-12 text-center">
          <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.3em] text-stone-400">
            數據與信任
          </p>
          <h2 className="text-xl font-light tracking-wide text-stone-800 md:text-2xl">
            與店家同行
          </h2>
          <p className="mx-auto mt-5 max-w-md text-sm leading-relaxed text-stone-500">
            畫面進入視窗時，動畫與數字輕緩呈現——不打擾閱讀，僅作為補充說明。
          </p>
        </div>

        <div className={`grid gap-8 md:grid-cols-2 md:items-stretch ${zenPanel} p-8 md:p-10`}>
          <div
            className={`flex min-h-[200px] flex-col items-center justify-center border border-stone-200/80 bg-[#faf9f7] p-6 ${zenPanel}`}
          >
            {lottieError || !animationData ? (
              <p className="text-center text-sm text-stone-400">
                {lottieError ? "動畫無法載入，請稍後再試或更換 JSON 網址。" : "載入中…"}
              </p>
            ) : (
              <div className="h-48 w-full max-w-[220px] opacity-90 grayscale-[0.15] md:h-52">
                <Lottie
                  lottieRef={lottieRef}
                  animationData={animationData}
                  loop
                  autoplay={false}
                  className="h-full w-full"
                />
              </div>
            )}
            <p className="mt-4 text-center text-[11px] tracking-wider text-stone-400">
              品牌動畫預留
            </p>
          </div>

          <div className="flex flex-col justify-center gap-8">
            <div className="border-l-2 border-stone-300/80 py-2 pl-6">
              <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-stone-400">
                已服務店家
              </p>
              <p className="mt-2 text-3xl font-light tabular-nums text-stone-900 md:text-4xl">
                {hasEnteredView ? (
                  <CountUp
                    start={0}
                    end={1234}
                    duration={2.6}
                    separator=","
                    useEasing
                    enableScrollSpy={false}
                  />
                ) : (
                  <span className="text-stone-300">0</span>
                )}
                <span className="ml-1.5 text-lg font-light text-stone-500">家</span>
              </p>
            </div>

            <div className="border-l-2 border-stone-300/80 py-2 pl-6">
              <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-stone-400">
                滿意度
              </p>
              <p className="mt-2 text-3xl font-light tabular-nums text-stone-900 md:text-4xl">
                {hasEnteredView ? (
                  <CountUp
                    start={0}
                    end={98}
                    duration={2.2}
                    suffix="%"
                    useEasing
                    enableScrollSpy={false}
                  />
                ) : (
                  <span className="text-stone-300">0%</span>
                )}
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
