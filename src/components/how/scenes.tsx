// The six scenes of "How it works". Each gets the scroll progress through its own step (0 → 1) and animates
// from it, so the story plays forward and backward with the reader's scroll.
import { motion, useReducedMotion, useTransform, type MotionValue } from "motion/react";
import { Check, Flame, MousePointer2, Sprout } from "lucide-react";
import { TokenIcon } from "../TokenIcon";
import { EASE } from "../../lib/ease";
import { BAND_HALF, BANDS, H, headAt, pointAt, PRICE_D, W } from "./data";

type P = { progress: MotionValue<number> };

const enter = (i: number) => ({
  initial: { opacity: 0, y: 18, scale: 0.97 },
  animate: { opacity: 1, y: 0, scale: 1 },
  transition: { duration: 0.6, ease: EASE, delay: 0.08 * i },
});

// ------------------------------------------------------------------ 1. pick a pool

const POOLS = [
  { a: "BNB", b: "USDT", fee: "0.05%", tag: "38% est. APR", farm: false },
  { a: "CAKE", b: "BNB", fee: "0.25%", tag: "CAKE farm", farm: true },
  { a: "NVDA", b: "USDT", fee: "0.25%", tag: "Stock Token", farm: false },
  { a: "?", b: "BNB", fee: "any", tag: "Paste an address", farm: false },
];

export function PickPool({ progress }: P) {
  const pick = useTransform(progress, [0.25, 0.45], [0, 1]);
  const border = useTransform(pick, [0, 1], ["rgba(44,43,50,1)", "rgba(240,185,11,0.9)"]);
  const glow = useTransform(pick, [0, 1], ["0 0 0 0 rgba(240,185,11,0)", "0 0 0 6px rgba(240,185,11,0.12)"]);
  const scale = useTransform(pick, [0, 1], [1, 1.03]);
  const check = useTransform(pick, [0.6, 1], [0, 1]);
  const cursorX = useTransform(progress, [0, 0.3], ["78%", "34%"]);
  const cursorY = useTransform(progress, [0, 0.3], ["86%", "34%"]);
  const cursorO = useTransform(progress, [0, 0.05, 0.55, 0.7], [0, 1, 1, 0]);
  const dim = useTransform(pick, [0, 1], [1, 0.45]);
  const next = useTransform(progress, [0.6, 0.85], [0, 1]);
  const nextY = useTransform(next, [0, 1], [16, 0]);
  return (
    <div className="relative h-full p-4 sm:p-7">
      <div className="grid grid-cols-2 gap-2 sm:h-[70%] sm:gap-4">
        {POOLS.map((pool, i) => (
          <motion.div
            key={pool.a + pool.b}
            {...enter(i)}
            style={i === 0 ? { borderColor: border, boxShadow: glow, scale } : { opacity: dim }}
            className="relative flex min-w-0 flex-col justify-between gap-1.5 rounded-xl border border-line bg-ink-2/80 p-2.5 sm:rounded-2xl sm:p-4"
          >
            <div className="flex items-center gap-2">
              <span className="inline-flex">
                {pool.a === "?" ? (
                  <span className="grid size-6 place-items-center rounded-full border border-dashed border-line-2 text-[10px] text-mute">0x</span>
                ) : (
                  <TokenIcon symbol={pool.a} size={24} className="ring-2 ring-ink-2" />
                )}
                <TokenIcon symbol={pool.b} size={24} className="-ml-2 ring-2 ring-ink-2" />
              </span>
              <span className="truncate text-xs font-semibold sm:text-sm">{pool.a === "?" ? "Any token" : `${pool.a} / ${pool.b}`}</span>
            </div>
            <div className="flex items-center justify-between gap-1 text-[10px] whitespace-nowrap sm:text-xs">
              <span className="rounded-full bg-panel-3 px-1.5 py-0.5 text-fg-2 sm:px-2">{pool.fee}</span>
              <span className={`inline-flex min-w-0 items-center gap-1 truncate ${pool.farm ? "text-gold-2" : i === 2 ? "text-info" : "text-mute"}`}>
                {pool.farm && <Sprout className="size-3" />}
                {pool.tag}
              </span>
            </div>
            {i === 0 && (
              <motion.span style={{ opacity: check, scale: check }} className="absolute -top-2 -right-2 grid size-6 place-items-center rounded-full bg-gold text-gold-ink shadow-lg">
                <Check className="size-3.5" strokeWidth={3} />
              </motion.span>
            )}
          </motion.div>
        ))}
      </div>
      <motion.div style={{ opacity: next, y: nextY }} className="mt-2 flex items-center justify-between rounded-xl border border-gold/30 bg-gold/[0.07] px-3 py-2 text-xs sm:mt-4 sm:px-4 sm:py-3 sm:text-sm">
        <span className="text-fg-2"><span className="hidden sm:inline">PancakeSwap v3 · </span>BNB / USDT 0.05%</span>
        <span className="font-semibold text-gold-2">Selected</span>
      </motion.div>
      <motion.span style={{ left: cursorX, top: cursorY, opacity: cursorO }} className="pointer-events-none absolute z-10 text-fg drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)]">
        <MousePointer2 className="size-5 fill-fg" />
      </motion.span>
    </div>
  );
}

// ------------------------------------------------------------------ 2. set your range

const BARS = Array.from({ length: 44 }, (_, i) => {
  const x = (i - 21.5) / 9;
  const h = Math.exp(-x * x) * 0.85 + 0.12 * Math.abs(Math.sin(i * 1.7));
  return Math.max(0.08, Math.min(1, h));
});
const BAR_W = W / BARS.length;
const CENTER = W / 2;

function Bar({ i, h, half }: { i: number; h: number; half: MotionValue<number> }) {
  const x = i * BAR_W;
  const mid = x + BAR_W / 2;
  const fill = useTransform(half, (hw) => (Math.abs(mid - CENTER) <= hw ? "var(--color-gold)" : "var(--color-panel-3)"));
  const height = h * 180;
  return (
    <motion.rect
      x={x + 2}
      width={BAR_W - 4}
      rx={2}
      initial={{ y: H - 40, height: 0 }}
      animate={{ y: H - 40 - height, height }}
      transition={{ duration: 0.8, ease: EASE, delay: 0.015 * i }}
      style={{ fill }}
      opacity={0.85}
    />
  );
}

export function SetRange({ progress }: P) {
  const half = useTransform(progress, [0.05, 0.75], [250, 70]);
  const left = useTransform(half, (h) => CENTER - h);
  const width = useTransform(half, (h) => h * 2);
  const right = useTransform(half, (h) => CENTER + h - 6);
  const pct = useTransform(half, (h) => `±${((h / 250) * 18).toFixed(1)}%`);
  const apr = useTransform(half, (h) => `${Math.round(9 + (250 - h) * 0.2)}%`);
  return (
    <div className="relative h-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full" aria-hidden>
        {BARS.map((h, i) => (
          <Bar key={i} i={i} h={h} half={half} />
        ))}
        <motion.rect x={0} y={40} height={H - 80} width={width} style={{ x: left }} fill="rgb(240 185 11 / 0.08)" />
        <motion.rect x={0} y={40} width={6} height={H - 80} rx={3} style={{ x: left }} fill="var(--color-gold)" />
        <motion.rect x={0} y={40} width={6} height={H - 80} rx={3} style={{ x: right }} fill="var(--color-gold)" />
        <line x1={CENTER} x2={CENTER} y1={28} y2={H - 30} stroke="var(--color-fg)" strokeDasharray="4 5" opacity={0.7} />
        <line x1={0} x2={W} y1={H - 40} y2={H - 40} stroke="var(--color-line-2)" />
      </svg>
      <div className="absolute top-2 left-3 rounded-lg border border-line bg-ink/80 px-2 py-1 backdrop-blur sm:top-4 sm:left-5 sm:rounded-xl sm:px-3 sm:py-2">
        <div className="label text-[9px] sm:text-xs">Range</div>
        <motion.div className="num text-sm font-semibold text-gold-2 sm:text-lg">{pct}</motion.div>
      </div>
      <div className="absolute top-2 right-3 rounded-lg border border-line bg-ink/80 px-2 py-1 text-right backdrop-blur sm:top-4 sm:right-5 sm:rounded-xl sm:px-3 sm:py-2">
        <div className="label text-[9px] sm:text-xs">Est. APR</div>
        <motion.div className="num text-sm font-semibold text-up sm:text-lg">{apr}</motion.div>
      </div>
      <div className="absolute inset-x-0 bottom-1 text-center text-[10px] text-mute sm:bottom-2 sm:text-xs">Liquidity by price · now</div>
    </div>
  );
}

// ------------------------------------------------------------------ 3. kept in range

function Band({ band, i, head }: { band: (typeof BANDS)[number]; i: number; head: MotionValue<number> }) {
  const o = useTransform(head, [band.x0 - 2, band.x0 + 14], [0, 1]);
  const s = useTransform(head, [band.x0 - 2, band.x0 + 14], [0.6, 1]);
  return (
    <g>
      <motion.rect x={band.x0} y={band.c - BAND_HALF} width={band.x1 - band.x0} height={BAND_HALF * 2} rx={8} style={{ opacity: o, scaleY: s, transformOrigin: `${band.x0}px ${band.c}px` }} fill="rgb(46 189 133 / 0.12)" stroke="rgb(46 189 133 / 0.45)" strokeDasharray="5 5" />
      {i > 0 && (
        <motion.g style={{ opacity: o }}>
          <circle cx={band.x0} cy={band.c} r={16} fill="none" stroke="var(--color-gold)" strokeWidth={1.5} opacity={0.6} />
          <circle cx={band.x0} cy={band.c} r={5} fill="var(--color-gold)" />
        </motion.g>
      )}
    </g>
  );
}

function MoveChip({ band, head }: { band: (typeof BANDS)[number]; head: MotionValue<number> }) {
  const o = useTransform(head, [band.x0, band.x0 + 18], [0, 1]);
  const y = useTransform(o, [0, 1], [8, 0]);
  return (
    <motion.div
      style={{ left: `${(band.x0 / W) * 100}%`, top: `${((band.c - BAND_HALF - 30) / H) * 100}%`, opacity: o, y }}
      className="absolute -translate-x-1/2 rounded-full border border-gold/40 bg-ink/90 px-2.5 py-1 text-[11px] whitespace-nowrap text-gold-2 shadow-lg"
    >
      Range moved
    </motion.div>
  );
}

export function KeptInRange({ progress }: P) {
  const t = useTransform(progress, headAt);
  const head = useTransform(t, (v) => pointAt(v).x);
  const headY = useTransform(t, (v) => pointAt(v).y);
  return (
    <div className="relative h-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full" aria-hidden>
        <defs>
          <linearGradient id="how-line" x1="0" x2="1">
            <stop offset="0" stopColor="#ffe27a" />
            <stop offset="1" stopColor="#f0b90b" />
          </linearGradient>
          <clipPath id="how-clip">
            <motion.rect x={0} y={0} height={H} width={head} />
          </clipPath>
        </defs>
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1={0} x2={W} y1={H * f} y2={H * f} stroke="var(--color-line)" strokeDasharray="3 6" />
        ))}
        {BANDS.map((b, i) => (
          <Band key={i} band={b} i={i} head={head} />
        ))}
        <path d={PRICE_D} fill="none" stroke="var(--color-line-2)" strokeWidth={1.5} opacity={0.45} />
        <path d={PRICE_D} fill="none" stroke="url(#how-line)" strokeWidth={2.6} strokeLinejoin="round" clipPath="url(#how-clip)" />
        <motion.circle r={14} fill="var(--color-gold)" opacity={0.18} cx={head} cy={headY} />
        <motion.circle r={6} fill="var(--color-gold-2)" cx={head} cy={headY} />
      </svg>
      {BANDS.slice(1).map((b, i) => (
        <MoveChip key={i} band={b} head={head} />
      ))}
    </div>
  );
}

// ------------------------------------------------------------------ 4. fees and CAKE

// boxes sit at fixed spots of the 640×400 frame and the flows run between their edges
const FLOW = "M206,188 C280,96 352,96 424,170";
const FLOW2 = "M206,214 C280,300 352,300 424,232";

export function FeesCake({ progress, feeText }: P & { feeText: string }) {
  const reduce = useReducedMotion();
  const reinvest = useTransform(progress, [0.1, 0.7], ["0%", "70%"]);
  const claim = useTransform(progress, [0.3, 0.8], ["0%", "30%"]);
  const value = useTransform(progress, (p) => `$${(1000 + p * 186).toFixed(2)}`);
  const cake = useTransform(progress, (p) => `+${(p * 12.4).toFixed(1)}`);
  return (
    <div className="relative h-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full" aria-hidden>
        <path d={FLOW} fill="none" stroke="rgb(240 185 11 / 0.25)" strokeWidth={2} strokeDasharray="4 6" />
        <path d={FLOW2} fill="none" stroke="rgb(46 189 133 / 0.25)" strokeWidth={2} strokeDasharray="4 6" />
        {!reduce &&
          [0, 0.6, 1.2, 1.8].map((d) => (
            <circle key={d} r={6} fill="var(--color-gold)">
              <animateMotion dur="2.4s" begin={`-${d}s`} repeatCount="indefinite" path={FLOW} />
            </circle>
          ))}
        {!reduce &&
          [0.3, 1.5].map((d) => (
            <circle key={d} r={6} fill="#d1884f">
              <animateMotion dur="2.8s" begin={`-${d}s`} repeatCount="indefinite" path={FLOW2} />
            </circle>
          ))}
      </svg>
      <motion.div {...enter(0)} className="absolute top-[40%] left-[6%] w-[26%] rounded-xl border border-line bg-ink-2/90 p-2 text-center sm:rounded-2xl sm:p-3">
        <div className="label text-[9px] whitespace-nowrap sm:text-xs">Pool fees</div>
        <div className="mt-1 hidden text-sm text-fg-2 sm:block">every swap</div>
      </motion.div>
      <motion.div {...enter(1)} className="absolute top-[33%] left-[66%] w-[30%] rounded-xl border border-gold/40 bg-ink-2/95 p-2 shadow-[var(--shadow-glow)] sm:rounded-2xl sm:p-3">
        <div className="label text-[9px] whitespace-nowrap sm:text-xs">Your position</div>
        <motion.div className="num mt-0.5 text-sm font-semibold sm:mt-1 sm:text-xl">{value}</motion.div>
        <div className="mt-1 hidden items-center gap-1 text-xs text-gold-2 sm:flex">
          <TokenIcon symbol="CAKE" size={14} /> <motion.span className="num">{cake}</motion.span> CAKE farmed
        </div>
      </motion.div>
      <div className="absolute inset-x-[6%] bottom-[7%]">
        <div className="mb-1.5 flex justify-between text-[10px] text-mute sm:text-xs">
          <span>Reinvested<span className="hidden sm:inline"> automatically</span></span>
          <span><span className="hidden sm:inline">Ready </span>to claim</span>
        </div>
        <div className="flex h-2 gap-1 sm:h-2.5 overflow-hidden rounded-full bg-panel-3">
          <motion.div style={{ width: reinvest }} className="h-full rounded-full bg-gold" />
          <motion.div style={{ width: claim }} className="h-full rounded-full bg-up" />
        </div>
        <div className="mt-1.5 hidden text-right text-[11px] text-dim sm:block">{feeText}</div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ 5. The Well

function Cell({ r, c, progress, target }: { r: number; c: number; progress: MotionValue<number>; target: boolean }) {
  const at = (r * 4 + c) / 16;
  const on = useTransform(progress, [at * 0.8, at * 0.8 + 0.08], [0, 1]);
  const bg = useTransform(on, [0, 1], ["rgba(29,28,34,1)", target ? "rgba(240,185,11,1)" : "rgba(240,185,11,0.16)"]);
  const color = useTransform(on, [0, 1], ["#64615a", target ? "#1a1404" : "#fcd535"]);
  const scale = useTransform(on, [0, 0.6, 1], [0.92, 1.04, 1]);
  return (
    <motion.div style={{ backgroundColor: bg, color, scale }} className="num grid place-items-center rounded-lg text-[11px] font-semibold sm:text-xs">
      {(1 + (r + c) * 0.125).toFixed(2)}×
    </motion.div>
  );
}

export function Well({ progress }: P) {
  const fee = useTransform(progress, (p) => `${(2 - Math.min(1, p / 0.85) * 0.74).toFixed(2)}%`);
  const boost = useTransform(progress, (p) => `${(1 + Math.min(1, p / 0.85) * 0.75).toFixed(2)}×`);
  return (
    <div className="flex h-full items-center gap-3 p-4 sm:gap-7 sm:p-7">
      <div className="grid aspect-square h-full max-h-[260px] grid-cols-4 grid-rows-4 gap-1 sm:gap-1.5">
        {Array.from({ length: 16 }, (_, k) => (
          <Cell key={k} r={Math.floor(k / 4)} c={k % 4} progress={progress} target={k === 14} />
        ))}
      </div>
      <div className="min-w-0 flex-1 space-y-2 sm:space-y-4">
        <motion.div {...enter(0)} className="rounded-xl border border-line bg-ink-2/80 p-2.5 sm:rounded-2xl sm:p-4">
          <div className="label text-[9px] whitespace-nowrap sm:text-xs">Your Qudao fee</div>
          <motion.div className="num mt-1 text-lg font-semibold text-up sm:text-2xl">{fee}</motion.div>
        </motion.div>
        <motion.div {...enter(1)} className="rounded-xl border border-line bg-ink-2/80 p-2.5 sm:rounded-2xl sm:p-4">
          <div className="label text-[9px] whitespace-nowrap sm:text-xs">Reward boost</div>
          <motion.div className="num mt-1 text-lg font-semibold text-gold-2 sm:text-2xl">{boost}</motion.div>
        </motion.div>
        <motion.div {...enter(2)} className="hidden items-center gap-2 text-xs text-mute sm:flex">
          <TokenIcon symbol="BNB" size={16} /> BNB streams to stakers every second
        </motion.div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ 6. buyback and burn

const SPLIT = [
  { label: "Stakers", key: "well", color: "var(--color-gold)" },
  { label: "Buyback & burn", key: "buyback", color: "#ff7a45" },
  { label: "Safety fund", key: "safetyFund", color: "var(--color-info)" },
  { label: "Team", key: "team", color: "#a78bfa" },
  { label: "Boosted pools", key: "boostReserve", color: "var(--color-up)" },
] as const;

function SplitSeg({ bps, color, from, progress }: { bps: number; color: string; from: number; progress: MotionValue<number> }) {
  const w = useTransform(progress, [from, from + 0.12], ["0%", `${bps / 100}%`]);
  return <motion.div style={{ width: w, background: color }} className="h-full" />;
}

const BURNS = [
  { bnb: "0.42", qdao: "318,240", when: "6 h ago" },
  { bnb: "0.38", qdao: "296,105", when: "12 h ago" },
  { bnb: "0.51", qdao: "401,877", when: "18 h ago" },
];

function BurnRow({ b, i, progress }: { b: (typeof BURNS)[number]; i: number; progress: MotionValue<number> }) {
  const o = useTransform(progress, [0.25 + i * 0.15, 0.37 + i * 0.15], [0, 1]);
  const x = useTransform(o, [0, 1], [-16, 0]);
  return (
    <motion.div style={{ opacity: o, x }} className={`items-center justify-between rounded-xl border border-line bg-ink-2/80 px-3 py-1.5 text-[11px] sm:py-2 sm:text-xs ${i > 0 ? "hidden sm:flex" : "flex"}`}>
      <span className="flex items-center gap-2 text-fg-2">
        <Flame className="size-3.5 text-[#ff7a45]" /> {b.bnb} BNB bought <span className="num text-fg">{b.qdao} QDAO</span>
      </span>
      <span className="text-mute">{b.when}</span>
    </motion.div>
  );
}

export function Burn({ progress, split }: P & { split: Record<(typeof SPLIT)[number]["key"], number> }) {
  const reduce = useReducedMotion();
  const supply = useTransform(progress, (p) => Math.round(1_000_000_000 - Math.min(1, p / 0.9) * 1_240_000).toLocaleString("en-US"));
  const burned = useTransform(progress, (p) => `${(Math.min(1, p / 0.9) * 1.24).toFixed(2)}M`);
  return (
    <div className="flex h-full flex-col justify-between p-4 sm:p-7">
      <div>
        <div className="label mb-2 hidden sm:block">Each BNB of revenue</div>
        <div className="flex h-3.5 overflow-hidden rounded-full bg-panel-3">
          {SPLIT.map((s, i) => (
            <SplitSeg key={s.key} bps={split[s.key]} color={s.color} from={i * 0.08} progress={progress} />
          ))}
        </div>
        <div className="mt-2 hidden flex-wrap gap-x-4 gap-y-1 text-[11px] text-fg-2 sm:flex">
          {SPLIT.map((s) => (
            <span key={s.key} className="inline-flex items-center gap-1.5">
              <span className="size-2 rounded-sm" style={{ background: s.color }} />
              {s.label} {split[s.key] / 100}%
            </span>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        {BURNS.map((b, i) => (
          <BurnRow key={i} b={b} i={i} progress={progress} />
        ))}
      </div>
      <div className="flex items-center gap-3 sm:gap-5">
        <motion.div
          animate={reduce ? undefined : { scale: [1, 1.08, 0.97, 1.05, 1], rotate: [0, -3, 2, -1, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          className="grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-b from-[#ff7a45]/30 to-[#ff7a45]/5 text-[#ff7a45] shadow-[0_0_40px_-6px_rgba(255,122,69,0.6)] sm:size-20 sm:rounded-3xl"
        >
          <Flame className="size-6 sm:size-10" />
        </motion.div>
        <div className="min-w-0">
          <div className="label">QDAO supply</div>
          <motion.div className="num text-lg font-semibold sm:text-3xl">{supply}</motion.div>
          <div className="mt-1 hidden text-xs text-mute sm:block">
            <motion.span className="num text-[#ff7a45]">{burned}</motion.span> burned, sent to 0x…dEaD
          </div>
        </div>
      </div>
    </div>
  );
}
