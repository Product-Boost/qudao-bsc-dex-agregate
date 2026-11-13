// App home: your overview, The Well, the best pools (crypto and Stock Tokens), referrals, revenue and burns.
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useConnection } from "wagmi";
import { ArrowRight, Droplets, Flame, Gift, LineChart, Sprout } from "lucide-react";
import { Page } from "../components/layout/Layout";
import { ButtonLink, Card, CardHeader, Skeleton, Stat } from "../components/ui";
import { PairIcon } from "../components/TokenIcon";
import { ConnectButton } from "../components/layout/Wallet";
import { api, type PoolOverview } from "../lib/api";
import { useAppConfig } from "../lib/config";
import { amount, bps, pct, sig, usd } from "../lib/format";

function PoolList({ pools, loading }: { pools: PoolOverview[]; loading: boolean }) {
  if (loading) return <Skeleton className="mt-4 h-52 w-full" />;
  if (!pools.length) return <p className="mt-4 text-sm text-mute">No pools to show right now.</p>;
  return (
    <ul className="mt-3 divide-y divide-line/70">
      {pools.map((p) => (
        <li key={p.address}>
          <Link to={`/liquidity/new?pool=${p.address}`} className="flex items-center gap-3 py-3 hover:text-gold-2">
            <PairIcon a={p.token0} b={p.token1} size={26} />
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5 font-medium">
                {p.token0.symbol} / {p.token1.symbol}
                {p.farm && <Sprout className="size-3.5 text-gold" aria-label="CAKE farm" />}
              </span>
              <span className="text-xs text-mute">
                {pct(p.feePct, { digits: 2 })} · {usd(p.liquidityUsd, { compact: true })} liquidity
              </span>
            </span>
            <span className="text-right">
              <span className="num block font-semibold text-gold-2">{p.estAprPct !== null ? pct(p.estAprPct) : pct(p.aprPct)}</span>
              <span className="block text-xs text-mute">{p.estAprPct !== null ? "est. APR" : "APR"}</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function AppHome() {
  const { protocol } = useAppConfig();
  const { address } = useConnection();
  const positions = useQuery({ queryKey: ["positions", address], queryFn: () => api.positions(address!), enabled: !!address });
  const pools = useQuery({ queryKey: ["pools"], queryFn: api.pools, refetchInterval: 60_000 });
  const well = useQuery({ queryKey: ["well", address], queryFn: () => api.well(address) });
  const stats = useQuery({ queryKey: ["protocol"], queryFn: api.protocol });
  const refs = useQuery({ queryKey: ["referrals", address], queryFn: () => api.referrals(address!), enabled: !!address });

  const open = (positions.data?.positions ?? []).filter((p) => !p.closed);
  const value = open.reduce((s, p) => s + p.valueUsd, 0);
  const fees = open.reduce((s, p) => s + p.feesUsd, 0);
  const rank = (p: PoolOverview) => p.estAprPct ?? p.aprPct / 3;
  const crypto = (pools.data?.pools ?? []).filter((p) => p.group === "popular").sort((a, b) => rank(b) - rank(a)).slice(0, 5);
  const stocks = (pools.data?.pools ?? []).filter((p) => p.group === "stocks").sort((a, b) => b.liquidityUsd - a.liquidityUsd).slice(0, 5);
  const weeks = Object.values(stats.data?.revenueByWeekBnb ?? {});
  const revenue = weeks.reduce((s, w) => s + w.fee + w.swap + w.launchpad, 0);

  return (
    <Page>
      <h1 className="text-3xl font-semibold sm:text-4xl">
        Welcome to <span className="gold-text">Qudao</span>
      </h1>
      <p className="mt-2 text-fg-2">Your PancakeSwap liquidity, kept in range.</p>

      <Card hi className="mt-8 p-6">
        <CardHeader title="Your overview" right={address ? <ButtonLink to="/dashboard" variant="ghost" size="sm">Dashboard <ArrowRight className="size-4" /></ButtonLink> : undefined} />
        {!address ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm text-fg-2">Connect a wallet to see your positions, staking and referrals in one place.</p>
            <ConnectButton />
          </div>
        ) : (
          <div className="mt-5 grid grid-cols-2 gap-6 md:grid-cols-4">
            <Stat big label="Positions value" value={positions.isLoading ? <Skeleton className="h-9 w-28" /> : usd(value)} />
            <Stat big label="Fees to claim" value={<span className="text-up">{usd(fees)}</span>} />
            <Stat big label="Earning now" value={`${open.filter((p) => p.inRange).length} / ${open.length}`} />
            <Stat big label="Staking rewards" value={`${amount(well.data?.account?.earnedBnb ?? "0", 18, 4)}`} sub="BNB to claim" />
          </div>
        )}
        {address && positions.data && open.length === 0 && (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-ink-2 p-4">
            <p className="text-sm text-fg-2">No positions yet. Pick a pool and a range; Qudao does the rest.</p>
            <ButtonLink to="/liquidity" size="sm">Find a pool</ButtonLink>
          </div>
        )}
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="p-6">
          <CardHeader title="The Well" sub="Stake QDAO, earn BNB, pay less." right={<Droplets className="size-5 text-gold" />} />
          <div className="mt-5 grid grid-cols-2 gap-4">
            <Stat label="APR" value={<span className="text-gold-2">{pct(well.data?.aprPct)}</span>} />
            <Stat label="Your discount" value={well.data?.account?.discountBps ? bps(well.data.account.discountBps) : "—"} sub="on Qudao's fee" />
          </div>
          <ButtonLink to="/staking" variant="ghost" size="sm" className="mt-5">
            Open The Well <ArrowRight className="size-4" />
          </ButtonLink>
        </Card>

        <Card className="p-6">
          <CardHeader title="Top crypto pools" sub="Highest estimated APR for a managed ±5% range." right={<LineChart className="size-5 text-gold" />} />
          <PoolList pools={crypto} loading={pools.isLoading} />
        </Card>

        <Card className="p-6">
          <CardHeader title="Top Stock Token pools" sub="Tokenized shares on PancakeSwap." right={<LineChart className="size-5 text-info" />} />
          <PoolList pools={stocks} loading={pools.isLoading} />
        </Card>

        <Card className="p-6">
          <CardHeader title="Referrals" sub={`Earn ${bps(protocol.referrals.referrerShareBps)} of your friends' fees, in BNB.`} right={<Gift className="size-5 text-gold" />} />
          <div className="mt-5 grid grid-cols-2 gap-4">
            <Stat label="Your code" value={refs.data?.code ? <span className="text-gold-2">{refs.data.code.toUpperCase()}</span> : "—"} />
            <Stat label="Invited" value={refs.data?.invited.length ?? 0} sub={refs.data ? `${sig(refs.data.earnedBnb, 4)} BNB earned` : undefined} />
          </div>
          <ButtonLink to="/referrals" variant="ghost" size="sm" className="mt-5">
            {refs.data?.code ? "Share your link" : "Get your link"} <ArrowRight className="size-4" />
          </ButtonLink>
        </Card>

        <Card className="p-6 lg:col-span-2">
          <CardHeader title="Revenue and burns" sub="What Qudao earned in the last 8 weeks and what it burned." right={<Flame className="size-5 text-[#ff7a45]" />} />
          <div className="mt-5 grid grid-cols-2 gap-6 md:grid-cols-4">
            <Stat label="Revenue" value={`${sig(revenue, 4)} BNB`} sub="8 weeks" />
            <Stat label="Burned" value={stats.data?.token ? amount(stats.data.token.burned, 18, 0) : "—"} sub="QDAO" />
            <Stat label="Managed" value={usd(stats.data?.managed?.tvlUsd, { compact: true })} sub={`${stats.data?.managed?.positions ?? 0} positions`} />
            <Stat label="Range moves" value={stats.data?.managed?.moves30d ?? 0} sub="last 30 days" />
          </div>
          <ButtonLink to="/token" variant="ghost" size="sm" className="mt-5">
            Protocol details <ArrowRight className="size-4" />
          </ButtonLink>
        </Card>
      </div>
    </Page>
  );
}
