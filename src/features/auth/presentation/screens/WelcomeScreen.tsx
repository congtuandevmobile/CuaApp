import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { controllers } from '@/app/composition/container';
import { AppText } from '@/core/presentation/components/AppText';
import { Button } from '@/core/presentation/components/Button';
import { LogoTile } from '@/core/presentation/components/LogoTile';
import { Screen } from '@/core/presentation/components/Screen';
import { useT } from '@/app/i18n/useT';
import type { RootStackParamList } from '@/app/navigation/types';

export function WelcomeScreen({
  navigation,
}: NativeStackScreenProps<RootStackParamList, 'Welcome'>) {
  const { t } = useT();
  const { theme } = useUnistyles();
  return (
    <Screen>
      <View style={styles.hero}>
        <View style={styles.blob} pointerEvents="none" />
        <LogoTile size={200} />
        <View style={styles.words}>
          <AppText variant="title" style={styles.title}>
            {t('welcome.title')}
          </AppText>
          <AppText tone="secondary" style={styles.center}>
            {t('welcome.tagline')}
          </AppText>
        </View>
      </View>
      <View style={styles.actions}>
        {/* Username + password accounts on Cua API. "Continue with Apple" would need the server to verify Apple's token. */}
        <Button
          block
          icon="user"
          label={t('welcome.signIn')}
          onPress={() => navigation.navigate('SignIn')}
        />
        <Button
          block
          label={t('welcome.createAccount')}
          kind="glass"
          onPress={() => navigation.navigate('CreateAccount')}
        />
        <Button
          block
          label={t('welcome.continueGuest')}
          kind="ghost"
          textColor={theme.colors.status.success}
          onPress={() => {
            controllers.auth().useAsGuest();
            navigation.reset({ index: 0, routes: [{ name: 'Permissions' }] });
          }}
        />
        <AppText variant="caption" tone="tertiary" style={styles.center}>
          {t('welcome.legal')}
        </AppText>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create(theme => ({
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing(8),
  },
  blob: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    top: '30%',
    backgroundColor: 'rgba(200,255,61,0.35)',
    filter: [{ blur: 40 }],
  },
  words: {
    gap: theme.spacing(2),
    alignItems: 'center',
    paddingHorizontal: theme.spacing(1),
  },
  title: { fontSize: 32, lineHeight: 38, textAlign: 'center' },
  center: { textAlign: 'center' },
  actions: { gap: theme.spacing(3) },
}));
