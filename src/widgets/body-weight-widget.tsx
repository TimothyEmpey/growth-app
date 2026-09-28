import { HStack, Image, RoundedRectangle, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import {
  background,
  font,
  foregroundStyle,
  frame,
  lineLimit,
  padding,
} from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';
import type { WeightWidgetSnapshot } from '@/domain/widget-snapshots';

function BodyWeightView(props: WeightWidgetSnapshot, environment: WidgetEnvironment) {
  'widget';
  const navy = '#121C31';
  const white = '#F8FAFF';
  const muted = '#A9B4C8';
  const blue = '#62A8FF';
  const values = props.history.length ? props.history : [0];
  const low = Math.min(...values);
  const high = Math.max(...values);
  const range = Math.max(high - low, 1);
  const title = (
    <HStack spacing={8}>
      <Image systemName="scalemass.fill" size={17} color={blue} />
      <Text modifiers={[font({ size: 15, weight: 'semibold' }), foregroundStyle(white)]}>
        Body Weight
      </Text>
    </HStack>
  );
  if (environment.widgetFamily === 'systemSmall') {
    return (
      <VStack alignment="leading" spacing={10} modifiers={[padding({ all: 16 }), background(navy)]}>
        {title}
        <Spacer />
        <Text modifiers={[font({ size: 32, weight: 'bold', design: 'rounded' }), foregroundStyle(white)]}>
          {props.value} {props.unit}
        </Text>
        <Text modifiers={[font({ size: 12, weight: 'medium' }), foregroundStyle(blue)]}>
          {props.change}
        </Text>
      </VStack>
    );
  }
  return (
    <VStack alignment="leading" spacing={environment.widgetFamily === 'systemLarge' ? 18 : 12} modifiers={[padding({ all: 18 }), background(navy)]}>
      {title}
      <HStack alignment="bottom" spacing={14}>
        <VStack alignment="leading" spacing={4}>
          <Text modifiers={[font({ size: 38, weight: 'bold', design: 'rounded' }), foregroundStyle(white)]}>
            {props.value} {props.unit}
          </Text>
          <Text modifiers={[font({ size: 12 }), foregroundStyle(muted)]}>Logged {props.date}</Text>
          <Text modifiers={[font({ size: 13, weight: 'semibold' }), foregroundStyle(blue)]}>
            {props.change}
          </Text>
        </VStack>
        <Spacer />
        <HStack alignment="bottom" spacing={5} modifiers={[frame({ height: environment.widgetFamily === 'systemLarge' ? 120 : 68 })]}>
          {values.map((value, index) => (
            <RoundedRectangle
              key={`${index}-${value}`}
              cornerRadius={4}
              modifiers={[
                frame({ width: environment.widgetFamily === 'systemLarge' ? 25 : 13, height: 22 + ((value - low) / range) * (environment.widgetFamily === 'systemLarge' ? 92 : 42) }),
                foregroundStyle(index === values.length - 1 ? blue : '#31466B'),
              ]}
            />
          ))}
        </HStack>
      </HStack>
      {environment.widgetFamily === 'systemLarge' ? (
        <Text modifiers={[font({ size: 13 }), foregroundStyle(muted), lineLimit(2)]}>
          Your latest seven weigh-ins. Open Growth to add a new measurement.
        </Text>
      ) : null}
    </VStack>
  );
}

export default createWidget('BodyWeightWidget', BodyWeightView);
