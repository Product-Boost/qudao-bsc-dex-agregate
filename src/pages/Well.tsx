// The Well: stake QDAO (no lock) for a share of Qudao's revenue in BNB, streamed over 30 days, and a lower
// Qudao fee. The tier grid shows amount × time staked → fee discount and reward boost, with "plan ahead".
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useConfig, useConnection } from "wagmi";
import { formatUnits, parseUnits, zeroAddress } from "viem";
import { Droplets, Lock, Sparkles } from "lucide-react";
import { Page } from "../components/layout/Layout";
import { Badge, Button, Card, CardHeader, Ext, Info, Notice, PageTitle, Segmented, Stat } from "../components/ui";
import { AmountInput } from "../components/AmountInput";
import { StackedBars } from "../components/charts";
import { GuideButton } from "../components/Guide";
import { ConnectButton } from "../components/layout/Wallet";
import { api } from "../lib/api";
import { useAppConfig } from "../lib/config";
import { useTx } from "../lib/tx";
import { approvalsNeeded } from "../lib/permit2";
import { bps, date, duration, num, pct, sig, usd } from "../lib/format";
import { useTokenMeta } from "../hooks/tokens";
import { theWellAbi } from "../abis/abis";

const PLAN = [
  { value: "0", label: "As now" },
  { value: "30", label: "1 month" },
  { value: "90", label: "3 months" },
  { value: "180", label: "6 months" },
];

/** Earned BNB ticking up every second since it was read (the stream pays per second). */
function useLiveEarned(earnedWei: string | undefined, readAt: number, perDay: number | undefined, streaming: boolean | undefined) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!streaming) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [streaming]);
  const extra = streaming && perDay && readAt ? (perDay * Math.max(0, now - readAt)) / 86_400_000 : 0;
  return Number(formatUnits(BigInt(earnedWei ?? "0"), 18)) + extra;
}

export default function Well() {
  const cfg = useAppConfig();
  const dep = cfg.deployment;
  const config = useConfig();
  const { address } = useConnection();
  const tx = useTx();
  const { data: info, dataUpdatedAt } = useQuery({ queryKey: ["well", address], queryFn: () => api.well(address), refetchInterval: 30_000 });
  const live = info?.token && info.token !== zeroAddress;
  const { token: qdao } = useTokenMeta(live ? info!.token : null);
  const acct = info?.account;
  const earned = useLiveEarned(acct?.earnedBnb, dataUpdatedAt, acct?.rewardBnbPerDay, info?.streaming);
  const [mode, setMode] = useState<"stake" | "unstake">("stake");
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [plan, setPlan] = useState("0");

  const tiers = info?.tiers;
  const amounts = (tiers?.amounts ?? cfg.protocol.staking.tierAmounts.map((a) => (BigInt(a) * 10n ** 18n).toString())).map((a) => Number(formatUnits(BigInt(a), 18)));
  const days = tiers?.days ?? cfg.protocol.staking.tierDays;
  const discount = tiers?.discountBps ?? cfg.protocol.staking.discountBps;
  const boost = tiers?.boostBps ?? cfg.protocol.staking.boostBps;

  // where you are (or would be): amount after this stake/unstake, time staked after the planned wait
  const staked = acct ? Number(formatUnits(BigInt(acct.staked), 18)) : 0;
  const delta = Number(value) || 0;
  const afterAmount = mode === "stake" ? staked + delta : Math.max(0, staked - delta);
  // a top-up shortens time staked in proportion; a partial unstake keeps it; a full unstake resets it
  const daysNow = acct?.daysStaked ?? 0;
  const afterDays = (mode === "stake" && delta > 0 ? (daysNow * staked) / (staked + delta) : afterAmount === 0 ? 0 : daysNow) + Number(plan);
  const row = amounts.reduce((r, a, i) => (afterAmount >= a ? i : r), -1);
  const col = days.reduce((c, d, i) => (afterDays >= d ? i : c), 0);

  const amountWei = useMemo(() => {
    try {
      return value && qdao ? parseUnits(value, qdao.decimals) : 0n;
    } catch {
      return 0n;
    }
  }, [value, qdao]);

  const submit = async () => {
    if (!dep || !address || !qdao || amountWei === 0n) return;
    setBusy(true);
    try {
      const calls =
        mode === "stake"
          ? [...(await approvalsNeeded(config, address, dep.well, [{ token: qdao.address, amount: amountWei, symbol: qdao.symbol }])), { address: dep.well, abi: theWellAbi, functionName: "stake", args: [amountWei], label: "Stake" }]
          : [{ address: dep.well, abi: theWellAbi, functionName: "unstake", args: [amountWei], label: "Unstake" }];
      if (await tx(mode === "stake" ? "Stake QDAO" : "Unstake QDAO", calls)) setValue("");
    } finally {
      setBusy(false);
    }
  };

  const weekly = (info?.weeklyRewardsBnb ?? []).map((w) => ({ label: new Date(w.week).toLocaleDateString("en-US", { month: "short", day: "numeric" }), values: { bnb: w.bnb } }));

  return (
    <Page>
      <PageTitle
        title="The Well"
        sub="Stake QDAO to earn part of Qudao's revenue in BNB and pay a lower fee on your positions. No lock: unstake whenever you like."
        right={<GuideButton id="well" />}
      />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card className="p-5">
          <Stat label={<span className="inline-flex items-center gap-1">APR <Info>BNB paid to stakers per year at the current rate, divided by the value staked, at a 1× boost. Your own APR includes your boost.</Info></span>} value={<span className="text-gold-2">{pct(info?.aprPct)}</span>} />
        </Card>
        <Card className="p-5">
          <Stat label="Staked" value={usd(info?.stakedUsd, { compact: true })} sub={info?.totalStaked ? `${num(Number(formatUnits(BigInt(info.totalStaked), 18)), 0)} QDAO` : undefined} />
        </Card>
        <Card className="p-5">
          <Stat label="Rewards streaming" value={`${sig(info?.rewardBnbPerDay ?? 0, 4)} BNB/day`} sub={info?.streaming ? `until ${date(info.streamEndsAt!)}` : "Nothing streaming right now"} />
        </Card>
        <Card className="p-5">
          <Stat label="Paid to stakers" value={`${sig(info?.totalRewardsBnb ?? 0, 4)} BNB`} sub={`${usd((info?.totalRewardsBnb ?? 0) * (info?.bnbUsd ?? 0))} so far`} />
        </Card>
      </div>

      {!live && (
        <Notice tone="gold" className="mt-6">
          QDAO launches on <Ext href="https://flap.sh">flap.sh</Ext>. Staking opens the moment the token is live; until then, here's how the tiers work.
        </Notice>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1fr]">
        <Card className="p-6" >
          <div data-guide="well-stake">
            <CardHeader
              title="Your stake"
              right={acct?.hasTier ? <Badge tone="gold">Tier {acct.amountTier + 1}·{acct.timeTier + 1}</Badge> : undefined}
            />
            <div className="mt-5 grid grid-cols-3 gap-4">
              <Stat label="Staked" value={`${num(staked, 0)}`} sub={acct ? usd(acct.stakedUsd) : "QDAO"} />
              <Stat label="Time staked" value={acct && staked > 0 ? duration(acct.daysStaked * 86400) : "—"} />
              <Stat label="Your fee" value={bps(cfg.protocol.fees.protocolFeeBps * (1 - (acct?.discountBps ?? 0) / 10_000))} sub={acct?.discountBps ? `${bps(acct.discountBps)} off` : "no discount yet"} />
            </div>
            <div className="mt-6">
              <Segmented size="sm" value={mode} onChange={(m) => (setMode(m), setValue(""))} options={[{ value: "stake", label: "Stake" }, { value: "unstake", label: "Unstake" }]} />
              <div className="mt-3">
                <AmountInput token={qdao} value={value} onChange={setValue} />
              </div>
              {mode === "stake" && delta > 0 && staked > 0 && daysNow > 0 && (
                <p className="mt-2 text-xs text-mute">Adding shortens your time staked in proportion: {duration(daysNow * 86400)} → {duration(((daysNow * staked) / (staked + delta)) * 86400)}.</p>
              )}
              {mode === "unstake" && delta > 0 && delta >= staked && <p className="mt-2 text-xs text-warn">Unstaking everything resets your time staked.</p>}
              <div className="mt-4">
                {!address ? (
                  <ConnectButton className="w-full" size="lg" />
                ) : (
                  <Button className="w-full" size="lg" busy={busy} disabled={!live || amountWei === 0n} onClick={submit}>
                    {mode === "stake" ? "Stake" : "Unstake"}
                  </Button>
                )}
              </div>
              <p className="mt-3 flex items-center gap-1.5 text-xs text-mute">
                <Lock className="size-3.5" /> No lock. Nobody, not even Qudao's admin, can take BNB out of The Well except stakers claiming their rewards.
              </p>
            </div>
          </div>
        </Card>

        <div className="space-y-6">
          <Card hi className="p-6">
            <div data-guide="well-earnings">
              <CardHeader title="Your earnings" sub="Paid in BNB, streamed every second." right={<Droplets className="size-5 text-gold" />} />
              <div className="num mt-5 text-4xl font-semibold">
                {earned.toFixed(earned < 0.01 ? 8 : 6)} <span className="text-lg text-mute">BNB</span>
              </div>
              <div className="mt-1 text-sm text-mute">{usd(earned * (info?.bnbUsd ?? 0))}</div>
              <div className="mt-4 grid grid-cols-3 gap-4">
                <Stat label="Your APR" value={<span className="text-gold-2">{pct(acct?.aprPct)}</span>} />
                <Stat label="Boost" value={`${((acct?.boostBps ?? 10_000) / 10_000).toFixed(2)}×`} />
                <Stat label="Per day" value={`${sig(acct?.rewardBnbPerDay ?? 0, 3)}`} sub="BNB" />
              </div>
              <Button
                className="mt-5 w-full"
                size="lg"
                disabled={!address || earned <= 0 || !dep}
                onClick={() => dep && tx("Claim staking rewards", [{ address: dep.well, abi: theWellAbi, functionName: "claim" }])}
              >
                {earned > 0 ? "Claim" : "Nothing to claim yet"}
              </Button>
            </div>
          </Card>
        </div>
      </div>

      <Card className="mt-6 p-6">
        <div data-guide="well-tiers">
          <CardHeader
            title="Tiers"
            sub="Amount staked × time staked. Each cell: your discount on Qudao's fee, and your boost on staking rewards."
            right={<Segmented size="sm" value={plan} onChange={setPlan} options={PLAN} />}
          />
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[620px] border-separate border-spacing-1.5 text-sm">
              <thead>
                <tr>
                  <th className="label px-2 text-left font-medium">Staked</th>
                  {days.map((d) => (
                    <th key={d} className="label px-2 text-center font-medium">
                      {d === 0 ? "From day one" : `${Math.round(d / 30)} month${d >= 60 ? "s" : ""}+`}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {amounts.map((a, r) => (
                  <tr key={a}>
                    <td className="num px-2 font-semibold whitespace-nowrap">{num(a, 0)}+ QDAO</td>
                    {days.map((_, c) => {
                      const here = r === row && c === col;
                      return (
                        <td key={c} className={`rounded-xl px-3 py-2.5 text-center ${here ? "bg-gold text-gold-ink" : "bg-ink-2"}`}>
                          <div className="num font-semibold">−{bps(discount[r][c])}</div>
                          <div className={`num text-xs ${here ? "text-gold-ink/80" : "text-mute"}`}>{(boost[r][c] / 10_000).toFixed(2)}×</div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 flex items-center gap-1.5 text-xs text-mute">
            <Sparkles className="size-3.5 text-gold" />
            {row < 0
              ? `Stake at least ${num(amounts[0], 0)} QDAO to reach the first tier.`
              : `${plan === "0" ? "Highlighted: where you'd be now" : `Highlighted: where you'd be in ${PLAN.find((p) => p.value === plan)?.label}`}${delta ? " after this change" : ""}.`}
          </p>
        </div>
      </Card>

      <Card className="mt-6 p-6">
        <CardHeader title="Staking rewards in BNB" sub="BNB added to The Well each week. Each payment streams to stakers over 30 days." />
        <div className="mt-5">
          {weekly.length ? (
            <StackedBars data={weekly} series={[{ key: "bnb", label: "Paid in", color: "var(--color-gold)" }]} format={(n) => `${sig(n, 4)} BNB`} />
          ) : (
            <p className="py-10 text-center text-sm text-mute">No rewards paid in yet.</p>
          )}
        </div>
      </Card>
    </Page>
  );
}
