import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { observer } from 'mobx-react-lite';
import { Pressable, ScrollView, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { controllers } from '@/app/composition/container';
import { AppText } from '@/core/presentation/components/AppText';
import { Backdrop } from '@/core/presentation/components/Backdrop';
import { Button } from '@/core/presentation/components/Button';
import { Chip } from '@/core/presentation/components/Chip';
import { Icon } from '@/core/presentation/components/Icon';
import { IconButton } from '@/core/presentation/components/IconButton';
import { Sheet } from '@/core/presentation/components/Sheet';
import { HeroScene } from '@/features/hero/presentation/components/HeroScene';
import { accessoryName } from '@/app/i18n/format';
import { useT } from '@/app/i18n/useT';
import type { RootStackParamList } from '@/app/navigation/types';
import { accessoriesOf, SLOTS } from '../../domain/accessories';
import { isUnlocked } from '../../domain/Hero';
import { AccessoryGlyph } from '../components/AccessoryGlyph';
import { SKIN_TONES } from '../components/skinTones';

export const ClosetScreen = observer(function ClosetScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'Closet'>) {
  const { t } = useT();
  const { theme } = useUnistyles();
  const insets = useSafeAreaInsets();
  const hero = controllers.hero();
  const h = hero.hero;

  return (
    <View style={styles.root}>
      <Backdrop />
      <View style={[styles.top, { paddingTop: insets.top + 12 }]}>
        <IconButton icon="back" iconSize={24} label={t('common.back')} onPress={() => navigation.goBack()} />
        <AppText variant="h2">{t('closet.title')}</AppText>
        <View style={styles.spacer} />
      </View>
      <View style={styles.stage}>
        <View style={styles.blob} pointerEvents="none" />
        <HeroScene hero={h} rotationDeg={hero.rotationDeg} onRotate={(deg) => hero.rotateTo(deg)} framed={false} height={262} />
        <View style={styles.genders}>
          <Chip label={t('hero.male')} on={h?.gender === 'male'} onPress={() => hero.setGender('male')} />
          <Chip label={t('hero.female')} on={h?.gender === 'female'} onPress={() => hero.setGender('female')} />
        </View>
        <View style={styles.turns}>
          <IconButton icon="back" label={t('hero.turnLeft')} onPress={() => hero.rotateTo(hero.rotationDeg - 25)} />
          <IconButton icon="chevron" label={t('hero.turnRight')} onPress={() => hero.rotateTo(hero.rotationDeg + 25)} />
        </View>
      </View>
      <Sheet style={styles.sheet}>
        <View style={styles.tones}>
          {SKIN_TONES.map((c, i) => (
            <Pressable
              key={c}
              accessibilityRole="button"
              accessibilityState={{ selected: h?.skinTone === i }}
              accessibilityLabel={t('character.skinToneN', { n: i + 1 })}
              hitSlop={6}
              onPress={() => hero.setSkinTone(i)}
              style={[styles.tone, { backgroundColor: c }, h?.skinTone === i && styles.toneOn]}
            />
          ))}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabs} contentContainerStyle={styles.tabsRow}>
          {SLOTS.map((slot) => (
            <Chip key={slot} label={t(`closet.slots.${slot}`)} on={hero.slot === slot} onPress={() => hero.openSlot(slot)} />
          ))}
        </ScrollView>
        <View style={styles.grid}>
          {accessoriesOf(hero.slot).map((a) => {
            const on = h?.equipment[hero.slot] === a.id;
            const locked = !isUnlocked(a.unlock, hero.progress);
            const name = accessoryName(hero.slot, a.id, a.name, h?.gender);
            return (
              <Pressable
                key={a.id}
                accessibilityRole="button"
                accessibilityLabel={locked && a.unlock.type === 'distance' ? t('closet.lockedA11y', { name, km: a.unlock.km }) : name}
                accessibilityState={{ selected: on, disabled: locked }}
                onPress={() => hero.equip(hero.slot, a.id)}
                style={[styles.item, on && styles.itemOn, locked && styles.itemLocked]}
              >
                <AccessoryGlyph slot={hero.slot} id={a.id} />
                <AppText variant="caption" style={on ? styles.itemTextOn : styles.itemText}>{name}</AppText>
                {locked ? (
                  <View style={styles.lock}>
                    <Icon name="lock" size={16} color={theme.colors.text.secondary} />
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>
        {accessoriesOf(hero.slot).some((a) => !isUnlocked(a.unlock, hero.progress)) ? (
          <AppText variant="caption" tone="tertiary" style={styles.center}>
            {hero.errorCode === 'HERO_ACCESSORY_LOCKED' ? t('closet.lockedHint') : t('closet.unlockHint')}
          </AppText>
        ) : null}
        <Button block label={t('closet.wearIt')} onPress={() => navigation.goBack()} />
      </Sheet>
    </View>
  );
});

const styles = StyleSheet.create((theme) => ({
  root: { flex: 1, backgroundColor: theme.colors.background.base },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20 },
  spacer: { width: 44 },
  stage: { height: 280, justifyContent: 'center' },
  blob: { position: 'absolute', width: 220, height: 220, left: '50%', marginLeft: -110, top: 20, borderRadius: 110, backgroundColor: 'rgba(200,255,61,0.28)', filter: [{ blur: 40 }] },
  genders: { position: 'absolute', left: 20, top: 8, gap: theme.spacing(2), alignItems: 'flex-start' },
  turns: { position: 'absolute', right: 20, top: 20, gap: theme.spacing(2) },
  sheet: { flex: 1, gap: theme.spacing(3) },
  tones: { flexDirection: 'row', justifyContent: 'space-between' },
  tone: { width: 36, height: 36, borderRadius: 18, borderWidth: 3, borderColor: 'transparent' },
  toneOn: { borderColor: theme.colors.brand.primary },
  tabs: { flexGrow: 0 },
  tabsRow: { gap: theme.spacing(2) },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  item: {
    width: '31.5%',
    height: 104,
    borderRadius: theme.radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: theme.colors.stroke.hairline,
  },
  itemOn: { borderColor: theme.colors.brand.primary, backgroundColor: 'rgba(200,255,61,0.14)', boxShadow: '0 0 0 3px rgba(200,255,61,0.18)' },
  itemLocked: { opacity: 0.55 },
  itemText: { fontFamily: theme.fonts.bodyMedium, fontSize: 12, lineHeight: 16, color: theme.colors.text.secondary },
  itemTextOn: { fontFamily: theme.fonts.bodyMedium, fontSize: 12, lineHeight: 16, color: theme.colors.text.primary },
  lock: { position: 'absolute', top: 8, right: 8 },
  center: { textAlign: 'center' },
}));
