// Wallet connection: any browser wallet (EIP-6963 discovery: MetaMask, Binance Wallet, OKX, Trust, Rabby…, and
// window.ethereum for in-app browsers), WalletConnect for phone wallets (lib/wallets.ts lists them), and on a local fork only, a dev wallet that signs with an anvil account.
import { createConfig, fallback, http } from "wagmi";
import { bsc, bscTestnet } from "wagmi/chains";
import { injected } from "wagmi/connectors/injected";
import { walletConnect } from "wagmi/connectors/walletConnect";
import { mock } from "wagmi/connectors/mock";
import type { Address, Chain } from "viem";

/** VITE_CHAIN=bsc_testnet builds the app for BSC testnet (chain 97). */
export const isTestnet = import.meta.env.VITE_CHAIN === "bsc_testnet";
const PUBLIC_RPCS = isTestnet
  ? ["https://bsc-testnet-rpc.publicnode.com", "https://data-seed-prebsc-1-s1.bnbchain.org:8545", "https://data-seed-prebsc-2-s1.bnbchain.org:8545"]
  : ["https://bsc-dataseed.bnbchain.org", "https://bsc-rpc.publicnode.com", "https://bsc.meowrpc.com"];
const baseChain: Chain = isTestnet ? bscTestnet : bsc;

const rpc = import.meta.env.VITE_BSC_RPC;
export const isLocalFork = !!rpc && /^https?:\/\/(127\.0\.0\.1|localhost)/.test(rpc);
const devWallet = isLocalFork ? (import.meta.env.VITE_DEV_WALLET as Address | undefined) : undefined;

export const chain: Chain = isLocalFork ? { ...baseChain, rpcUrls: { default: { http: [rpc!] } } } : baseChain;

const wcProjectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;
const origin = typeof location !== "undefined" ? location.origin : "https://qudao.app";

export const wagmiConfig = createConfig({
  chains: [chain],
  connectors: [
    injected({ shimDisconnect: true }),
    ...(wcProjectId
      ? [
          walletConnect({
            projectId: wcProjectId,
            showQrModal: false, // the picker draws its own QR code and opens each wallet's app
            metadata: {
              name: "Qudao",
              description: "Automated PancakeSwap v3 liquidity on BNB Chain",
              url: origin,
              icons: [`${origin}/favicon.svg`],
            },
          }),
        ]
      : []),
    ...(devWallet ? [mock({ accounts: [devWallet], features: { reconnect: true, defaultConnected: true } })] : []),
  ],
  transports: {
    [chain.id]: isLocalFork
      ? http(rpc, { batch: true })
      : fallback([...(rpc ? [rpc] : []), ...PUBLIC_RPCS].map((u) => http(u, { batch: true }))),
  },
  batch: { multicall: true },
});

export const hasWalletConnect = !!wcProjectId;

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
