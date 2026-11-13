// Position details: numbers, range, history, and every owner action (claim, claim as BNB, compound, add funds,
// take out, close, move the range now, settings).
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getAddress, parseUnits, type Hex } from "viem";
import { ExternalLink } from "lucide-react";
import { Drawer } from "../Modal";
import { RangeBar } from "../charts";
import { AmountInput } from "../AmountInput";
import { Badge, Button, Info, Notice, Row, Segmented, Stat, Toggle } from "../ui";
import { StatusBadge } from "./PositionCard";
import { viewFor } from "../../lib/position";
import { api, type ChainEvent, type Position, type StrategyName, type SwapStep } from "../../lib/api";
import { useAppConfig } from "../../lib/config";
import { useTx, type Call } from "../../lib/tx";
import { useFunding } from "../../lib/fund";
import { toast } from "../../lib/toast";
import { amount, ago, bps, dateTime, pct, sig, usd } from "../../lib/format";
import { amountsFor, otherAmount, rangePrices } from "../../lib/v3";
import { STRATEGIES, strategyIndex, strategyOf } from "../../data/strategies";
import { BNB, type Token } from "../../hooks/tokens";
import { qudaoFactoryAbi, qudaoVaultAbi } from "../../abis/abis";
import { t as tr, useT } from "../../i18n";

type Tab = "overview" | "add" | "withdraw" | "settings" | "history";

const steps = (s: SwapStep[]) => s.map((x) => ({ tokenIn: x.tokenIn, tokenOut: x.tokenOut, amountIn: BigInt(x.amountIn), router: x.router, data: x.data }));

export function PositionDrawer({ p, onClose }: { p: Position | null; onClose: () => void }) {
  const { t } = useT();
  const [tab, setTab] = useState<Tab>("overview");
  if (!p) return null;
  const v = viewFor(p);
  return (
    <Drawer
      open
      onClose={onClose}
      title={
        <span className="flex items-center gap-3">
          {v.base} / {v.quote} <StatusBadge p={p} />
        </span>
      }
    >
      <Segmented
        size="sm"
        value={tab}
        onChange={setTab}
        options={[
          { value: "overview", label: t("Overview") },
          ...(!p.closed
            ? [
                { value: "add" as Tab, label: t("Add funds") },
                { value: "withdraw" as Tab, label: t("Take out") },
                { value: "settings" as Tab, label: t("Settings") },
              ]
            : []),
          { value: "history", label: t("History") },
        ]}
      />
      <div className="mt-6">
        {tab === "overview" && <Overview p={p} />}
        {tab === "add" && <AddFunds p={p} />}
        {tab === "withdraw" && <Withdraw p={p} onClosed={onClose} />}
        {tab === "settings" && <Settings p={p} />}
        {tab === "history" && <History p={p} />}
      </div>
    </Drawer>
  );
}

function Overview({ p }: { p: Position }) {
  const { t } = useT();
  const tx = useTx();
  const v = viewFor(p);
  const [low, high] = rangePrices(v, p.tickLower, p.tickUpper);
  const current = v.at(p.tick);
  const [busy, setBusy] = useState<string | null>(null);
  const call = (functionName: string, args: unknown[] = []): Call => ({ address: p.address, abi: qudaoVaultAbi, functionName, args });
  const run = async (key: string, title: string, make: () => Promise<Call[] | null>) => {
    setBusy(key);
    try {
      const calls = await make();
      if (calls) await tx(title, calls);
    } catch (e) {
      toast.error(title, (e as Error).message);
    } finally {
      setBusy(null);
    }
  };
  const fees0 = BigInt(p.claimable0) + BigInt(p.uncollected0);
  const fees1 = BigInt(p.claimable1) + BigInt(p.uncollected1);
  const cake = BigInt(p.claimableCake) + BigInt(p.pendingCake);
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-5 sm:grid-cols-3">
        <Stat label={t("Value")} value={usd(p.valueUsd)} />
        <Stat label={t("Fees to claim")} value={<span className="text-up">{usd(p.feesUsd)}</span>} />
        <Stat label={t("APR")} value={<span className="text-gold-2">{p.aprPct !== undefined ? pct(p.aprPct) : "—"}</span>} sub={t("from fees since opening")} />
        <Stat label={t("Profit / loss")} value={<span className={(p.pnlUsd ?? 0) >= 0 ? "text-up" : "text-down"}>{usd(p.pnlUsd, { sign: true })}</span>} sub={t("vs. prices when deposited")} />
        <Stat label={t("Put in")} value={usd(p.depositedUsd)} sub={p.takenOutUsd ? t("{usd} taken out", { usd: usd(p.takenOutUsd) }) : undefined} />
        <Stat label={t("Fees earned")} value={usd(p.feesEarnedUsd)} sub={t("incl. reinvested")} />
      </div>

      {!p.closed && (
        <div className="rounded-2xl border border-line bg-ink-2 p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">{t("Range")}</span>
            <span className="text-xs text-mute">
              {t(strategyOf(p.settings.strategy).label)} · {t("moved {when}", { when: p.lastRebalance > p.openedAt ? ago(p.lastRebalance) : t("never") })}
            </span>
          </div>
          <div className="mt-4">
            <RangeBar low={low} high={high} current={current} />
          </div>
          <div className="num mt-2 flex justify-between text-xs text-mute">
            <span>{sig(low)}</span>
            <span className="text-fg">
              1 {v.base} = {sig(current)} {v.quote}
            </span>
            <span>{sig(high)}</span>
          </div>
          {!p.inRange && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-fg-2">{t("The price left the range, so it isn't earning. Qudao moves it back automatically; you can also do it now.")}</p>
              <Button
                size="sm"
                variant="ghost"
                busy={busy === "move"}
                onClick={() =>
                  run("move", t("Move range"), async () => {
                    const plan = await api.planVault("rebalance", p.address);
                    if (!plan || plan.lower === undefined) throw new Error(t("No new range available yet."));
                    return [call("rebalance", [plan.lower, plan.upper, steps(plan.steps)])];
                  })
                }
              >
                {t("Move range now")}
              </Button>
            </div>
          )}
        </div>
      )}

      <div className="rounded-2xl border border-line bg-ink-2 p-4">
        <div className="mb-2 text-sm font-medium">{t("In the position")}</div>
        <Row label={p.symbol0}>{amount(p.principal0, p.decimals0)}</Row>
        <Row label={p.symbol1}>{amount(p.principal1, p.decimals1)}</Row>
        {(BigInt(p.idle0) > 0n || BigInt(p.idle1) > 0n) && (
          <Row label={<span className="inline-flex items-center gap-1">{t("Waiting to be added")} <Info>{t("Leftovers a move or reinvest couldn't place. They count as part of the position and are added back on the next move.")}</Info></span>}>
            {amount(p.idle0, p.decimals0)} {p.symbol0} · {amount(p.idle1, p.decimals1)} {p.symbol1}
          </Row>
        )}
        <div className="mt-3 mb-2 text-sm font-medium">{t("Fees to claim")}</div>
        <Row label={p.symbol0}>{amount(fees0, p.decimals0)}</Row>
        <Row label={p.symbol1}>{amount(fees1, p.decimals1)}</Row>
        {(cake > 0n || p.staked) && (
          <Row label={<span className="inline-flex items-center gap-1.5">CAKE {p.staked && <Badge tone="gold">{t("farming")}</Badge>}</span>}>{amount(cake, 18)}</Row>
        )}
        <p className="mt-2 text-xs text-mute">
          {p.settings.autoCompound
            ? t("Before the Qudao fee. {share} of new fees are reinvested automatically.", { share: `${p.settings.reinvestBps / 100}%` })
            : t("Before the Qudao fee. Automatic reinvesting is off.")}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button busy={busy === "claim"} disabled={p.feesUsd <= 0} onClick={() => run("claim", t("Claim fees"), async () => [call("claim")])}>
          {t("Claim")}
        </Button>
        <Button
          variant="ghost"
          busy={busy === "bnb"}
          disabled={p.feesUsd <= 0}
          onClick={() =>
            run("bnb", t("Claim as BNB"), async () => {
              const plan = await api.planVault("claim-bnb", p.address);
              return [call("claimAsBNB", [steps(plan?.steps ?? [])])];
            })
          }
        >
          {t("Claim as BNB")}
        </Button>
        {!p.closed && (
          <Button
            variant="ghost"
            busy={busy === "compound"}
            onClick={() =>
              run("compound", t("Compound now"), async () => {
                const plan = await api.planVault("compound", p.address);
                return [call("compound", [steps(plan?.steps ?? [])])];
              })
            }
          >
            {t("Compound now")}
          </Button>
        )}
      </div>
    </div>
  );
}

function AddFunds({ p }: { p: Position }) {
  const { t } = useT();
  const cfg = useAppConfig();
  const fund = useFunding();
  const wbnb = getAddress(cfg.wbnb);
  const wbnbSide: 0 | 1 | null = getAddress(p.token0) === wbnb ? 0 : getAddress(p.token1) === wbnb ? 1 : null;
  const [native, setNative] = useState(true);
  const [amt, setAmt] = useState<[string, string]>(["", ""]);
  const [busy, setBusy] = useState(false);
  const d = [p.decimals0, p.decimals1];
  const token = (side: 0 | 1): Token =>
    wbnbSide === side && native ? BNB : { address: side ? p.token1 : p.token0, symbol: side ? p.symbol1 : p.symbol0, name: "", decimals: d[side] };
  const edit = (side: 0 | 1, val: string) => {
    const o = side === 0 ? 1 : 0;
    const other = otherAmount(side, Number(val) * 10 ** d[side], p.tick, p.tickLower, p.tickUpper);
    const next: [string, string] = [...amt] as [string, string];
    next[side] = val;
    next[o] = !val ? "" : other === null ? "0" : String(Number((other / 10 ** d[o]).toPrecision(8)));
    setAmt(next);
  };
  const raw = (side: 0 | 1) => {
    try {
      return amt[side] ? parseUnits(amt[side], d[side]) : 0n;
    } catch {
      return 0n;
    }
  };
  const go = async () => {
    if (!cfg.deployment) return;
    setBusy(true);
    try {
      const a0 = raw(0);
      const a1 = raw(1);
      const n0 = wbnbSide === 0 && native ? a0 : 0n;
      const n1 = wbnbSide === 1 && native ? a1 : 0n;
      const min = (x: bigint) => (x * BigInt(10_000 - p.settings.slippageBps)) / 10_000n;
      await fund(
        t("Add funds"),
        cfg.deployment.factory,
        [
          { token: p.token0, amount: a0 - n0, symbol: p.symbol0 },
          { token: p.token1, amount: a1 - n1, symbol: p.symbol1 },
        ],
        (permit, signature: Hex) => ({
          address: cfg.deployment!.factory,
          abi: qudaoFactoryAbi,
          functionName: "addFunds",
          args: [p.address, a0, a1, min(a0), min(a1), permit, signature],
          value: n0 + n1,
          label: t("Add funds"),
        }),
      );
      setAmt(["", ""]);
    } finally {
      setBusy(false);
    }
  };
  const onlyOne = p.tick < p.tickLower ? 0 : p.tick >= p.tickUpper ? 1 : null;
  return (
    <div className="space-y-3">
      <p className="text-sm text-fg-2">{t("Added at the position's current range. Whatever doesn't fit the ratio goes back to your wallet.")}</p>
      {wbnbSide !== null && <Toggle checked={native} onChange={setNative} label={t("Pay with BNB")} />}
      {([0, 1] as const).map((s) => (onlyOne !== null && onlyOne !== s ? null : <AmountInput key={s} token={token(s)} value={amt[s]} onChange={(val) => edit(s, val)} maxReserve={parseUnits("0.005", 18)} />))}
      <Button className="w-full" size="lg" busy={busy} disabled={raw(0) === 0n && raw(1) === 0n} onClick={go}>
        {t("Add funds")}
      </Button>
    </div>
  );
}

function Withdraw({ p, onClosed }: { p: Position; onClosed: () => void }) {
  const { t } = useT();
  const tx = useTx();
  const [share, setShare] = useState(50);
  const [busy, setBusy] = useState(false);
  const L = BigInt(p.liquidity);
  const slip = p.settings.slippageBps;
  const [e0, e1] = amountsFor(Number(L), p.tick, p.tickLower, p.tickUpper);
  const part = share / 100;
  const min = (x: number) => BigInt(Math.floor(x * part * (1 - slip / 10_000)));
  const go = async () => {
    setBusy(true);
    try {
      if (share === 100) {
        const ok = await tx(t("Close position"), [{ address: p.address, abi: qudaoVaultAbi, functionName: "close", args: [min(e0), min(e1)] }]);
        if (ok) onClosed();
      } else {
        const liq = (L * BigInt(share)) / 100n;
        await tx(t("Take out"), [{ address: p.address, abi: qudaoVaultAbi, functionName: "withdraw", args: [liq, min(e0), min(e1)] }]);
      }
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-end justify-between">
          <span className="label">{t("Amount")}</span>
          <span className="num text-3xl font-semibold">{share}%</span>
        </div>
        <input type="range" min={5} max={100} step={5} value={share} onChange={(e) => setShare(Number(e.target.value))} className="mt-3 w-full accent-[var(--color-gold)]" />
        <div className="mt-2 flex gap-2">
          {[25, 50, 75, 100].map((x) => (
            <button key={x} onClick={() => setShare(x)} className={`rounded-lg border px-3 py-1 text-xs ${share === x ? "border-gold/60 text-gold-2" : "border-line text-fg-2"}`}>
              {x === 100 ? t("All (close)") : `${x}%`}
            </button>
          ))}
        </div>
      </div>
      <div className="rounded-2xl border border-line bg-ink-2 px-4 py-2">
        <Row label={t("You receive {symbol}", { symbol: p.symbol0 })}>≈ {sig((e0 * part) / 10 ** p.decimals0)}</Row>
        <Row label={t("You receive {symbol}", { symbol: p.symbol1 })}>≈ {sig((e1 * part) / 10 ** p.decimals1)}</Row>
        <Row label={t("Value")}>≈ {usd(p.valueUsd * part)}</Row>
        {share === 100 && <p className="pb-1 text-xs text-mute">{t("Closing also sends any unclaimed fees and CAKE to your wallet.")}</p>}
      </div>
      <Notice>{t("Taking out and closing always work, even if Qudao is paused. Tolerance: {slip}.", { slip: bps(slip) })}</Notice>
      <Button className="w-full" size="lg" variant={share === 100 ? "danger" : "gold"} busy={busy} onClick={go}>
        {share === 100 ? t("Close position") : t("Take out {share}%", { share })}
      </Button>
    </div>
  );
}

function Settings({ p }: { p: Position }) {
  const { t } = useT();
  const cfg = useAppConfig();
  const tx = useTx();
  const [s, setS] = useState(p.settings);
  const [busy, setBusy] = useState(false);
  const changed = JSON.stringify(s) !== JSON.stringify(p.settings);
  const isStock = /(xstock|ondo|tokenized|bstock)/i.test(`${p.symbol0} ${p.symbol1}`) || p.settings.waitForMarket;
  const save = async () => {
    setBusy(true);
    try {
      await tx(t("Save settings"), [
        {
          address: p.address,
          abi: qudaoVaultAbi,
          functionName: "updateSettings",
          args: [{ strategy: strategyIndex(s.strategy), waitForMarket: s.waitForMarket, autoCompound: s.autoCompound, reinvestBps: s.reinvestBps, slippageBps: s.slippageBps }],
        },
      ]);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="space-y-6">
      <div>
        <div className="label mb-2">{t("When the price moves")}</div>
        <div className="grid gap-2">
          {STRATEGIES.map((x) => (
            <button
              key={x.value}
              onClick={() => setS({ ...s, strategy: x.value as StrategyName })}
              className={`rounded-2xl border p-3 text-left ${s.strategy === x.value ? "border-gold/70 bg-gold/8" : "border-line bg-ink-2"}`}
            >
              <div className="text-sm font-semibold">{t(x.label)}</div>
              <div className="text-xs text-mute">{t(x.body)}</div>
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-mute">{t("A new rule applies from the next move. Dynamic rules stay between half and twice the width you started with.")}</p>
      </div>
      {isStock && <Toggle checked={s.waitForMarket} onChange={(x) => setS({ ...s, waitForMarket: x })} label={t("Wait for the stock market to open")} />}
      <div>
        <Toggle checked={s.autoCompound} onChange={(x) => setS({ ...s, autoCompound: x })} label={t("Reinvest fees automatically")} />
        {s.autoCompound && (
          <div className="mt-3">
            <div className="flex justify-between text-xs text-mute">
              <span>{t("Share reinvested")}</span>
              <span className="num text-fg">{s.reinvestBps / 100}%</span>
            </div>
            <input
              type="range"
              min={cfg.protocol.automation.reinvestShareMinBps / 100}
              max={100}
              step={5}
              value={s.reinvestBps / 100}
              onChange={(e) => setS({ ...s, reinvestBps: Number(e.target.value) * 100 })}
              className="mt-2 w-full accent-[var(--color-gold)]"
            />
          </div>
        )}
      </div>
      <div>
        <div className="label mb-2">{t("Swap price tolerance")}</div>
        <Segmented size="sm" value={String(s.slippageBps)} onChange={(x) => setS({ ...s, slippageBps: Number(x) })} options={[100, 200, 300, 400, 500].map((b) => ({ value: String(b), label: bps(b) }))} />
      </div>
      <Button className="w-full" size="lg" disabled={!changed} busy={busy} onClick={save}>
        {t("Save settings")}
      </Button>
    </div>
  );
}

function describe(e: ChainEvent, p: Position): string {
  const a = e.args as Record<string, string>;
  const tok = (x: string | undefined, side: 0 | 1) => `${amount(x ?? "0", side ? p.decimals1 : p.decimals0)} ${side ? p.symbol1 : p.symbol0}`;
  const extra = (parts: string[]) => (parts.length ? ` + ${parts.join(" + ")}` : "");
  const v = viewFor(p);
  const priceAt = (tick: number) => sig(v.at(tick));
  switch (e.name) {
    case "Opened":
      return tr("Opened with {a} and {b}", { a: tok(a.amount0, 0), b: tok(a.amount1, 1) });
    case "FundsAdded":
      return tr("Added {a} and {b}", { a: tok(a.amount0, 0), b: tok(a.amount1, 1) });
    case "Withdrawn":
      return tr("Took out {a} and {b}", { a: tok(a.amount0, 0), b: tok(a.amount1, 1) });
    case "Closed":
      return tr("Closed: {a} and {b} sent to the wallet", { a: tok(a.amount0, 0), b: tok(a.amount1, 1) });
    case "Rebalanced": {
      const [lo, hi] = [priceAt(Number(a.newLower)), priceAt(Number(a.newUpper))].sort((x, y) => Number(x.replace(/,/g, "")) - Number(y.replace(/,/g, "")));
      return tr("Range moved to {lo} – {hi} (price {price})", { lo, hi, price: priceAt(Number(a.tick)) });
    }
    case "Reinvested":
      return tr("Reinvested {a} and {b}", { a: tok(a.amount0, 0), b: tok(a.amount1, 1) });
    case "FeesCollected":
      return tr("Fees collected: {a} and {b}{extra}", {
        a: tok(a.fees0, 0),
        b: tok(a.fees1, 1),
        extra: extra(BigInt(a.cakeEarned ?? 0) > 0n ? [`${amount(a.cakeEarned, 18)} CAKE`] : []),
      });
    case "Claimed":
      return tr("Claimed {a} and {b}{extra}", {
        a: tok(a.amount0, 0),
        b: tok(a.amount1, 1),
        extra: extra([...(BigInt(a.bnb ?? 0) > 0n ? [`${amount(a.bnb, 18)} BNB`] : []), ...(BigInt(a.cakeAmount ?? 0) > 0n ? [`${amount(a.cakeAmount, 18)} CAKE`] : [])]),
      });
    case "SettingsUpdated": {
      const s = (e.args as { settings: { strategy: number; autoCompound: boolean; reinvestBps: number } }).settings;
      return tr("Settings: {rule}, reinvest {share}", {
        rule: tr(STRATEGIES[s.strategy]?.short ?? "rule"),
        share: s.autoCompound ? `${s.reinvestBps / 100}%` : tr("off"),
      });
    }
    case "Swapped":
      return tr("Swapped {a} → {b}", {
        a: a.tokenIn?.toLowerCase() === p.token0.toLowerCase() ? p.symbol0 : p.symbol1,
        b: a.tokenOut?.toLowerCase() === p.token0.toLowerCase() ? p.symbol0 : p.symbol1,
      });
    case "KeeperRefunded":
      return tr("Automation gas refunded: {amount} BNB", { amount: amount(a.amount, 18, 5) });
    case "FarmStaked":
      return tr("Staked in the CAKE farm");
    case "FarmUnstaked":
      return tr("Unstaked from the CAKE farm");
    default:
      return e.name;
  }
}

function History({ p }: { p: Position }) {
  const { t } = useT();
  const { chain } = useAppConfig();
  const { data, isLoading } = useQuery({ queryKey: ["position-history", p.address], queryFn: () => api.positionHistory(p.address) });
  const events = [...(data?.events ?? [])].reverse();
  return (
    <div>
      {isLoading && <p className="text-sm text-mute">{t("Loading…")}</p>}
      {data && events.length === 0 && <p className="text-sm text-mute">{t("Nothing yet. Events appear here a few seconds after they happen.")}</p>}
      <ol className="relative space-y-4 border-l border-line pl-5">
        {events.map((e) => (
          <li key={`${e.tx}-${e.name}-${e.block}`} className="relative">
            <span className={`absolute top-1.5 -left-[25px] size-2.5 rounded-full ${e.name === "Rebalanced" ? "bg-gold" : e.name.startsWith("Fees") || e.name === "Claimed" || e.name === "Reinvested" ? "bg-up" : "bg-line-2"}`} />
            <div className="text-sm text-fg">{describe(e, p)}</div>
            <div className="mt-0.5 flex items-center gap-2 text-xs text-mute">
              {dateTime(e.ts)}
              <a href={`${chain.explorer}/tx/${e.tx}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 hover:text-gold-2">
                {t("Tx")} <ExternalLink className="size-3" />
              </a>
            </div>
          </li>
        ))}
      </ol>
      <p className="mt-6 text-xs text-mute">
        {t("Vault {address} · position NFT #{id}", { address: p.address, id: p.tokenId })}
      </p>
    </div>
  );
}
