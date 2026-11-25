import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Observer } from 'mobx-react-lite';
import { useEffect, useRef } from 'react';
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
export function SignInScreen({
  navigation,
}: Readonly<NativeStackScreenProps<RootStackParamList, 'SignIn'>>) {
  const { t, error } = useT();
  const auth = controllers.auth();
  const username = useRef('');
  const password = useRef('');
  useEffect(() => auth.clearError(), [auth]);

  const submit = async () => {
    if (
      !(await auth.signIn({
        username: username.current,
        password: password.current,
      }))
    )
      return;
    // The account's hero comes from the server: a returning user goes straight in, a new one onboards. Reset, not
    // replace: the auth screens must not stay under it (no swipe back to Welcome once signed in).
    const hero = await controllers.hero().sync('signIn');
    navigation.reset({
      index: 0,
      routes: [{ name: hero ? 'Main' : 'Permissions' }],
    });
  };

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <IconButton
          icon="back"
          iconSize={24}
          label={t('common.back')}
          onPress={() => navigation.goBack()}
        />
        <View style={styles.head}>
          <AppText variant="title" style={styles.title}>
            {t('signIn.title')}
          </AppText>
          <AppText tone="secondary">{t('signIn.subtitle')}</AppText>
        </View>
        <View style={styles.form}>
          <Observer>
            {() => {
              const code = auth.errorCode;
              const fieldError =
                code && FIELD_OF[code] === 'username' ? error(code) : undefined;
              return (
                <Field
                  label={t('signIn.identifier')}
                  icon="user"
                  defaultValue=""
                  onChangeText={value => {
                    username.current = value;
                  }}
                  autoCapitalize="none"
                  autoCorrect={false}
                  textContentType="username"
                  returnKeyType="next"
                  error={fieldError}
                />
              );
            }}
          </Observer>
          <Observer>
            {() => {
              const code = auth.errorCode;
              const fieldError =
                code && FIELD_OF[code] === 'password' ? error(code) : undefined;
              return (
                <Field
                  label={t('account.password')}
                  icon="lock"
                  defaultValue=""
                  onChangeText={value => {
                    password.current = value;
                  }}
                  secureTextEntry
                  reveal={{
                    show: t('common.showPassword'),
                    hide: t('common.hidePassword'),
                  }}
                  textContentType="password"
                  returnKeyType="go"
                  onSubmitEditing={submit}
                  error={fieldError}
                />
              );
            }}
          </Observer>
        </View>
        <View style={styles.actions}>
          <Observer>
            {() => {
              const code = auth.errorCode;
              const formError =
                code && !FIELD_OF[code] ? error(code) : undefined;
              return formError ? (
                <AppText
                  variant="caption"
                  tone="danger"
                  accessibilityRole="alert"
                  style={styles.center}
                >
                  {formError}
                </AppText>
              ) : null;
            }}
          </Observer>
          <Observer>
            {() => (
              <Button
                block
                label={auth.busy ? t('signIn.submitting') : t('signIn.submit')}
                disabled={auth.busy}
                onPress={submit}
              />
            )}
          </Observer>
          <Button
            block
            kind="ghost"
            label={t('signIn.noAccount')}
            onPress={() => navigation.replace('CreateAccount')}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create(theme => ({
  content: { gap: theme.spacing(5), paddingBottom: theme.spacing(6) },
  head: { gap: theme.spacing(2) },
  title: { fontSize: 32, lineHeight: 38 },
  form: { gap: theme.spacing(4) },
  actions: { gap: theme.spacing(3), marginTop: theme.spacing(2) },
  center: { textAlign: 'center' },
}));
