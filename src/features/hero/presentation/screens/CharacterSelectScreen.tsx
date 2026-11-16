import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { observer } from 'mobx-react-lite';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { controllers } from '@/app/composition/container';
import { AppText } from '@/core/presentation/components/AppText';
import { Button } from '@/core/presentation/components/Button';
import { Field } from '@/core/presentation/components/Field';
import { Icon } from '@/core/presentation/components/Icon';
import { Screen } from '@/core/presentation/components/Screen';
import { useT } from '@/app/i18n/useT';
import type { RootStackParamList } from '@/app/navigation/types';
import { Hero, type Gender } from '../../domain/Hero';
import { HeroScene } from '../components/HeroScene';
import { SKIN_TONES } from '../components/skinTones';

/** Step 2 of onboarding: male or female, skin tone, name. One 3D preview (never one canvas per card). */
export const CharacterSelectScreen = observer(function CharacterSelectScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'CharacterSelect'>) {
  const { t, error } = useT();
  const { theme } = useUnistyles();
  const hero = controllers.hero();
  const [gender, setGender] = useState<Gender>('male');
  const [tone, setTone] = useState(1);
  const [name, setName] = useState('');
  const preview = useMemo(() => Hero.create({ name: 'preview', gender, skinTone: tone }), [gender, tone]);

  return (
    <Screen>
      <View style={styles.top}>
        <AppText variant="overline" tone="tertiary">{t('onboarding.step', { step: 2, total: 2 })}</AppText>
        <Button size="sm" kind="ghost" label={t('common.skip')} onPress={() => navigation.replace('Main')} />
      </View>
      <AppText variant="title" style={styles.title}>{t('character.title')}</AppText>
      <AppText tone="secondary">{t('character.subtitle')}</AppText>
      <HeroScene hero={preview} rotationDeg={gender === 'male' ? -14 : 14} framed={false} height={210} />
      <View style={styles.row}>
        {(['male', 'female'] as const).map((g) => (
          <Pressable key={g} accessibilityRole="button" accessibilityState={{ selected: gender === g }} onPress={() => setGender(g)} style={[styles.pick, gender === g && styles.pickOn]}>
            <Icon name="user" color={gender === g ? theme.colors.brand.primary : theme.colors.text.secondary} />
            <AppText variant="h3">{g === 'male' ? t('character.male') : t('character.female')}</AppText>
          </Pressable>
        ))}
      </View>
      <AppText variant="overline" tone="tertiary">{t('character.skinTone')}</AppText>
      <View style={styles.tones}>
        {SKIN_TONES.map((c, i) => (
          <Pressable
            key={c}
            accessibilityRole="button"
            accessibilityState={{ selected: tone === i }}
            accessibilityLabel={t('character.skinToneN', { n: i + 1 })}
            onPress={() => setTone(i)}
            style={[styles.tone, { backgroundColor: c }, tone === i && styles.toneOn]}
          />
        ))}
      </View>
      <Field label={t('character.name')} hideLabel placeholder={t('character.name')} icon="user" value={name} onChangeText={setName} error={hero.errorCode === 'HERO_NAME_REQUIRED' ? error(hero.errorCode) : undefined} />
      <View style={styles.grow} />
      <Button
        block
        label={gender === 'male' ? t('character.startMale') : t('character.startFemale')}
        onPress={() => {
          if (hero.create({ name, gender, skinTone: tone })) navigation.replace('Main');
        }}
      />
    </Screen>
  );
});

const styles = StyleSheet.create((theme) => ({
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 30, lineHeight: 36, marginBottom: theme.spacing(2) },
  row: { flexDirection: 'row', gap: theme.spacing(3), marginBottom: theme.spacing(4) },
  pick: { flex: 1, height: 64, borderRadius: 30, flexDirection: 'row', gap: theme.spacing(2), borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)', backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
  pickOn: { borderColor: theme.colors.brand.primary, backgroundColor: 'rgba(200,255,61,0.12)', boxShadow: '0 0 0 3px rgba(200,255,61,0.18)' },
  tones: { flexDirection: 'row', justifyContent: 'space-between', marginTop: theme.spacing(2), marginBottom: theme.spacing(4) },
  tone: { width: 44, height: 44, borderRadius: 22, borderWidth: 3, borderColor: 'transparent' },
  toneOn: { borderColor: theme.colors.brand.primary },
  grow: { flex: 1 },
}));
