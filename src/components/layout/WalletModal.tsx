// The wallet picker. "Connect": wallets already in this browser (EIP-6963, or the one an in-app browser injects) and
// WalletConnect for phone wallets. "Popular wallets": the suggested ones that aren't installed, each with its next step:
// install the extension, scan a QR code with its phone app, or on a phone, open Qudao inside the wallet's own browser.
import { useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useConnect, useConnection, useConnectors, type Connector } from "wagmi";
import { ArrowLeft, ArrowUpRight, Check, Copy, Download, RefreshCw, Smartphone, Wallet as WalletIcon } from "lucide-react";
import { Modal } from "../Modal";
import { QrCode } from "../QrCode";
import { EASE } from "../../lib/ease";
import { friendlyError } from "../../lib/errors";
import { chain } from "../../lib/wagmi";
import {
  appLink,
  extensionLink,
  identifyInjected,
  isAndroid,
  isMobile,
  WALLETCONNECT_ICON,
  WALLETS,
  walletFor,
  type WalletInfo,
} from "../../lib/wallets";

type Installed = { connector: Connector; name: string; icon?: string; info?: WalletInfo };
type View =
  | { kind: "list" }
  | { kind: "wallet"; wallet: WalletInfo }
  | { kind: "connecting"; item: Installed }
  | { kind: "qr"; wallet?: WalletInfo };

const slide = {
  initial: { opacity: 0, x: 18 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -18 },
  transition: { duration: 0.25, ease: EASE },
};

export function WalletModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const connectors = useConnectors();
  const { connectAsync } = useConnect();
  const { isConnected } = useConnection();
  const [view, setView] = useState<View>({ kind: "list" });
  const [error, setError] = useState<string | null>(null);
  const [uri, setUri] = useState<string | null>(null);
  const deepLinkTo = useRef<WalletInfo | null>(null);
  const mobile = isMobile();

  // back to the list each time the picker opens
  const [wasOpen, setWasOpen] = useState(open);
  if (wasOpen !== open) {
    setWasOpen(open);
    if (open) {
      setView({ kind: "list" });
      setError(null);
    }
  }

  useEffect(() => {
    if (isConnected && open) onClose();
  }, [isConnected, open, onClose]);

  const wc = connectors.find((c) => c.type === "walletConnect");
  // WalletConnect needs a secure page (https or localhost): it isn't offered on a plain-http LAN address
  const wcReady = !!wc && typeof window !== "undefined" && window.isSecureContext;
  const mock = connectors.find((c) => c.type === "mock");

  // WalletConnect hands out its pairing link through the connector's message channel
  useEffect(() => {
    if (!wc) return;
    const onMessage = ({ type, data }: { type: string; data?: unknown }) => {
      if (type !== "display_uri" || typeof data !== "string") return;
      setUri(data);
      const w = deepLinkTo.current;
      if (w?.wc && isMobile()) window.location.href = w.wc(data, isAndroid());
    };
    wc.emitter.on("message", onMessage);
    return () => wc.emitter.off("message", onMessage);
  }, [wc]);

  // what's installed: wallets that announced themselves, else whatever injected window.ethereum
  const announced = connectors.filter((c) => c.type === "injected" && c.id !== "injected");
  const generic = connectors.find((c) => c.id === "injected");
  const installed: Installed[] = announced.map((c) => {
    const info = walletFor(c.id, c.name);
    return { connector: c, name: c.name, icon: c.icon ?? info?.icon, info };
  });
  if (announced.length === 0 && generic && typeof window !== "undefined" && "ethereum" in window) {
    const info = identifyInjected();
    installed.push({ connector: generic, name: info?.name ?? "Browser wallet", icon: info?.icon, info });
  }
  const have = new Set(installed.map((i) => i.info?.id));
  const more = WALLETS.filter((w) => !have.has(w.id));
  // what each suggested wallet's tag says: its next step here
  const tag = (w: WalletInfo) =>
    mobile ? (w.dapp || (wcReady && w.wc) ? "Open app" : "Get app") : w.kind === "phone" ? "Scan with your phone" : "Install";

  async function connectInstalled(item: Installed) {
    setError(null);
    setView({ kind: "connecting", item });
    try {
      await connectAsync({ connector: item.connector, chainId: chain.id });
    } catch (e) {
      const f = friendlyError(e);
      setError(f.cancelled ? "You closed the request in your wallet. Try again when you're ready." : f.message);
    }
  }

  async function startWalletConnect(wallet?: WalletInfo) {
    if (!wc || !wcReady) return;
    setError(null);
    setUri(null);
    deepLinkTo.current = wallet ?? null;
    try {
      await connectAsync({ connector: wc, chainId: chain.id });
    } catch (e) {
      const f = friendlyError(e);
      if (!f.cancelled) setError(f.message);
    }
  }

  function pick(w: WalletInfo) {
    setError(null);
    setView({ kind: "wallet", wallet: w });
    // on a computer, the QR code for the wallet's phone app is ready by the time the view opens
    if (!mobile && wcReady && w.scan) void startWalletConnect(w);
  }

  const back = () => {
    setError(null);
    setView({ kind: "list" });
  };

  const title =
    view.kind === "list" ? (
      "Connect a wallet"
    ) : (
      <span className="flex items-center gap-2">
        <button onClick={back} aria-label="Back" className="-ml-1 rounded-lg p-1 text-mute transition-colors hover:bg-panel-3 hover:text-fg">
          <ArrowLeft className="size-5" />
        </button>
        {view.kind === "wallet" ? view.wallet.name : view.kind === "connecting" ? view.item.name : view.wallet?.name ?? "WalletConnect"}
      </span>
    );

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <AnimatePresence mode="wait" initial={false}>
        {view.kind === "list" && (
          <motion.div key="list" {...slide} className="flex flex-col gap-5">
            <Section label="Connect">
              {installed.map((item, i) => (
                <Row key={item.connector.uid} i={i} icon={item.icon} name={item.name} tag="Installed" installed onClick={() => connectInstalled(item)} />
              ))}
              {mock && <Row i={installed.length} name="Dev wallet" tag="Local fork" onClick={() => connectInstalled({ connector: mock, name: "Dev wallet" })} />}
              <Row
                i={installed.length + (mock ? 1 : 0)}
                icon={WALLETCONNECT_ICON}
                name="WalletConnect (phone wallet)"
                onClick={() => {
                  setView({ kind: "qr" });
                  void startWalletConnect();
                }}
              />
            </Section>

            {more.length > 0 && (
              <Section label="Popular wallets">
                {more.map((w, i) => (
                  <Row key={w.id} i={i + 2} icon={w.icon} name={w.name} tag={tag(w)} onClick={() => pick(w)} />
                ))}
              </Section>
            )}

            <div className="space-y-3 text-sm leading-relaxed text-mute">
              {installed.length === 0 && <p>No wallet found in this browser. Install one of the wallets above, or connect a phone wallet with WalletConnect.</p>}
              <p>Qudao never sees your private key or recovery phrase. Nothing happens without your approval in your own wallet.</p>
            </div>
          </motion.div>
        )}

        {view.kind === "connecting" && (
          <motion.div key="connecting" {...slide} className="flex flex-col items-center gap-4 py-4 text-center">
            <Pulse icon={view.item.icon} failed={!!error} />
            <div>
              <div className="font-semibold">{error ? "Not connected" : `Opening ${view.item.name}…`}</div>
              <p className="mt-1 text-sm text-mute">{error ?? "Confirm the connection in your wallet. If nothing opened, click its icon in your browser's toolbar."}</p>
            </div>
            {error && (
              <button onClick={() => connectInstalled(view.item)} className="inline-flex items-center gap-2 rounded-xl bg-gold px-4 py-2 text-sm font-semibold text-gold-ink transition-transform active:scale-[0.97]">
                <RefreshCw className="size-4" /> Try again
              </button>
            )}
          </motion.div>
        )}

        {view.kind === "wallet" && (
          <motion.div key={`w-${view.wallet.id}`} {...slide}>
            {mobile ? (
              <MobileWallet wallet={view.wallet} wcReady={wcReady} uri={uri} error={error} onWalletConnect={() => startWalletConnect(view.wallet)} />
            ) : (
              <DesktopWallet wallet={view.wallet} wcReady={wcReady} uri={uri} error={error} />
            )}
          </motion.div>
        )}

        {view.kind === "qr" && (
          <motion.div key="qr" {...slide} className="flex flex-col items-center gap-4 text-center">
            {!wcReady ? (
              <WalletConnectOff configured={!!wc} />
            ) : mobile ? (
              <>
                <img src={WALLETCONNECT_ICON} alt="" className="size-16 rounded-2xl" />
                <p className="text-sm text-fg-2">Pick a wallet app on this phone to connect with.</p>
                {uri ? (
                  <ActionLink href={uri} primary external={false}>
                    <Smartphone className="size-4" /> Open a wallet app
                  </ActionLink>
                ) : (
                  <div className="skeleton h-11 w-full rounded-xl" />
                )}
                {uri && <CopyButton text={uri} label="Copy connection link" />}
              </>
            ) : (
              <>
                <QrBlock uri={uri} logo={WALLETCONNECT_ICON} />
                <p className="text-sm text-fg-2">Scan with any wallet app that supports WalletConnect on BNB Chain.</p>
                {uri && <CopyButton text={uri} label="Copy link" />}
              </>
            )}
            {error && <ErrorNote>{error}</ErrorNote>}
          </motion.div>
        )}
      </AnimatePresence>
    </Modal>
  );
}

// ------------------------------------------------------------------ wallet detail

function DesktopWallet({ wallet, wcReady, uri, error }: { wallet: WalletInfo; wcReady: boolean; uri: string | null; error: string | null }) {
  const ext = extensionLink(wallet);
  const canScan = wcReady && !!wallet.scan;
  const phone = wallet.kind === "phone";
  return (
    <div className="flex flex-col gap-5">
      {!phone && ext && (
        <>
          <div className="flex items-center gap-4 rounded-2xl border border-line bg-panel-2 p-4">
            <img src={wallet.icon} alt="" className="size-12 rounded-2xl" />
            <div className="min-w-0 flex-1">
              <div className="font-semibold">{wallet.name} isn't installed here</div>
              <div className="text-sm text-mute">Add the browser extension, then reload this page.</div>
            </div>
          </div>
          <div className="flex gap-2">
            <ActionLink href={ext.href} primary>
              <Download className="size-4" /> {ext.label}
            </ActionLink>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-line-2 px-4 py-2.5 text-sm font-semibold transition-colors hover:border-gold/60 hover:text-gold-2"
            >
              <RefreshCw className="size-4" /> I've installed it
            </button>
          </div>
        </>
      )}

      {canScan ? (
        <div className={`flex flex-col items-center gap-3 text-center ${phone ? "" : "border-t border-line pt-5"}`}>
          <div className="label">{phone ? `Scan with ${wallet.name}` : `Or use ${wallet.name} on your phone`}</div>
          <QrBlock uri={uri} logo={wallet.icon} size={phone ? 232 : 208} />
          <p className="max-w-xs text-xs text-mute">Open {wallet.name} on your phone, tap its scanner and point it at this code.</p>
          {error && <ErrorNote>{error}</ErrorNote>}
        </div>
      ) : (
        phone && (
          <div className="flex flex-col items-center gap-3 text-center">
            <img src={wallet.icon} alt="" className="size-16 rounded-2xl" />
            <WalletConnectOff configured={false} quiet />
          </div>
        )
      )}

      {wallet.app && (phone || !canScan) && <StoreLinks wallet={wallet} label={phone ? `Don't have ${wallet.name}?` : `Get the ${wallet.name} app`} />}

      {phone && ext && (
        <p className="text-center text-xs text-mute">
          Prefer the browser extension?{" "}
          <a href={ext.href} target="_blank" rel="noreferrer" className="text-gold-2 hover:underline">
            {ext.label}
          </a>
        </p>
      )}
    </div>
  );
}

/** Why there's no QR code: WalletConnect isn't set up, or the page isn't https. */
function WalletConnectOff({ configured, quiet }: { configured: boolean; quiet?: boolean }) {
  const insecure = typeof window !== "undefined" && !window.isSecureContext;
  return (
    <div className={`w-full rounded-2xl border border-line bg-panel-2 p-4 text-left text-sm text-fg-2 ${quiet ? "text-center" : ""}`}>
      {insecure && configured
        ? "Phone wallets connect over a secure page only. Open Qudao on its https address to scan a code."
        : "Connecting phone wallets by QR code isn't switched on for this site yet."}
      {import.meta.env.DEV && !configured && (
        <div className="mt-2 text-xs text-mute">
          Dev note: set <span className="font-mono">VITE_WALLETCONNECT_PROJECT_ID</span> (free at dashboard.reown.com). It also needs https or localhost.
        </div>
      )}
    </div>
  );
}

function MobileWallet({
  wallet,
  wcReady,
  uri,
  error,
  onWalletConnect,
}: {
  wallet: WalletInfo;
  wcReady: boolean;
  uri: string | null;
  error: string | null;
  onWalletConnect: () => void;
}) {
  const here = typeof location !== "undefined" ? location.href : "";
  const store = appLink(wallet);
  const canWc = wcReady && !!wallet.wc;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col items-center gap-3 py-2 text-center">
        <img src={wallet.icon} alt="" className="size-16 rounded-2xl shadow-lg" />
        <p className="max-w-xs text-sm text-mute">
          {canWc || wallet.dapp ? `Connect with the ${wallet.name} app, or get it first.` : `Open Qudao in ${wallet.name}'s browser to connect.`}
        </p>
      </div>
      {canWc && (
        <button
          onClick={onWalletConnect}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-gold px-4 py-3 text-sm font-semibold text-gold-ink transition-transform active:scale-[0.97]"
        >
          <Smartphone className="size-4" /> Connect with {wallet.name}
        </button>
      )}
      {canWc && uri && wallet.wc && (
        <a href={wallet.wc(uri, isAndroid())} className="text-center text-xs text-gold-2 underline">
          Didn't open? Tap here
        </a>
      )}
      {wallet.dapp && (
        <ActionLink href={wallet.dapp(here)} primary={!canWc} external={false}>
          <ArrowUpRight className="size-4" /> Open Qudao in {wallet.name}
        </ActionLink>
      )}
      {store && (
        <ActionLink href={store}>
          <Download className="size-4" /> Get {wallet.name}
        </ActionLink>
      )}
      <div className="mt-2 rounded-2xl border border-line bg-panel-2 p-3 text-xs leading-relaxed text-mute">
        Already have it? Copy this page's link and paste it into {wallet.name}'s built-in browser.
        <div className="mt-2">
          <CopyButton text={here} label="Copy link" />
        </div>
      </div>
      {error && <ErrorNote>{error}</ErrorNote>}
    </div>
  );
}

function StoreLinks({ wallet, label }: { wallet: WalletInfo; label: string }) {
  const app = wallet.app!;
  return (
    <div className="flex flex-col gap-2 border-t border-line pt-5">
      <div className="label">{label}</div>
      <div className="flex flex-wrap gap-2">
        {app.ios && <ActionLink href={app.ios}>App Store</ActionLink>}
        {app.android && <ActionLink href={app.android}>Google Play</ActionLink>}
        {(!app.ios || !app.android) && <ActionLink href={app.home}>{app.ios || app.android ? "Website" : "Download"}</ActionLink>}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ pieces

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="label mb-2.5">{label}</h3>
      <div className="flex flex-col gap-2">{children}</div>
    </section>
  );
}

function Row({ i, icon, name, tag, installed, onClick }: { i: number; icon?: string; name: string; tag?: string; installed?: boolean; onClick: () => void }) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.03 * i, ease: EASE }}
      onClick={onClick}
      className="group flex items-center gap-3 rounded-xl border border-line bg-panel-2 px-4 py-3 text-left transition-[border-color,background-color] duration-200 hover:border-gold/50 hover:bg-panel-3"
    >
      {icon ? (
        <img src={icon} alt="" className="size-8 shrink-0 rounded-lg" />
      ) : (
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-panel-3 text-gold">
          <WalletIcon className="size-4" />
        </span>
      )}
      <span className="min-w-0 flex-1 truncate font-semibold">{name}</span>
      {tag &&
        (installed ? (
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-up/30 bg-up/10 px-2 py-1 text-[11px] font-medium text-up">
            <span className="size-1.5 rounded-full bg-up" /> {tag}
          </span>
        ) : (
          <span className="shrink-0 rounded-md border border-line-2 px-2 py-1 text-[11px] font-medium text-fg-2 transition-colors group-hover:border-gold/50 group-hover:text-gold-2">
            {tag}
          </span>
        ))}
    </motion.button>
  );
}

function ActionLink({ href, children, primary, external = true }: { href: string; children: ReactNode; primary?: boolean; external?: boolean }) {
  return (
    <a
      href={href}
      {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
      className={`inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold whitespace-nowrap transition-[background-color,border-color,color,transform] active:scale-[0.97] ${
        primary ? "bg-gold text-gold-ink hover:bg-gold-2" : "border border-line-2 hover:border-gold/60 hover:text-gold-2"
      }`}
    >
      {children}
    </a>
  );
}

function QrBlock({ uri, logo, size = 232 }: { uri: string | null; logo?: string; size?: number }) {
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <AnimatePresence mode="wait">
        {uri ? (
          <motion.div key="qr" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3, ease: EASE }}>
            <QrCode value={uri} logo={logo} size={size} />
          </motion.div>
        ) : (
          <motion.div key="wait" exit={{ opacity: 0 }} className="skeleton size-full rounded-2xl" aria-label="Preparing QR code" />
        )}
      </AnimatePresence>
    </div>
  );
}

function Pulse({ icon, failed }: { icon?: string; failed: boolean }) {
  return (
    <div className="relative grid size-24 place-items-center">
      {!failed && (
        <>
          <motion.span
            className="absolute inset-0 rounded-3xl border border-gold/50"
            animate={{ scale: [1, 1.25], opacity: [0.7, 0] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
          />
          <motion.span
            className="absolute inset-0 rounded-3xl border border-gold/40"
            animate={{ scale: [1, 1.25], opacity: [0.6, 0] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut", delay: 0.8 }}
          />
        </>
      )}
      {icon ? (
        <img src={icon} alt="" className={`size-16 rounded-2xl ${failed ? "opacity-60 grayscale" : ""}`} />
      ) : (
        <span className="grid size-16 place-items-center rounded-2xl bg-panel-3 text-gold">
          <Smartphone className="size-7" />
        </span>
      )}
    </div>
  );
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      onClick={() => {
        copyText(text);
        setDone(true);
        setTimeout(() => setDone(false), 1500);
      }}
      className="inline-flex items-center gap-1.5 rounded-lg border border-line-2 px-3 py-1.5 text-xs font-medium text-fg-2 transition-colors hover:border-gold/60 hover:text-gold-2"
    >
      {done ? <Check className="size-3.5 text-up" /> : <Copy className="size-3.5" />} {done ? "Copied" : label}
    </button>
  );
}

/** Clipboard API where allowed; a plain-http page (e.g. a LAN address) needs the old textarea route. */
function copyText(text: string) {
  if (window.isSecureContext && navigator.clipboard) return void navigator.clipboard.writeText(text);
  const t = document.createElement("textarea");
  t.value = text;
  t.style.position = "fixed";
  t.style.opacity = "0";
  document.body.appendChild(t);
  t.select();
  document.execCommand("copy");
  t.remove();
}

const ErrorNote = ({ children }: { children: ReactNode }) => (
  <div className="w-full rounded-xl border border-down/30 bg-down/8 px-4 py-3 text-left text-sm text-fg-2">{children}</div>
);
