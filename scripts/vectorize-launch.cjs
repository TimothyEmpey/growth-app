// Offline artwork tool: NODE_PATH=/path/to/tracing-tools/node_modules node scripts/vectorize-launch.cjs
// Requires potrace only while regenerating; the app consumes the saved vector paths.
const { trace } = require('potrace');
const { PNG } = require('pngjs');
const fs = require('node:fs');
const path = require('node:path');
const directory = path.join(__dirname, '../assets/launch');
const boxes = [
  [264, 354],
  [354, 393],
  [393, 457],
  [457, 551],
  [551, 595],
  [595, 659],
  [659, 690],
];

async function main() {
  const letters = await Promise.all(
    boxes.map(async ([x, right], index) => {
      const image = PNG.sync.read(fs.readFileSync(path.join(directory, `letter-${index}.png`)));
      // Trace the alpha contour, not the texture/noise inside the supplied lettering.
      for (let i = 0; i < image.data.length; i += 4) {
        const shade = 255 - image.data[i + 3];
        image.data[i] = image.data[i + 1] = image.data[i + 2] = shade;
        image.data[i + 3] = 255;
      }
      const svg = await new Promise((resolve, reject) =>
        trace(
          PNG.sync.write(image),
          {
            threshold: 100,
            turdSize: 8,
            alphaMax: 1,
            optTolerance: 0.35,
          },
          (error, result) => (error ? reject(error) : resolve(result)),
        ),
      );
      // Match the O counter to the reveal ellipse so their edges never form a jagged seam.
      const d =
        index === 2
          ? 'M0.6 69a31.4 32 0 1 0 62.8 0a31.4 32 0 1 0 -62.8 0Z M17.6 69a14.4 19 0 1 0 28.8 0a14.4 19 0 1 0 -28.8 0Z'
          : svg.match(/<path d="([^"]+)"/)[1];
      return { x, width: right - x, d, fill: index === 6 ? '#5275ff' : '#f6f7ff' };
    }),
  );
  fs.writeFileSync(
    path.join(directory, 'letter-paths.json'),
    JSON.stringify(letters, null, 2) + '\n',
  );
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
