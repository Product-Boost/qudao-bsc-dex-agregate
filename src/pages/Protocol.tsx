// Protocol (transparency): revenue by source, where it goes, every balance, every burn, every payment out of the
// reserves, and every contract address.
import { useQuery } from "@tanstack/react-query";
import { formatUnits, type Address } from "viem";
import { ExternalLink, Flame, Landmark, ShieldCheck } from "lucide-react";
import { Page } from "../components/layout/Layout";
import { Card, CardHeader, Ext, PageTitle, Skeleton, Stat } from "../components/ui";
import { StackedBars } from "../components/charts";
import { api, type Deployment } from "../lib/api";
import { useAppConfig } from "../lib/config";
import { amount, bps, date, num, pct, price, short, sig, usd } from "../lib/format";

const BNB_SPLIT: { key: keyof ReturnType<typeof useAppConfig>["protocol"]["revenue"]["bnbSplitBps"]; label: string; color: string; body: string }[] = [
  { key: "well", label: "Stakers (The Well)", color: "var(--color-gold)", body: "Streamed to QDAO stakers over 30 days." },
  { key: "buyback", label: "Buyback & burn", color: "#ff7a45", body: "Buys QDAO and sends it to the burn address." },
  { key: "safetyFund", label: "Safety fund", color: "var(--color-info)", body: "Covers losses from incidents." },
  { key: "team", label: "Team", color: "#a78bfa", body: "Pays for development, audits and operations." },
  { key: "boostReserve", label: "Boosted pools", color: "var(--color-up)", body: "Extra rewards on selected pools (coming later)." },
];

const CONTRACTS: { key: keyof Deployment; label: string }[] = [
  { key: "factory", label: "Factory" },
  { key: "vaultImplementation", label: "Vault (template)" },
  { key: "swapper", label: "Swapper" },
  { key: "oracle", label: "Price oracle" },
  { key: "revenueRouter", label: "Revenue router" },
  { key: "referrals", label: "Referrals" },
  { key: "well", label: "The Well" },
  { key: "buybackBurner", label: "Buyback & burn" },
  { key: "safetyFund", label: "Safety fund" },
  { key: "boostReserve", label: "Boosted pools reserve" },
  { key: "expansionReserve", label: "Expansion reserve" },
  { key: "timelock", label: "Timelock (owner of everything)" },
  { key: "adminSafe", label: "Admin Safe" },
  { key: "teamSafe", label: "Team Safe" },
  { key: "keeper", label: "Keeper (automation)" },
];

const BALANCES: { key: string; label: string; contract: keyof Deployment }[] = [
  { key: "revenueRouter", label: "Waiting to be split", contract: "revenueRouter" },
  { key: "well", label: "The Well", contract: "well" },
  { key: "buybackBurner", label: "Buyback & burn", contract: "buybackBurner" },
  { key: "safetyFund", label: "Safety fund", contract: "safetyFund" },
  { key: "boostReserve", label: "Boosted pools reserve", contract: "boostReserve" },
  { key: "expansionReserve", label: "Expansion reserve", contract: "expansionReserve" },
  { key: "teamSafe", label: "Team Safe", contract: "teamSafe" },
];

export default function Protocol() {
  const { protocol, chain } = useAppConfig();
  const { data, isLoading } = useQuery({ queryKey: ["protocol"], queryFn: api.protocol, refetchInterval: 60_000 });
  const addr = (a: Address) => `${chain.explorer}/address/${a}`;
  const tx = (h: string) => `${chain.explorer}/tx/${h}`;
  const weeks = Object.entries(data?.revenueByWeekBnb ?? {})
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([w, v]) => ({ label: new Date(w).toLocaleDateString("en-US", { month: "short", day: "numeric" }), values: v }));
  const totalRevenue = weeks.reduce((s, w) => s + w.values.fee + w.values.swap + w.values.launchpad, 0);
  const token = data?.token;
  const supply = token ? Number(formatUnits(BigInt(token.supply), 18)) : 0;
  const burned = token ? Number(formatUnits(BigInt(token.burned), 18)) : 0;
  const split = protocol.revenue.bnbSplitBps;

  return (
    <Page>
      <PageTitle title="Protocol" sub="Everything Qudao earns, where it goes and every contract, all read from the chain." />
      {!isLoading && data && !data.deployed && <Card className="p-6 text-sm text-mute">Qudao isn't deployed on this network yet.</Card>}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="p-5">
          <Stat label="QDAO price" value={token?.priceUsd ? price(token.priceUsd) : "—"} sub={token?.marketCapUsd ? `Market cap ${usd(token.marketCapUsd, { compact: true })}` : "Not launched yet"} />
        </Card>
        <Card className="p-5">
          <Stat label="Burned" value={token ? `${num(burned, 0)}` : "—"} sub={token ? `${pct((burned / supply) * 100, { digits: 3 })} of supply` : undefined} />
        </Card>
        <Card className="p-5">
          <Stat label="Managed by Qudao" value={usd(data?.managed?.tvlUsd, { compact: true })} sub={data?.managed ? `${data.managed.positions} positions · ${data.managed.users} wallets` : undefined} />
        </Card>
        <Card className="p-5">
          <Stat label="Revenue, 8 weeks" value={`${sig(totalRevenue, 4)} BNB`} sub={data?.managed ? `${data.managed.moves30d} range moves in 30 days` : undefined} />
        </Card>
      </div>

      <Card className="mt-6 p-6">
        <CardHeader title="Protocol revenue" sub="In BNB, by week and source: Qudao's fee on what positions earn, the 0.15% in-app swap fee, and QDAO's launchpad fees." />
        <div className="mt-6">
          {isLoading ? (
            <Skeleton className="h-56 w-full" />
          ) : weeks.length ? (
            <StackedBars
              data={weeks}
              series={[
                { key: "fee", label: "Position fees", color: "var(--color-gold)" },
                { key: "swap", label: "Swap fee", color: "var(--color-info)" },
                { key: "launchpad", label: "Launchpad", color: "#a78bfa" },
              ]}
              format={(n) => `${sig(n, 4)} BNB`}
            />
          ) : (
            <p className="py-10 text-center text-sm text-mute">No revenue yet.</p>
          )}
        </div>
      </Card>

      <Card className="mt-6 p-6">
        <CardHeader title="Where revenue goes" sub={`Revenue is converted to BNB at a checked price and split every hour. Referrers are paid first (${bps(protocol.referrals.referrerShareBps)} of the fees their invitees pay), then:`} />
        <div className="mt-6 flex h-4 overflow-hidden rounded-full">
          {BNB_SPLIT.map((s) => (
            <div key={s.key} style={{ width: `${split[s.key] / 100}%`, background: s.color }} title={`${s.label} ${bps(split[s.key])}`} />
          ))}
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {BNB_SPLIT.map((s) => (
            <div key={s.key}>
              <div className="flex items-center gap-2 text-sm font-medium">
                <span className="size-2.5 rounded-sm" style={{ background: s.color }} />
                {s.label}
              </div>
              <div className="num mt-1 text-2xl font-semibold">{bps(split[s.key])}</div>
              <p className="mt-1 text-xs text-mute">{s.body}</p>
            </div>
          ))}
        </div>
        <p className="mt-5 rounded-xl bg-ink-2 px-4 py-3 text-xs leading-relaxed text-mute">
          Revenue that arrives in QDAO is never sold: {bps(protocol.revenue.qdaoSplitBps.burn)} is burned, {bps(protocol.revenue.qdaoSplitBps.expansionReserve)} goes to the expansion reserve and{" "}
          {bps(protocol.revenue.qdaoSplitBps.boostReserve)} to boosted pools. Qudao's fee can never be set above {bps(protocol.fees.maxProtocolFeeBps)} of what positions earn: the contracts refuse it.
        </p>
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <CardHeader title="Protocol balances" sub="Live BNB balance of every contract and Safe." right={<Landmark className="size-5 text-gold" />} />
          <div className="mt-4 divide-y divide-line/70">
            {BALANCES.map((b) => (
              <div key={b.key} className="flex items-center justify-between py-2.5 text-sm">
                {data?.contracts ? <Ext href={addr(data.contracts[b.contract] as Address)}>{b.label}</Ext> : <span>{b.label}</span>}
                <span className="num">{data?.balances ? `${amount((data.balances as Record<string, string>)[b.key], 18, 4)} BNB` : "—"}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <CardHeader title="Recent burns" sub="QDAO bought back and sent to the burn address." right={<Flame className="size-5 text-[#ff7a45]" />} />
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="label text-left">
                  <th className="py-2 font-medium">Date</th>
                  <th className="py-2 text-right font-medium">Burned</th>
                  <th className="py-2 text-right font-medium">Bought with</th>
                  <th className="py-2 text-right font-medium">Tx</th>
                </tr>
              </thead>
              <tbody>
                {(data?.burns ?? []).map((b) => (
                  <tr key={b.tx + b.ts} className="border-t border-line/70">
                    <td className="py-2.5">{date(b.ts)}</td>
                    <td className="num py-2.5 text-right">{amount(b.args.qdaoBurned ?? b.args.amount ?? "0", 18, 0)} QDAO</td>
                    <td className="num py-2.5 text-right text-fg-2">{b.args.bnbIn ? `${amount(b.args.bnbIn, 18, 4)} BNB` : "—"}</td>
                    <td className="py-2.5 text-right">
                      <a href={tx(b.tx)} target="_blank" rel="noreferrer" className="inline-flex text-mute hover:text-gold-2">
                        <ExternalLink className="size-4" />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data && !data.burns?.length && <p className="py-8 text-center text-sm text-mute">No burns yet.</p>}
          </div>
        </Card>
      </div>

      <Card className="mt-6 p-6">
        <CardHeader title="Payments from the reserves" sub="The reserves can only pay out through the 48-hour timelock, and every payment is listed here." />
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="label text-left">
                <th className="py-2 font-medium">Date</th>
                <th className="py-2 font-medium">From</th>
                <th className="py-2 font-medium">To</th>
                <th className="py-2 text-right font-medium">Amount</th>
                <th className="py-2 font-medium">Reason</th>
              </tr>
            </thead>
            <tbody>
              {(data?.payments ?? []).map((p) => (
                <tr key={p.tx} className="border-t border-line/70">
                  <td className="py-2.5">{date(p.ts)}</td>
                  <td className="py-2.5">{BALANCES.find((b) => String(data?.contracts?.[b.contract] ?? "").toLowerCase() === p.address.toLowerCase())?.label ?? short(p.address)}</td>
                  <td className="py-2.5 font-mono text-xs">{short(p.args.to)}</td>
                  <td className="num py-2.5 text-right">{amount(p.args.amount, 18, 4)}</td>
                  <td className="py-2.5 text-fg-2">{p.args.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {data && !data.payments?.length && <p className="py-8 text-center text-sm text-mute">No payments yet.</p>}
        </div>
      </Card>

      <Card className="mt-6 p-6">
        <CardHeader
          title="Contracts"
          sub={`Every Qudao contract is owned by a ${protocol.governance.timelockHours}-hour timelock controlled by the admin Safe: any change is visible on-chain two days before it can happen.`}
          right={<ShieldCheck className="size-5 text-up" />}
        />
        <div className="mt-4 grid gap-x-8 sm:grid-cols-2">
          {CONTRACTS.map((c) => {
            const a = data?.contracts?.[c.key] as Address | undefined;
            return (
              <div key={c.key} className="flex items-center justify-between gap-4 border-t border-line/70 py-2.5 text-sm">
                <span className="text-fg-2">{c.label}</span>
                {a ? (
                  <a href={addr(a)} target="_blank" rel="noreferrer" className="font-mono text-xs text-fg hover:text-gold-2">
                    {short(a, 6)}
                  </a>
                ) : (
                  <span className="text-mute">—</span>
                )}
              </div>
            );
          })}
        </div>
      </Card>
    </Page>
  );
}
