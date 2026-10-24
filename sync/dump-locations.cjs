#!/usr/bin/env node
/* Nur lesen: welt.vwdump vom Server holen und alle Ortstypen (Namen) auflisten, die die Karte noch nicht kennt – mit Anzahl und Gegend. */
const path = require('path'), zlib = require('zlib');
process.env.VS_SCAN_ONLY = '1';
const { FTP } = require('./sync.cjs');
require(path.join(__dirname, '..', 'js/data.js'));
const E = process.env, KNOWN = new Set(Object.values(globalThis.VW_DATA.locations).map((l) => l[0]));
(async () => {
  const ftp = new FTP({ host: E.VS_FTP_HOST, port: +E.VS_FTP_PORT || 21, user: E.VS_FTP_USER, password: E.VS_FTP_PASSWORD || '', secure: /^(1|true|ja|yes)$/i.test(E.VS_FTP_SECURE || '') });
  await ftp.connect();
  const u = zlib.gunzipSync(await ftp.get(E.VS_DUMP || '/valheim/BepInEx/config/ValheimWeltLive/welt.vwdump'));
  let p = 4; const i32 = () => { const v = u.readInt32LE(p); p += 4; return v; }, f32 = () => { const v = u.readFloatLE(p); p += 4; return v; };
  const str = () => { let n = 0, s = 0, b; do { b = u[p++]; n |= (b & 127) << s; s += 7; } while (b & 128); const t = u.toString('utf8', p, p + n); p += n; return t; };
  i32(); str(); str(); p += 8; const nk = i32(); for (let i = 0; i < nk; i++) str();
  const np = i32(); for (let i = 0; i < np; i++) { str(); p += 12; }
  const nl = i32(), by = new Map();
  for (let i = 0; i < nl; i++) { const n = str(), x = f32(), z = f32(), pl = u[p++]; let e = by.get(n); if (!e) by.set(n, (e = { n, c: 0, v: 0, north: 0, south: 0, ex: null })); e.c++; if (pl) e.v++; if (z > 6000) e.north++; if (z < -6000) e.south++; if (!e.ex) e.ex = [Math.round(x), Math.round(z)]; }
  const unk = [...by.values()].filter((e) => !KNOWN.has(e.n)).sort((a, b) => (b.north + b.south) - (a.north + a.south) || b.c - a.c);
  const fmt = (e) => `${e.n} ×${e.c}${e.north ? ' N' + e.north : ''}${e.south ? ' S' + e.south : ''}${e.v ? ' besucht ' + e.v : ''} (${e.ex.join('/')})`;
  const L = [`${nl} Orte, ${by.size} Typen, ${unk.length} unbekannt.`, 'Hoher Norden/Aschelande: ' + unk.filter((e) => e.north || e.south).map(fmt).join(' · '), 'Übrige: ' + unk.filter((e) => !e.north && !e.south).slice(0, 80).map((e) => e.n + ' ×' + e.c).join(', ')];
  const out = L.join('\n'); console.log(out); console.log('::notice title=Ortstypen::' + out.replace(/%/g, '%25').replace(/\n/g, '%0A'));
  process.exit(0);
})().catch((e) => { console.log('::error title=Ortstypen::' + String(e.message).replace(/\d{15,20}/g, '[ID]')); process.exit(1); });
