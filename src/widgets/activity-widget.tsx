import { Chart, HStack, Spacer, Text, VStack, ZStack } from '@expo/ui/swift-ui';
import { containerBackground, font, foregroundStyle, frame, lineLimit, padding } from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';
import type { ActivityWidgetSnapshot } from '@/domain/widget-snapshots';

function ActivityView(props: ActivityWidgetSnapshot, environment: WidgetEnvironment) {
  'widget';
  const surface = '#595959';
  const white = '#FFFFFF';
  const muted = '#D7D7D7';
  const blue = '#4F82F5';
  const purple = '#A586EC';
  const orange = '#F2B766';
  const title = <Text modifiers={[font({ size: 22, weight: 'semibold' }), foregroundStyle(white)]}>Activity</Text>;
  const chartData = (values: number[]) => (values.length ? values : [0]).map((value, index) => ({ x: index, y: value }));
  if (environment.widgetFamily === 'systemSmall') {
    return (
      <VStack alignment="leading" spacing={6} modifiers={[padding({ all: 16 }), containerBackground(surface, 'widget')]}>
        {title}
        <Spacer />
        <HStack spacing={8}>
          <VStack spacing={3}><Text modifiers={[font({ size: 11, weight: 'semibold' }), foregroundStyle(blue)]}>Running</Text><Text modifiers={[font({ size: 16 }), foregroundStyle(white), lineLimit(1)]}>{props.categories.running} {props.distanceUnit}</Text></VStack>
          <VStack spacing={3}><Text modifiers={[font({ size: 11, weight: 'semibold' }), foregroundStyle(purple)]}>Hiking</Text><Text modifiers={[font({ size: 16 }), foregroundStyle(white), lineLimit(1)]}>{props.categories.hiking} {props.distanceUnit}</Text></VStack>
        </HStack>
        <VStack spacing={3}><Text modifiers={[font({ size: 11, weight: 'semibold' }), foregroundStyle(orange)]}>Walking</Text><Text modifiers={[font({ size: 16 }), foregroundStyle(white), lineLimit(1)]}>{props.categories.walking} {props.distanceUnit}</Text></VStack>
      </VStack>
    );
  }
  if (environment.widgetFamily === 'systemMedium') {
    return (
      <VStack alignment="leading" spacing={6} modifiers={[padding({ all: 17 }), containerBackground(surface, 'widget')]}>
        {title}
        <HStack spacing={14}>
          <Text modifiers={[font({ size: 11 }), foregroundStyle(blue)]}>Running</Text>
          <Text modifiers={[font({ size: 11 }), foregroundStyle(purple)]}>Hiking</Text>
          <Text modifiers={[font({ size: 11 }), foregroundStyle(orange)]}>Walking</Text>
        </HStack>
        <ZStack modifiers={[frame({ height: 75, maxWidth: 500 })]}>
          <Chart data={chartData(props.trends.running)} type="line" showGrid lineStyle={{ color: blue, width: 3, pointStyle: 'circle', pointSize: 4 }} modifiers={[frame({ height: 75, maxWidth: 500 })]} />
          <Chart data={chartData(props.trends.hiking)} type="line" lineStyle={{ color: purple, width: 3, pointStyle: 'circle', pointSize: 4 }} modifiers={[frame({ height: 75, maxWidth: 500 })]} />
          <Chart data={chartData(props.trends.walking)} type="line" lineStyle={{ color: orange, width: 3, pointStyle: 'circle', pointSize: 4 }} modifiers={[frame({ height: 75, maxWidth: 500 })]} />
        </ZStack>
      </VStack>
    );
  }
  return (
    <VStack alignment="leading" spacing={16} modifiers={[padding({ all: 20 }), containerBackground(surface, 'widget')]}>
      {title}
      <HStack spacing={10}>
        <VStack spacing={6}><Text modifiers={[font({ size: 15, weight: 'semibold' }), foregroundStyle(blue)]}>Running</Text><Text modifiers={[font({ size: 22 }), foregroundStyle(white)]}>{props.categories.running} {props.distanceUnit}</Text></VStack>
        <Spacer />
        <VStack spacing={6}><Text modifiers={[font({ size: 15, weight: 'semibold' }), foregroundStyle(purple)]}>Hiking</Text><Text modifiers={[font({ size: 22 }), foregroundStyle(white)]}>{props.categories.hiking} {props.distanceUnit}</Text></VStack>
        <Spacer />
        <VStack spacing={6}><Text modifiers={[font({ size: 15, weight: 'semibold' }), foregroundStyle(orange)]}>Walking</Text><Text modifiers={[font({ size: 22 }), foregroundStyle(white)]}>{props.categories.walking} {props.distanceUnit}</Text></VStack>
      </HStack>
      <ZStack modifiers={[frame({ height: 190, maxWidth: 500 })]}>
        <Chart data={chartData(props.trends.running)} type="line" showGrid lineStyle={{ color: blue, width: 4, pointStyle: 'circle', pointSize: 5 }} modifiers={[frame({ height: 190, maxWidth: 500 })]} />
        <Chart data={chartData(props.trends.hiking)} type="line" lineStyle={{ color: purple, width: 3, pointStyle: 'circle', pointSize: 5 }} modifiers={[frame({ height: 190, maxWidth: 500 })]} />
        <Chart data={chartData(props.trends.walking)} type="line" lineStyle={{ color: orange, width: 3, pointStyle: 'circle', pointSize: 5 }} modifiers={[frame({ height: 190, maxWidth: 500 })]} />
      </ZStack>
      <Text modifiers={[font({ size: 11 }), foregroundStyle(muted)]}>Last 7 days</Text>
    </VStack>
  );
}

export default createWidget('ActivityWidget', ActivityView);
