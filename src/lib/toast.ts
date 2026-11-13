// Tiny toast store (no library): pending → submitted → confirmed/failed messages for transactions.
import { useSyncExternalStore } from "react";

export type ToastKind = "pending" | "success" | "error" | "info";
export interface Toast {
  id: number;
  kind: ToastKind;
  title: string;
  body?: string;
  href?: string;
}

let toasts: Toast[] = [];
let nextId = 1;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const timers = new Map<number, ReturnType<typeof setTimeout>>();

function schedule(t: Toast) {
  clearTimeout(timers.get(t.id));
  if (t.kind === "success" || t.kind === "info") timers.set(t.id, setTimeout(() => toast.dismiss(t.id), 7000));
  if (t.kind === "error") timers.set(t.id, setTimeout(() => toast.dismiss(t.id), 14000));
}

export const toast = {
  push(t: Omit<Toast, "id">): number {
    const full = { ...t, id: nextId++ };
    toasts = [...toasts.slice(-4), full];
    schedule(full);
    emit();
    return full.id;
  },
  update(id: number, patch: Partial<Omit<Toast, "id">>) {
    toasts = toasts.map((t) => (t.id === id ? { ...t, ...patch } : t));
    const t = toasts.find((x) => x.id === id);
    if (t) schedule(t);
    emit();
  },
  dismiss(id: number) {
    clearTimeout(timers.get(id));
    toasts = toasts.filter((t) => t.id !== id);
    emit();
  },
  info: (title: string, body?: string) => toast.push({ kind: "info", title, body }),
  error: (title: string, body?: string) => toast.push({ kind: "error", title, body }),
};

export function useToasts() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => toasts,
  );
}
