import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { router } from 'expo-router';
import {
  Body,
  Button,
  Card,
  Field,
  JournalReady,
  Label,
  Notice,
  NumericField,
  Row,
  Sheet,
  Title,
  useAction,
} from '@/components/ui';
import { useColors } from '@/providers/appearance';
import { useJournal, updateJournal } from '@/data/journal-store';
import { validateProfile, type Account, type Profile } from '@/domain/account';
import { useAccount, useAccountActions } from '@/services/account';
import { usePreferences } from '@/hooks/use-preferences';
import { INPUT_LIMITS } from '@/domain/input';

export default function ProfileSheet() {
  const account = useAccount();
  const C = useColors();
  return (
    <JournalReady>
      {account.isPending ? (
        <Sheet title="Edit profile">
          <ActivityIndicator color={C.blue} />
        </Sheet>
      ) : (
        <ProfileForm
          key={account.data?.account?.id ?? 'local'}
          account={account.data?.account ?? null}
          unavailable={!!account.error}
        />
      )}
    </JournalReady>
  );
}
function ProfileForm({ account, unavailable }: { account: Account | null; unavailable: boolean }) {
  const { journal } = useJournal();
  const original: Profile = account ?? journal.profile;
  const { units } = usePreferences();
  const metric = units === 'metric';
  const totalInches =
    original.heightCm === null ? null : Number((original.heightCm / 2.54).toFixed(1));
  const initialHeight =
    original.heightCm === null
      ? ''
      : String(metric ? Number(original.heightCm.toFixed(1)) : Math.floor(totalInches! / 12));
  const initialInches = totalInches === null ? '' : String(Number((totalInches % 12).toFixed(1)));
  const initialWeight =
    original.weightKg === null
      ? ''
      : String(Number((original.weightKg * (metric ? 1 : 1 / 0.45359237)).toFixed(1)));
  const [name, setName] = useState(original.name);
  const [gender, setGender] = useState(original.gender);
  const [age, setAge] = useState(original.age === null ? '' : String(original.age));
  const [height, setHeight] = useState(initialHeight);
  const [inches, setInches] = useState(initialInches);
  const [weight, setWeight] = useState(initialWeight);
  const [saved, setSaved] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const action = useAction();
  const deleteAction = useAction();
  const actions = useAccountActions();
  const edit = (setter: (value: string) => void) => (value: string) => {
    setter(value);
    setSaved(false);
  };
  return (
    <Sheet title="Edit profile" subtitle="A little about you.">
      {unavailable && (
        <Body>
          {account
            ? 'Your saved account profile is shown. Reconnect to save changes.'
            : 'Account service unavailable. These details belong to your local profile.'}
        </Body>
      )}
      <Field
        label="Name"
        value={name}
        onChangeText={edit(setName)}
        autoComplete="name"
        maxLength={80}
        editable={!action.busy}
      />
      <Card style={{ gap: 16 }}>
        <Label>Account details</Label>
        <Body>{account?.email ?? 'Sign in to manage your email and password.'}</Body>
        {account ? (
          <>
            <Button quiet onPress={() => router.push('/account/email')}>
              Change email
            </Button>
            <Button quiet onPress={() => router.push('/account/password')}>
              Change password
            </Button>
          </>
        ) : (
          <Button quiet onPress={() => router.push('/account/sign-in')}>
            Sign in or create an account
          </Button>
        )}
      </Card>
      <Title size={20}>Body details</Title>
      <Body>Optional. Add only what you’re comfortable sharing.</Body>
      <Field
        label="Gender (optional)"
        placeholder="Self-describe, or leave blank"
        value={gender}
        onChangeText={edit(setGender)}
        maxLength={60}
        editable={!action.busy}
      />
      <NumericField
        label="Age (optional)"
        placeholder="Years"
        value={age}
        onChangeText={edit(setAge)}
        max={INPUT_LIMITS.age}
        decimals={0}
        editable={!action.busy}
      />
      <Row style={{ alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <NumericField
            label={metric ? 'Height (cm)' : 'Height (ft)'}
            value={height}
            onChangeText={edit(setHeight)}
            max={metric ? INPUT_LIMITS.heightCm : INPUT_LIMITS.heightFeet}
            decimals={metric ? 1 : 0}
            placeholder="Optional"
            editable={!action.busy}
          />
        </View>
        {!metric && (
          <View style={{ flex: 1 }}>
            <NumericField
              label="Height (in)"
              value={inches}
              onChangeText={edit(setInches)}
              max={INPUT_LIMITS.heightInches}
              placeholder="0–11.9"
              editable={!action.busy}
            />
          </View>
        )}
      </Row>
      <NumericField
        label={`Weight (${metric ? 'kg' : 'lb'})`}
        value={weight}
        onChangeText={edit(setWeight)}
        max={metric ? INPUT_LIMITS.bodyWeightKg : INPUT_LIMITS.bodyWeightLb}
        placeholder="Optional"
        editable={!action.busy}
      />
      <Body>
        Measurements use your preferred units. Profile weight is separate from your dated weigh-in
        history.
      </Body>
      {action.error && <Notice message={action.error} />}
      {saved && <Body>Profile saved.</Body>}
      <Button
        loading={action.busy}
        onPress={() =>
          void action.run(async () => {
            if (
              !metric &&
              (height.trim() || inches.trim()) &&
              (!Number.isInteger(Number(height)) ||
                Number(height) < 0 ||
                Number(inches) < 0 ||
                Number(inches) >= 12)
            )
              throw new Error('Enter whole feet and inches from 0 to less than 12.');
            const heightCm =
              height === initialHeight && inches === initialInches
                ? original.heightCm
                : !height.trim() && (metric || !inches.trim())
                  ? null
                  : metric
                    ? Number(height)
                    : (Number(height) * 12 + Number(inches)) * 2.54;
            const weightKg =
              weight === initialWeight
                ? original.weightKg
                : !weight.trim()
                  ? null
                  : Number(weight) * (metric ? 1 : 0.45359237);
            const profile = validateProfile({
              name,
              gender,
              age: age.trim() ? Number(age) : null,
              heightCm,
              weightKg,
            });
            if (account) await actions.complete('profile', profile);
            await updateJournal((journal) => {
              journal.profile = profile;
            });
            setSaved(true);
          })
        }
      >
        Save profile
      </Button>
      {account &&
        (confirmDelete ? (
          <Card style={{ gap: 16 }}>
            <Label>Delete Growth account</Label>
            <Body>
              This permanently deletes your profile, synced journal, imported Strava runs, and every
              Growth session. This cannot be undone.
            </Body>
            <Field
              label="Current password"
              value={deletePassword}
              onChangeText={setDeletePassword}
              secureTextEntry
              autoComplete="current-password"
              maxLength={INPUT_LIMITS.passwordLength}
              editable={!deleteAction.busy}
            />
            {deleteAction.error && <Notice message={deleteAction.error} />}
            <Button
              quiet
              danger
              loading={deleteAction.busy}
              onPress={() =>
                void deleteAction.run(async () => {
                  await actions.deleteAccount(deletePassword);
                  setDeletePassword('');
                  router.dismissTo('/account');
                })
              }
            >
              Permanently delete account
            </Button>
            <Button
              quiet
              disabled={deleteAction.busy}
              onPress={() => {
                setDeletePassword('');
                setConfirmDelete(false);
              }}
            >
              Keep account
            </Button>
          </Card>
        ) : (
          <Button quiet danger disabled={action.busy} onPress={() => setConfirmDelete(true)}>
            Delete account
          </Button>
        ))}
    </Sheet>
  );
}
