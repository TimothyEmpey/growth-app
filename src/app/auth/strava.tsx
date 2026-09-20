import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { finishStrava } from '@/services/auth';
import { Body, Button, C, Notice } from '@/components/ui';

export default function StravaCallback() {
  const { code, error } = useLocalSearchParams<{ code?: string; error?: string }>();
  const [message, setMessage] = useState(error);
  const client = useQueryClient();
  useEffect(() => {
    if (!code || error) return;
    void finishStrava(code)
      .then(async () => {
        await client.invalidateQueries({ queryKey: ['strava'] });
        router.replace('/running');
      })
      .catch((e) => setMessage(e.message));
  }, [code, error, client]);
  return (
    <View
      style={{ flex: 1, padding: 28, justifyContent: 'center', gap: 20, backgroundColor: C.bg }}
    >
      {message || !code ? (
        <>
          <Notice message={message ?? 'This connection link has expired. Please try again.'} />
          <Button onPress={() => router.replace('/running')}>Back to running</Button>
        </>
      ) : (
        <>
          <ActivityIndicator color={C.blue} />
          <Body>Finishing your Strava connection…</Body>
        </>
      )}
    </View>
  );
}
