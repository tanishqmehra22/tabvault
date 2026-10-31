// Builds the static Vercel site into site/: landing page, live demo (/demo) and the extension ZIP.
import {readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, readdirSync, statSync} from 'node:fs';
import {join, dirname, relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {deflateRawSync} from 'node:zlib';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'site'), ext = join(root, 'extension'), src = join(root, 'site-src');
rmSync(out, {recursive: true, force: true}); mkdirSync(out, {recursive: true});

cpSync(src, out, {recursive: true});
for (const f of ['assets/fonts', 'assets/icon32.png', 'assets/icon48.png']) cpSync(join(ext, f), join(out, f), {recursive: true});
cpSync(ext, join(out, 'demo'), {recursive: true});
cpSync(join(root, 'tests/harness/chrome-stub.js'), join(out, 'demo/chrome-stub.js'));
cpSync(join(src, 'demo-seed.js'), join(out, 'demo/demo-seed.js')); rmSync(join(out, 'demo-seed.js'));
for (const page of ['popup.html', 'dashboard.html']) {
  const file = join(out, 'demo', page);
  writeFileSync(file, readFileSync(file, 'utf8').replace('<head>', '<head>\n  <script>window.__demo = true;</script>\n  <script src="chrome-stub.js"></script>\n  <script type="module" src="js/background.js"></script>\n  <script type="module" src="demo-seed.js"></script>'));
}

// Minimal ZIP writer (deflate) so the build needs no dependencies or system zip.
const table = Array.from({length: 256}, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc32 = buf => { let c = 0xffffffff; for (const b of buf) c = table[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const walk = d => readdirSync(d).flatMap(n => { const p = join(d, n); return statSync(p).isDirectory() ? walk(p) : [p]; });
const locals = [], centrals = []; let offset = 0;
for (const file of walk(ext).sort()) {
  const name = Buffer.from('tabvault-extension/' + relative(ext, file).split('\\').join('/'));
  const data = readFileSync(file), comp = deflateRawSync(data), crc = crc32(data);
  const lh = Buffer.alloc(30); lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(0x0800, 6); lh.writeUInt16LE(8, 8);
  lh.writeUInt16LE(0, 10); lh.writeUInt16LE(0x21, 12); lh.writeUInt32LE(crc, 14); lh.writeUInt32LE(comp.length, 18); lh.writeUInt32LE(data.length, 22); lh.writeUInt16LE(name.length, 26);
  const ch = Buffer.alloc(46); ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6); ch.writeUInt16LE(0x0800, 8); ch.writeUInt16LE(8, 10);
  ch.writeUInt16LE(0, 12); ch.writeUInt16LE(0x21, 14); ch.writeUInt32LE(crc, 16); ch.writeUInt32LE(comp.length, 20); ch.writeUInt32LE(data.length, 24); ch.writeUInt16LE(name.length, 28); ch.writeUInt32LE(offset, 42);
  locals.push(lh, name, comp); centrals.push(ch, name); offset += 30 + name.length + comp.length;
}
const cd = Buffer.concat(centrals), end = Buffer.alloc(22);
end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(centrals.length / 2, 8); end.writeUInt16LE(centrals.length / 2, 10); end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(offset, 16);
writeFileSync(join(out, 'tabvault-extension.zip'), Buffer.concat([...locals, cd, end]));
console.log('site built:', out);
