import { useNavigation } from '@react-navigation/native';
import { observer } from 'mobx-react-lite';
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
import { accessoryById, NONE } from '../../domain/accessories';
import { QUICK_WATCH } from '../HeroController';
import { levelOf } from '../../domain/level';


export const HeroScreen = observer(function HeroScreen() {
  const { t, km } = useT();
  const navigation = useNavigation<any>();
  const hero = controllers.hero();
  const h = hero.hero;
  const level = levelOf(hero.progress.totalKm);
  // the feet chip names what is on the feet: sandals when worn, else the shoes (or barefoot)
  const sandals = h?.equipment.sandals ?? NONE;
  const feetSlot = sandals !== NONE ? 'sandals' : 'shoes';
  const feet = sandals !== NONE ? sandals : (h?.equipment.shoes ?? NONE);
  const shoeName = accessoryName(feetSlot, feet, accessoryById(feet, feetSlot)?.name ?? feet);
  const watchName = accessoryName('watch', QUICK_WATCH, accessoryById(QUICK_WATCH, 'watch')?.name ?? QUICK_WATCH);

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
        <HeroScene hero={h} framed={false} height={380} idle />
      </View>
      <GlassCard style={styles.hint}>
        <AppText variant="caption" tone="secondary">{t('hero.dragHint')}</AppText>
      </GlassCard>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quick} contentContainerStyle={styles.quickRow}>
        <Chip label={watchName} on={h?.equipment.watch === QUICK_WATCH} onPress={() => hero.toggleQuickWatch()} />
        <Chip label={t('hero.shoes', { name: shoeName })} onPress={() => hero.cycleShoes()} />
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
  hint: { borderRadius: theme.radius.xl, paddingVertical: theme.spacing(3), paddingHorizontal: theme.spacing(4) },
  quick: { flexGrow: 0, marginTop: theme.spacing(3), marginRight: -theme.layout.screenPadding },
  quickRow: { gap: theme.spacing(2), paddingRight: theme.layout.screenPadding },
}));
