// Navigation, footer links and community links. Community links stay hidden until they're filled in.

export const NAV = [
  { to: "/app", label: "Home" },
  { to: "/markets", label: "Markets" },
  { to: "/liquidity", label: "Liquidity" },
  { to: "/dashboard", label: "Dashboard" },
  { to: "/staking", label: "The Well" },
  { to: "/token", label: "Protocol" },
  { to: "/referrals", label: "Referrals" },
] as const;

export const MORE = [
  { to: "/roadmap", label: "Roadmap" },
  { to: "/whitepaper", label: "Whitepaper" },
] as const;

/** Fill in before launch; empty ones aren't shown. */
export const COMMUNITY: { label: string; href: string }[] = [
  { label: "X", href: "" },
  { label: "Telegram", href: "" },
  { label: "GitHub", href: "" },
];

export const FOOTER = [
  {
    title: "App",
    links: [
      { to: "/app", label: "Home" },
      { to: "/markets", label: "Markets" },
      { to: "/liquidity", label: "Liquidity" },
      { to: "/dashboard", label: "Dashboard" },
    ],
  },
  {
    title: "QDAO",
    links: [
      { to: "/staking", label: "The Well" },
      { to: "/token", label: "Protocol" },
      { to: "/referrals", label: "Referrals" },
    ],
  },
  {
    title: "Learn",
    links: [
      { to: "/#how", label: "How it works" },
      { to: "/whitepaper", label: "Whitepaper" },
      { to: "/roadmap", label: "Roadmap" },
      { to: "/whitepaper#risks", label: "Risks" },
      { to: "/whitepaper#legal", label: "Legal notice" },
    ],
  },
  {
    title: "Built on",
    links: [
      { href: "https://pancakeswap.finance", label: "PancakeSwap" },
      { href: "https://www.bnbchain.org", label: "BNB Chain" },
      { href: "https://flap.sh", label: "flap.sh" },
      { href: "https://data.chain.link", label: "Chainlink" },
    ],
  },
] as const;
