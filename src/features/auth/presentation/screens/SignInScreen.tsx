import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { controllers } from '@/app/composition/container';
import { AppText } from '@/core/presentation/components/AppText';
import { Button } from '@/core/presentation/components/Button';
import { Field } from '@/core/presentation/components/Field';
import { IconButton } from '@/core/presentation/components/IconButton';
import { Screen } from '@/core/presentation/components/Screen';
import { useT } from '@/app/i18n/useT';
import type { RootStackParamList } from '@/app/navigation/types';

const FIELD_OF: Record<string, 'username' | 'password'> = {
  AUTH_USERNAME_REQUIRED: 'username',
  AUTH_PASSWORD_REQUIRED: 'password',
};

/** Username + password sign-in. Same layout and components as Create account. */
export const SignInScreen = observer(function SignInScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'SignIn'>) {
  const { t, error } = useT();
  const auth = controllers.auth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  useEffect(() => auth.clearError(), [auth]);
  const bad = auth.errorCode ? FIELD_OF[auth.errorCode] : undefined;
  const errorFor = (f: string) => (bad === f ? error(auth.errorCode) : undefined);
  /** Wrong credentials, offline, server down: shown above the button. */
  const formError = auth.errorCode && !bad ? error(auth.errorCode) : undefined;

  const submit = async () => {
    if (!(await auth.signIn({ username, password }))) return;
    // A returning user with a hero on this device goes straight in; otherwise the usual onboarding. Reset, not
    // replace: the auth screens must not stay under it (no swipe back to Welcome once signed in).
    navigation.reset({ index: 0, routes: [{ name: controllers.hero().load() ? 'Main' : 'Permissions' }] });
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <IconButton icon="back" iconSize={24} label={t('common.back')} onPress={() => navigation.goBack()} />
        <View style={styles.head}>
          <AppText variant="title" style={styles.title}>{t('signIn.title')}</AppText>
          <AppText tone="secondary">{t('signIn.subtitle')}</AppText>
        </View>
        <View style={styles.form}>
          <Field
            label={t('signIn.identifier')}
            icon="user"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="username"
            returnKeyType="next"
            error={errorFor('username')}
          />
          <Field
            label={t('account.password')}
            icon="lock"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            reveal={{ show: t('common.showPassword'), hide: t('common.hidePassword') }}
            textContentType="password"
            returnKeyType="go"
            onSubmitEditing={submit}
            error={errorFor('password')}
          />
        </View>
        <View style={styles.actions}>
          {formError ? (
            <AppText variant="caption" tone="danger" accessibilityRole="alert" style={styles.center}>
              {formError}
            </AppText>
          ) : null}
          <Button block label={auth.busy ? t('signIn.submitting') : t('signIn.submit')} disabled={auth.busy} onPress={submit} />
          <Button block kind="ghost" label={t('signIn.noAccount')} onPress={() => navigation.replace('CreateAccount')} />
        </View>
      </ScrollView>
    </Screen>
  );
});

const styles = StyleSheet.create((theme) => ({
  content: { gap: theme.spacing(5), paddingBottom: theme.spacing(6) },
  head: { gap: theme.spacing(2) },
  title: { fontSize: 32, lineHeight: 38 },
  form: { gap: theme.spacing(4) },
  actions: { gap: theme.spacing(3), marginTop: theme.spacing(2) },
  center: { textAlign: 'center' },
}));
