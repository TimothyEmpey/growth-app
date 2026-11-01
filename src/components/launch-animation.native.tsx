import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { Canvas, Group, Image, Path, Skia, useImage } from '@shopify/react-native-skia';
import {
  cancelAnimation,
  Easing,
  runOnJS,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import {
  LAUNCH_DURATION,
  LAUNCH_HEIGHT,
  LAUNCH_WIDTH,
  launchFrame,
  launchLetterMatrix,
} from '@/domain/launch-motion';

// Claim the launch screen before Router can automatically dismiss it.
void SplashScreen.preventAutoHideAsync().catch(() => {});
SplashScreen.setOptions({ fade: false, duration: 0 });

const artwork = require('../../assets/launch/launch.png');
const background = require('../../assets/launch/background.png');
// Vector contours stay smooth throughout the 91× camera zoom.
const contours = require('../../assets/launch/letter-paths.json') as {
  x: number;
  width: number;
  d: string;
  fill: string;
}[];

// Parse each contour once. Frame updates change only GPU drawing transforms.
const letters = contours.map((letter) => ({
  ...letter,
  path: Skia.Path.MakeFromSVGString(letter.d)!,
}));
const openingShape = Skia.Path.Make();
openingShape.addOval({ x: -14.4, y: -19, width: 28.8, height: 38 });

function Letter({
  index,
  frame,
}: {
  index: number;
  frame: SharedValue<ReturnType<typeof launchFrame>>;
}) {
  const letter = letters[index];
  const matrix = useDerivedValue(() => {
    const [a, b, c, d, tx, ty] = launchLetterMatrix(frame.value.p, index);
    return Skia.Matrix([a, c, tx, b, d, ty, 0, 0, 1]);
  });
  return (
    <Group transform={[{ translateX: letter.x + letter.width / 2 }, { translateY: 804 }]}>
      <Group matrix={matrix}>
        <Path
          path={letter.path}
          color={letter.fill}
          fillType="evenOdd"
          transform={[{ translateX: -letter.width / 2 }, { translateY: -53 }]}
        />
      </Group>
    </Group>
  );
}

export function LaunchAnimation({ ready }: { ready: boolean }) {
  const time = useSharedValue(0);
  const reducedMotion = useReducedMotion();
  const [complete, setComplete] = useState(false);
  const staticImage = useImage(artwork);
  const backgroundImage = useImage(background);
  const imagesReady = !!staticImage && !!backgroundImage;
  const { width, height } = useWindowDimensions();
  const cover = Math.max(width / LAUNCH_WIDTH, height / LAUNCH_HEIGHT);
  const frame = useDerivedValue(() => launchFrame(time.value));
  const finish = useCallback(() => {
    SplashScreen.hide();
    setComplete(true);
  }, []);

  useEffect(() => {
    // A corrupt asset or failed local storage must never leave the app behind a splash.
    const fallback = setTimeout(finish, 8000);
    return () => clearTimeout(fallback);
  }, [finish]);

  useEffect(() => {
    if (!ready || !imagesReady || complete) return;
    let cancelled = false;
    let secondFrame = 0;
    const firstFrame = requestAnimationFrame(() => {
      // Give the matching first frame a chance to paint before removing the native screen.
      secondFrame = requestAnimationFrame(() => {
        if (cancelled) return;
        SplashScreen.hide();
        if (reducedMotion) {
          finish();
          return;
        }
        time.value = withTiming(
          LAUNCH_DURATION,
          { duration: LAUNCH_DURATION, easing: Easing.linear },
          (finished) => {
            if (finished) runOnJS(finish)();
          },
        );
      });
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(firstFrame);
      cancelAnimationFrame(secondFrame);
      cancelAnimation(time);
    };
  }, [ready, imagesReady, complete, reducedMotion, finish, time]);

  const camera = useDerivedValue(() => {
    const { zoom, cx, cy } = frame.value;
    return Skia.Matrix([zoom, 0, cx - 425 * zoom, 0, zoom, cy - 820 * zoom, 0, 0, 1]);
  });
  const movingOpacity = useDerivedValue(() => (time.value > 380 ? 1 : 0));
  const staticOpacity = useDerivedValue(() => (time.value <= 380 ? 1 : 0));
  const aperture = useDerivedValue(() => {
    const { zoom, cx, cy, aperture: opening } = frame.value;
    const scale = Math.max(0.00001, zoom * opening);
    // Transform a cached ellipse instead of parsing a new SVG clipping path every frame.
    return openingShape.copy().transform(Skia.Matrix([scale, 0, cx, 0, scale, cy, 0, 0, 1]));
  });

  if (complete) return null;
  return (
    <View
      style={styles.overlay}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Canvas style={StyleSheet.absoluteFill} colorSpace="srgb">
        <Group
          transform={[
            { translateX: (width - LAUNCH_WIDTH * cover) / 2 },
            { translateY: (height - LAUNCH_HEIGHT * cover) / 2 },
            { scale: cover },
          ]}
        >
          <Group clip={aperture} invertClip>
            <Group matrix={camera} opacity={movingOpacity}>
              <Image
                image={backgroundImage}
                x={0}
                y={0}
                width={LAUNCH_WIDTH}
                height={LAUNCH_HEIGHT}
                fit="fill"
              />
              {letters.map((_, index) => (
                <Letter key={index} index={index} frame={frame} />
              ))}
            </Group>
            <Group opacity={staticOpacity}>
              <Image
                image={staticImage}
                x={0}
                y={0}
                width={LAUNCH_WIDTH}
                height={LAUNCH_HEIGHT}
                fit="fill"
              />
            </Group>
          </Group>
        </Group>
      </Canvas>
    </View>
  );
}

const styles = StyleSheet.create({
  // Outside the safe area: both native and animated artwork cover the entire window.
  overlay: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, zIndex: 10000 },
});
