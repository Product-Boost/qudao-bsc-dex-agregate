// "Explain this page": a step-by-step card that scrolls to and highlights each part of the page.
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { CircleHelp, X } from "lucide-react";
import { GUIDES } from "../data/guides";
import { Button } from "./ui";

export function GuideButton({ id, className = "" }: { id: keyof typeof GUIDES; className?: string }) {
  const [step, setStep] = useState<number | null>(null);
  const steps = GUIDES[id];
  const s = step !== null ? steps[step] : null;

  useEffect(() => {
    if (!s?.target) return;
    const el = document.querySelector<HTMLElement>(`[data-guide="${s.target}"]`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("ring-2", "ring-gold", "ring-offset-4", "ring-offset-ink", "rounded-[var(--radius-card)]");
    return () => el.classList.remove("ring-2", "ring-gold", "ring-offset-4", "ring-offset-ink", "rounded-[var(--radius-card)]");
  }, [s]);

  useEffect(() => {
    if (step === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setStep(null);
      if (e.key === "ArrowRight") setStep((x) => (x !== null && x < steps.length - 1 ? x + 1 : x));
      if (e.key === "ArrowLeft") setStep((x) => (x ? x - 1 : x));
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [step, steps.length]);

  return (
    <>
      <button onClick={() => setStep(0)} className={`inline-flex items-center gap-1.5 rounded-xl border border-line-2 px-3 py-1.5 text-sm text-fg-2 hover:border-gold/50 hover:text-gold-2 ${className}`}>
        <CircleHelp className="size-4" /> Explain this page
      </button>
      {s &&
        createPortal(
          <div className="animate-rise fixed inset-x-4 bottom-4 z-[85] mx-auto max-w-md rounded-2xl border border-gold/40 bg-panel-2 p-5 shadow-[var(--shadow-glow)] sm:bottom-6">
            <div className="flex items-start justify-between gap-3">
              <div className="label text-gold">
                Step {step! + 1} of {steps.length}
              </div>
              <button aria-label="Close" onClick={() => setStep(null)} className="text-mute hover:text-fg">
                <X className="size-4" />
              </button>
            </div>
            <h3 className="mt-2 text-lg font-semibold">{s.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-fg-2">{s.body}</p>
            <div className="mt-4 flex items-center justify-between">
              <div className="flex gap-1">
                {steps.map((_, i) => (
                  <span key={i} className={`h-1.5 rounded-full transition-all ${i === step ? "w-5 bg-gold" : "w-1.5 bg-line-2"}`} />
                ))}
              </div>
              <div className="flex gap-2">
                {step! > 0 && (
                  <Button variant="ghost" size="sm" onClick={() => setStep(step! - 1)}>
                    Back
                  </Button>
                )}
                <Button size="sm" onClick={() => setStep(step! < steps.length - 1 ? step! + 1 : null)}>
                  {step! < steps.length - 1 ? "Next" : "Done"}
                </Button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
