// Number, money, token-amount, address and time formatting.
import { formatUnits } from "viem";

const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 });

export function usd(n: number | null | undefined, opts: { compact?: boolean; sign?: boolean } = {}): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  const sign = opts.sign && n > 0 ? "+" : n < 0 ? "−" : "";
  const a = Math.abs(n);
  if (a === 0) return "$0";
  if (a < 0.01) return sign + "<$0.01";
  if (opts.compact && a >= 10_000) return sign + "$" + compact.format(a);
  return sign + "$" + a.toLocaleString("en-US", { minimumFractionDigits: a < 1000 ? 2 : 0, maximumFractionDigits: 2 });
}

/** A price that may be tiny (memecoins): keeps about 4 significant digits. */
export function price(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n) || n === 0) return "—";
  if (n >= 1) return "$" + n.toLocaleString("en-US", { maximumFractionDigits: n >= 1000 ? 2 : 4 });
  const digits = Math.min(12, Math.max(2, 3 - Math.floor(Math.log10(n))));
  return "$" + n.toFixed(digits).replace(/0+$/, "");
}

export function num(n: number | null | undefined, max = 2): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  if (Math.abs(n) >= 1e6) return compact.format(n);
  return n.toLocaleString("en-US", { maximumFractionDigits: max });
}

/** Significant-digit formatting for ratios like "1 BNB = 670.91 USDT" or "0.0000412". */
export function sig(n: number, digits = 5): string {
  if (!Number.isFinite(n) || n === 0) return "0";
  const a = Math.abs(n);
  if (a >= 1e6) return compact.format(n);
  if (a >= 1) return n.toLocaleString("en-US", { maximumFractionDigits: Math.max(0, digits - Math.floor(Math.log10(a)) - 1) });
  return n.toPrecision(Math.min(digits, 6)).replace(/0+$/, "").replace(/\.$/, "");
}

export function pct(n: number | null | undefined, opts: { sign?: boolean; digits?: number } = {}): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  const d = opts.digits ?? (Math.abs(n) >= 100 ? 0 : Math.abs(n) >= 10 ? 1 : 2);
  const s = opts.sign && n > 0 ? "+" : "";
  return s + n.toLocaleString("en-US", { maximumFractionDigits: d, minimumFractionDigits: 0 }) + "%";
}

export const bps = (b: number) => pct(b / 100);

/** Token amount from base units, trimmed to `max` decimals (small values keep significant digits). */
export function amount(raw: bigint | string | null | undefined, decimals = 18, max = 4): string {
  if (raw === null || raw === undefined) return "—";
  const v = Number(formatUnits(BigInt(raw), decimals));
  if (v === 0) return "0";
  if (v < 10 ** -max) return "<" + (10 ** -max).toFixed(max);
  return v >= 1 ? num(v, max) : sig(v, max);
}

export const short = (a?: string | null, n = 4) => (a ? a.slice(0, 2 + n) + "…" + a.slice(-n) : "");

const toDate = (t: number | string | Date) => new Date(typeof t === "number" && t < 1e12 ? t * 1000 : t);

export function ago(t: number | string | Date): string {
  const ms = Date.now() - toDate(t).getTime();
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return "just now";
  if (s < 3600) return Math.floor(s / 60) + " min ago";
  if (s < 86400) return Math.floor(s / 3600) + " h ago";
  const d = Math.floor(s / 86400);
  return d < 60 ? d + " d ago" : date(t);
}

export const date = (t: number | string | Date) => toDate(t).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
export const dateTime = (t: number | string | Date) =>
  toDate(t).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

export function duration(sec: number): string {
  if (sec < 3600) return Math.max(1, Math.round(sec / 60)) + " min";
  if (sec < 86400 * 2) return Math.round(sec / 3600) + " h";
  return Math.round(sec / 86400) + " days";
}
