// In-app swap over PancakeSwap's best route (Smart Router), through Qudao's Swapper (0.15% fee to the protocol).
// Before the wallet opens, the quote is checked to go to the official router and Qudao's own Swapper.
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useConfig, useConnection } from "wagmi";
import { formatUnits, isAddressEqual, parseUnits } from "viem";
import { ArrowDownUp, Route, Settings2 } from "lucide-react";
import { AmountInput } from "./AmountInput";
import { Button, Notice, Row, Segmented } from "./ui";
import { ConnectButton } from "./layout/Wallet";
import { api } from "../lib/api";
import { useAppConfig } from "../lib/config";
import { useTx } from "../lib/tx";
import { approvalsNeeded } from "../lib/permit2";
import { swapperAbi } from "../../../shared/abis";
import { BNB, NATIVE, useBaseTokens, useResolvedToken, useTokenBalance, type Token } from "../hooks/tokens";
import { bps, sig } from "../lib/format";

const SLIPPAGES = ["10", "50", "100", "300"] as const;

export function Swap({ initialOut }: { initialOut?: Token | null }) {
  const cfg = useAppConfig();
  const config = useConfig();
  const { address } = useConnection();
  const tx = useTx();
  const base = useBaseTokens();
  const [tokenIn, setIn] = useState<Token | null>(BNB);
  const [tokenOutRaw, setOut] = useState<Token | null>(initialOut ?? base.find((t) => t.symbol === "USDT") ?? null);
  const tokenOut = useResolvedToken(tokenOutRaw);
  const tIn = useResolvedToken(tokenIn);
  const [value, setValue] = useState("");
  const [slip, setSlip] = useState<string>("50");
  const [showSettings, setShowSettings] = useState(false);

  // a token clicked in the market list replaces the output token (adjusting state on a prop change)
  const [lastInitial, setLastInitial] = useState(initialOut);
  if (initialOut !== lastInitial) {
    setLastInitial(initialOut);
    if (initialOut) setOut(initialOut);
  }

  const amountIn = (() => {
    try {
      return tIn && Number(value) > 0 ? parseUnits(value, tIn.decimals) : 0n;
    } catch {
      return 0n;
    }
  })();
  const bal = useTokenBalance(tIn);

  const { data: quote, error, isFetching } = useQuery({
    queryKey: ["swap-quote", tIn?.address, tokenOut?.address, amountIn.toString(), slip],
    queryFn: () => api.swapQuote({ tokenIn: tIn!.address, tokenOut: tokenOut!.address, amountIn: amountIn.toString(), slippageBps: Number(slip) }),
    enabled: !!tIn && !!tokenOut && amountIn > 0n && !!cfg.deployment,
    refetchInterval: 20_000,
    retry: false,
  });

  const net = quote && tokenOut ? Number(formatUnits(BigInt(quote.amountOut), tokenOut.decimals)) * (1 - quote.feeBps / 10_000) : 0;
  const rate = net && Number(value) ? net / Number(value) : 0;
  const trusted =
    !!quote && !!cfg.deployment && isAddressEqual(quote.router, cfg.pancake.smartRouter) && isAddressEqual(quote.swapper, cfg.deployment.swapper);

  const flip = () => {
    setIn(tokenOut);
    setOut(tIn);
    setValue(net ? String(Number(net.toPrecision(8))) : "");
  };

  const execute = async () => {
    if (!quote || !tIn || !tokenOut || !address || !cfg.deployment) return;
    if (!trusted) return;
    const approvals = tIn.address === NATIVE ? [] : await approvalsNeeded(config, address, cfg.deployment.swapper, [{ token: tIn.address, amount: amountIn, symbol: tIn.symbol }]);
    const res = await tx(`Swap ${tIn.symbol} → ${tokenOut.symbol}`, [
      ...approvals,
      {
        address: cfg.deployment.swapper,
        abi: swapperAbi,
        functionName: "swapForUser",
        args: [tIn.address, tokenOut.address, amountIn, BigInt(quote.minOut), quote.router, quote.data, address],
        value: tIn.address === NATIVE ? amountIn : 0n,
        label: "Swap",
      },
    ]);
    if (res) setValue("");
  };

  const insufficient = bal !== undefined && amountIn > bal;
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Swap</h2>
        <button onClick={() => setShowSettings((s) => !s)} className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-mute hover:text-fg" aria-label="Swap settings">
          <Settings2 className="size-4" /> {bps(Number(slip))}
        </button>
      </div>
      {showSettings && (
        <div className="mb-3 rounded-2xl border border-line bg-ink-2 p-3">
          <div className="label mb-2">Price tolerance</div>
          <Segmented size="sm" value={slip} onChange={setSlip} options={SLIPPAGES.map((s) => ({ value: s, label: bps(Number(s)) }))} />
          <p className="mt-2 text-xs text-mute">The swap is cancelled if you'd receive less than this below the quote.</p>
        </div>
      )}
      <AmountInput label="You pay" token={tIn} value={value} onChange={setValue} onToken={setIn} exclude={tokenOut ? [tokenOut.address] : []} maxReserve={parseUnits("0.003", 18)} />
      <div className="relative z-10 -my-3 flex justify-center">
        <button onClick={flip} aria-label="Swap direction" className="grid size-9 place-items-center rounded-xl border border-line-2 bg-panel text-fg-2 hover:text-gold-2">
          <ArrowDownUp className="size-4" />
        </button>
      </div>
      <AmountInput
        label="You receive (after the 0.15% fee)"
        token={tokenOut}
        value={net ? String(Number(net.toPrecision(8))) : ""}
        onToken={setOut}
        exclude={tIn ? [tIn.address] : []}
      />
      {quote && tIn && tokenOut && (
        <div className="mt-3 rounded-2xl border border-line bg-ink-2 px-4 py-2">
          <Row label="Rate">
            1 {tIn.symbol} = {sig(rate)} {tokenOut.symbol}
          </Row>
          <Row label="Minimum received">
            {sig(Number(formatUnits(BigInt(quote.minOut), tokenOut.decimals)))} {tokenOut.symbol}
          </Row>
          <Row label="Price impact">
            <span className={quote.priceImpactBps > 300 ? "text-down" : quote.priceImpactBps > 100 ? "text-warn" : ""}>{bps(quote.priceImpactBps)}</span>
          </Row>
          <Row label="Qudao fee">{bps(quote.feeBps)}</Row>
          <Row label={<span className="inline-flex items-center gap-1"><Route className="size-3.5" /> Route</span>}>
            <span className="text-xs">{quote.route.join(" → ")}</span>
          </Row>
        </div>
      )}
      {quote && !trusted && <Notice tone="down" className="mt-3">This quote doesn't go through PancakeSwap's official router, so Qudao stopped it.</Notice>}
      {error && amountIn > 0n && <Notice tone="warn" className="mt-3">{(error as Error).message}</Notice>}
      {!cfg.deployment && <Notice className="mt-3">Swaps open when Qudao's contracts are live.</Notice>}
      <div className="mt-4">
        {!address ? (
          <ConnectButton className="w-full" size="lg" />
        ) : (
          <Button size="lg" className="w-full" disabled={!quote || !trusted || insufficient || isFetching} busy={isFetching && amountIn > 0n} onClick={execute}>
            {insufficient ? `Not enough ${tIn?.symbol}` : amountIn === 0n ? "Enter an amount" : "Swap"}
          </Button>
        )}
      </div>
    </div>
  );
}
