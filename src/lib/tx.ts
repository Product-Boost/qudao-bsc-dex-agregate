// Sends contract calls the safe way: every call is simulated before the wallet opens (a call that would fail
// costs nothing and says why), several calls go out as one confirmation when the wallet supports EIP-5792
// batching, and progress shows as toasts with explorer links.
import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useConfig, useConnection } from "wagmi";
import {
  getCapabilities,
  getPublicClient,
  sendCalls,
  simulateContract,
  waitForCallsStatus,
  waitForTransactionReceipt,
  writeContract,
} from "wagmi/actions";
import { encodeFunctionData, type Abi, type Address, type Hash } from "viem";
import { friendlyError } from "./errors";
import { toast } from "./toast";
import { useT } from "../i18n";
import { useAppConfig } from "./config";

export interface Call {
  address: Address;
  abi: Abi | readonly unknown[];
  functionName: string;
  args?: readonly unknown[];
  value?: bigint;
  /** Shown in the toast while this call is in progress (e.g. "Approve USDT"). */
  label?: string;
}

export interface TxResult {
  hashes: Hash[];
}

const batchSupport = new Map<string, boolean>();

/** Whether the connected wallet can send several calls as one confirmation (EIP-5792 atomic batch). */
export function useBatchSupport() {
  const config = useConfig();
  const { address, chainId } = useConnection();
  return useCallback(async () => {
    if (!address || !chainId) return false;
    const key = `${address}:${chainId}`;
    if (batchSupport.has(key)) return batchSupport.get(key)!;
    let ok = false;
    try {
      const caps = (await getCapabilities(config, { account: address, chainId })) as { atomic?: { status?: string } };
      ok = caps?.atomic?.status === "supported" || caps?.atomic?.status === "ready";
    } catch {
      ok = false;
    }
    batchSupport.set(key, ok);
    return ok;
  }, [address, chainId, config]);
}

export function useTx() {
  const config = useConfig();
  const { address } = useConnection();
  const qc = useQueryClient();
  const { chain } = useAppConfig();
  const canBatch = useBatchSupport();
  const { t } = useT();

  return useCallback(
    async (title: string, calls: Call[]): Promise<TxResult | null> => {
      if (!address) {
        toast.error(t("Connect a wallet first"));
        return null;
      }
      const txUrl = (h: Hash) => `${chain.explorer}/tx/${h}`;
      const id = toast.push({ kind: "pending", title, body: t("Checking the transaction…") });
      const hashes: Hash[] = [];
      try {
        if (calls.length > 1 && (await canBatch())) {
          // one confirmation for everything (e.g. approve + open). Check the whole sequence first where the
          // node supports multi-call simulation; the wallet simulates it again before showing it.
          const client = getPublicClient(config);
          try {
            const sim = (await client!.simulateCalls({
              account: address,
              calls: calls.map((c) => ({ to: c.address, abi: c.abi as Abi, functionName: c.functionName, args: c.args ?? [], value: c.value })) as never,
            })) as { results: { status: "success" | "failure"; error?: Error }[] };
            const failed = sim.results.find((r) => r.status === "failure");
            if (failed && failed.error) throw failed.error;
          } catch (e) {
            if (!/eth_simulateV1|not (supported|found|available)|does not exist/i.test(String((e as Error).message))) throw e;
          }
          toast.update(id, { body: t("Confirm in your wallet (one confirmation).") });
          const { id: callsId } = await sendCalls(config, {
            calls: calls.map((c) => ({
              to: c.address,
              data: encodeFunctionData({ abi: c.abi as Abi, functionName: c.functionName, args: (c.args ?? []) as never }),
              value: c.value,
            })),
          });
          toast.update(id, { body: t("Submitted. Waiting for the network…") });
          const status = await waitForCallsStatus(config, { id: callsId });
          for (const r of status.receipts ?? []) hashes.push(r.transactionHash);
          if (status.status !== "success") throw new Error(t("The transaction failed on-chain."));
        } else {
          for (const [i, c] of calls.entries()) {
            const step = calls.length > 1 ? t(" ({n} of {total})", { n: i + 1, total: calls.length }) : "";
            toast.update(id, { body: `${c.label ?? t("Checking")}${step}…` });
            const { request } = await simulateContract(config, {
              account: address,
              address: c.address,
              abi: c.abi as Abi,
              functionName: c.functionName,
              args: (c.args ?? []) as never,
              value: c.value,
            } as never);
            toast.update(id, { body: t("Confirm in your wallet{step}.", { step }) });
            const hash = await writeContract(config, request as never);
            hashes.push(hash);
            toast.update(id, { body: t("Submitted{step}. Waiting for the network…", { step }), href: txUrl(hash) });
            const receipt = await waitForTransactionReceipt(config, { hash });
            if (receipt.status !== "success") throw new Error(t("The transaction failed on-chain."));
          }
        }
        toast.update(id, { kind: "success", body: t("Done."), href: hashes.length ? txUrl(hashes[hashes.length - 1]) : undefined });
        await qc.invalidateQueries();
        return { hashes };
      } catch (e) {
        const { message, cancelled } = friendlyError(e);
        if (cancelled) toast.update(id, { kind: "info", body: message });
        else toast.update(id, { kind: "error", body: message });
        if (hashes.length) await qc.invalidateQueries();
        return null;
      }
    },
    [address, canBatch, config, qc, chain.explorer, t],
  );
}
