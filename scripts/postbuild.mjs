import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { createHash } from 'node:crypto';
const root = 'build';
const base = (() => {
  const raw = process.env.VITE_BASE_PATH || '/';
  return '/' + raw.replace(/^\/+|\/+$/g, '') + (raw === '/' ? '' : '/');
})();
async function walk(dir) {
  let out = [];
  for (const item of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, item.name);
    if (item.isDirectory()) out.push(...(await walk(path)));
    else out.push(path);
  }
  return out;
}
const files = (await walk(root)).filter(
  (p) => !p.endsWith('.map') && !p.endsWith('sw.js') && !p.includes('.openai'),
);
if (!files.some((p) => p.replaceAll('\\', '/').endsWith('/index.html')))
  throw Error('Static export missing index.html');
const hash = createHash('sha256');
for (const f of files) hash.update(await readFile(f));
const version = hash.digest('hex').slice(0, 12);
const paths = [
  base,
  ...files.map((p) => base + relative(root, p).replaceAll('\\', '/')),
];
const code = `const CACHE='wimm-${version}';const ASSETS=${JSON.stringify(paths)};
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('message',e=>{if(e.data?.type==='SKIP_WAITING')self.skipWaiting()});
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('wimm-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(e.request.method!=='GET'||u.origin!==self.location.origin||u.pathname===${JSON.stringify(base + 'sw.js')}||u.pathname.startsWith('/api/'))return;if(e.request.mode==='navigate'){e.respondWith(fetch(e.request).then(r=>r.ok?r:caches.match(${JSON.stringify(base)})).catch(()=>caches.match(${JSON.stringify(base)})));return;}e.respondWith(caches.match(e.request).then(hit=>hit||fetch(e.request)));});`;
await writeFile(join(root, 'sw.js'), code);
console.log(
  'Offline app shell prepared: ' + paths.length + ' files, version ' + version,
);
