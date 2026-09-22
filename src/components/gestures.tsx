import { useColors } from '@/providers/appearance';
import { router, usePathname } from 'expo-router';
import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

const MAIN_ROUTES = ['/', '/running', '/diet', '/account'] as const;
const PAGE_SWIPE_DISTANCE = 70;
const DELETE_SWIPE_DISTANCE = 96;

export function MainPageSwipe({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const routeIndex = MAIN_ROUTES.indexOf(pathname as (typeof MAIN_ROUTES)[number]);
  const enabled = process.env.EXPO_OS !== 'web' && routeIndex >= 0;
  const gesture = Gesture.Pan()
    .enabled(enabled)
    .activeOffsetX([-18, 18])
    .failOffsetY([-16, 16])
    .runOnJS(true)
    .onEnd(({ translationX, velocityX }) => {
      const direction = translationX < 0 ? 1 : -1;
      const nextIndex = routeIndex + direction;
      if (
        nextIndex < 0 ||
        nextIndex >= MAIN_ROUTES.length ||
        (Math.abs(translationX) < PAGE_SWIPE_DISTANCE && Math.abs(velocityX) < 650)
      )
        return;
      router.replace(MAIN_ROUTES[nextIndex]);
    });

  return <GestureDetector gesture={gesture}>{children}</GestureDetector>;
}

export function SwipeToDelete({
  children,
  onDelete,
  accessibilityLabel,
}: {
  children: ReactNode;
  onDelete: () => void;
  accessibilityLabel: string;
}) {
  const C = useColors();
  const offset = useSharedValue(0);
  const enabled = process.env.EXPO_OS !== 'web';
  const gesture = Gesture.Pan()
    .enabled(enabled)
    .activeOffsetX([-14, 14])
    .failOffsetY([-14, 14])
    .runOnJS(true)
    .onUpdate(({ translationX }) => {
      offset.value = Math.max(-120, Math.min(0, translationX));
    })
    .onEnd(({ translationX, velocityX }) => {
      if (translationX <= -DELETE_SWIPE_DISTANCE || velocityX <= -850) {
        offset.value = withTiming(-140, { duration: 140 });
        onDelete();
      } else {
        offset.value = withSpring(0, { damping: 18, stiffness: 220 });
      }
    });
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.value }],
  }));

  if (!enabled) return children;
  return (
    <View
      accessibilityLabel={accessibilityLabel}
      style={{ overflow: 'hidden', position: 'relative' }}
    >
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: C.red,
          alignItems: 'flex-end',
          justifyContent: 'center',
          paddingHorizontal: 22,
        }}
      >
        <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>Delete</Text>
      </View>
      <GestureDetector gesture={gesture}>
        <Animated.View style={[{ backgroundColor: C.surface }, animatedStyle]}>
          {children}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}
