import type { StrategyName } from "../lib/api";

/** Range rules, in the order of the contract's Strategy enum. */
export const STRATEGIES: { value: StrategyName; label: string; short: string; body: string }[] = [
  {
    value: "static",
    label: "Same range",
    short: "Static",
    body: "When the price leaves your range, it's re-centred on the new price with the same distances above and below.",
  },
  {
    value: "narrowOnRise",
    label: "Narrow as the price rises",
    short: "Narrow on rise",
    body: "Each move up narrows the range by 15% to earn more on the way up; each move down widens it by 15%. Always between half and twice the starting width.",
  },
  {
    value: "widenWhenVolatile",
    label: "Widen when volatile",
    short: "Widen when volatile",
    body: "The width follows the last day's volatility (about two daily moves), so choppy markets mean fewer moves. Between half and twice the starting width.",
  },
  {
    value: "followAverage",
    label: "Follow the 24h average",
    short: "Follow average",
    body: "The range centres on the 24-hour average price, shifted just enough to include the current price. Good for prices that swing back and forth.",
  },
];

export const strategyIndex = (s: StrategyName) => STRATEGIES.findIndex((x) => x.value === s);
export const strategyOf = (s: StrategyName) => STRATEGIES.find((x) => x.value === s) ?? STRATEGIES[0];
