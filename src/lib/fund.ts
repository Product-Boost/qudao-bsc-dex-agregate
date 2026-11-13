// Moving tokens into Qudao (open a position, add funds): one confirmation on wallets that batch (exact approvals +
// the call), otherwise Permit2: approve Permit2 once per token, then one signature (exact amounts, 30 minutes)
// and one transaction.
import { useCallback } from "react";
import { useConfig, useConnection } from "wagmi";
import type { Address, Hex } from "viem";
import { useAppConfig } from "./config";
import { useBatchSupport, useTx, type Call, type TxResult } from "./tx";
import { approvalsNeeded, EMPTY_PERMIT, signPermitBatch, type PermitBatch } from "./permit2";
import { friendlyError } from "./errors";
import { toast } from "./toast";
import { useT } from "../i18n";

export interface Pull {
  token: Address;
  amount: bigint;
  symbol: string;
}

export function useFunding() {
  const config = useConfig();
  const { address, chainId } = useConnection();
  const cfg = useAppConfig();
  const tx = useTx();
  const canBatch = useBatchSupport();
  const { t } = useT();

  return useCallback(
    async (title: string, spender: Address, pulls: Pull[], build: (permit: PermitBatch, signature: Hex) => Call): Promise<TxResult | null> => {
      if (!address || !chainId) return null;
      const erc = pulls.filter((p) => p.amount > 0n);
      if (erc.length === 0) return tx(title, [build(EMPTY_PERMIT, "0x")]);
      if (await canBatch()) return tx(title, [...(await approvalsNeeded(config, address, spender, erc)), build(EMPTY_PERMIT, "0x")]);
      const approvals = await approvalsNeeded(config, address, cfg.permit2, erc, true);
      if (approvals.length && !(await tx(t("Allow Permit2 (once per token)"), approvals))) return null;
      let signed;
      try {
        signed = await signPermitBatch(config, { permit2: cfg.permit2, chainId, spender, tokens: erc.map(({ token, amount }) => ({ token, amount })) });
      } catch (e) {
        const f = friendlyError(e);
        if (!f.cancelled) toast.error(t("Signature failed"), f.message);
        return null;
      }
      return tx(title, [build(signed.permit, signed.signature)]);
    },
    [address, chainId, canBatch, cfg.permit2, config, tx, t],
  );
}
