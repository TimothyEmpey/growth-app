import { useState } from 'react';
import { router } from 'expo-router';
import { dismissSheet, Body, Button, Field, Notice, Sheet, useAction } from '@/components/ui';
import { validatePassword } from '@/domain/account';
import { useAccount, useAccountActions } from '@/services/account';
export default function PasswordSheet() {
  const account = useAccount();
  const actions = useAccountActions();
  const action = useAction();
  const [currentPassword, setCurrent] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saved, setSaved] = useState(false);
  return (
    <Sheet title="Change password" subtitle="A fresh start for your account security.">
      {!account.data?.account ? (
        <>
          <Body>Sign in to change your password.</Body>
          <Button onPress={() => router.push('/account/sign-in')}>Sign in</Button>
        </>
      ) : saved ? (
        <>
          <Body>
            Your password has been updated. You’re still signed in here; all other sessions have
            been signed out.
          </Body>
          <Button onPress={() => dismissSheet('/account')}>Done</Button>
        </>
      ) : (
        <>
          <Field
            label="Current password"
            value={currentPassword}
            onChangeText={setCurrent}
            secureTextEntry
            autoComplete="current-password"
            editable={!action.busy}
          />
          <Field
            label="New password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="new-password"
            placeholder="At least 12 characters"
            editable={!action.busy}
          />
          <Field
            label="Confirm new password"
            value={confirm}
            onChangeText={setConfirm}
            secureTextEntry
            autoComplete="new-password"
            editable={!action.busy}
          />
          <Body>Use 12–128 characters. A memorable, unique passphrase works well.</Body>
          <Button
            loading={action.busy}
            onPress={() =>
              void action.run(async () => {
                validatePassword(password);
                if (password !== confirm) throw new Error('The passwords do not match.');
                if (password === currentPassword) throw new Error('Choose a different password.');
                await actions.complete('password', { currentPassword, password });
                setCurrent('');
                setPassword('');
                setConfirm('');
                setSaved(true);
              })
            }
          >
            Update password
          </Button>
        </>
      )}
      {action.error && <Notice message={action.error} />}
    </Sheet>
  );
}
