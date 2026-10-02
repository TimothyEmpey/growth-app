import { Chart, HStack, Image, ProgressView, RoundedRectangle, Spacer, Text, VStack, ZStack } from '@expo/ui/swift-ui';
import { containerBackground, font, foregroundStyle, frame, minimumScaleFactor, padding, progressViewStyle, tint } from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';
import type { DietWidgetSnapshot } from '@/domain/widget-snapshots';

function DietView(props: DietWidgetSnapshot, environment: WidgetEnvironment) {
  'widget';
  const surface = '#181C22';
  const iconSurface = '#36312B';
  const text = '#F5F7FC';
  const muted = '#A2A9B8';
  const track = '#303641';
  const blue = '#6B98FF';
  const gold = '#EDC172';
  const purple = '#B693F6';
  const background = {
    type: 'linearGradient' as const,
    colors: [surface, '#302D28'],
    startPoint: { x: 0, y: 1 },
    endPoint: { x: 1, y: 0 },
  };
  const remaining = Math.max(0, props.calorieGoal - props.calories);
  const donut = [
    { x: 'Consumed', y: Math.max(props.calories, props.calorieGoal ? 1 : 0), color: blue },
    { x: 'Remaining', y: Math.max(remaining, 1), color: track },
  ];
  const header = (
    <HStack spacing={10}>
      <ZStack modifiers={[frame({ width: 34, height: 34 })]}>
        <RoundedRectangle cornerRadius={10} modifiers={[frame({ width: 34, height: 34 }), foregroundStyle(iconSurface)]} />
        <Image systemName="fork.knife" size={16} color={gold} />
      </ZStack>
      <VStack alignment="leading" spacing={0}>
        {environment.widgetFamily === 'systemSmall' ? null : <Text modifiers={[font({ size: 10, weight: 'medium' }), foregroundStyle(muted)]}>TODAY</Text>}
        <Text modifiers={[font({ size: 18, weight: 'semibold' }), foregroundStyle(text)]}>Diet</Text>
      </VStack>
    </HStack>
  );
  const macroRows = [
    { name: 'Protein', value: props.protein, goal: props.proteinGoal, color: blue },
    { name: 'Carbs', value: props.carbs, goal: props.carbsGoal, color: gold },
    { name: 'Fat', value: props.fat, goal: props.fatGoal, color: purple },
  ];

  if (environment.widgetFamily === 'systemSmall') {
    return (
      <VStack alignment="leading" spacing={6} modifiers={[padding({ all: 16 }), containerBackground(background, 'widget')] }>
        {header}
        <Text modifiers={[font({ size: 37 }), foregroundStyle(text), minimumScaleFactor(0.75)]}>{props.calories.toLocaleString()}</Text>
        <Text modifiers={[font({ size: 13 }), foregroundStyle(muted)]}>of {props.calorieGoal.toLocaleString()} calories</Text>
        <HStack spacing={4}>
          <RoundedRectangle cornerRadius={3} modifiers={[frame({ width: 46, height: 5 }), foregroundStyle(blue)]} />
          <RoundedRectangle cornerRadius={3} modifiers={[frame({ width: 46, height: 5 }), foregroundStyle(gold)]} />
          <RoundedRectangle cornerRadius={3} modifiers={[frame({ width: 34, height: 5 }), foregroundStyle(purple)]} />
        </HStack>
        <ZStack modifiers={[frame({ width: 104, height: 28 })]}>
          <RoundedRectangle cornerRadius={14} modifiers={[frame({ width: 104, height: 28 }), foregroundStyle(iconSurface)]} />
          <Text modifiers={[font({ size: 12, weight: 'medium' }), foregroundStyle(gold)]}>{remaining.toLocaleString()} remaining</Text>
        </ZStack>
      </VStack>
    );
  }

  const nutrition = (
    <VStack alignment="leading" spacing={10}>
      {macroRows.map((macro) => (
        <VStack key={macro.name} alignment="leading" spacing={3}>
          <HStack>
            <Text modifiers={[font({ size: 13 }), foregroundStyle(text)]}>{macro.name}</Text>
            <Spacer />
            <Text modifiers={[font({ size: 13, weight: 'medium' }), foregroundStyle(macro.color)]}>{macro.value}{environment.widgetFamily === 'systemLarge' ? ` / ${macro.goal}` : ''} g</Text>
          </HStack>
          <ProgressView value={macro.goal ? Math.min(macro.value / macro.goal, 1) : 0} modifiers={[progressViewStyle('linear'), tint(macro.color), frame({ maxWidth: 220 })]} />
        </VStack>
      ))}
    </VStack>
  );

  return (
    <VStack alignment="leading" spacing={12} modifiers={[padding({ all: 18 }), containerBackground(background, 'widget')] }>
      {header}
      <HStack spacing={22}>
        <ZStack modifiers={[frame({ width: environment.widgetFamily === 'systemLarge' ? 160 : 92, height: environment.widgetFamily === 'systemLarge' ? 160 : 92 })]}>
          <Chart data={donut} type="pie" pieStyle={{ innerRadius: 0.82 }} showLegend={false} modifiers={[frame({ width: environment.widgetFamily === 'systemLarge' ? 160 : 92, height: environment.widgetFamily === 'systemLarge' ? 160 : 92 })]} />
          <VStack spacing={0}>
            <Text modifiers={[font({ size: environment.widgetFamily === 'systemLarge' ? 28 : 22 }), foregroundStyle(text)]}>{props.calories.toLocaleString()}</Text>
            <Text modifiers={[font({ size: 11 }), foregroundStyle(muted)]}>{environment.widgetFamily === 'systemLarge' ? `of ${props.calorieGoal.toLocaleString()} cal` : 'calories'}</Text>
          </VStack>
        </ZStack>
        <VStack alignment="leading" spacing={0} modifiers={[frame({ maxWidth: 230 })]}>{nutrition}</VStack>
      </HStack>
      {environment.widgetFamily === 'systemLarge' ? <Spacer /> : null}
      {environment.widgetFamily === 'systemLarge' ? <Text modifiers={[font({ size: 13 }), foregroundStyle(muted)]}>{remaining.toLocaleString()} calories remaining</Text> : null}
    </VStack>
  );
}

export default createWidget('DietWidget', DietView);
