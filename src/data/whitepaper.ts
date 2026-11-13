// The Qudao whitepaper. Numbers come from the protocol config, so the text always matches the contracts.
import type { Protocol } from "../lib/api";

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
  return [
    {
      id: "summary",
      title: "Summary",
      level: 1,
      blocks: [
        {
          p: "Qudao manages PancakeSwap v3 liquidity on BNB Chain. You choose a pool, a price range and a rule; Qudao keeps the range around the price, reinvests the fees you earn and farms CAKE where the pool has a farm. Every position is its own vault contract owned by your wallet.",
        },
        {
          p: `Qudao earns a share of what positions earn (${b(p.fees.protocolFeeBps)} today, never more than ${b(p.fees.maxProtocolFeeBps)}) and a ${b(p.fees.swapFeeBps)} fee on in-app swaps. That revenue goes to QDAO stakers, to buying back and burning QDAO, and to reserves that protect and grow the protocol.`,
        },
      ],
    },
    {
      id: "problem",
      title: "The problem",
      level: 1,
      blocks: [
        {
          p: "A PancakeSwap v3 position only earns while the price is inside its range. A narrow range earns many times more per dollar than a wide one, but the price leaves it often. Then the position stops earning until someone moves it: withdraw, swap to the right ratio, deposit again, and stake it back in the farm.",
        },
        { p: "Doing that by hand means watching charts, paying for every step and usually reacting late. Most people pick a wide range and earn little, or a narrow one and earn nothing while it sits out of range." },
      ],
    },
    {
      id: "products",
      title: "Products",
      level: 1,
      blocks: [{ p: "Qudao is one app with a few parts that work together." }],
    },
    {
      id: "liquidity",
      title: "Liquidity",
      level: 2,
      blocks: [
        {
          p: `Every PancakeSwap v3 pool on BNB Chain with at least $${k(String(p.markets.minLiquidityUsd))} of liquidity, grouped as popular pairs, Stock Token pairs and memecoins. Each shows its fee APR, an estimate for a narrow managed range (from the last week of the pool's own trading, after time out of range and Qudao's fee), whether it has a CAKE farm, and how much Qudao users hold in it.`,
        },
        {
          p: "Opening a position: pick any pair (or paste a token address), a fee tier, a range and a rule. If the pool doesn't exist, set a starting price and it's created in the same transaction. Deposit both tokens, or one: the app swaps part of it first. Tokens that take a fee on transfer are refused; tokens with risks such as blocked selling or thin liquidity are flagged before you deposit.",
        },
      ],
    },
    {
      id: "markets",
      title: "Markets and swap",
      level: 2,
      blocks: [
        {
          p: `Five lists from live PancakeSwap data: the ${p.markets.topCount} most traded tokens, new tokens (first pool in the last ${p.markets.newTokenDays} days), trending, the day's biggest gainers, and Stock Tokens. Any token can be swapped in the app over PancakeSwap's best route (its Smart Router). Before your wallet opens, the app checks the swap goes through PancakeSwap's official router and Qudao's swap contract. In-app swaps carry a ${b(p.fees.swapFeeBps)} fee.`,
        },
      ],
    },
    {
      id: "stock-tokens",
      title: "Stock Tokens",
      level: 2,
      blocks: [
        {
          p: `Tokenized shares and ETFs (for example NVDA, TSLA or SPY) trade on PancakeSwap and follow a price that only moves while the US market is open. A position with a Stock Token can wait for the market to open before moving its range, so it doesn't chase thin overnight trading, unless the price moves more than ${b(a.stockMarket.overrideBps)}.`,
        },
      ],
    },
    {
      id: "dashboard",
      title: "Dashboard",
      level: 2,
      blocks: [
        {
          p: "Every position with its value, fees ready to claim, APR, where the price sits in the range, and profit or loss measured against the prices when you deposited. Each position has its full history (opened, range moved, fees reinvested or claimed, settings changed, funds added or taken out) and its settings. Claim per position, claim everything as BNB in one transaction, or compound now.",
        },
      ],
    },
    {
      id: "last-30-days",
      title: "Last 30 days",
      level: 2,
      blocks: [
        {
          p: "Before you deposit, the app replays the pool's last 30 days hour by hour with your range and rule: the fees you would have earned, how often the range would have moved, the time in range and the cost of each move. It's a guide, not a promise.",
        },
      ],
    },
    {
      id: "the-well",
      title: "The Well (staking)",
      level: 2,
      blocks: [{ p: "Stake QDAO to earn part of Qudao's revenue in BNB and pay a lower fee on your positions. See The token below." }],
    },
    {
      id: "strategies",
      title: "Range strategies",
      level: 1,
      blocks: [
        { p: "Each position has a rule for what happens when the price leaves its range:" },
        {
          ul: [
            "Same range: re-centred on the new price with the same distances above and below.",
            `Narrow as the price rises: each move up makes the range ${b(a.dynamicRules.stepBps)} narrower, each move down ${b(a.dynamicRules.stepBps)} wider.`,
            `Widen when volatile: the width follows the last day's volatility (about ${a.dynamicRules.volatilityDailyMoves} daily moves).`,
            `Follow the ${a.dynamicRules.averageHours}h average: the range centres on the average price, shifted just enough to include the current price.`,
          ],
        },
        {
          p: `Dynamic rules always stay between ${x(a.dynamicRules.minWidthFactorBps)} and ${x(a.dynamicRules.maxWidthFactorBps)} the width you started with; the vault enforces this. A range is at least ${a.minRangeWidthTicks} ticks wide, and moves are at least ${Math.round(a.minRebalanceIntervalSec / 60)} minutes apart.`,
        },
        {
          p: `Fees are reinvested once they're worth enough to be worth the cost: ${a.reinvestTiers.map((t) => `${b(t.thresholdBps)} of the position${t.maxPositionUsd ? ` below $${t.maxPositionUsd}` : " above that"}`).join(", ")}. You choose what share is reinvested (${b(a.reinvestShareMinBps)} to 100%); the rest stays ready to claim.`,
        },
      ],
    },
    {
      id: "leverage",
      title: "Leveraged liquidity (later)",
      level: 1,
      blocks: [{ p: "A later phase adds a lending market that accepts Qudao positions as collateral, so a range can be opened with more than you deposit. It will ship separately with its own audit." }],
    },
    {
      id: "custody",
      title: "How your funds are held",
      level: 1,
      blocks: [
        {
          ul: [
            "Each position is a separate vault contract owned by your wallet. Funds are never pooled with other users.",
            "Only you can withdraw, close or change settings. Closing and withdrawing work even while Qudao is paused.",
            "The automation (the keeper) can only move the range, collect and reinvest. If it stops for more than " +
              `${a.keeper.graceHours} hours, anyone can trigger a due move.`,
            `Before every move or reinvest the vault checks the pool's price against Chainlink, or else the pool's own ${Math.round(a.oracle.twapSeconds / 60)}-minute average, and refuses if it's more than ${b(a.oracle.maxDeviationBps)} away. Stale prices are refused.`,
            `Swaps inside a position can't be worse than its price tolerance (${b(a.slippage.minBps)} to ${b(a.slippage.maxBps)}; ${b(a.slippage.defaultBps)} by default, ${b(a.slippage.majorsBps)} for major pairs).`,
            "Swaps go through PancakeSwap's routers only, via Qudao's swap contract, which holds nothing between transactions.",
            "Deposits use exact amounts: a Permit2 signature valid for 30 minutes, or exact approvals sent together with the deposit on wallets that batch calls.",
          ],
        },
      ],
    },
    {
      id: "fees",
      title: "Fees and costs",
      level: 1,
      blocks: [
        {
          ul: [
            `Qudao fee: ${b(p.fees.protocolFeeBps)} of the fees and CAKE a position earns. Never taken from your deposit. The contracts refuse anything above ${b(p.fees.maxProtocolFeeBps)}.`,
            `In-app swaps: ${b(p.fees.swapFeeBps)} of the amount received.`,
            `Automation gas: each move or reinvest refunds the keeper's actual gas from the position, capped at ${a.keeper.maxGasPriceGwei} gwei and ${a.keeper.maxRefundBnb} BNB per action.`,
            "PancakeSwap's own swap fees apply to any swap, as they would anywhere.",
          ],
        },
      ],
    },
    {
      id: "token",
      title: "The token",
      level: 1,
      blocks: [{ p: "QDAO launches on flap.sh, BNB Chain's launchpad, with a fixed supply of one billion. It trades on a bonding curve until it graduates to PancakeSwap." }],
    },
    {
      id: "staking",
      title: "Staking without a lock",
      level: 2,
      blocks: [
        {
          p: `Stake QDAO in The Well and unstake whenever you like. Your tier depends on how much you stake (${s.tierAmounts.map(k).join(" / ")} QDAO) and for how long (${s.tierDays.map((d) => (d === 0 ? "from day one" : `${Math.round(d / 30)} months`)).join(" / ")}). Higher tiers pay less Qudao fee, from ${b(s.discountBps[0][0])} to ${b(s.discountBps[3][3])} off, and earn more rewards, from ${x(s.boostBps[0][0])} to ${x(s.boostBps[3][3])}.`,
        },
        { p: "Adding to your stake shortens your time staked in proportion, so a large top-up can't jump straight to the top tier. Unstaking part keeps your time staked; unstaking everything resets it." },
      ],
    },
    {
      id: "rewards",
      title: "Staking rewards",
      level: 2,
      blocks: [
        {
          p: `Stakers receive ${b(r.well)} of Qudao's BNB revenue. Each payment streams over ${s.rewardStreamDays} days, every second, shared by stake × boost. If nobody is staked the stream pauses rather than being lost. No one, including Qudao's admin, can take BNB out of The Well except stakers claiming their rewards.`,
        },
      ],
    },
    {
      id: "buyback",
      title: "Buyback and burn",
      level: 2,
      blocks: [
        {
          p: `${b(r.buyback)} of the BNB revenue buys QDAO and sends it to the burn address. Before graduation it buys on the flap.sh bonding curve (at most every ${Math.round(p.buyback.curve.minIntervalSec / 3600)} hour, once at least ${p.buyback.curve.minAmountBnb} BNB has built up); after graduation on PancakeSwap (at most ${p.buyback.dex.maxPerBuyBnb} BNB every ${Math.round(p.buyback.dex.minIntervalSec / 3600)} hours). It switches over automatically.`,
        },
        {
          p: `To make buybacks hard to exploit, each buy is armed first and only executed after the price has held steady for ${p.buyback.stabilitySec} seconds, and never while a launch tax above ${b(p.buyback.maxBuyTaxBps)} applies. Every burn is listed on the Protocol page.`,
        },
      ],
    },
    {
      id: "referrals",
      title: "Referrals",
      level: 1,
      blocks: [
        {
          p: `Every wallet can register one ${p.referrals.codeLength}-character code on-chain. A new wallet that opens its first position with your link pays ${b(p.referrals.inviteeDiscountBps)} less Qudao fee for ${p.referrals.inviteeDiscountDays} days, and you receive ${b(p.referrals.referrerShareBps)} of the Qudao fees it pays, forever, in BNB. Only wallets that have never used Qudao can be invited, and nobody can invite themselves.`,
        },
      ],
    },
    {
      id: "revenue",
      title: "Where protocol revenue goes",
      level: 1,
      blocks: [
        { p: "Revenue comes from three places: Qudao's fee on what positions earn, the in-app swap fee, and QDAO's launchpad fees. It's converted to BNB at a checked price and split every hour. Referrers are paid first, then:" },
        {
          ul: [
            `${b(r.well)} to stakers in The Well`,
            `${b(r.buyback)} to buy back and burn QDAO`,
            `${b(r.safetyFund)} to the safety fund`,
            `${b(r.team)} to the team`,
            `${b(r.boostReserve)} to the boosted pools reserve`,
          ],
        },
        { p: `Revenue that arrives in QDAO is never sold: ${b(q.burn)} is burned, ${b(q.expansionReserve)} goes to the expansion reserve and ${b(q.boostReserve)} to boosted pools.` },
      ],
    },
    {
      id: "transparency",
      title: "Transparency",
      level: 1,
      blocks: [
        {
          p: `All contracts are owned by a ${p.governance.timelockHours}-hour timelock controlled by a multi-signature admin Safe: every change is public for two days before it can take effect. The guardian can pause new positions and automation in an emergency, but never withdrawals. The team's share goes to a separate Safe, and the reserves can only pay out through the timelock. Every balance, burn and payment is on the Protocol page.`,
        },
      ],
    },
    { id: "contracts", title: "Contract addresses", level: 2, blocks: [{ contracts: true }] },
    {
      id: "roadmap",
      title: "Roadmap",
      level: 1,
      blocks: [{ p: "Building, then an audited launch with the QDAO token, then boosted pools, then lending and leverage, new position types and more chains. The Roadmap page has the details." }],
    },
    {
      id: "risks",
      title: "Risks",
      level: 1,
      blocks: [
        {
          ul: [
            "Price risk: a position holds two tokens. When prices move, it ends up holding more of the one that fell (impermanent loss). Fees may not make up for it.",
            "Moves cost money: each range move swaps tokens and pays gas. In choppy markets, frequent moves can cost more than they earn.",
            "Smart-contract risk: Qudao's contracts, PancakeSwap's and the token contracts can have bugs. Qudao's contracts should not hold real money until an independent audit is published.",
            "Token risk: tokens can lose their value, be paused, or carry hidden taxes. Qudao checks tokens, but checks can miss things.",
            "Oracle and automation risk: price feeds can fail and the automation can stop. The vault refuses to move on a bad price, and anyone can trigger a due move if the automation stops.",
            "Past results, including the 30-day replay and estimated APRs, don't predict future returns.",
          ],
        },
      ],
    },
    {
      id: "legal",
      title: "Legal notice",
      level: 1,
      blocks: [
        {
          p: "This document describes software, not an investment. Nothing here is financial, legal or tax advice, or an offer of any security. QDAO gives no claim on any company, profit or asset. Using Qudao may be restricted where you live; you're responsible for following your local laws. The software is provided as is, without any warranty.",
        },
      ],
    },
  ];
}
