import { useState } from 'react';
import { View } from 'react-native';
import {
  Body,
  Button,
  Field,
  Notice,
  NumericField,
  Row,
  Sheet,
  dismissSheet,
  useAction,
} from '@/components/ui';
import { useJournal, updateJournal } from '@/data/journal-store';
import { normalizeEmail, validatePassword } from '@/domain/account';
import { INPUT_LIMITS } from '@/domain/input';
import { accountRequest, useAccountActions, type Verification } from '@/services/account';

type Mode = 'login' | 'register' | 'reset';
export default function SignInSheet() {
  const { journal } = useJournal();
  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState(journal.profile.name);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [code, setCode] = useState('');
  const [challenge, setChallenge] = useState<Verification | null>(null);
  const [sentAt, setSentAt] = useState(0);
  const action = useAction();
  const actions = useAccountActions();
  const changeMode = (next: Mode) => {
    setMode(next);
    setPassword('');
    setConfirm('');
    setChallenge(null);
    setCode('');
  };
  const requestCode = async () => {
    if (Date.now() - sentAt < 60_000)
      throw new Error('Please wait a minute before requesting another code.');
    const address = normalizeEmail(email);
    if (mode === 'register') {
      validatePassword(password);
      if (password !== confirm) throw new Error('The passwords do not match.');
      if (!name.trim()) throw new Error('Enter your name.');
    }
    const result = await accountRequest<Verification>(mode === 'register' ? 'register' : 'reset', {
      email: address,
      name: name.trim(),
      ...(mode === 'register' ? { password } : {}),
    });
    setEmail(address);
    setChallenge(result);
    setCode('');
    setSentAt(Date.now());
  };
  const finish = async (path: string, data: unknown) => {
    await actions.complete(path, data);
    // Bio details entered locally can be explicitly saved later from Edit profile.
    await updateJournal((j) => {
      if (name.trim() && !j.profile.name) j.profile.name = name.trim();
    });
    setPassword('');
    setConfirm('');
    dismissSheet('/account');
  };
  return (
    <Sheet
      title={
        challenge
          ? 'Check your email'
          : mode === 'register'
            ? 'Create your account'
            : mode === 'reset'
              ? 'Reset your password'
              : 'Welcome back'
      }
      subtitle={challenge ? `A code was requested for ${email}.` : 'Your next chapter starts here.'}
    >
      {challenge ? (
        <>
          <Body>
            {mode === 'register'
              ? 'If this email is available, you’ll receive a six-digit code. Already registered? Return to sign in or reset your password.'
              : 'If an account uses this email, you’ll receive a six-digit code.'}{' '}
            Codes expire after 10 minutes.
          </Body>
          <NumericField
            label="Verification code"
            value={code}
            onChangeText={setCode}
            max={INPUT_LIMITS.verificationCode}
            decimals={0}
            autoComplete="one-time-code"
            placeholder="000000"
            editable={!action.busy}
          />
          {mode === 'reset' && (
            <>
              <Field
                label="New password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="new-password"
                placeholder="At least 12 characters"
                maxLength={INPUT_LIMITS.passwordLength}
                editable={!action.busy}
              />
              <Field
                label="Confirm new password"
                value={confirm}
                onChangeText={setConfirm}
                secureTextEntry
                autoComplete="new-password"
                maxLength={INPUT_LIMITS.passwordLength}
                editable={!action.busy}
              />
            </>
          )}
          <Button
            loading={action.busy}
            onPress={() =>
              void action.run(async () => {
                if (mode === 'reset') {
                  validatePassword(password);
                  if (password !== confirm) throw new Error('The passwords do not match.');
                }
                await finish('verify', {
                  challengeId: challenge.challengeId,
                  code,
                  ...(mode === 'reset' ? { password } : {}),
                });
              })
            }
          >
            {mode === 'reset' ? 'Reset password & sign in' : 'Verify & create account'}
          </Button>
          <Button quiet disabled={action.busy} onPress={() => void action.run(requestCode)}>
            Send a new code
          </Button>
          <Button
            quiet
            disabled={action.busy}
            onPress={() => {
              setChallenge(null);
              setCode('');
            }}
          >
            Back to details
          </Button>
        </>
      ) : (
        <>
          {mode === 'register' && (
            <Field
              label="Name"
              value={name}
              onChangeText={setName}
              autoComplete="name"
              maxLength={80}
              editable={!action.busy}
            />
          )}
          <Field
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            autoComplete="email"
            maxLength={INPUT_LIMITS.emailLength}
            editable={!action.busy}
          />
          {mode !== 'reset' && (
            <Field
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              placeholder={mode === 'register' ? 'At least 12 characters' : 'Your password'}
              maxLength={INPUT_LIMITS.passwordLength}
              editable={!action.busy}
            />
          )}
          {mode === 'register' && (
            <Field
              label="Confirm password"
              value={confirm}
              onChangeText={setConfirm}
              secureTextEntry
              autoComplete="new-password"
              maxLength={INPUT_LIMITS.passwordLength}
              editable={!action.busy}
            />
          )}
          <Button
            loading={action.busy}
            onPress={() =>
              void action.run(() =>
                mode === 'login'
                  ? finish('login', { email: normalizeEmail(email), password })
                  : requestCode(),
              )
            }
          >
            {mode === 'login' ? 'Sign in' : 'Send verification code'}
          </Button>
          <View style={{ gap: 12 }}>
            <Row style={{ flexWrap: 'wrap' }}>
              <Button
                quiet
                disabled={action.busy}
                onPress={() => changeMode(mode === 'login' ? 'register' : 'login')}
              >
                {mode === 'login' ? 'Create an account' : 'Back to sign in'}
              </Button>
              {mode === 'login' && (
                <Button quiet disabled={action.busy} onPress={() => changeMode('reset')}>
                  Forgot password?
                </Button>
              )}
            </Row>
          </View>
        </>
      )}
      {action.error && <Notice message={action.error} />}
      <Body>Your journal stays on this device when you sign in or out.</Body>
    </Sheet>
  );
}
