// One position on the dashboard: pair, status, value, fees, APR and where the price sits in the range.
import { Sprout } from "lucide-react";
import type { Position } from "../../lib/api";
import { rangePrices } from "../../lib/v3";
import { viewFor } from "../../lib/position";
import { pct, sig, usd } from "../../lib/format";
import { strategyOf } from "../../data/strategies";
import { RangeBar } from "../charts";
import { PairIcon } from "../TokenIcon";
import { Badge } from "../ui";
import { useTokenImages } from "../../hooks/tokens";
import { useT } from "../../i18n";

export function StatusBadge({ p }: { p: Position }) {
  const { t } = useT();
  if (p.closed) return <Badge>{t("Closed")}</Badge>;
  return p.inRange ? <Badge tone="up">{t("Earning")}</Badge> : <Badge tone="warn">{t("Out of range")}</Badge>;
}

export function PositionCard({ p, onOpen }: { p: Position; onOpen: () => void }) {
  const { t } = useT();
  const images = useTokenImages([p.token0, p.token1]);
  const v = viewFor(p);
  const [low, high] = rangePrices(v, p.tickLower, p.tickUpper);
  const current = v.at(p.tick);
  const t0 = { symbol: p.symbol0, image: images[p.token0.toLowerCase()] };
  const t1 = { symbol: p.symbol1, image: images[p.token1.toLowerCase()] };
  return (
    <button onClick={onOpen} className="card group block w-full p-5 text-left transition-colors hover:border-gold/40">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <PairIcon a={v.inverted ? t1 : t0} b={v.inverted ? t0 : t1} size={32} />
          <div>
            <div className="font-semibold">
              {v.base} / {v.quote}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-mute">
              {pct(p.fee / 10_000, { digits: 2 })} · {t(strategyOf(p.settings.strategy).short)}
              {p.staked && <Sprout className="size-3.5 text-gold" aria-label={t("Farming CAKE")} />}
            </div>
          </div>
        </div>
        <StatusBadge p={p} />
      </div>
      <div className="mt-5 grid grid-cols-3 gap-3">
        <div>
          <div className="label">{t("Value")}</div>
          <div className="num mt-1 text-lg font-semibold">{usd(p.valueUsd)}</div>
        </div>
        <div>
          <div className="label">{t("To claim")}</div>
          <div className="num mt-1 text-lg font-semibold text-up">{usd(p.feesUsd)}</div>
        </div>
        <div>
          <div className="label">{t("APR")}</div>
          <div className="num mt-1 text-lg font-semibold text-gold-2">{p.aprPct !== undefined ? pct(p.aprPct) : "—"}</div>
        </div>
      </div>
      {!p.closed && (
        <div className="mt-5">
          <RangeBar low={low} high={high} current={current} />
          <div className="num mt-2 flex justify-between text-xs text-mute">
            <span>{sig(low)}</span>
            <span className="text-fg-2">{t("now {price}", { price: sig(current) })}</span>
            <span>{sig(high)}</span>
          </div>
        </div>
      )}
      {p.pnlUsd !== undefined && (
        <div className="mt-4 flex justify-between border-t border-line pt-3 text-xs">
          <span className="text-mute">{t("Profit / loss")}</span>
          <span className={`num font-medium ${p.pnlUsd >= 0 ? "text-up" : "text-down"}`}>{usd(p.pnlUsd, { sign: true })}</span>
        </div>
      )}
    </button>
  );
}
