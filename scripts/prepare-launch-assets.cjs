// Reproduce the approved preview's letter extraction once, instead of at app startup.
const { PNG } = require('pngjs');
const fs = require('node:fs');
const path = require('node:path');
const destination = path.join(__dirname, '../assets/launch');
fs.mkdirSync(destination, { recursive: true });
const sourcePath = process.argv[2] || path.join(destination, 'launch.png');
const bytes = fs.readFileSync(sourcePath);
const source = PNG.sync.read(bytes);
if (source.width !== 941 || source.height !== 1672) {
  throw new Error('The approved launch artwork must be 941 × 1672.');
}
fs.writeFileSync(path.join(destination, 'launch.png'), bytes);
const background = new PNG({ width: 941, height: 1672 });
source.data.copy(background.data);
const boxes = [
  [264, 354],
  [354, 393],
  [393, 457],
  [457, 551],
  [551, 595],
  [595, 659],
  [659, 690],
];
boxes.forEach(([left, right], index) => {
  const layer = new PNG({ width: right - left, height: 106 });
  for (let y = 751; y < 857; y++) {
    for (let x = left; x < right; x++) {
      const i = (y * 941 + x) * 4;
      const j = ((y - 751) * layer.width + x - left) * 4;
      const t = (y - 748) / 112;
      const bg = [0, 1, 2].map(
        (k) =>
          source.data[(748 * 941 + x) * 4 + k] * (1 - t) + source.data[(860 * 941 + x) * 4 + k] * t,
      );
      const alpha = Math.max(
        0,
        Math.min(1, (Math.max(...source.data.subarray(i, i + 3)) - Math.max(...bg)) / 175),
      );
      for (let k = 0; k < 3; k++) {
        layer.data[j + k] = Math.round(
          alpha
            ? Math.max(0, Math.min(255, (source.data[i + k] - bg[k] * (1 - alpha)) / alpha))
            : 0,
        );
        background.data[i + k] = Math.round(bg[k]);
      }
      layer.data[j + 3] = Math.round(alpha * 255);
    }
  }
  fs.writeFileSync(path.join(destination, 'letter-' + index + '.png'), PNG.sync.write(layer));
});
fs.writeFileSync(path.join(destination, 'background.png'), PNG.sync.write(background));
