// Dependency-free PNG icon generator: blue->teal rounded square with a "vault tab" glyph.
import {deflateSync} from 'node:zlib';
import {writeFileSync, mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';

const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'extension', 'assets');
mkdirSync(out, {recursive: true});
const crcTable = Array.from({length: 256}, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = buf => { let c = 0xffffffff; for (const b of buf) c = crcTable[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (type, data) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const c = Buffer.alloc(4); c.writeUInt32BE(crc(body));
  return Buffer.concat([len, body, c]);
};
const inRound = (x, y, x0, y0, x1, y1, r) => {
  if (x < x0 || x > x1 || y < y0 || y > y1) return false;
  const cx = Math.min(Math.max(x, x0 + r), x1 - r), cy = Math.min(Math.max(y, y0 + r), y1 - r);
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
};
function render(size) {
  const S = 4, N = size * S, px = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let r = 0, g = 0, b = 0, a = 0;
    for (let sy = 0; sy < S; sy++) for (let sx = 0; sx < S; sx++) {
      const u = (x * S + sx + .5) / N, v = (y * S + sy + .5) / N;
      if (!inRound(u, v, 0, 0, 1, 1, .22)) continue;
      let col;
      const glyph = inRound(u, v, .24, .30, .76, .74, .07) && !inRound(u, v, .31, .42, .69, .67, .03)
        || inRound(u, v, .24, .22, .52, .36, .05);
      if (glyph) col = [248, 250, 252];
      else { const t = (u + v) / 2; col = [37 + (6 - 37) * t, 99 + (182 - 99) * t, 235 + (212 - 235) * t]; }
      r += col[0]; g += col[1]; b += col[2]; a++;
    }
    const i = (y * size + x) * 4, n = S * S;
    px[i] = a ? r / a : 0; px[i + 1] = a ? g / a : 0; px[i + 2] = a ? b / a : 0; px[i + 3] = Math.round(255 * a / n);
  }
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) px.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
for (const s of [16, 32, 48, 128]) writeFileSync(join(out, `icon${s}.png`), render(s));
console.log('icons written to', out);
