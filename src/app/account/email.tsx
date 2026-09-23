import { useState } from 'react';
import { router } from 'expo-router';
import {
  dismissSheet,
  Body,
  Button,
  Field,
  Notice,
  NumericField,
  Sheet,
  useAction,
} from '@/components/ui';
import { normalizeEmail } from '@/domain/account';
import { INPUT_LIMITS } from '@/domain/input';
import {
  accountRequest,
  useAccount,
  useAccountActions,
  type Verification,
} from '@/services/account';
export default function EmailSheet() {
  const account = useAccount();
  const actions = useAccountActions();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [oldCode, setOldCode] = useState('');
  const [code, setCode] = useState('');
  const [challenge, setChallenge] = useState<Verification | null>(null);
  const [sentAt, setSentAt] = useState(0);
  const [complete, setComplete] = useState(false);
  const action = useAction();
  const send = async () => {
    if (Date.now() - sentAt < 60_000)
      throw new Error('Please wait a minute before requesting another code.');
    const normalized = normalizeEmail(email);
    const result = await accountRequest<Verification>('email', { email: normalized, password });
    setEmail(normalized);
    setChallenge(result);
    setOldCode('');
    setCode('');
    setSentAt(Date.now());
  };
  return (
    <Sheet title="Change email" subtitle="Keep your account in your hands.">
      {!account.data?.account ? (
        <>
          <Body>Sign in to change your account email.</Body>
          <Button onPress={() => router.push('/account/sign-in')}>Sign in</Button>
        </>
      ) : complete ? (
        <>
          <Body>
            Your email is now {account.data.account.email}. Other sessions have been signed out.
          </Body>
          <Button onPress={() => dismissSheet('/account')}>Done</Button>
        </>
      ) : challenge ? (
        <>
          <Body>
            We sent separate codes to {account.data.account.email} and {email}. Enter both to
            approve the change. Your current email stays active until verification is complete.
          </Body>
          <NumericField
            label="Current email code"
            value={oldCode}
            onChangeText={setOldCode}
            max={INPUT_LIMITS.verificationCode}
            decimals={0}
            placeholder="000000"
            editable={!action.busy}
          />
          <NumericField
            label="New email code"
            value={code}
            onChangeText={setCode}
            max={INPUT_LIMITS.verificationCode}
            decimals={0}
            placeholder="000000"
            editable={!action.busy}
          />
          <Body>
            Codes expire in 10 minutes. You’ll stay signed in here; other sessions will be signed
            out.
          </Body>
          <Button
            loading={action.busy}
            onPress={() =>
              void action.run(async () => {
                await actions.complete('verify', {
                  challengeId: challenge.challengeId,
                  code,
                  oldCode,
                });
                setPassword('');
                setOldCode('');
                setCode('');
                setComplete(true);
              })
            }
          >
            Verify & change email
          </Button>
          <Button quiet disabled={action.busy} onPress={() => void action.run(send)}>
            Send new codes
          </Button>
          <Button
            quiet
            disabled={action.busy}
            onPress={() =>
              void action.run(async () => {
                await accountRequest('cancel', { challengeId: challenge.challengeId });
                setChallenge(null);
                setPassword('');
              })
            }
          >
            Cancel change
          </Button>
        </>
      ) : (
        <>
          <Body>Current email: {account.data.account.email}</Body>
          <Field
            label="New email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            autoComplete="email"
            maxLength={INPUT_LIMITS.emailLength}
            editable={!action.busy}
          />
          <Field
            label="Current password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="current-password"
            maxLength={INPUT_LIMITS.passwordLength}
            editable={!action.busy}
          />
          <Body>
            For your security, you’ll verify both your current address and the new address before
            anything changes.
          </Body>
          <Button loading={action.busy} onPress={() => void action.run(send)}>
            Send verification codes
          </Button>
        </>
      )}
      {action.error && <Notice message={action.error} />}
    </Sheet>
  );
}
