import fs from 'node:fs';
import path from 'node:path';
import { build } from 'esbuild';
const dist = path.resolve('dist'),
  archive = path.resolve('work/old-dist-' + Date.now());
if (
  !dist.startsWith(process.cwd() + path.sep) ||
  !archive.startsWith(process.cwd() + path.sep)
)
  throw Error('Unsafe output paths');
fs.mkdirSync('work', { recursive: true });
// Keep prior generated chunks: Windows can lock output directories during preview.
fs.mkdirSync('dist/server', { recursive: true });
fs.mkdirSync('dist/.openai', { recursive: true });
fs.cpSync('build', 'dist/client', { recursive: true });
fs.copyFileSync('.openai/hosting.json', 'dist/.openai/hosting.json');
const assets = {};
function walk(dir) {
  for (const n of fs.readdirSync(dir)) {
    const f = path.join(dir, n);
    if (fs.statSync(f).isDirectory()) walk(f);
    else if (!f.endsWith('.map'))
      assets['/' + path.relative('build', f).replaceAll('\\', '/')] = fs
        .readFileSync(f)
        .toString('base64');
  }
}
walk('build');
const header = `const bundledAssets=${JSON.stringify(assets)};\n`;
const result = await build({
  entryPoints: ['server/worker.ts'],
  bundle: true,
  format: 'esm',
  platform: 'browser',
  write: false,
});
fs.writeFileSync('dist/server/index.js', header + result.outputFiles[0].text);
console.log('Worker and app shell prepared');
