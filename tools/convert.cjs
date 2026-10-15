#!/usr/bin/env node
/* Welt (Ordner oder Zip) → .vwelt  –  für FTP-/Server-Pipelines
 *   node tools/convert.cjs <weltordner|welt.zip> [ausgabe.vwelt] [--strip-ids]
 * Benötigt nur Node ≥ 18, keine npm-Pakete.
 */
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const root = path.join(__dirname, '..');
require(path.join(root, 'js/data.js'));
const fflate = require(path.join(root, 'lib/fflate.min.js'));
const { convert } = require(path.join(root, 'js/convert.js'));

const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const strip = process.argv.includes('--strip-ids');
if (!args[0]) { console.error('Aufruf: node tools/convert.cjs <weltordner|welt.zip> [ausgabe.vwelt] [--strip-ids]'); process.exit(1); }
const src = args[0];
const files = [];
function walk(d) {
  for (const n of fs.readdirSync(d)) {
    const p = path.join(d, n), st = fs.statSync(p);
    if (st.isDirectory()) walk(p); else files.push({ name: path.relative(src, p), data: new Uint8Array(fs.readFileSync(p)) });
  }
}
if (fs.statSync(src).isDirectory()) walk(src);
else {
  const z = fflate.unzipSync(new Uint8Array(fs.readFileSync(src)));
  for (const [name, data] of Object.entries(z)) if (!name.endsWith('/')) files.push({ name, data });
}
const t0 = Date.now();
const snap = convert(files, {
  gunzip: (u8) => new Uint8Array(zlib.gunzipSync(u8)),
  stripIds: strip,
  progress: (t, f) => process.stderr.write('\r' + Math.round(f * 100) + '%  ' + t.padEnd(40))
});
const out = args[1] || (snap.world.name || 'welt').replace(/[^\w.-]+/g, '_') + '.vwelt';
const json = Buffer.from(JSON.stringify(snap));
fs.writeFileSync(out, zlib.gzipSync(json, { level: 9 }));
process.stderr.write('\n');
console.log(`${out}: ${(fs.statSync(out).size / 1e6).toFixed(2)} MB · ${snap.stats.zdos} Objekte · ${snap.regions.length} Basen · ${((Date.now() - t0) / 1000).toFixed(1)} s`);
snap.warnings.forEach((w) => console.log('Hinweis: ' + w));
