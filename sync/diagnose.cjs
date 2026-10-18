#!/usr/bin/env node
/* Lag-Diagnose aus dem Spielstand: zählt Objekte je Gebiet, herumliegende Gegenstände, gezähmte Tiere, Feuer, Schiffe usw.
 *   node sync/diagnose.cjs <Ordner mit .chunk/.db2-Dateien>
 * Gibt nur Zahlen und Koordinaten aus (keine IDs). */
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const root = path.join(__dirname, '..');
require(path.join(root, 'js/data.js'));
const { parseChunk, stable } = require(path.join(root, 'js/convert.js'));
const D = globalThis.VW_DATA, PREF = D.prefabs, ITEMS = D.items;
const dir = process.argv[2]; const files = [];
(function walk(d) { for (const n of fs.readdirSync(d)) { const p = path.join(d, n); if (fs.statSync(p).isDirectory()) walk(p); else files.push(p); } })(dir);
const chunks = files.filter((f) => f.endsWith('.chunk'));
const H_TAMED = stable('tamed'), H_CREATOR = stable('creator'), H_OWNERNAME = stable('ownerName'), BEDS = new Set(['bed', 'piece_bed02'].map(stable)); const beds = [];
const FISH = new Set(Array.from({ length: 14 }, (_, i) => stable('Fish' + (i + 1)))); // Fische schwimmen als „Gegenstände“ im Meer – keine liegengelassenen Sachen
const zone = new Map(), byPrefab = new Map(); let total = 0, built = 0, drops = 0, tamed = 0, interior = 0;
const dropZ = new Map(), tameZ = new Map(), tameKind = new Map(), fires = new Map(), ships = [], smelt = new Map();
const FIRE = /fire|hearth|brazier|sconce|torch|lantern|bonfire|candle|lamp/i, SHIP = /^(VikingShip|Karve|Raft|Cart|Trailership|Ship)/, SMELT = /^(smelter|blastfurnace|charcoal_kiln|eitrrefinery|windmill|piece_spinningwheel|fermenter|piece_beehive|piece_oven|cooking_station|piece_cookingstation)/i;
const zk = (x, z) => Math.floor(x / 64) + ',' + Math.floor(z / 64);
const inc = (m, k, n = 1) => m.set(k, (m.get(k) || 0) + n);
for (const f of chunks) {
  try {
    parseChunk(new Uint8Array(fs.readFileSync(f)), (prefab, x, y, z, yaw, scale, L, S, B, I) => {
      total++; if (y > 2000) { interior++; return; }
      const name = PREF[prefab] || (ITEMS[prefab] ? 'Item:' + ITEMS[prefab] : '#' + prefab);
      inc(zone, zk(x, z)); inc(byPrefab, name);
      if (L && L[H_CREATOR] !== undefined) built++;
      if (BEDS.has(prefab)) beds.push([(S && S[H_OWNERNAME]) || '(niemand)', Math.round(x), Math.round(y), Math.round(z)]);
      if (ITEMS[prefab] && !FISH.has(prefab)) { drops++; inc(dropZ, zk(x, z)); }
      if (I && I[H_TAMED]) { tamed++; inc(tameZ, zk(x, z)); inc(tameKind, name); }
      if (FIRE.test(name) && L && L[H_CREATOR] !== undefined) inc(fires, zk(x, z));
      if (SHIP.test(name)) ships.push([name, Math.round(x), Math.round(z)]);
      if (SMELT.test(name)) inc(smelt, name);
    });
  } catch (e) { }
}
const top = (m, n) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);
const where = (k) => { const [a, b] = k.split(',').map(Number); return `x ${a * 64 + 32} / z ${b * 64 + 32}`; };
const sizes = files.map((f) => [path.basename(f), fs.statSync(f).size]);
const totalMB = sizes.reduce((a, s) => a + s[1], 0) / 1e6, db = sizes.find((s) => /\.db2?$/.test(s[0]));
const L = [];
L.push(`Objekte gesamt: ${total.toLocaleString('de-DE')} (davon ${built.toLocaleString('de-DE')} von Spielern gebaut, ${interior.toLocaleString('de-DE')} in Dungeons)`);
L.push(`Spielstand: ${totalMB.toFixed(1)} MB in ${chunks.length} Gebietsdateien` + (db ? `, Hauptdatei ${(db[1] / 1e6).toFixed(2)} MB` : ''));
L.push('', 'Dichteste Gebiete (64 × 64 m, Objekte):'); top(zone, 8).forEach(([k, n]) => L.push(`  ${n.toLocaleString('de-DE')}  bei ${where(k)}`));
L.push('', `Herumliegende Gegenstände: ${drops.toLocaleString('de-DE')}` + (drops ? ' – meiste bei: ' + top(dropZ, 4).map(([k, n]) => `${n} (${where(k)})`).join(', ') : ''));
L.push(`Gezähmte Tiere: ${tamed}` + (tamed ? ' – ' + top(tameKind, 6).map(([k, n]) => `${k} ${n}`).join(', ') + ' – meiste bei: ' + top(tameZ, 3).map(([k, n]) => `${n} (${where(k)})`).join(', ') : ''));
L.push(`Gebaute Feuer/Lichter: ${[...fires.values()].reduce((a, b) => a + b, 0)} – meiste bei: ` + top(fires, 3).map(([k, n]) => `${n} (${where(k)})`).join(', '));
L.push(`Schiffe/Karren: ${ships.length}` + (ships.length ? ' – ' + ships.slice(0, 12).map((s) => `${s[0]} (${s[1]}/${s[2]})`).join(', ') : ''));
L.push(`Werkstationen mit Dauerbetrieb: ` + top(smelt, 10).map(([k, n]) => `${k} ${n}`).join(', '));
L.push('', 'Betten: ' + beds.map((b) => `${b[0]} (x ${b[1]} / z ${b[3]})`).join(', '));
L.push('', 'Häufigste Objekte:'); top(byPrefab, 15).forEach(([k, n]) => L.push(`  ${n.toLocaleString('de-DE')}  ${k}`));
const out = L.join('\n'); console.log(out);
const esc = (x) => x.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
const parts = []; let cur = ''; out.split('\n').forEach((l) => { if (cur.length + l.length > 3500) { parts.push(cur); cur = ''; } cur += l + '\n'; }); if (cur) parts.push(cur);
parts.forEach((p, i) => console.log('::notice title=Lag-Diagnose ' + (i + 1) + '/' + parts.length + '::' + esc(p)));
