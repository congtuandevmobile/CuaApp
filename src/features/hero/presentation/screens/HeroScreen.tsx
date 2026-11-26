import { useNavigation } from '@react-navigation/native';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { controllers } from '@/app/composition/container';
import { accessoryName } from '@/app/i18n/format';
import { useT } from '@/app/i18n/useT';
import { AppText } from '@/core/presentation/components/AppText';
import { Button } from '@/core/presentation/components/Button';
import { GlassCard } from '@/core/presentation/components/GlassCard';
import { ProgressBar } from '@/core/presentation/components/ProgressBar';
import { Screen } from '@/core/presentation/components/Screen';
import { HeroScene } from '@/features/hero/presentation/components/HeroScene';
import {
  accessoryById,
  NONE,
  SLOTS,
  type Slot,
} from '../../domain/accessories';
import { levelOf } from '../../domain/level';
import { AccessoryGlyph } from '../components/AccessoryGlyph';

/**
 * The hero tab: look at the hero, see how far the next level is, see what it wears. Every change happens in the
 * closet: one entry button, or a tap on a worn item opens the closet on that item's tab.
 */
export const HeroScreen = observer(function HeroScreen() {
  const { t, km } = useT();
  const navigation = useNavigation<any>();
  const hero = controllers.hero();
  const h = hero.hero;
  const level = levelOf(hero.progress.totalKm);
  // The stage takes whatever the card, the outfit row and the button leave: tall phones get a bigger hero, short
  // ones keep everything on screen. The 3D view needs a number, so it mounts once the stage is measured.
  const [stageHeight, setStageHeight] = useState(0);
  const worn = SLOTS.filter(slot => (h?.equipment[slot] ?? NONE) !== NONE);

  const openCloset = (slot?: Slot) => {
    if (slot) hero.openSlot(slot);
    navigation.navigate('Closet');
  };

  return (
    <Screen tabBar>
      <View>
        <AppText variant="h2" tone="tertiary">
          {t('hero.yourHero')}
        </AppText>
        <AppText variant="title" numberOfLines={1}>
          {h?.name ?? t('hero.yourHero')}
        </AppText>
      </View>

      <View
        style={styles.stage}
        onLayout={e => {
          const next = Math.round(e.nativeEvent.layout.height);
          if (next !== stageHeight) setStageHeight(next);
        }}
      >
        <View style={styles.blob} pointerEvents="none" />
        {stageHeight > 0 ? (
          <HeroScene hero={h} framed={false} height={stageHeight} idle />
        ) : null}
      </View>
      <AppText variant="caption" tone="tertiary" style={styles.hint}>
        {t('hero.dragHint')}
      </AppText>

      <GlassCard style={styles.levelCard}>
        <View style={styles.levelRow}>
          <AppText variant="h3">
            {t('hero.level', { level: level.level })}
          </AppText>
          <AppText variant="caption" tone="secondary">
            {t('hero.toNext', {
              km: km(level.kmToNext * 1000),
              level: level.level + 1,
            })}
          </AppText>
        </View>
        <ProgressBar value={level.progress} />
        <AppText variant="caption" tone="tertiary">
          {t('hero.totalKm', { km: km(hero.progress.totalKm * 1000) })}
        </AppText>
      </GlassCard>

      <AppText variant="overline" tone="tertiary" style={styles.section}>
        {t('hero.wearing')}
      </AppText>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.outfit}
        contentContainerStyle={styles.outfitRow}
      >
        {h
          ? worn.map(slot => {
              const id = h.equipment[slot];
              const name = accessoryName(
                slot,
                id,
                accessoryById(id, slot)?.name ?? id,
              );
              const slotName = t(`closet.slots.${slot}`);
              return (
                <Pressable
                  key={slot}
                  accessibilityRole="button"
                  accessibilityLabel={t('hero.changeSlot', {
                    slot: slotName,
                    name,
                  })}
                  onPress={() => openCloset(slot)}
                  style={({ pressed }) => [
                    styles.tile,
                    pressed && styles.tilePressed,
                  ]}
                >
                  <AccessoryGlyph slot={slot} id={id} size={28} />
                  <AppText
                    variant="caption"
                    tone="secondary"
                    numberOfLines={1}
                    style={styles.tileText}
                  >
                    {slotName}
                  </AppText>
                </Pressable>
              );
            })
          : null}
      </ScrollView>
    </Screen>
  );
});

const styles = StyleSheet.create(theme => ({
  blob: {
    position: 'absolute',
    width: 240,
    height: 240,
    alignSelf: 'center',
    borderRadius: 120,
    backgroundColor: 'rgba(155,140,255,0.5)',
    filter: [{ blur: 40 }],
  },
  stage: { flex: 1, minHeight: 200, justifyContent: 'center' },
  hint: {
    alignSelf: 'center',
    marginTop: theme.spacing(1),
    marginBottom: theme.spacing(3),
  },
  levelCard: {
    borderRadius: theme.radius.lg,
    paddingVertical: theme.spacing(3),
    paddingHorizontal: theme.spacing(4),
    gap: theme.spacing(2),
  },
  levelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  section: { marginTop: theme.spacing(4) },
  outfit: {
    flexGrow: 0,
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(4),
    marginHorizontal: -theme.layout.screenPadding,
  },
  outfitRow: {
    gap: theme.spacing(2),
    paddingHorizontal: theme.layout.screenPadding,
  },
  tile: {
    width: 68,
    height: 72,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing(1),
    paddingHorizontal: theme.spacing(1),
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  tilePressed: { backgroundColor: 'rgba(255,255,255,0.14)' },
  tileText: { textAlign: 'center' },
}));
