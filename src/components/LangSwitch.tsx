import { useT } from "../i18n";

/** English / 中文. The label on each side is the language's own name. */
export function LangSwitch({ className = "" }: { className?: string }) {
  const { locale, setLocale, t } = useT();
  const btn = (id: "en" | "zh", label: string) => (
    <button
      type="button"
      onClick={() => setLocale(id)}
      aria-pressed={locale === id}
      className={`rounded-md px-2 py-1 ${locale === id ? "bg-panel-3 text-gold-2" : "text-mute hover:text-fg"}`}
    >
      {label}
    </button>
  );
  return (
    <div role="group" aria-label={t("Language")} className={`flex rounded-lg border border-line-2 p-0.5 text-xs font-semibold ${className}`}>
      {btn("en", "EN")}
      {btn("zh", "中文")}
    </div>
  );
}
