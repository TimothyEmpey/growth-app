import { Chart, HStack, RoundedRectangle, Spacer, Text, VStack, ZStack } from '@expo/ui/swift-ui';
import {
  containerBackground,
  font,
  foregroundStyle,
  frame,
  padding,
} from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';
import type { DietWidgetSnapshot } from '@/domain/widget-snapshots';

function DietView(props: DietWidgetSnapshot, environment: WidgetEnvironment) {
  'widget';
  const surface = '#595959';
  const white = '#FFFFFF';
  const blue = '#4F82F5';
  const orange = '#F2B766';
  const purple = '#A586EC';
  const title = <Text modifiers={[font({ size: 22, weight: 'semibold' }), foregroundStyle(white)]}>Diet</Text>;
  const macroRows = [
    { name: 'Protein', value: props.protein, goal: props.proteinGoal, color: blue },
    { name: 'Carbs', value: props.carbs, goal: props.carbsGoal, color: orange },
    { name: 'Fat', value: props.fat, goal: props.fatGoal, color: purple },
  ];
  if (environment.widgetFamily === 'systemSmall') {
    return (
      <VStack alignment="leading" spacing={5} modifiers={[padding({ all: 16 }), containerBackground(surface, 'widget')]}>
        {title}
        <Spacer />
        <Text modifiers={[font({ size: 38, weight: 'regular', design: 'rounded' }), foregroundStyle(white)]}>
          {props.calories}
        </Text>
        <Text modifiers={[font({ size: 20 }), foregroundStyle(white)]}>calories</Text>
      </VStack>
    );
  }
  const macroBars = macroRows.map((macro) => Math.max(12, Math.min(78, macro.goal ? (macro.value / macro.goal) * 78 : macro.value / 2)));
  if (environment.widgetFamily === 'systemMedium') {
    return (
      <VStack alignment="leading" spacing={7} modifiers={[padding({ all: 17 }), containerBackground(surface, 'widget')]}>
        {title}
        <HStack alignment="bottom" spacing={11}>
          <HStack alignment="bottom" spacing={4}>
            {macroBars.map((height, index) => <RoundedRectangle key={macroRows[index].name} cornerRadius={4} modifiers={[frame({ width: 18, height }), foregroundStyle(macroRows[index].color)]} />)}
          </HStack>
          <Spacer />
          <VStack alignment="leading" spacing={10}>
            {macroRows.map((macro) => <Text key={macro.name} modifiers={[font({ size: 13 }), foregroundStyle(macro.color)]}>{macro.name} · {macro.value}g</Text>)}
          </VStack>
        </HStack>
      </VStack>
    );
  }
  return (
    <VStack alignment="leading" spacing={16} modifiers={[padding({ all: 20 }), containerBackground(surface, 'widget')]}>
      {title}
      <ZStack modifiers={[frame({ height: 245, maxWidth: 500 })]}>
        <Chart
          data={macroRows.map((macro) => ({ x: macro.name, y: Math.max(macro.value, 0.01), color: macro.color }))}
          type="pie"
          pieStyle={{ innerRadius: 0.62, angularInset: 2 }}
          modifiers={[frame({ height: 245, maxWidth: 500 })]}
        />
        <VStack spacing={2}>
          <Text modifiers={[font({ size: 40, weight: 'regular', design: 'rounded' }), foregroundStyle(white)]}>{props.calories}</Text>
          <Text modifiers={[font({ size: 16 }), foregroundStyle(white)]}>calories</Text>
        </VStack>
      </ZStack>
      <HStack>
        <Text modifiers={[font({ size: 14 }), foregroundStyle(blue)]}>Protein {props.protein}g</Text><Spacer />
        <Text modifiers={[font({ size: 14 }), foregroundStyle(purple)]}>Carbs {props.carbs}g</Text><Spacer />
        <Text modifiers={[font({ size: 14 }), foregroundStyle(orange)]}>Fat {props.fat}g</Text>
      </HStack>
    </VStack>
  );
}

export default createWidget('DietWidget', DietView);
