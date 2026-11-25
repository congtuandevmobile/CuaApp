import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { CuaLogo } from './CuaLogo';
import { GlassSurface } from './GlassSurface';

interface Props {
  /** Outer tile edge in px; the mark fills 64% of it (design: 132 -> 84, 200 -> 130). */
  size?: number;
  label?: string;
}

/** The CUA mark on a glass tile (splash and welcome). */
export function LogoTile({ size = 132, label }: Readonly<Props>) {
  return (
    <GlassSurface
      style={{ width: size, height: size, borderRadius: size * 0.3 }}
    >
      <View style={styles.center}>
        <CuaLogo size={Math.round(size * 0.64)} label={label} />
      </View>
    </GlassSurface>
  );
}

const styles = StyleSheet.create(() => ({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
}));
