import { AnimatePresence, motion } from "motion/react";
import { CheckCircle2, ExternalLink, Info, Loader2, X, XCircle } from "lucide-react";
import { toast, useToasts } from "../../lib/toast";

const icon = {
  pending: <Loader2 className="size-5 animate-spin text-gold" />,
  success: <CheckCircle2 className="size-5 text-up" />,
  error: <XCircle className="size-5 text-down" />,
  info: <Info className="size-5 text-info" />,
};

export function Toasts() {
  const list = useToasts();
  return (
    <div className="pointer-events-none fixed right-4 bottom-4 z-[90] flex w-[min(380px,calc(100vw-2rem))] flex-col gap-2" aria-live="polite">
      <AnimatePresence initial={false}>
      {list.map((t) => (
        <motion.div
          key={t.id}
          layout
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, x: 60, transition: { duration: 0.2, ease: "easeIn" } }}
          transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
          className="pointer-events-auto flex gap-3 rounded-2xl border border-line-2 bg-panel-2/95 p-4 shadow-2xl backdrop-blur">
          <div className="mt-0.5">{icon[t.kind]}</div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-fg">{t.title}</div>
            {t.body && <div className="mt-0.5 text-sm text-fg-2">{t.body}</div>}
            {t.href && (
              <a href={t.href} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs text-gold-2 hover:underline">
                View on explorer <ExternalLink className="size-3" />
              </a>
            )}
          </div>
          <button onClick={() => toast.dismiss(t.id)} aria-label="Dismiss" className="self-start text-dim hover:text-fg">
            <X className="size-4" />
          </button>
        </motion.div>
      ))}
      </AnimatePresence>
    </div>
  );
}
