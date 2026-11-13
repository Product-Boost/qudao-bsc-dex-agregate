// Token amount field: token button (opens the picker), amount, wallet balance with Max, value in USD.
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { formatUnits } from "viem";
import { TokenIcon } from "./TokenIcon";
import { TokenPicker } from "./TokenPicker";
import { useTokenBalance, type Token } from "../hooks/tokens";
import { amount, usd } from "../lib/format";

export function AmountInput({
  label,
  token,
  value,
  onChange,
  onToken,
  usdPrice,
  readOnly,
  exclude,
  allowNative,
  maxReserve = 0n,
}: {
  label?: string;
  token: Token | null;
  value: string;
  onChange?: (v: string) => void;
  onToken?: (t: Token) => void;
  usdPrice?: number | null;
  readOnly?: boolean;
  exclude?: string[];
  allowNative?: boolean;
  /** Native BNB kept back from "Max" for network fees. */
  maxReserve?: bigint;
}) {
  const [pick, setPick] = useState(false);
  const bal = useTokenBalance(token);
  const n = Number(value);
  const over = token && bal !== undefined && value && Number.isFinite(n) && n > Number(formatUnits(bal, token.decimals));
  return (
    <div className={`rounded-2xl border bg-ink-2 p-4 ${over ? "border-down/50" : "border-line focus-within:border-gold/50"}`}>
      <div className="flex items-center justify-between text-xs text-mute">
        <span>{label}</span>
        {token && bal !== undefined && (
          <span>
            Balance <span className="num text-fg-2">{amount(bal, token.decimals)}</span>
            {onChange && bal > 0n && (
              <button
                className="ml-2 font-semibold text-gold hover:text-gold-2"
                onClick={() => {
                  const max = token.symbol === "BNB" ? (bal > maxReserve ? bal - maxReserve : 0n) : bal;
                  onChange(formatUnits(max, token.decimals));
                }}
              >
                Max
              </button>
            )}
          </span>
        )}
      </div>
      <div className="mt-2 flex items-center gap-3">
        <input
          inputMode="decimal"
          placeholder="0"
          value={value}
          readOnly={readOnly || !onChange}
          onChange={(e) => {
            const v = e.target.value.replace(",", ".");
            if (/^\d*\.?\d*$/.test(v)) onChange?.(v);
          }}
          className="num min-w-0 flex-1 bg-transparent text-2xl font-semibold text-fg outline-none placeholder:text-dim"
        />
        <button
          onClick={() => onToken && setPick(true)}
          disabled={!onToken}
          className="flex shrink-0 items-center gap-2 rounded-full border border-line-2 bg-panel-2 py-1.5 pr-3 pl-1.5 font-semibold hover:border-gold/50 disabled:cursor-default disabled:hover:border-line-2"
        >
          {token ? (
            <>
              <TokenIcon symbol={token.symbol} src={token.image} size={26} />
              {token.symbol}
            </>
          ) : (
            <span className="px-2 text-sm text-gold">Select</span>
          )}
          {onToken && <ChevronDown className="size-4 text-mute" />}
        </button>
      </div>
      <div className="mt-1 text-xs text-mute">{usdPrice && n > 0 ? usd(n * usdPrice) : over ? <span className="text-down">More than your balance</span> : " "}</div>
      {onToken && <TokenPicker open={pick} onClose={() => setPick(false)} onPick={onToken} exclude={exclude} allowNative={allowNative} />}
    </div>
  );
}
