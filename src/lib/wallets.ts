// The wallets the picker suggests, with what it needs for each: how to recognise it once installed, where to get it,
// and how to reach its phone app (WalletConnect deep link, or opening Qudao in the app's own browser).
// Any other installed wallet still shows up, through EIP-6963 or window.ethereum.
// Logos (public/wallets) and store links come from RainbowKit's wallet list (MIT); dapp links from each wallet's docs.

export type WalletInfo = {
  id: string;
  name: string;
  icon: string;
  /** "extension": suggested as a browser extension ("Install"); "phone": suggested as a phone app ("Scan with your phone") */
  kind: "extension" | "phone";
  /** EIP-6963 ids the wallet announces itself with */
  rdns: string[];
  /** recognises the wallet from window.ethereum when it doesn't announce itself (older versions, in-app browsers) */
  detect?: (eth: Flags, w: Win) => boolean;
  extension?: { chrome?: string; edge?: string; firefox?: string; home: string };
  app?: { ios?: string; android?: string; home: string };
  /** its phone app can scan a WalletConnect QR code */
  scan?: boolean;
  /** opens a page inside the wallet's own browser (phone) */
  dapp?: (url: string) => string;
  /** WalletConnect: link that hands the pairing uri to the wallet's phone app */
  wc?: (uri: string, android: boolean) => string;
};

type Flags = Record<string, unknown>;
type Win = Record<string, unknown>;

const enc = encodeURIComponent;

export const WALLETS: WalletInfo[] = [
  {
    id: "metamask",
    name: "MetaMask",
    icon: "/wallets/metamask.svg",
    kind: "extension",
    rdns: ["io.metamask", "io.metamask.mobile", "io.metamask.flask"],
    // other wallets copy MetaMask's flag, so identifyInjected checks it last
    detect: (e) => !!e.isMetaMask,
    extension: {
      chrome: "https://chromewebstore.google.com/detail/nkbihfbeogaeaoehlefnkodbefgpgknn",
      edge: "https://microsoftedge.microsoft.com/addons/detail/metamask/ejbalbakoplchlghecdalmeeeajnimhm",
      firefox: "https://addons.mozilla.org/firefox/addon/ether-metamask",
      home: "https://metamask.io/download",
    },
    app: { ios: "https://apps.apple.com/us/app/metamask/id1438144202", android: "https://play.google.com/store/apps/details?id=io.metamask", home: "https://metamask.io/download" },
    scan: true,
    dapp: (url) => `https://metamask.app.link/dapp/${url.replace(/^https?:\/\//, "")}`,
    wc: (uri) => `https://metamask.app.link/wc?uri=${enc(uri)}`,
  },
  {
    id: "binance",
    name: "Binance Wallet",
    icon: "/wallets/binance.svg",
    // most people already have it inside the Binance app
    kind: "phone",
    rdns: ["com.binance.wallet"],
    detect: (e, w) => !!e.isBinance || !!w.binancew3w,
    extension: { chrome: "https://chromewebstore.google.com/detail/cadiboklkpojfamcoggejbbdjcoiljjk", home: "https://www.binance.com/en/web3wallet" },
    app: { ios: "https://apps.apple.com/us/app/id1436799971", android: "https://play.google.com/store/apps/details?id=com.binance.dev", home: "https://www.binance.com/en/download" },
    scan: true,
    wc: (uri, android) => (android ? uri : `bnc://app.binance.com/cedefi/wc?uri=${enc(uri)}`),
  },
  {
    id: "trust",
    name: "Trust Wallet",
    icon: "/wallets/trust.svg",
    kind: "phone",
    rdns: ["com.trustwallet.app"],
    detect: (e) => !!e.isTrust || !!e.isTrustWallet,
    extension: { chrome: "https://chromewebstore.google.com/detail/egjidjbpglichdcondbcbdnbeeppgdph", home: "https://trustwallet.com/browser-extension" },
    app: {
      ios: "https://apps.apple.com/us/app/trust-crypto-bitcoin-wallet/id1288339409",
      android: "https://play.google.com/store/apps/details?id=com.wallet.crypto.trustapp",
      home: "https://trustwallet.com/download",
    },
    scan: true,
    // coin_id 20000714 opens it on BNB Smart Chain
    dapp: (url) => `https://link.trustwallet.com/open_url?coin_id=20000714&url=${enc(url)}`,
    wc: (uri) => `trust://wc?uri=${enc(uri)}`,
  },
  {
    id: "coinbase",
    name: "Coinbase Wallet",
    icon: "/wallets/coinbase.svg",
    kind: "extension",
    rdns: ["com.coinbase.wallet"],
    detect: (e) => !!e.isCoinbaseWallet || !!e.isCoinbaseBrowser,
    extension: { chrome: "https://chromewebstore.google.com/detail/hnfanknocfeofbddgcijnmhnfnkdnaad", home: "https://www.coinbase.com/wallet" },
    app: { ios: "https://apps.apple.com/us/app/coinbase-wallet-store-crypto/id1278383455", android: "https://play.google.com/store/apps/details?id=org.toshi", home: "https://www.coinbase.com/wallet/downloads" },
    scan: true,
    dapp: (url) => `https://go.cb-w.com/dapp?cb_url=${enc(url)}`,
  },
  {
    id: "rabby",
    name: "Rabby",
    icon: "/wallets/rabby.svg",
    kind: "extension",
    rdns: ["io.rabby"],
    detect: (e) => !!e.isRabby,
    extension: { chrome: "https://chromewebstore.google.com/detail/acmacodkjbdgmoleebolmdjonilkdbch", home: "https://rabby.io" },
    app: { home: "https://rabby.io" },
  },
  {
    id: "phantom",
    name: "Phantom",
    icon: "/wallets/phantom.svg",
    kind: "extension",
    rdns: ["app.phantom"],
    detect: (e, w) => !!e.isPhantom || !!(w.phantom as Win | undefined)?.ethereum,
    extension: {
      chrome: "https://chromewebstore.google.com/detail/bfnaelmomeimhlpmgjnjophhpkkoljpa",
      firefox: "https://addons.mozilla.org/firefox/addon/phantom-app/",
      home: "https://phantom.com/download",
    },
    app: { ios: "https://apps.apple.com/app/phantom-crypto-wallet/id1598432977", android: "https://play.google.com/store/apps/details?id=app.phantom", home: "https://phantom.com/download" },
    dapp: (url) => `https://phantom.app/ul/browse/${enc(url)}?ref=${enc(new URL(url).origin)}`,
  },
];

export const WALLETCONNECT_ICON = "/wallets/walletconnect.svg";

const byRdns = new Map(WALLETS.flatMap((w) => w.rdns.map((r) => [r, w] as const)));

/** The registry entry for an EIP-6963 announcement (by rdns, then by name). */
export function walletFor(id: string, name: string): WalletInfo | undefined {
  const hit = byRdns.get(id);
  if (hit) return hit;
  const n = name.toLowerCase().replace(/[^a-z0-9]/g, "");
  return WALLETS.find((w) => n === w.id || n.startsWith(w.name.toLowerCase().replace(/[^a-z0-9]/g, "")));
}

/** Which wallet injected window.ethereum, for wallets that don't announce themselves. MetaMask last: others copy its flag. */
export function identifyInjected(): WalletInfo | undefined {
  if (typeof window === "undefined") return undefined;
  const w = window as unknown as Win;
  const eth = w.ethereum as Flags | undefined;
  if (!eth) return undefined;
  const others = WALLETS.filter((x) => x.id !== "metamask");
  return others.find((x) => x.detect?.(eth, w)) ?? (eth.isMetaMask ? WALLETS.find((x) => x.id === "metamask") : undefined);
}

// ------------------------------------------------------------------ platform

const ua = () => (typeof navigator === "undefined" ? "" : navigator.userAgent);
export const isAndroid = () => /android/i.test(ua());
export const isIOS = () =>
  /iPhone|iPad|iPod/.test(ua()) || (typeof navigator !== "undefined" && navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
export const isMobile = () => isAndroid() || isIOS();

type BrowserName = "Chrome" | "Edge" | "Firefox" | "Brave" | "Opera" | "Safari" | "your browser";
export function browserName(): BrowserName {
  const u = ua();
  if (typeof navigator !== "undefined" && "brave" in navigator) return "Brave";
  if (/Edg\//.test(u)) return "Edge";
  if (/OPR\//.test(u)) return "Opera";
  if (/Firefox\//.test(u)) return "Firefox";
  if (/Chrome\//.test(u)) return "Chrome";
  if (/Safari\//.test(u)) return "Safari";
  return "your browser";
}

/** The best extension link for this browser (Chromium browsers share the Chrome Web Store). */
export function extensionLink(w: WalletInfo): { href: string; label: string } | undefined {
  const x = w.extension;
  if (!x) return undefined;
  const b = browserName();
  if (b === "Firefox") return x.firefox ? { href: x.firefox, label: "Add to Firefox" } : { href: x.home, label: "Get the extension" };
  if (b === "Edge" && x.edge) return { href: x.edge, label: "Add to Edge" };
  if (b === "Safari") return { href: x.home, label: "Get the extension" };
  if (x.chrome && b !== "your browser") return { href: x.chrome, label: `Add to ${b}` };
  return { href: x.home, label: "Get the extension" };
}

/** App store link for this phone, or the wallet's download page. */
export function appLink(w: WalletInfo): string | undefined {
  if (!w.app) return undefined;
  if (isIOS() && w.app.ios) return w.app.ios;
  if (isAndroid() && w.app.android) return w.app.android;
  return w.app.home;
}
