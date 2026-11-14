// English and Simplified Chinese. The choice is remembered and applied before the app renders.
export type Locale = "en" | "zh";

const KEY = "qudao:locale";

function detect(): Locale {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === "en" || saved === "zh") return saved;
  } catch {
    /* private mode */
  }
  return "zh";
}

let locale: Locale = detect();
const listeners = new Set<() => void>();

const META: Record<Locale, { title: string; description: string }> = {
  en: {
    title: "Qudao · Automated PancakeSwap liquidity on BNB Chain",
    description:
      "Qudao keeps your PancakeSwap v3 liquidity in range on BNB Smart Chain: it moves your range when the price moves, reinvests the fees and farms CAKE.",
  },
  zh: {
    title: "Qudao · 在 BNB Chain 上自动管理 PancakeSwap 流动性",
    description: "Qudao 让你在 BNB Chain 上的 PancakeSwap v3 流动性始终处于价格区间内：价格变动时移动区间、复投手续费并挖取 CAKE。",
  },
};

function apply(next: Locale) {
  if (typeof document === "undefined") return;
  document.documentElement.lang = next === "zh" ? "zh-CN" : "en";
  document.title = META[next].title;
  document.querySelector('meta[name="description"]')?.setAttribute("content", META[next].description);
}

export function getLocale(): Locale {
  return locale;
}

export function localeTag(): string {
  return locale === "zh" ? "zh-CN" : "en-US";
}

export function setLocale(next: Locale) {
  if (next === locale) return;
  locale = next;
  try {
    localStorage.setItem(KEY, next);
  } catch {
    /* private mode */
  }
  apply(next);
  listeners.forEach((l) => l());
}

export function subscribeLocale(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

apply(locale);
