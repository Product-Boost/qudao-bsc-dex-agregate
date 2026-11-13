// Referrals: register an on-chain code, share your link (copy, X, Telegram, a downloadable image), see who
// joined and what you've earned, claim in BNB.
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useConnection, useReadContract } from "wagmi";
import { stringToHex, zeroAddress, type Hex } from "viem";
import { Check, Copy, Download, Gift, Send, Users } from "lucide-react";
import { Page } from "../components/layout/Layout";
import { Button, Card, CardHeader, Empty, PageTitle, Stat } from "../components/ui";
import { GuideButton } from "../components/Guide";
import { ConnectButton } from "../components/layout/Wallet";
import { api } from "../lib/api";
import { useAppConfig } from "../lib/config";
import { useTx } from "../lib/tx";
import { bps, date, short, sig } from "../lib/format";
import { referralsAbi, revenueRouterAbi } from "../abis/abis";
import { useT } from "../i18n";

const CANVAS_DISPLAY = '"Space Grotesk Variable", "PingFang SC", "Microsoft YaHei", "Noto Sans SC", sans-serif';
const CANVAS_BODY = '"Manrope Variable", "PingFang SC", "Microsoft YaHei", "Noto Sans SC", sans-serif';

const XIcon = () => (
  <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden>
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

async function drawShareImage(canvas: HTMLCanvasElement, code: string, link: string, lines: { earn: string; stay: string; join: string; invite: string }) {
  const W = 1200;
  const H = 630;
  canvas.width = W;
  canvas.height = H;
  const g = canvas.getContext("2d")!;
  await Promise.all([document.fonts.load('600 64px "Space Grotesk Variable"'), document.fonts.load('500 28px "Manrope Variable"')]).catch(() => {});
  g.fillStyle = "#0c0b0e";
  g.fillRect(0, 0, W, H);
  const glow = g.createRadialGradient(W * 0.85, H * 0.1, 0, W * 0.85, H * 0.1, 700);
  glow.addColorStop(0, "rgba(240,185,11,0.35)");
  glow.addColorStop(1, "rgba(240,185,11,0)");
  g.fillStyle = glow;
  g.fillRect(0, 0, W, H);
  g.strokeStyle = "rgba(255,255,255,0.04)";
  for (let x = 0; x < W; x += 44) g.strokeRect(x, -1, 0.5, H + 2);
  for (let y = 0; y < H; y += 44) g.strokeRect(-1, y, W + 2, 0.5);
  const logo = new Image();
  logo.src = "/favicon.svg";
  await logo.decode().catch(() => {});
  g.drawImage(logo, 72, 64, 64, 64);
  g.fillStyle = "#f5f2ea";
  g.font = `600 40px ${CANVAS_DISPLAY}`;
  g.fillText("Qudao", 152, 110);
  g.font = `600 66px ${CANVAS_DISPLAY}`;
  g.fillText(lines.earn, 72, 250);
  const gold = g.createLinearGradient(72, 0, 760, 0);
  gold.addColorStop(0, "#ffe27a");
  gold.addColorStop(0.5, "#f0b90b");
  gold.addColorStop(1, "#c98a00");
  g.fillStyle = gold;
  g.fillText(lines.stay, 72, 330);
  g.fillStyle = "#c9c5ba";
  g.font = `500 28px ${CANVAS_BODY}`;
  g.fillText(lines.join, 72, 400);
  g.fillStyle = "#16151a";
  g.strokeStyle = "rgba(240,185,11,0.5)";
  g.lineWidth = 2;
  g.beginPath();
  g.roundRect(72, 450, 420, 110, 24);
  g.fill();
  g.stroke();
  g.fillStyle = "#8e8a80";
  g.font = `500 20px ${CANVAS_BODY}`;
  g.fillText(lines.invite, 104, 490);
  g.fillStyle = "#fcd535";
  g.font = `600 46px ${CANVAS_DISPLAY}`;
  g.fillText(code.toUpperCase(), 104, 540);
  g.fillStyle = "#8e8a80";
  g.font = `500 22px ${CANVAS_BODY}`;
  g.fillText(link.replace(/^https?:\/\//, ""), 530, 520);
}

export default function Referrals() {
  const { t, locale } = useT();
  const cfg = useAppConfig();
  const dep = cfg.deployment;
  const { address } = useConnection();
  const tx = useTx();
  const { data, refetch } = useQuery({ queryKey: ["referrals", address], queryFn: () => api.referrals(address!), enabled: !!address && !!dep });
  const [code, setCode] = useState("");
  const valid = /^[a-z0-9]{8}$/.test(code);
  const codeHex = valid ? (stringToHex(code, { size: 8 }) as Hex) : undefined;
  const taken = useReadContract({
    address: dep?.referrals,
    abi: referralsAbi,
    functionName: "ownerOfCode",
    args: [codeHex ?? "0x0000000000000000"],
    query: { enabled: !!dep && valid },
  });
  const [copied, setCopied] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null);
  const myCode = data?.code ?? null;
  const link = myCode ? `${location.origin}/?ref=${myCode}` : "";
  const discount = bps(cfg.protocol.referrals.inviteeDiscountBps);
  const months = Math.round(cfg.protocol.referrals.inviteeDiscountDays / 30);
  const share = bps(cfg.protocol.referrals.referrerShareBps);
  const text = t("I use Qudao to keep my PancakeSwap liquidity in range automatically. Join with my code {code} and pay {discount} less fee for {months} months.", { code: myCode ?? "", discount, months });
  const shareLines = {
    earn: t("Earn on PancakeSwap."),
    stay: t("Stay in range, automatically."),
    join: t("Join with my code and pay {discount} less fee for {months} months.", { discount, months }),
    invite: t("INVITE CODE"),
  };

  useEffect(() => {
    if (myCode && canvas.current) drawShareImage(canvas.current, myCode, link, shareLines);
    // Redraw when the language or the numbers on the card change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myCode, link, discount, months, locale]);

  const register = async () => {
    if (!dep || !codeHex) return;
    if (await tx(t("Register your code"), [{ address: dep.referrals, abi: referralsAbi, functionName: "register", args: [codeHex] }])) refetch();
  };

  const claimable = BigInt(data?.claimableBnb ?? "0");

  return (
    <Page>
      <PageTitle title={t("Referrals")} sub={t("Earn {share} of the Qudao fees your friends pay, forever, in BNB. They pay {discount} less for their first {months} months.", { share, discount, months })} right={<GuideButton id="referrals" />} />

      {!address ? (
        <Card>
          <Empty icon={<Gift className="size-6" />} title={t("Earn {share} of your friends' fees", { share })} action={<ConnectButton size="lg" />}>
            {t("Connect a wallet to get your invite link. It works for any wallet that hasn't used Qudao before.")}
          </Empty>
        </Card>
      ) : !dep ? (
        <Card className="p-6 text-sm text-mute">{t("Referrals open when Qudao's contracts are live.")}</Card>
      ) : (
        <>
          <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
            <Card hi className="p-6">
              <div data-guide="ref-code">
                <CardHeader title={t("Your invite code")} sub={t("Stored on-chain, so your links keep working whatever happens to this website.")} />
                {myCode ? (
                  <div className="mt-5">
                    <div className="num text-5xl font-semibold tracking-wider text-gold-2">{myCode.toUpperCase()}</div>
                    <div className="mt-4 flex items-center gap-2 rounded-xl border border-line bg-ink-2 px-3 py-2">
                      <span className="min-w-0 flex-1 truncate font-mono text-sm text-fg-2">{link}</span>
                      <Button
                        size="sm"
                        variant="soft"
                        onClick={() => {
                          navigator.clipboard.writeText(link);
                          setCopied(true);
                          setTimeout(() => setCopied(false), 1500);
                        }}
                      >
                        {copied ? <Check className="size-4 text-up" /> : <Copy className="size-4" />} {copied ? t("Copied") : t("Copy")}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-5">
                    <label className="flex items-center gap-2 rounded-xl border border-line bg-ink-2 px-3 focus-within:border-gold/50">
                      <input
                        value={code}
                        onChange={(e) => setCode(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8))}
                        placeholder={t("8 letters or digits")}
                        className="num h-12 flex-1 bg-transparent text-xl tracking-widest outline-none placeholder:text-base placeholder:tracking-normal placeholder:text-dim"
                      />
                      <span className="num text-xs text-mute">{code.length}/8</span>
                    </label>
                    <p className={`mt-2 text-xs ${valid && taken.data && taken.data !== zeroAddress ? "text-down" : valid ? "text-up" : "text-mute"}`}>
                      {!valid ? t("Pick exactly 8 characters: a–z and 0–9.") : taken.data && taken.data !== zeroAddress ? t("That code is taken.") : t("Available")}
                    </p>
                    <Button className="mt-4" disabled={!valid || (!!taken.data && taken.data !== zeroAddress)} onClick={register}>
                      {t("Register code")}
                    </Button>
                    <p className="mt-3 text-xs text-mute">{t("One code per wallet, registered once. It costs only the network fee.")}</p>
                  </div>
                )}
              </div>
            </Card>

            <Card className="p-6">
              <CardHeader title={t("Your rewards")} sub={t("Paid in BNB from the fees your invitees pay.")} />
              <div className="mt-5 grid grid-cols-2 gap-5">
                <Stat big label={t("Earned")} value={`${sig(data?.earnedBnb ?? 0, 4)}`} sub={t("BNB, all time")} />
                <Stat big label={t("To claim")} value={<span className="text-up">{sig(Number(claimable) / 1e18, 4)}</span>} sub="BNB" />
              </div>
              <Button
                className="mt-5 w-full"
                size="lg"
                disabled={claimable === 0n}
                onClick={() => tx(t("Claim referral rewards"), [{ address: dep.revenueRouter, abi: revenueRouterAbi, functionName: "claimReferral", args: [data?.feeTokens ?? []] }])}
              >
                {claimable > 0n ? t("Claim") : t("Nothing to claim yet")}
              </Button>
              <ul className="mt-5 space-y-1.5 text-xs text-mute">
                <li>• {t("Only wallets new to Qudao can join with a link, and not your own.")}</li>
                <li>• {t("The link is applied when they open their first position.")}</li>
                <li>• {t("Your share comes out of Qudao's fee, never out of their deposit.")}</li>
              </ul>
            </Card>
          </div>

          {myCode && (
            <Card className="mt-6 p-6">
              <div data-guide="ref-share" className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
                <div>
                  <CardHeader title={t("Share")} sub={t("Post your link or download an image to share anywhere.")} />
                  <div className="mt-5 flex flex-wrap gap-2">
                    <a
                      className="inline-flex h-10 items-center gap-2 rounded-xl border border-line-2 px-4 text-sm font-semibold hover:border-gold/60 hover:text-gold-2"
                      href={`https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(link)}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <XIcon /> {t("Post on X")}
                    </a>
                    <a
                      className="inline-flex h-10 items-center gap-2 rounded-xl border border-line-2 px-4 text-sm font-semibold hover:border-gold/60 hover:text-gold-2"
                      href={`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Send className="size-4" /> Telegram
                    </a>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        const a = document.createElement("a");
                        a.download = `qudao-invite-${myCode}.png`;
                        a.href = canvas.current!.toDataURL("image/png");
                        a.click();
                      }}
                    >
                      <Download className="size-4" /> {t("Download image")}
                    </Button>
                  </div>
                </div>
                <canvas ref={canvas} className="w-full max-w-[480px] rounded-2xl border border-line" />
              </div>
            </Card>
          )}

          <Card className="mt-6 p-6">
            <div data-guide="ref-list">
              <CardHeader title={t("Your invites")} sub={data?.invited.length ? t(data.invited.length > 1 ? "{n} wallets joined with your link." : "{n} wallet joined with your link.", { n: data.invited.length }) : undefined} right={<Users className="size-5 text-gold" />} />
              {data?.invited.length ? (
                <table className="mt-4 w-full text-sm">
                  <thead>
                    <tr className="label text-left">
                      <th className="py-2 font-medium">{t("Wallet")}</th>
                      <th className="py-2 font-medium">{t("Joined")}</th>
                      <th className="py-2 text-right font-medium">{t("You earned")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.invited.map((i) => (
                      <tr key={i.user} className="border-t border-line/70">
                        <td className="py-2.5 font-mono text-xs">{short(i.user, 6)}</td>
                        <td className="py-2.5 text-fg-2">{date(i.joined)}</td>
                        <td className="num py-2.5 text-right">{sig(i.earnedBnb, 4)} BNB</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="mt-4 text-sm text-mute">{t("Nobody has joined with your link yet.")} {myCode ? t("Share it above.") : t("Register a code to get your link.")}</p>
              )}
            </div>
          </Card>
          <p className="mt-4 text-xs text-mute">{t("Rewards are counted in BNB at the time each fee is converted.")}</p>
        </>
      )}
    </Page>
  );
}
