import type { Position } from "./api";
import { pairView } from "./v3";

/** How a position's price is shown (which token is the base). */
export const viewFor = (p: Position) => pairView(p.symbol0, p.symbol1, p.decimals0, p.decimals1);
