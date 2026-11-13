// Dashboard: your positions with totals, Claim all, and the detail drawer (?vault= opens one directly).
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { useConnection } from "wagmi";
import { Layers, Plus } from "lucide-react";
import type { Address } from "viem";
import { Page } from "../components/layout/Layout";
import { Button, ButtonLink, Card, Empty, PageTitle, Skeleton, Stat, Toggle } from "../components/ui";
import { ConnectButton } from "../components/layout/Wallet";
import { GuideButton } from "../components/Guide";
import { PositionCard } from "../components/position/PositionCard";
import { PositionDrawer } from "../components/position/PositionDrawer";
import { api } from "../lib/api";
import { useTx } from "../lib/tx";
import { usd } from "../lib/format";
import { qudaoVaultAbi } from "../abis/abis";
import { useT } from "../i18n";

export default function Dashboard() {
  const { t } = useT();
  const { address } = useConnection();
  const [params, setParams] = useSearchParams();
  const [showClosed, setShowClosed] = useState(false);
  const tx = useTx();
  const [claiming, setClaiming] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ["positions", address],
    queryFn: () => api.positions(address!),
    enabled: !!address,
    refetchInterval: 30_000,
  });
  const all = data?.positions ?? [];
  const open = all.filter((p) => !p.closed);
  const shown = showClosed ? all : open;
  const selected = all.find((p) => p.address.toLowerCase() === params.get("vault")?.toLowerCase()) ?? null;
  const select = (a: Address | null) => setParams(a ? { vault: a } : {});

  const total = open.reduce((s, p) => s + p.valueUsd, 0);
  const fees = open.reduce((s, p) => s + p.feesUsd, 0);
  const pnl = all.reduce((s, p) => s + (p.pnlUsd ?? 0), 0);
  const claimable = all.filter((p) => p.feesUsd > 0.01);

  const claimAll = async () => {
    setClaiming(true);
    try {
      await tx(
        t(claimable.length > 1 ? "Claim from {n} positions" : "Claim from {n} position", { n: claimable.length }),
        claimable.map((p) => ({ address: p.address, abi: qudaoVaultAbi, functionName: "claim", label: t("Claim {pair}", { pair: `${p.symbol0}/${p.symbol1}` }) })),
      );
    } finally {
      setClaiming(false);
    }
  };

  return (
    <Page>
      <PageTitle
        title={t("Dashboard")}
        sub={t("Every position you hold through Qudao: what it's worth, what it's earned and where the price sits in its range.")}
        right={
          address && (
            <div className="flex items-center gap-2">
              <GuideButton id="dashboard" />
              <ButtonLink to="/liquidity/new">
                <Plus className="size-4" /> {t("New position")}
              </ButtonLink>
            </div>
          )
        }
      />
      {!address ? (
        <Card>
          <Empty icon={<Layers className="size-6" />} title={t("Connect your wallet to see your positions")} action={<ConnectButton size="lg" />}>
            {t("Positions live in vaults owned by your wallet, so connecting is all it takes to find them.")}
          </Empty>
        </Card>
      ) : (
        <>
          <Card hi className="p-6" >
            <div className="grid grid-cols-2 gap-6 md:grid-cols-[1fr_1fr_1fr_1fr_auto] md:items-center" data-guide="dash-summary">
              <Stat big label={t("Total value")} value={isLoading ? <Skeleton className="h-9 w-32" /> : usd(total)} />
              <Stat big label={t("Fees to claim")} value={<span className="text-up">{usd(fees)}</span>} />
              <Stat big label={t("Profit / loss")} value={<span className={pnl >= 0 ? "text-up" : "text-down"}>{usd(pnl, { sign: true })}</span>} />
              <Stat big label={t("Positions")} value={open.length} sub={t("{n} earning now", { n: open.filter((p) => p.inRange).length })} />
              <Button size="lg" disabled={!claimable.length} busy={claiming} onClick={claimAll}>
                {t("Claim all")}
              </Button>
            </div>
          </Card>
          <div className="mt-8 flex items-center justify-between">
            <h2 className="text-xl font-semibold">{t("Positions")}</h2>
            {all.length > open.length && <Toggle checked={showClosed} onChange={setShowClosed} label={t("Show closed")} />}
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3" data-guide="dash-positions">
            {isLoading && [0, 1, 2].map((i) => <Skeleton key={i} className="h-64" />)}
            {shown.map((p) => (
              <PositionCard key={p.address} p={p} onOpen={() => select(p.address)} />
            ))}
          </div>
          {data && shown.length === 0 && (
            <Card className="mt-4">
              <Empty icon={<Plus className="size-6" />} title={t("No positions yet")} action={<ButtonLink to="/liquidity">{t("Find a pool")}</ButtonLink>}>
                {t("Pick a PancakeSwap pool, choose a range and deposit. Qudao takes it from there.")}
              </Empty>
            </Card>
          )}
        </>
      )}
      <PositionDrawer p={selected} onClose={() => select(null)} />
    </Page>
  );
}
