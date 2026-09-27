import { Image } from 'expo-image';
import type { ImageStyle, StyleProp } from 'react-native';

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
  style?: StyleProp<ImageStyle>;
}) {
  return (
    <Image
      source={sources[service]}
      accessibilityLabel={`${service === 'appleHealth' ? 'Apple Health' : service === 'nikeRunClub' ? 'Nike Run Club' : 'Strava'} logo`}
      contentFit="contain"
      style={[{ width: size, height: size, borderRadius: Math.round(size * 0.22) }, style]}
    />
  );
}
