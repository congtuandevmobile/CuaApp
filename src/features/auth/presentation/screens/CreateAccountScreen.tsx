import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';
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

const FIELD_OF: Record<string, 'name' | 'email' | 'password'> = {
  AUTH_NAME_REQUIRED: 'name',
  AUTH_EMAIL_INVALID: 'email',
  AUTH_PASSWORD_TOO_SHORT: 'password',
};

/** 0..3: length, mixed case/digits, symbols. Only a hint; the rule itself is `validateRegistration`. */
function strength(p: string): number {
  if (p.length < 8) return p.length > 0 ? 1 : 0;
  return 1 + (/[A-Z]/.test(p) && /[a-z]/.test(p) && /\d/.test(p) ? 1 : 0) + (/[^A-Za-z0-9]/.test(p) || p.length >= 12 ? 1 : 0);
}

export const CreateAccountScreen = observer(function CreateAccountScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'CreateAccount'>) {
  const { t, error } = useT();
  const { theme } = useUnistyles();
  const auth = controllers.auth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agreed, setAgreed] = useState(false);
  const bad = auth.errorCode ? FIELD_OF[auth.errorCode] : undefined;
  const errorFor = (f: string) => (bad === f ? error(auth.errorCode) : undefined);
  const level = strength(password);
  const levelColor = [theme.colors.text.tertiary, theme.colors.status.danger, theme.colors.status.warning, theme.colors.status.success][level]!;
  const levelText = ['', t('account.strength.weak'), t('account.strength.fair'), t('account.strength.strong')][level]!;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <IconButton icon="back" iconSize={24} label={t('common.back')} onPress={() => navigation.goBack()} />
        <View style={styles.head}>
          <AppText variant="title" style={styles.title}>{t('account.title')}</AppText>
          <AppText tone="secondary">{t('account.subtitle')}</AppText>
        </View>
        <View style={styles.form}>
          <Field label={t('account.name')} icon="user" value={name} onChangeText={setName} textContentType="name" error={errorFor('name')} />
          <Field label={t('account.email')} icon="mail" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" textContentType="emailAddress" error={errorFor('email')} />
          <View>
            <Field label={t('account.password')} icon="lock" value={password} onChangeText={setPassword} secureTextEntry textContentType="newPassword" error={errorFor('password')} />
            {password.length > 0 ? (
              <View style={styles.strength}>
                <View style={styles.grow}>
                  <ProgressBar value={level / 3} color={levelColor} />
                </View>
                <AppText variant="caption" style={{ color: levelColor }}>{levelText}</AppText>
              </View>
            ) : null}
          </View>
          <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: agreed }} onPress={() => setAgreed(!agreed)} style={styles.agree}>
            <View style={[styles.box, agreed && styles.boxOn]}>{agreed ? <Icon name="check" size={16} strokeWidth={2.6} color="#0B1300" /> : null}</View>
            <AppText variant="caption" tone="secondary" style={styles.grow}>{t('account.agree')}</AppText>
          </Pressable>
        </View>
        <View style={styles.actions}>
          <Button
            block
            label={auth.busy ? t('account.creating') : t('account.create')}
            disabled={auth.busy || !agreed}
            onPress={async () => {
              if (await auth.signUp({ name, email, password })) navigation.replace('Permissions');
            }}
          />
          <View style={styles.or}>
            <View style={styles.hair} />
            <AppText variant="caption" tone="tertiary">{t('account.or')}</AppText>
            <View style={styles.hair} />
          </View>
          <Button
            block
            kind="ghost"
            textColor={theme.colors.status.success}
            label={t('account.continueGuest')}
            onPress={() => {
              auth.useAsGuest();
              navigation.replace('Permissions');
            }}
          />
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
  strength: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing(2), marginTop: 10, marginHorizontal: 4 },
  grow: { flex: 1 },
  agree: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing(3), minHeight: 44 },
  box: { width: 24, height: 24, borderRadius: 8, borderWidth: 1.5, borderColor: theme.colors.stroke.glass, alignItems: 'center', justifyContent: 'center' },
  boxOn: { backgroundColor: theme.colors.brand.primary, borderColor: theme.colors.brand.primary },
  actions: { gap: theme.spacing(3), marginTop: theme.spacing(2) },
  or: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing(3) },
  hair: { flex: 1, height: 1, backgroundColor: theme.colors.stroke.hairline },
}));
