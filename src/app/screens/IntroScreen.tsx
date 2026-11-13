import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { AppText } from '../../core/presentation/components/AppText';
import { Button } from '../../core/presentation/components/Button';
import { Screen } from '../../core/presentation/components/Screen';
import { useT } from '../i18n/useT';
import { IntroArt } from './IntroArt';
import type { RootStackParamList } from '../navigation/types';

const PAGES = [
  { title: 'intro.p1Title', body: 'intro.p1Body' },
  { title: 'intro.p2Title', body: 'intro.p2Body' },
  { title: 'intro.p3Title', body: 'intro.p3Body' },
] as const;

export function IntroScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'Intro'>) {
  const { t } = useT();
  const [page, setPage] = useState(0);
  const last = page === PAGES.length - 1;
  const current = PAGES[page]!;
  return (
    <Screen>
      <View style={styles.top}>
        <AppText variant="caption" tone="tertiary">
          {t('intro.pageOf', { page: page + 1, total: PAGES.length })}
        </AppText>
        <Button label={t('common.skip')} kind="ghost" onPress={() => navigation.replace('Welcome')} />
      </View>
      <View style={styles.art}>
        <IntroArt page={page as 0 | 1 | 2} />
      </View>
      <View style={styles.body}>
        <AppText variant="title">{t(current.title)}</AppText>
        <AppText tone="secondary">{t(current.body)}</AppText>
      </View>
      <Button label={last ? t('intro.getStarted') : t('common.next')} onPress={() => (last ? navigation.replace('Welcome') : setPage(page + 1))} />
    </Screen>
  );
}

const styles = StyleSheet.create((theme) => ({
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  art: { flex: 1, justifyContent: 'center' },
  body: { gap: theme.spacing(3), paddingBottom: theme.spacing(4), minHeight: 150 },
}));
