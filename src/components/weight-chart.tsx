import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
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
import { C, Empty } from './ui';

export function WeightChart({
  entries,
  onSelect,
}: {
  entries: WeightEntry[];
  onSelect: (entry: WeightEntry) => void;
}) {
  const [width, setWidth] = useState(600);
  const height = 250,
    left = 42,
    right = width - 16,
    top = 16,
    bottom = height - 32;
  if (!entries.length)
    return (
      <View
        style={{
          minHeight: 240,
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
  return (
    <View onLayout={(event) => setWidth(Math.max(200, event.nativeEvent.layout.width))}>
      <Svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        accessibilityLabel={`Weight history, ${entries.length} entries. Latest ${entries.at(-1)?.pounds} pounds.`}
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
          return <ViewlessGrid key={i} y={yy} right={right} label={value.toFixed(0)} />;
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
            accessibilityLabel={`Weigh-in ${entry.date}: ${entry.pounds} pounds`}
            onPress={() => onSelect(entry)}
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
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
        {entries
          .slice(-5)
          .reverse()
          .map((entry) => (
            <Pressable
              key={entry.id}
              accessibilityRole="button"
              accessibilityLabel={`Edit weight ${entry.pounds} pounds on ${entry.date}`}
              onPress={() => onSelect(entry)}
              style={{
                minHeight: 36,
                paddingHorizontal: 10,
                justifyContent: 'center',
                backgroundColor: C.elevated,
                borderRadius: 8,
              }}
            >
              <Text style={{ color: C.muted, fontSize: 12 }}>
                {formatDate(entry.date, { month: 'short', day: 'numeric' })} ·{' '}
                <Text style={{ color: C.text }}>{entry.pounds} lb</Text>
              </Text>
            </Pressable>
          ))}
      </View>
    </View>
  );
}
function ViewlessGrid({ y, right, label }: { y: number; right: number; label: string }) {
  return (
    <>
      <Line x1={42} x2={right} y1={y} y2={y} stroke={C.border} strokeDasharray="3 5" />
      <SvgText x={0} y={y + 4} fill={C.muted} fontSize={11}>
        {label}
      </SvgText>
    </>
  );
}
