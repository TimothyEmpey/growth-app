import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import Svg, { ClipPath, Defs, G, Image, Path } from 'react-native-svg';
import Animated, {
  cancelAnimation,
  Easing,
  runOnJS,
  useAnimatedProps,
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

const AnimatedGroup = Animated.createAnimatedComponent(G);
const AnimatedPath = Animated.createAnimatedComponent(Path);
const artwork = require('../../assets/launch/launch.png');
const background = require('../../assets/launch/background.png');
const letters = [
  { source: require('../../assets/launch/letter-0.png'), x: 264, width: 90 },
  { source: require('../../assets/launch/letter-1.png'), x: 354, width: 39 },
  { source: require('../../assets/launch/letter-2.png'), x: 393, width: 64 },
  { source: require('../../assets/launch/letter-3.png'), x: 457, width: 94 },
  { source: require('../../assets/launch/letter-4.png'), x: 551, width: 44 },
  { source: require('../../assets/launch/letter-5.png'), x: 595, width: 64 },
  { source: require('../../assets/launch/letter-6.png'), x: 659, width: 31 },
];

function Letter({
  index,
  time,
  onLoad,
}: {
  index: number;
  time: SharedValue<number>;
  onLoad: () => void;
}) {
  const letter = letters[index];
  const animatedProps = useAnimatedProps(() => ({
    matrix: launchLetterMatrix(launchFrame(time.value).p, index),
    opacity: 1,
  }));
  return (
    <G translateX={letter.x + letter.width / 2} translateY={804}>
      <AnimatedGroup animatedProps={animatedProps}>
        <Image
          href={letter.source}
          x={-letter.width / 2}
          y={-53}
          width={letter.width}
          height={106}
          onLoad={onLoad}
        />
      </AnimatedGroup>
    </G>
  );
}

export function LaunchAnimation({ ready }: { ready: boolean }) {
  const time = useSharedValue(0);
  const reducedMotion = useReducedMotion();
  const [complete, setComplete] = useState(false);
  const [imagesReady, setImagesReady] = useState(false);
  const loaded = useRef(new Set<number>());
  const finish = useCallback(() => {
    SplashScreen.hide();
    setComplete(true);
  }, []);
  const imageLoaded = (index: number) => {
    loaded.current.add(index);
    if (loaded.current.size === 9) setImagesReady(true);
  };

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

  const camera = useAnimatedProps(() => {
    const { zoom, cx, cy } = launchFrame(time.value);
    return {
      matrix: [zoom, 0, 0, zoom, cx - 425 * zoom, cy - 820 * zoom] as [
        number,
        number,
        number,
        number,
        number,
        number,
      ],
      opacity: time.value > 380 ? 1 : 0,
    };
  });
  const staticFrame = useAnimatedProps(() => ({ opacity: time.value <= 380 ? 1 : 0 }));
  const aperture = useAnimatedProps(() => {
    const { zoom, cx, cy, aperture: opening } = launchFrame(time.value);
    const rx = Math.max(0.001, 14.4 * zoom * opening);
    const ry = Math.max(0.001, 19 * zoom * opening);
    return {
      d: `M0 0H941V1672H0Z M${cx - rx} ${cy}a${rx} ${ry} 0 1 0 ${rx * 2} 0a${rx} ${ry} 0 1 0 ${-rx * 2} 0Z`,
    };
  });

  if (complete) return null;
  return (
    <View
      style={styles.overlay}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${LAUNCH_WIDTH} ${LAUNCH_HEIGHT}`}
        preserveAspectRatio="xMidYMid slice"
      >
        <Defs>
          <ClipPath id="launch-opening">
            <AnimatedPath animatedProps={aperture} clipRule="evenodd" fillRule="evenodd" />
          </ClipPath>
        </Defs>
        <G clipPath="url(#launch-opening)">
          <AnimatedGroup animatedProps={camera}>
            <Image href={background} width={941} height={1672} onLoad={() => imageLoaded(1)} />
            {letters.map((_, index) => (
              <Letter key={index} index={index} time={time} onLoad={() => imageLoaded(index + 2)} />
            ))}
          </AnimatedGroup>
          <AnimatedGroup animatedProps={staticFrame}>
            <Image href={artwork} width={941} height={1672} onLoad={() => imageLoaded(0)} />
          </AnimatedGroup>
        </G>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  // Outside the safe area: both native and animated artwork cover the entire window.
  overlay: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, zIndex: 10000 },
});
