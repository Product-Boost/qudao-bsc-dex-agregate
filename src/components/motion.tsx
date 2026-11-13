// Motion building blocks shared by the marketing pages and the app. Everything honours the visitor's
// "reduce motion" setting through <MotionConfig reducedMotion="user"> in main.tsx.
import { useEffect, useRef, type CSSProperties, type MouseEvent, type ReactNode } from "react";
import { EASE } from "../lib/ease";
import { animate, motion, useInView, useReducedMotion, useScroll, useSpring, type Variants } from "motion/react";


/** Fades and lifts its content in the first time it scrolls into view. */
export function Reveal({
  children,
  delay = 0,
  y = 28,
  className = "",
  as = "div",
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  as?: "div" | "section" | "li" | "span";
}) {
  const M = motion[as];
  return (
    <M
      className={className}
      initial={{ opacity: 0, y, filter: "blur(6px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "0px 0px -12% 0px" }}
      transition={{ duration: 0.8, ease: EASE, delay }}
    >
      {children}
    </M>
  );
}

const groupVariants: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } } };
const itemVariants: Variants = {
  hidden: { opacity: 0, y: 22, filter: "blur(4px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.7, ease: EASE } },
};

/** Children marked <StaggerItem> come in one after another when the group scrolls into view. */
export function Stagger({ children, className = "", as = "div" }: { children: ReactNode; className?: string; as?: "div" | "ul" | "ol" }) {
  const M = motion[as];
  return (
    <M className={className} variants={groupVariants} initial="hidden" whileInView="show" viewport={{ once: true, margin: "0px 0px -10% 0px" }}>
      {children}
    </M>
  );
}

export function StaggerItem({ children, className = "", as = "div" }: { children: ReactNode; className?: string; as?: "div" | "li" }) {
  const M = motion[as];
  return (
    <M className={className} variants={itemVariants}>
      {children}
    </M>
  );
}

/** A number that counts up from zero the first time it's seen (and tweens when it changes later). */
export function CountUp({ value, format, duration = 1.6, className = "" }: { value: number; format: (n: number) => string; duration?: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -10% 0px" });
  const reduce = useReducedMotion();
  const from = useRef(0);
  useEffect(() => {
    const el = ref.current;
    if (!el || !inView) return;
    if (reduce) {
      el.textContent = format(value);
      from.current = value;
      return;
    }
    const controls = animate(from.current, value, {
      duration,
      ease: EASE,
      onUpdate: (n) => (el.textContent = format(n)),
    });
    from.current = value;
    return () => controls.stop();
  }, [inView, value, format, duration, reduce]);
  return (
    <span ref={ref} className={className}>
      {format(0)}
    </span>
  );
}

/** Splits a line into words that rise into place one by one (for headlines). */
export function WordsReveal({ text, className = "", delay = 0, wordClassName = "" }: { text: string; className?: string; delay?: number; wordClassName?: string }) {
  const words = text.split(" ");
  return (
    <span className={className} aria-label={text}>
      {words.map((w, i) => (
        <span key={i} aria-hidden className="inline-block overflow-hidden pb-[0.08em] align-bottom">
          <motion.span
            className={`inline-block ${wordClassName}`}
            initial={{ y: "105%", opacity: 0 }}
            animate={{ y: "0%", opacity: 1 }}
            transition={{ duration: 0.9, ease: EASE, delay: delay + i * 0.07 }}
          >
            {w}
            {i < words.length - 1 ? " " : ""}
          </motion.span>
        </span>
      ))}
    </span>
  );
}

/** A card whose border and background light up around the cursor. */
export function Spotlight({ children, className = "", style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null);
  const move = (e: MouseEvent<HTMLDivElement>) => {
    const r = ref.current!.getBoundingClientRect();
    ref.current!.style.setProperty("--mx", `${e.clientX - r.left}px`);
    ref.current!.style.setProperty("--my", `${e.clientY - r.top}px`);
  };
  return (
    <div ref={ref} onMouseMove={move} className={`spotlight group relative ${className}`} style={style}>
      {children}
    </div>
  );
}

/** Thin gold bar along the top of the window showing how far down the page you are. */
export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 140, damping: 30, mass: 0.3 });
  return <motion.div aria-hidden className="fixed inset-x-0 top-0 z-[60] h-0.5 origin-left bg-gradient-to-r from-gold-3 via-gold to-gold-2" style={{ scaleX }} />;
}

/** An endless, pausable row of items. */
export function Marquee({ children, speed = 40, className = "" }: { children: ReactNode; speed?: number; className?: string }) {
  return (
    <div className={`marquee group relative overflow-hidden ${className}`}>
      <div className="marquee-track flex w-max gap-10 group-hover:[animation-play-state:paused]" style={{ animationDuration: `${speed}s` }}>
        <div className="flex shrink-0 items-center gap-10">{children}</div>
        <div className="flex shrink-0 items-center gap-10" aria-hidden>
          {children}
        </div>
      </div>
    </div>
  );
}
