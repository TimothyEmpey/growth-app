import { useEffect, useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  View,
} from 'react-native';
import { useColors } from '@/providers/appearance';

export type DropdownOption<T extends string | number> = { value: T; label: string };

const ITEM_HEIGHT = 48;
const VISIBLE_ITEMS = 5;

export function Dropdown<T extends string | number>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: DropdownOption<T>[];
  onChange: (value: T) => void;
}) {
  const C = useColors();
  const list = useRef<ScrollView>(null);
  const openRef = useRef(false);
  const draftRef = useRef(value);
  const initialIndexRef = useRef(0);
  const positionedRef = useRef(false);
  const scrollOffsetRef = useRef(0);
  const commitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const selected = options.find((option) => option.value === value) ?? options[0];
  const draftIndex = Math.max(
    0,
    options.findIndex((option) => option.value === draft),
  );

  useEffect(
    () => () => {
      if (commitTimer.current) clearTimeout(commitTimer.current);
      if (settleTimer.current) clearTimeout(settleTimer.current);
    },
    [],
  );

  const selectDraft = (next: T) => {
    draftRef.current = next;
    setDraft(next);
    if (commitTimer.current) clearTimeout(commitTimer.current);
    commitTimer.current = setTimeout(() => onChange(next), 80);
  };

  const commitCurrent = () => {
    openRef.current = false;
    if (commitTimer.current) clearTimeout(commitTimer.current);
    onChange(draftRef.current);
  };

  const finishWheel = () => {
    if (openRef.current) commitCurrent();
    setOpen(false);
  };

  const nearestOption = (offset: number) => {
    const index = Math.max(0, Math.min(options.length - 1, Math.round(offset / ITEM_HEIGHT)));
    return options[index];
  };

  const updateFromScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollOffsetRef.current = event.nativeEvent.contentOffset.y;
    if (settleTimer.current) clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(() => {
      if (!openRef.current) return;
      const option = nearestOption(scrollOffsetRef.current);
      if (option && option.value !== draftRef.current) selectDraft(option.value);
    }, 60);
  };

  const settleFromScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!openRef.current) return;
    scrollOffsetRef.current = event.nativeEvent.contentOffset.y;
    const option = nearestOption(scrollOffsetRef.current);
    if (option && option.value !== draftRef.current) selectDraft(option.value);
  };

  return (
    <View style={{ minWidth: 128 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${selected.label}`}
        accessibilityState={{ expanded: open }}
        onPress={() => {
          initialIndexRef.current = Math.max(
            0,
            options.findIndex((option) => option.value === value),
          );
          positionedRef.current = false;
          scrollOffsetRef.current = initialIndexRef.current * ITEM_HEIGHT;
          draftRef.current = value;
          setDraft(value);
          openRef.current = true;
          setOpen(true);
        }}
        style={({ pressed }) => ({
          minHeight: 42,
          paddingHorizontal: 13,
          borderWidth: 1,
          borderColor: open ? C.blue : C.border,
          backgroundColor: C.surface,
          borderRadius: 10,
          opacity: pressed ? 0.7 : 1,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        })}
      >
        <Text style={{ color: C.text, fontSize: 14, fontWeight: '600' }}>{selected.label}</Text>
        <Text style={{ color: C.muted, fontSize: 17 }}>⌄</Text>
      </Pressable>

      {open && (
        <Modal
          transparent
          animationType="fade"
          presentationStyle="overFullScreen"
          statusBarTranslucent
          onRequestClose={finishWheel}
        >
          <View
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              padding: 24,
              backgroundColor: 'rgba(0, 0, 0, 0.58)',
            }}
          >
            <View
              accessibilityRole="menu"
              accessibilityLabel={label}
              style={{
                width: '100%',
                maxWidth: 360,
                padding: 18,
                gap: 12,
                borderWidth: 1,
                borderColor: C.border,
                borderRadius: 18,
                backgroundColor: C.surface,
                boxShadow: '0 18px 55px rgba(0, 0, 0, 0.45)',
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Text style={{ color: C.text, fontSize: 16, fontWeight: '700' }}>{label}</Text>
                <Pressable
                  accessibilityRole="button"
                  onPressIn={commitCurrent}
                  onPress={finishWheel}
                  hitSlop={10}
                >
                  <Text style={{ color: C.blue, fontSize: 15, fontWeight: '700' }}>Done</Text>
                </Pressable>
              </View>

              <View style={{ height: ITEM_HEIGHT * VISIBLE_ITEMS, overflow: 'hidden' }}>
                <View
                  pointerEvents="none"
                  style={{
                    position: 'absolute',
                    top: ITEM_HEIGHT * 2,
                    left: 0,
                    right: 0,
                    height: ITEM_HEIGHT,
                    borderRadius: 10,
                    backgroundColor: C.elevated,
                  }}
                />
                {/* Snapping keeps one option aligned with the fixed selection band. */}
                <ScrollView
                  ref={list}
                  snapToInterval={ITEM_HEIGHT}
                  snapToAlignment="start"
                  decelerationRate="fast"
                  showsVerticalScrollIndicator={false}
                  nestedScrollEnabled
                  onScroll={updateFromScroll}
                  onScrollEndDrag={settleFromScroll}
                  onMomentumScrollEnd={settleFromScroll}
                  scrollEventThrottle={16}
                  onContentSizeChange={() => {
                    if (!positionedRef.current) {
                      positionedRef.current = true;
                      list.current?.scrollTo({
                        y: initialIndexRef.current * ITEM_HEIGHT,
                        animated: false,
                      });
                    }
                  }}
                >
                  <View style={{ height: ITEM_HEIGHT * 2 }} />
                  {options.map((item, index) => {
                    const distance = Math.abs(index - draftIndex);
                    const active = item.value === draft;
                    return (
                      <Pressable
                        key={String(item.value)}
                        accessibilityRole="button"
                        accessibilityState={{ selected: active }}
                        onPress={() => {
                          selectDraft(item.value);
                          list.current?.scrollTo({ y: index * ITEM_HEIGHT, animated: false });
                        }}
                        style={{
                          height: ITEM_HEIGHT,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Text
                          style={{
                            color: active ? C.text : C.muted,
                            fontSize: active ? 22 : distance === 1 ? 17 : 14,
                            fontWeight: active ? '700' : '500',
                            opacity: active ? 1 : distance === 1 ? 0.72 : 0.38,
                          }}
                        >
                          {item.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                  <View style={{ height: ITEM_HEIGHT * 2 }} />
                </ScrollView>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}
