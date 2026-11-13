import { MAX_TICK, MIN_TICK, rangeAround } from "./v3";

export const PRESETS = ["1", "2.5", "5", "10", "25", "full"] as const;
export type Preset = (typeof PRESETS)[number] | "custom";

/** Ticks for a ±x% preset (or full range) around `tick`, snapped to the pool's spacing. */
export function presetRange(p: Exclude<Preset, "custom">, tick: number, spacing: number) {
  if (p === "full") return { lower: Math.ceil(MIN_TICK / spacing) * spacing, upper: Math.floor(MAX_TICK / spacing) * spacing };
  const x = Number(p);
  return rangeAround(tick, -x, x, spacing);
}
