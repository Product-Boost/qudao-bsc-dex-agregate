// The Qudao whitepaper. Numbers come from the protocol config, so the text always matches the contracts.
// Strings are looked up at call time, so the page must rebuild this when the language changes.
import type { Protocol } from "../lib/api";
import { t } from "../i18n";

export type Block = { p: string } | { ul: string[] } | { contracts: true };
export interface Section {
  id: string;
  title: string;
  level: 1 | 2;
  blocks: Block[];
}

const b = (n: number) => `${(n / 100).toLocaleString("en-US", { maximumFractionDigits: 2 })}%`;
const x = (n: number) => `${(n / 10_000).toFixed(2)}×`;
const k = (s: string) => Number(s).toLocaleString("en-US");

export function whitepaper(p: Protocol): Section[] {
  const s = p.staking;
  const r = p.revenue.bnbSplitBps;
  const q = p.revenue.qdaoSplitBps;
  const a = p.automation;
  const tiers = a.reinvestTiers
    .map((tier) =>
      t("{threshold} of the position{band}", {
        threshold: b(tier.thresholdBps),
        band: tier.maxPositionUsd ? t(" below ${amount}", { amount: tier.maxPositionUsd }) : t(" above that"),
      }),
    )
    .join(t(", "));
  const amounts = s.tierAmounts.map(k).join(" / ");
  const days = s.tierDays.map((d) => (d === 0 ? t("from day one") : t("{n} months", { n: Math.round(d / 30) }))).join(" / ");
  return [
    {
      id: "summary",
      title: t("Summary"),
      level: 1,
      blocks: [
        {
          p: t(
            "Qudao manages PancakeSwap v3 liquidity on BNB Chain. You choose a pool, a price range and a rule; Qudao keeps the range around the price, reinvests the fees you earn and farms CAKE where the pool has a farm. Every position is its own vault contract owned by your wallet.",
          ),
        },
        {
          p: t(
            "Qudao earns a share of what positions earn ({fee} today, never more than {cap}) and a {swap} fee on in-app swaps. That revenue goes to QDAO stakers, to buying back and burning QDAO, and to reserves that protect and grow the protocol.",
            { fee: b(p.fees.protocolFeeBps), cap: b(p.fees.maxProtocolFeeBps), swap: b(p.fees.swapFeeBps) },
          ),
        },
      ],
    },
    {
      id: "problem",
      title: t("The problem"),
      level: 1,
      blocks: [
        {
          p: t(
            "A PancakeSwap v3 position only earns while the price is inside its range. A narrow range earns many times more per dollar than a wide one, but the price leaves it often. Then the position stops earning until someone moves it: withdraw, swap to the right ratio, deposit again, and stake it back in the farm.",
          ),
        },
        {
          p: t(
            "Doing that by hand means watching charts, paying for every step and usually reacting late. Most people pick a wide range and earn little, or a narrow one and earn nothing while it sits out of range.",
          ),
        },
      ],
    },
    {
      id: "products",
      title: t("Products"),
      level: 1,
      blocks: [{ p: t("Qudao is one app with a few parts that work together.") }],
    },
    {
      id: "liquidity",
      title: t("Liquidity"),
      level: 2,
      blocks: [
        {
          p: t(
            "Every PancakeSwap v3 pool on BNB Chain with at least ${min} of liquidity, grouped as popular pairs, Stock Token pairs and memecoins. Each shows its fee APR, an estimate for a narrow managed range (from the last week of the pool's own trading, after time out of range and Qudao's fee), whether it has a CAKE farm, and how much Qudao users hold in it.",
            { min: k(String(p.markets.minLiquidityUsd)) },
          ),
        },
        {
          p: t(
            "Opening a position: pick any pair (or paste a token address), a fee tier, a range and a rule. If the pool doesn't exist, set a starting price and it's created in the same transaction. Deposit both tokens, or one: the app swaps part of it first. Tokens that take a fee on transfer are refused; tokens with risks such as blocked selling or thin liquidity are flagged before you deposit.",
          ),
        },
      ],
    },
    {
      id: "markets",
      title: t("Markets and swap"),
      level: 2,
      blocks: [
        {
          p: t(
            "Five lists from live PancakeSwap data: the {top} most traded tokens, new tokens (first pool in the last {days} days), trending, the day's biggest gainers, and Stock Tokens. Any token can be swapped in the app over PancakeSwap's best route (its Smart Router). Before your wallet opens, the app checks the swap goes through PancakeSwap's official router and Qudao's swap contract. In-app swaps carry a {fee} fee.",
            { top: p.markets.topCount, days: p.markets.newTokenDays, fee: b(p.fees.swapFeeBps) },
          ),
        },
      ],
    },
    {
      id: "stock-tokens",
      title: t("Stock Tokens"),
      level: 2,
      blocks: [
        {
          p: t(
            "Tokenized shares and ETFs (for example NVDA, TSLA or SPY) trade on PancakeSwap and follow a price that only moves while the US market is open. A position with a Stock Token can wait for the market to open before moving its range, so it doesn't chase thin overnight trading, unless the price moves more than {bps}.",
            { bps: b(a.stockMarket.overrideBps) },
          ),
        },
      ],
    },
    {
      id: "dashboard",
      title: t("Dashboard"),
      level: 2,
      blocks: [
        {
          p: t(
            "Every position with its value, fees ready to claim, APR, where the price sits in the range, and profit or loss measured against the prices when you deposited. Each position has its full history (opened, range moved, fees reinvested or claimed, settings changed, funds added or taken out) and its settings. Claim per position, claim everything as BNB in one transaction, or compound now.",
          ),
        },
      ],
    },
    {
      id: "last-30-days",
      title: t("Last 30 days"),
      level: 2,
      blocks: [
        {
          p: t(
            "Before you deposit, the app replays the pool's last 30 days hour by hour with your range and rule: the fees you would have earned, how often the range would have moved, the time in range and the cost of each move. It's a guide, not a promise.",
          ),
        },
      ],
    },
    {
      id: "the-well",
      title: t("The Well (staking)"),
      level: 2,
      blocks: [{ p: t("Stake QDAO to earn part of Qudao's revenue in BNB and pay a lower fee on your positions. See The token below.") }],
    },
    {
      id: "strategies",
      title: t("Range strategies"),
      level: 1,
      blocks: [
        { p: t("Each position has a rule for what happens when the price leaves its range:") },
        {
          ul: [
            t("Same range: re-centred on the new price with the same distances above and below."),
            t("Narrow as the price rises: each move up makes the range {step} narrower, each move down {step} wider.", { step: b(a.dynamicRules.stepBps) }),
            t("Widen when volatile: the width follows the last day's volatility (about {n} daily moves).", { n: a.dynamicRules.volatilityDailyMoves }),
            t("Follow the {hours}h average: the range centres on the average price, shifted just enough to include the current price.", { hours: a.dynamicRules.averageHours }),
          ],
        },
        {
          p: t(
            "Dynamic rules always stay between {min} and {max} the width you started with; the vault enforces this. A range is at least {ticks} ticks wide, and moves are at least {minutes} minutes apart.",
            {
              min: x(a.dynamicRules.minWidthFactorBps),
              max: x(a.dynamicRules.maxWidthFactorBps),
              ticks: a.minRangeWidthTicks,
              minutes: Math.round(a.minRebalanceIntervalSec / 60),
            },
          ),
        },
        {
          p: t("Fees are reinvested once they're worth enough to be worth the cost: {tiers}. You choose what share is reinvested ({min} to 100%); the rest stays ready to claim.", {
            tiers,
            min: b(a.reinvestShareMinBps),
          }),
        },
      ],
    },
    {
      id: "leverage",
      title: t("Leveraged liquidity (later)"),
      level: 1,
      blocks: [
        {
          p: t(
            "A later phase adds a lending market that accepts Qudao positions as collateral, so a range can be opened with more than you deposit. It will ship separately with its own audit.",
          ),
        },
      ],
    },
    {
      id: "custody",
      title: t("How your funds are held"),
      level: 1,
      blocks: [
        {
          ul: [
            t("Each position is a separate vault contract owned by your wallet. Funds are never pooled with other users."),
            t("Only you can withdraw, close or change settings. Closing and withdrawing work even while Qudao is paused."),
            t("The automation (the keeper) can only move the range, collect and reinvest. If it stops for more than {hours} hours, anyone can trigger a due move.", {
              hours: a.keeper.graceHours,
            }),
            t(
              "Before every move or reinvest the vault checks the pool's price against Chainlink, or else the pool's own {minutes}-minute average, and refuses if it's more than {bps} away. Stale prices are refused.",
              { minutes: Math.round(a.oracle.twapSeconds / 60), bps: b(a.oracle.maxDeviationBps) },
            ),
            t("Swaps inside a position can't be worse than its price tolerance ({min} to {max}; {fallback} by default, {majors} for major pairs).", {
              min: b(a.slippage.minBps),
              max: b(a.slippage.maxBps),
              fallback: b(a.slippage.defaultBps),
              majors: b(a.slippage.majorsBps),
            }),
            t("Swaps go through PancakeSwap's routers only, via Qudao's swap contract, which holds nothing between transactions."),
            t("Deposits use exact amounts: a Permit2 signature valid for 30 minutes, or exact approvals sent together with the deposit on wallets that batch calls."),
          ],
        },
      ],
    },
    {
      id: "fees",
      title: t("Fees and costs"),
      level: 1,
      blocks: [
        {
          ul: [
            t("Qudao fee: {fee} of the fees and CAKE a position earns. Never taken from your deposit. The contracts refuse anything above {cap}.", {
              fee: b(p.fees.protocolFeeBps),
              cap: b(p.fees.maxProtocolFeeBps),
            }),
            t("In-app swaps: {fee} of the amount received.", { fee: b(p.fees.swapFeeBps) }),
            t("Automation gas: each move or reinvest refunds the keeper's actual gas from the position, capped at {gwei} gwei and {bnb} BNB per action.", {
              gwei: a.keeper.maxGasPriceGwei,
              bnb: a.keeper.maxRefundBnb,
            }),
            t("PancakeSwap's own swap fees apply to any swap, as they would anywhere."),
          ],
        },
      ],
    },
    {
      id: "token",
      title: t("The token"),
      level: 1,
      blocks: [
        {
          p: t("QDAO launches on flap.sh, BNB Chain's launchpad, with a fixed supply of one billion. It trades on a bonding curve until it graduates to PancakeSwap."),
        },
      ],
    },
    {
      id: "staking",
      title: t("Staking without a lock"),
      level: 2,
      blocks: [
        {
          p: t(
            "Stake QDAO in The Well and unstake whenever you like. Your tier depends on how much you stake ({amounts} QDAO) and for how long ({days}). Higher tiers pay less Qudao fee, from {off0} to {off1} off, and earn more rewards, from {boost0} to {boost1}.",
            {
              amounts,
              days,
              off0: b(s.discountBps[0][0]),
              off1: b(s.discountBps[3][3]),
              boost0: x(s.boostBps[0][0]),
              boost1: x(s.boostBps[3][3]),
            },
          ),
        },
        {
          p: t(
            "Adding to your stake shortens your time staked in proportion, so a large top-up can't jump straight to the top tier. Unstaking part keeps your time staked; unstaking everything resets it.",
          ),
        },
      ],
    },
    {
      id: "rewards",
      title: t("Staking rewards"),
      level: 2,
      blocks: [
        {
          p: t(
            "Stakers receive {share} of Qudao's BNB revenue. Each payment streams over {days} days, every second, shared by stake × boost. If nobody is staked the stream pauses rather than being lost. No one, including Qudao's admin, can take BNB out of The Well except stakers claiming their rewards.",
            { share: b(r.well), days: s.rewardStreamDays },
          ),
        },
      ],
    },
    {
      id: "buyback",
      title: t("Buyback and burn"),
      level: 2,
      blocks: [
        {
          p: t(
            "{share} of the BNB revenue buys QDAO and sends it to the burn address. Before graduation it buys on the flap.sh bonding curve (at most every {curveHours} hour, once at least {curveMin} BNB has built up); after graduation on PancakeSwap (at most {dexMax} BNB every {dexHours} hours). It switches over automatically.",
            {
              share: b(r.buyback),
              curveHours: Math.round(p.buyback.curve.minIntervalSec / 3600),
              curveMin: p.buyback.curve.minAmountBnb,
              dexMax: p.buyback.dex.maxPerBuyBnb,
              dexHours: Math.round(p.buyback.dex.minIntervalSec / 3600),
            },
          ),
        },
        {
          p: t(
            "To make buybacks hard to exploit, each buy is armed first and only executed after the price has held steady for {seconds} seconds, and never while a launch tax above {tax} applies. Every burn is listed on the Protocol page.",
            { seconds: p.buyback.stabilitySec, tax: b(p.buyback.maxBuyTaxBps) },
          ),
        },
      ],
    },
    {
      id: "referrals",
      title: t("Referrals"),
      level: 1,
      blocks: [
        {
          p: t(
            "Every wallet can register one {length}-character code on-chain. A new wallet that opens its first position with your link pays {off} less Qudao fee for {days} days, and you receive {share} of the Qudao fees it pays, forever, in BNB. Only wallets that have never used Qudao can be invited, and nobody can invite themselves.",
            { length: p.referrals.codeLength, off: b(p.referrals.inviteeDiscountBps), days: p.referrals.inviteeDiscountDays, share: b(p.referrals.referrerShareBps) },
          ),
        },
      ],
    },
    {
      id: "revenue",
      title: t("Where protocol revenue goes"),
      level: 1,
      blocks: [
        {
          p: t(
            "Revenue comes from three places: Qudao's fee on what positions earn, the in-app swap fee, and QDAO's launchpad fees. It's converted to BNB at a checked price and split every hour. Referrers are paid first, then:",
          ),
        },
        {
          ul: [
            t("{share} to stakers in The Well", { share: b(r.well) }),
            t("{share} to buy back and burn QDAO", { share: b(r.buyback) }),
            t("{share} to the safety fund", { share: b(r.safetyFund) }),
            t("{share} to the team", { share: b(r.team) }),
            t("{share} to the boosted pools reserve", { share: b(r.boostReserve) }),
          ],
        },
        {
          p: t("Revenue that arrives in QDAO is never sold: {burn} is burned, {expansion} goes to the expansion reserve and {boost} to boosted pools.", {
            burn: b(q.burn),
            expansion: b(q.expansionReserve),
            boost: b(q.boostReserve),
          }),
        },
      ],
    },
    {
      id: "transparency",
      title: t("Transparency"),
      level: 1,
      blocks: [
        {
          p: t(
            "All contracts are owned by a {hours}-hour timelock controlled by a multi-signature admin Safe: every change is public for two days before it can take effect. The guardian can pause new positions and automation in an emergency, but never withdrawals. The team's share goes to a separate Safe, and the reserves can only pay out through the timelock. Every balance, burn and payment is on the Protocol page.",
            { hours: p.governance.timelockHours },
          ),
        },
      ],
    },
    { id: "contracts", title: t("Contract addresses"), level: 2, blocks: [{ contracts: true }] },
    {
      id: "roadmap",
      title: t("Roadmap"),
      level: 1,
      blocks: [
        {
          p: t("Building, then an audited launch with the QDAO token, then boosted pools, then lending and leverage, new position types and more chains. The Roadmap page has the details."),
        },
      ],
    },
    {
      id: "risks",
      title: t("Risks"),
      level: 1,
      blocks: [
        {
          ul: [
            t("Price risk: a position holds two tokens. When prices move, it ends up holding more of the one that fell (impermanent loss). Fees may not make up for it."),
            t("Moves cost money: each range move swaps tokens and pays gas. In choppy markets, frequent moves can cost more than they earn."),
            t("Smart-contract risk: Qudao's contracts, PancakeSwap's and the token contracts can have bugs. Qudao's contracts should not hold real money until an independent audit is published."),
            t("Token risk: tokens can lose their value, be paused, or carry hidden taxes. Qudao checks tokens, but checks can miss things."),
            t("Oracle and automation risk: price feeds can fail and the automation can stop. The vault refuses to move on a bad price, and anyone can trigger a due move if the automation stops."),
            t("Past results, including the 30-day replay and estimated APRs, don't predict future returns."),
          ],
        },
      ],
    },
    {
      id: "legal",
      title: t("Legal notice"),
      level: 1,
      blocks: [
        {
          p: t(
            "This document describes software, not an investment. Nothing here is financial, legal or tax advice, or an offer of any security. QDAO gives no claim on any company, profit or asset. Using Qudao may be restricted where you live; you're responsible for following your local laws. The software is provided as is, without any warranty.",
          ),
        },
      ],
    },
  ];
}
