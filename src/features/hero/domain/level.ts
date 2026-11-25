/** Hero levels come from lifetime distance: every 10 km is one level, starting at level 1. */
export const KM_PER_LEVEL = 10;

export interface Level {
  readonly level: number;
  /** 0..1 towards the next level. */
  readonly progress: number;
  /** Distance still needed for the next level. */
  readonly kmToNext: number;
}

export function levelOf(totalKm: number): Level {
  const km = Math.max(0, totalKm);
  const level = Math.floor(km / KM_PER_LEVEL) + 1;
  const into = km - (level - 1) * KM_PER_LEVEL;
  return {
    level,
    progress: into / KM_PER_LEVEL,
    kmToNext: KM_PER_LEVEL - into,
  };
}
