import { useNavigation } from '@react-navigation/native';
import { observer } from 'mobx-react-lite';
import { useCallback } from 'react';
import { ScrollView, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { controllers } from '@/app/composition/container';
import { accessoryName } from '@/app/i18n/format';
import { useT } from '@/app/i18n/useT';
import { AppText } from '@/core/presentation/components/AppText';
import { Chip } from '@/core/presentation/components/Chip';
import { GlassCard } from '@/core/presentation/components/GlassCard';
import { IconButton } from '@/core/presentation/components/IconButton';
import { Screen } from '@/core/presentation/components/Screen';
import { HeroScene } from '@/features/hero/presentation/components/HeroScene';
import { accessoriesOf, accessoryById, type Slot } from '../../domain/accessories';
import { isUnlocked } from '../../domain/Hero';
import { levelOf } from '../../domain/level';

/** One tap puts an item on, a second takes it off (back to "none"). */
const QUICK: readonly { slot: Slot; id: string }[] = [
  { slot: 'watch', id: 'smart' },
  { slot: 'hair', id: 'style1' },
];

export const HeroScreen = observer(function HeroScreen() {
  const { t, km } = useT();
  const navigation = useNavigation<any>();
  const hero = controllers.hero();
  const h = hero.hero;
  const level = levelOf(hero.progress.totalKm);
  const commitRotation = useCallback((rotationDeg: number) => hero.rotateTo(rotationDeg), [hero]);
  const shoes = accessoriesOf('shoes').filter((a) => a.id !== 'none' && isUnlocked(a.unlock, hero.progress));
  const shoe = h?.equipment.shoes ?? 'daily';
  const nextShoe = () => {
    const i = shoes.findIndex((a) => a.id === shoe);
    const next = shoes[(i + 1) % shoes.length];
    if (next) hero.equip('shoes', next.id);
  };

  return (
    <Screen tabBar>
      <View style={styles.blob} pointerEvents="none" />
      <View style={styles.header}>
        <View style={styles.grow}>
          <AppText variant="overline" tone="tertiary">{t('hero.levelNext', { level: level.level, km: km(level.kmToNext * 1000) })}</AppText>
          <AppText variant="title">{h?.name ?? t('hero.yourHero')}</AppText>
        </View>
        <IconButton icon="hanger" label={t('hero.closet')} onPress={() => navigation.navigate('Closet')} />
      </View>
      <View style={styles.genders}>
        <Chip label={t('hero.male')} on={h?.gender === 'male'} onPress={() => hero.setGender('male')} />
        <Chip label={t('hero.female')} on={h?.gender === 'female'} onPress={() => hero.setGender('female')} />
      </View>
      <View style={styles.stage}>
        <HeroScene hero={h} rotationDeg={hero.rotationDeg} onRotate={commitRotation} framed={false} height={380} idle />
      </View>
      <GlassCard style={styles.rotate}>
        <IconButton icon="back" label={t('hero.turnLeft')} onPress={() => hero.rotateTo(hero.rotationDeg - 30)} />
        <AppText variant="caption" tone="secondary" style={styles.grow}>{t('hero.dragHint')}</AppText>
        <View style={styles.tag}>
          <AppText style={styles.tagText}>{`${Math.round(hero.rotationDeg)}°`}</AppText>
        </View>
        <IconButton icon="chevron" label={t('hero.turnRight')} onPress={() => hero.rotateTo(hero.rotationDeg + 30)} />
      </GlassCard>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quick} contentContainerStyle={styles.quickRow}>
        {QUICK.map((q) => {
          const on = h?.equipment[q.slot] === q.id;
          return (
            <Chip key={q.slot} label={accessoryName(q.slot, q.id, accessoryById(q.id, q.slot)?.name ?? q.id, h?.gender)} on={on} onPress={() => hero.equip(q.slot, on ? 'none' : q.id)} />
          );
        })}
        <Chip label={t('hero.shoes', { name: accessoryName('shoes', shoe, shoe) })} onPress={nextShoe} />
      </ScrollView>
    </Screen>
  );
});

const styles = StyleSheet.create((theme) => ({
  blob: { position: 'absolute', width: 260, height: 260, left: 70, top: 190, borderRadius: 130, backgroundColor: 'rgba(155,140,255,0.5)', filter: [{ blur: 40 }] },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  grow: { flex: 1 },
  genders: { flexDirection: 'row', justifyContent: 'center', gap: theme.spacing(2), marginTop: theme.spacing(3) },
  stage: { flex: 1, justifyContent: 'center' },
  rotate: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing(2), borderRadius: 26, paddingVertical: 8, paddingHorizontal: 8 },
  tag: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: 'rgba(79,216,255,0.3)', backgroundColor: 'rgba(79,216,255,0.12)' },
  tagText: { fontFamily: theme.fonts.mono, fontSize: 11, lineHeight: 14, color: theme.colors.brand.cyan },
  quick: { flexGrow: 0, marginTop: theme.spacing(3), marginRight: -theme.layout.screenPadding },
  quickRow: { gap: theme.spacing(2), paddingRight: theme.layout.screenPadding },
}));
