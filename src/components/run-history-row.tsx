import { distanceValue } from '@/domain/account';
import { duration, formatDate, pace } from '@/domain/journal';
import type { Run } from '@/domain/types';
import type { Units } from '@/domain/account';
import { useColors } from '@/providers/appearance';
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { Body, Icon, Row } from './ui';
import { ServiceLogo } from './service-logo';

export function RunHistoryRow({ run, units }: { run: Run; units: Units }) {
  const C = useColors();
  const distanceUnit = units === 'metric' ? 'km' : 'mi';
  const hiking = run.sport === 'Hike';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${run.title} from ${formatDate(run.localDate)}`}
      onPress={() =>
        router.push({ pathname: '/run', params: { id: run.id, source: run.source ?? 'strava' } })
      }
      style={({ pressed }) => ({
        borderBottomWidth: 1,
        borderColor: C.border,
        paddingVertical: 20,
        opacity: pressed ? 0.65 : 1,
      })}
    >
      <Row>
        {run.source ? (
          <ServiceLogo
            service={
              run.source === 'nikeRunClub'
                ? 'nikeRunClub'
                : run.source === 'appleHealth'
                  ? 'appleHealth'
                  : 'strava'
            }
            size={38}
          />
        ) : (
          <View
            style={{
              width: 38,
              height: 38,
              borderRadius: 12,
              backgroundColor: hiking ? `${C.purple}12` : '#71d7b112',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name={hiking ? 'hike' : 'run'} color={hiking ? C.purple : C.green} size={21} />
          </View>
        )}
        <View style={{ flex: 1, gap: 7 }}>
          <Text style={{ color: C.text, fontSize: 16, fontWeight: '600' }}>{run.title}</Text>
          <Body>{formatDate(run.localDate)}</Body>
          <Row style={{ flexWrap: 'wrap', gap: 18 }}>
            <Text style={{ color: C.text, fontSize: 14 }}>
              {distanceValue(run.distanceMeters, units).toFixed(2)} {distanceUnit}
            </Text>
            <Text style={{ color: C.muted, fontSize: 14 }}>{duration(run.movingSeconds)}</Text>
            <Text style={{ color: C.blue, fontSize: 14 }}>
              {pace(run.movingSeconds, run.distanceMeters, units)} / {distanceUnit}
            </Text>
          </Row>
        </View>
        <Icon name="right" size={18} />
      </Row>
    </Pressable>
  );
}
