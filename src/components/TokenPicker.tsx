// Choose a token: the well-known ones with wallet balances, a name/symbol search, or a pasted address
// (checked for transfer tax, blocked selling and thin liquidity before it can be used).
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getAddress, isAddress } from "viem";
import { Search, ShieldAlert, ShieldCheck, ShieldX } from "lucide-react";
import { Modal } from "./Modal";
import { TokenIcon } from "./TokenIcon";
import { Badge } from "./ui";
import { api, type TokenCheck } from "../lib/api";
import { useBaseTokens, useTokenBalance, useTokenMeta, type Token } from "../hooks/tokens";
import { amount } from "../lib/format";
import { useT } from "../i18n";

function useDebounced<T>(v: T, ms = 300) {
  const [d, setD] = useState(v);
  useEffect(() => {
    const t = setTimeout(() => setD(v), ms);
    return () => clearTimeout(t);
  }, [v, ms]);
  return d;
}

export function CheckBadge({ check }: { check?: TokenCheck | null }) {
  const { t } = useT();
  if (!check) return null;
  if (check.verdict === "ok")
    return (
      <Badge tone="up">
        <ShieldCheck className="size-3" /> {t("Checked")}
      </Badge>
    );
  if (check.verdict === "warn")
    return (
      <Badge tone="warn">
        <ShieldAlert className="size-3" /> {t("Caution")}
      </Badge>
    );
  if (check.verdict === "refuse")
    return (
      <Badge tone="down">
        <ShieldX className="size-3" /> {t("Not supported")}
      </Badge>
    );
  return <Badge>{t("Unknown")}</Badge>;
}

function Row({ token, onPick, disabled, balance = true }: { token: Token; onPick: (t: Token) => void; disabled?: boolean; balance?: boolean }) {
  const bal = useTokenBalance(balance ? token : null);
  return (
    <button
      disabled={disabled}
      onClick={() => onPick(token)}
      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-panel-3 disabled:cursor-not-allowed disabled:opacity-40"
    >
      <TokenIcon symbol={token.symbol} src={token.image} size={32} />
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">{token.symbol}</span>
        <span className="block truncate text-xs text-mute">{token.name}</span>
      </span>
      {bal !== undefined && bal > 0n && <span className="num text-sm text-fg-2">{amount(bal, token.decimals)}</span>}
    </button>
  );
}

export function TokenPicker({
  open,
  onClose,
  onPick,
  exclude,
  allowNative = true,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (t: Token) => void;
  exclude?: string[];
  allowNative?: boolean;
}) {
  const { t: tr } = useT();
  const [q, setQ] = useState("");
  const dq = useDebounced(q.trim());
  const base = useBaseTokens().filter((t) => allowNative || t.symbol !== "BNB");
  const pasted = isAddress(dq) ? getAddress(dq) : null;
  const { token: pastedToken } = useTokenMeta(pasted);
  const { data: search, isFetching } = useQuery({
    queryKey: ["token-search", dq],
    queryFn: () => api.searchTokens(dq),
    enabled: dq.length >= 2,
    staleTime: 5 * 60_000,
  });
  const ex = new Set((exclude ?? []).map((a) => a.toLowerCase()));
  const pick = (t: Token) => {
    onPick(t);
    setQ("");
    onClose();
  };

  const localHits = useMemo(
    () => (dq ? base.filter((t) => t.symbol.toLowerCase().includes(dq.toLowerCase()) || t.name.toLowerCase().includes(dq.toLowerCase())) : base),
    [base, dq],
  );
  const remote = (search?.tokens ?? []).filter((t) => !base.some((b) => b.address.toLowerCase() === t.address.toLowerCase()));

  return (
    <Modal open={open} onClose={onClose} title={tr("Choose a token")}>
      <label className="flex items-center gap-2 rounded-xl border border-line bg-ink-2 px-3 focus-within:border-gold/60">
        <Search className="size-4 text-mute" />
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={tr("Name, symbol or address (0x…)")} className="h-11 flex-1 bg-transparent text-sm outline-none placeholder:text-dim" />
      </label>

      <div className="mt-4 max-h-[52dvh] overflow-y-auto">
        {pasted && (
          <div className="mb-3 rounded-2xl border border-line bg-panel-2 p-2">
            {pastedToken ? (
              <>
                <Row token={pastedToken} onPick={pick} disabled={search?.check?.verdict === "refuse" || ex.has(pastedToken.address.toLowerCase())} />
                <div className="flex flex-wrap items-center gap-2 px-3 pb-2">
                  <CheckBadge check={search?.check} />
                  {search?.check?.reasons.map((r) => (
                    <span key={r} className="text-xs text-mute">
                      {r}
                    </span>
                  ))}
                </div>
              </>
            ) : (
              <div className="px-3 py-3 text-sm text-mute">{tr("Looking up this address…")}</div>
            )}
          </div>
        )}
        {!pasted && (
          <>
            {localHits.map((t) => (
              <Row key={t.address} token={t} onPick={pick} disabled={ex.has(t.address.toLowerCase())} />
            ))}
            {remote.length > 0 && <div className="label mt-3 mb-1 px-3">{tr("On PancakeSwap")}</div>}
            {remote.map((t) => (
              <Row key={t.address} token={{ ...t, decimals: -1 }} balance={false} onPick={pick} disabled={ex.has(t.address.toLowerCase())} />
            ))}
            {dq.length >= 2 && !isFetching && localHits.length === 0 && remote.length === 0 && <p className="px-3 py-6 text-center text-sm text-mute">{tr("No token found. Paste its address instead.")}</p>}
          </>
        )}
      </div>
    </Modal>
  );
}
