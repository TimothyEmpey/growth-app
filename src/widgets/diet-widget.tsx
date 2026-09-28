import { HStack, Image, ProgressView, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import {
  background,
  font,
  foregroundStyle,
  frame,
  padding,
  progressViewStyle,
  tint,
} from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';
import type { DietWidgetSnapshot } from '@/domain/widget-snapshots';

function DietView(props: DietWidgetSnapshot, environment: WidgetEnvironment) {
  'widget';
  const navy = '#121C31';
  const white = '#F8FAFF';
  const muted = '#A9B4C8';
  const blue = '#62A8FF';
  const gold = '#F5C76A';
  const purple = '#B99AFF';
  const green = '#6FD0A0';
  const caloriesRatio = props.calorieGoal ? Math.min(props.calories / props.calorieGoal, 1) : 0;
  const title = (
    <HStack spacing={8}>
      <Image systemName="fork.knife" size={17} color={gold} />
      <Text modifiers={[font({ size: 15, weight: 'semibold' }), foregroundStyle(white)]}>Diet</Text>
    </HStack>
  );
  const macroRows = [
    { name: 'Protein', value: props.protein, goal: props.proteinGoal, color: blue },
    { name: 'Carbs', value: props.carbs, goal: props.carbsGoal, color: gold },
    { name: 'Fat', value: props.fat, goal: props.fatGoal, color: purple },
  ];
  if (environment.widgetFamily === 'systemSmall') {
    return (
      <VStack alignment="leading" spacing={9} modifiers={[padding({ all: 16 }), background(navy)]}>
        {title}
        <Spacer />
        <Text modifiers={[font({ size: 34, weight: 'bold', design: 'rounded' }), foregroundStyle(white)]}>
          {props.calories}
        </Text>
        <Text modifiers={[font({ size: 12 }), foregroundStyle(muted)]}>
          {props.calorieGoal ? `of ${props.calorieGoal} cal` : 'calories today'}
        </Text>
        <ProgressView value={caloriesRatio} modifiers={[progressViewStyle('linear'), tint(green)]} />
      </VStack>
    );
  }
  return (
    <VStack alignment="leading" spacing={environment.widgetFamily === 'systemLarge' ? 16 : 10} modifiers={[padding({ all: 18 }), background(navy)]}>
      {title}
      <HStack alignment="firstTextBaseline">
        <Text modifiers={[font({ size: 34, weight: 'bold', design: 'rounded' }), foregroundStyle(white)]}>
          {props.calories}
        </Text>
        <Text modifiers={[font({ size: 13 }), foregroundStyle(muted)]}>
          {props.calorieGoal ? ` / ${props.calorieGoal} cal` : ' cal'}
        </Text>
        <Spacer />
        <Text modifiers={[font({ size: 12, weight: 'medium' }), foregroundStyle(green)]}>Today</Text>
      </HStack>
      <ProgressView value={caloriesRatio} modifiers={[progressViewStyle('linear'), tint(green)]} />
      <VStack alignment="leading" spacing={environment.widgetFamily === 'systemLarge' ? 14 : 8}>
        {macroRows.map((macro) => (
          <VStack key={macro.name} alignment="leading" spacing={4}>
            <HStack>
              <Text modifiers={[font({ size: 12, weight: 'medium' }), foregroundStyle(white)]}>{macro.name}</Text>
              <Spacer />
              <Text modifiers={[font({ size: 12, weight: 'semibold' }), foregroundStyle(macro.color)]}>
                {macro.value}{macro.goal ? ` / ${macro.goal}` : ''} g
              </Text>
            </HStack>
            <ProgressView
              value={macro.goal ? Math.min(macro.value / macro.goal, 1) : 0}
              modifiers={[progressViewStyle('linear'), tint(macro.color), frame({ maxWidth: 500 })]}
            />
          </VStack>
        ))}
      </VStack>
    </VStack>
  );
}

export default createWidget('DietWidget', DietView);
