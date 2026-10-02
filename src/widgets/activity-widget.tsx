import { Chart, HStack, Image, RoundedRectangle, Spacer, Text, VStack, ZStack } from '@expo/ui/swift-ui';
import { containerBackground, font, foregroundStyle, frame, lineLimit, minimumScaleFactor, padding } from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';
import type { ActivityWidgetSnapshot } from '@/domain/widget-snapshots';

function ActivityView(props: ActivityWidgetSnapshot, environment: WidgetEnvironment) {
  'widget';
  const surface = '#181C22';
  const tintSurface = '#1D2929';
  const iconSurface = '#223936';
  const text = '#F5F7FC';
  const muted = '#A2A9B8';
  const green = '#71D8B8';
  const blue = '#6B98FF';
  const purple = '#B693F6';
  const gold = '#EDC172';
  const background = {
    type: 'linearGradient' as const,
    colors: [surface, tintSurface],
    startPoint: { x: 0, y: 1 },
    endPoint: { x: 1, y: 0 },
  };
  const running = props.runningHistory.map((value, index) => ({ x: index, y: value }));
  const hiking = props.hikingHistory.map((value, index) => ({ x: index, y: value }));
  const walking = props.walkingHistory.map((value, index) => ({ x: index, y: value }));
  const header = (
    <HStack spacing={10}>
      <ZStack modifiers={[frame({ width: 34, height: 34 })]}>
        <RoundedRectangle cornerRadius={10} modifiers={[frame({ width: 34, height: 34 }), foregroundStyle(iconSurface)]} />
        <Image systemName="waveform.path.ecg" size={17} color={green} />
      </ZStack>
      <VStack alignment="leading" spacing={0}>
        {environment.widgetFamily === 'systemSmall' ? null : <Text modifiers={[font({ size: 10, weight: 'medium' }), foregroundStyle(muted)]}>{environment.widgetFamily === 'systemLarge' ? 'LAST 30 DAYS' : '30 DAYS'}</Text>}
        <Text modifiers={[font({ size: 18, weight: 'semibold' }), foregroundStyle(text)]}>Activity</Text>
      </VStack>
    </HStack>
  );

  if (environment.widgetFamily === 'systemSmall') {
    return (
      <VStack alignment="leading" spacing={5} modifiers={[padding({ all: 16 }), containerBackground(background, 'widget')] }>
        {header}
        <HStack alignment="lastTextBaseline" spacing={4}>
          <Text modifiers={[font({ size: 37 }), foregroundStyle(text), minimumScaleFactor(0.72), lineLimit(1)]}>{props.distance}</Text>
          <Text modifiers={[font({ size: 16 }), foregroundStyle(muted)]}>{props.distanceUnit}</Text>
        </HStack>
        <Text modifiers={[font({ size: 13 }), foregroundStyle(muted)]}>Last 30 days</Text>
        <HStack spacing={12}>
          <Text modifiers={[font({ size: 12, weight: 'medium' }), foregroundStyle(blue)]}>{props.running} run</Text>
          <Text modifiers={[font({ size: 12, weight: 'medium' }), foregroundStyle(purple)]}>{props.hiking} hike</Text>
        </HStack>
        <ZStack modifiers={[frame({ width: 92, height: 28 })]}>
          <RoundedRectangle cornerRadius={14} modifiers={[frame({ width: 92, height: 28 }), foregroundStyle(iconSurface)]} />
          <Text modifiers={[font({ size: 12, weight: 'medium' }), foregroundStyle(green)]}>{props.count} activities</Text>
        </ZStack>
      </VStack>
    );
  }

  const graph = (
    <ZStack modifiers={[frame({ maxWidth: 230, height: environment.widgetFamily === 'systemLarge' ? 155 : 92 })]}>
      <Chart data={running} type="line" showGrid lineStyle={{ color: blue, width: 3 }} modifiers={[frame({ maxWidth: 230, height: environment.widgetFamily === 'systemLarge' ? 155 : 92 })]} />
      <Chart data={hiking} type="line" showGrid={false} lineStyle={{ color: purple, width: 3 }} modifiers={[frame({ maxWidth: 230, height: environment.widgetFamily === 'systemLarge' ? 155 : 92 })]} />
      <Chart data={walking} type="line" showGrid={false} lineStyle={{ color: gold, width: 3 }} modifiers={[frame({ maxWidth: 230, height: environment.widgetFamily === 'systemLarge' ? 155 : 92 })]} />
    </ZStack>
  );

  if (environment.widgetFamily === 'systemMedium') {
    return (
      <HStack spacing={18} modifiers={[padding({ all: 18 }), containerBackground(background, 'widget')] }>
        <VStack alignment="leading" spacing={2} modifiers={[frame({ width: 120, alignment: 'leading' })]}>
          {header}
          <Spacer />
          <HStack alignment="lastTextBaseline" spacing={4}>
            <Text modifiers={[font({ size: 36 }), foregroundStyle(text)]}>{props.distance}</Text>
            <Text modifiers={[font({ size: 15 }), foregroundStyle(muted)]}>{props.distanceUnit}</Text>
          </HStack>
          <Text modifiers={[font({ size: 12 }), foregroundStyle(muted)]}>Across {props.count} activities</Text>
        </VStack>
        {graph}
      </HStack>
    );
  }

  return (
    <VStack alignment="leading" spacing={14} modifiers={[padding({ all: 20 }), containerBackground(background, 'widget')] }>
      {header}
      <HStack alignment="bottom">
        <VStack alignment="leading" spacing={2}>
          <HStack alignment="lastTextBaseline" spacing={5}>
            <Text modifiers={[font({ size: 48 }), foregroundStyle(text)]}>{props.distance}</Text>
            <Text modifiers={[font({ size: 18 }), foregroundStyle(muted)]}>{props.distanceUnit}</Text>
          </HStack>
          <Text modifiers={[font({ size: 13 }), foregroundStyle(muted)]}>Total distance</Text>
        </VStack>
        <Spacer />
        <VStack alignment="leading" spacing={5}>
          <HStack spacing={18}>
            <Text modifiers={[font({ size: 17, weight: 'medium' }), foregroundStyle(blue)]}>{props.running} {props.distanceUnit}</Text>
            <Text modifiers={[font({ size: 17, weight: 'medium' }), foregroundStyle(purple)]}>{props.hiking} {props.distanceUnit}</Text>
            <Text modifiers={[font({ size: 17, weight: 'medium' }), foregroundStyle(gold)]}>{props.walking} {props.distanceUnit}</Text>
          </HStack>
          <HStack spacing={28}>
            <Text modifiers={[font({ size: 12 }), foregroundStyle(muted)]}>Running</Text>
            <Text modifiers={[font({ size: 12 }), foregroundStyle(muted)]}>Hiking</Text>
            <Text modifiers={[font({ size: 12 }), foregroundStyle(muted)]}>Walking</Text>
          </HStack>
        </VStack>
      </HStack>
      {graph}
      <HStack>
        <Text modifiers={[font({ size: 11 }), foregroundStyle(muted)]}>{props.startDate}</Text>
        <Spacer />
        <Text modifiers={[font({ size: 11 }), foregroundStyle(muted)]}>{props.endDate}</Text>
      </HStack>
      <HStack spacing={12}>
        <Text modifiers={[font({ size: 11 }), foregroundStyle(blue)]}>● Running</Text>
        <Text modifiers={[font({ size: 11 }), foregroundStyle(purple)]}>● Hiking</Text>
        <Text modifiers={[font({ size: 11 }), foregroundStyle(gold)]}>● Walking</Text>
      </HStack>
    </VStack>
  );
}

export default createWidget('ActivityWidget', ActivityView);
