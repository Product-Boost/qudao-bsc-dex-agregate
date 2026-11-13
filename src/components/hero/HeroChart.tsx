// The landing hero's chart: a light sweep paints the price line left to right, the ranges appear as it passes,
// and event cards land on a timeline underneath in step. All of it hangs off one drawing head (useHead).
import { useId, type ReactNode } from "react";
import { AnimatePresence, motion, useTransform, type MotionValue } from "motion/react";
import { ArrowDownRight, ArrowUpRight, Check, CircleDot, RefreshCw } from "lucide-react";
import { EASE } from "../../lib/ease";
import { AREA_D, BANDS, H, HALF, LINE_D, priceAt, W, X0, X1, yAt, type Band } from "./data";
import { useHead, useStage } from "./useDraw";
import { useT } from "../../i18n";

const FEES_TOTAL = 48.2; // illustrative fees over the whole story
const BEAM = 70;
const feesAt = (x: number) => ((x - X0) / (X1 - X0)) * FEES_TOTAL;
const rangeText = (b: Band) => `$${priceAt(b.c + HALF).toFixed(0)}–$${priceAt(b.c - HALF).toFixed(0)}`;

const EVENTS = BANDS.map((b) => ({
  title: b.i === 0 ? "Opened" : b.dir > 0 ? "Moved up" : "Moved down",
  short: b.i === 0 ? "Opened" : b.dir > 0 ? "Up" : "Down",
  icon: b.i === 0 ? <CircleDot className="size-3" /> : b.dir > 0 ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />,
  range: rangeText(b),
  fees: feesAt(b.x1) - feesAt(b.x0),
}));

export function HeroChart({ play = true, run = 0 }: { play?: boolean; run?: number }) {
  const { t } = useT();
  const ids = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const head = useHead(play, run, { duration: 5, delay: 0.5 });
  const { stage, done, moving } = useStage(head);
  const reveal = useTransform(head, (x) => Math.max(0, x + 1));
  const beamX = useTransform(head, (x) => x - BEAM);
  const progress = useTransform(head, (x) => `${((x - X0) / (X1 - X0)) * 100}%`);
  const sweeping = play && !done;
  return (
    <>
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold">{t("BNB / USDT · managed range")}</span>
        <span className="relative h-5 min-w-28 text-right text-xs">
          <Status moving={moving} />
        </span>
      </div>

      <div className="relative mt-4 aspect-[560/260]">
        <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 size-full overflow-visible" aria-hidden>
          <defs>
            <linearGradient id={`${ids}-line`} x1="0" x2="1">
              <stop offset="0" stopColor="#ffe27a" />
              <stop offset="1" stopColor="#f0b90b" />
            </linearGradient>
            <linearGradient id={`${ids}-area`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="#f0b90b" stopOpacity="0.22" />
              <stop offset="1" stopColor="#f0b90b" stopOpacity="0" />
            </linearGradient>
            <linearGradient id={`${ids}-beam`} x1="0" x2="1">
              <stop offset="0" stopColor="#f0b90b" stopOpacity="0" />
              <stop offset="1" stopColor="#f0b90b" stopOpacity="0.16" />
            </linearGradient>
            <filter id={`${ids}-glow`} x="-10%" y="-30%" width="120%" height="160%">
              <feGaussianBlur stdDeviation="5" />
            </filter>
            {/* everything left of the head is drawn */}
            <clipPath id={`${ids}-clip`}>
              <motion.rect x={0} y={0} height={H} width={reveal} />
            </clipPath>
          </defs>
          {[0.2, 0.4, 0.6, 0.8].map((f) => (
            <line key={f} x1={0} x2={W} y1={H * f} y2={H * f} stroke="rgb(255 255 255 / 0.04)" />
          ))}
          <g clipPath={`url(#${ids}-clip)`}>
            {BANDS.map((b) => (
              <rect
                key={b.i}
                x={b.x0 + 1}
                y={b.c - HALF}
                width={b.x1 - b.x0 - 2}
                height={HALF * 2}
                rx={6}
                fill="rgba(46,189,133,0.1)"
                stroke="rgba(46,189,133,0.5)"
                strokeDasharray="4 4"
              />
            ))}
            <path d={AREA_D} fill={`url(#${ids}-area)`} />
            <path d={LINE_D} fill="none" stroke="#f0b90b" strokeWidth={6} strokeOpacity={0.35} filter={`url(#${ids}-glow)`} />
            <path d={LINE_D} fill="none" stroke={`url(#${ids}-line)`} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
          </g>
          <motion.rect x={beamX} y={0} width={BEAM} height={H} fill={`url(#${ids}-beam)`} animate={{ opacity: sweeping ? 1 : 0 }} transition={{ duration: 0.6 }} />
          <motion.line x1={head} x2={head} y1={0} y2={H} stroke="#f0b90b" strokeOpacity={0.5} animate={{ opacity: sweeping ? 1 : 0 }} />
          <HeadDot head={head} done={done} />
        </svg>
      </div>

      {/* timeline: the track fills with the line, an event card lands at each range */}
      <div className="mt-4">
        <div className="relative h-1 rounded-full bg-panel-3">
          <motion.div style={{ width: progress }} className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-gold-3 to-gold" />
          {BANDS.map((b) => (
            <motion.span
              key={b.i}
              initial={false}
              animate={{ backgroundColor: play && b.i <= stage ? "#f0b90b" : "#2c2b32", scale: play && b.i === stage && !done ? 1.4 : 1 }}
              className="absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-4 ring-panel"
              style={{ left: `${((b.x0 - X0) / (X1 - X0)) * 100}%` }}
            />
          ))}
        </div>
        <div className="mt-3 grid grid-cols-4 gap-1.5 sm:gap-2">
          {EVENTS.map((e, i) => {
            const on = play && i <= stage;
            const settled = i < stage || done;
            return (
              <motion.div
                key={i}
                initial={false}
                animate={{ opacity: on ? 1 : 0.25, y: on ? 0 : 6, filter: on ? "blur(0px)" : "blur(2px)" }}
                transition={{ duration: 0.45, ease: EASE }}
                className={`rounded-xl border px-2 py-1.5 transition-colors duration-500 ${on && !settled ? "border-gold/50 bg-gold/[0.06]" : "border-line bg-panel-2"}`}
              >
                <div className={`flex items-center gap-1 text-[10px] font-semibold ${i === 0 ? "text-up" : "text-gold-2"}`}>
                  {e.icon} <span className="sm:hidden">{t(e.short)}</span>
                  <span className="hidden sm:inline">{t(e.title)}</span>
                </div>
                <div className="num mt-0.5 hidden truncate text-[10px] text-fg-2 sm:block">{e.range}</div>
                <div className="num mt-0.5 flex items-center gap-1 text-[10px] text-up">
                  {settled ? <Check className="size-2.5" /> : <span className="size-1.5 animate-pulse rounded-full bg-up" />}+${e.fees.toFixed(2)}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
      <p className="mt-3 text-xs text-mute">{t("Illustration: each green box is the range; when the price leaves it, Qudao moves it.")}</p>
    </>
  );
}

function Status({ moving }: { moving: boolean }): ReactNode {
  const { t } = useT();
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.span
        key={moving ? "moving" : "earning"}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.2 }}
        className={`absolute right-0 inline-flex items-center gap-1.5 ${moving ? "text-gold-2" : "text-up"}`}
      >
        {moving ? <RefreshCw className="size-3 animate-spin" /> : <span className="size-1.5 animate-pulse rounded-full bg-up" />}
        {moving ? t("moving range") : t("earning")}
      </motion.span>
    </AnimatePresence>
  );
}

function HeadDot({ head, done }: { head: MotionValue<number>; done: boolean }) {
  const y = useTransform(head, yAt);
  const show = useTransform(head, [X0, X0 + 4], [0, 1]);
  return (
    <motion.g style={{ opacity: show }}>
      <motion.circle cx={head} cy={y} r={5} fill="#f0b90b" animate={{ scale: [1, 3], opacity: [0.45, 0] }} transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut" }} />
      <motion.circle cx={head} cy={y} r={4.5} fill="#ffe27a" stroke="#0d0c10" strokeWidth={2} animate={{ scale: done ? 1.15 : 1 }} />
    </motion.g>
  );
}
