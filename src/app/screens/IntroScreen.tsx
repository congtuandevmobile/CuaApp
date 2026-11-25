import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useRef, useState } from 'react';
import {
  ScrollView,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollViewInstance,
} from 'react-native';
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

/**
 * Three pages the user swipes through (native paging, no JS per frame) or advances with Next. The page index only
 * changes when a swipe settles, so React renders once per page, not on every scroll event.
 */
export function IntroScreen({
  navigation,
}: NativeStackScreenProps<RootStackParamList, 'Intro'>) {
  const { t } = useT();
  const { width } = useWindowDimensions();
  const pager = useRef<ScrollViewInstance>(null);
  const [page, setPage] = useState(0);
  const last = page === PAGES.length - 1;

  const settle = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(e.nativeEvent.contentOffset.x / width);
    if (next !== page) setPage(Math.min(PAGES.length - 1, Math.max(0, next)));
  };

  const goNext = () => {
    if (last) {
      navigation.replace('Welcome');
      return;
    }
    pager.current?.scrollTo({ x: (page + 1) * width, animated: true });
    setPage(page + 1); // the button reacts at once; the settle event then confirms the same page
  };

  return (
    <Screen>
      <View style={styles.top}>
        <AppText variant="caption" tone="tertiary">
          {t('intro.pageOf', { page: page + 1, total: PAGES.length })}
        </AppText>
        <Button
          label={t('common.skip')}
          kind="ghost"
          onPress={() => navigation.replace('Welcome')}
        />
      </View>
      {/* Full-bleed pager: cancels the screen padding so each page is exactly one screen wide. */}
      <ScrollView
        ref={pager}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={settle}
        style={styles.pager}
        accessibilityRole="adjustable"
        accessibilityLabel={t('intro.pageOf', {
          page: page + 1,
          total: PAGES.length,
        })}
      >
        {PAGES.map((p, index) => (
          <View key={p.title} style={[styles.page, { width }]}>
            <View style={styles.art}>
              <IntroArt page={index as 0 | 1 | 2} />
            </View>
            <View style={styles.body}>
              <AppText variant="title">{t(p.title)}</AppText>
              <AppText tone="secondary">{t(p.body)}</AppText>
            </View>
          </View>
        ))}
      </ScrollView>
      <View style={styles.dots} accessible={false}>
        {PAGES.map((p, index) => (
          <View
            key={p.title}
            style={[styles.dot, index === page && styles.dotOn]}
          />
        ))}
      </View>
      <Button
        label={last ? t('intro.getStarted') : t('common.next')}
        onPress={goNext}
      />
    </Screen>
  );
}

const styles = StyleSheet.create(theme => ({
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pager: { flex: 1, marginHorizontal: -theme.layout.screenPadding },
  page: { flex: 1, paddingHorizontal: theme.layout.screenPadding },
  art: { flex: 1, justifyContent: 'center' },
  body: {
    gap: theme.spacing(3),
    paddingBottom: theme.spacing(4),
    minHeight: 150,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: theme.spacing(2),
    paddingBottom: theme.spacing(4),
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.stroke.glass,
  },
  dotOn: { width: 20, backgroundColor: theme.colors.brand.primary },
}));
