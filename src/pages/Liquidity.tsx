// Liquidity: PancakeSwap v3 pools in three groups with their fee APR, an estimate for a narrow managed range,
// CAKE farm status and how much Qudao users hold. Pools where Qudao users earn come first.
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ArrowDownUp, Plus, Search, Sprout } from "lucide-react";
import { Page } from "../components/layout/Layout";
import { Badge, ButtonLink, Card, Info, PageTitle, Segmented, Skeleton } from "../components/ui";
import { PairIcon } from "../components/TokenIcon";
import { GuideButton } from "../components/Guide";
import { api, type PoolOverview } from "../lib/api";
import { pct, usd } from "../lib/format";
import { useT } from "../i18n";

type Group = "all" | PoolOverview["group"];
type Sort = "qudao" | "liquidity" | "volume" | "apr" | "est";

const GROUPS: { value: Group; label: string }[] = [
  { value: "all", label: "All pools" },
  { value: "popular", label: "Popular" },
  { value: "stocks", label: "Stock Tokens" },
  { value: "memecoins", label: "Memecoins" },
];

const SORTS: Record<Sort, (p: PoolOverview) => number> = {
  qudao: (p) => p.qudaoTvlUsd * 1e6 + p.volume24hUsd,
  liquidity: (p) => p.liquidityUsd,
  volume: (p) => p.volume24hUsd,
  apr: (p) => p.aprPct,
  est: (p) => p.estAprPct ?? -1,
};

export default function Liquidity() {
  const { t } = useT();
  const navigate = useNavigate();
  const [group, setGroup] = useState<Group>("all");
  const [sort, setSort] = useState<Sort>("qudao");
  const [q, setQ] = useState("");
  const { data, isLoading, error } = useQuery({
    queryKey: ["pools"],
    queryFn: api.pools,
    refetchInterval: (query) => (query.state.data?.estimating ? 20_000 : 120_000),
  });

  const pools = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (data?.pools ?? [])
      .filter((p) => group === "all" || p.group === group)
      .filter((p) => !term || `${p.token0.symbol} ${p.token1.symbol} ${p.token0.name} ${p.token1.name}`.toLowerCase().includes(term) || p.address.toLowerCase() === term)
      .sort((a, b) => SORTS[sort](b) - SORTS[sort](a));
  }, [data, group, sort, q]);

  const head = (key: Sort, label: string, info?: string) => (
    <th className="px-3 py-3 text-right font-medium">
      <button onClick={() => setSort(key)} className={`inline-flex items-center gap-1 ${sort === key ? "text-gold-2" : "hover:text-fg"}`}>
        {label}
        {sort === key && <ArrowDownUp className="size-3" />}
      </button>
      {info && <Info className="ml-1">{info}</Info>}
    </th>
  );

  return (
    <Page>
      <PageTitle
        title={t("Earn on PancakeSwap pools")}
        sub={t("Put your tokens to work in a PancakeSwap v3 pool. Qudao moves your range when the price moves, reinvests the fees and farms CAKE where the pool has a farm.")}
        right={
          <div className="flex items-center gap-2">
            <GuideButton id="liquidity" />
            <span data-guide="new-position">
              <ButtonLink to="/liquidity/new">
                <Plus className="size-4" /> {t("New position")}
              </ButtonLink>
            </span>
          </div>
        }
      />
      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3" data-guide="pool-groups">
          <Segmented value={group} onChange={setGroup} options={GROUPS.map((g) => ({ ...g, label: t(g.label) }))} />
          <label className="flex h-10 items-center gap-2 rounded-xl border border-line bg-ink-2 px-3 focus-within:border-gold/50">
            <Search className="size-4 text-mute" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("Find a pair")} className="w-40 bg-transparent text-sm outline-none placeholder:text-dim" />
          </label>
        </div>
        <div className="mt-4 overflow-x-auto" data-guide="pool-table">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="label border-b border-line text-left">
                <th className="py-3 pr-3 font-medium">{t("Pool")}</th>
                {head("liquidity", t("Liquidity"))}
                {head("volume", t("Volume 24h"))}
                {head("apr", t("APR"), t("Trading fees the whole pool earned in the last 24 hours, per year, divided by its liquidity."))}
                {head(
                  "est",
                  t("Est. APR"),
                  t("What a ±5% range would have earned over the last 7 days from this pool's fees, re-centred whenever the price left it, after Qudao's fee. Fees reinvested daily give the APY. Past results don't promise future ones."),
                )}
                {head("qudao", t("On Qudao"))}
                <th className="py-3 pl-3" />
              </tr>
            </thead>
            <tbody>
              {isLoading &&
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={7} className="py-2.5">
                      <Skeleton className="h-9 w-full" />
                    </td>
                  </tr>
                ))}
              {pools.map((p) => (
                <tr key={p.address} onClick={() => navigate(`/liquidity/new?pool=${p.address}`)} className="group cursor-pointer border-b border-line/60 hover:bg-panel-2/60">
                  <td className="py-3 pr-3">
                    <div className="flex items-center gap-3">
                      <PairIcon a={p.token0} b={p.token1} />
                      <div>
                        <div className="flex flex-wrap items-center gap-1.5 font-semibold">
                          {p.token0.symbol} / {p.token1.symbol}
                          <Badge>{pct(p.feePct, { digits: 2 })}</Badge>
                          {p.farm && (
                            <Badge tone="gold">
                              <Sprout className="size-3" /> {t("CAKE farm")}
                            </Badge>
                          )}
                          {p.group === "stocks" && <Badge tone="info">{t("Stock")}</Badge>}
                        </div>
                        <div className="text-xs text-mute">{t("PancakeSwap v3")}</div>
                      </div>
                    </div>
                  </td>
                  <td className="num px-3 py-3 text-right">{usd(p.liquidityUsd, { compact: true })}</td>
                  <td className="num px-3 py-3 text-right text-fg-2">{usd(p.volume24hUsd, { compact: true })}</td>
                  <td className="num px-3 py-3 text-right text-fg-2">{pct(p.aprPct)}</td>
                  <td className="px-3 py-3 text-right">
                    {p.estAprPct !== null ? (
                      <div>
                        <div className="num font-semibold text-gold-2">{pct(p.estAprPct)}</div>
                        <div className="num text-xs text-mute">APY {pct(p.estApyPct)}</div>
                      </div>
                    ) : p.estimating ? (
                      <span className="text-xs text-mute">{t("estimating…")}</span>
                    ) : (
                      <span className="text-mute">—</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-right">
                    {p.qudaoPositions > 0 ? (
                      <div>
                        <div className="num">{usd(p.qudaoTvlUsd, { compact: true })}</div>
                        <div className="text-xs text-mute">{t("{n} positions", { n: p.qudaoPositions })}</div>
                      </div>
                    ) : (
                      <span className="text-mute">—</span>
                    )}
                  </td>
                  <td className="py-3 pl-3 text-right">
                    <span className="rounded-lg border border-line-2 px-3 py-1.5 text-xs font-semibold text-fg-2 group-hover:border-gold/60 group-hover:text-gold-2">{t("Earn")}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {error && <p className="py-10 text-center text-sm text-mute">{t("Pool data is unavailable right now.")}</p>}
          {data && pools.length === 0 && <p className="py-10 text-center text-sm text-mute">{t("No pools match. Any pair can still be used: open a new position and pick the tokens.")}</p>}
        </div>
        <p className="mt-4 text-xs text-mute">{t("Pools with less than $10k of liquidity or no trading fees aren't listed. Any pair on PancakeSwap v3 can still be used from \"New position\".")}</p>
      </Card>
    </Page>
  );
}
