// "How it works": a pinned, scroll-driven story. The page scrolls through six steps; the left rail tracks
// progress (and jumps to a step on click), the right panel is one live vault whose scene follows the scroll.
import { useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion, useMotionValueEvent, useScroll, useTransform, type MotionValue } from "motion/react";
import { ArrowRight, Lock } from "lucide-react";
import { useAppConfig } from "../../lib/config";
import { bps } from "../../lib/format";
import { EASE } from "../../lib/ease";
import { Burn, FeesCake, KeptInRange, PickPool, SetRange, Well } from "./scenes";
import { headAt, movesAt } from "./data";
import { useT } from "../../i18n";

type Tone = "gold" | "info" | "up" | "fire";
interface Step {
  kicker: string;
  title: string;
  body: string;
  status: string;
  tone: Tone;
  link?: { to: string; label: string };
}

const GLOW: Record<Tone, string> = {
  gold: "radial-gradient(60% 60% at 70% 20%, rgb(240 185 11 / 0.22), transparent 70%)",
  info: "radial-gradient(60% 60% at 70% 20%, rgb(107 155 255 / 0.2), transparent 70%)",
  up: "radial-gradient(60% 60% at 70% 20%, rgb(46 189 133 / 0.2), transparent 70%)",
  fire: "radial-gradient(60% 60% at 70% 20%, rgb(255 122 69 / 0.22), transparent 70%)",
};
const STATUS_TONE: Record<Tone, string> = {
  gold: "border-gold/40 text-gold-2",
  info: "border-info/40 text-info",
  up: "border-up/40 text-up",
  fire: "border-[#ff7a45]/40 text-[#ff7a45]",
};

const clamp = (v: number) => Math.max(0, Math.min(1, v));

/** One step's scene, with the scroll progress through that step. */
function SceneSlot({ i, n, scroll, render }: { i: number; n: number; scroll: MotionValue<number>; render: (p: MotionValue<number>) => ReactNode }) {
  const progress = useTransform(scroll, [i / n, (i + 1) / n], [0, 1], { clamp: true });
  return (
    <motion.div
      className="absolute inset-0"
      initial={{ opacity: 0, scale: 0.97, filter: "blur(8px)" }}
      animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
      exit={{ opacity: 0, scale: 1.02, filter: "blur(8px)" }}
      transition={{ duration: 0.45, ease: EASE }}
    >
      {render(progress)}
    </motion.div>
  );
}

function Counter({ label, short, value, className = "" }: { label: string; short: string; value: MotionValue<string>; className?: string }) {
  return (
    <div className="min-w-0">
      <div className="truncate text-[10px] font-medium tracking-[0.08em] text-mute uppercase sm:text-[11px]">
        <span className="sm:hidden">{short}</span>
        <span className="hidden sm:inline">{label}</span>
      </div>
      <motion.div className={`num mt-0.5 truncate text-sm font-semibold sm:text-base ${className}`}>{value}</motion.div>
    </div>
  );
}

export function HowItWorks() {
  const { t } = useT();
  const { protocol: p } = useAppConfig();
  const r = p.revenue.bnbSplitBps;
  const steps: Step[] = [
    {
      kicker: t("Pick a pool"),
      title: t("Any PancakeSwap pair"),
      body: t("BNB, stablecoins, memecoins, Stock Tokens or any token address. If the pool doesn't exist yet, Qudao creates it in the same transaction."),
      status: t("Choosing a pool"),
      tone: "gold",
    },
    {
      kicker: t("Set your range"),
      title: t("Your range, your rule"),
      body: t("Drag the range over the pool's real liquidity, see what it would have earned in the last 30 days, and choose what happens when the price moves."),
      status: t("Setting the range"),
      tone: "info",
    },
    {
      kicker: t("Kept in range"),
      title: t("It moves when the price moves"),
      body: t("A position only earns while the price is inside its range. When the price leaves, Qudao checks it against Chainlink and moves the range back around it."),
      status: t("Kept in range"),
      tone: "up",
      link: { to: "/liquidity", label: t("Find a pool") },
    },
    {
      kicker: t("Fees and CAKE"),
      title: t("Reinvested, or yours to claim"),
      body: t("Fees go back into the position once they're worth it; the rest waits for you, or comes as BNB. Farm pools earn CAKE on top. Qudao's fee: {fee} of what you earn.", { fee: bps(p.fees.protocolFeeBps) }),
      status: t("Earning"),
      tone: "gold",
    },
    {
      kicker: t("The Well"),
      title: t("Stake QDAO, pay less"),
      body: t("No lock. Stakers earn {share} of revenue in BNB, streamed every second, and pay up to {off} less fee with up to {boost}× the rewards.", { share: bps(r.well), off: bps(p.staking.discountBps[3][3]), boost: (p.staking.boostBps[3][3] / 10_000).toFixed(0) }),
      status: t("Staked"),
      tone: "info",
      link: { to: "/staking", label: t("Go to The Well") },
    },
    {
      kicker: t("Buyback & burn"),
      title: t("Revenue in, supply down"),
      body: t("{share} of revenue buys QDAO back and burns it: first on the flap.sh curve, then on PancakeSwap. Every burn is public.", { share: bps(r.buyback) }),
      status: t("Burning"),
      tone: "fire",
      link: { to: "/token", label: t("See the numbers") },
    },
  ];
  const n = steps.length;
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const [active, setActive] = useState(0);
  const chips = useRef<HTMLOListElement>(null);
  useMotionValueEvent(scrollYProgress, "change", (v) => {
    const i = Math.min(n - 1, Math.max(0, Math.floor(v * n)));
    if (i === active) return;
    setActive(i);
    // keep the active step's chip visible on small screens (scrolls the chip row only, not the page)
    const row = chips.current;
    const chip = row?.querySelector<HTMLElement>(`[data-step="${i}"]`);
    if (row && chip) row.scrollTo({ left: chip.offsetLeft - row.clientWidth / 2 + chip.clientWidth / 2, behavior: "smooth" });
  });

  const local = (from: number) => (v: number) => clamp(v * n - from);
  const fees = useTransform(scrollYProgress, (v) => `$${(clamp((v * n - 2) / (n - 2)) * 186.42).toFixed(2)}`);
  const moves = useTransform(scrollYProgress, (v) => `${v * n < 2 ? 0 : movesAt(headAt(local(2)(v)))}×`);
  const cake = useTransform(scrollYProgress, (v) => (local(3)(v) * 12.4).toFixed(1));
  const burned = useTransform(scrollYProgress, (v) => `${(clamp(local(5)(v) / 0.9) * 1.24).toFixed(2)}M`);
  const rail = useTransform(scrollYProgress, [0, 1], [0, 1]);

  const go = (i: number) => {
    const el = ref.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: top + (el.offsetHeight - window.innerHeight) * ((i + 0.3) / n), behavior: "smooth" });
  };

  const scenes: ((pr: MotionValue<number>) => ReactNode)[] = [
    (pr) => <PickPool progress={pr} />,
    (pr) => <SetRange progress={pr} />,
    (pr) => <KeptInRange progress={pr} />,
    (pr) => <FeesCake progress={pr} feeText={t("Qudao's fee: {fee} of fees, never your deposit", { fee: bps(p.fees.protocolFeeBps) })} />,
    (pr) => <Well progress={pr} />,
    (pr) => <Burn progress={pr} split={r} />,
  ];
  const s = steps[active];

  return (
    <section ref={ref} id="how" aria-label={t("How Qudao works")} className="relative" style={{ height: `${n * 75 + 100}vh` }}>
      <div className="sticky top-16 flex h-[calc(100dvh-4rem)] items-center overflow-hidden">
        <div className="mx-auto grid w-full max-w-7xl grid-cols-[minmax(0,1fr)] gap-6 px-4 sm:px-6 lg:grid-cols-[minmax(300px,380px)_minmax(0,1fr)] lg:gap-14">
          {/* steps: a vertical rail on desktop, chips on small screens */}
          <div className="flex min-w-0 flex-col justify-center">
            <div className="label text-gold">{t("How it works")}</div>
            <h2 className="mt-2 hidden text-3xl font-semibold lg:block">{t("From deposit to burn, on autopilot.")}</h2>
            <ol ref={chips} className="scrollbar-none mt-4 flex gap-2 overflow-x-auto lg:hidden">
              {steps.map((st, i) => (
                <li key={st.kicker} className="shrink-0" data-step={i}>
                  <button
                    onClick={() => go(i)}
                    aria-current={i === active ? "step" : undefined}
                    className={`relative overflow-hidden rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${i === active ? "border-gold/60 text-gold-2" : i < active ? "border-line-2 text-fg-2" : "border-line text-mute"}`}
                  >
                    {String(i + 1).padStart(2, "0")} {st.kicker}
                  </button>
                </li>
              ))}
            </ol>
            <div className="relative mt-8 hidden lg:block">
              <div className="absolute top-2 bottom-2 left-[15px] w-px bg-line" />
              <motion.div className="absolute top-2 bottom-2 left-[15px] w-px origin-top bg-gradient-to-b from-gold-2 to-gold" style={{ scaleY: rail }} />
              <ol className="relative space-y-1">
                {steps.map((st, i) => {
                  const on = i === active;
                  return (
                    <li key={st.kicker}>
                      <button onClick={() => go(i)} aria-current={on ? "step" : undefined} className="group flex w-full gap-4 rounded-2xl py-2 pr-2 text-left">
                        <span
                          className={`num relative z-10 grid size-8 shrink-0 place-items-center rounded-full border text-xs font-semibold transition-all duration-500 ${
                            on ? "border-gold bg-gold text-gold-ink shadow-[0_0_0_6px_rgb(240_185_11/0.15)]" : i < active ? "border-gold/60 bg-ink text-gold-2" : "border-line-2 bg-ink text-mute group-hover:text-fg"
                          }`}
                        >
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <span className="min-w-0 pt-1">
                          <span className={`block text-xs font-medium tracking-[0.08em] uppercase transition-colors ${on ? "text-gold" : "text-mute"}`}>{st.kicker}</span>
                          <span className={`block font-display text-lg font-semibold transition-colors ${on ? "text-fg" : "text-fg-2/70 group-hover:text-fg-2"}`}>{st.title}</span>
                          <AnimatePresence initial={false}>
                            {on && (
                              <motion.span
                                className="block overflow-hidden"
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.45, ease: EASE }}
                              >
                                <span className="block pt-2 text-sm leading-relaxed text-fg-2">{st.body}</span>
                                {st.link && (
                                  <Link to={st.link.to} onClick={(e) => e.stopPropagation()} className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-gold-2 hover:underline">
                                    {st.link.label} <ArrowRight className="size-3.5" />
                                  </Link>
                                )}
                              </motion.span>
                            )}
                          </AnimatePresence>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            </div>
          </div>

          {/* the live vault */}
          <div className="min-w-0">
            <div className="relative overflow-hidden rounded-[28px] border border-line-2 bg-panel shadow-[0_30px_80px_-30px_rgb(0_0_0/0.8)]">
              <motion.div aria-hidden className="pointer-events-none absolute inset-0" animate={{ background: GLOW[s.tone] }} transition={{ duration: 0.8, ease: EASE }} />
              <div aria-hidden className="grid-bg pointer-events-none absolute inset-0 opacity-60" />
              <div className="relative flex items-center justify-between gap-3 border-b border-line/80 px-4 py-3 sm:px-5">
                <div className="flex items-center gap-2 text-sm">
                  <Lock className="size-4 text-gold" />
                  <span className="font-semibold">{t("Your vault")}</span>
                  <span className="hidden text-mute sm:inline">{t("· BNB / USDT · PancakeSwap v3")}</span>
                </div>
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={s.status}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.3, ease: EASE }}
                    className={`inline-flex items-center gap-1.5 rounded-full border bg-ink/60 px-2.5 py-1 text-xs font-medium ${STATUS_TONE[s.tone]}`}
                  >
                    <span className="relative flex size-1.5">
                      <span className="absolute inline-flex size-full animate-ping rounded-full bg-current opacity-60" />
                      <span className="relative inline-flex size-1.5 rounded-full bg-current" />
                    </span>
                    {s.status}
                  </motion.span>
                </AnimatePresence>
              </div>
              {/* every scene is drawn in the same 16:10 frame, sized to fit the screen's height */}
              <div className="relative mx-auto aspect-[16/10] w-full" style={{ maxWidth: "min(100%, calc((100dvh - 17rem) * 1.6))" }}>
                <AnimatePresence initial={false}>
                  <SceneSlot key={active} i={active} n={n} scroll={scrollYProgress} render={scenes[active]} />
                </AnimatePresence>
              </div>
              <div className="relative grid grid-cols-4 gap-3 border-t border-line/80 px-4 py-3 sm:px-5">
                <Counter label={t("Fees earned")} short={t("Fees")} value={fees} className="text-up" />
                <Counter label={t("Range moved")} short={t("Moves")} value={moves} />
                <Counter label={t("CAKE farmed")} short="CAKE" value={cake} className="text-gold-2" />
                <Counter label={t("QDAO burned")} short={t("Burned")} value={burned} className="text-[#ff7a45]" />
              </div>
            </div>
            {/* the active step's words under the panel on small screens */}
            <div className="mt-4 min-h-[7.5rem] lg:hidden">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div key={active} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.35, ease: EASE }}>
                  <h3 className="text-xl font-semibold">{s.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-fg-2">{s.body}</p>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
