import { expect, test } from 'bun:test';
import { LAUNCH_DURATION, launchFrame, launchLetterMatrix } from '../src/domain/launch-motion';

test('launch holds the supplied frame and keeps the O fixed during letter distortion', () => {
  for (const time of [0, 100, 380]) {
    expect(launchFrame(time)).toMatchObject({ p: 0, zoom: 1, cx: 425, cy: 820, aperture: 0 });
  }
  for (const progress of [0, 0.25, 0.5, 0.75, 1]) {
    expect(launchLetterMatrix(progress, 2)).toEqual([1, 0, 0, 1, 0, 0]);
  }
});

test('the reveal clears every corner before removing the overlay on supported phone shapes', () => {
  const { zoom, cx, cy, aperture } = launchFrame(LAUNCH_DURATION);
  const rx = 14.4 * zoom * aperture;
  const ry = 19 * zoom * aperture;
  for (const [width, height] of [
    [375, 667],
    [390, 844],
    [430, 932],
    [440, 956],
  ]) {
    const scale = Math.max(width / 941, height / 1672);
    const offsetX = (width - 941 * scale) / 2;
    const offsetY = (height - 1672 * scale) / 2;
    for (const [x, y] of [
      [0, 0],
      [width, 0],
      [0, height],
      [width, height],
    ]) {
      const px = (x - offsetX) / scale;
      const py = (y - offsetY) / scale;
      expect(((px - cx) / rx) ** 2 + ((py - cy) / ry) ** 2).toBeLessThan(1);
    }
  }
});
