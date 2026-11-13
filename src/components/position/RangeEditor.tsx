// Choose a price range: quick presets, exact low/high prices, or drag the edges on the liquidity chart.
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Address } from "viem";
import { LiquidityChart } from "../charts";
import { Info, Segmented } from "../ui";
import { api } from "../../lib/api";
import { MAX_TICK, MIN_TICK, nearestTick, rangePrices, tickToPct, type PairView } from "../../lib/v3";
import { PRESETS, presetRange, type Preset } from "../../lib/range";
import { pct, sig } from "../../lib/format";
import { useT } from "../../i18n";


function PriceBox({ label, value, onCommit, sub }: { label: string; value: number; onCommit: (v: number) => void; sub: string }) {
  const [text, setText] = useState(sig(value, 6));
  const [shown, setShown] = useState(value);
  if (value !== shown) {
    setShown(value);
    setText(sig(value, 6));
  }
  return (
    <label className="block rounded-2xl border border-line bg-ink-2 p-3 focus-within:border-gold/50">
      <span className="label">{label}</span>
      <input
        value={text}
        inputMode="decimal"
        onChange={(e) => setText(e.target.value.replace(",", "."))}
        onBlur={() => {
          const v = Number(text.replace(/,/g, ""));
          if (v > 0 && Number.isFinite(v)) onCommit(v);
          else setText(sig(value, 6));
        }}
        onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
        className="num mt-1 block w-full bg-transparent text-xl font-semibold outline-none"
      />
      <span className="text-xs text-mute">{sub}</span>
    </label>
  );
}

export function RangeEditor({
  pool,
  view,
  tick,
  spacing,
  lower,
  upper,
  preset,
  onChange,
  minWidthTicks,
}: {
  pool?: Address;
  view: PairView;
  tick: number;
  spacing: number;
  lower: number;
  upper: number;
  preset: Preset;
  onChange: (r: { lower: number; upper: number; preset: Preset }) => void;
  minWidthTicks: number;
}) {
  const { data: liq } = useQuery({ queryKey: ["liquidity", pool], queryFn: () => api.liquidity(pool!), enabled: !!pool, staleTime: 60_000 });
  const current = view.at(tick);
  const [low, high] = rangePrices(view, lower, upper);
  const full = lower <= MIN_TICK + spacing && upper >= MAX_TICK - spacing;

  const setPrices = (lo: number, hi: number) => {
    const a = view.tickOf(lo);
    const b = view.tickOf(hi);
    let l = nearestTick(Math.min(a, b), spacing);
    let u = nearestTick(Math.max(a, b), spacing);
    if (u - l < Math.max(spacing, minWidthTicks)) {
      // keep the minimum width, growing around the edge that wasn't moved
      const need = Math.ceil(Math.max(spacing, minWidthTicks) / spacing) * spacing;
      if (l === lower) u = l + need;
      else l = u - need;
    }
    onChange({ lower: l, upper: u, preset: "custom" });
  };

  const bars = (liq?.bars ?? []).map((b) => {
    const x = view.at(b.tickLower);
    const y = view.at(b.tickUpper);
    return { lo: Math.min(x, y), hi: Math.max(x, y), liquidity: Number(b.liquidity) };
  });
  const { t } = useT();
  const width = upper - lower;
  const lowPct = tickToPct(view.inverted ? upper : lower, tick);
  const highPct = tickToPct(view.inverted ? lower : upper, tick);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented
          size="sm"
          value={preset}
          onChange={(p) => p !== "custom" && onChange({ ...presetRange(p, tick, spacing), preset: p })}
          options={[...PRESETS.map((p) => ({ value: p as Preset, label: p === "full" ? t("Full range") : `±${p}%` })), ...(preset === "custom" ? [{ value: "custom" as Preset, label: t("Custom") }] : [])]}
        />
        <span className="text-xs text-mute">
          1 {view.base} = <span className="num text-fg">{sig(current)}</span> {view.quote}
        </span>
      </div>
      {bars.length > 0 && !full && <LiquidityChart bars={bars} current={current} low={low} high={high} onChange={setPrices} format={(n) => sig(n, 4)} />}
      {full ? (
        <p className="rounded-2xl border border-line bg-ink-2 p-4 text-sm text-fg-2">
          {t("Full range never leaves the price, so it never needs moving, but it earns far less per dollar than a narrow range.")}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <PriceBox label={t("Low price ({quote} per {base})", { quote: view.quote, base: view.base })} value={low} onCommit={(v) => setPrices(v, high)} sub={t("{pct} from now", { pct: pct(view.inverted ? -highPct : lowPct, { sign: true }) })} />
          <PriceBox label={t("High price ({quote} per {base})", { quote: view.quote, base: view.base })} value={high} onCommit={(v) => setPrices(low, v)} sub={t("{pct} from now", { pct: pct(view.inverted ? -lowPct : highPct, { sign: true }) })} />
        </div>
      )}
      {!full && (tick < lower || tick >= upper) && (
        <p className="text-xs text-warn">{t("The price is outside this range: the position starts with only one token and earns nothing until the price enters it.")}</p>
      )}
      <p className="text-xs text-mute">
        {t("Width {ticks} ticks", { ticks: width })} <Info>{t("Ranges snap to the pool's tick spacing ({spacing}). The narrowest allowed is {min} ticks (about ±{pct}).", { spacing, min: minWidthTicks, pct: pct(minWidthTicks / 200, { digits: 1 }) })}</Info>
      </p>
    </div>
  );
}
