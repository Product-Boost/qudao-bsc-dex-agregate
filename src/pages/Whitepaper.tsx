// Whitepaper with contents and search (matching sections stay, matches are highlighted).
import { Fragment, useEffect, useMemo, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { Search, X } from "lucide-react";
import type { Address } from "viem";
import { Page } from "../components/layout/Layout";
import { useAppConfig } from "../lib/config";
import { short } from "../lib/format";
import { whitepaper, type Block } from "../data/whitepaper";
import { useT } from "../i18n";

function mark(text: string, q: string): ReactNode {
  if (!q) return text;
  const parts = text.split(new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "ig"));
  return parts.map((p, i) => (i % 2 ? <mark key={i} className="rounded bg-gold/30 px-0.5 text-fg">{p}</mark> : <Fragment key={i}>{p}</Fragment>));
}

const blockText = (b: Block) => ("p" in b ? b.p : "ul" in b ? b.ul.join(" ") : "contract addresses");

export default function Whitepaper() {
  const { t, locale } = useT();
  const { protocol, deployment, chain } = useAppConfig();
  const sections = useMemo(() => whitepaper(protocol), [protocol, locale]);
  const [q, setQ] = useState("");
  const loc = useLocation();
  const term = q.trim().toLowerCase();
  const shown = term ? sections.filter((s) => (s.title + " " + s.blocks.map(blockText).join(" ")).toLowerCase().includes(term)) : sections;

  useEffect(() => {
    if (loc.hash) setTimeout(() => document.getElementById(loc.hash.slice(1))?.scrollIntoView({ behavior: "smooth" }), 50);
  }, [loc.hash]);

  const contracts: [string, Address | undefined][] = deployment
    ? [
        ["Factory", deployment.factory],
        ["Vault template", deployment.vaultImplementation],
        ["Swapper", deployment.swapper],
        ["Price oracle", deployment.oracle],
        ["Revenue router", deployment.revenueRouter],
        ["Referrals", deployment.referrals],
        ["The Well", deployment.well],
        ["Buyback & burn", deployment.buybackBurner],
        ["Safety fund", deployment.safetyFund],
        ["Boosted pools reserve", deployment.boostReserve],
        ["Expansion reserve", deployment.expansionReserve],
        ["Timelock", deployment.timelock],
      ]
    : [];

  return (
    <Page>
      <div className="grid gap-10 lg:grid-cols-[240px_1fr]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <label className="flex h-10 items-center gap-2 rounded-xl border border-line bg-panel px-3 focus-within:border-gold/50">
            <Search className="size-4 text-mute" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("Search")} className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-dim" />
            {q && (
              <button onClick={() => setQ("")} aria-label={t("Clear search")} className="text-mute hover:text-fg">
                <X className="size-4" />
              </button>
            )}
          </label>
          <nav className="mt-5 hidden lg:block">
            <div className="label mb-2">{t("Contents")}</div>
            <ul className="space-y-1 text-sm">
              {sections.map((s) => (
                <li key={s.id} className={s.level === 2 ? "pl-3" : ""}>
                  <a href={`#${s.id}`} className={`block rounded-lg px-2 py-1 hover:bg-panel-2 hover:text-gold-2 ${shown.includes(s) ? "text-fg-2" : "text-dim"}`}>
                    {s.title}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </aside>
        <article className="max-w-3xl">
          <div className="label text-gold">{t("Whitepaper")}</div>
          <h1 className="mt-2 text-4xl font-semibold">Qudao</h1>
          <p className="mt-2 text-fg-2">{t("Automated PancakeSwap v3 liquidity on BNB Chain.")}</p>
          {protocol._status?.startsWith("PLACEHOLDER") && (
            <p className="mt-4 rounded-xl border border-gold/30 bg-gold/[0.06] px-4 py-3 text-sm text-fg-2">{t("Draft: the fees, rewards and splits below are placeholders until the final numbers are set.")}</p>
          )}
          {term && (
            <p className="mt-6 text-sm text-mute">
              {shown.length
                ? t(shown.length > 1 ? "{n} sections mention “{q}”." : "{n} section mentions “{q}”.", { n: shown.length, q })
                : t("Nothing mentions “{q}”.", { q })}
            </p>
          )}
          <div className="mt-8 space-y-10">
            {shown.map((s) => (
              <section key={s.id} id={s.id} className="scroll-mt-24">
                {s.level === 1 ? <h2 className="text-2xl font-semibold">{mark(s.title, term)}</h2> : <h3 className="text-lg font-semibold text-fg">{mark(s.title, term)}</h3>}
                <div className="mt-3 space-y-4 leading-relaxed text-fg-2">
                  {s.blocks.map((blk, i) =>
                    "p" in blk ? (
                      <p key={i}>{mark(blk.p, term)}</p>
                    ) : "ul" in blk ? (
                      <ul key={i} className="space-y-2">
                        {blk.ul.map((li) => (
                          <li key={li} className="flex gap-3">
                            <span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-gold/70" />
                            <span>{mark(li, term)}</span>
                          </li>
                        ))}
                      </ul>
                    ) : contracts.length ? (
                      <div key={i} className="divide-y divide-line/70 rounded-2xl border border-line bg-panel">
                        {contracts.map(([label, a]) => (
                          <div key={label} className="flex items-center justify-between gap-4 px-4 py-2.5 text-sm">
                            <span>{t(label)}</span>
                            <a href={`${chain.explorer}/address/${a}`} target="_blank" rel="noreferrer" className="font-mono text-xs text-fg hover:text-gold-2">
                              {short(a, 6)}
                            </a>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p key={i} className="text-mute">{t("The addresses are published here at launch.")}</p>
                    ),
                  )}
                </div>
              </section>
            ))}
          </div>
        </article>
      </div>
    </Page>
  );
}
