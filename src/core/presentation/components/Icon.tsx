import { memo } from 'react';
import Svg, { Path } from 'react-native-svg';

/** Stroke icons from the design (`stride.css` `.i`: 24 px box, 1.8 stroke, round caps). One path per name. */
const PATHS = {
  home: 'M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  activity: 'M3 12h4l3-8 4 16 3-8h4',
  spark: 'M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2z',
  user: 'M16 8a4 4 0 1 1-8 0 4 4 0 0 1 8 0zM4 21c0-4 4-6 8-6s8 2 8 6',
  heart: 'M12 21s-7-4.5-9-9a5 5 0 0 1 9-3 5 5 0 0 1 9 3c-2 4.5-9 9-9 9z',
  bolt: 'M13 2L4 14h7l-1 8 9-12h-7z',
  back: 'M15 18l-6-6 6-6',
  chevron: 'M9 6l6 6-6 6',
  sync: 'M4 4v5h5M20 20v-5h-5M5 9a8 8 0 0 1 14-2M19 15a8 8 0 0 1-14 2',
  mail: 'M6 5h12a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V8a3 3 0 0 1 3-3zM4 7l8 6 8-6',
  lock: 'M8 11h8a3 3 0 0 1 3 3v4a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3v-4a3 3 0 0 1 3-3zM8 11V8a4 4 0 0 1 8 0v3',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0z',
  eyeOff: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM4 4l16 16',
  pin: 'M12 21s7-6 7-12a7 7 0 0 0-14 0c0 6 7 12 7 12zM14.5 9a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z',
  bell: 'M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8M10 20a2 2 0 0 0 4 0',
  check: 'M5 13l4 4L19 7',
  run: 'M17 5a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM8 21l3-6 3 2 2-5-3-3-3 1-3 3M14 12l4 2',
  ride: 'M10 16a4 4 0 1 1-8 0 4 4 0 0 1 8 0zM22 16a4 4 0 1 1-8 0 4 4 0 0 1 8 0zM6 16l4-7h5l3 7M10 9l3 7',
  walk: 'M15 5a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM9 21l2-7 3 2v5M11 14l-1-5 4-1 2 4',
  ball: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0zM12 8l3 2-1 4h-4l-1-4z',
  swim: 'M18 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM3 17c2-2 4 2 6 0s4 2 6 0 4 2 6 0M5 13l5-3 3 2',
  more: 'M6.5 12a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zM13.5 12a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zM20.5 12a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z',
  phone: 'M9 3h6a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4zM10 7h4',
  share: 'M12 3v12M7 8l5-5 5 5M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5',
  hanger: 'M12 6a2 2 0 1 1 2 2c-1 .5-2 1-2 2v1M3 18l9-6 9 6z',
  signOut: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
  cloud: 'M7 18a4 4 0 0 1-.5-8A6 6 0 0 1 18 9a4 4 0 0 1 0 9z',
  trophy: 'M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3',
  globe: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0zM3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18',
  ruler: 'M3 12h4l3-8 4 16 3-8h4',
  none: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0zM5.6 5.6l12.8 12.8',
  close: 'M6 6l12 12M18 6L6 18',
} as const;

/** Solid glyphs (fill, no stroke): media controls and the Apple mark. */
const SOLID = {
  pause: 'M7.5 5h1.5a1.5 1.5 0 0 1 1.5 1.5v11A1.5 1.5 0 0 1 9 19H7.5A1.5 1.5 0 0 1 6 17.5v-11A1.5 1.5 0 0 1 7.5 5zM15 5h1.5A1.5 1.5 0 0 1 18 6.5v11a1.5 1.5 0 0 1-1.5 1.5H15a1.5 1.5 0 0 1-1.5-1.5v-11A1.5 1.5 0 0 1 15 5z',
  play: 'M8 5l11 7-11 7z',
  stop: 'M9 6h6a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3V9a3 3 0 0 1 3-3z',
  apple:
    'M16.4 12.6c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.1-2.8.9-3.5.9s-1.8-.8-3-.8c-1.5 0-3 .9-3.8 2.3-1.6 2.8-.4 7 1.2 9.3.8 1.1 1.7 2.4 2.9 2.3 1.2 0 1.6-.8 3-.8s1.8.8 3 .7c1.3 0 2.1-1.1 2.8-2.3.9-1.3 1.3-2.6 1.3-2.6-.1 0-2.5-1-2.5-3.7zM14.2 5.8c.6-.8 1.1-1.8.9-2.8-.9 0-2 .6-2.6 1.4-.6.7-1.1 1.7-.9 2.7 1 .1 2-.5 2.6-1.3z',
} as const;

export type IconName = keyof typeof PATHS | keyof typeof SOLID;

interface Props {
  name: IconName;
  size?: number;
  color: string;
  strokeWidth?: number;
}

/** Decorative by default: the control that holds it carries the accessible name. */
export const Icon = memo(function Icon({ name, size = 24, color, strokeWidth = 1.8 }: Props) {
  const solid = name in SOLID;
  const d = solid ? SOLID[name as keyof typeof SOLID] : PATHS[name as keyof typeof PATHS];
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessible={false} pointerEvents="none">
      <Path
        d={d}
        fill={solid ? color : 'none'}
        stroke={solid ? 'none' : color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
});
