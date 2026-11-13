// "Explain this page" walk-throughs. Each step points at an element marked data-guide="<target>".

export interface GuideStep {
  target?: string;
  title: string;
  body: string;
}

export const GUIDES: Record<string, GuideStep[]> = {
  liquidity: [
    {
      title: "Earn trading fees on PancakeSwap",
      body: "Every pool here is a real PancakeSwap v3 pool on BNB Chain. When you add liquidity, traders pay you a share of each swap's fee. Qudao manages the position so it keeps earning.",
    },
    {
      target: "pool-groups",
      title: "Pick a group",
      body: "Popular pairs (BNB, stablecoins, majors), Stock Token pairs (tokenized NVDA, TSLA, SPY…) and memecoins. Pools where Qudao users already earn come first.",
    },
    {
      target: "pool-table",
      title: "APR and Est. APR",
      body: "APR is what the whole pool earned from fees in the last day, per year. Est. APR is what a narrow ±5% range would have earned over the last week after time out of range and Qudao's fee. A farm badge means CAKE rewards on top.",
    },
    {
      target: "new-position",
      title: "Open a position",
      body: "Choose a pool (or any pair, or create a new pool), set your range and rule, see what it would have earned in the last 30 days, then deposit one token or both. One signature and one transaction.",
    },
  ],
  well: [
    {
      title: "The Well: stake QDAO, earn BNB",
      body: "Stakers receive part of Qudao's revenue in BNB. There's no lock: you can unstake whenever you like.",
    },
    {
      target: "well-stake",
      title: "Your stake",
      body: "Stake or unstake here. Adding more shortens your time staked in proportion (so the tier can't be gamed); unstaking part keeps it; unstaking everything resets it.",
    },
    {
      target: "well-earnings",
      title: "Your earnings",
      body: "Each revenue payment is streamed over 30 days, every second, split by stake × boost. Claim whenever you like.",
    },
    {
      target: "well-tiers",
      title: "Tiers",
      body: "Your amount staked and time staked place you in a tier. Higher tiers pay a lower Qudao fee on your positions (up to 50% less) and earn a bigger share of rewards (up to 2×). Use the buttons to plan ahead.",
    },
  ],
  referrals: [
    {
      title: "Invite friends, earn BNB",
      body: "Share your link. When a new wallet opens its first position through it, you earn a share of the Qudao fees it pays, forever, paid in BNB.",
    },
    {
      target: "ref-code",
      title: "Your code",
      body: "Register an 8-character code once. It's stored on-chain, so links keep working whatever happens to this website.",
    },
    {
      target: "ref-share",
      title: "Share",
      body: "Copy your link, post it on X or Telegram, or download a share image.",
    },
    {
      target: "ref-list",
      title: "Your invites",
      body: "Every wallet that joined with your link, when it joined and what you've earned from it. Rewards collect in BNB until you claim them.",
    },
  ],
  dashboard: [
    {
      target: "dash-summary",
      title: "Your totals",
      body: "Value of all positions, fees waiting to be claimed and profit or loss against what you put in (valued at the prices when you deposited).",
    },
    {
      target: "dash-positions",
      title: "Positions",
      body: "Each card shows the range around the price, whether it's earning (in range), fees to claim and the position's APR. Open one for details, history and settings.",
    },
  ],
};
