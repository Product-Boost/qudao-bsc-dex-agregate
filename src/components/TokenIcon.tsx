// Token logo with fallbacks: bundled icon → remote image → coloured initial.
import { useState } from "react";
import { localImage } from "../hooks/tokens";

const hue = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7);

export function TokenIcon({ symbol, src, size = 28, className = "" }: { symbol?: string; src?: string | null; size?: number; className?: string }) {
  const [failed, setFailed] = useState(false);
  const url = localImage(symbol) ?? (failed ? null : src);
  const s = { width: size, height: size };
  if (url)
    return <img src={url} alt="" style={s} onError={() => setFailed(true)} className={`shrink-0 rounded-full bg-panel-3 object-cover ${className}`} loading="lazy" />;
  const h = hue(symbol ?? "?");
  return (
    <span
      style={{ ...s, background: `hsl(${h} 45% 22%)`, color: `hsl(${h} 80% 75%)`, fontSize: size * 0.42 }}
      className={`grid shrink-0 place-items-center rounded-full font-display font-semibold ${className}`}
      aria-hidden
    >
      {(symbol ?? "?").replace(/^W(?=BNB)/, "").slice(0, 1)}
    </span>
  );
}

export function PairIcon({ a, b, size = 28 }: { a: { symbol?: string; image?: string | null }; b: { symbol?: string; image?: string | null }; size?: number }) {
  return (
    <span className="inline-flex shrink-0 items-center">
      <TokenIcon symbol={a.symbol} src={a.image} size={size} className="ring-2 ring-panel" />
      <TokenIcon symbol={b.symbol} src={b.image} size={size} className="-ml-2.5 ring-2 ring-panel" />
    </span>
  );
}
