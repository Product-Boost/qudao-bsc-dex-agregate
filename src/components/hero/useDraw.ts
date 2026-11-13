// The drawing head of the hero chart: an x position that travels from the left edge to the right one.
// Everything else (line, ranges, labels, cards) is derived from it, so they stay in step.
import { useEffect, useRef, useState } from "react";
import { animate, useMotionValue, useMotionValueEvent, useReducedMotion, type MotionValue } from "motion/react";
import { bandAt, X0, X1 } from "./data";

type Opts = { duration?: number; delay?: number };

/** `play` starts it, a new `run` restarts it. */
export function useHead(play: boolean, run: number, { duration = 4.6, delay = 0.35 }: Opts = {}): MotionValue<number> {
  const head = useMotionValue(X0);
  const reduce = useReducedMotion();
  useEffect(() => {
    if (reduce) {
      head.set(X1);
      return;
    }
    head.set(X0);
    if (!play) return;
    const c = animate(head, X1, { duration, delay, ease: [0.3, 0.05, 0.25, 1] });
    return () => c.stop();
  }, [play, run, reduce, head, duration, delay]);
  return head;
}

/** Which range the head is in, whether it just moved, and whether it has finished (state, for things that appear in steps). */
export function useStage(head: MotionValue<number>, movingFor = 1000) {
  const [stage, setStage] = useState(() => bandAt(head.get()));
  const [done, setDone] = useState(() => head.get() >= X1 - 0.5);
  const [moving, setMoving] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  useMotionValueEvent(head, "change", (x) => {
    const k = bandAt(x);
    if (k !== stage) {
      setStage(k);
      clearTimeout(timer.current);
      if (k > stage) {
        setMoving(true);
        timer.current = setTimeout(() => setMoving(false), movingFor);
      } else setMoving(false);
    }
    const d = x >= X1 - 0.5;
    if (d !== done) setDone(d);
  });
  return { stage, done, moving };
}
