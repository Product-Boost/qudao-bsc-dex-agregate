// Permit2 batch signatures: the wallet signs exactly which tokens and amounts the factory may pull, valid for
// 30 minutes, so a deposit is one signature and one transaction (after a one-time approval of Permit2).
import { erc20Abi, maxUint256, type Address, type Hex } from "viem";
import { readContract, signTypedData } from "wagmi/actions";
import type { Config } from "wagmi";
import type { Call } from "./tx";
import { t as tr } from "../i18n";

export interface PermitBatch {
  permitted: { token: Address; amount: bigint }[];
  nonce: bigint;
  deadline: bigint;
}

export const EMPTY_PERMIT: PermitBatch = { permitted: [], nonce: 0n, deadline: 0n };

const types = {
  PermitBatchTransferFrom: [
    { name: "permitted", type: "TokenPermissions[]" },
    { name: "spender", type: "address" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint256" },
  ],
  TokenPermissions: [
    { name: "token", type: "address" },
    { name: "amount", type: "uint256" },
  ],
} as const;

/** Permit2 nonces are unordered: any unused 256-bit value works, so a random one never collides in practice. */
function randomNonce(): bigint {
  const b = crypto.getRandomValues(new Uint8Array(31)); // < 2^248 keeps the word index small
  return BigInt("0x" + [...b].map((x) => x.toString(16).padStart(2, "0")).join(""));
}

export async function signPermitBatch(
  config: Config,
  args: { permit2: Address; chainId: number; spender: Address; tokens: { token: Address; amount: bigint }[] },
): Promise<{ permit: PermitBatch; signature: Hex }> {
  const permit: PermitBatch = {
    permitted: args.tokens,
    nonce: randomNonce(),
    deadline: BigInt(Math.floor(Date.now() / 1000) + 30 * 60),
  };
  const signature = await signTypedData(config, {
    domain: { name: "Permit2", chainId: args.chainId, verifyingContract: args.permit2 },
    types,
    primaryType: "PermitBatchTransferFrom",
    message: { permitted: permit.permitted, spender: args.spender, nonce: permit.nonce, deadline: permit.deadline },
  });
  return { permit, signature };
}

/** Approval calls still needed before `spender` can pull these amounts (exact amounts, or max for Permit2). */
export async function approvalsNeeded(
  config: Config,
  owner: Address,
  spender: Address,
  tokens: { token: Address; amount: bigint; symbol: string }[],
  infinite = false,
): Promise<Call[]> {
  const calls: Call[] = [];
  for (const t of tokens) {
    if (t.amount === 0n) continue;
    const allowance = await readContract(config, { address: t.token, abi: erc20Abi, functionName: "allowance", args: [owner, spender] });
    if (allowance >= t.amount) continue;
    calls.push({
      address: t.token,
      abi: erc20Abi,
      functionName: "approve",
      args: [spender, infinite ? maxUint256 : t.amount],
      label: tr("Approve {symbol}", { symbol: t.symbol }),
    });
  }
  return calls;
}
