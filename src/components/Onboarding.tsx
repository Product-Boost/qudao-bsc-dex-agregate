// First-visit introduction to the app (four short slides), shown once on app pages.
import { useState } from "react";
import { useLocation } from "react-router-dom";
import { Coins, MoveHorizontal, ShieldCheck, Sprout } from "lucide-react";
import { Modal } from "./Modal";
import { Button } from "./ui";
import { useT } from "../i18n";

const KEY = "qudao:onboarded:v1";

const SLIDES = [
  {
    icon: <Sprout className="size-6" />,
    title: "Earn from PancakeSwap trading fees",
    body: "Add tokens to a PancakeSwap v3 pool and you earn part of every swap's fee. A narrow price range earns much more, as long as the price stays inside it.",
  },
  {
    icon: <MoveHorizontal className="size-6" />,
    title: "Qudao keeps your range around the price",
    body: "When the price leaves your range, Qudao moves the range back around it, so your tokens keep earning. You choose how: same width, or one of the dynamic rules.",
  },
  {
    icon: <Coins className="size-6" />,
    title: "Fees reinvested, CAKE farmed",
    body: "Fees can be reinvested automatically (you choose the share) or left to claim. Positions in farm pools also earn CAKE from PancakeSwap's MasterChef.",
  },
  {
    icon: <ShieldCheck className="size-6" />,
    title: "Your vault, your keys",
    body: "Each position is a separate vault contract owned by your wallet. Only you can withdraw, any time, even if Qudao is paused. Automation can only move, collect and reinvest.",
  },
];

const APP_PATHS = /^\/(app|markets|liquidity|dashboard|staking|referrals|token)/;

export function Onboarding() {
  const loc = useLocation();
  const [seen, setSeen] = useState(() => {
    try {
      return localStorage.getItem(KEY) === "1";
    } catch {
      return true;
    }
  });
  const [i, setI] = useState(0);
  const close = () => {
    try {
      localStorage.setItem(KEY, "1");
    } catch {
      /* private mode */
    }
    setSeen(true);
  };
  const { t } = useT();
  if (seen || !APP_PATHS.test(loc.pathname)) return null;
  const s = SLIDES[i];
  return (
    <Modal open onClose={close} title={t("Welcome to Qudao")}>
      <div className="text-center">
        <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-gold/12 text-gold">{s.icon}</div>
        <h3 className="mt-5 text-xl font-semibold">{t(s.title)}</h3>
        <p className="mt-2 text-sm leading-relaxed text-fg-2">{t(s.body)}</p>
        <div className="mt-6 flex justify-center gap-1.5">
          {SLIDES.map((_, j) => (
            <button key={j} aria-label={t("Slide {n}", { n: j + 1 })} onClick={() => setI(j)} className={`h-1.5 rounded-full transition-all ${j === i ? "w-6 bg-gold" : "w-1.5 bg-line-2"}`} />
          ))}
        </div>
        <div className="mt-6 flex justify-between gap-3">
          <Button variant="plain" onClick={close}>
            {t("Skip")}
          </Button>
          <Button onClick={() => (i < SLIDES.length - 1 ? setI(i + 1) : close())}>{i < SLIDES.length - 1 ? t("Next") : t("Get started")}</Button>
        </div>
      </div>
    </Modal>
  );
}
