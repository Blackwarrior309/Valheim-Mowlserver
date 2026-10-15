#!/usr/bin/env node
/* Ältere Stände (z. B. Server-Backups) nachträglich in den Bau-Verlauf einsortieren.
 *   node tools/history-add.cjs <verlauf-ordner> <backup.zip|weltordner|stand.vwelt> [weitere …] [--time "2026-10-10 20:00"]
 * Zeitpunkt je Eingabe: --time (nur bei genau einer Eingabe) → Datum im Dateinamen (2026-10-10_20-00, 20261010-2000 …)
 *   → Änderungsdatum der .db2 im Ordner. Danach Branch „verlauf“ committen und pushen.
 */
'use strict';
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const root = path.join(__dirname, '..');
require(path.join(root, 'js/data.js'));
const fflate = require(path.join(root, 'lib/fflate.min.js'));
const { convert } = require(path.join(root, 'js/convert.js'));
const { insertSnapshot } = require(path.join(root, 'sync/history-store.cjs'));

const argv = process.argv.slice(2);
const ti = argv.indexOf('--time'); const timeArg = ti >= 0 ? argv.splice(ti, 2)[1] : null;
const [dir, ...inputs] = argv;
if (!dir || !inputs.length) { console.error('Aufruf: node tools/history-add.cjs <verlauf-ordner> <backup.zip|weltordner|stand.vwelt> [weitere …] [--time "JJJJ-MM-TT hh:mm"]'); process.exit(1); }
if (timeArg && inputs.length > 1) { console.error('--time geht nur mit genau einer Eingabe.'); process.exit(1); }

function timeFromName(n) {
  const m = /(20\d\d)[-_.]?(\d\d)[-_.]?(\d\d)(?:[T _-]?(\d\d)[-_.:h]?(\d\d))?/.exec(path.basename(n));
  if (!m) return null;
  return new Date(+m[1], +m[2] - 1, +m[3], +(m[4] || 12), +(m[5] || 0)).getTime();
}
function load(src) {
  const files = []; let mtime = 0;
  if (fs.statSync(src).isDirectory()) {
    (function walk(d) { for (const n of fs.readdirSync(d)) { const p = path.join(d, n), st = fs.statSync(p); if (st.isDirectory()) walk(p); else { files.push({ name: path.relative(src, p), data: new Uint8Array(fs.readFileSync(p)) }); if (/\.db2?$/.test(n)) mtime = Math.max(mtime, st.mtimeMs); } } })(src);
  } else if (/\.vwelt$/i.test(src)) {
    return { snap: JSON.parse(zlib.gunzipSync(fs.readFileSync(src)).toString('utf8')), mtime: 0 };
  } else {
    const z = fflate.unzipSync(new Uint8Array(fs.readFileSync(src)));
    for (const [name, data] of Object.entries(z)) if (!name.endsWith('/')) files.push({ name, data });
  }
  const snap = convert(files, { gunzip: (u8) => new Uint8Array(zlib.gunzipSync(u8)), stripIds: true });
  return { snap, mtime };
}

let n = 0;
for (const src of inputs) {
  process.stdout.write(path.basename(src) + ' … ');
  try {
    const { snap, mtime } = load(src);
    const t = timeArg ? new Date(timeArg).getTime() : (timeFromName(src) || mtime);
    if (!t || isNaN(t)) { console.log('kein Zeitpunkt erkennbar – bitte --time angeben.'); continue; }
    const r = insertSnapshot(dir, snap, t, { label: 'backup', log: () => {} }); require(path.join(root, 'sync/history-store.cjs')).recordDeaths(dir, snap, t);
    console.log(new Date(t).toLocaleString('de-DE') + ': ' + (r.changed ? `+${r.add} / −${r.del} Teile` : 'übersprungen (' + r.reason + ')'));
    if (r.changed) n++;
  } catch (e) { console.log('Fehler: ' + e.message); }
}
console.log(`${n} Stand/Stände einsortiert → ${dir}`);
