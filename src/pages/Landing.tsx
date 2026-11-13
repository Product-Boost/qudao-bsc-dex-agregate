// Landing page.
import { useEffect, useRef, type MouseEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "react-router-dom";
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import { ArrowDown, ArrowRight, Check, Eye, KeyRound, Lock, PauseCircle, ScanSearch, ShieldCheck, Timer, X } from "lucide-react";
import { ButtonLink, Card } from "../components/ui";
import { TokenIcon } from "../components/TokenIcon";
import { CountUp, Marquee, Reveal, Spotlight, Stagger, StaggerItem, WordsReveal } from "../components/motion";
import { EASE } from "../lib/ease";
import { HowItWorks } from "../components/how/HowItWorks";
import { HeroChart } from "../components/hero/HeroChart";
import { api } from "../lib/api";
import { useAppConfig } from "../lib/config";
import { bps, pct, usd } from "../lib/format";
import { ROADMAP } from "../data/roadmap";

/** The hero card tilts a little toward the cursor. */
function TiltCard({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rx = useSpring(useTransform(my, [-0.5, 0.5], [6, -6]), { stiffness: 120, damping: 18 });
  const ry = useSpring(useTransform(mx, [-0.5, 0.5], [-8, 8]), { stiffness: 120, damping: 18 });
  const move = (e: MouseEvent<HTMLDivElement>) => {
    if (reduce) return;
    const r = ref.current!.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
  };
  return (
    <div style={{ perspective: 1200 }}>
      <motion.div
        ref={ref}
        onMouseMove={move}
        onMouseLeave={() => (mx.set(0), my.set(0))}
        style={{ rotateX: rx, rotateY: ry, transformStyle: "preserve-3d" }}
        initial={{ opacity: 0, y: 40, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 1, ease: EASE, delay: 0.25 }}
      >
        {children}
      </motion.div>
    </div>
  );
}

const PAIRS = [
  ["BNB", "USDT"],
  ["CAKE", "BNB"],
  ["BTCB", "USDT"],
  ["ETH", "BNB"],
  ["USDT", "USDC"],
  ["NVDA", "USDT"],
  ["TSLA", "USDT"],
  ["SPY", "USDT"],
  ["BTCB", "BNB"],
] as const;

const SAFETY = [
  { icon: KeyRound, title: "Your vault, your keys", body: "Each position is its own contract owned by your wallet. Only you can withdraw." },
  { icon: ScanSearch, title: "Price checked every move", body: "Chainlink first, then the pool's own average. A move on a bad price is refused." },
  { icon: Timer, title: "48-hour timelock", body: "Every change to the contracts is public for two days before it can happen." },
  { icon: PauseCircle, title: "Pause never traps you", body: "In an emergency new positions stop, but closing and withdrawing always work." },
  { icon: Lock, title: "Exact-amount deposits", body: "Permit2 signatures for the exact amount, valid 30 minutes. No open-ended approvals." },
  { icon: Eye, title: "Every number public", body: "Revenue, burns, reserves and every payment are read from the chain and shown." },
];

export default function Landing() {
  const { protocol } = useAppConfig();
  const pools = useQuery({ queryKey: ["pools"], queryFn: api.pools });
  const stats = useQuery({ queryKey: ["protocol"], queryFn: api.protocol });
  const best = (pools.data?.pools ?? []).filter((p) => p.estAprPct !== null && p.group === "popular").sort((a, b) => (b.estAprPct ?? 0) - (a.estAprPct ?? 0))[0];
  const split = protocol.revenue.bnbSplitBps;
  const toHow = () => document.getElementById("how")?.scrollIntoView({ behavior: "smooth" });
  const { hash } = useLocation();
  useEffect(() => {
    if (hash !== "#how") return;
    const t = setTimeout(() => document.getElementById("how")?.scrollIntoView({ behavior: "smooth" }), 150);
    return () => clearTimeout(t);
  }, [hash]);

  return (
    <div>
      {/* hero */}
      <section className="grid-bg relative overflow-hidden border-b border-line/60">
        <div className="animate-drift pointer-events-none absolute -top-48 right-[-12%] size-[720px] rounded-full bg-gold/15 blur-[130px]" />
        <div className="animate-drift pointer-events-none absolute -bottom-64 left-[-10%] size-[520px] rounded-full bg-gold-3/10 blur-[120px] [animation-delay:-8s]" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:py-28">
          <div>
            <motion.span
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: EASE }}
              className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/[0.07] px-3 py-1 text-xs font-medium text-gold-2"
            >
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-gold opacity-70" />
                <span className="relative inline-flex size-1.5 rounded-full bg-gold" />
              </span>
              Built on PancakeSwap v3 · BNB Chain
            </motion.span>
            <h1 className="mt-6 text-5xl leading-[1.05] font-semibold sm:text-6xl">
              <WordsReveal text="Your liquidity," delay={0.1} />
              <br />
              <WordsReveal text="always in range." delay={0.3} wordClassName="gold-text" />
            </h1>
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: EASE, delay: 0.55 }}
              className="mt-6 max-w-xl text-lg leading-relaxed text-fg-2"
            >
              Narrow ranges earn the most, until the price walks away. Qudao moves your PancakeSwap range back around the price, reinvests the fees and farms CAKE, while your funds stay in a vault only you control.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: EASE, delay: 0.7 }}
              className="mt-8 flex flex-wrap gap-3"
            >
              <ButtonLink to="/app" size="lg" className="sheen">
                Launch app <ArrowRight className="size-4" />
              </ButtonLink>
              <button onClick={toHow} className="inline-flex h-12 items-center gap-2 rounded-xl border border-line-2 px-6 font-semibold text-fg transition-colors hover:border-gold/60 hover:text-gold-2">
                See how it works <ArrowDown className="size-4" />
              </button>
            </motion.div>
          </div>
          <TiltCard>
            <Card className="p-5 shadow-[var(--shadow-glow)]">
              <HeroChart />
            </Card>
          </TiltCard>
        </div>
      </section>

      {/* live numbers + pairs */}
      <section className="border-b border-line/60 bg-ink-2">
        <Stagger className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-4 py-9 sm:px-6 md:grid-cols-4">
          {[
            { label: "Best est. APR right now", node: best ? <CountUp value={best.estAprPct ?? 0} format={(n) => pct(n)} /> : "—", sub: best ? `${best.token0.symbol}/${best.token1.symbol}, ±5% range` : "pools loading" },
            { label: "Managed by Qudao", node: <CountUp value={stats.data?.managed?.tvlUsd ?? 0} format={(n) => usd(n, { compact: true })} />, sub: `${stats.data?.managed?.positions ?? 0} positions` },
            { label: "Ranges moved", node: <CountUp value={stats.data?.managed?.moves30d ?? 0} format={(n) => Math.round(n).toString()} />, sub: "last 30 days" },
            { label: "Qudao's fee", node: bps(protocol.fees.protocolFeeBps), sub: "of what you earn, never your deposit" },
          ].map((s) => (
            <StaggerItem key={s.label}>
              <div className="label">{s.label}</div>
              <div className="num mt-1.5 text-3xl font-semibold">{s.node}</div>
              <div className="mt-0.5 text-xs text-mute">{s.sub}</div>
            </StaggerItem>
          ))}
        </Stagger>
        <Marquee className="border-t border-line/60 py-4" speed={45}>
          {PAIRS.map(([a, b]) => (
            <span key={a + b} className="flex items-center gap-2.5 text-sm text-fg-2">
              <span className="inline-flex">
                <TokenIcon symbol={a} size={22} className="ring-2 ring-ink-2" />
                <TokenIcon symbol={b} size={22} className="-ml-2 ring-2 ring-ink-2" />
              </span>
              {a} / {b}
            </span>
          ))}
        </Marquee>
      </section>

      <HowItWorks />

      {/* comparison */}
      <section className="mx-auto max-w-7xl px-4 py-28 sm:px-6">
        <Reveal>
          <h2 className="text-center text-4xl font-semibold sm:text-5xl">Same pool. More earned.</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-fg-2">A narrow range earns many times more per dollar, but only while the price is inside it. The difference is who's watching.</p>
        </Reveal>
        <div className="mt-14 grid gap-6 md:grid-cols-2">
          <Reveal>
            <Card className="h-full p-7">
              <h3 className="text-xl font-semibold text-fg-2">Doing it yourself</h3>
              <Stagger as="ul" className="mt-5 space-y-3 text-sm text-fg-2">
                {["Check the chart all day", "Withdraw, swap and deposit again by hand every time it leaves", "Re-stake in the farm after every change", "Pick a wide range to sleep at night, earn a fraction", "Fees sit idle until you remember them"].map((t) => (
                  <StaggerItem as="li" key={t} className="flex gap-3">
                    <X className="mt-0.5 size-4 shrink-0 text-down" /> {t}
                  </StaggerItem>
                ))}
              </Stagger>
            </Card>
          </Reveal>
          <Reveal delay={0.12}>
            <Card hi className="relative h-full overflow-hidden p-7">
              <div aria-hidden className="pointer-events-none absolute -top-24 -right-24 size-64 rounded-full bg-gold/15 blur-3xl" />
              <h3 className="relative text-xl font-semibold">With Qudao</h3>
              <Stagger as="ul" className="relative mt-5 space-y-3 text-sm text-fg">
                {["Range moved back around the price automatically", "Swaps checked against Chainlink before every move", "Staked in the CAKE farm automatically", "Run a narrow range without watching it", "Fees reinvested once they're worth it, or ready to claim as BNB"].map((t) => (
                  <StaggerItem as="li" key={t} className="flex gap-3">
                    <Check className="mt-0.5 size-4 shrink-0 text-up" /> {t}
                  </StaggerItem>
                ))}
              </Stagger>
            </Card>
          </Reveal>
        </div>
      </section>

      {/* safety */}
      <section className="border-y border-line/60 bg-ink-2">
        <div className="mx-auto max-w-7xl px-4 py-28 sm:px-6">
          <Reveal>
            <div className="label text-gold">Safety</div>
            <h2 className="mt-2 max-w-2xl text-4xl font-semibold sm:text-5xl">Built so you stay in control.</h2>
          </Reveal>
          <Stagger className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {SAFETY.map((f) => (
              <StaggerItem key={f.title}>
                <Spotlight className="card h-full p-6 transition-transform duration-300 hover:-translate-y-1">
                  <div className="relative grid size-11 place-items-center rounded-xl bg-gold/12 text-gold transition-transform duration-300 group-hover:scale-110">
                    <f.icon className="size-5" />
                  </div>
                  <h3 className="relative mt-5 font-semibold">{f.title}</h3>
                  <p className="relative mt-2 text-sm leading-relaxed text-mute">{f.body}</p>
                </Spotlight>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* token */}
      <section className="mx-auto max-w-7xl px-4 py-28 sm:px-6">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <Reveal>
            <h2 className="text-4xl font-semibold sm:text-5xl">
              Back Qudao. <span className="gold-text">Get paid back.</span>
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-fg-2">
              Qudao earns a small share of what positions earn and of in-app swaps. That revenue is turned into BNB every hour and shared out: stakers in The Well receive {bps(split.well)}, and {bps(split.buyback)} buys QDAO back and burns it.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink to="/staking">Stake in The Well</ButtonLink>
              <ButtonLink to="/token" variant="ghost">
                See every number
              </ButtonLink>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <Card className="p-7">
              <div className="label">Where each BNB of revenue goes</div>
              {[
                { label: "Stakers (The Well)", v: split.well, c: "var(--color-gold)" },
                { label: "Buyback & burn", v: split.buyback, c: "#ff7a45" },
                { label: "Safety fund", v: split.safetyFund, c: "var(--color-info)" },
                { label: "Team", v: split.team, c: "#a78bfa" },
                { label: "Boosted pools", v: split.boostReserve, c: "var(--color-up)" },
              ].map((r, i) => (
                <div key={r.label} className="mt-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-fg-2">{r.label}</span>
                    <span className="num font-semibold">{bps(r.v)}</span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-panel-3">
                    <motion.div
                      className="h-2 rounded-full"
                      style={{ background: r.c }}
                      initial={{ width: 0 }}
                      whileInView={{ width: `${r.v / 100}%` }}
                      viewport={{ once: true, margin: "0px 0px -10% 0px" }}
                      transition={{ duration: 1.1, ease: EASE, delay: 0.15 + i * 0.1 }}
                    />
                  </div>
                </div>
              ))}
              <p className="mt-5 flex items-center gap-2 text-xs text-mute">
                <ShieldCheck className="size-4 text-up" /> Every contract is owned by a {protocol.governance.timelockHours}-hour timelock.
              </p>
            </Card>
          </Reveal>
        </div>
      </section>

      {/* roadmap preview */}
      <section className="border-t border-line/60 bg-ink-2">
        <div className="mx-auto max-w-7xl px-4 py-28 sm:px-6">
          <Reveal className="flex flex-wrap items-end justify-between gap-4">
            <h2 className="text-4xl font-semibold sm:text-5xl">Where Qudao is going</h2>
            <Link to="/roadmap" className="group inline-flex items-center gap-1 text-sm text-gold-2">
              Full roadmap <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </Reveal>
          <Stagger className="mt-12 grid gap-4 md:grid-cols-3">
            {ROADMAP.slice(0, 6).map((p, i) => (
              <StaggerItem key={p.title}>
                <Spotlight className={`${p.status === "now" ? "card-hi" : "card"} h-full p-6`}>
                  <div className="num relative text-sm text-mute">0{i + 1}</div>
                  <h3 className="relative mt-2 text-lg font-semibold">{p.title}</h3>
                  <p className="relative mt-1 text-sm text-mute">{p.summary}</p>
                </Spotlight>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 py-28 sm:px-6">
        <Reveal>
          <Card hi className="relative overflow-hidden p-10 text-center sm:p-16">
            <div className="animate-drift pointer-events-none absolute -bottom-40 left-1/2 size-[560px] -translate-x-1/2 rounded-full bg-gold/15 blur-[110px]" />
            <h2 className="relative text-4xl font-semibold sm:text-5xl">Your tokens could be earning right now.</h2>
            <p className="relative mx-auto mt-4 max-w-xl text-fg-2">Pick a pool, set a range, deposit. Qudao takes care of the rest.</p>
            <div className="relative mt-8 flex justify-center">
              <ButtonLink to="/liquidity" size="lg" className="sheen">
                Find a pool <ArrowRight className="size-4" />
              </ButtonLink>
            </div>
          </Card>
        </Reveal>
      </section>
    </div>
  );
}
