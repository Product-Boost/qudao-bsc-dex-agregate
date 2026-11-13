// Markets: five token lists from live PancakeSwap data (top by volume, new, trending, 24h gainers, Stock Tokens)
// next to the in-app swap. Click a token to swap it or to open a position with it.
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRightLeft, Sprout } from "lucide-react";
import { Page } from "../components/layout/Layout";
import { Badge, Card, Change, PageTitle, Segmented, Skeleton } from "../components/ui";
import { TokenIcon } from "../components/TokenIcon";
import { Swap } from "../components/Swap";
import { api, type MarketRow, type MarketTab } from "../lib/api";
import { ago, price, usd } from "../lib/format";
import { useAppConfig } from "../lib/config";
import type { Token } from "../hooks/tokens";

const TABS: { value: MarketTab; label: string; sub: (n: number) => string }[] = [
  { value: "top", label: "Top", sub: (n) => `The ${n} most traded tokens on PancakeSwap in the last 24 hours.` },
  { value: "new", label: "New", sub: (n) => `Tokens whose first pool opened in the last ${n} days.` },
  { value: "trending", label: "Trending", sub: () => "What traders are looking at right now." },
  { value: "gainers", label: "Gainers", sub: () => "Biggest price rises in the last 24 hours." },
  { value: "stocks", label: "Stock Tokens", sub: () => "Tokenized shares and ETFs (NVDA, TSLA, SPY…) trading on PancakeSwap." },
];

export default function Markets() {
  const { protocol } = useAppConfig();
  const [params, setParams] = useSearchParams();
  const tab = (TABS.find((t) => t.value === params.get("tab"))?.value ?? "top") as MarketTab;
  const [swapTo, setSwapTo] = useState<Token | null>(null);
  const navigate = useNavigate();
  const { data, isLoading, error } = useQuery({ queryKey: ["markets", tab], queryFn: () => api.markets(tab), refetchInterval: 60_000 });
  const t = TABS.find((x) => x.value === tab)!;

  const choose = (r: MarketRow) => {
    setSwapTo({ address: r.address, symbol: r.symbol, name: r.name, decimals: -1, image: r.image });
    if (window.innerWidth < 1024) document.getElementById("swap")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <Page>
      <PageTitle title="Markets" sub="Live prices from PancakeSwap on BNB Chain. Pools with less than $10k liquidity are left out." />
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <Card className="min-w-0 p-5">
          <Segmented value={tab} onChange={(v) => setParams({ tab: v })} options={TABS.map((x) => ({ value: x.value, label: x.label }))} />
          <p className="mt-3 text-sm text-mute">{t.sub(tab === "new" ? protocol.markets.newTokenDays : protocol.markets.topCount)}</p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="label border-b border-line text-left">
                  <th className="py-3 pr-3 font-medium">Token</th>
                  <th className="px-3 py-3 text-right font-medium">Price</th>
                  <th className="px-3 py-3 text-right font-medium">24h</th>
                  <th className="px-3 py-3 text-right font-medium">Volume 24h</th>
                  <th className="px-3 py-3 text-right font-medium">Liquidity</th>
                  <th className="py-3 pl-3 text-right font-medium" />
                </tr>
              </thead>
              <tbody>
                {isLoading &&
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="border-b border-line/60">
                      <td colSpan={6} className="py-3">
                        <Skeleton className="h-8 w-full" />
                      </td>
                    </tr>
                  ))}
                {data?.rows.map((r) => (
                  <tr key={r.address} onClick={() => choose(r)} className="group cursor-pointer border-b border-line/60 hover:bg-panel-2/60">
                    <td className="py-3 pr-3">
                      <div className="flex items-center gap-3">
                        <TokenIcon symbol={r.symbol} src={r.image} size={32} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 font-semibold">
                            {r.symbol}
                            {r.stock && <Badge tone="info">Stock</Badge>}
                            {tab === "new" && <span className="text-xs font-normal text-mute">{ago(r.firstPoolAt)}</span>}
                          </div>
                          <div className="max-w-[200px] truncate text-xs text-mute">{r.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="num px-3 py-3 text-right">{price(r.priceUsd)}</td>
                    <td className="px-3 py-3 text-right">
                      <Change value={r.change24h} />
                    </td>
                    <td className="num px-3 py-3 text-right text-fg-2">{usd(r.volume24h, { compact: true })}</td>
                    <td className="num px-3 py-3 text-right text-fg-2">{usd(r.liquidity, { compact: true })}</td>
                    <td className="py-3 pl-3">
                      <div className="flex justify-end gap-1 opacity-70 group-hover:opacity-100">
                        <button onClick={(e) => (e.stopPropagation(), choose(r))} className="rounded-lg px-2 py-1 text-xs text-fg-2 hover:bg-panel-3 hover:text-gold-2" title="Swap">
                          <ArrowRightLeft className="size-4" />
                        </button>
                        <button
                          onClick={(e) => (e.stopPropagation(), navigate(`/liquidity/new?token=${r.address}`))}
                          className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-fg-2 hover:bg-panel-3 hover:text-gold-2"
                          title="Earn with this token"
                        >
                          <Sprout className="size-4" /> Earn
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {error && <p className="py-10 text-center text-sm text-mute">Market data is unavailable right now. It refreshes every minute.</p>}
            {data && data.rows.length === 0 && <p className="py-10 text-center text-sm text-mute">Nothing here right now.</p>}
          </div>
          {tab === "stocks" && (
            <p className="mt-4 text-xs leading-relaxed text-mute">
              Stock Tokens follow their share price, which only moves while the US market is open. Positions with them can wait for the market to open before moving their
              range (unless the price moves more than 15%).
            </p>
          )}
        </Card>
        <div id="swap" className="lg:sticky lg:top-24 lg:self-start">
          <Card className="p-5">
            <Swap initialOut={swapTo} />
          </Card>
        </div>
      </div>
    </Page>
  );
}
