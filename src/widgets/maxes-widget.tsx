import { Circle, HStack, RoundedRectangle, Spacer, Text, VStack, ZStack } from '@expo/ui/swift-ui';
import { containerBackground, font, foregroundStyle, frame, lineLimit, offset, padding, strokeBorder } from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';
import type { MaxesWidgetSnapshot } from '@/domain/widget-snapshots';

function MaxesView(props: MaxesWidgetSnapshot, environment: WidgetEnvironment) {
  'widget';
  const surface = '#595959';
  const white = '#FFFFFF';
  const muted = '#D7D7D7';
  const colors = ['#4F82F5', '#A586EC', '#F2B766', '#F2D45E'];
  const lifts = props.lifts.slice(0, 4);
  const strongest = lifts[0];
  const header = <Text modifiers={[font({ size: 22, weight: 'semibold' }), foregroundStyle(white)]}>Maxes</Text>;
  if (environment.widgetFamily === 'systemSmall') {
    return (
      <VStack alignment="leading" spacing={7} modifiers={[padding({ all: 16 }), containerBackground(surface, 'widget')]}>
        {header}
        <Spacer />
        {lifts.length ? lifts.map((lift) => (
          <HStack key={lift.name}>
            <Text modifiers={[font({ size: 12, weight: 'regular' }), foregroundStyle(muted), lineLimit(1)]}>{lift.name}</Text>
            <Spacer />
            <Text modifiers={[font({ size: 12, weight: 'semibold' }), foregroundStyle(white)]}>{lift.value}</Text>
          </HStack>
        )) : (
          <Text modifiers={[font({ size: 12 }), foregroundStyle(muted)]}>Log a lift to see your maxes.</Text>
        )}
      </VStack>
    );
  }
  if (environment.widgetFamily === 'systemMedium') {
    return (
      <VStack alignment="leading" spacing={7} modifiers={[padding({ all: 17 }), containerBackground(surface, 'widget')]}>
          <Text modifiers={[font({ size: 22, weight: 'semibold' }), foregroundStyle(white), lineLimit(1)]}>
            {strongest?.name ?? 'No max yet'}
          </Text>
          <HStack alignment="bottom" spacing={16}>
            {lifts.map((lift, index) => {
              const ratio = Number(lift.value) / Math.max(Number(strongest?.value ?? 1), 1);
              return <VStack key={lift.name} spacing={3}><Spacer /><RoundedRectangle cornerRadius={7} modifiers={[frame({ width: 48, height: Math.max(18, ratio * 67) }), foregroundStyle(colors[index])]} /><Text modifiers={[font({ size: 9 }), foregroundStyle(muted), lineLimit(1)]}>{lift.name}</Text></VStack>;
            })}
          </HStack>
          <Text modifiers={[font({ size: 11 }), foregroundStyle(muted)]}>{strongest?.date ?? 'No entries yet'}</Text>
      </VStack>
    );
  }
  return (
    <VStack alignment="leading" spacing={8} modifiers={[padding({ all: 20 }), containerBackground(surface, 'widget')]}>
      {header}
      {lifts.length ? (
        <ZStack modifiers={[frame({ height: 280, maxWidth: 500 })]}>
          {lifts.map((lift, index) => {
            const sizes = [166, 146, 128, 108];
            const x = [-66, 64, 10, 12][index];
            const y = [4, 16, 85, -82][index];
            return (
              <ZStack key={lift.name} modifiers={[offset({ x, y })]}>
                <Circle modifiers={[frame({ width: sizes[index], height: sizes[index] }), foregroundStyle('#666666'), strokeBorder({ content: colors[index], style: { lineWidth: 11 }, shape: 'circle' })]} />
                <VStack spacing={3}>
                  <Text modifiers={[font({ size: index === 3 ? 11 : 13, weight: 'semibold' }), foregroundStyle(white), lineLimit(1)]}>{lift.name}</Text>
                  <Text modifiers={[font({ size: index === 3 ? 18 : 23, weight: 'regular', design: 'rounded' }), foregroundStyle(white)]}>{lift.value}</Text>
                </VStack>
              </ZStack>
            );
          })}
        </ZStack>
      ) : (
        <Text modifiers={[font({ size: 14 }), foregroundStyle(muted)]}>Your current maxes will appear after you log a lift.</Text>
      )}
    </VStack>
  );
}

export default createWidget('MaxesWidget', MaxesView);
