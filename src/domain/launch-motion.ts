export const LAUNCH_WIDTH = 941;
export const LAUNCH_HEIGHT = 1672;
export const LAUNCH_DURATION = 2280;

function smooth(value: number) {
  'worklet';
  const x = Math.max(0, Math.min(1, value));
  return x * x * x * (x * (x * 6 - 15) + 10);
}

// These curves match the approved standalone motion study.
export function launchFrame(milliseconds: number) {
  'worklet';
  const p = Math.max(0, Math.min(1, (milliseconds - 380) / 1900));
  const zoom = Math.exp(Math.log(91) * p * p * p);
  const center = smooth(p / 0.82);
  return {
    p,
    zoom,
    cx: 425 + (LAUNCH_WIDTH / 2 - 425) * center,
    cy: 820 + (LAUNCH_HEIGHT / 2 - 820) * center,
    aperture: smooth((p - 0.37) / 0.28),
  };
}

export function launchLetterMatrix(
  p: number,
  index: number,
): [number, number, number, number, number, number] {
  'worklet';
  const offset = index - 2;
  const envelope = Math.sin(Math.PI * p) ** 2;
  if (index === 2) return [1, 0, 0, 1, 0, 0];
  const lag = offset * envelope;
  const angle = offset * envelope * 0.009;
  const sx = 1 - envelope * 0.012 * Math.abs(offset);
  const sy = 1 + envelope * 0.018 * Math.abs(offset);
  const skew = lag * 0.012;
  return [
    Math.cos(angle) * sx,
    Math.sin(angle) * sx,
    (Math.cos(angle) * skew - Math.sin(angle)) * sy,
    (Math.sin(angle) * skew + Math.cos(angle)) * sy,
    lag * 1.8,
    Math.sin(p * 6 - offset * 0.32) * Math.abs(offset) * envelope * 0.9,
  ];
}
