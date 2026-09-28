import { HStack, Image, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import { background, font, foregroundStyle, lineLimit, padding } from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';
import type { ActivityWidgetSnapshot } from '@/domain/widget-snapshots';

function ActivityView(props: ActivityWidgetSnapshot, environment: WidgetEnvironment) {
  'widget';
  const navy = '#121C31';
  const white = '#F8FAFF';
  const muted = '#A9B4C8';
  const green = '#6FD0A0';
  const blue = '#62A8FF';
  const title = (
    <HStack spacing={8}>
      <Image systemName="figure.run" size={18} color={green} />
      <Text modifiers={[font({ size: 15, weight: 'semibold' }), foregroundStyle(white)]}>Activity</Text>
    </HStack>
  );
  if (environment.widgetFamily === 'systemSmall') {
    return (
      <VStack alignment="leading" spacing={8} modifiers={[padding({ all: 16 }), background(navy)]}>
        {title}
        <Spacer />
        <Text modifiers={[font({ size: 29, weight: 'bold', design: 'rounded' }), foregroundStyle(white), lineLimit(1)]}>
          {props.distance} {props.distanceUnit}
        </Text>
        <Text modifiers={[font({ size: 12 }), foregroundStyle(muted)]}>
          {props.count} {props.count === 1 ? 'activity' : 'activities'} this week
        </Text>
      </VStack>
    );
  }
  return (
    <VStack alignment="leading" spacing={environment.widgetFamily === 'systemLarge' ? 15 : 10} modifiers={[padding({ all: 18 }), background(navy)]}>
      {title}
      <HStack>
        <VStack alignment="leading" spacing={3}>
          <Text modifiers={[font({ size: 30, weight: 'bold', design: 'rounded' }), foregroundStyle(white)]}>
            {props.distance} {props.distanceUnit}
          </Text>
          <Text modifiers={[font({ size: 12 }), foregroundStyle(muted)]}>Last 7 days</Text>
        </VStack>
        <Spacer />
        <VStack alignment="trailing" spacing={3}>
          <Text modifiers={[font({ size: 22, weight: 'bold' }), foregroundStyle(blue)]}>{props.count}</Text>
          <Text modifiers={[font({ size: 11 }), foregroundStyle(muted)]}>activities · {props.movingMinutes} min</Text>
        </VStack>
      </HStack>
      {environment.widgetFamily === 'systemLarge' ? (
        <VStack alignment="leading" spacing={10}>
          {props.recent.length ? props.recent.map((run) => (
            <HStack key={`${run.date}-${run.title}`}>
              <VStack alignment="leading" spacing={2}>
                <Text modifiers={[font({ size: 13, weight: 'medium' }), foregroundStyle(white), lineLimit(1)]}>{run.title}</Text>
                <Text modifiers={[font({ size: 11 }), foregroundStyle(muted)]}>{run.date}</Text>
              </VStack>
              <Spacer />
              <Text modifiers={[font({ size: 13, weight: 'semibold' }), foregroundStyle(green)]}>{run.distance}</Text>
            </HStack>
          )) : (
            <Text modifiers={[font({ size: 13 }), foregroundStyle(muted)]}>Your connected activities will appear here.</Text>
          )}
        </VStack>
      ) : null}
    </VStack>
  );
}

export default createWidget('ActivityWidget', ActivityView);
