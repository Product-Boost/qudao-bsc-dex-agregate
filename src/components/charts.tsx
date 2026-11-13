// Dependency-free SVG charts: sparkline, stacked bars, area line, liquidity-by-price with a draggable range,
// a backtest band chart and the small range bar used on position cards.
import { useMemo, useRef, useState, type PointerEvent as RPointerEvent, type ReactNode } from "react";
import { localeTag } from "../i18n/locale";
import { useT } from "../i18n";

const W = 600;

export function Sparkline({ values, className = "", height = 32 }: { values: number[]; className?: string; height?: number }) {
  if (values.length < 2) return <div style={{ height }} className={className} />;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * 100},${height - ((v - min) / span) * (height - 4) - 2}`).join(" ");
  const up = values[values.length - 1] >= values[0];
  return (
    <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" className={className} style={{ height }} aria-hidden>
      <polyline points={pts} fill="none" stroke={up ? "var(--color-up)" : "var(--color-down)"} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export interface BarSeries {
  key: string;
  label: string;
  color: string;
}

export function StackedBars({
  data,
  series,
  format,
  height = 220,
}: {
  data: { label: string; values: Record<string, number> }[];
  series: BarSeries[];
  format: (n: number) => string;
  height?: number;
}) {
  const { t } = useT();
  const [hover, setHover] = useState<number | null>(null);
  const totals = data.map((d) => series.reduce((s, x) => s + (d.values[x.key] ?? 0), 0));
  const max = Math.max(...totals, 1e-18);
  const H = height;
  const gap = 10;
  const bw = data.length ? (W - gap * (data.length + 1)) / data.length : 0;
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H + 24}`} className="w-full" role="img" aria-label={t("Bar chart")}>
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <line key={f} x1={0} x2={W} y1={H - f * H + 2} y2={H - f * H + 2} stroke="var(--color-line)" strokeDasharray="3 4" />
        ))}
        {data.map((d, i) => {
          let y = H;
          const x = gap + i * (bw + gap);
          return (
            <g key={d.label} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <rect x={x - gap / 2} y={0} width={bw + gap} height={H} fill="transparent" />
              {series.map((s) => {
                const h = ((d.values[s.key] ?? 0) / max) * (H - 8);
                y -= h;
                return h > 0 ? <rect key={s.key} x={x} y={y} width={bw} height={h} rx={h > 6 ? 4 : 1} fill={s.color} opacity={hover === null || hover === i ? 1 : 0.45} /> : null;
              })}
              <text x={x + bw / 2} y={H + 18} textAnchor="middle" fontSize="11" fill="var(--color-mute)">
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
      {hover !== null && data[hover] && (
        <div className="pointer-events-none absolute top-2 left-2 rounded-xl border border-line-2 bg-panel-2/95 p-3 text-xs shadow-xl">
          <div className="mb-1 font-medium text-fg">{data[hover].label}</div>
          {series.map((s) => (
            <div key={s.key} className="flex items-center gap-2 text-fg-2">
              <span className="size-2 rounded-full" style={{ background: s.color }} />
              {s.label}: <span className="num text-fg">{format(data[hover].values[s.key] ?? 0)}</span>
            </div>
          ))}
          <div className="mt-1 border-t border-line pt-1 text-fg">{t("Total:")} {format(totals[hover])}</div>
        </div>
      )}
      <div className="mt-2 flex flex-wrap gap-4 text-xs text-fg-2">
        {series.map((s) => (
          <span key={s.key} className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm" style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Line with a soft area fill and a hover readout. */
export function AreaChart({
  points,
  format,
  height = 200,
  color = "var(--color-gold)",
  bands,
}: {
  points: { t: number; v: number }[];
  format: (n: number) => string;
  height?: number;
  color?: string;
  bands?: { lo: number; hi: number }[]; // same length as points: a shaded band (e.g. a backtested range)
}) {
  const { t } = useT();
  const [hover, setHover] = useState<number | null>(null);
  const ref = useRef<SVGSVGElement>(null);
  const H = height;
  const { min, max } = useMemo(() => {
    const vals = points.map((p) => p.v).concat(bands ? bands.flatMap((b) => [b.lo, b.hi]) : []);
    const lo = Math.min(...vals);
    const hi = Math.max(...vals);
    const pad = (hi - lo) * 0.08 || Math.abs(hi) * 0.05 || 1;
    return { min: lo - pad, max: hi + pad };
  }, [points, bands]);
  if (points.length < 2) return <div style={{ height }} className="grid place-items-center text-sm text-mute">{t("Not enough history yet")}</div>;
  const x = (i: number) => (i / (points.length - 1)) * W;
  const y = (v: number) => H - ((v - min) / (max - min)) * H;
  const line = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.v).toFixed(1)}`).join("");
  const area = `${line}L${W},${H}L0,${H}Z`;
  const band =
    bands && bands.length === points.length
      ? bands.map((b, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(b.hi).toFixed(1)}`).join("") +
        [...bands].reverse().map((b, j) => `L${x(bands.length - 1 - j).toFixed(1)},${y(b.lo).toFixed(1)}`).join("") +
        "Z"
      : null;
  const onMove = (e: RPointerEvent<SVGSVGElement>) => {
    const r = ref.current!.getBoundingClientRect();
    setHover(Math.max(0, Math.min(points.length - 1, Math.round(((e.clientX - r.left) / r.width) * (points.length - 1)))));
  };
  const h = hover !== null ? points[hover] : null;
  return (
    <div className="relative">
      <svg ref={ref} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full touch-none" style={{ height }} onPointerMove={onMove} onPointerLeave={() => setHover(null)}>
        <defs>
          <linearGradient id="area-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={color} stopOpacity="0.28" />
            <stop offset="1" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {band && <path d={band} fill="var(--color-up)" opacity="0.13" />}
        <path d={area} fill="url(#area-fill)" />
        <path d={line} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" />
        {h && <line x1={x(hover!)} x2={x(hover!)} y1={0} y2={H} stroke="var(--color-line-2)" vectorEffect="non-scaling-stroke" />}
      </svg>
      {h && (
        <div className="pointer-events-none absolute top-2 left-2 rounded-lg border border-line-2 bg-panel-2/95 px-2.5 py-1.5 text-xs shadow-lg">
          <div className="num text-fg">{format(h.v)}</div>
          {bands?.[hover!] && (
            <div className="text-mute">
              range {format(bands[hover!].lo)} – {format(bands[hover!].hi)}
            </div>
          )}
          <div className="text-mute">{new Date(h.t).toLocaleString(localeTag(), { month: "short", day: "numeric", hour: "2-digit" })}</div>
        </div>
      )}
    </div>
  );
}

/**
 * Liquidity by price around the current price, with the chosen range shaded. When `onChange` is given, the two
 * range edges can be dragged. Everything is in displayed-price space (low → high, left → right).
 */
export function LiquidityChart({
  bars,
  current,
  low,
  high,
  onChange,
  format,
  height = 180,
}: {
  bars: { lo: number; hi: number; liquidity: number }[]; // displayed prices
  current: number;
  low?: number;
  high?: number;
  onChange?: (low: number, high: number) => void;
  format: (n: number) => string;
  height?: number;
}) {
  const ref = useRef<SVGSVGElement>(null);
  const { t } = useT();
  const [drag, setDrag] = useState<"low" | "high" | null>(null);
  const H = height;
  const sorted = [...bars].sort((a, b) => a.lo - b.lo);
  const minP = Math.min(sorted[0]?.lo ?? current * 0.75, low ?? Infinity, current * 0.9);
  const maxP = Math.max(sorted[sorted.length - 1]?.hi ?? current * 1.25, high ?? -Infinity, current * 1.1);
  // log scale keeps ±% symmetric
  const lx = (p: number) => ((Math.log(p) - Math.log(minP)) / (Math.log(maxP) - Math.log(minP))) * W;
  const px = (x: number) => Math.exp(Math.log(minP) + (x / W) * (Math.log(maxP) - Math.log(minP)));
  const maxL = Math.max(...sorted.map((b) => b.liquidity), 1);
  const onMove = (e: RPointerEvent<SVGSVGElement>) => {
    if (!drag || !onChange || low === undefined || high === undefined) return;
    const r = ref.current!.getBoundingClientRect();
    const p = px(((e.clientX - r.left) / r.width) * W);
    if (drag === "low") onChange(Math.min(p, high * 0.999), high);
    else onChange(low, Math.max(p, low * 1.001));
  };
  const handle = (which: "low" | "high", p: number): ReactNode => (
    <g className={onChange ? "cursor-ew-resize" : ""} onPointerDown={(e) => { if (!onChange) return; (e.target as Element).setPointerCapture?.(e.pointerId); setDrag(which); }}>
      <line x1={lx(p)} x2={lx(p)} y1={0} y2={H} stroke="var(--color-gold)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
      {onChange && <rect x={lx(p) - 7} y={H / 2 - 18} width={14} height={36} rx={5} fill="var(--color-gold)" />}
      <rect x={lx(p) - 14} y={0} width={28} height={H} fill="transparent" />
    </g>
  );
  return (
    <div>
      <svg
        ref={ref}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="w-full touch-none select-none"
        style={{ height }}
        onPointerMove={onMove}
        onPointerUp={() => setDrag(null)}
        onPointerLeave={() => setDrag(null)}
      >
        {low !== undefined && high !== undefined && <rect x={lx(low)} y={0} width={Math.max(0, lx(high) - lx(low))} height={H} fill="var(--color-gold)" opacity="0.08" />}
        {sorted.map((b, i) => {
          const h = (b.liquidity / maxL) * (H - 10);
          const inside = low !== undefined && high !== undefined && b.hi > low && b.lo < high;
          return <rect key={i} x={lx(b.lo)} y={H - h} width={Math.max(0.5, lx(b.hi) - lx(b.lo) - 1)} height={h} fill={inside ? "var(--color-gold)" : "var(--color-panel-3)"} opacity={inside ? 0.75 : 1} />;
        })}
        <line x1={lx(current)} x2={lx(current)} y1={0} y2={H} stroke="var(--color-fg)" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
        {low !== undefined && handle("low", low)}
        {high !== undefined && handle("high", high)}
      </svg>
      <div className="num mt-2 flex justify-between text-xs text-mute">
        <span>{format(minP)}</span>
        <span className="text-fg">{t("now {price}", { price: format(current) })}</span>
        <span>{format(maxP)}</span>
      </div>
    </div>
  );
}

/** Where the price sits relative to a position's range (displayed prices). */
export function RangeBar({ low, high, current }: { low: number; high: number; current: number }) {
  const span = high - low;
  const pad = span * 0.6 || current * 0.05;
  const min = Math.min(low - pad, current);
  const max = Math.max(high + pad, current);
  const at = (p: number) => ((p - min) / (max - min)) * 100;
  const inRange = current >= low && current <= high;
  return (
    <div className="relative h-2.5 rounded-full bg-panel-3">
      <div className={`absolute inset-y-0 rounded-full ${inRange ? "bg-up/70" : "bg-warn/70"}`} style={{ left: `${at(low)}%`, width: `${at(high) - at(low)}%` }} />
      <div className="absolute -top-1 h-4.5 w-1 -translate-x-1/2 rounded-full bg-fg shadow" style={{ left: `${at(current)}%` }} />
    </div>
  );
}
