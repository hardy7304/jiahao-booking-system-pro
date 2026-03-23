import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import type { LandingContent } from "@/lib/landingContent";
import { MagneticGlowButton } from "./MagneticGlowButton";

export function LandingFooterCta({ content }: { content: LandingContent }) {
  return (
    <section className="relative overflow-hidden bg-[#0c0a10] py-20 md:py-24">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_40%_at_50%_100%,rgba(251,191,36,0.09),transparent)]"
        aria-hidden
      />
      <div className="relative mx-auto max-w-3xl px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.35 }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.h2
            className="text-2xl font-semibold text-stone-100 md:text-3xl"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55, delay: 0.06, ease: [0.22, 1, 0.36, 1] }}
          >
            {content.footer_cta_title}
          </motion.h2>
          <motion.p
            className="mx-auto mt-5 max-w-xl text-sm leading-relaxed text-stone-400"
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55, delay: 0.14, ease: [0.22, 1, 0.36, 1] }}
          >
            {content.footer_cta_body}
          </motion.p>
          <motion.div
            className="mt-10 flex justify-center"
            initial={{ opacity: 0, scale: 0.96 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            <MagneticGlowButton>
              <Button
                asChild
                size="lg"
                className="rounded-md border border-amber-400/35 bg-amber-500/95 px-10 text-stone-950 hover:bg-amber-400"
              >
                <Link to="/booking">立即預約</Link>
              </Button>
            </MagneticGlowButton>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
