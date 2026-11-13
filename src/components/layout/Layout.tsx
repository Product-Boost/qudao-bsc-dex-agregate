// App shell: header (nav, alerts, wallet), notice banners, page outlet, footer.
import { Component, useEffect, useState, type ReactNode } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown, Menu, X } from "lucide-react";
import { EASE } from "../../lib/ease";
import { ScrollProgress } from "../motion";
import { COMMUNITY, FOOTER, MORE, NAV } from "../../data/site";
import { useAppConfig } from "../../lib/config";
import { chain, isLocalFork, isTestnet } from "../../lib/wagmi";
import { AlertsButton } from "./Alerts";
import { WalletButton } from "./Wallet";
import { Onboarding } from "../Onboarding";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link to="/" className={`flex items-center gap-2.5 ${className}`} aria-label="Qudao home">
      <img src="/favicon.svg" alt="" className="size-8" />
      <span className="font-display text-xl font-semibold tracking-tight">Qudao</span>
    </Link>
  );
}

const linkCls = ({ isActive }: { isActive: boolean }) =>
  `rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${isActive ? "bg-panel-3 text-gold-2" : "text-fg-2 hover:text-fg"}`;

const navCls = ({ isActive }: { isActive: boolean }) =>
  `relative rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${isActive ? "text-gold-2" : "text-fg-2 hover:text-fg"}`;

/** Long reads get a reading-progress bar. */
const READS = new Set(["/", "/whitepaper", "/roadmap"]);

function Header() {
  const [open, setOpen] = useState(false);
  const [more, setMore] = useState(false);
  const loc = useLocation();
  const [path, setPath] = useState(loc.pathname);
  if (path !== loc.pathname) {
    setPath(loc.pathname);
    setOpen(false);
    setMore(false);
  }
  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-ink/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
        <Logo />
        <nav className="ml-4 hidden items-center gap-0.5 lg:flex">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} className={navCls}>
              {({ isActive }) => (
                <>
                  {isActive && <motion.span layoutId="nav-pill" className="absolute inset-0 rounded-lg bg-panel-3" transition={{ type: "spring", bounce: 0.15, duration: 0.5 }} />}
                  <span className="relative">{n.label}</span>
                </>
              )}
            </NavLink>
          ))}
          <div className="relative" onMouseLeave={() => setMore(false)}>
            <button onClick={() => setMore((m) => !m)} onMouseEnter={() => setMore(true)} className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium text-fg-2 hover:text-fg">
              More <ChevronDown className={`size-3.5 transition-transform duration-300 ${more ? "rotate-180" : ""}`} />
            </button>
            <AnimatePresence>
              {more && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.98, transition: { duration: 0.15 } }}
                  transition={{ duration: 0.25, ease: EASE }}
                  className="absolute left-0 top-full z-50 w-44 origin-top-left rounded-2xl border border-line-2 bg-panel-2 p-1.5 shadow-2xl"
                >
                  {MORE.map((n) => (
                    <NavLink key={n.to} to={n.to} className="block rounded-xl px-3 py-2 text-sm text-fg-2 transition-colors hover:bg-panel-3 hover:text-fg">
                      {n.label}
                    </NavLink>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          {isLocalFork && <span className="hidden rounded-lg border border-warn/40 px-2 py-1 text-xs text-warn sm:inline">Local fork</span>}
          {isTestnet && !isLocalFork && <span className="hidden rounded-lg border border-info/40 px-2 py-1 text-xs text-info sm:inline">Testnet</span>}
          <AlertsButton />
          <WalletButton />
          <button className="grid size-9 place-items-center rounded-xl border border-line-2 lg:hidden" onClick={() => setOpen((o) => !o)} aria-label="Menu">
            <AnimatePresence mode="wait" initial={false}>
              <motion.span key={open ? "x" : "menu"} initial={{ opacity: 0, rotate: -90 }} animate={{ opacity: 1, rotate: 0 }} exit={{ opacity: 0, rotate: 90 }} transition={{ duration: 0.15 }}>
                {open ? <X className="size-4" /> : <Menu className="size-4" />}
              </motion.span>
            </AnimatePresence>
          </button>
        </div>
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.nav
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="overflow-hidden border-t border-line bg-ink-2 lg:hidden"
          >
            <div className="grid grid-cols-2 gap-1 p-3">
              {[...NAV, ...MORE].map((n, i) => (
                <motion.div key={n.to} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.03 * i, duration: 0.25 }}>
                  <NavLink to={n.to} className={(s) => `block ${linkCls(s)}`}>
                    {n.label}
                  </NavLink>
                </motion.div>
              ))}
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}

function Banners() {
  const { deployment, protocol, chain: server } = useAppConfig();
  const placeholder = protocol._status?.startsWith("PLACEHOLDER");
  if (server.id !== chain.id)
    return (
      <div className="border-b border-down/30 bg-down/10 text-center text-xs text-fg-2">
        <div className="mx-auto max-w-7xl px-4 py-2">
          This app is built for {chain.name} but its server runs on {server.name}. Transactions are disabled until they match.
        </div>
      </div>
    );
  if (isTestnet)
    return (
      <div className="border-b border-info/25 bg-info/[0.07] text-center text-xs text-fg-2">
        <div className="mx-auto max-w-7xl px-4 py-2">
          Testnet: tokens here have no value. Get test BNB from the{" "}
          <a href="https://www.bnbchain.org/en/testnet-faucet" target="_blank" rel="noreferrer" className="text-info underline">
            BNB Chain faucet
          </a>
          , then swap it for test USDT or CAKE in <Link to="/markets" className="text-info underline">Markets</Link>. Testnet pool prices don't follow real markets.
        </div>
      </div>
    );
  if (deployment && !placeholder) return null;
  return (
    <div className="border-b border-gold/20 bg-gold/[0.06] text-center text-xs text-fg-2">
      <div className="mx-auto max-w-7xl px-4 py-2">
        {!deployment
          ? "Qudao's contracts aren't live on this network yet: markets, pools and the backtest use live data; deposits open at launch."
          : "Preview: the fees, rewards and splits shown are placeholder numbers until the final economics are set."}
      </div>
    </div>
  );
}

function Footer() {
  const community = COMMUNITY.filter((c) => c.href);
  return (
    <footer className="mt-24 border-t border-line bg-ink-2">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_repeat(4,1fr)]">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-mute">
            Automated PancakeSwap v3 liquidity on BNB Chain. Your funds stay in a vault only your wallet controls.
          </p>
          {community.length > 0 && (
            <div className="mt-4 flex gap-3 text-sm">
              {community.map((c) => (
                <a key={c.label} href={c.href} target="_blank" rel="noreferrer" className="text-fg-2 hover:text-gold-2">
                  {c.label}
                </a>
              ))}
            </div>
          )}
        </div>
        {FOOTER.map((col) => (
          <div key={col.title}>
            <h3 className="label mb-3">{col.title}</h3>
            <ul className="space-y-2 text-sm">
              {col.links.map((l) => (
                <li key={l.label}>
                  {"to" in l ? (
                    <Link to={l.to} className="text-fg-2 hover:text-gold-2">
                      {l.label}
                    </Link>
                  ) : (
                    <a href={l.href} target="_blank" rel="noreferrer" className="text-fg-2 hover:text-gold-2">
                      {l.label}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-line">
        <p className="mx-auto max-w-7xl px-4 py-6 text-xs leading-relaxed text-dim sm:px-6">
          Providing liquidity carries risk, including loss from price moves (impermanent loss), smart-contract risk and token risk. Nothing here is financial advice. Qudao's contracts are
          unaudited until an audit report is published here.
        </p>
      </div>
    </footer>
  );
}

class PageError extends Component<{ children: ReactNode; path: string }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidUpdate(prev: { path: string }) {
    if (prev.path !== this.props.path && this.state.error) this.setState({ error: null });
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <h1 className="text-2xl font-semibold">This page hit an error</h1>
        <p className="mt-3 max-w-xl text-sm text-fg-2">{this.state.error.message}</p>
      </div>
    );
  }
}

export function Layout() {
  const loc = useLocation();
  useEffect(() => {
    if (!loc.hash) window.scrollTo({ top: 0 });
  }, [loc.pathname, loc.hash]);
  // remember an invite code from any link (?ref=abcd1234); it's applied to the wallet's first position
  useEffect(() => {
    const ref = new URLSearchParams(loc.search).get("ref");
    if (ref && /^[a-z0-9]{8}$/.test(ref)) {
      try {
        localStorage.setItem("qudao:ref", ref);
      } catch {
        /* private mode */
      }
    }
  }, [loc.search]);
  return (
    <div className="flex min-h-dvh flex-col">
      {READS.has(loc.pathname) && <ScrollProgress />}
      <Header />
      <Banners />
      <motion.main key={loc.pathname} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE }} className="flex-1">
        <PageError path={loc.pathname}>
          <Outlet />
        </PageError>
      </motion.main>
      <Footer />
      <Onboarding />
    </div>
  );
}

/** Standard page width and padding. */
export function Page({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`mx-auto max-w-7xl px-4 py-10 sm:px-6 ${className}`}>{children}</div>;
}
