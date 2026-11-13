// Modal dialog and side drawer (portal, Escape to close, scroll lock), animated in and out.
import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { EASE } from "../lib/ease";

const fade = { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.25 } };

function useOverlay(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);
}

export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  wide?: boolean;
}) {
  useOverlay(open, onClose);
  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true">
          <motion.div {...fade} className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, y: 32, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98, transition: { duration: 0.2, ease: "easeIn" } }}
            transition={{ duration: 0.4, ease: EASE }}
            className={`relative max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl border border-line-2 bg-panel p-6 shadow-2xl sm:rounded-3xl ${
              wide ? "sm:max-w-3xl" : "sm:max-w-md"
            }`}
          >
            <div className="mb-5 flex items-center justify-between gap-4">
              <h2 className="text-lg font-semibold">{title}</h2>
              <button onClick={onClose} aria-label="Close" className="rounded-lg p-1 text-mute transition-colors hover:bg-panel-3 hover:text-fg">
                <X className="size-5" />
              </button>
            </div>
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

export function Drawer({ open, onClose, title, children }: { open: boolean; onClose: () => void; title?: ReactNode; children: ReactNode }) {
  useOverlay(open, onClose);
  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true">
          <motion.div {...fade} className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" onClick={onClose} />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%", transition: { duration: 0.25, ease: "easeIn" } }}
            transition={{ duration: 0.45, ease: EASE }}
            className="absolute inset-y-0 right-0 flex w-full max-w-2xl flex-col border-l border-line-2 bg-ink-2 shadow-2xl"
          >
            <div className="flex items-center justify-between gap-4 border-b border-line px-6 py-4">
              <div className="min-w-0 text-lg font-semibold">{title}</div>
              <button onClick={onClose} aria-label="Close" className="rounded-lg p-1 text-mute transition-colors hover:bg-panel-3 hover:text-fg">
                <X className="size-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-6">{children}</div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
