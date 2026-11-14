// Deposits (open a position, add funds): approve each ERC-20 to the factory, wait for that
// transaction, then send the call with an empty Permit2 signature so the factory uses transferFrom.
// The WBNB side is skipped only when that amount is sent as msg.value, and msg.value must equal it.
import { useCallback } from "react";
import { useConfig, useConnection } from "wagmi";
import type { Address, Hex } from "viem";
import { useTx, type Call, type TxResult } from "./tx";
import { approvalsNeeded, EMPTY_PERMIT, type PermitBatch } from "./permit2";

export interface Pull {
  token: Address;
  amount: bigint;
  symbol: string;
}

export function useFunding() {
  const config = useConfig();
  const { address } = useConnection();
  const tx = useTx();

  return useCallback(
    async (title: string, spender: Address, pulls: Pull[], build: (permit: PermitBatch, signature: Hex) => Call): Promise<TxResult | null> => {
      if (!address) return null;
      const erc = pulls.filter((p) => p.amount > 0n);
      const approvals = erc.length ? await approvalsNeeded(config, address, spender, erc) : [];
      for (const call of approvals) {
        const done = await tx(call.label ?? "Approve", [call]);
        if (!done) return null;
      }
      return tx(title, [build(EMPTY_PERMIT, "0x")]);
    },
    [address, config, tx],
  );
}
