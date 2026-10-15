// Bau-Verlauf speichern: index.json + e/<zeit>.json.gz in einem Ordner (Live-Karte: Branch „verlauf“).
// Ein neuer Stand wird an der richtigen Zeitstelle einsortiert – auch ältere Stände (Backups) nachträglich.
'use strict';
const fs = require('fs'), path = require('path'), zlib = require('zlib');

function lib(name) {
  for (const p of [path.join(__dirname, 'lib', name), path.join(__dirname, '..', 'js', name)]) if (fs.existsSync(p)) return p;
  throw new Error('Datei fehlt: ' + name);
}
const H = require(lib('history.js'));

const fileOf = (t) => 'e/' + new Date(t).toISOString().replace(/[:.]/g, '-') + '.json.gz';

function loadIndex(dir) {
  try { return JSON.parse(fs.readFileSync(path.join(dir, 'index.json'), 'utf8')); } catch (e) { return { v: 1, world: '', entries: [] }; }
}
function readEvent(dir, f) { return H.decodeEvent(JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(dir, f))).toString('utf8'))); }
function writeEvent(dir, f, t, add, del) {
  fs.mkdirSync(path.join(dir, path.dirname(f)), { recursive: true });
  fs.writeFileSync(path.join(dir, f), zlib.gzipSync(Buffer.from(JSON.stringify(H.encodeEvent(t, add, del))), { level: 9 }));
}

/**
 * Stand einsortieren.
 * opts: { minGapMs (Standard 60 s: gleicher Zeitpunkt = überspringen), maxDropShare (Standard 0.3), log }
 * Rückgabe: { changed, reason?, add, del }
 */
function insertSnapshot(dir, snap, t, opts) {
  opts = opts || {}; const log = opts.log || (() => {});
  const minGap = opts.minGapMs === undefined ? 60e3 : opts.minGapMs, maxDrop = opts.maxDropShare === undefined ? 0.3 : opts.maxDropShare;
  fs.mkdirSync(dir, { recursive: true });
  const idx = loadIndex(dir);
  if (!idx.world) idx.world = snap.world && snap.world.name || '';
  if (snap.world && idx.world && snap.world.name && snap.world.name !== idx.world) return { changed: false, reason: 'andere Welt (' + snap.world.name + ' statt ' + idx.world + ')' };
  const E = idx.entries.sort((a, b) => a.t - b.t);
  if (E.some((e) => Math.abs(e.t - t) < minGap)) return { changed: false, reason: 'Zeitpunkt schon vorhanden' };
  let pos = E.findIndex((e) => e.t > t); if (pos < 0) pos = E.length;

  const cur = H.piecesFromSnap(snap);
  const prev = new Map();
  for (let i = 0; i < pos; i++) H.apply(prev, readEvent(dir, E[i].f));
  const d = H.diff(prev, cur);
  // Schutz: fehlen plötzlich sehr viele Teile, war der Stand vermutlich unvollständig (z. B. Welt halb geladen)
  if (prev.size > 500 && d.del.length > prev.size * maxDrop) return { changed: false, reason: `unplausibel: ${d.del.length} von ${prev.size} Teilen fehlen`, add: d.add.length, del: d.del.length };
  if (!d.add.length && !d.del.length && pos === E.length) return { changed: false, reason: 'keine Bau-Änderung', add: 0, del: 0 };

  // nachfolgenden Eintrag neu gegen den eingefügten Stand rechnen
  if (pos < E.length) {
    const next = H.apply(new Map(prev), readEvent(dir, E[pos].f));
    const dn = H.diff(cur, next);
    writeEvent(dir, E[pos].f, E[pos].t, dn.add, dn.del);
    Object.assign(E[pos], H.summary(dn.add, dn.del));
  }
  const f = fileOf(t);
  writeEvent(dir, f, t, d.add, d.del);
  E.splice(pos, 0, Object.assign({ t, f }, H.summary(d.add, d.del), opts.label ? { src: opts.label } : {}));
  idx.entries = E; idx.updated = Date.now();
  fs.writeFileSync(path.join(dir, 'index.json'), JSON.stringify(idx));
  log(`Verlauf: ${new Date(t).toISOString().slice(0, 16).replace('T', ' ')} · +${d.add.length} / −${d.del.length} Teile (${E.length} Einträge)`);
  return { changed: true, add: d.add.length, del: d.del.length };
}

module.exports = { insertSnapshot, loadIndex, readEvent };
