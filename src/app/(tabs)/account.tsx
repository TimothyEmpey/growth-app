import { ActivityIndicator, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import {
  Body,
  Button,
  Card,
  Icon,
  Label,
  Notice,
  Page,
  Row,
  Title,
  useAction,
} from '@/components/ui';
import { SettingsRow } from '@/components/settings';
import { useColors } from '@/providers/appearance';
import { useJournal } from '@/data/journal-store';
import { activityStreak } from '@/domain/account';
import { formatDate } from '@/domain/journal';
import { useAccount, useAccountActions } from '@/services/account';
import { api } from '@/services/api';
import type { Connection } from '@/domain/types';
import { useToday } from '@/hooks/use-today';
import { useJournalSync } from '@/providers/journal-sync';
import { requestJournalSync } from '@/services/journal-sync';

export default function AccountPage() {
  const C = useColors();
  const { journal } = useJournal();
  const account = useAccount();
  const actions = useAccountActions();
  const action = useAction();
  const today = useToday();
  const sync = useJournalSync();
  const connection = useQuery({
    queryKey: ['strava'],
    queryFn: ({ signal }) => api<Connection>('/api/strava/status', { signal }),
    retry: false,
  });
  const runs = useQuery({
    queryKey: ['run-days'],
    queryFn: ({ signal }) =>
      api<{ dates: string[]; complete: boolean }>('/api/run-days', { signal }),
    enabled: !!connection.data?.connected,
    retry: false,
    refetchInterval: connection.data?.connected ? 30_000 : false,
  });
  const streak = activityStreak(
    journal.meals.map((meal) => meal.date),
    connection.data?.connected ? (runs.data?.dates ?? []) : [],
    today,
  );
  const profile = account.data?.account ?? journal.profile;
  const appearance = journal.preferences.appearance;
  const appearanceDetail = {
    system: 'Match your system',
    light: 'Light mode',
    dark: 'Dark mode',
    coffee: 'Coffee theme',
    aqua: 'Aqua theme',
    forest: 'Forest theme',
    skinty: 'Skinty theme',
  }[appearance];
  return (
    <Page title="Account" eyebrow="Make it yours">
      <View style={{ alignItems: 'center', gap: 9, paddingVertical: 12 }}>
        <View
          style={{
            height: 76,
            width: 76,
            borderRadius: 26,
            backgroundColor: `${C.blue}18`,
            borderWidth: 1,
            borderColor: `${C.blue}30`,
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 9,
          }}
        >
          {profile.name ? (
            <Text style={{ color: C.blue, fontSize: 27, fontWeight: '600' }}>
              {profile.name
                .trim()
                .split(/\s+/)
                .slice(0, 2)
                .map((part) => part[0])
                .join('')
                .toUpperCase()}
            </Text>
          ) : (
            <Icon name="account" size={34} color={C.blue} />
          )}
        </View>
        <Title size={28}>{profile.name || 'Your account'}</Title>
        <Body>{account.data?.account?.email ?? 'Your personal space in Growth'}</Body>
        {account.isPending ? (
          <ActivityIndicator color={C.blue} />
        ) : (
          !account.data?.account && (
            <Button quiet onPress={() => router.push('/account/sign-in')}>
              Sign in or create an account
            </Button>
          )
        )}
      </View>
      <Card style={{ gap: 22 }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Row>
            <Icon name="flame" color={C.gold} size={24} />
            <Label color={C.gold}>Your daily streak</Label>
          </Row>
          <Body>Best · {streak.best} days</Body>
        </Row>
        <Row style={{ alignItems: 'baseline', gap: 10 }}>
          <Text
            selectable
            style={{
              color: C.text,
              fontSize: 58,
              fontWeight: '600',
              letterSpacing: -2,
              fontVariant: ['tabular-nums'],
            }}
          >
            {streak.current}
          </Text>
          <Text style={{ color: C.muted, fontSize: 20 }}>
            {streak.current === 1 ? 'day' : 'days'} in a row
          </Text>
        </Row>
        <Row style={{ justifyContent: 'space-between', gap: 5 }}>
          {streak.days.map((day) => (
            <View key={day.date} style={{ flex: 1, alignItems: 'center', gap: 9 }}>
              <Text style={{ color: C.muted, fontSize: 12 }}>
                {formatDate(day.date, { weekday: 'short' })}
              </Text>
              <View
                accessible
                accessibilityLabel={`${formatDate(day.date)}: ${day.active ? 'activity logged' : 'no activity'}`}
                style={{
                  width: 33,
                  height: 33,
                  borderRadius: 17,
                  backgroundColor: day.active ? C.blue : C.elevated,
                  borderWidth: day.date === today ? 1.5 : 0,
                  borderColor: C.blue,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {day.active ? (
                  <Icon name="check" color="#fff" size={18} />
                ) : (
                  <View
                    style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: C.muted }}
                  />
                )}
              </View>
            </View>
          ))}
        </Row>
        <Body>
          {streak.todayComplete
            ? 'You showed up today. Keep growing.'
            : 'Log a meal or go for a run to keep your streak going.'}{' '}
          Each calendar day counts once.
        </Body>
        {connection.data?.connected && (runs.isPending || !runs.data?.complete || runs.error) && (
          <Body>
            {runs.error
              ? 'Run history is unavailable. Your streak currently includes the meal and run data we could load.'
              : 'Your run history is loading. This streak may increase as runs arrive.'}
          </Body>
        )}
      </Card>
      <Card style={{ paddingVertical: 4, gap: 0 }}>
        <SettingsRow
          icon="account"
          title="Edit profile"
          detail="Personal details, email & password"
          onPress={() => router.push('/account/profile')}
        />
        <View style={{ height: 1, backgroundColor: C.border }} />
        <SettingsRow
          icon="sun"
          title="App appearance"
          detail={appearanceDetail}
          onPress={() => router.push('/account/appearance')}
        />
        <View style={{ height: 1, backgroundColor: C.border }} />
        <SettingsRow
          icon="settings"
          title="Preferences"
          detail={`${journal.preferences.units === 'us' ? 'US customary' : 'Metric'} units · Your app, your way`}
          onPress={() => router.push('/account/preferences')}
        />
      </Card>
      {account.data?.account && (
        <Card style={{ gap: 12 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <View style={{ flex: 1, gap: 5 }}>
              <Label>Cross-device sync</Label>
              <Body>
                {sync.state === 'syncing'
                  ? 'Syncing your journal…'
                  : sync.state === 'offline'
                    ? 'Saved here. Growth will sync when you’re back online.'
                    : sync.state === 'error'
                      ? (sync.message ?? 'Your journal could not be synced.')
                      : sync.updatedAt
                        ? `Synced ${new Date(sync.updatedAt).toLocaleString()}`
                        : 'Your journal will follow this account to your other devices.'}
              </Body>
            </View>
            {sync.state === 'syncing' ? (
              <ActivityIndicator color={C.blue} />
            ) : (
              <Button quiet onPress={requestJournalSync}>
                Sync now
              </Button>
            )}
          </Row>
        </Card>
      )}
      {account.error && (
        <Body>
          Account service unavailable. Your local profile and preferences are still available.
        </Body>
      )}
      {action.error && <Notice message={action.error} />}
      {account.data?.account && (
        <Button quiet loading={action.busy} onPress={() => void action.run(actions.signOut)}>
          Sign out
        </Button>
      )}
      <Body>
        {account.data?.account
          ? 'Your meals, weights, lifts, goals, profile, and preferences are encrypted in transit and synced to your Growth account.'
          : 'Your journal and preferences stay on this device until you sign in.'}
      </Body>
    </Page>
  );
}
