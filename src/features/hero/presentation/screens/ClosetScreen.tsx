import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { observer } from 'mobx-react-lite';
import { useEffect } from 'react';
import { Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
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
import { SLOTS } from '../../domain/accessories';
import { isUnlocked } from '../../domain/Hero';
import { AccessoryGlyph } from '../components/AccessoryGlyph';
import { SKIN_TONES } from '../components/skinTones';

/**
 * Closet: pick a category, pick an item. The stage first shows the item alone (swipe to turn it, it eases back to the
 * front on release), "Try on" shows the hero wearing it, "Wear" saves it. Leaving drops an unsaved try-on.
 */
export const ClosetScreen = observer(function ClosetScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'Closet'>) {
  const { t } = useT();
  const { theme } = useUnistyles();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const hero = controllers.hero();
  const h = hero.hero;
  const slot = hero.slot;
  const worn = h?.equipment[slot];
  // short phones keep at least one row of items visible under the stage
  const stageHeight = Math.round(Math.min(STAGE_MAX, Math.max(STAGE_MIN, windowHeight * 0.32)));
  const anyLocked = hero.items.some((a) => !isUnlocked(a.unlock, hero.progress));

  useEffect(() => () => hero.resetCloset(), [hero]);

  return (
    <View style={styles.root}>
      <Backdrop />
      <View style={[styles.top, { paddingTop: insets.top + 12 }]}>
        <IconButton icon="back" iconSize={24} label={t('common.back')} onPress={() => navigation.goBack()} />
        <AppText variant="h2">{t('closet.title')}</AppText>
        <View style={styles.spacer} />
      </View>
      <View style={{ height: stageHeight }}>
        <View style={styles.blob} pointerEvents="none" />
        <HeroScene hero={h} equipment={hero.preview} focus={hero.focusSlot} framed={false} height={stageHeight - HINT_SPACE} />
        <View style={styles.genders}>
          <Chip label={t('hero.male')} on={h?.gender === 'male'} onPress={() => hero.setGender('male')} />
          <Chip label={t('hero.female')} on={h?.gender === 'female'} onPress={() => hero.setGender('female')} />
        </View>
        <View style={styles.views}>
          {hero.canShowItem ? <Chip label={t('closet.viewItem')} on={hero.showingItem} onPress={() => hero.showItem()} /> : null}
          <Chip label={t('closet.tryOn')} on={!hero.showingItem} onPress={() => hero.tryOn()} />
        </View>
        <View style={styles.hint} pointerEvents="none">
          <AppText variant="caption" tone="tertiary" style={styles.center}>{t('closet.turnHint')}</AppText>
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
          {SLOTS.map((s) => (
            <Chip key={s} label={t(`closet.slots.${s}`)} on={slot === s} onPress={() => hero.openSlot(s)} />
          ))}
        </ScrollView>
        <ScrollView style={styles.list} contentContainerStyle={styles.grid} showsVerticalScrollIndicator={false}>
          {hero.items.map((a) => {
            const on = hero.shownId === a.id;
            const locked = !isUnlocked(a.unlock, hero.progress);
            const name = accessoryName(slot, a.id, a.name);
            const label = worn === a.id ? `${name}, ${t('closet.wearing')}` : name;
            return (
              <Pressable
                key={a.id}
                accessibilityRole="button"
                accessibilityLabel={locked && a.unlock.type === 'distance' ? t('closet.lockedA11y', { name, km: a.unlock.km }) : label}
                accessibilityState={{ selected: on, disabled: locked }}
                disabled={locked}
                onPress={() => hero.select(a.id)}
                style={[styles.item, on && styles.itemOn, locked && styles.itemLocked]}
              >
                <AccessoryGlyph slot={slot} id={a.id} />
                <AppText variant="caption" tone={on ? 'primary' : 'secondary'} numberOfLines={2} style={styles.itemText}>{name}</AppText>
                {worn === a.id ? <View style={styles.wornDot} /> : null}
                {locked ? (
                  <View style={styles.lock}>
                    <Icon name="lock" size={16} color={theme.colors.text.secondary} />
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </ScrollView>
        {anyLocked ? (
          <AppText variant="caption" tone="tertiary" style={styles.center}>
            {hero.errorCode === 'HERO_ACCESSORY_LOCKED' ? t('closet.lockedHint') : t('closet.unlockHint')}
          </AppText>
        ) : null}
        <Button block label={hero.isShownWorn ? t('closet.wearing') : t('closet.wear')} disabled={hero.isShownWorn} onPress={() => hero.wear()} />
      </Sheet>
    </View>
  );
});

/** Stage height bounds (px) and the space under the canvas kept for the turn hint. */
const STAGE_MIN = 210;
const STAGE_MAX = 300;
const HINT_SPACE = 24;

const styles = StyleSheet.create((theme) => ({
  root: { flex: 1, backgroundColor: theme.colors.background.base },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20 },
  spacer: { width: 44 },
  blob: { position: 'absolute', width: 220, height: 220, left: '50%', marginLeft: -110, top: 30, borderRadius: 110, backgroundColor: 'rgba(200,255,61,0.28)', filter: [{ blur: 40 }] },
  genders: { position: 'absolute', left: 20, top: 8, gap: theme.spacing(2), alignItems: 'flex-start' },
  views: { position: 'absolute', right: 20, top: 8, gap: theme.spacing(2), alignItems: 'flex-end' },
  hint: { position: 'absolute', bottom: 2, left: 0, right: 0 },
  center: { textAlign: 'center' },
  sheet: { flex: 1, gap: theme.spacing(3) },
  tones: { flexDirection: 'row', justifyContent: 'space-between' },
  tone: { width: 36, height: 36, borderRadius: 18, borderWidth: 3, borderColor: 'transparent' },
  toneOn: { borderColor: theme.colors.brand.primary },
  tabs: { flexGrow: 0 },
  tabsRow: { gap: theme.spacing(2) },
  list: { flex: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing(2), paddingBottom: theme.spacing(2) },
  item: {
    width: '31%', // 3 per row from 320 px: 3 x 31% + 2 gaps of 8 px fit the 335 px content width at 375
    height: 104,
    borderRadius: theme.radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing(1),
    paddingHorizontal: theme.spacing(1),
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: theme.colors.stroke.hairline,
  },
  itemOn: { borderColor: theme.colors.brand.primary, backgroundColor: 'rgba(200,255,61,0.14)', boxShadow: '0 0 0 3px rgba(200,255,61,0.18)' },
  itemLocked: { opacity: 0.55 },
  itemText: { textAlign: 'center' },
  wornDot: { position: 'absolute', top: theme.spacing(2), left: theme.spacing(2), width: theme.spacing(2), height: theme.spacing(2), borderRadius: theme.spacing(1), backgroundColor: theme.colors.brand.primary },
  lock: { position: 'absolute', top: theme.spacing(2), right: theme.spacing(2) },
}));
