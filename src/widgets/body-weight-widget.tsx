import { Chart, HStack, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import {
  containerBackground,
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
  const surface = '#595959';
  const white = '#FFFFFF';
  const muted = '#D7D7D7';
  const blue = '#4F82F5';
  const values = props.history.length ? props.history : [0];
  const chartData = values.map((value, index) => ({ x: index, y: value }));
  const title = <Text modifiers={[font({ size: 22, weight: 'semibold' }), foregroundStyle(white)]}>Body Weight</Text>;
  if (environment.widgetFamily === 'systemSmall') {
    return (
      <VStack alignment="leading" spacing={6} modifiers={[padding({ all: 16 }), containerBackground(surface, 'widget')]}>
        {title}
        <Spacer />
        <HStack alignment="firstTextBaseline" spacing={5}>
          <Text modifiers={[font({ size: 29, weight: 'regular', design: 'rounded' }), foregroundStyle(white), lineLimit(1)]}>{props.value}</Text>
          <Text modifiers={[font({ size: 11 }), foregroundStyle(muted), lineLimit(1)]}>{props.change}</Text>
        </HStack>
        <Text modifiers={[font({ size: 12 }), foregroundStyle(muted)]}>{props.unit} · Last recorded</Text>
      </VStack>
    );
  }
  if (environment.widgetFamily === 'systemMedium') {
    return (
      <VStack alignment="leading" spacing={8} modifiers={[padding({ all: 17 }), containerBackground(surface, 'widget')]}>
        {title}
        <Chart data={chartData} type="line" showGrid lineStyle={{ color: blue, width: 3, pointStyle: 'circle', pointSize: 5 }} modifiers={[frame({ height: 90, maxWidth: 500 })]} />
      </VStack>
    );
  }
  return (
    <VStack alignment="leading" spacing={10} modifiers={[padding({ all: 20 }), containerBackground(surface, 'widget')]}>
      {title}
      <HStack alignment="firstTextBaseline" spacing={6}>
        <Text modifiers={[font({ size: 35, weight: 'regular', design: 'rounded' }), foregroundStyle(white)]}>{props.value} {props.unit}</Text>
        <Text modifiers={[font({ size: 12 }), foregroundStyle(muted)]}>{props.change}</Text>
      </HStack>
      <Text modifiers={[font({ size: 13 }), foregroundStyle(muted)]}>Last recorded · {props.date}</Text>
      <Chart data={chartData} type="line" showGrid lineStyle={{ color: blue, width: 4, pointStyle: 'circle', pointSize: 6 }} modifiers={[frame({ height: 205, maxWidth: 500 })]} />
    </VStack>
  );
}

export default createWidget('BodyWeightWidget', BodyWeightView);
