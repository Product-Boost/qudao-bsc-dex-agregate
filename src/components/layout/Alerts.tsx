// Browser alerts: turn on with one signature (proves the wallet is yours; costs nothing), choose what to hear
// about, send a test. Delivered by the browser's push service even when the tab is closed.
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useConfig, useConnection } from "wagmi";
import { signMessage } from "wagmi/actions";
import { Bell, BellOff, BellRing } from "lucide-react";
import { Drawer } from "../Modal";
import { Button, Notice, Toggle } from "../ui";
import { api, type AlertPrefs } from "../../lib/api";
import { useAppConfig } from "../../lib/config";
import { friendlyError } from "../../lib/errors";
import { toast } from "../../lib/toast";
import { ConnectButton } from "./Wallet";
import { useT } from "../../i18n";

const supported = typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

const KINDS: { key: keyof AlertPrefs; label: string; sub: string }[] = [
  { key: "outOfRange", label: "Position out of range", sub: "The price left your range (Qudao moves it back automatically)." },
  { key: "rangeMoved", label: "Range moved", sub: "Each time your range is moved around the price." },
  { key: "feesReady", label: "Fees ready to claim", sub: "When unclaimed fees pass your minimum." },
  { key: "referral", label: "Referrals", sub: "Someone joined with your link, or referral rewards are waiting." },
  { key: "weekly", label: "Weekly summary", sub: "Mondays: value, fees and moves over the last 7 days." },
];

async function currentSubscription() {
  if (!supported) return null;
  const reg = await navigator.serviceWorker.getRegistration("/sw.js");
  return (await reg?.pushManager.getSubscription()) ?? null;
}

function b64ToBytes(b64: string) {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const s = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
}

export function AlertsButton() {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const { data } = useQuery({ queryKey: ["push-sub"], queryFn: async () => (await currentSubscription())?.endpoint ?? null, enabled: supported });
  return (
    <>
      <button onClick={() => setOpen(true)} aria-label={t("Alerts")} className="relative grid size-9 place-items-center rounded-xl border border-line-2 text-fg-2 hover:border-gold/50 hover:text-gold-2">
        {data ? <BellRing className="size-4" /> : <Bell className="size-4" />}
        {data && <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-gold" />}
      </button>
      <Drawer open={open} onClose={() => setOpen(false)} title={t("Alerts")}>
        <AlertsPanel />
      </Drawer>
    </>
  );
}

function AlertsPanel() {
  const { t } = useT();
  const { push } = useAppConfig();
  const { address } = useConnection();
  const config = useConfig();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const { data: sub, refetch } = useQuery({
    queryKey: ["push-sub-full"],
    queryFn: async () => {
      const s = await currentSubscription();
      if (!s) return null;
      return { endpoint: s.endpoint, server: await api.alertGet(s.endpoint).catch(() => null) };
    },
    enabled: supported,
  });
  const [edits, setEdits] = useState<Partial<AlertPrefs>>({});
  const prefs: AlertPrefs | null = sub?.server?.prefs ? { ...sub.server.prefs, ...edits } : null;

  const enable = async () => {
    if (!address || !push.vapidPublicKey) return;
    setBusy(true);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") throw new Error(t("The browser blocked notifications. Allow them for this site in the browser settings."));
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const s =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(push.vapidPublicKey) }));
      const { message, issuedAt } = await api.alertMessage(address);
      const signature = await signMessage(config, { message });
      await api.alertSubscribe({ owner: address, issuedAt, signature, subscription: s.toJSON() });
      toast.info(t("Alerts are on"), t("This browser will be told about your positions."));
      await refetch();
      qc.invalidateQueries({ queryKey: ["push-sub"] });
    } catch (e) {
      const f = friendlyError(e);
      if (!f.cancelled) toast.error(t("Couldn't turn on alerts"), f.message);
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    setBusy(true);
    try {
      const s = await currentSubscription();
      if (s) {
        await api.alertUnsubscribe(s.endpoint).catch(() => {});
        await s.unsubscribe();
      }
      await refetch();
      qc.invalidateQueries({ queryKey: ["push-sub"] });
    } finally {
      setBusy(false);
    }
  };

  const save = async (patch: Partial<AlertPrefs>) => {
    if (!sub || !prefs) return;
    setEdits((e) => ({ ...e, ...patch }));
    try {
      await api.alertPrefs(sub.endpoint, patch);
    } catch (e) {
      toast.error(t("Couldn't save"), friendlyError(e).message);
    }
  };

  if (!supported) return <Notice tone="warn">{t("This browser can't receive alerts. On iPhone, add Qudao to your home screen first (Share → Add to Home Screen).")}</Notice>;
  if (!push.enabled || !push.vapidPublicKey) return <Notice>{t("Alerts aren't switched on for this server yet.")}</Notice>;

  if (!sub?.server)
    return (
      <div className="space-y-5">
        <p className="text-sm leading-relaxed text-fg-2">
          {t("Get a browser notification when a position leaves its range, when the range is moved, when fees are ready and once a week with a summary. You sign a message to prove the wallet is yours: it isn't a transaction and costs nothing.")}
        </p>
        {address ? (
          <Button onClick={enable} busy={busy}>
            <BellRing className="size-4" /> {t("Turn on alerts")}
          </Button>
        ) : (
          <ConnectButton />
        )}
      </div>
    );

  return (
    <div className="space-y-6">
      <Notice tone="gold">
        {t("Alerts are on in this browser for")} <span className="font-mono">{sub.server.owner.slice(0, 8)}…</span>
      </Notice>
      <div className="space-y-4">
        {KINDS.map((k) => (
          <div key={k.key} className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-medium">{t(k.label)}</div>
              <div className="text-xs text-mute">{t(k.sub)}</div>
              {k.key === "feesReady" && prefs?.feesReady && (
                <label className="mt-2 flex items-center gap-2 text-xs text-fg-2">
                  {t("Minimum")}
                  <span className="flex items-center rounded-lg border border-line bg-ink-2 px-2">
                    $
                    <input
                      type="number"
                      min={0}
                      defaultValue={prefs.feesMinUsd}
                      onBlur={(e) => save({ feesMinUsd: Math.max(0, Number(e.target.value) || 0) })}
                      className="num w-16 bg-transparent py-1 pl-1 outline-none"
                    />
                  </span>
                </label>
              )}
            </div>
            <Toggle checked={!!prefs?.[k.key]} onChange={(v) => save({ [k.key]: v })} />
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="ghost" onClick={() => api.alertTest(sub.endpoint).then(() => toast.info(t("Test sent"), t("It should appear in a few seconds.")))}>
          {t("Send a test")}
        </Button>
        <Button variant="danger" onClick={disable} busy={busy}>
          <BellOff className="size-4" /> {t("Turn off")}
        </Button>
      </div>
    </div>
  );
}
