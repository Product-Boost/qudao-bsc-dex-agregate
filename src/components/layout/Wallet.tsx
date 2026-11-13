// Connect button, the wallet menu once connected, and the provider that opens the wallet picker.
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useBalance, useConnection, useDisconnect, useSwitchChain } from "wagmi";
import { Check, ChevronDown, Copy, ExternalLink, LogOut, TriangleAlert, Wallet as WalletIcon } from "lucide-react";
import { Button } from "../ui";
import { amount, short } from "../../lib/format";
import { chain, isLocalFork } from "../../lib/wagmi";
import { useAppConfig } from "../../lib/config";
import { useOpenWallet, WalletModalCtx } from "../../lib/walletModal";
import { identifyInjected, walletFor } from "../../lib/wallets";
import { WalletModal } from "./WalletModal";

export function WalletProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <WalletModalCtx.Provider value={() => setOpen(true)}>
      {children}
      <WalletModal open={open} onClose={() => setOpen(false)} />
    </WalletModalCtx.Provider>
  );
}

export function ConnectButton({ size = "md", className = "" }: { size?: "sm" | "md" | "lg"; className?: string }) {
  const open = useOpenWallet();
  return (
    <Button size={size} className={className} onClick={open}>
      <WalletIcon className="size-4" /> Connect wallet
    </Button>
  );
}

export function WalletButton() {
  const { address, chainId, isConnected, connector } = useConnection();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: switching } = useSwitchChain();
  const { data: bal } = useBalance({ address, query: { enabled: !!address, refetchInterval: 20_000 } });
  const { chain: c } = useAppConfig();
  const [menu, setMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menu) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setMenu(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menu]);

  if (!isConnected || !address) return <ConnectButton size="sm" />;
  const info = connector?.id === "injected" ? identifyInjected() : connector ? walletFor(connector.id, connector.name) : undefined;
  const label = connector?.type === "mock" ? "Dev wallet" : connector?.id === "injected" ? (info?.name ?? "Browser wallet") : connector?.name;
  const icon = connector?.icon ?? info?.icon;
  if (chainId !== chain.id)
    return (
      <Button size="sm" variant="danger" busy={switching} onClick={() => switchChain({ chainId: chain.id })}>
        <TriangleAlert className="size-4" /> Switch to {chain.id === 97 ? "BSC testnet" : "BNB Chain"}
      </Button>
    );
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setMenu((m) => !m)} className="flex h-9 items-center gap-2 rounded-xl border border-line-2 bg-panel px-3 text-sm whitespace-nowrap hover:border-gold/50">
        <span className="num hidden text-fg-2 sm:inline">{bal ? `${amount(bal.value, 18, 3)} BNB` : ""}</span>
        <span className="size-2 rounded-full bg-up" />
        <span className="font-mono text-xs">{short(address)}</span>
        <ChevronDown className="size-4 text-mute" />
      </button>
      {menu && (
        <div className="animate-rise absolute right-0 z-50 mt-2 w-64 rounded-2xl border border-line-2 bg-panel-2 p-2 shadow-2xl">
          <div className="px-3 py-2">
            <div className="flex items-center gap-2 text-xs text-mute">
              {icon && <img src={icon} alt="" className="size-4 rounded" />}
              Connected with {label}
            </div>
            <div className="mt-1 font-mono text-sm">{short(address, 6)}</div>
            {isLocalFork && <div className="mt-1 text-xs text-warn">Local BSC fork</div>}
          </div>
          <MenuButton
            onClick={() => {
              navigator.clipboard.writeText(address);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
          >
            {copied ? <Check className="size-4 text-up" /> : <Copy className="size-4" />} Copy address
          </MenuButton>
          <a href={`${c.explorer}/address/${address}`} target="_blank" rel="noreferrer" className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-fg-2 hover:bg-panel-3 hover:text-fg">
            <ExternalLink className="size-4" /> View on BscScan
          </a>
          <MenuButton
            onClick={() => {
              disconnect();
              setMenu(false);
            }}
          >
            <LogOut className="size-4" /> Disconnect
          </MenuButton>
        </div>
      )}
    </div>
  );
}

const MenuButton = ({ children, onClick }: { children: ReactNode; onClick: () => void }) => (
  <button onClick={onClick} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-fg-2 hover:bg-panel-3 hover:text-fg">
    {children}
  </button>
);
