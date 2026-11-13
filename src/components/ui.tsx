// Small building blocks shared by every page.
import { useId, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { motion } from "motion/react";
import { Link } from "react-router-dom";
import { ExternalLink, Info as InfoIcon, Loader2 } from "lucide-react";
import { useT } from "../i18n";

type Variant = "gold" | "ghost" | "soft" | "danger" | "plain";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  gold: "bg-gold text-gold-ink hover:bg-gold-2 shadow-[0_8px_30px_-12px_rgb(240_185_11/0.7)] disabled:bg-gold/40 disabled:shadow-none",
  ghost: "border border-line-2 text-fg hover:border-gold/60 hover:text-gold-2 disabled:text-dim disabled:border-line",
  soft: "bg-panel-3 text-fg hover:bg-line-2 disabled:text-dim",
  danger: "border border-down/40 text-down hover:bg-down/10 disabled:opacity-40",
  plain: "text-fg-2 hover:text-gold-2 disabled:text-dim",
};
const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-sm rounded-lg gap-1.5",
  md: "h-10 px-4 text-sm rounded-xl gap-2",
  lg: "h-12 px-6 text-base rounded-xl gap-2",
};

export function Button({
  variant = "gold",
  size = "md",
  busy,
  className = "",
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size; busy?: boolean }) {
  return (
    <button
      {...rest}
      disabled={rest.disabled || busy}
      className={`inline-flex items-center justify-center font-semibold transition-[color,background-color,border-color,box-shadow,transform] duration-200 active:scale-[0.97] disabled:cursor-not-allowed disabled:active:scale-100 ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {busy && <Loader2 className="size-4 animate-spin" />}
      {children}
    </button>
  );
}

export function ButtonLink({ to, variant = "gold", size = "md", className = "", children }: { to: string; variant?: Variant; size?: Size; className?: string; children: ReactNode }) {
  return (
    <Link to={to} className={`inline-flex items-center justify-center font-semibold transition-[color,background-color,border-color,box-shadow,transform] duration-200 active:scale-[0.97] ${variants[variant]} ${sizes[size]} ${className}`}>
      {children}
    </Link>
  );
}

export function Card({ children, className = "", hi }: { children: ReactNode; className?: string; hi?: boolean }) {
  return <div className={`${hi ? "card-hi" : "card"} ${className}`}>{children}</div>;
}

export function CardHeader({ title, sub, right, className = "" }: { title: ReactNode; sub?: ReactNode; right?: ReactNode; className?: string }) {
  return (
    <div className={`flex items-start justify-between gap-4 ${className}`}>
      <div className="min-w-0">
        <h2 className="text-lg font-semibold text-fg">{title}</h2>
        {sub && <p className="mt-1 text-sm text-mute">{sub}</p>}
      </div>
      {right}
    </div>
  );
}

export function PageTitle({ title, sub, right }: { title: ReactNode; sub?: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-3xl font-semibold sm:text-4xl">{title}</h1>
        {sub && <p className="mt-2 max-w-2xl text-fg-2">{sub}</p>}
      </div>
      {right}
    </div>
  );
}

export function Stat({ label, value, sub, className = "", big }: { label: ReactNode; value: ReactNode; sub?: ReactNode; className?: string; big?: boolean }) {
  return (
    <div className={className}>
      <div className="label">{label}</div>
      <div className={`num mt-1.5 font-semibold text-fg ${big ? "text-3xl" : "text-xl"}`}>{value}</div>
      {sub && <div className="mt-1 text-xs text-mute">{sub}</div>}
    </div>
  );
}

type Tone = "gold" | "up" | "down" | "info" | "warn" | "mute";
const tones: Record<Tone, string> = {
  gold: "bg-gold/12 text-gold-2 border-gold/25",
  up: "bg-up/12 text-up border-up/25",
  down: "bg-down/12 text-down border-down/25",
  info: "bg-info/12 text-info border-info/25",
  warn: "bg-warn/12 text-warn border-warn/25",
  mute: "bg-panel-3 text-fg-2 border-line-2",
};
export function Badge({ tone = "mute", children, className = "" }: { tone?: Tone; children: ReactNode; className?: string }) {
  return <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${tones[tone]} ${className}`}>{children}</span>;
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  size = "md",
  className = "",
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: ReactNode }[];
  size?: "sm" | "md";
  className?: string;
}) {
  const pill = useId();
  return (
    <div role="tablist" className={`scrollbar-none inline-flex max-w-full overflow-x-auto rounded-xl border border-line bg-ink-2 p-1 ${className}`}>
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={o.value === value}
          onClick={() => onChange(o.value)}
          className={`relative shrink-0 whitespace-nowrap rounded-lg font-medium transition-colors ${size === "sm" ? "px-2.5 py-1 text-xs" : "px-3.5 py-1.5 text-sm"} ${
            o.value === value ? "text-gold-2" : "text-mute hover:text-fg"
          }`}
        >
          {o.value === value && (
            <motion.span layoutId={pill} className="absolute inset-0 rounded-lg bg-panel-3 shadow-sm" transition={{ type: "spring", bounce: 0.15, duration: 0.45 }} />
          )}
          <span className="relative">{o.label}</span>
        </button>
      ))}
    </div>
  );
}

export function Toggle({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label?: ReactNode; disabled?: boolean }) {
  return (
    <label className={`inline-flex cursor-pointer items-center gap-3 ${disabled ? "cursor-not-allowed opacity-50" : ""}`}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? "bg-gold" : "bg-panel-3"}`}
      >
        <span className={`absolute top-0.5 size-5 rounded-full bg-fg transition-all ${checked ? "left-[22px] bg-gold-ink" : "left-0.5"}`} />
      </button>
      {label && <span className="text-sm text-fg-2">{label}</span>}
    </label>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

export function Empty({ icon, title, children, action }: { icon?: ReactNode; title: ReactNode; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      {icon && <div className="mb-4 grid size-12 place-items-center rounded-2xl bg-gold/10 text-gold">{icon}</div>}
      <h3 className="text-lg font-semibold">{title}</h3>
      {children && <p className="mt-2 max-w-md text-sm text-mute">{children}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/** A small "i" that shows an explanation on hover or tap. */
export function Info({ children, className = "" }: { children: ReactNode; className?: string }) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  return (
    <span className={`relative inline-flex align-middle ${className}`} onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button type="button" aria-label={t("More information")} onClick={() => setOpen((o) => !o)} className="text-dim hover:text-gold-2">
        <InfoIcon className="size-3.5" />
      </button>
      {open && (
        <span className="absolute bottom-full left-1/2 z-50 mb-2 w-64 -translate-x-1/2 rounded-xl border border-line-2 bg-panel-2 p-3 text-left text-xs font-normal normal-case leading-relaxed tracking-normal text-fg-2 shadow-xl">
          {children}
        </span>
      )}
    </span>
  );
}

export function Ext({ href, children, className = "" }: { href: string; children: ReactNode; className?: string }) {
  return (
    <a href={href} target="_blank" rel="noreferrer noopener" className={`inline-flex items-center gap-1 text-fg-2 hover:text-gold-2 ${className}`}>
      {children}
      <ExternalLink className="size-3" />
    </a>
  );
}

export function Row({ label, children, className = "" }: { label: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={`flex items-center justify-between gap-4 py-1.5 text-sm ${className}`}>
      <span className="text-mute">{label}</span>
      <span className="num text-right text-fg">{children}</span>
    </div>
  );
}

export function Notice({ tone = "info", children, className = "" }: { tone?: "info" | "warn" | "down" | "gold"; children: ReactNode; className?: string }) {
  const t = { info: "border-info/30 bg-info/8 text-fg-2", warn: "border-warn/30 bg-warn/8 text-fg-2", down: "border-down/30 bg-down/8 text-fg-2", gold: "border-gold/30 bg-gold/8 text-fg-2" }[tone];
  return <div className={`rounded-xl border px-4 py-3 text-sm ${t} ${className}`}>{children}</div>;
}

export const Change = ({ value, className = "" }: { value: number | null | undefined; className?: string }) =>
  value === null || value === undefined || !Number.isFinite(value) ? (
    <span className={`text-mute ${className}`}>—</span>
  ) : (
    <span className={`num ${value >= 0 ? "text-up" : "text-down"} ${className}`}>
      {value >= 0 ? "+" : "−"}
      {Math.abs(value).toLocaleString("en-US", { maximumFractionDigits: Math.abs(value) >= 100 ? 0 : 2 })}%
    </span>
  );
