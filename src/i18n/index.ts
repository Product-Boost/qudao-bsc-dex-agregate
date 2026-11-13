// `t("English source")` returns that sentence in the active language.
// A third argument disambiguates the same English used for different meanings (`t("Next", undefined, "status")`).
import { useCallback, useSyncExternalStore } from "react";
import { getLocale, setLocale, subscribeLocale, type Locale } from "./locale";
import { zh } from "./zh";

export type { Locale };
export { getLocale, localeTag, setLocale } from "./locale";

export type Vars = Record<string, string | number>;

export function translate(locale: Locale, source: string, vars?: Vars, ctx?: string): string {
  const table = locale === "zh" ? zh : undefined;
  let out = (ctx && table?.[`${ctx}::${source}`]) || table?.[source] || source;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) out = out.split(`{${k}}`).join(String(v));
  }
  return out;
}

/** For code that runs outside a component. Call `useT()` in components so they update when the language changes. */
export function t(source: string, vars?: Vars, ctx?: string): string {
  return translate(getLocale(), source, vars, ctx);
}

export function useT() {
  const locale = useSyncExternalStore(subscribeLocale, getLocale, getLocale);
  const translateNow = useCallback((source: string, vars?: Vars, ctx?: string) => translate(locale, source, vars, ctx), [locale]);
  return { locale, setLocale, t: translateNow };
}
