import { useCallback, useRef, useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

type MagneticGlowButtonProps = {
  children: ReactNode;
  /** 外層 class，用於對齊版面（例如 flex justify-center） */
  wrapperClassName?: string;
  /** 磁吸強度 0–1 */
  magneticStrength?: number;
};

/**
 * 預約 CTA：輕量磁吸（跟隨游標）+ 琥珀色發光脈衝
 */
export function MagneticGlowButton({
  children,
  wrapperClassName,
  magneticStrength = 0.22,
}: MagneticGlowButtonProps) {
  const reduceMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const [shift, setShift] = useState({ x: 0, y: 0 });

  const onMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (reduceMotion) return;
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      setShift({
        x: (e.clientX - cx) * magneticStrength,
        y: (e.clientY - cy) * magneticStrength,
      });
    },
    [magneticStrength, reduceMotion],
  );

  const onLeave = useCallback(() => setShift({ x: 0, y: 0 }), []);

  return (
    <div
      ref={ref}
      className={cn("relative inline-flex", wrapperClassName)}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
    >
      {!reduceMotion ? (
        <span
          className="pointer-events-none absolute -inset-3 rounded-xl bg-amber-400/25 blur-2xl opacity-60 motion-safe:animate-pulse"
          aria-hidden
        />
      ) : null}
      <motion.div
        style={{ x: shift.x, y: shift.y }}
        transition={{ type: "spring", stiffness: 350, damping: 22, mass: 0.4 }}
        className="relative rounded-md shadow-[0_0_36px_-6px_rgba(251,191,36,0.5)]"
      >
        {children}
      </motion.div>
    </div>
  );
}
