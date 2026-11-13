// Token metadata, images and wallet balances.
import { useQuery } from "@tanstack/react-query";
import { useBalance, useConnection, useReadContracts } from "wagmi";
import { erc20Abi, getAddress, isAddress, zeroAddress, type Address } from "viem";
import { api } from "../lib/api";
import { useAppConfig } from "../lib/config";

export const NATIVE = zeroAddress;

export interface Token {
  address: Address; // zeroAddress = native BNB
  symbol: string;
  name: string;
  decimals: number;
  image?: string | null;
}

export const BNB: Token = { address: NATIVE, symbol: "BNB", name: "BNB", decimals: 18, image: "/icons/tokens/bnb.png" };

const LOCAL_IMAGES: Record<string, string> = {
  BNB: "/icons/tokens/bnb.png",
  WBNB: "/icons/tokens/wbnb.png",
  USDT: "/icons/tokens/usdt.png",
  USDC: "/icons/tokens/usdc.png",
  CAKE: "/icons/tokens/cake.png",
  BTCB: "/icons/tokens/btcb.png",
  ETH: "/icons/tokens/eth.png",
};
export const localImage = (symbol?: string) => (symbol ? LOCAL_IMAGES[symbol.toUpperCase()] : undefined);

const NAMES: Record<string, string> = { WBNB: "Wrapped BNB", USDT: "Tether USD", USDC: "USD Coin", CAKE: "PancakeSwap", BTCB: "Bitcoin BEP2", ETH: "Ethereum" };

/** The tokens Qudao knows well (Chainlink feeds), plus native BNB first. */
export function useBaseTokens(): Token[] {
  const { tokens } = useAppConfig();
  return [BNB, ...tokens.map((t) => ({ address: getAddress(t.token), symbol: t.symbol, name: NAMES[t.symbol] ?? t.symbol, decimals: 18, image: localImage(t.symbol) }))];
}

/** On-chain symbol, name and decimals for any ERC-20. */
export function useTokenMeta(address?: Address | null) {
  const valid = !!address && isAddress(address) && address !== NATIVE;
  const { data, isLoading } = useReadContracts({
    contracts: valid
      ? [
          { address: address!, abi: erc20Abi, functionName: "symbol" },
          { address: address!, abi: erc20Abi, functionName: "name" },
          { address: address!, abi: erc20Abi, functionName: "decimals" },
        ]
      : [],
    query: { enabled: valid, staleTime: Infinity },
  });
  if (address === NATIVE) return { token: BNB, isLoading: false };
  if (!valid || !data || data.some((d) => d.status !== "success")) return { token: null, isLoading };
  const [symbol, name, decimals] = data.map((d) => d.result) as [string, string, number];
  return { token: { address: getAddress(address!), symbol, name, decimals: Number(decimals), image: localImage(symbol) } as Token, isLoading };
}

/** Images for many tokens at once (DexScreener via the backend), keyed by lower-case address. */
export function useTokenImages(addresses: (Address | undefined)[]) {
  const list = [...new Set(addresses.filter((a): a is Address => !!a && a !== NATIVE).map((a) => a.toLowerCase()))].sort() as Address[];
  const { data } = useQuery({
    queryKey: ["token-images", list.join(",")],
    queryFn: () => api.tokenImages(list),
    enabled: list.length > 0,
    staleTime: 60 * 60_000,
  });
  return data?.images ?? {};
}

/** Wallet balance of a token (native BNB when address is zero). */
export function useTokenBalance(token?: Token | null) {
  const { address } = useConnection();
  const native = useBalance({ address, query: { enabled: !!address && token?.address === NATIVE, refetchInterval: 15_000 } });
  const erc = useReadContracts({
    contracts:
      address && token && token.address !== NATIVE ? [{ address: token.address, abi: erc20Abi, functionName: "balanceOf", args: [address] }] : [],
    query: { enabled: !!address && !!token && token.address !== NATIVE, refetchInterval: 15_000 },
  });
  if (!token || !address) return undefined;
  if (token.address === NATIVE) return native.data?.value;
  const r = erc.data?.[0];
  return r?.status === "success" ? (r.result as bigint) : undefined;
}

/** A picked token with its real decimals (search results arrive with decimals = -1 until read on-chain). */
export function useResolvedToken(t: Token | null): Token | null {
  const { token } = useTokenMeta(t && t.decimals < 0 ? t.address : null);
  if (!t) return null;
  if (t.decimals >= 0) return t;
  return token ? { ...token, image: t.image ?? token.image } : null;
}

/** USD prices (Chainlink where available, else DEX), keyed by lower-case address; native BNB = WBNB. */
export function usePrices(addresses: (Address | undefined | null)[]) {
  const list = [...new Set(addresses.filter((a): a is Address => !!a).map((a) => a.toLowerCase()))].sort() as Address[];
  const { data } = useQuery({
    queryKey: ["prices", list.join(",")],
    queryFn: () => api.prices(list),
    enabled: list.length > 0,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
  return (a?: Address | null) => (a ? (data?.prices[a.toLowerCase()] ?? null) : null);
}
