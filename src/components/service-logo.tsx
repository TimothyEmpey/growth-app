import { Image } from 'expo-image';
import { View, type StyleProp, type ViewStyle } from 'react-native';

export type ServiceName = 'appleHealth' | 'strava' | 'nikeRunClub';

const sources = {
  appleHealth: require('../../assets/images/service-logos/apple-health.png'),
  strava: require('../../assets/images/service-logos/strava.png'),
  nikeRunClub: require('../../assets/images/service-logos/nike-run-club.png'),
} as const;

export function ServiceLogo({
  service,
  size = 44,
  style,
}: {
  service: ServiceName;
  size?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const radius = Math.round(size * 0.22);
  return (
    <View style={[{ width: size, height: size, borderRadius: radius, overflow: 'hidden' }, style]}>
      <Image
        source={sources[service]}
        accessibilityLabel={`${service === 'appleHealth' ? 'Apple Health' : service === 'nikeRunClub' ? 'Nike Run Club' : 'Strava'} logo`}
        contentFit="contain"
        style={{
          width: size,
          height: size,
          borderRadius: radius,
          transform: service === 'strava' ? [{ scale: 1.13 }] : undefined,
        }}
      />
    </View>
  );
}
