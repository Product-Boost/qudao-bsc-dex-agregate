// Turns wallet and contract errors into sentences people can act on.
import { BaseError, ContractFunctionRevertedError, UserRejectedRequestError } from "viem";

const CONTRACT: Record<string, string> = {
  PriceDeviates: "The pool's price is too far from the reference price right now. Try again in a minute.",
  NoReference: "There's no trusted reference price for this pool yet. Try again in a few minutes.",
  StaleFeed: "The price feed is out of date, so Qudao won't trade right now.",
  NoPrice: "No price is available for this token.",
  PriceMoved: "The price moved while you were confirming. Check the numbers and try again.",
  TooLittleReceived: "You'd receive less than your price tolerance allows. Try again or raise the tolerance.",
  IsPaused: "Qudao is paused for safety. You can still close positions and withdraw.",
  Paused: "Qudao is paused for safety. You can still close positions and withdraw.",
  BadRange: "That range isn't valid for this pool (too narrow, or the ends are in the wrong order).",
  RangeOutsideStrategy: "That range is outside what this strategy allows.",
  BadSettings: "Those settings aren't allowed (check the reinvest share and price tolerance).",
  BadTokens: "These tokens can't be used together.",
  SameToken: "Pick two different tokens.",
  NoPool: "This pool doesn't exist yet.",
  FeeOnTransfer: "This token takes a fee on every transfer, so it can't be used in a Qudao position.",
  TaxTooHigh: "This token's transfer tax is too high.",
  BadPermit: "The signature doesn't match this transaction. Sign again.",
  Expired: "The signature expired. Sign again.",
  ZeroAmount: "Enter an amount.",
  BadValue: "The BNB amount doesn't match the deposit.",
  InsufficientBalance: "Not enough balance.",
  InsufficientStake: "You can't unstake more than you have staked.",
  NoPosition: "This position has no liquidity.",
  IsClosed: "This position is closed.",
  StillInRange: "The price is still inside the range, so there's nothing to move.",
  TooSoon: "The range moved recently. There's a minimum wait between moves.",
  BelowThreshold: "Not enough fees have built up to reinvest yet.",
  OnlyOwner: "Only the position's owner can do this.",
  OwnableUnauthorizedAccount: "This wallet isn't allowed to do that.",
  NotAllowed: "This wallet isn't allowed to do that.",
  OnlyKeeper: "Only the automation can do this (or anyone, once it has been offline for a while).",
  RouterNotAllowed: "The swap goes to a router Qudao doesn't trust, so it was stopped.",
  BadSwap: "The planned swap doesn't match the position. Refresh and try again.",
  InvalidCode: "Codes are 8 characters, letters a–z and digits 0–9.",
  CodeTaken: "That code is already taken. Try another.",
  AlreadyRegistered: "This wallet already has a code.",
  TokenNotSet: "The QDAO token isn't live yet.",
  QdaoNotSet: "The QDAO token isn't live yet.",
  TransferFailed: "A transfer failed. Check the token isn't restricted.",
  SafeERC20FailedOperation: "A token transfer failed. Check your balance and approvals.",
};

export function friendlyError(e: unknown): { message: string; cancelled: boolean } {
  if (e instanceof BaseError) {
    if (e.walk((x) => x instanceof UserRejectedRequestError)) return { message: "You cancelled in your wallet.", cancelled: true };
    const revert = e.walk((x) => x instanceof ContractFunctionRevertedError) as ContractFunctionRevertedError | null;
    const name = revert?.data?.errorName;
    if (name && CONTRACT[name]) return { message: CONTRACT[name], cancelled: false };
    if (name) return { message: `The contract refused: ${name}.`, cancelled: false };
    if (/insufficient funds/i.test(e.message)) return { message: "Not enough BNB to pay for this and its network fee.", cancelled: false };
    if (/user (rejected|denied)|rejected the request/i.test(e.message)) return { message: "You cancelled in your wallet.", cancelled: true };
    return { message: e.shortMessage, cancelled: false };
  }
  if (e instanceof Error) {
    if (/user (rejected|denied)|rejected the request/i.test(e.message)) return { message: "You cancelled in your wallet.", cancelled: true };
    return { message: e.message, cancelled: false };
  }
  return { message: "Something went wrong.", cancelled: false };
}
