import { HStack, Image, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import { background, font, foregroundStyle, lineLimit, padding } from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';
import type { MaxesWidgetSnapshot } from '@/domain/widget-snapshots';

function MaxesView(props: MaxesWidgetSnapshot, environment: WidgetEnvironment) {
  'widget';
  const navy = '#121C31';
  const white = '#F8FAFF';
  const muted = '#A9B4C8';
  const purple = '#B99AFF';
  const lifts = props.lifts.slice(0, 4);
  const strongest = lifts[0];
  const header = (
    <HStack spacing={8}>
      <Image systemName="dumbbell.fill" size={18} color={purple} />
      <Text modifiers={[font({ size: 15, weight: 'semibold' }), foregroundStyle(white)]}>Maxes</Text>
    </HStack>
  );
  if (environment.widgetFamily === 'systemSmall') {
    return (
      <VStack alignment="leading" spacing={9} modifiers={[padding({ all: 16 }), background(navy)]}>
        {header}
        <Spacer />
        {lifts.length ? lifts.map((lift) => (
          <HStack key={lift.name}>
            <Text modifiers={[font({ size: 12, weight: 'medium' }), foregroundStyle(white), lineLimit(1)]}>{lift.name}</Text>
            <Spacer />
            <Text modifiers={[font({ size: 12, weight: 'semibold' }), foregroundStyle(purple)]}>{lift.value}</Text>
          </HStack>
        )) : (
          <Text modifiers={[font({ size: 12 }), foregroundStyle(muted)]}>Log a lift to see your maxes.</Text>
        )}
      </VStack>
    );
  }
  if (environment.widgetFamily === 'systemMedium') {
    return (
      <HStack spacing={18} modifiers={[padding({ all: 18 }), background(navy)]}>
        <VStack alignment="leading" spacing={5}>
          <Text modifiers={[font({ size: 11, weight: 'semibold' }), foregroundStyle(muted)]}>STRONGEST LIFT</Text>
          <Text modifiers={[font({ size: 21, weight: 'bold' }), foregroundStyle(white), lineLimit(1)]}>
            {strongest?.name ?? 'No max yet'}
          </Text>
          <Spacer />
          <Text modifiers={[font({ size: 34, weight: 'bold', design: 'rounded' }), foregroundStyle(purple)]}>
            {strongest ? `${strongest.value} ${props.unit}` : '—'}
          </Text>
          <Text modifiers={[font({ size: 12 }), foregroundStyle(muted)]}>
            {strongest ? `Logged ${strongest.date}` : 'Open Growth to log one'}
          </Text>
        </VStack>
        <Spacer />
        <VStack alignment="trailing" spacing={9}>
          {lifts.slice(1).map((lift) => (
            <VStack key={lift.name} alignment="trailing" spacing={1}>
              <Text modifiers={[font({ size: 11 }), foregroundStyle(muted), lineLimit(1)]}>{lift.name}</Text>
              <Text modifiers={[font({ size: 15, weight: 'semibold' }), foregroundStyle(white)]}>{lift.value} {props.unit}</Text>
            </VStack>
          ))}
        </VStack>
      </HStack>
    );
  }
  return (
    <VStack alignment="leading" spacing={16} modifiers={[padding({ all: 20 }), background(navy)]}>
      {header}
      <Text modifiers={[font({ size: 12 }), foregroundStyle(muted)]}>Current records</Text>
      {lifts.length ? lifts.map((lift, index) => (
        <HStack key={lift.name}>
          <VStack alignment="leading" spacing={2}>
            <Text modifiers={[font({ size: 16, weight: 'semibold' }), foregroundStyle(white)]}>{lift.name}</Text>
            <Text modifiers={[font({ size: 11 }), foregroundStyle(muted)]}>Logged {lift.date}</Text>
          </VStack>
          <Spacer />
          <Text modifiers={[font({ size: index === 0 ? 22 : 18, weight: 'bold', design: 'rounded' }), foregroundStyle(index === 0 ? purple : white)]}>
            {lift.value} {props.unit}
          </Text>
        </HStack>
      )) : (
        <Text modifiers={[font({ size: 14 }), foregroundStyle(muted)]}>Your current maxes will appear after you log a lift.</Text>
      )}
    </VStack>
  );
}

export default createWidget('MaxesWidget', MaxesView);
