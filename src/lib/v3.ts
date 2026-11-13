// PancakeSwap v3 price math for the interface (floating point: display and planning only; the contracts
// check every amount on-chain).

export const MIN_TICK = -887272;
export const MAX_TICK = 887272;
const LN = Math.log(1.0001);

/** Raw price (token1 base units per token0 base unit) at a tick. */
export const tickToRaw = (tick: number) => Math.pow(1.0001, tick);
export const rawToTick = (raw: number) => Math.log(raw) / LN;

/** Price of one whole token0 in whole token1 at `tick`. */
export const tickToPrice = (tick: number, d0: number, d1: number) => tickToRaw(tick) * 10 ** (d0 - d1);
export const priceToTick = (price: number, d0: number, d1: number) => rawToTick(price * 10 ** (d1 - d0));

export const floorTick = (t: number, s: number) => Math.floor(t / s) * s;
export const nearestTick = (t: number, s: number) => {
  const r = Math.round(t / s) * s;
  return Math.max(Math.ceil(MIN_TICK / s) * s, Math.min(Math.floor(MAX_TICK / s) * s, r));
};

export const tickSpacingFor = (fee: number) => ({ 100: 1, 500: 10, 2500: 50, 10000: 200 })[fee] ?? 50;

/** A range of ±pct around `tick`, snapped to the pool's spacing (and at least one spacing wide). */
export function rangeAround(tick: number, lowerPct: number, upperPct: number, spacing: number) {
  let lower = nearestTick(tick + Math.log(1 + lowerPct / 100) / LN, spacing);
  let upper = nearestTick(tick + Math.log(1 + upperPct / 100) / LN, spacing);
  if (lower >= tick) lower = floorTick(tick, spacing);
  if (upper <= tick) upper = floorTick(tick, spacing) + spacing;
  if (upper <= lower) upper = lower + spacing;
  return { lower, upper };
}

/** How far a tick is from the current tick, in percent of price. */
export const tickToPct = (t: number, current: number) => (Math.pow(1.0001, t - current) - 1) * 100;

/** Raw token amounts held by liquidity `L` (as a float) in [lower, upper) at `tick`. */
export function amountsFor(L: number, tick: number, lower: number, upper: number): [number, number] {
  const sp = Math.sqrt(tickToRaw(tick));
  const sa = Math.sqrt(tickToRaw(lower));
  const sb = Math.sqrt(tickToRaw(upper));
  if (tick < lower) return [L * (1 / sa - 1 / sb), 0];
  if (tick >= upper) return [0, L * (sb - sa)];
  return [L * (1 / sp - 1 / sb), L * (sp - sa)];
}

/** Given one side's raw amount, the other side's raw amount the range needs at `tick` (null: one-sided range). */
export function otherAmount(side: 0 | 1, raw: number, tick: number, lower: number, upper: number): number | null {
  if (tick < lower) return side === 0 ? 0 : null; // only token0 fits
  if (tick >= upper) return side === 1 ? 0 : null; // only token1 fits
  const [u0, u1] = amountsFor(1, tick, lower, upper);
  return side === 0 ? (raw / u0) * u1 : (raw / u1) * u0;
}

/** sqrtPriceX96 for a new pool from the human price of token0 in token1. */
export function sqrtPriceX96(price: number, d0: number, d1: number): bigint {
  const raw = price * 10 ** (d1 - d0);
  // a float keeps 53 bits of mantissa at any exponent, so this stays precise for tiny and huge prices
  return BigInt(Math.round(Math.sqrt(raw) * 2 ** 96));
}

/** Capital efficiency of a range versus full range (same formula the pool page uses). */
export const efficiency = (lowerOverUpper: number) => Math.min(1 / (1 - Math.pow(lowerOverUpper, 0.25)), 400);

// ---------------------------------------------------------------- which way round to show a price

const QUOTE_RANK: Record<string, number> = { USDT: 100, USDC: 99, FDUSD: 98, BUSD: 97, USD1: 96, DAI: 95, WBNB: 80, BNB: 80, BTCB: 60, ETH: 55, CAKE: 40 };
const rank = (symbol: string) => QUOTE_RANK[symbol.toUpperCase()] ?? 0;

/**
 * Whether to show the pool's price inverted. Prices read best as "1 base = x quote" with the more
 * "money-like" token as quote: stablecoins, then BNB, then BTC/ETH, then CAKE.
 */
export const invertFor = (symbol0: string, symbol1: string) => rank(symbol0) > rank(symbol1);

export interface PairView {
  base: string;
  quote: string;
  inverted: boolean;
  /** Price of 1 base in quote at a tick. */
  at: (tick: number) => number;
  /** Tick for a price of 1 base in quote. */
  tickOf: (price: number) => number;
}

export function pairView(symbol0: string, symbol1: string, d0: number, d1: number, invert = invertFor(symbol0, symbol1)): PairView {
  return invert
    ? { base: symbol1, quote: symbol0, inverted: true, at: (t) => 1 / tickToPrice(t, d0, d1), tickOf: (p) => priceToTick(1 / p, d0, d1) }
    : { base: symbol0, quote: symbol1, inverted: false, at: (t) => tickToPrice(t, d0, d1), tickOf: (p) => priceToTick(p, d0, d1) };
}

/** Range bounds as displayed prices, low to high (an inverted view swaps which tick is the low price). */
export function rangePrices(v: PairView, lower: number, upper: number): [number, number] {
  const a = v.at(lower);
  const b = v.at(upper);
  return a < b ? [a, b] : [b, a];
}
