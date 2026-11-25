import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Path,
  Stop,
} from 'react-native-svg';

type Props = {
  size?: number;
  /** `gradient` on dark backgrounds, `mono` (one colour) on volt or white. Under 64 px the speed lines are dropped. */
  variant?: 'gradient' | 'mono';
  monoColor?: string;
  /** Accessible name (translated by the caller). Omit it for a purely decorative logo. */
  label?: string;
};

/** The CUA mark (a "C" that is also a crab claw), drawn from `assets/brand/cua-mark.svg`. */
export function CuaLogo({
  size = 96,
  variant = 'gradient',
  monoColor = '#0B1300',
  label,
}: Readonly<Props>) {
  const mono = variant === 'mono';
  const stroke = mono ? monoColor : 'url(#cuaGradient)';
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      accessibilityRole="image"
      accessibilityLabel={label}
      accessible={label !== undefined}
    >
      <Defs>
        <LinearGradient id="cuaGradient" x1="0" y1="1" x2="1" y2="0">
          <Stop offset="0" stopColor="#C8FF3D" />
          <Stop offset="1" stopColor="#4FD8FF" />
        </LinearGradient>
      </Defs>
      <Path
        d="M76 26A34 34 0 1 0 76 74"
        fill="none"
        stroke={stroke}
        strokeWidth={15}
        strokeLinecap="round"
      />
      <Circle cx={76} cy={26} r={8} fill={mono ? monoColor : '#4FD8FF'} />
      <Circle cx={76} cy={74} r={8} fill={mono ? monoColor : '#C8FF3D'} />
      {size >= 64 && (
        <Path
          d="M58 42h22M52 50h30M58 58h22"
          stroke={mono ? monoColor : '#F4F6FB'}
          strokeWidth={5}
          strokeLinecap="round"
        />
      )}
    </Svg>
  );
}
