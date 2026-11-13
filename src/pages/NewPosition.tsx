// New position: pick a pair and fee tier (or create the pool), set the range and rule, see the last 30 days,
// deposit one token or both, then one signature + one transaction (or one confirmation on batching wallets).
import { useState } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useConfig, useConnection, useReadContract, useReadContracts } from "wagmi";
import { formatUnits, getAddress, isAddress, parseUnits, stringToHex, zeroAddress, type Address, type Hex } from "viem";
import { ArrowLeft, ChevronDown, Sprout } from "lucide-react";
import { Page } from "../components/layout/Layout";
import { Badge, Button, ButtonLink, Card, Info, Notice, Row, Segmented, Skeleton, Toggle } from "../components/ui";
import { PairIcon, TokenIcon } from "../components/TokenIcon";
import { TokenPicker, CheckBadge } from "../components/TokenPicker";
import { AmountInput } from "../components/AmountInput";
import { RangeEditor } from "../components/position/RangeEditor";
import { presetRange, type Preset } from "../lib/range";
import { Backtest } from "../components/position/Backtest";
import { ConnectButton } from "../components/layout/Wallet";
import { api, type PairPool, type StrategyName } from "../lib/api";
import { useAppConfig } from "../lib/config";
import { useTx, type Call } from "../lib/tx";
import { approvalsNeeded, type PermitBatch } from "../lib/permit2";
import { useFunding } from "../lib/fund";
import { toast } from "../lib/toast";
import { otherAmount, pairView, rangePrices, sqrtPriceX96, tickSpacingFor } from "../lib/v3";
import { bps, pct, sig, usd } from "../lib/format";
import { STRATEGIES, strategyIndex } from "../data/strategies";
import { BNB, NATIVE, useBaseTokens, usePrices, useResolvedToken, type Token } from "../hooks/tokens";
import { qudaoFactoryAbi, referralsAbi, swapperAbi } from "../abis/abis";
import { pancakeV3PoolAbi } from "../abis/external-abis";

const FEES = [100, 500, 2500, 10000] as const;
const STOCK = /(xstock|ondo|tokenized|bstock)/i;
const stub = (a: Address): Token => ({ address: getAddress(a), symbol: "", name: "", decimals: -1 });

function Step({ n, title, children, right }: { n: number; title: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <Card className="p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="num grid size-7 place-items-center rounded-full bg-gold/15 text-sm font-semibold text-gold">{n}</span>
          <h2 className="text-lg font-semibold">{title}</h2>
        </div>
        {right}
      </div>
      {children}
    </Card>
  );
}

function TokenButton({ token, onPick, exclude }: { token: Token | null; onPick: (t: Token) => void; exclude?: string[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} className="flex w-full items-center gap-3 rounded-2xl border border-line bg-ink-2 px-4 py-3 text-left hover:border-gold/50">
        {token ? <TokenIcon symbol={token.symbol} src={token.image} size={30} /> : <span className="size-[30px] rounded-full bg-panel-3" />}
        <span className="flex-1 font-semibold">{token?.symbol || (token ? "…" : "Choose")}</span>
        <ChevronDown className="size-4 text-mute" />
      </button>
      <TokenPicker open={open} onClose={() => setOpen(false)} onPick={onPick} exclude={exclude} />
    </>
  );
}

const toRaw = (v: string, d: number) => {
  try {
    return v && Number(v) > 0 ? parseUnits(v, d) : 0n;
  } catch {
    return 0n;
  }
};
const fromRaw = (raw: number, d: number) => (raw > 0 ? String(Number((raw / 10 ** d).toPrecision(8))) : "0");

export default function NewPosition() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const cfg = useAppConfig();
  const dep = cfg.deployment;
  const config = useConfig();
  const { address, chainId } = useConnection();
  const tx = useTx();
  const fund = useFunding();
  const base = useBaseTokens();
  const WBNB = getAddress(cfg.wbnb);
  const USDT = base.find((t) => t.symbol === "USDT")!;

  // ------------------------------------------------------------ 1. pair and pool
  const poolParam = params.get("pool");
  const tokenParam = params.get("token");
  const poolRead = useReadContracts({
    contracts:
      poolParam && isAddress(poolParam)
        ? (["token0", "token1", "fee"] as const).map((fn) => ({ address: poolParam as Address, abi: pancakeV3PoolAbi, functionName: fn }))
        : [],
    query: { staleTime: Infinity },
  });
  // what the user picked; until then, what the link asked for (?pool= or ?token=), else BNB / USDT
  const [pickA, setPickA] = useState<Token | null>(null);
  const [pickB, setPickB] = useState<Token | null>(null);
  const [feePick, setFee] = useState<number | null>(null);
  const known = (a?: string | null): Token | null => {
    if (!a || !isAddress(a)) return null;
    const addr = getAddress(a);
    return addr === WBNB ? BNB : (base.find((t) => t.address.toLowerCase() === addr.toLowerCase()) ?? stub(addr));
  };
  // An empty read (no ?pool=) still "succeeds": [].every(...) is true, so require the three pool fields.
  const fromPool =
    poolRead.data?.length === 3 && poolRead.data.every((x) => x.status === "success" && x.result != null)
      ? (poolRead.data.map((x) => x.result) as [Address, Address, number])
      : null;
  const tokenLink = !poolParam && tokenParam && isAddress(tokenParam) ? known(tokenParam) : null;
  const defaultA = fromPool ? known(fromPool[0]) : poolParam ? null : (tokenLink ?? BNB);
  const defaultB = fromPool ? known(fromPool[1]) : poolParam ? null : tokenLink ? (tokenLink.symbol === "USDT" ? BNB : USDT) : USDT;

  const A = useResolvedToken(pickA ?? defaultA);
  const B = useResolvedToken(pickB ?? defaultB);
  const poolAddr = (t: Token) => (t.address === NATIVE ? WBNB : t.address);
  const sorted = A && B ? (poolAddr(A).toLowerCase() < poolAddr(B).toLowerCase() ? [A, B] : [B, A]) : null;
  const same = !!A && !!B && poolAddr(A) === poolAddr(B);
  const [tok0, tok1] = (sorted ?? [null, null]) as [Token | null, Token | null];
  const t0 = tok0 ? poolAddr(tok0) : undefined;
  const t1 = tok1 ? poolAddr(tok1) : undefined;
  const wbnbSide: 0 | 1 | null = t0 === WBNB ? 0 : t1 === WBNB ? 1 : null;

  const pairQ = useQuery({ queryKey: ["pair", t0, t1], queryFn: () => api.pair(t0!, t1!), enabled: !!t0 && !!t1 && !same, staleTime: 60_000 });
  const pools = pairQ.data?.pools;
  // fee tier: the user's pick, else the linked pool's, else the pair's deepest existing pool
  const deepest = pools
    ?.filter((p) => p.exists)
    .sort((a, b) => (b.liquidityUsd ?? 0) - (a.liquidityUsd ?? 0) || Number(BigInt(b.liquidity ?? 0) - BigInt(a.liquidity ?? 0)))[0]?.fee;
  const linkedFee = fromPool && !pickA && !pickB ? Number(fromPool[2]) : null;
  const fee = [feePick, linkedFee, deepest, 2500].find((f) => f != null && (!pools || pools.some((p) => p.fee === f))) ?? 2500;
  const sel: PairPool | undefined = pools?.find((p) => p.fee === fee);
  const creating = !!sel && !sel.exists;
  const spacing = sel?.tickSpacing ?? tickSpacingFor(fee);
  const view = tok0 && tok1 ? pairView(tok0.symbol === "BNB" ? "WBNB" : tok0.symbol, tok1.symbol === "BNB" ? "WBNB" : tok1.symbol, tok0.decimals, tok1.decimals) : null;
  const [startPrice, setStartPrice] = useState("");
  const tick = creating ? (Number(startPrice) > 0 && view ? Math.round(view.tickOf(Number(startPrice))) : null) : (sel?.tick ?? null);

  // ------------------------------------------------------------ 2. range
  const stable = (t?: Token | null) => !!t && cfg.tokens.some((x) => x.stable && x.token.toLowerCase() === poolAddr(t).toLowerCase());
  const major = (t?: Token | null) => !!t && base.some((x) => x.address.toLowerCase() === t.address.toLowerCase());
  const defaultPreset: Exclude<Preset, "custom"> = stable(tok0) && stable(tok1) ? "1" : major(tok0) && major(tok1) ? "5" : "10";
  // a preset follows the price; a custom range sticks to the pool it was drawn on
  const [rangePick, setRangePick] = useState<{ preset: Preset; lower: number; upper: number; pool?: string } | null>(null);
  const poolKey = sel?.address ?? `${t0}:${t1}:${fee}`;
  const range = (() => {
    if (tick === null) return { lower: 0, upper: 0, preset: defaultPreset as Preset };
    if (rangePick?.preset === "custom" && rangePick.pool === poolKey) return rangePick;
    const preset = rangePick && rangePick.preset !== "custom" ? rangePick.preset : defaultPreset;
    return { ...presetRange(preset, tick, spacing), preset: preset as Preset };
  })();
  const setRange = (r: { lower: number; upper: number; preset: Preset }) => setRangePick({ ...r, pool: poolKey });
  const ready = tick !== null && range.upper > range.lower;

  // ------------------------------------------------------------ 3. rule and settings
  const [strategy, setStrategy] = useState<StrategyName>("static");
  const isStock = STOCK.test(`${tok0?.name} ${tok1?.name}`);
  const [waitForMarket, setWait] = useState(true);
  const [autoCompound, setAuto] = useState(true);
  const [reinvest, setReinvest] = useState(100);
  const slipDefault = major(tok0) && major(tok1) ? cfg.protocol.automation.slippage.majorsBps : cfg.protocol.automation.slippage.defaultBps;
  const [slip, setSlip] = useState<number | null>(null);
  const slippageBps = slip ?? slipDefault;
  const minShare = cfg.protocol.automation.reinvestShareMinBps / 100;

  // ------------------------------------------------------------ 4. deposit
  const [mode, setMode] = useState<"both" | "one">("both");
  const [payNative, setPayNative] = useState(true);
  // only the amount the user typed is kept; the other side always follows the range and price
  const [typed, setTyped] = useState<{ side: 0 | 1; value: string }>({ side: 0, value: "" });
  const [oneSide, setOneSide] = useState<0 | 1>(1);
  const [oneAmt, setOneAmt] = useState("");
  const d = [tok0?.decimals ?? 18, tok1?.decimals ?? 18];
  const display = (side: 0 | 1): Token | null => {
    const t = side === 0 ? tok0 : tok1;
    if (!t) return null;
    if (wbnbSide === side) return payNative ? BNB : { ...BNB, address: WBNB, symbol: "WBNB", name: "Wrapped BNB", image: "/icons/tokens/wbnb.png" };
    return t;
  };
  const amt: [string, string] = (() => {
    const { side, value } = typed;
    const out: [string, string] = ["", ""];
    out[side] = value;
    if (!value || !ready || tick === null) return out;
    const other = otherAmount(side, Number(value) * 10 ** d[side], tick, range.lower, range.upper);
    out[side === 0 ? 1 : 0] = other === null ? "0" : fromRaw(other, d[side === 0 ? 1 : 0]);
    return out;
  })();
  const editAmount = (side: 0 | 1, v: string) => setTyped({ side, value: v });
  const onlyOne: 0 | 1 | null = tick === null ? null : tick < range.lower ? 0 : tick >= range.upper ? 1 : null;

  const oneToken = display(oneSide);
  const oneRaw = toRaw(oneAmt, d[oneSide]);
  const planQ = useQuery({
    queryKey: ["plan-deposit", sel?.address, range.lower, range.upper, oneSide, payNative, oneRaw.toString()],
    queryFn: () =>
      api.planDeposit({
        pool: sel!.address!,
        tickLower: range.lower,
        tickUpper: range.upper,
        tokenIn: wbnbSide === oneSide && payNative ? NATIVE : (oneSide === 0 ? t0! : t1!),
        amountIn: oneRaw.toString(),
      }),
    enabled: mode === "one" && !!sel?.exists && oneRaw > 0n && ready && !!dep,
    retry: false,
  });

  const [raw0, raw1] =
    mode === "both" ? [toRaw(amt[0], d[0]), toRaw(amt[1], d[1])] : planQ.data ? [BigInt(planQ.data.amount0), BigInt(planQ.data.amount1)] : [0n, 0n];

  // ------------------------------------------------------------ prices, checks, fee, referral
  const priceOf = usePrices([t0, t1]);
  const p0 = priceOf(t0);
  const p1 = priceOf(t1);
  const depositUsd = Number(formatUnits(raw0, d[0])) * (p0 ?? 0) + Number(formatUnits(raw1, d[1])) * (p1 ?? 0);
  const toCheck = [t0, t1].filter((t): t is Address => !!t && !cfg.tokens.some((x) => x.token.toLowerCase() === t.toLowerCase()));
  const checks = useQueries({ queries: toCheck.map((t) => ({ queryKey: ["token-check", t], queryFn: () => api.tokenCheck(t), staleTime: 15 * 60_000 })) });
  const refused = checks.find((c) => c.data?.verdict === "refuse")?.data;

  const feeQ = useReadContract({
    address: dep?.factory,
    abi: qudaoFactoryAbi,
    functionName: "feeBpsFor",
    args: [address ?? zeroAddress],
    query: { enabled: !!dep },
  });
  const feeBps = feeQ.data !== undefined ? Number(feeQ.data) : cfg.protocol.fees.protocolFeeBps;
  const [ref, setRef] = useState(() => {
    const p = params.get("ref");
    try {
      if (p) localStorage.setItem("qudao:ref", p);
      return p ?? localStorage.getItem("qudao:ref") ?? "";
    } catch {
      return p ?? "";
    }
  });
  const refCode = /^[a-z0-9]{8}$/.test(ref) ? (stringToHex(ref, { size: 8 }) as Hex) : null;
  const refInfo = useReadContracts({
    contracts:
      dep && address
        ? [
            { address: dep.referrals, abi: referralsAbi, functionName: "ownerOfCode", args: [refCode ?? "0x0000000000000000"] },
            { address: dep.referrals, abi: referralsAbi, functionName: "referrerOf", args: [address] },
            { address: dep.factory, abi: qudaoFactoryAbi, functionName: "vaultsOf", args: [address] },
          ]
        : [],
    query: { enabled: !!dep && !!address },
  });
  const refOwner = refInfo.data?.[0]?.result as Address | undefined;
  const alreadyReferred = (refInfo.data?.[1]?.result as Address | undefined) ?? zeroAddress;
  const firstTime = ((refInfo.data?.[2]?.result as readonly Address[] | undefined) ?? [null]).length === 0;
  const refValid = !!refCode && !!refOwner && refOwner !== zeroAddress && refOwner !== address;

  // ------------------------------------------------------------ open
  const [busy, setBusy] = useState(false);
  const open = async () => {
    const missing = !dep
      ? "Qudao isn't live on this network yet."
      : !address
        ? "Connect a wallet."
        : !tok0 || !tok1 || !t0 || !t1 || !sel || tick === null
          ? "Choose a pair and a pool first."
          : !chainId
            ? "Your wallet didn't report its network. Reconnect it."
            : null;
    if (missing || !dep || !address || !tok0 || !tok1 || !t0 || !t1 || !sel || tick === null || !chainId) {
      toast.error("Can't open the position yet", missing ?? undefined);
      return;
    }
    setBusy(true);
    try {
      let a0 = raw0;
      let a1 = raw1;
      // one token in: swap part of it first (in-app swap), then deposit both
      if (mode === "one") {
        const plan = planQ.data;
        if (!plan) return;
        if (plan.swap) {
          const s = plan.swap;
          const outSide = oneSide === 0 ? 1 : 0;
          const tokenOut = wbnbSide === outSide && payNative ? NATIVE : outSide === 0 ? t0 : t1;
          const approvals = s.tokenIn === NATIVE ? [] : await approvalsNeeded(config, address, dep.swapper, [{ token: s.tokenIn, amount: BigInt(s.amountIn), symbol: oneToken?.symbol ?? "" }]);
          const swapped = await tx("Swap part of your deposit", [
            ...approvals,
            {
              address: dep.swapper,
              abi: swapperAbi,
              functionName: "swapForUser",
              args: [s.tokenIn, tokenOut, BigInt(s.amountIn), BigInt(s.minOut), s.router, s.data, address],
              value: s.tokenIn === NATIVE ? BigInt(s.amountIn) : 0n,
              label: "Swap",
            },
          ]);
          if (!swapped) return;
        }
        a0 = BigInt(plan.amount0);
        a1 = BigInt(plan.amount1);
      }
      const native0 = wbnbSide === 0 && payNative && a0 > 0n;
      const native1 = wbnbSide === 1 && payNative && a1 > 0n;
      const value = native0 ? a0 : native1 ? a1 : 0n;
      const erc = [
        { token: t0, amount: native0 ? 0n : a0, symbol: tok0.symbol },
        { token: t1, amount: native1 ? 0n : a1, symbol: tok1.symbol },
      ].filter((x) => x.amount > 0n);
      const min = (x: bigint) => (x * BigInt(10_000 - slippageBps)) / 10_000n;
      const startSqrt = creating ? sqrtPriceX96(view!.inverted ? 1 / Number(startPrice) : Number(startPrice), tok0.decimals, tok1.decimals) : 0n;
      const p = {
        token0: t0,
        token1: t1,
        fee: sel.fee,
        tickLower: range.lower,
        tickUpper: range.upper,
        amount0: a0,
        amount1: a1,
        amount0Min: min(a0),
        amount1Min: min(a1),
        createPoolSqrtPriceX96: startSqrt,
        settings: { strategy: strategyIndex(strategy), waitForMarket: isStock && waitForMarket, autoCompound, reinvestBps: reinvest * 100, slippageBps },
        referralCode: refValid && firstTime && alreadyReferred === zeroAddress ? refCode! : ("0x0000000000000000" as Hex),
        deadline: BigInt(Math.floor(Date.now() / 1000) + 30 * 60),
      };
      const openCall = (permit: PermitBatch, signature: Hex): Call => ({
        address: dep.factory,
        abi: qudaoFactoryAbi,
        functionName: "openPosition",
        args: [p, permit, signature],
        value,
        label: "Open position",
      });

      const done = await fund(creating ? "Create pool and open" : "Open position", dep.factory, erc, openCall);
      if (done) navigate("/dashboard");
    } finally {
      setBusy(false);
    }
  };

  // ------------------------------------------------------------ render
  const [low, high] = view && ready ? rangePrices(view, range.lower, range.upper) : [0, 0];
  const current = view && tick !== null ? view.at(tick) : 0;
  const bal = (side: 0 | 1) => display(side);
  const canOpen = !!dep && !!address && ready && !refused && (raw0 > 0n || raw1 > 0n) && !same;

  return (
    <Page>
      <ButtonLink to="/liquidity" variant="plain" size="sm" className="-ml-3 mb-4">
        <ArrowLeft className="size-4" /> Pools
      </ButtonLink>
      <h1 className="mb-8 text-3xl font-semibold sm:text-4xl">New position</h1>
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="min-w-0 space-y-6">
          <Step n={1} title="Pair and pool">
            <div className="grid grid-cols-2 gap-3">
              <TokenButton token={A} onPick={setPickA} exclude={B ? [B.address] : []} />
              <TokenButton token={B} onPick={setPickB} exclude={A ? [A.address] : []} />
            </div>
            {same && <Notice tone="warn" className="mt-3">Pick two different tokens (BNB and WBNB count as the same).</Notice>}
            {checks.map((c) =>
              c.data && c.data.verdict !== "ok" ? (
                <Notice key={c.data.address} tone={c.data.verdict === "refuse" ? "down" : "warn"} className="mt-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{c.data.symbol ?? c.data.address.slice(0, 8)}</span> <CheckBadge check={c.data} />
                  </div>
                  <ul className="mt-1 list-disc pl-5 text-xs">
                    {c.data.reasons.map((r) => (
                      <li key={r}>{r}</li>
                    ))}
                  </ul>
                </Notice>
              ) : null,
            )}
            <div className="mt-5">
              <div className="label mb-2">Fee tier</div>
              {pairQ.isLoading && <Skeleton className="h-20 w-full" />}
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {(pools?.length ? pools : FEES.map((f) => ({ fee: f, exists: false }) as PairPool)).map((p) => (
                  <button
                    key={p.fee}
                    onClick={() => setFee(p.fee)}
                    className={`rounded-2xl border p-3 text-left transition-colors ${fee === p.fee ? "border-gold/70 bg-gold/8" : "border-line bg-ink-2 hover:border-line-2"}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="num font-semibold">{pct(p.fee / 10_000, { digits: 2 })}</span>
                      {p.farm && <Sprout className="size-4 text-gold" aria-label="CAKE farm" />}
                    </div>
                    <div className="mt-1 text-xs text-mute">{p.exists ? (p.liquidityUsd ? `${usd(p.liquidityUsd, { compact: true })} liquidity` : "Exists") : "No pool yet"}</div>
                    {p.exists && !!p.aprPct && <div className="num text-xs text-fg-2">APR {pct(p.aprPct)}</div>}
                  </button>
                ))}
              </div>
              {sel?.farm && (
                <p className="mt-3 flex items-center gap-2 text-sm text-fg-2">
                  <Badge tone="gold">
                    <Sprout className="size-3" /> CAKE farm
                  </Badge>
                  This pool earns CAKE rewards from PancakeSwap on top of the fees; Qudao stakes the position for you.
                </p>
              )}
              {creating && view && (
                <div className="mt-4 rounded-2xl border border-gold/30 bg-gold/[0.05] p-4">
                  <div className="text-sm font-semibold">Create this pool</div>
                  <p className="mt-1 text-xs text-mute">There's no {pct((fee ?? 0) / 10_000, { digits: 2 })} pool for this pair yet. Set its starting price; it's created in the same transaction as your position.</p>
                  <label className="mt-3 flex items-center gap-2 rounded-xl border border-line bg-ink-2 px-3">
                    <span className="text-sm text-mute">1 {view.base} =</span>
                    <input value={startPrice} onChange={(e) => /^\d*\.?\d*$/.test(e.target.value) && setStartPrice(e.target.value)} placeholder="0.0" className="num h-11 flex-1 bg-transparent font-semibold outline-none" />
                    <span className="text-sm text-mute">{view.quote}</span>
                  </label>
                </div>
              )}
            </div>
          </Step>

          <Step n={2} title="Price range">
            {view && tick !== null && ready ? (
              <RangeEditor
                pool={sel?.exists ? sel.address : undefined}
                view={view}
                tick={tick}
                spacing={spacing}
                lower={range.lower}
                upper={range.upper}
                preset={range.preset}
                onChange={setRange}
                minWidthTicks={cfg.protocol.automation.minRangeWidthTicks}
              />
            ) : (
              <p className="text-sm text-mute">{creating ? "Set the starting price above." : "Choose a pair and a fee tier."}</p>
            )}
          </Step>

          {sel?.exists && view && ready && (
            <Card className="p-5 sm:p-6">
              <Backtest pool={sel.address!} view={view} current={current} low={low} high={high} rule={strategy} reinvestPct={autoCompound ? reinvest : 0} depositUsd={depositUsd} />
            </Card>
          )}

          <Step n={3} title="When the price moves">
            <div className="grid gap-2 sm:grid-cols-2">
              {STRATEGIES.map((s) => (
                <button
                  key={s.value}
                  onClick={() => setStrategy(s.value)}
                  className={`rounded-2xl border p-4 text-left transition-colors ${strategy === s.value ? "border-gold/70 bg-gold/8" : "border-line bg-ink-2 hover:border-line-2"}`}
                >
                  <div className="font-semibold">{s.label}</div>
                  <div className="mt-1 text-xs leading-relaxed text-mute">{s.body}</div>
                </button>
              ))}
            </div>
            {isStock && (
              <div className="mt-4 rounded-2xl border border-info/30 bg-info/[0.05] p-4">
                <Toggle checked={waitForMarket} onChange={setWait} label="Wait for the stock market" />
                <p className="mt-2 text-xs text-mute">
                  Stock Tokens follow a share price that only moves while the US market is open. With this on, the range waits for the open unless the price moves more than{" "}
                  {bps(cfg.protocol.automation.stockMarket.overrideBps)}.
                </p>
              </div>
            )}
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <div>
                <Toggle checked={autoCompound} onChange={setAuto} label="Reinvest fees automatically" />
                {autoCompound && (
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-mute">
                      <span>Share reinvested</span>
                      <span className="num text-fg">{reinvest}%</span>
                    </div>
                    <input type="range" min={minShare} max={100} step={5} value={reinvest} onChange={(e) => setReinvest(Number(e.target.value))} className="mt-2 w-full accent-[var(--color-gold)]" />
                    <p className="text-xs text-mute">The rest stays in the position, ready to claim.</p>
                  </div>
                )}
              </div>
              <div>
                <div className="flex items-center gap-1 text-sm text-fg-2">
                  Swap price tolerance
                  <Info>When a move or a reinvest swaps tokens, the swap is refused if its price is worse than this versus the checked price. Never above 5%.</Info>
                </div>
                <Segmented
                  size="sm"
                  className="mt-2"
                  value={String(slippageBps)}
                  onChange={(v) => setSlip(Number(v))}
                  options={[100, 200, 300, 400, 500].map((b) => ({ value: String(b), label: bps(b) }))}
                />
              </div>
            </div>
          </Step>

          <Step
            n={4}
            title="Deposit"
            right={sel?.exists ? <Segmented size="sm" value={mode} onChange={setMode} options={[{ value: "both", label: "Both tokens" }, { value: "one", label: "One token" }]} /> : undefined}
          >
            {wbnbSide !== null && (
              <div className="mb-4">
                <Toggle checked={payNative} onChange={setPayNative} label="Pay with BNB (wrapped for you)" />
              </div>
            )}
            {mode === "both" ? (
              <div className="space-y-3">
                {([0, 1] as const).map((side) =>
                  onlyOne !== null && onlyOne !== side ? null : (
                    <AmountInput
                      key={side}
                      token={bal(side)}
                      value={amt[side]}
                      onChange={(v) => editAmount(side, v)}
                      usdPrice={side === 0 ? p0 : p1}
                      maxReserve={parseUnits("0.005", 18)}
                    />
                  ),
                )}
                {onlyOne !== null && <p className="text-xs text-mute">With the price outside the range, only {(onlyOne === 0 ? tok0 : tok1)?.symbol} is needed.</p>}
              </div>
            ) : (
              <div className="space-y-3">
                <Segmented size="sm" value={String(oneSide)} onChange={(v) => setOneSide(Number(v) as 0 | 1)} options={([0, 1] as const).map((s) => ({ value: String(s), label: display(s)?.symbol ?? "" }))} />
                <AmountInput token={oneToken} value={oneAmt} onChange={setOneAmt} usdPrice={oneSide === 0 ? p0 : p1} maxReserve={parseUnits("0.005", 18)} />
                {planQ.isFetching && <Skeleton className="h-16 w-full" />}
                {planQ.data && tok0 && tok1 && (
                  <div className="rounded-2xl border border-line bg-ink-2 px-4 py-2">
                    {planQ.data.swap ? (
                      <Row label="First, swap">
                        {sig(Number(formatUnits(BigInt(planQ.data.swap.amountIn), d[oneSide])))} {oneToken?.symbol} → {display(oneSide === 0 ? 1 : 0)?.symbol}
                      </Row>
                    ) : (
                      <Row label="Swap">Not needed</Row>
                    )}
                    <Row label="Then deposit">
                      {sig(Number(formatUnits(BigInt(planQ.data.amount0), d[0])))} {display(0)?.symbol} + {sig(Number(formatUnits(BigInt(planQ.data.amount1), d[1])))} {display(1)?.symbol}
                    </Row>
                    <p className="pb-1 text-xs text-mute">The swap is a separate transaction through Qudao's swap (0.15% fee). Anything not used stays in your wallet.</p>
                  </div>
                )}
                {planQ.error && <Notice tone="warn">{(planQ.error as Error).message}</Notice>}
              </div>
            )}
          </Step>
        </div>

        <div className="lg:sticky lg:top-24 lg:self-start">
          <Card hi className="p-5">
            <h2 className="text-lg font-semibold">Review</h2>
            {tok0 && tok1 && view ? (
              <>
                <div className="mt-4 flex items-center gap-3">
                  <PairIcon a={display(0) ?? tok0} b={display(1) ?? tok1} size={34} />
                  <div>
                    <div className="font-semibold">
                      {view.base} / {view.quote}
                    </div>
                    <div className="text-xs text-mute">PancakeSwap v3 · {pct((fee ?? 0) / 10_000, { digits: 2 })} fee tier</div>
                  </div>
                </div>
                <div className="mt-4 divide-y divide-line/70">
                  <Row label="Range">{ready ? `${sig(low)} – ${sig(high)}` : "—"}</Row>
                  <Row label="Current price">{ready ? sig(current) : "—"}</Row>
                  <Row label="Rule">{STRATEGIES.find((s) => s.value === strategy)?.short}</Row>
                  <Row label="Reinvest">{autoCompound ? `${reinvest}% of fees` : "Off"}</Row>
                  <Row label="Deposit value">{usd(depositUsd)}</Row>
                  <Row label={<span className="inline-flex items-center gap-1">Qudao fee <Info>Taken from the fees your position earns (never from your deposit). Staking QDAO in The Well lowers it.</Info></span>}>
                    {bps(feeBps)} of earned fees
                  </Row>
                </div>
                {dep && address && firstTime && alreadyReferred === zeroAddress && (
                  <div className="mt-4">
                    <label className="label">Invite code (optional)</label>
                    <input
                      value={ref}
                      onChange={(e) => setRef(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8))}
                      placeholder="8 letters or digits"
                      className="mt-1 h-10 w-full rounded-xl border border-line bg-ink-2 px-3 font-mono text-sm outline-none focus:border-gold/50"
                    />
                    {ref && (
                      <p className={`mt-1 text-xs ${refValid ? "text-up" : "text-mute"}`}>
                        {refValid
                          ? `You'll pay ${bps(cfg.protocol.referrals.inviteeDiscountBps)} less Qudao fee for ${cfg.protocol.referrals.inviteeDiscountDays} days.`
                          : refOwner === address
                            ? "That's your own code."
                            : ref.length < 8
                              ? "Codes are 8 letters or digits."
                              : "No one has this code."}
                      </p>
                    )}
                  </div>
                )}
                <div className="mt-5">
                  {!dep ? (
                    <Notice>Deposits open when Qudao's contracts are live.</Notice>
                  ) : !address ? (
                    <ConnectButton className="w-full" size="lg" />
                  ) : (
                    <Button size="lg" className="w-full" disabled={!canOpen} busy={busy} onClick={open}>
                      {refused ? "Token not supported" : raw0 === 0n && raw1 === 0n ? "Enter an amount" : creating ? "Create pool and open" : "Open position"}
                    </Button>
                  )}
                  <p className="mt-3 text-xs leading-relaxed text-mute">
                    Opening creates a vault owned by your wallet. You can add funds, change settings or close it at any time, even while Qudao is paused.
                  </p>
                </div>
              </>
            ) : (
              <Skeleton className="mt-4 h-40 w-full" />
            )}
          </Card>
        </div>
      </div>
    </Page>
  );
}
