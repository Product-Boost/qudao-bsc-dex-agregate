/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BSC_RPC?: string;
  readonly VITE_WALLETCONNECT_PROJECT_ID?: string;
  readonly VITE_DEV_WALLET?: string;
  readonly VITE_CHAIN?: "bsc" | "bsc_testnet";
  readonly VITE_API_URL?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
