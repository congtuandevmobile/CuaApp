import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { controllers } from '@/app/composition/container';
import { AppText } from '@/core/presentation/components/AppText';
import { Button } from '@/core/presentation/components/Button';
import { Icon } from '@/core/presentation/components/Icon';
import { Sheet } from '@/core/presentation/components/Sheet';
import { useT } from '@/app/i18n/useT';
import type { RootStackParamList } from '@/app/navigation/types';
import { RECORDABLE_SPORTS } from '../../domain/sports';
import { sportStyle } from '../sportStyle';

/** The first five sports are tiles; the last tile opens the full list. */
const FEATURED = 5;

/** Pick the sport from the record screen. A sheet over the map (transparent modal); picking closes it. */
export const RecordPickerScreen = observer(function RecordPickerScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'RecordPicker'>) {
  const { t, sport } = useT();
  const { theme } = useUnistyles();
  const record = controllers.record();
  const [all, setAll] = useState(false);
  const sports = all ? RECORDABLE_SPORTS : RECORDABLE_SPORTS.slice(0, FEATURED);

  return (
    <View style={styles.root}>
      <Pressable accessibilityRole="button" accessibilityLabel={t('common.cancel')} style={styles.scrim} onPress={() => navigation.goBack()} />
      <Sheet>
        <View style={styles.header}>
          <AppText variant="h2">{t('record.pickerTitle')}</AppText>
        </View>
        <View style={styles.grid}>
          {sports.map((s) => {
            const on = record.sport.code === s.code;
            return (
              <Pressable
                key={s.code}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                onPress={() => {
                  record.pickSport(s);
                  navigation.goBack();
                }}
                style={[styles.tile, on && styles.tileOn]}
              >
                <Icon name={sportStyle(s.code).icon} color={on ? theme.colors.brand.primary : theme.colors.text.secondary} />
                <AppText variant="caption" style={on ? styles.tileTextOn : styles.tileText}>{sport(s.code)}</AppText>
              </Pressable>
            );
          })}
          {all ? null : (
            <Pressable accessibilityRole="button" onPress={() => setAll(true)} style={styles.tile}>
              <Icon name="more" color={theme.colors.text.secondary} />
              <AppText variant="caption" style={styles.tileText}>{t('record.allSports')}</AppText>
            </Pressable>
          )}
        </View>
        <Button block kind="ghost" label={t('common.cancel')} onPress={() => navigation.goBack()} />
      </Sheet>
    </View>
  );
});

const styles = StyleSheet.create((theme) => ({
  root: { flex: 1, justifyContent: 'flex-end' },
  // No dimming: only the sheet appears over the map (tapping outside still closes it).
  scrim: { ...StyleSheet.absoluteFillObject },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: {
    width: '31.5%',
    height: 92,
    borderRadius: theme.radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing(2),
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: theme.colors.stroke.hairline,
  },
  tileOn: { backgroundColor: 'rgba(200,255,61,0.16)', borderColor: theme.colors.brand.primary, boxShadow: '0 0 0 3px rgba(200,255,61,0.18)' },
  tileText: { fontFamily: theme.fonts.bodyMedium, color: theme.colors.text.secondary },
  tileTextOn: { fontFamily: theme.fonts.bodyMedium, color: theme.colors.text.primary },
}));
