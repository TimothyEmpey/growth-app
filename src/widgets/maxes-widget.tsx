import { HStack, Image, RoundedRectangle, Spacer, Text, VStack, ZStack } from '@expo/ui/swift-ui';
import { containerBackground, font, foregroundStyle, frame, lineLimit, minimumScaleFactor, padding } from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';
import type { MaxesWidgetSnapshot } from '@/domain/widget-snapshots';

function MaxesView(props: MaxesWidgetSnapshot, environment: WidgetEnvironment) {
  'widget';
  const surface = '#181C22';
  const tintSurface = '#211F2B';
  const iconSurface = '#302C44';
  const track = '#303641';
  const text = '#F5F7FC';
  const muted = '#A2A9B8';
  const blue = '#6B98FF';
  const gold = '#EDC172';
  const purple = '#B693F6';
  const green = '#71D8B8';
  const background = {
    type: 'linearGradient' as const,
    colors: [surface, tintSurface],
    startPoint: { x: 0, y: 1 },
    endPoint: { x: 1, y: 0 },
  };
  const colors = [purple, gold, blue, green];
  const lifts = props.lifts.slice(0, 4);
  const strongest = lifts[0];
  const high = Math.max(...lifts.map((lift) => lift.numericValue), 1);
  const header = (
    <HStack spacing={10}>
      <ZStack modifiers={[frame({ width: 34, height: 34 })]}>
        <RoundedRectangle cornerRadius={10} modifiers={[frame({ width: 34, height: 34 }), foregroundStyle(iconSurface)]} />
        <Image systemName="dumbbell" size={17} color={purple} />
      </ZStack>
      <Text modifiers={[font({ size: 18, weight: 'semibold' }), foregroundStyle(text)]}>Maxes</Text>
    </HStack>
  );

  if (environment.widgetFamily === 'systemSmall') {
    return (
      <VStack alignment="leading" spacing={6} modifiers={[padding({ all: 16 }), containerBackground(background, 'widget')] }>
        {header}
        {lifts.length ? lifts.map((lift) => (
          <HStack key={lift.name}>
            <Text modifiers={[font({ size: 13 }), foregroundStyle(muted), lineLimit(1)]}>{lift.name}</Text>
            <Spacer />
            <Text modifiers={[font({ size: 13, weight: 'medium' }), foregroundStyle(text)]}>{lift.value}</Text>
          </HStack>
        )) : <Text modifiers={[font({ size: 13 }), foregroundStyle(muted)]}>Log a lift to see your maxes.</Text>}
      </VStack>
    );
  }

  if (environment.widgetFamily === 'systemMedium') {
    return (
      <HStack spacing={18} modifiers={[padding({ all: 18 }), containerBackground(background, 'widget')] }>
        <VStack alignment="leading" spacing={0} modifiers={[frame({ width: 128, alignment: 'leading' })]}>
          <HStack spacing={10}>
            <ZStack modifiers={[frame({ width: 34, height: 34 })]}>
              <RoundedRectangle cornerRadius={10} modifiers={[frame({ width: 34, height: 34 }), foregroundStyle(iconSurface)]} />
              <Image systemName="dumbbell" size={17} color={purple} />
            </ZStack>
            <VStack alignment="leading" spacing={0}>
              <Text modifiers={[font({ size: 10, weight: 'medium' }), foregroundStyle(muted)]}>STRONGEST LIFT</Text>
              <Text modifiers={[font({ size: 18, weight: 'semibold' }), foregroundStyle(text), lineLimit(1)]}>{strongest?.name ?? 'Maxes'}</Text>
            </VStack>
          </HStack>
          <Spacer />
          <HStack alignment="lastTextBaseline" spacing={4}>
            <Text modifiers={[font({ size: 38 }), foregroundStyle(text), minimumScaleFactor(0.8)]}>{strongest?.value ?? '—'}</Text>
            <Text modifiers={[font({ size: 16 }), foregroundStyle(muted)]}>{strongest ? props.unit : ''}</Text>
          </HStack>
          <Text modifiers={[font({ size: 12 }), foregroundStyle(muted)]}>{strongest ? `Logged ${strongest.date}` : 'Open Growth to log one'}</Text>
        </VStack>
        <HStack alignment="bottom" spacing={8} modifiers={[frame({ maxWidth: 170, height: 112 })]}>
          {lifts.map((lift, index) => (
            <VStack key={lift.name} spacing={4}>
              <Spacer />
              <RoundedRectangle cornerRadius={7} modifiers={[frame({ width: 28, height: 20 + (lift.numericValue / high) * 62 }), foregroundStyle(colors[index])]} />
              <Text modifiers={[font({ size: 9 }), foregroundStyle(muted), lineLimit(1)]}>{lift.shortName}</Text>
            </VStack>
          ))}
        </HStack>
      </HStack>
    );
  }

  return (
    <VStack alignment="leading" spacing={16} modifiers={[padding({ all: 20 }), containerBackground(background, 'widget')] }>
      <HStack spacing={10}>
        <ZStack modifiers={[frame({ width: 34, height: 34 })]}>
          <RoundedRectangle cornerRadius={10} modifiers={[frame({ width: 34, height: 34 }), foregroundStyle(iconSurface)]} />
          <Image systemName="dumbbell" size={17} color={purple} />
        </ZStack>
        <VStack alignment="leading" spacing={0}>
          <Text modifiers={[font({ size: 10, weight: 'medium' }), foregroundStyle(muted)]}>CURRENT RECORDS</Text>
          <Text modifiers={[font({ size: 18, weight: 'semibold' }), foregroundStyle(text)]}>Maxes</Text>
        </VStack>
      </HStack>
      {lifts.length ? lifts.map((lift, index) => (
        <HStack key={lift.name} spacing={12}>
          <Text modifiers={[font({ size: 15 }), foregroundStyle(muted), frame({ width: 88, alignment: 'leading' }), lineLimit(1)]}>{lift.name}</Text>
          <ZStack modifiers={[frame({ maxWidth: 170, height: 8 })]}>
            <RoundedRectangle cornerRadius={4} modifiers={[frame({ maxWidth: 170, height: 8 }), foregroundStyle(track)]} />
            <RoundedRectangle cornerRadius={4} modifiers={[frame({ width: Math.max(18, (lift.numericValue / high) * 170), height: 8, alignment: 'leading' }), foregroundStyle(colors[index])]} />
          </ZStack>
          <Spacer />
          <Text modifiers={[font({ size: 18, weight: 'medium' }), foregroundStyle(text)]}>{lift.value}</Text>
        </HStack>
      )) : <Text modifiers={[font({ size: 14 }), foregroundStyle(muted)]}>Your current maxes will appear after you log a lift.</Text>}
      <Spacer />
      <Text modifiers={[font({ size: 12 }), foregroundStyle(muted)]}>All values in {props.unit === 'lb' ? 'pounds' : 'kilograms'} · all-rep records</Text>
    </VStack>
  );
}

export default createWidget('MaxesWidget', MaxesView);
