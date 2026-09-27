import { usePreferences } from '@/hooks/use-preferences';
import { displayWeight } from '@/domain/account';
import { useColors } from '@/providers/appearance';
import { useEffect, useState } from 'react';
import { View, Pressable, useWindowDimensions } from 'react-native';
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Stop,
  Path,
  Line,
  Text as SvgText,
} from 'react-native-svg';
import type { Period, WeightEntry } from '@/domain/types';
import { formatDate, parseDate, weightsForChart, type ChartWeightPoint } from '@/domain/journal';
import { Empty } from './ui';

// Plot recorded weights at their actual date positions; no measurements are added for gaps.
export function WeightChart({
  entries,
  period,
  onHoldChange,
}: {
  entries: WeightEntry[];
  period: Period;
  onHoldChange: (entry: ChartWeightPoint | null) => void;
}) {
  const C = useColors();
  const { units } = usePreferences();
  const { width: viewportWidth } = useWindowDimensions();
  const compact = viewportWidth < 600;
  const unit = units === 'metric' ? 'kg' : 'lb';
  const [width, setWidth] = useState(600);
  const points = weightsForChart(entries, period);
  useEffect(() => () => onHoldChange(null), [onHoldChange]);
  const height = compact ? 140 : 250,
    left = 42,
    right = width - 16,
    top = compact ? 10 : 16,
    bottom = height - (compact ? 24 : 32);
  if (!entries.length)
    return (
      <View
        style={{
          minHeight: compact ? 135 : 240,
          justifyContent: 'center',
          borderTopWidth: 1,
          borderBottomWidth: 1,
          borderColor: C.border,
        }}
      >
        <Empty icon="chart" title="Your progress starts here">
          Log your first weigh-in to start building a picture of your progress.
        </Empty>
      </View>
    );
  const min = Math.min(...points.map((e) => e.pounds)),
    max = Math.max(...points.map((e) => e.pounds));
  const pad = Math.max(2, (max - min) * 0.2),
    low = min - pad,
    high = max + pad;
  const start = parseDate(points[0].date).getTime(),
    end = parseDate(points[points.length - 1].date).getTime();
  const x = (e: WeightEntry) =>
    start === end
      ? (left + right) / 2
      : left + ((parseDate(e.date).getTime() - start) / (end - start)) * (right - left);
  const y = (e: WeightEntry) => bottom - ((e.pounds - low) / (high - low)) * (bottom - top);
  const line = points.map((e, i) => `${i ? 'L' : 'M'}${x(e)},${y(e)}`).join(' ');
  return (
    <View
      testID="weight-chart"
      onLayout={(event) => setWidth(Math.max(200, event.nativeEvent.layout.width))}
    >
      <Svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        accessibilityLabel={`Weight chart, ${points.length} displayed points from ${entries.length} logged entries. Latest ${displayWeight(entries.at(-1)!.pounds, units)} ${unit}.`}
      >
        <Defs>
          <LinearGradient id="weight-fill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={C.blue} stopOpacity={0.24} />
            <Stop offset="1" stopColor={C.blue} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        {[0, 1, 2, 3].map((i) => {
          const value = low + ((high - low) * i) / 3,
            yy = bottom - ((bottom - top) * i) / 3;
          return (
            <ViewlessGrid
              key={i}
              y={yy}
              right={right}
              label={String(displayWeight(value, units))}
            />
          );
        })}
        {points.length > 1 && (
          <Path
            d={`${line} L${x(points.at(-1)!)},${bottom} L${x(points[0])},${bottom} Z`}
            fill="url(#weight-fill)"
          />
        )}
        <Path d={line} stroke={C.blue} strokeWidth={2.5} fill="none" strokeLinejoin="round" />
        {points.map((e) => (
          <Circle
            key={e.id}
            cx={x(e)}
            cy={y(e)}
            r={points.length > 60 ? 2 : 4}
            fill={C.blue}
            stroke={C.surface}
            strokeWidth={2}
          />
        ))}
        <SvgText x={left} y={height - 6} fill={C.muted} fontSize={11}>
          {formatDate(points[0].date, { month: 'short', day: 'numeric' })}
        </SvgText>
        {points.length > 1 && (
          <SvgText x={right} y={height - 6} textAnchor="end" fill={C.muted} fontSize={11}>
            {formatDate(points.at(-1)!.date, { month: 'short', day: 'numeric' })}
          </SvgText>
        )}
      </Svg>
      <View
        pointerEvents="box-none"
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height }}
      >
        {points.map((entry) => (
          <Pressable
            key={entry.id}
            accessibilityRole="button"
            accessibilityLabel={`${entry.periodLabel}: ${displayWeight(entry.pounds, units)} ${unit}${entry.count > 1 ? ` average from ${entry.count} entries` : ''}`}
            accessibilityHint="Press and hold to show this point above the chart."
            onPressIn={() => onHoldChange(entry)}
            onPressOut={() => onHoldChange(null)}
            style={{
              position: 'absolute',
              left: x(entry) - 18,
              top: y(entry) - 18,
              width: 36,
              height: 36,
              borderRadius: 18,
            }}
          />
        ))}
      </View>
    </View>
  );
}
function ViewlessGrid({ y, right, label }: { y: number; right: number; label: string }) {
  const C = useColors();
  return (
    <>
      <Line x1={42} x2={right} y1={y} y2={y} stroke={C.border} strokeDasharray="3 5" />
      <SvgText x={0} y={y + 4} fill={C.muted} fontSize={11}>
        {label}
      </SvgText>
    </>
  );
}
