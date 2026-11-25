import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { observer } from 'mobx-react-lite';
import { View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { controllers } from '@/app/composition/container';
import { AppText } from '../../core/presentation/components/AppText';
import { Badge } from '../../core/presentation/components/Badge';
import { Button } from '../../core/presentation/components/Button';
import { GlassCard } from '../../core/presentation/components/GlassCard';
import { Icon, type IconName } from '../../core/presentation/components/Icon';
import { Screen } from '../../core/presentation/components/Screen';
import { useT } from '../i18n/useT';
import type { RootStackParamList } from '../navigation/types';

/** Each permission is optional and asked here with its reason; anything skipped is asked again when first needed. */
export const PermissionsScreen = observer(function PermissionsScreen({
  navigation,
}: NativeStackScreenProps<RootStackParamList, 'Permissions'>) {
  const { t } = useT();
  const { theme } = useUnistyles();
  const record = controllers.record();
  const health = controllers.health();
  const next = () => navigation.replace('CharacterSelect');

  const row = (
    icon: IconName,
    color: string,
    tint: string,
    title: string,
    reason: string,
    granted: boolean,
    ask: () => void,
  ) => (
    <GlassCard style={styles.row}>
      <View style={[styles.icon, { backgroundColor: tint }]}>
        <Icon name={icon} color={color} />
      </View>
      <View style={styles.grow}>
        <AppText variant="h3">{title}</AppText>
        <AppText variant="caption" tone="secondary">
          {reason}
        </AppText>
      </View>
      {granted ? (
        <Badge tone="brand" label={t('common.allowed')} />
      ) : (
        <Button
          size="sm"
          kind="glass"
          label={t('common.allow')}
          onPress={ask}
        />
      )}
    </GlassCard>
  );

  return (
    <Screen>
      <View style={styles.top}>
        <AppText variant="overline" tone="tertiary">
          {t('onboarding.step', { step: 1, total: 2 })}
        </AppText>
        <Button
          size="sm"
          kind="ghost"
          label={t('permissions.skipAll')}
          onPress={next}
        />
      </View>
      <AppText variant="title" style={styles.title}>
        {t('permissions.title')}
      </AppText>
      <AppText tone="secondary">{t('permissions.subtitle')}</AppText>
      <View style={styles.list}>
        {row(
          'pin',
          theme.colors.brand.primary,
          'rgba(200,255,61,0.18)',
          t('permissions.locationTitle'),
          t('permissions.locationReason'),
          record.permission === 'granted',
          () => void record.askPermission(),
        )}
        {row(
          'heart',
          theme.colors.status.danger,
          'rgba(255,93,108,0.18)',
          t('permissions.healthTitle'),
          t('permissions.healthReason'),
          health.status === 'idle',
          () => void health.connect(),
        )}
      </View>
      <View style={styles.grow} />
      <AppText variant="caption" tone="tertiary" style={styles.note}>
        {t('permissions.whileUsing')}
      </AppText>
      <Button block label={t('common.continue')} onPress={next} />
    </Screen>
  );
});

const styles = StyleSheet.create(theme => ({
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: { fontSize: 30, lineHeight: 36, marginBottom: theme.spacing(2) },
  list: { gap: theme.spacing(3), marginTop: theme.spacing(5) },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing(3),
    borderRadius: theme.radius.lg,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  icon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grow: { flex: 1, gap: 2 },
  note: { textAlign: 'center', marginBottom: theme.spacing(3) },
}));
