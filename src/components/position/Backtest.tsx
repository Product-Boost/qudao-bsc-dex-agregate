// "Last 30 days": what this range and rule would have earned in this pool, from the pool's own hourly history,
// after moves, swap costs, gas and Qudao's fee.
import { useQuery } from "@tanstack/react-query";
import type { Address } from "viem";
import { AreaChart } from "../charts";
import { Info, Skeleton, Stat } from "../ui";
import { api, type StrategyName } from "../../lib/api";
import { pct, sig, usd } from "../../lib/format";
import type { PairView } from "../../lib/v3";
import { useT } from "../../i18n";

export function Backtest({
  pool,
  view,
  current,
  low,
  high,
  rule,
  reinvestPct,
  depositUsd,
}: {
  pool: Address;
  view: PairView;
  current: number;
  low: number;
  high: number;
  rule: StrategyName;
  reinvestPct: number;
  depositUsd: number;
}) {
  // the history comes in GeckoTerminal's base/quote order, which may be the inverse of how the price is shown
  const { data: hist } = useQuery({ queryKey: ["history", pool], queryFn: () => api.history(pool), staleTime: 10 * 60_000 });
  const last = hist?.history.prices.at(-1);
  const flipped = last ? Math.abs(Math.log(last * current)) < Math.abs(Math.log(last / current)) : false;
  const lowPct = flipped ? (current / high - 1) * 100 : (low / current - 1) * 100;
  const highPct = flipped ? (current / low - 1) * 100 : (high / current - 1) * 100;
  const deposit = depositUsd > 0 ? depositUsd : 1000;
  const body = { pool, lowerPct: Math.max(-99, Math.min(0, lowPct)), upperPct: Math.max(0, Math.min(1000, highPct)), rule, reinvestPct, depositUsd: deposit };
  const { data, isFetching, error } = useQuery({
    queryKey: ["backtest", body],
    queryFn: () => api.backtest(body),
    enabled: !!hist && Number.isFinite(lowPct) && Number.isFinite(highPct),
    staleTime: 10 * 60_000,
  });
  const { t } = useT();
  const r = data?.result;
  const show = (p: number) => (flipped ? 1 / p : p);
  return (
    <div>
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">
          {t("Last 30 days")}{" "}
          <Info>
            {t("Replays the pool's hourly prices and volume with your range and rule. Your share of fees depends on how concentrated your range is versus the pool's other liquidity. Moves pay a swap cost and gas. Past results don't promise future ones.")}
          </Info>
        </h3>
        <span className="text-xs text-mute">{t("on {amount}", { amount: usd(deposit) })}{depositUsd > 0 ? "" : t("(example)")}</span>
      </div>
      {!r && (isFetching || !hist) && <Skeleton className="mt-4 h-48 w-full" />}
      {(error || (data && !r)) && <p className="mt-4 text-sm text-mute">{t("Not enough history for this pool yet.")}</p>}
      {r && (
        <>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Stat label={t("Fees earned")} value={<span className="text-up">{usd(r.feesUsd)}</span>} />
            <Stat label={t("APR")} value={<span className="text-gold-2">{pct(r.aprPct)}</span>} sub={t("after costs")} />
            <Stat label={t("Time in range")} value={pct(r.timeInRangePct)} />
            <Stat label={t("Range moves")} value={r.moves} sub={t("costs {usd}", { usd: usd(r.costsUsd) })} />
          </div>
          <div className="mt-4">
            <AreaChart
              height={170}
              points={r.path.map((p) => ({ t: p.t, v: show(p.price) }))}
              bands={r.path.map((p) => ({ lo: Math.min(show(p.lower), show(p.upper)), hi: Math.max(show(p.lower), show(p.upper)) }))}
              format={(n) => `${sig(n, 5)} ${view.quote}`}
            />
            <p className="mt-1 text-xs text-mute">
              {t("Price of {base} in {quote}; the green band is where your range would have been.", { base: view.base, quote: view.quote })}
            </p>
          </div>
        </>
      )}
    </div>
  );
}
