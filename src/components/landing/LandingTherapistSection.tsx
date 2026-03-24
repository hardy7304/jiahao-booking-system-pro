import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { type LandingContent } from "@/lib/landingContent";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/contexts/StoreContext";

export function LandingTherapistSection({ content }: { content: LandingContent }) {
  const reduceMotion = useReducedMotion();
  const { storeId } = useStore();
  const [coaches, setCoaches] = useState<Array<{ id: string; name: string; specialty: string | null; portrait_url: string | null }>>([]);
  const tags = content.therapist_tags_line
    .split(/[·｜|、,，]/)
    .map((s) => s.trim())
    .filter(Boolean);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("coaches")
        .select("id,name,specialty,portrait_url")
        .eq("store_id", storeId)
        .eq("is_active", true)
        .eq("landing_visible", true)
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: true });
      setCoaches((data || []) as Array<{ id: string; name: string; specialty: string | null; portrait_url: string | null }>);
    };
    load();
  }, [storeId]);

  return (
    <section className="relative border-b border-white/[0.06] bg-[#0f0d14] py-20 md:py-28">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(251,191,36,0.06),transparent)]"
        aria-hidden
      />
      <div className="relative mx-auto max-w-6xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.22 }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          whileHover={
            reduceMotion
              ? undefined
              : { scale: 1.005, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } }
          }
          className="rounded-2xl border border-white/[0.1] bg-white/[0.03] p-8 shadow-[0_20px_60px_-24px_rgba(0,0,0,0.55)] backdrop-blur-xl md:p-12"
        >
          <h2 className="text-2xl font-semibold text-stone-50 md:text-3xl">
            {content.therapist_section_title}
          </h2>
          <p className="mt-6 max-w-3xl text-sm leading-relaxed text-stone-400 md:text-base">
            {content.therapist_section_body}
          </p>
          {tags.length > 0 ? (
            <div className="mt-6 flex flex-wrap gap-2">
              {tags.map((t) => (
                <span
                  key={t}
                  className="rounded-full border border-white/15 bg-white/[0.06] px-3 py-1 text-xs text-stone-300 backdrop-blur-sm"
                >
                  {t}
                </span>
              ))}
            </div>
          ) : null}
          <ul className="mt-10 grid gap-4 sm:grid-cols-2">
            {content.therapist_highlights.map((line, i) => (
              <motion.li
                key={`${line}-${i}`}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{
                  duration: 0.45,
                  delay: i * 0.06,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="flex items-start gap-3 rounded-lg border border-white/[0.08] bg-black/25 px-4 py-3 text-sm text-stone-300 backdrop-blur-md"
              >
                <span className="mt-0.5 text-amber-500/80">✓</span>
                {line}
              </motion.li>
            ))}
          </ul>
          {coaches.length > 1 ? (
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {coaches.slice(1).map((coach) => (
                <div key={coach.id} className="rounded-lg border border-white/[0.08] bg-black/20 px-4 py-3">
                  <div className="mx-auto mb-2 h-16 w-16 overflow-hidden rounded-full border border-white/20">
                    <img
                      src={coach.portrait_url?.trim() || "https://images.unsplash.com/photo-1541534401786-2077eed87a72?auto=format&fit=crop&q=80&w=300"}
                      alt={coach.name}
                      className="h-full w-full object-contain object-center bg-black/20 p-1"
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                  <p className="text-sm font-medium text-stone-100">{coach.name}</p>
                  <p className="text-xs text-stone-400 mt-1">{coach.specialty || "搭配師傅"}</p>
                </div>
              ))}
            </div>
          ) : null}
        </motion.div>
      </div>
    </section>
  );
}
