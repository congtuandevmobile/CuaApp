import { memo } from 'react';
import Svg, { Circle, G } from 'react-native-svg';

export interface RingValue {
  /** 0..1 */
  readonly value: number;
  readonly color: string;
}

interface Props {
  size: number;
  rings: readonly RingValue[];
  stroke?: number;
  gap?: number;
}

/** Concentric activity rings (`.ring`), outer first. Starts at 12 o'clock. Decorative: callers show the numbers. */
export const Rings = memo(function Rings({
  size,
  rings,
  stroke = 12,
  gap = 6,
}: Props) {
  const c = size / 2;
  return (
    <Svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      accessible={false}
    >
      <G rotation={-90} origin={`${c}, ${c}`}>
        {rings.map((ring, i) => {
          const r = c - stroke / 2 - i * (stroke + gap);
          const circ = 2 * Math.PI * r;
          const v = Math.min(1, Math.max(0, ring.value));
          return (
            <G key={i}>
              <Circle
                cx={c}
                cy={c}
                r={r}
                fill="none"
                stroke="rgba(255,255,255,0.1)"
                strokeWidth={stroke}
              />
              {v > 0 ? (
                <Circle
                  cx={c}
                  cy={c}
                  r={r}
                  fill="none"
                  stroke={ring.color}
                  strokeWidth={stroke}
                  strokeLinecap="round"
                  strokeDasharray={`${circ * v} ${circ}`}
                />
              ) : null}
            </G>
          );
        })}
      </G>
    </Svg>
  );
});
