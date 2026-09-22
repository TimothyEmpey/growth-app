import { usePreferences } from '@/hooks/use-preferences';
import { displayWeight } from '@/domain/account';
import { useColors } from '@/providers/appearance';
import { useState } from 'react';
import { View, Pressable, Text, useWindowDimensions } from 'react-native';
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Stop,
  Path,
  Line,
  Text as SvgText,
} from 'react-native-svg';
import type { WeightEntry } from '@/domain/types';
import { formatDate, parseDate } from '@/domain/journal';
import { Empty } from './ui';

// Plot recorded weights at their actual date positions; no measurements are added for gaps.
export function WeightChart({ entries }: { entries: WeightEntry[] }) {
  const C = useColors();
  const { units } = usePreferences();
  const { width: viewportWidth } = useWindowDimensions();
  const compact = viewportWidth < 600;
  const unit = units === 'metric' ? 'kg' : 'lb';
  const [width, setWidth] = useState(600);
  const [heldId, setHeldId] = useState<string | null>(null);
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
  const min = Math.min(...entries.map((e) => e.pounds)),
    max = Math.max(...entries.map((e) => e.pounds));
  const pad = Math.max(2, (max - min) * 0.2),
    low = min - pad,
    high = max + pad;
  const start = parseDate(entries[0].date).getTime(),
    end = parseDate(entries[entries.length - 1].date).getTime();
  const x = (e: WeightEntry) =>
    start === end
      ? (left + right) / 2
      : left + ((parseDate(e.date).getTime() - start) / (end - start)) * (right - left);
  const y = (e: WeightEntry) => bottom - ((e.pounds - low) / (high - low)) * (bottom - top);
  const line = entries.map((e, i) => `${i ? 'L' : 'M'}${x(e)},${y(e)}`).join(' ');
  const heldEntry = entries.find((entry) => entry.id === heldId);
  return (
    <View onLayout={(event) => setWidth(Math.max(200, event.nativeEvent.layout.width))}>
      <Svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        accessibilityLabel={`Weight history, ${entries.length} entries. Latest ${displayWeight(entries.at(-1)!.pounds, units)} ${unit}.`}
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
        {entries.length > 1 && (
          <Path
            d={`${line} L${x(entries.at(-1)!)},${bottom} L${x(entries[0])},${bottom} Z`}
            fill="url(#weight-fill)"
          />
        )}
        <Path d={line} stroke={C.blue} strokeWidth={2.5} fill="none" strokeLinejoin="round" />
        {entries.map((e) => (
          <Circle
            key={e.id}
            cx={x(e)}
            cy={y(e)}
            r={entries.length > 90 ? 2 : 4}
            fill={C.blue}
            stroke={C.surface}
            strokeWidth={2}
          />
        ))}
        <SvgText x={left} y={height - 6} fill={C.muted} fontSize={11}>
          {formatDate(entries[0].date, { month: 'short', day: 'numeric' })}
        </SvgText>
        {entries.length > 1 && (
          <SvgText x={right} y={height - 6} textAnchor="end" fill={C.muted} fontSize={11}>
            {formatDate(entries.at(-1)!.date, { month: 'short', day: 'numeric' })}
          </SvgText>
        )}
      </Svg>
      <View
        pointerEvents="box-none"
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height }}
      >
        {entries.map((entry) => (
          <Pressable
            key={entry.id}
            accessibilityRole="button"
            accessibilityLabel={`Weigh-in ${entry.date}: ${displayWeight(entry.pounds, units)} ${unit}`}
            accessibilityHint="Press and hold to show this value on the chart."
            onPressIn={() => setHeldId(entry.id)}
            onPressOut={() => setHeldId(null)}
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
        {heldEntry && (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: Math.max(4, Math.min(width - 84, x(heldEntry) + 8)),
              top: Math.max(0, y(heldEntry) - 32),
              minWidth: 72,
              paddingHorizontal: 8,
              paddingVertical: 5,
              borderRadius: 8,
              backgroundColor: C.elevated,
              borderWidth: 1,
              borderColor: C.border,
              alignItems: 'center',
            }}
          >
            <Text
              style={{
                color: C.text,
                fontSize: 12,
                fontWeight: '600',
                fontVariant: ['tabular-nums'],
              }}
            >
              {displayWeight(heldEntry.pounds, units)} {unit}
            </Text>
          </View>
        )}
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
