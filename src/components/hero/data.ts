// The hero chart's story (an illustration, not market data): BNB wanders, and each time it leaves the range,
// Qudao re-centres the range on it. Shared by the three animation variants.

export const W = 560;
export const H = 260;
const N = 96;
const PAD = 14;

/** price level over time: calm, a rally, a pullback, a second rally (eased between levels) */
const LEVELS: [at: number, y: number][] = [
  [0, 184],
  [0.2, 188],
  [0.36, 128],
  [0.48, 124],
  [0.58, 178],
  [0.7, 174],
  [0.88, 100],
  [1, 92],
];
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
function level(t: number) {
  for (let k = 1; k < LEVELS.length; k++) {
    const [t0, y0] = LEVELS[k - 1];
    const [t1, y1] = LEVELS[k];
    if (t <= t1) return y0 + (y1 - y0) * ease((t - t0) / (t1 - t0));
  }
  return LEVELS[LEVELS.length - 1][1];
}

export const PTS: [number, number][] = Array.from({ length: N + 1 }, (_, i) => {
  const t = i / N;
  // gentle wiggle: slow waves only, so the line reads as a calm curve rather than a zigzag
  const noise = 5 * Math.sin(i * 0.62) + 2.2 * Math.sin(i * 1.35 + 1) + 2.5 * Math.sin(i * 0.21 + 2);
  return [PAD + t * (W - 2 * PAD), level(t) + noise];
});

/** a smooth curve through the samples (Catmull-Rom as cubic Béziers) */
function smooth(pts: [number, number][]) {
  const f = (n: number) => n.toFixed(1);
  let d = `M${f(pts[0][0])},${f(pts[0][1])}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[i + 1];
    const p3 = pts[i + 2] ?? pts[i + 1];
    d += `C${f(x1 + (x2 - p0[0]) / 6)},${f(y1 + (y2 - p0[1]) / 6)} ${f(x2 - (p3[0] - x1) / 6)},${f(y2 - (p3[1] - y1) / 6)} ${f(x2)},${f(y2)}`;
  }
  return d;
}

export const LINE_D = smooth(PTS);
export const AREA_D = `${LINE_D}L${PTS[N][0]},${H}L${PTS[0][0]},${H}Z`;

/** half the range height: the price leaving it triggers a move */
export const HALF = 36;
/** where each range is centred (one per move: up, down, up) */
const CENTERS = [186, 128, 176, 110];

export type Band = { i: number; x0: number; x1: number; c: number; dir: 1 | -1 | 0 };
export const BANDS: Band[] = (() => {
  const out: Band[] = [];
  let k = 0;
  let start = 0;
  PTS.forEach(([, y], i) => {
    const leaves = k < CENTERS.length - 1 && Math.abs(y - CENTERS[k]) > HALF;
    if (leaves || i === N) {
      out.push({ i: k, x0: PTS[start][0], x1: PTS[i][0], c: CENTERS[k], dir: k === 0 ? 0 : CENTERS[k - 1] > CENTERS[k] ? 1 : -1 });
      k++;
      start = i;
    }
  });
  return out;
})();

export const X0 = PTS[0][0];
export const X1 = PTS[N][0];

/** the line's height at x (linear between samples) */
export function yAt(x: number) {
  const f = Math.max(0, Math.min(N, ((x - X0) / (X1 - X0)) * N));
  const i = Math.floor(f);
  const j = Math.min(N, i + 1);
  return PTS[i][1] + (PTS[j][1] - PTS[i][1]) * (f - i);
}

/** illustrative BNB price for a height on the chart */
export const priceAt = (y: number) => 520 + (H - y) * 0.75;
export const usd = (n: number) => `$${n.toFixed(2)}`;

/** index of the range the head is in */
export const bandAt = (x: number) => {
  let k = 0;
  for (const b of BANDS) if (x >= b.x0) k = b.i;
  return k;
};
