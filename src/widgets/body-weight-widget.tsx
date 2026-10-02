import { Chart, HStack, Image, RoundedRectangle, Spacer, Text, VStack, ZStack } from '@expo/ui/swift-ui';
import {
  containerBackground,
  font,
  foregroundStyle,
  frame,
  lineLimit,
  minimumScaleFactor,
  padding,
} from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';
import type { WeightWidgetSnapshot } from '@/domain/widget-snapshots';

function BodyWeightView(props: WeightWidgetSnapshot, environment: WidgetEnvironment) {
  'widget';
  const iconSurface = '#252F43';
  const text = '#F5F7FC';
  const muted = '#A2A9B8';
  const blue = '#6B98FF';
  const background = {
    type: 'linearGradient' as const,
    colors: ['#181C22', '#20283A'],
    startPoint: { x: 0, y: 1 },
    endPoint: { x: 1, y: 0 },
  };
  const history = props.history.length ? props.history : [0, 0];
  const chart = history.map((value, index) => ({ x: index, y: value }));
  const header = (
    <HStack spacing={10}>
      <ZStack modifiers={[frame({ width: 34, height: 34 })]}>
        <RoundedRectangle cornerRadius={10} modifiers={[frame({ width: 34, height: 34 }), foregroundStyle(iconSurface)]} />
        <Image systemName="scalemass" size={17} color={blue} />
      </ZStack>
      <Text modifiers={[font({ size: 18, weight: 'semibold' }), foregroundStyle(text)]}>
        {environment.widgetFamily === 'systemSmall' ? 'Weight' : 'Body weight'}
      </Text>
    </HStack>
  );

  if (environment.widgetFamily === 'systemSmall') {
    return (
      <VStack alignment="leading" spacing={6} modifiers={[padding({ all: 16 }), containerBackground(background, 'widget')] }>
        {header}
        <HStack alignment="lastTextBaseline" spacing={4}>
          <Text modifiers={[font({ size: 37, weight: 'regular' }), foregroundStyle(text), minimumScaleFactor(0.75), lineLimit(1)]}>{props.value}</Text>
          <Text modifiers={[font({ size: 17 }), foregroundStyle(muted)]}>{props.unit}</Text>
        </HStack>
        <ZStack modifiers={[frame({ width: 86, height: 28 })]}>
          <RoundedRectangle cornerRadius={14} modifiers={[frame({ width: 86, height: 28 }), foregroundStyle(iconSurface)]} />
          <Text modifiers={[font({ size: 13, weight: 'medium' }), foregroundStyle(blue)]}>↓ {props.change} {props.unit}</Text>
        </ZStack>
        <Text modifiers={[font({ size: 12 }), foregroundStyle(muted)]}>Updated today</Text>
      </VStack>
    );
  }

  if (environment.widgetFamily === 'systemMedium') {
    return (
      <HStack spacing={20} modifiers={[padding({ all: 18 }), containerBackground(background, 'widget')] }>
        <VStack alignment="leading" spacing={3} modifiers={[frame({ width: 128, alignment: 'leading' })]}>
          {header}
          <Spacer />
          <HStack alignment="lastTextBaseline" spacing={4}>
            <Text modifiers={[font({ size: 39 }), foregroundStyle(text), minimumScaleFactor(0.8), lineLimit(1)]}>{props.value}</Text>
            <Text modifiers={[font({ size: 16 }), foregroundStyle(muted)]}>{props.unit}</Text>
          </HStack>
          <Text modifiers={[font({ size: 13 }), foregroundStyle(muted)]}>{props.change} {props.unit} this month</Text>
        </VStack>
        <Chart
          data={chart}
          type="line"
          showGrid={false}
          lineStyle={{ color: blue, width: 3, pointStyle: 'circle', pointSize: 5 }}
          modifiers={[frame({ maxWidth: 170, height: 92 })]}
        />
      </HStack>
    );
  }

  return (
    <VStack alignment="leading" spacing={14} modifiers={[padding({ all: 20 }), containerBackground(background, 'widget')] }>
      {header}
      <HStack alignment="bottom">
        <VStack alignment="leading" spacing={2}>
          <HStack alignment="lastTextBaseline" spacing={5}>
            <Text modifiers={[font({ size: 48 }), foregroundStyle(text)]}>{props.value}</Text>
            <Text modifiers={[font({ size: 18 }), foregroundStyle(muted)]}>{props.unit}</Text>
          </HStack>
          <Text modifiers={[font({ size: 13 }), foregroundStyle(muted)]}>Last recorded {props.date}</Text>
        </VStack>
        <Spacer />
        <VStack alignment="trailing" spacing={2}>
          <Text modifiers={[font({ size: 20, weight: 'medium' }), foregroundStyle(blue)]}>{props.change} {props.unit}</Text>
          <Text modifiers={[font({ size: 13 }), foregroundStyle(muted)]}>Last 30 days</Text>
        </VStack>
      </HStack>
      <HStack spacing={10}>
        <VStack spacing={0} modifiers={[frame({ width: 26, height: 150 })]}>
          <Text modifiers={[font({ size: 10 }), foregroundStyle(muted)]}>184</Text>
          <Spacer />
          <Text modifiers={[font({ size: 10 }), foregroundStyle(muted)]}>182</Text>
          <Spacer />
          <Text modifiers={[font({ size: 10 }), foregroundStyle(muted)]}>180</Text>
          <Spacer />
          <Text modifiers={[font({ size: 10 }), foregroundStyle(muted)]}>178</Text>
        </VStack>
        <Chart
          data={chart}
          type="line"
          showGrid
          lineStyle={{ color: blue, width: 3, pointStyle: 'circle', pointSize: 5 }}
          modifiers={[frame({ maxWidth: 500, height: 150 })]}
        />
      </HStack>
      <HStack>
        <Text modifiers={[font({ size: 11 }), foregroundStyle(muted)]}>{props.history.length ? props.startDate ?? '30 days ago' : ''}</Text>
        <Spacer />
        <Text modifiers={[font({ size: 11 }), foregroundStyle(muted)]}>{props.date}</Text>
      </HStack>
    </VStack>
  );
}

export default createWidget('BodyWeightWidget', BodyWeightView);
