import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Pressable, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { controllers } from '@/app/composition/container';
import { AppText } from '@/core/presentation/components/AppText';
import { Button } from '@/core/presentation/components/Button';
import { Icon, type IconName } from '@/core/presentation/components/Icon';
import { Sheet } from '@/core/presentation/components/Sheet';
import { useT } from '@/app/i18n/useT';
import type { RootStackParamList } from '@/app/navigation/types';

const BENEFITS: readonly { icon: IconName; key: 'guest.backup' | 'guest.devices' | 'guest.challenges' }[] = [
  { icon: 'cloud', key: 'guest.backup' },
  { icon: 'phone', key: 'guest.devices' },
  { icon: 'trophy', key: 'guest.challenges' },
];

/** Offered to a guest after a save and from Profile: everything works without an account, this only adds sync. */
export function GuestGateScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'GuestGate'>) {
  const { t } = useT();
  const { theme } = useUnistyles();
  const count = controllers.listActivities().execute().length;
  return (
    <View style={styles.root}>
      <Pressable accessibilityRole="button" accessibilityLabel={t('guest.notNow')} style={styles.scrim} onPress={() => navigation.goBack()} />
      <Sheet>
        <View style={styles.head}>
          <View style={styles.badge}>
            <Icon name="spark" size={28} color={theme.colors.brand.primary} />
          </View>
          <View style={styles.grow}>
            <AppText variant="h2">{t('guest.title')}</AppText>
            <AppText variant="caption" tone="secondary">{t('guest.subtitle', { count })}</AppText>
          </View>
        </View>
        <View style={styles.list}>
          {BENEFITS.map((b) => (
            <View key={b.key} style={styles.bn}>
              <View style={styles.ic}>
                <Icon name={b.icon} size={18} color={theme.colors.brand.primary} />
              </View>
              <AppText>{t(b.key)}</AppText>
            </View>
          ))}
        </View>
        <View style={styles.actions}>
          <Button block label={t('profile.createAccount')} onPress={() => navigation.replace('CreateAccount')} />
          <Button block kind="ghost" label={t('guest.notNow')} onPress={() => navigation.goBack()} />
        </View>
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  root: { flex: 1, justifyContent: 'flex-end' },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: theme.colors.scrim },
  head: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing(3) },
  badge: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(155,140,255,0.25)' },
  grow: { flex: 1 },
  list: { gap: theme.spacing(3) },
  bn: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing(3) },
  ic: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(200,255,61,0.16)' },
  actions: { gap: theme.spacing(2), marginTop: theme.spacing(1) },
}));
