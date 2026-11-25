import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Observer } from 'mobx-react-lite';
import type { RefObject } from 'react';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { controllers } from '@/app/composition/container';
import { AppText } from '@/core/presentation/components/AppText';
import { Button } from '@/core/presentation/components/Button';
import { Field } from '@/core/presentation/components/Field';
import { Icon } from '@/core/presentation/components/Icon';
import { IconButton } from '@/core/presentation/components/IconButton';
import { ProgressBar } from '@/core/presentation/components/ProgressBar';
import { Screen } from '@/core/presentation/components/Screen';
import { useT } from '@/app/i18n/useT';
import type { RootStackParamList } from '@/app/navigation/types';

const FIELD_OF: Record<string, 'name' | 'email' | 'username' | 'password'> = {
  AUTH_NAME_REQUIRED: 'name',
  AUTH_EMAIL_INVALID: 'email',
  AUTH_EMAIL_TAKEN: 'email',
  AUTH_USERNAME_INVALID: 'username',
  AUTH_USERNAME_TAKEN: 'username',
  AUTH_PASSWORD_TOO_SHORT: 'password',
};

/** 0..3: length, mixed case/digits, symbols. Only a hint; the rule itself is `validateRegistration`. */
function strength(p: string): number {
  if (p.length < 8) return p.length > 0 ? 1 : 0;
  return (
    1 +
    (/[A-Z]/.test(p) && /[a-z]/.test(p) && /\d/.test(p) ? 1 : 0) +
    (/[^A-Za-z0-9]/.test(p) || p.length >= 12 ? 1 : 0)
  );
}

export function CreateAccountScreen({
  navigation,
}: Readonly<NativeStackScreenProps<RootStackParamList, 'CreateAccount'>>) {
  const { t, error } = useT();
  const { theme } = useUnistyles();
  const auth = controllers.auth();
  const name = useRef('');
  const email = useRef('');
  const username = useRef('');
  const password = useRef('');
  const [agreed, setAgreed] = useState(false);
  useEffect(() => auth.clearError(), [auth]);

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
            {t('account.title')}
          </AppText>
          <AppText tone="secondary">{t('account.subtitle')}</AppText>
        </View>
        <View style={styles.form}>
          <Observer>
            {() => {
              const code = auth.errorCode;
              return (
                <Field
                  label={t('account.name')}
                  icon="user"
                  defaultValue=""
                  onChangeText={value => {
                    name.current = value;
                  }}
                  textContentType="name"
                  error={
                    code && FIELD_OF[code] === 'name' ? error(code) : undefined
                  }
                />
              );
            }}
          </Observer>
          <Observer>
            {() => {
              const code = auth.errorCode;
              return (
                <Field
                  label={t('account.email')}
                  icon="mail"
                  defaultValue=""
                  onChangeText={value => {
                    email.current = value;
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  textContentType="emailAddress"
                  error={
                    code && FIELD_OF[code] === 'email' ? error(code) : undefined
                  }
                />
              );
            }}
          </Observer>
          <Observer>
            {() => {
              const code = auth.errorCode;
              return (
                <Field
                  label={t('account.username')}
                  icon="user"
                  defaultValue=""
                  onChangeText={value => {
                    username.current = value;
                  }}
                  autoCapitalize="none"
                  autoCorrect={false}
                  textContentType="username"
                  error={
                    code && FIELD_OF[code] === 'username'
                      ? error(code)
                      : undefined
                  }
                />
              );
            }}
          </Observer>
          <View>
            <PasswordStrengthField
              auth={auth}
              password={password}
              t={t}
              error={error}
            />
          </View>
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: agreed }}
            onPress={() => setAgreed(!agreed)}
            style={styles.agree}
          >
            <View style={[styles.box, agreed && styles.boxOn]}>
              {agreed ? (
                <Icon
                  name="check"
                  size={16}
                  strokeWidth={2.6}
                  color="#0B1300"
                />
              ) : null}
            </View>
            <AppText variant="caption" tone="secondary" style={styles.grow}>
              {t('account.agree')}
            </AppText>
          </Pressable>
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
                  style={styles.formError}
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
                label={auth.busy ? t('account.creating') : t('account.create')}
                disabled={auth.busy || !agreed}
                onPress={async () => {
                  if (
                    await auth.signUp({
                      name: name.current,
                      email: email.current,
                      username: username.current,
                      password: password.current,
                    })
                  )
                    navigation.reset({
                      index: 0,
                      routes: [{ name: 'Permissions' }],
                    });
                }}
              />
            )}
          </Observer>
          <Button
            block
            kind="ghost"
            label={t('account.haveAccount')}
            onPress={() => navigation.replace('SignIn')}
          />
          <View style={styles.or}>
            <View style={styles.hair} />
            <AppText variant="caption" tone="tertiary">
              {t('account.or')}
            </AppText>
            <View style={styles.hair} />
          </View>
          <Button
            block
            kind="ghost"
            textColor={theme.colors.status.success}
            label={t('account.continueGuest')}
            onPress={() => {
              auth.useAsGuest();
              navigation.reset({ index: 0, routes: [{ name: 'Permissions' }] });
            }}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}

function PasswordStrengthField({
  auth,
  password,
  t,
  error,
}: Readonly<{
  auth: ReturnType<typeof controllers.auth>;
  password: RefObject<string>;
  t: ReturnType<typeof useT>['t'];
  error: (code: string | undefined) => string | undefined;
}>) {
  const { theme } = useUnistyles();
  const [value, setValue] = useState('');
  const level = strength(value);
  const levelColor = [
    theme.colors.text.tertiary,
    theme.colors.status.danger,
    theme.colors.status.warning,
    theme.colors.status.success,
  ][level]!;
  const levelText = [
    '',
    t('account.strength.weak'),
    t('account.strength.fair'),
    t('account.strength.strong'),
  ][level]!;

  return (
    <>
      <Observer>
        {() => {
          const code = auth.errorCode;
          return (
            <Field
              label={t('account.password')}
              icon="lock"
              value={value}
              onChangeText={next => {
                password.current = next;
                setValue(next);
              }}
              secureTextEntry
              reveal={{
                show: t('common.showPassword'),
                hide: t('common.hidePassword'),
              }}
              textContentType="newPassword"
              error={
                code && FIELD_OF[code] === 'password' ? error(code) : undefined
              }
            />
          );
        }}
      </Observer>
      {value.length > 0 ? (
        <View style={styles.strength}>
          <View style={styles.grow}>
            <ProgressBar value={level / 3} color={levelColor} />
          </View>
          <AppText variant="caption" style={{ color: levelColor }}>
            {levelText}
          </AppText>
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create(theme => ({
  content: { gap: theme.spacing(5), paddingBottom: theme.spacing(6) },
  head: { gap: theme.spacing(2) },
  title: { fontSize: 32, lineHeight: 38 },
  form: { gap: theme.spacing(4) },
  strength: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing(2),
    marginTop: 10,
    marginHorizontal: 4,
  },
  grow: { flex: 1 },
  agree: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing(3),
    minHeight: 44,
  },
  box: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: theme.colors.stroke.glass,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxOn: {
    backgroundColor: theme.colors.brand.primary,
    borderColor: theme.colors.brand.primary,
  },
  actions: { gap: theme.spacing(3), marginTop: theme.spacing(2) },
  formError: { textAlign: 'center' },
  or: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing(3) },
  hair: { flex: 1, height: 1, backgroundColor: theme.colors.stroke.hairline },
}));
