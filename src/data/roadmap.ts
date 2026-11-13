// Where Qudao is going. Status: done | now | next | later.
export type PhaseStatus = "done" | "now" | "next" | "later";

export const ROADMAP: { title: string; status: PhaseStatus; summary: string; items: string[] }[] = [
  {
    title: "Building",
    status: "now",
    summary: "The contracts, the automation and the app.",
    items: [
      "Vault per position, factory and swap contracts on BNB Chain, built on PancakeSwap v3",
      "Automatic range moves with four rules, reinvesting and CAKE farming through MasterChef v3",
      "Price checks against Chainlink and the pool's own average before every move",
      "The Well, referrals, revenue router, buyback & burn and the reserves",
      "This app: markets, swap, liquidity tools, dashboard, alerts",
    ],
  },
  {
    title: "Launch",
    status: "next",
    summary: "Audited contracts on mainnet and the QDAO token.",
    items: [
      "Independent security audit, report published here",
      "QDAO launched on flap.sh; buybacks start on the bonding curve",
      "Contracts on BNB Chain mainnet, owned by a 48-hour timelock",
      "Public launch with the final fee and reward numbers",
    ],
  },
  {
    title: "Growth",
    status: "later",
    summary: "More reasons to provide liquidity through Qudao.",
    items: [
      "Boosted pools: extra rewards on selected pools, paid from the boosted pools reserve",
      "More Stock Token pools as they launch on PancakeSwap",
      "Install Qudao on your phone's home screen, with alerts",
    ],
  },
  {
    title: "Lending and leverage",
    status: "later",
    summary: "Borrow against your positions.",
    items: ["A lending market that accepts Qudao positions as collateral", "Leveraged ranges for more fees on the same deposit", "Its own audit before launch"],
  },
  {
    title: "More position types",
    status: "later",
    summary: "Beyond a single range.",
    items: ["Target-price positions: sell or buy at your price and earn fees while waiting", "Liquidity shapes: several ranges in one position"],
  },
  {
    title: "Beyond",
    status: "later",
    summary: "Wherever PancakeSwap goes.",
    items: ["A mobile app", "Other chains where PancakeSwap v3 runs"],
  },
];
