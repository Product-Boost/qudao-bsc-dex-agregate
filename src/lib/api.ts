// Typed client for the Qudao backend (/api). Shapes mirror server/src/api/server.ts.
import type { Address, Hex } from "viem";

export class ApiError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...init?.headers },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError((body as { error?: string }).error ?? `Request failed (${res.status})`, res.status);
  return body as T;
}
const get = <T>(path: string) => request<T>(path);
const post = <T>(path: string, body: unknown) => request<T>(path, { method: "POST", body: JSON.stringify(body) });
const qs = (o: Record<string, string | number | undefined>) =>
  new URLSearchParams(Object.entries(o).filter(([, v]) => v !== undefined) as [string, string][]).toString();

// ---------------------------------------------------------------- config

export interface Deployment {
  chainId: number;
  block: number;
  factory: Address;
  swapper: Address;
  oracle: Address;
  referrals: Address;
  well: Address;
  revenueRouter: Address;
  buybackBurner: Address;
  safetyFund: Address;
  boostReserve: Address;
  expansionReserve: Address;
  timelock: Address;
  adminSafe: Address;
  teamSafe: Address;
  keeper: Address;
  vaultImplementation: Address;
}

export interface Protocol {
  _status: string;
  fees: { protocolFeeBps: number; maxProtocolFeeBps: number; swapFeeBps: number };
  referrals: { referrerShareBps: number; inviteeDiscountBps: number; inviteeDiscountDays: number; codeLength: number };
  staking: { tierAmounts: string[]; tierDays: number[]; discountBps: number[][]; boostBps: number[][]; rewardStreamDays: number };
  revenue: {
    bnbSplitBps: { well: number; boostReserve: number; buyback: number; safetyFund: number; team: number };
    qdaoSplitBps: { burn: number; expansionReserve: number; boostReserve: number };
  };
  automation: {
    reinvestTiers: { maxPositionUsd: number | null; thresholdBps: number }[];
    minReinvestBps: number;
    reinvestShareMinBps: number;
    slippage: { defaultBps: number; majorsBps: number; minBps: number; maxBps: number };
    minRangeWidthTicks: number;
    minRebalanceIntervalSec: number;
    dynamicRules: { stepBps: number; volatilityDailyMoves: number; averageHours: number; minWidthFactorBps: number; maxWidthFactorBps: number };
    stockMarket: { overrideBps: number };
    keeper: { graceHours: number; maxGasPriceGwei: string; maxRefundBnb: string };
    oracle: { maxDeviationBps: number; twapSeconds: number };
  };
  buyback: {
    curve: { minIntervalSec: number; minAmountBnb: string; maxWaitSec: number };
    dex: { minIntervalSec: number; maxPerBuyBnb: string };
    stabilitySec: number;
    maxBuyTaxBps: number;
  };
  governance: { timelockHours: number };
  markets: { minLiquidityUsd: number; newTokenDays: number; topCount: number };
}

export interface AppConfig {
  chain: { id: number; name: string; explorer: string };
  pancake: Record<"v3Factory" | "positionManager" | "smartRouter" | "masterChefV3" | "quoterV2" | "v2Router", Address>;
  permit2: Address;
  wbnb: Address;
  cake: Address;
  tokens: { symbol: string; token: Address; feed: Address; stable: boolean }[];
  protocol: Protocol;
  deployment: Deployment | null;
  push: { enabled: boolean; vapidPublicKey: string | null };
}

// ---------------------------------------------------------------- market data

export interface TokenRef {
  address: Address;
  symbol: string;
  name: string;
  image: string | null;
  priceUsd: number;
}

export type MarketTab = "top" | "new" | "trending" | "gainers" | "stocks";
export interface MarketRow {
  address: Address;
  symbol: string;
  name: string;
  image: string | null;
  priceUsd: number;
  change24h: number;
  volume24h: number;
  liquidity: number;
  firstPoolAt: number;
  stock: boolean;
}

export interface PoolOverview {
  address: Address;
  dex: string;
  version: "v2" | "v3";
  feePct: number;
  token0: TokenRef;
  token1: TokenRef;
  liquidityUsd: number;
  volume24hUsd: number;
  change24h: number;
  createdAt: number;
  group: "popular" | "stocks" | "memecoins";
  aprPct: number;
  estAprPct: number | null;
  estApyPct: number | null;
  estimating: boolean;
  farm: boolean;
  qudaoTvlUsd: number;
  qudaoPositions: number;
}

export interface PairPool {
  fee: number;
  exists: boolean;
  address?: Address;
  tick?: number;
  sqrtPriceX96?: string;
  tickSpacing?: number;
  liquidity?: string;
  liquidityUsd?: number;
  volume24hUsd?: number;
  aprPct?: number;
  farm?: boolean;
}

export type Verdict = "ok" | "warn" | "refuse" | "not-found";
export interface TokenCheck {
  address: Address;
  verdict: Verdict;
  reasons: string[];
  symbol?: string;
  name?: string;
  decimals?: number;
  liquidityUsd?: number;
}

export interface History {
  start: number;
  prices: number[];
  volumes: number[];
}

export interface LiquidityBar {
  tickLower: number;
  tickUpper: number;
  priceLower: number;
  priceUpper: number;
  liquidity: string;
}

export type StrategyName = "static" | "narrowOnRise" | "widenWhenVolatile" | "followAverage";

export interface BacktestResult {
  hours: number;
  feesUsd: number;
  moves: number;
  timeInRangePct: number;
  costsUsd: number;
  netUsd: number;
  aprPct: number;
  path: { t: number; price: number; lower: number; upper: number }[];
}

// ---------------------------------------------------------------- swaps and plans

export interface SwapQuote {
  amountIn: string;
  amountOut: string;
  minOut: string;
  priceImpactBps: number;
  route: string[];
  router: Address;
  data: Hex;
  gasEstimate: string;
  swapper: Address;
  feeBps: number;
  tokenIn: Address;
  tokenOut: Address;
}

export interface SwapStep {
  tokenIn: Address;
  tokenOut: Address;
  amountIn: string;
  router: Address;
  data: Hex;
}

export interface DepositPlan {
  swap: (SwapQuote & { tokenIn: Address }) | null;
  amount0: string;
  amount1: string;
}

// ---------------------------------------------------------------- positions

export interface Position {
  address: Address;
  owner: Address;
  pool: Address;
  token0: Address;
  token1: Address;
  decimals0: number;
  decimals1: number;
  symbol0: string;
  symbol1: string;
  fee: number;
  tickSpacing: number;
  tokenId: string;
  staked: boolean;
  closed: boolean;
  settings: { strategy: StrategyName; waitForMarket: boolean; autoCompound: boolean; reinvestBps: number; slippageBps: number };
  lowerOffset: number;
  upperOffset: number;
  initialWidth: number;
  openedAt: number;
  lastRebalance: number;
  tickLower: number;
  tickUpper: number;
  liquidity: string;
  tick: number;
  sqrtPriceX96: string;
  inRange: boolean;
  principal0: string;
  principal1: string;
  idle0: string;
  idle1: string;
  idleCake: string;
  claimable0: string;
  claimable1: string;
  claimableCake: string;
  uncollected0: string;
  uncollected1: string;
  pendingCake: string;
  price0Usd: number;
  price1Usd: number;
  cakeUsd: number;
  valueUsd: number;
  feesUsd: number;
  depositedUsd?: number;
  takenOutUsd?: number;
  pnlUsd?: number;
  feesEarnedUsd?: number;
  aprPct?: number;
}

export interface ChainEvent {
  block: string;
  tx: Hex;
  name: string;
  args: Record<string, unknown>;
  ts: string;
}

// ---------------------------------------------------------------- protocol, staking, referrals

export interface ProtocolStats {
  deployed: boolean;
  managed?: { tvlUsd: number; users: number; positions: number; moves30d: number };
  revenueByWeekBnb?: Record<string, { fee: number; swap: number; launchpad: number }>;
  burns?: { tx: Hex; ts: string; args: Record<string, string> }[];
  payments?: { tx: Hex; ts: string; address: Address; args: Record<string, string> }[];
  balances?: Record<"revenueRouter" | "well" | "boostReserve" | "safetyFund" | "expansionReserve" | "teamSafe" | "buybackBurner", string>;
  token?: { address: Address; supply: string; burned: string; priceUsd: number | null; marketCapUsd: number | null } | null;
  contracts?: Deployment;
}

export interface WellInfo {
  deployed: boolean;
  weeklyRewardsBnb?: { week: string; bnb: number }[];
  token?: Address;
  qdaoUsd?: number;
  bnbUsd?: number;
  totalStaked?: string;
  totalWeight?: string;
  stakedUsd?: number;
  streaming?: boolean;
  streamEndsAt?: number;
  rewardBnbPerDay?: number;
  totalRewardsBnb?: number;
  totalClaimedBnb?: number;
  aprPct: number;
  tiers?: { amounts: string[]; days: number[]; discountBps: number[][]; boostBps: number[][] };
  account?: {
    staked: string;
    stakedUsd: number;
    since: number;
    daysStaked: number;
    weight: string;
    earnedBnb: string;
    hasTier: boolean;
    amountTier: number;
    timeTier: number;
    discountBps: number;
    boostBps: number;
    rewardBnbPerDay: number;
    aprPct: number;
  };
}

export interface ReferralInfo {
  code: string | null;
  invited: { user: Address; joined: string; earnedBnb: number }[];
  earnedBnb: number;
  claimableBnb: string;
  feeTokens: Address[];
}

export type AlertKind = "outOfRange" | "rangeMoved" | "feesReady" | "referral" | "weekly";
export interface AlertPrefs {
  outOfRange: boolean;
  rangeMoved: boolean;
  feesReady: boolean;
  feesMinUsd: number;
  referral: boolean;
  weekly: boolean;
}

// ---------------------------------------------------------------- calls

export const api = {
  config: () => get<AppConfig>("/config"),
  markets: (tab: MarketTab) => get<{ tab: MarketTab; rows: MarketRow[]; updatedAt: number }>(`/markets?tab=${tab}`),
  pools: () => get<{ pools: PoolOverview[]; updatedAt: number; estimating: boolean }>("/pools"),
  pair: (a: Address, b: Address) => get<{ token0: Address; token1: Address; pools: PairPool[] }>(`/pools/pair?${qs({ a, b })}`),
  searchTokens: (q: string) => get<{ tokens: TokenRef[]; check?: TokenCheck }>(`/tokens?${qs({ q })}`),
  tokenCheck: (address: Address) => get<TokenCheck>(`/token-check?${qs({ address })}`),
  tokenImages: (list: Address[]) => get<{ images: Record<string, string | null> }>(`/token-images?${qs({ a: list.join(",") })}`),
  prices: (list: Address[]) => get<{ prices: Record<string, number | null> }>(`/prices?${qs({ a: list.join(",") })}`),
  history: (pool: Address, usd?: "base" | "quote") => get<{ history: History }>(`/history?${qs({ pool, usd })}`),
  liquidity: (pool: Address) => get<{ tick: number; tickSpacing: number; bars: LiquidityBar[] }>(`/liquidity?${qs({ pool })}`),
  backtest: (b: { pool: Address; lowerPct: number; upperPct: number; rule: StrategyName; reinvestPct: number; depositUsd: number }) =>
    post<{ result: BacktestResult | null }>("/backtest", b),
  swapQuote: (b: { tokenIn: Address; tokenOut: Address; amountIn: string; slippageBps: number }) => post<SwapQuote>("/swap/quote", b),
  planDeposit: (b: { pool: Address; tickLower: number; tickUpper: number; tokenIn: Address; amountIn: string }) => post<DepositPlan>("/plan/deposit", b),
  planVault: (action: "rebalance" | "reinvest" | "compound" | "claim-bnb", vault: Address) =>
    post<{ steps: SwapStep[]; lower?: number; upper?: number } | null>(`/plan/${action}`, { vault }),
  positions: (owner: Address) => get<{ positions: Position[] }>(`/positions?${qs({ owner })}`),
  positionHistory: (vault: Address) => get<{ events: ChainEvent[] }>(`/positions/${vault}/history`),
  protocol: () => get<ProtocolStats>("/protocol"),
  well: (wallet?: Address) => get<WellInfo>(`/well?${qs({ wallet })}`),
  referrals: (wallet: Address) => get<ReferralInfo>(`/referrals?${qs({ wallet })}`),
  alertMessage: (owner: Address) => get<{ message: string; issuedAt: number }>(`/alerts/message?${qs({ owner })}`),
  alertSubscribe: (b: { owner: Address; issuedAt: number; signature: Hex; subscription: PushSubscriptionJSON; prefs?: Partial<AlertPrefs> }) =>
    post<{ prefs: AlertPrefs }>("/alerts/subscribe", b),
  alertPrefs: (endpoint: string, prefs: Partial<AlertPrefs>) => post<{ prefs: AlertPrefs }>("/alerts/prefs", { endpoint, prefs }),
  alertGet: (endpoint: string) => post<{ owner: Address; prefs: AlertPrefs } | null>("/alerts/get", { endpoint }),
  alertUnsubscribe: (endpoint: string) => post<{ ok: true }>("/alerts/unsubscribe", { endpoint }),
  alertTest: (endpoint: string) => post<{ ok: boolean }>("/alerts/test", { endpoint }),
};
