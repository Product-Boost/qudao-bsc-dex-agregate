// Fixed data for the "How it works" scenes: a made-up price path and the ranges a position would have had.
export const W = 640;
export const H = 400; // scenes are drawn in a 16:10 frame

const LEVELS = [215, 150, 228, 158]; // where the price settles in each stretch: three range moves
const N = 72;
const easeInOut = (t: number) => 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, Math.max(0, t)));

export const PRICE = (() => {
  const seg = N / LEVELS.length;
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i <= N; i++) {
    const k = Math.min(LEVELS.length - 1, Math.floor(i / seg));
    const prev = k === 0 ? LEVELS[0] : LEVELS[k - 1];
    const base = prev + (LEVELS[k] - prev) * easeInOut((i - k * seg) / (seg * 0.3));
    // slow waves only, so it reads as a calm curve rather than a zigzag
    const noise = 8 * Math.sin(i * 0.55) + 3.5 * Math.sin(i * 1.2 + 1) + 4 * Math.sin(i * 0.21);
    pts.push({ x: 24 + (i / N) * (W - 48), y: base + noise });
  }
  return pts;
})();
/** a smooth curve through the samples (Catmull-Rom as cubic Béziers) */
export const PRICE_D = (() => {
  const f = (n: number) => n.toFixed(1);
  let d = `M${f(PRICE[0].x)},${f(PRICE[0].y)}`;
  for (let i = 0; i < PRICE.length - 1; i++) {
    const p0 = PRICE[i - 1] ?? PRICE[i];
    const p1 = PRICE[i];
    const p2 = PRICE[i + 1];
    const p3 = PRICE[i + 2] ?? p2;
    d += `C${f(p1.x + (p2.x - p0.x) / 6)},${f(p1.y + (p2.y - p0.y) / 6)} ${f(p2.x - (p3.x - p1.x) / 6)},${f(p2.y - (p3.y - p1.y) / 6)} ${f(p2.x)},${f(p2.y)}`;
  }
  return d;
})();

/** The point on the line a fraction `t` (0 → 1) of the way along, between samples too (so the head glides). */
export function pointAt(t: number) {
  const f = Math.max(0, Math.min(1, t)) * (PRICE.length - 1);
  const i = Math.floor(f);
  const a = PRICE[i];
  const b = PRICE[Math.min(PRICE.length - 1, i + 1)];
  return { x: a.x + (b.x - a.x) * (f - i), y: a.y + (b.y - a.y) * (f - i) };
}
/** Half the height of a range box; the price leaves the box when it's this far from the box's middle. */
export const BAND_HALF = 50;
export const BANDS = (() => {
  const out: { x0: number; x1: number; c: number }[] = [];
  let c = PRICE[0].y;
  let start = 0;
  PRICE.forEach((p, i) => {
    if (Math.abs(p.y - c) > BAND_HALF || i === PRICE.length - 1) {
      out.push({ x0: PRICE[start].x, x1: p.x, c });
      c = p.y;
      start = i;
    }
  });
  return out;
})();

/** How far along the price path the "Kept in range" scene is drawn for a given progress through that step. */
export const headAt = (local: number) => Math.max(0, Math.min(1, (local - 0.02) / 0.9));

/** Range moves that have happened by the time the line reaches `t` (0 → 1). */
export function movesAt(t: number) {
  const x = PRICE[Math.round(t * (PRICE.length - 1))].x;
  return BANDS.slice(1).filter((b) => b.x0 <= x).length;
}
export const RANGE_MOVES = BANDS.length - 1;

