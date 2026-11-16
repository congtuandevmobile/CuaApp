import { useNavigation } from '@react-navigation/native';
import { observer } from 'mobx-react-lite';
import { Fragment, type ReactNode } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { controllers } from '@/app/composition/container';
import { isGuest } from '@/features/auth/domain/Session';
import { levelOf } from '@/features/hero/domain/level';
import { NATIVE_NAMES, SUPPORTED_LOCALES } from '@/features/localization/domain/Locale';
import { AppText } from '../../core/presentation/components/AppText';
import { Badge } from '../../core/presentation/components/Badge';
import { Chip } from '../../core/presentation/components/Chip';
import { GlassCard } from '../../core/presentation/components/GlassCard';
import { GlassSurface } from '../../core/presentation/components/GlassSurface';
import { Icon, type IconName } from '../../core/presentation/components/Icon';
import { Screen } from '../../core/presentation/components/Screen';
import { useT } from '../i18n/useT';

interface Item {
  icon: IconName;
  color: string;
  label: string;
  value?: string;
  danger?: boolean;
  onPress?: () => void;
  /** Extra content under the row (the language chips). */
  below?: ReactNode;
}

/** `.li` rows inside one glass group, hairlines between them. */
function Group({ items }: { items: readonly Item[] }) {
  const { theme } = useUnistyles();
  return (
    <GlassSurface style={styles.group}>
      {items.map((it, i) => (
        <Fragment key={it.label}>
          {i > 0 ? <View style={styles.hair} /> : null}
          <Pressable accessibilityRole={it.onPress ? 'button' : undefined} disabled={!it.onPress} onPress={it.onPress} style={styles.li}>
            <View style={styles.liIcon}>
              <Icon name={it.icon} size={18} color={it.color} />
            </View>
            <AppText style={[styles.grow, it.danger ? { color: theme.colors.status.danger } : null]}>{it.label}</AppText>
            {it.value ? <AppText variant="caption" tone="tertiary">{it.value}</AppText> : null}
            {it.onPress && !it.danger ? <Icon name="chevron" size={18} color={theme.colors.text.tertiary} /> : null}
          </Pressable>
          {it.below}
        </Fragment>
      ))}
    </GlassSurface>
  );
}

export const ProfileScreen = observer(function ProfileScreen() {
  const { t } = useT();
  const { theme } = useUnistyles();
  const navigation = useNavigation<any>();
  const auth = controllers.auth();
  const language = controllers.locale();
  const health = controllers.health();
  const record = controllers.record();
  const heroCtl = controllers.hero();
  const session = auth.session;
  const guest = !session || isGuest(session);
  const level = levelOf(heroCtl.progress.totalKm).level;
  const account = session && !isGuest(session) ? session : undefined;
  /** `@username · #ABC314 · Level 2` (no code for a session saved before codes existed). */
  const subtitle = !account
    ? t('profile.localOnlyLevel', { level })
    : account.code
      ? t('profile.usernameCodeLevel', { username: account.username, code: account.code, level })
      : t('profile.usernameLevel', { username: account.username, level });

  return (
    <Screen tabBar>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AppText variant="title">{t('profile.title')}</AppText>
        <GlassCard style={styles.card}>
          <View style={styles.avatar}>
            <Icon name="user" size={30} color={theme.colors.brand.primary} />
          </View>
          <View style={styles.grow}>
            <AppText variant="h2">{heroCtl.hero?.name ?? (guest ? t('profile.guest') : session && !isGuest(session) ? session.name : '—')}</AppText>
            <AppText variant="caption" tone="secondary">
              {subtitle}
            </AppText>
          </View>
          <Badge tone={guest ? 'neutral' : 'success'} label={guest ? t('profile.onDevice') : t('profile.synced')} />
        </GlassCard>

        <Group
          items={[
            {
              icon: 'heart',
              color: theme.colors.status.danger,
              label: t('profile.appleHealth'),
              value: health.status === 'idle' ? t('common.connected') : t('health.connect'),
              onPress: () => navigation.navigate('HealthSync'),
            },
            {
              icon: 'pin',
              color: theme.colors.brand.primary,
              label: t('permissions.locationTitle'),
              value: record.permission === 'granted' ? t('profile.whileUsing') : t('profile.notAllowed'),
              onPress: record.permission === 'granted' ? undefined : () => void record.askPermission(),
            },
            {
              icon: 'globe',
              color: theme.colors.brand.violet,
              label: t('profile.language'),
              value: NATIVE_NAMES[language.locale],
              below: (
                <View style={styles.languages}>
                  {/* A language is always shown in its own name, so a person who cannot read the current one can find theirs. */}
                  {SUPPORTED_LOCALES.map((l) => (
                    <Chip key={l} label={NATIVE_NAMES[l]} on={language.locale === l} onPress={() => language.choose(l)} />
                  ))}
                  {language.chosen ? <Chip label={t('profile.followDevice')} onPress={() => language.useDeviceLanguage()} /> : null}
                </View>
              ),
            },
          ]}
        />

        <Group
          items={[
            ...(guest
              ? [{ icon: 'cloud' as const, color: theme.colors.brand.cyan, label: t('profile.keepProgress'), onPress: () => navigation.navigate('GuestGate') }]
              : []),
            {
              icon: 'signOut',
              color: theme.colors.status.danger,
              label: t('profile.signOut'),
              danger: true,
              onPress: () => {
                void auth.signOut();
                navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] });
              },
            },
          ]}
        />
      </ScrollView>
    </Screen>
  );
});

const styles = StyleSheet.create((theme) => ({
  content: { gap: theme.spacing(4), paddingBottom: theme.spacing(10) },
  card: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing(4) },
  avatar: { width: 64, height: 64, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(155,140,255,0.25)' },
  grow: { flex: 1 },
  group: { borderRadius: 26 },
  li: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, paddingHorizontal: 16, minHeight: 56 },
  liIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.1)' },
  hair: { height: 1, backgroundColor: theme.colors.stroke.hairline },
  languages: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing(2), paddingHorizontal: 16, paddingBottom: 14, paddingLeft: 66 },
}));
