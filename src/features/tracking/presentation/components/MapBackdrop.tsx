import { memo } from 'react';
import { StyleSheet as RNStyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { StyleSheet } from 'react-native-unistyles';

/**
 * The dark map ground of the recording screens: a faint grid only. No route is drawn because the tracker does not hand
 * coordinates to the UI (it keeps them in its on-disk journal), and the app must not invent a path.
 */
export const MapBackdrop = memo(function MapBackdrop() {
  return (
    <View
      pointerEvents="none"
      style={[RNStyleSheet.absoluteFill, styles.ground]}
    >
      <Svg
        width="100%"
        height="100%"
        viewBox="0 0 390 844"
        preserveAspectRatio="xMidYMid slice"
      >
        <Path
          d="M0 120h390M0 220h390M0 320h390M0 420h390M0 520h390M0 620h390M0 720h390M70 0v844M170 0v844M270 0v844M350 0v844"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={1}
        />
      </Svg>
      <View style={[RNStyleSheet.absoluteFill, styles.shade]} />
    </View>
  );
});

const styles = StyleSheet.create(() => ({
  ground: { backgroundColor: '#080B13' },
  shade: {
    experimental_backgroundImage:
      'linear-gradient(180deg, rgba(8,11,19,0.7), rgba(8,11,19,0) 30%, rgba(8,11,19,0) 38%, rgba(8,11,19,0.9) 70%)',
  },
}));
