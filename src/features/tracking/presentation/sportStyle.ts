import type { IconName } from '@/core/presentation/components/Icon';

type SportKey = 'run' | 'cycle' | 'walk' | 'swim' | 'soccer' | 'other';

const KEY: Record<string, SportKey> = {
  running: 'run',
  cycling: 'cycle',
  walking: 'walk',
  hiking: 'walk',
  swimming: 'swim',
  soccer: 'soccer',
};

const ICON: Record<SportKey, IconName> = { run: 'run', cycle: 'ride', walk: 'walk', swim: 'swim', soccer: 'ball', other: 'spark' };

/** The badge colour key (`theme.colors.sport`) and icon of a sport code. */
export function sportStyle(code: string): { key: SportKey; icon: IconName } {
  const key = KEY[code] ?? 'other';
  return { key, icon: ICON[key] };
}
