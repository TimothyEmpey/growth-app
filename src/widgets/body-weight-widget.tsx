import { Chart, HStack, Image, RoundedRectangle, Spacer, Text, VStack, ZStack } from '@expo/ui/swift-ui';
import { containerBackground, font, foregroundStyle, frame, lineLimit, padding } from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';
import type { WeightWidgetSnapshot } from '@/domain/widget-snapshots';

const surface = '#191C22';
const text = '#F4F6FB';
const muted = '#969FAD';
const blue = '#719BFF';

function IconTitle({ small = false }: { small?: boolean }) {
  'widget';
  return <HStack spacing={10}><ZStack><RoundedRectangle cornerRadius={10} modifiers={[frame({ width: 32, height: 32 }), foregroundStyle('#252E42')]} /><Image systemName="scalemass" size={17} color={blue} /></ZStack><Text modifiers={[font({ size: small ? 18 : 21, weight: 'medium' }), foregroundStyle(text)]}>{small ? 'Weight' : 'Body weight'}</Text></HStack>;
}

function BodyWeightView(props: WeightWidgetSnapshot, environment: WidgetEnvironment) {
  'widget';
  const data = (props.history.length ? props.history : [0]).map((y, x) => ({ x, y }));
  if (environment.widgetFamily === 'systemSmall') return <VStack alignment="leading" spacing={9} modifiers={[padding({ all: 17 }), containerBackground(surface, 'widget')]}><IconTitle small /><Spacer /><HStack alignment="firstTextBaseline" spacing={5}><Text modifiers={[font({ size: 39, weight: 'medium', design: 'rounded' }), foregroundStyle(text), lineLimit(1)]}>{props.value}</Text><Text modifiers={[font({ size: 15 }), foregroundStyle(muted)]}>{props.unit}</Text></HStack><Text modifiers={[font({ size: 12, weight: 'medium' }), foregroundStyle(blue)]}>↓ {props.change.replace(/^[-+]/, '')}</Text><Text modifiers={[font({ size: 13 }), foregroundStyle(muted)]}>Updated {props.date}</Text></VStack>;
  if (environment.widgetFamily === 'systemMedium') return <HStack spacing={18} modifiers={[padding({ all: 19 }), containerBackground(surface, 'widget')]}><VStack alignment="leading"><IconTitle /><Spacer /><HStack alignment="firstTextBaseline" spacing={4}><Text modifiers={[font({ size: 35, weight: 'medium', design: 'rounded' }), foregroundStyle(text)]}>{props.value}</Text><Text modifiers={[font({ size: 15 }), foregroundStyle(muted)]}>{props.unit}</Text></HStack><Text modifiers={[font({ size: 13 }), foregroundStyle(muted)]}>{props.change} this month</Text></VStack><Chart data={data} type="line" showGrid lineStyle={{ color: blue, width: 3, pointStyle: 'circle', pointSize: 5 }} modifiers={[frame({ height: 125, width: 190 })]} /></HStack>;
  return <VStack alignment="leading" spacing={12} modifiers={[padding({ all: 22 }), containerBackground(surface, 'widget')]}><IconTitle /><HStack alignment="bottom"><VStack alignment="leading" spacing={4}><HStack alignment="firstTextBaseline" spacing={5}><Text modifiers={[font({ size: 49, weight: 'medium', design: 'rounded' }), foregroundStyle(text)]}>{props.value}</Text><Text modifiers={[font({ size: 16 }), foregroundStyle(muted)]}>{props.unit}</Text></HStack><Text modifiers={[font({ size: 13 }), foregroundStyle(muted)]}>Last recorded {props.date}</Text></VStack><Spacer /><VStack alignment="trailing" spacing={5}><Text modifiers={[font({ size: 19, weight: 'medium' }), foregroundStyle(blue)]}>{props.change}</Text><Text modifiers={[font({ size: 13 }), foregroundStyle(muted)]}>Last 30 days</Text></VStack></HStack><Chart data={data} type="line" showGrid lineStyle={{ color: blue, width: 4, pointStyle: 'circle', pointSize: 6 }} modifiers={[frame({ height: 205, maxWidth: 500 })]} /></VStack>;
}

export default createWidget('BodyWeightWidget', BodyWeightView);
