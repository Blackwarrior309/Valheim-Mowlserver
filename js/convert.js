/* Valheim-Welt → .vwelt-Snapshot. Läuft im Browser (Worker) und in Node.
 * Inoffiziell, nicht von Iron Gate. Format siehe docs/FORMAT.md
 */
(function (g) {
  'use strict';
  const FORMAT_VERSION = 1;
  const WATER = 30;

  // ---------- Hash (Valheim GetStableHashCode) ----------
  function stable(s) {
    let h1 = 5381, h2 = 5381;
    for (let i = 0; i < s.length; i += 2) {
      h1 = (((h1 << 5) + h1) ^ s.charCodeAt(i)) | 0;
      if (i === s.length - 1) break;
      h2 = (((h2 << 5) + h2) ^ s.charCodeAt(i + 1)) | 0;
    }
    return (h1 + Math.imul(h2, 1566083941)) | 0;
  }
  const K = {};
  ['creator', 'owner', 'ownerName', 'text', 'tag', 'tagauthor', 'author', 'items', 'scale', 'timeOfDeath', 'crafterName', 'item', 'stack', 'quality'].forEach((n) => (K[n] = stable(n)));
  const K_AUTHOR_NAME = -1847800717;

  // ---------- Binär-Leser ----------
  const td = new TextDecoder('utf-8');
  class R {
    constructor(u8) { this.u = u8; this.v = new DataView(u8.buffer, u8.byteOffset, u8.byteLength); this.p = 0; }
    need(n) { if (this.p + n > this.u.length) throw new Error('Dateiende erreicht (' + this.p + ')'); }
    u8() { this.need(1); return this.u[this.p++]; }
    u16() { this.need(2); const r = this.v.getUint16(this.p, true); this.p += 2; return r; }
    i16() { this.need(2); const r = this.v.getInt16(this.p, true); this.p += 2; return r; }
    i32() { this.need(4); const r = this.v.getInt32(this.p, true); this.p += 4; return r; }
    f32() { this.need(4); const r = this.v.getFloat32(this.p, true); this.p += 4; return r; }
    f64() { this.need(8); const r = this.v.getFloat64(this.p, true); this.p += 8; return r; }
    i64() { this.need(8); const r = this.v.getBigInt64(this.p, true); this.p += 8; return r; }
    skip(n) { this.need(n); this.p += n; }
    str() {
      let n = 0, sh = 0, c;
      do { c = this.u8(); n |= (c & 0x7f) << sh; sh += 7; } while (c & 0x80);
      this.need(n); const s = td.decode(this.u.subarray(this.p, this.p + n)); this.p += n; return s;
    }
    bytes(n) { this.need(n); const b = this.u.subarray(this.p, this.p + n); this.p += n; return b; }
  }

  // ---------- .fwl2 ----------
  function parseFwl(u8) {
    const r = new R(u8); const out = { name: '', seedName: '', seed: 0, modifiers: [], players: [] };
    r.i32(); out.version = r.i32();
    out.name = r.str(); out.seedName = r.str(); out.seed = r.i32();
    try {
      out.uid = r.i64().toString(); out.worldGen = r.i32(); r.u8();
      const nk = r.i32();
      for (let i = 0; i < nk && i < 200; i++) out.modifiers.push(r.str());
      const np = r.i32();
      for (let i = 0; i < np && i < 500; i++) {
        const platform = r.str(), name = r.str(); r.str(); const hex = r.str();
        out.players.push({ platform, name, hex });
      }
    } catch (e) { /* ältere Formate: nur Name/Seed */ }
    return out;
  }

  // ---------- .db2 ----------
  function parseDb(u8, gunzip) {
    const r0 = new R(u8); const ver = r0.i32(); const netTime = r0.f64(); const len = r0.i32();
    const data = gunzip(u8.subarray(r0.p, r0.p + len));
    const r = new R(data);
    const nz = r.i32(); r.skip(nz * 4);
    r.i32();
    const nk = r.i32(); const keys = [];
    for (let i = 0; i < nk; i++) keys.push(r.str());
    r.u8();
    const nl = r.i32(); const locs = [];
    const L = g.VW_DATA.locations;
    for (let i = 0; i < nl; i++) {
      const h = r.i32(), x = r.f32(), y = r.f32(), z = r.f32(), gen = r.u8();
      const l = L[h]; if (l) locs.push(Object.assign({ k: l[0], n: l[1], x: Math.round(x), z: Math.round(z), v: gen }, l[2] ? { c: l[2] } : {}));
    }
    return { version: ver, keys, locations: locs, netTime };
  }

  // ---------- Inventar ----------
  function parseInv(b) {
    const r = new R(b); r.i32(); const n = r.u16(); const out = [];
    for (let k = 0; k < n; k++) {
      r.i32(); r.u8(); r.u8(); r.u8(); const fl = r.u8();
      let stack = 1, q = 1;
      if (fl & 0x08) stack = r.u16();
      if (fl & 0x04) q = r.u16();
      if (fl & 0x10) r.i32();
      if (fl & 0x02) r.u16();
      let by = '';
      if (fl & 0x20) { r.i64(); by = r.str(); }
      const h = r.i32();
      const t = r.u8(); for (let i = 0; i < t; i++) { r.str(); r.str(); }
      out.push([h, stack, q, by]);
    }
    return out;
  }

  // ---------- Chunk-Datei (ZDOs) ----------
  function parseChunk(u8, visit) {
    const r = new R(u8); r.u16(); const n = r.i32();
    for (let k = 0; k < n; k++) {
      const fl = r.u16(); let x, y, z;
      if (fl & 0x2000) { x = r.i16(); y = 0; z = r.i16(); } else { x = r.f32(); y = r.f32(); z = r.f32(); }
      const prefab = r.i32(); let yaw = 0;
      if (fl & 0x1000) { const a = r.u16(); if (a & 0x8000) yaw = (a & 0x7fff) * 0.5; else r.u16(); }
      if (fl & 1) r.skip(5);
      let L = null, S = null, B = null, I = null, scale = 1;
      if (fl & 2) { const c = r.u8(); r.skip(c * 8); }
      if (fl & 4) { const c = r.u8(); for (let i = 0; i < c; i++) { const key = r.i32(); const vx = r.f32(); r.skip(8); if (key === K.scale) scale = vx; } }
      if (fl & 8) { const c = r.u8(); r.skip(c * 20); }
      if (fl & 16) { const c = r.u8(); for (let i = 0; i < c; i++) { const key = r.i32(); const v = r.i32(); (I || (I = {}))[key] = v; } }
      if (fl & 32) { const c = r.u8(); for (let i = 0; i < c; i++) { const key = r.i32(); const v = r.i64(); (L || (L = {}))[key] = v; } }
      if (fl & 64) { const c = r.u8(); for (let i = 0; i < c; i++) { const key = r.i32(); const v = r.str(); (S || (S = {}))[key] = v; } }
      if (fl & 128) { const c = r.u8(); for (let i = 0; i < c; i++) { const key = r.i32(); const len = r.i32(); const v = r.bytes(len); (B || (B = {}))[key] = v; } }
      if (fl & 0x2000) continue; // Zonen-Platzhalter
      visit(prefab, x, y, z, yaw, scale, L, S, B, I);
    }
    return n;
  }


  // ---------- Live-Dump vom Mod (.vwdump, Format VWD1, siehe docs/FORMAT.md) ----------
  function parseDump(u8, visit) {
    const r = new R(u8);
    const magic = String.fromCharCode(u8[0], u8[1], u8[2], u8[3]); r.skip(4);
    if (magic !== 'VWD1') throw new Error('Kein VWD1-Dump');
    const ver = r.i32(); const meta = { version: ver, world: r.str(), seed: r.str(), time: Number(r.i64()), keys: [], live: [], locations: [] };
    const nk = r.i32(); for (let i = 0; i < nk; i++) meta.keys.push(r.str());
    const np = r.i32(); for (let i = 0; i < np; i++) meta.live.push({ name: r.str(), x: r.f32(), y: r.f32(), z: r.f32() });
    const nl = r.i32(); const L = g.VW_DATA.locations;
    for (let i = 0; i < nl; i++) { const n = r.str(), x = r.f32(), z = r.f32(), pl = r.u8(); const l = L[stable(n)]; if (l) meta.locations.push(Object.assign({ k: l[0], n: l[1], x: Math.round(x), z: Math.round(z), v: pl }, l[2] ? { c: l[2] } : {})); }
    const nz = r.i32();
    for (let k = 0; k < nz; k++) {
      const prefab = r.i32(), x = r.f32(), y = r.f32(), z = r.f32(), yaw = r.f32(), scale = r.f32(), m = r.u8();
      let Lm = null, S = null, B = null;
      if (m & 1) (Lm || (Lm = {}))[K.creator] = r.i64();
      if (m & 2) (Lm || (Lm = {}))[K.owner] = r.i64();
      if (m & 4) { const c = r.u8(); for (let i = 0; i < c; i++) { const key = r.i32(); (S || (S = {}))[key] = r.str(); } }
      if (m & 8) { const len = r.i32(); (B || (B = {}))[K.items] = r.bytes(len); }
      visit(prefab, x, y, z, yaw, scale, Lm, S, B);
    }
    meta.count = nz;
    // optionale Zusatzabschnitte: EXPL = aufgedeckte Karte (Spiel-Client), BIOM = Biom-Raster aus dem Weltgenerator
    while (r.p + 16 <= u8.length) {
      const tag = String.fromCharCode(u8[r.p], u8[r.p + 1], u8[r.p + 2], u8[r.p + 3]);
      if (tag === 'EXPL') { r.skip(4); const size = r.i32(), pixel = r.f32(), len = r.i32(); meta.explored = { size, pixel, bits: r.bytes(len) }; }
      else if (tag === 'BIOM') { r.skip(4); const n = r.i32(), res = r.f32(), x0 = r.f32(), len = r.i32(); meta.biomes = { n, res, x0, z0: x0, b: r.bytes(len) }; }
      else break;
    }
    return meta;
  }

  // ---------- Hilfen ----------
  const b64 = (u8) => {
    if (typeof Buffer !== 'undefined') return Buffer.from(u8.buffer, u8.byteOffset, u8.byteLength).toString('base64');
    let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
    return btoa(s);
  };
  const r2 = (v) => Math.round(v * 100) / 100;
  const r1 = (v) => Math.round(v * 10) / 10;
  const clean = (s) => String(s || '').replace(/<[^>]*>/g, '').trim();

  // Lücken in einem Raster füllen (Pyramide: grob → fein)
  function fillGrid(val, w, h) {
    const has = new Uint8Array(w * h); for (let i = 0; i < w * h; i++) has[i] = isNaN(val[i]) ? 0 : 1;
    if (w <= 1 && h <= 1) { if (!has[0]) val[0] = WATER - 6; return val; }
    const W2 = Math.ceil(w / 2), H2 = Math.ceil(h / 2), c = new Float32Array(W2 * H2).fill(NaN);
    for (let j = 0; j < H2; j++) for (let i = 0; i < W2; i++) {
      let s = 0, n = 0;
      for (let dj = 0; dj < 2; dj++) for (let di = 0; di < 2; di++) { const x = i * 2 + di, y = j * 2 + dj; if (x < w && y < h && has[y * w + x]) { s += val[y * w + x]; n++; } }
      if (n) c[j * W2 + i] = s / n;
    }
    fillGrid(c, W2, H2);
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (!has[j * w + i]) {
      const fx = Math.min(W2 - 1, Math.max(0, (i - 0.5) / 2)), fy = Math.min(H2 - 1, Math.max(0, (j - 0.5) / 2));
      const x0 = Math.floor(fx), y0 = Math.floor(fy), x1 = Math.min(W2 - 1, x0 + 1), y1 = Math.min(H2 - 1, y0 + 1), tx = fx - x0, ty = fy - y0;
      val[j * w + i] = (c[y0 * W2 + x0] * (1 - tx) + c[y0 * W2 + x1] * tx) * (1 - ty) + (c[y1 * W2 + x0] * (1 - tx) + c[y1 * W2 + x1] * tx) * ty;
    }
    return val;
  }
  function blur(val, w, h) {
    const o = new Float32Array(val.length);
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      let s = 0, n = 0;
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) { const x = i + di, y = j + dj; if (x >= 0 && y >= 0 && x < w && y < h) { const k = (di === 0 && dj === 0) ? 4 : (di === 0 || dj === 0) ? 2 : 1; s += val[y * w + x] * k; n += k; } }
      o[j * w + i] = s / n;
    }
    return o;
  }

  // ---------- Hauptfunktion ----------
  /**
   * files: [{name, data:Uint8Array}]
   * opts: { gunzip(u8)->u8, progress(text, frac), stripIds:boolean, minBasePieces }
   */
  function convert(files, opts) {
    const D = g.VW_DATA;
    const gunzip = opts.gunzip; const prog = opts.progress || (() => {});
    const minBase = opts.minBasePieces || 25;
    const warnings = [];

    // Dateien sortieren, Duplikate/Systemdateien raus
    const seen = new Set(); let fwl = null, db = null; const chunks = []; const dumps = []; let dupes = 0;
    const norm = (n) => n.split(/[\\/]/).pop();
    const sorted = files.slice().sort((a, b) => norm(a.name).length - norm(b.name).length);
    for (const f of sorted) {
      const base = norm(f.name);
      if (base.startsWith('._') || f.name.includes('__MACOSX')) continue;
      const canon = base.replace(/ \(\d+\)(?=\.[^.]+$)/, '').replace(/ \(\d+\)\.chunk \d+$/, '.chunk').replace(/\.chunk \d+$/, '.chunk');
      if (seen.has(canon)) { dupes++; continue; }
      seen.add(canon);
      if (/\.fwl2?$/i.test(base)) fwl = fwl || f;
      else if (/\.db2$/i.test(base)) db = db || f;
      else if (/\.chunk$/i.test(canon)) chunks.push(f);
      else if (/\.vwdump$/i.test(base)) dumps.push(f);
    }
    if (!chunks.length && !dumps.length) throw new Error('Keine .chunk-Dateien gefunden. Bitte den kompletten Weltordner (Valheim 1.0) bzw. die Zip davon auswählen.');

    const world = fwl ? parseFwl(fwl.data) : { name: 'Unbekannte Welt', seedName: '', modifiers: [], players: [] };
    let dbi = { keys: [], locations: [] };
    if (db) { try { dbi = parseDb(db.data, gunzip); } catch (e) { warnings.push('.db2 nicht lesbar: ' + e.message); } }
    else warnings.push('Keine .db2 gefunden – Bosse/Orte fehlen.');
    if (!fwl && !dumps.length) warnings.push('Keine .fwl2 gefunden – Weltname/Spieler fehlen.');

    // Sammeln
    const GROUND = new Set(D.ground), NAT = D.nature, PREF = D.prefabs, SPEC = D.pieces, CONT = D.containers;
    const H_PORTAL = new Set(['portal_wood', 'portal_stone', 'portal'].map(stable));
    const H_BED = new Set(['bed', 'piece_bed02'].map(stable)), H_SIGN = stable('sign'), H_TOMB = stable('Player_tombstone'), H_MAPT = stable('piece_cartographytable'), K_DATA = stable('data');
    let gx = new Float32Array(1 << 16), gn = 0; // Bodenpunkte x,y,z
    const gCells = new Set(), alt = []; // Ersatz-Bodenpunkte für Gebiete ohne bekannte Pflanzen (z. B. Aschelande)
    const pushG = (x, y, z) => { if (gn * 3 + 3 > gx.length) { const t = new Float32Array(gx.length * 2); t.set(gx); gx = t; } gx[gn * 3] = x; gx[gn * 3 + 1] = y; gx[gn * 3 + 2] = z; gn++; };
    const mapTables = []; const pieces = []; const nature = []; const signs = []; const portals = []; const beds = []; const conts = []; const tombs = []; const loose = [];
    let total = 0;
    const visitor = (prefab, x, y, z, yaw, scale, L, S, B, I) => {
          if (y > 2000 || Math.abs(x) > 12000 || Math.abs(z) > 12000) return;
          const name = PREF[prefab];
          const cr = L ? L[K.creator] : undefined;
          if (cr !== undefined || (name && SPEC[name])) pieces.push([x, y, z, yaw, prefab, cr !== undefined ? cr.toString() : '']);
          // Bodenhöhe: bekannte Pflanzen/Steine; andere natürliche Objekte nur als Ersatz (siehe unten), unsichtbare Systemobjekte (_ZoneCtrl usw., liegen auf Höhe 0) nie
          if (GROUND.has(prefab)) { pushG(x, y, z); gCells.add(Math.floor(x / 32) + ',' + Math.floor(z / 32)); }
          else if (cr === undefined && !(name && (SPEC[name] || name[0] === '_')) && !H_PORTAL.has(prefab) && y > WATER - 40) { if (alt.length < 3e6) alt.push(x, y, z); }
          const nk = NAT[prefab]; if (nk) nature.push([nk, x, y, z, yaw, scale, name]);
          if (cr === undefined) { const bh = hintOf(prefab); if (bh) { const k = Math.floor(x / BR) + ',' + Math.floor(z / BR); let v = bioVotes.get(k); if (!v) bioVotes.set(k, (v = new Uint16Array(10))); v[bh]++; } }
          if (prefab === H_MAPT && B && B[K_DATA]) mapTables.push({ x, z, d: B[K_DATA] });
          if (H_PORTAL.has(prefab)) portals.push({ tag: (S && S[K.tag]) || '', x, y, z });
          else if (prefab === H_SIGN && S && S[K.text]) signs.push({ x, y, z, t: clean(S[K.text]), a: S[K.author] || '', an: S[K_AUTHOR_NAME] || '', c: cr !== undefined ? cr.toString() : '' });
          else if (H_BED.has(prefab) && S && S[K.ownerName]) beds.push({ x, y, z, n: S[K.ownerName], o: L && L[K.owner] !== undefined ? L[K.owner].toString() : '' });
          else if (prefab === H_TOMB) { let items = 0; try { if (B && B[K.items]) parseInv(B[K.items]).forEach((it) => (items += it[1])); } catch (e) { } tombs.push({ x, y, z, n: (S && S[K.ownerName]) || '', tod: L && L[K.timeOfDeath] !== undefined ? Number(L[K.timeOfDeath]) : null, items }); }
          if (S && S[K.crafterName]) { const ih = S[K.item] ? stable(S[K.item]) : prefab; loose.push([ih, (I && I[K.stack]) || 1, (I && I[K.quality]) || 1, S[K.crafterName]]); }
          if (CONT[prefab] && B && B[K.items]) { try { conts.push({ x, y, z, t: CONT[prefab], c: cr !== undefined ? cr.toString() : '', inv: parseInv(B[K.items]) }); } catch (e) { } }
    };
    let live = null, EXP = null, BIO = null;
    // Biome: 1 Wiesen, 2 Sumpf, 3 Berge, 4 Schwarzwald, 5 Ebenen, 6 Aschelande, 7 Tiefer Norden, 8 Meer, 9 Nebellande
    const BR = 64, bioHint = new Map(), bioVotes = new Map();
    const hintOf = (prefab) => {
      if (bioHint.has(prefab)) return bioHint.get(prefab);
      const n = PREF[prefab] || ''; let b = 0;
      if (/^(Beech|Oak|Pickable_Dandelion|Raspberry)/.test(n)) b = 1;
      else if (/^SwampTree|swamp/i.test(n)) b = 2;
      else if (/_mountain$|^Pickable_Mountain|^silvervein/i.test(n)) b = 3;
      else if (/^(FirTree|Pinetree|rock4_forest|Blueberry|Pickable_Thistle)/.test(n)) b = 4;
      else if (/_heath$|_plains$|^Cloudberry|^Pickable_Barley/i.test(n)) b = 5;
      else if (/^Ashland|^Charred|^Pickable_.*Ash/i.test(n)) b = 6;
      else if (/^Ygga|^Mistlands|^Pickable_Mushroom_(Magecap|JotunPuffs)/i.test(n)) b = 9;
      bioHint.set(prefab, b); return b;
    };
    // aufgedeckte Karte: Bit (x,z) gesetzt? (Valheim Minimap: Pixel = Welt/pixelSize + Größe/2)
    const expAt = (x, z) => { const S = EXP.size, px = Math.floor(x / EXP.pixel + S / 2), py = Math.floor(z / EXP.pixel + S / 2); if (px < 0 || py < 0 || px >= S || py >= S) return false; const b = py * S + px; return (EXP.bits[b >> 3] >> (b & 7)) & 1; };
    function expBounds() { // Weltkoordinaten-Rahmen aller aufgedeckten Pixel
      const S = EXP.size; let a = S, b = -1, c = S, d = -1;
      for (let py = 0; py < S; py++) { const row = py * S; for (let px = 0; px < S; px += 8) { const by = EXP.bits[(row + px) >> 3]; if (!by) continue; for (let k = 0; k < 8; k++) if ((by >> k) & 1) { const x = px + k; if (x < a) a = x; if (x > b) b = x; if (py < c) c = py; if (py > d) d = py; } } }
      if (b < 0) return null; const P = EXP.pixel;
      return { x0: (a - S / 2) * P, x1: (b + 1 - S / 2) * P, z0: (c - S / 2) * P, z1: (d + 1 - S / 2) * P };
    }
    if (dumps.length) {
      // Live-Dump vom Mod hat Vorrang (aktueller Speicherstand des Spiels)
      const f = dumps.sort((a, b) => b.data.length - a.data.length)[0];
      const raw = (f.data[0] === 0x1f && f.data[1] === 0x8b) ? gunzip(f.data) : f.data; // Mod schreibt die Datei gzip-komprimiert
      const meta = parseDump(raw, visitor); total = meta.count;
      if (!fwl) { world.name = meta.world || world.name; world.seedName = meta.seed || world.seedName; }
      if (!db) { dbi = { keys: meta.keys, locations: meta.locations }; warnings.splice(warnings.indexOf('Keine .db2 gefunden – Bosse/Orte fehlen.'), 1); }
      live = { time: meta.time, players: meta.live.map((p) => ({ name: p.name, x: r1(p.x), y: r1(p.y), z: r1(p.z) })) };
      if (meta.explored && meta.explored.size > 0) EXP = meta.explored;
      if (meta.biomes && meta.biomes.n > 0) BIO = meta.biomes;
      prog('Live-Dump gelesen', 0.65);
    } else chunks.forEach((f, i) => {
      try {
        total += parseChunk(f.data, visitor);
      } catch (e) { warnings.push(f.name + ': ' + e.message); if (opts.debug) console.error(e); }
      if (i % 4 === 0) prog('Lese Chunks ' + (i + 1) + '/' + chunks.length, 0.05 + 0.6 * (i + 1) / chunks.length);
    });
    prog('Werte aus …', 0.7);

    // Spieler / Charaktere
    const steamName = {}; world.players.forEach((p) => (steamName[p.platform] = p.name));
    const charName = {}, charAcct = {}, acctDisplay = {};
    beds.forEach((b) => { if (b.o) charName[b.o] = charName[b.o] || b.n; });
    signs.forEach((s) => { if (s.a && s.an) acctDisplay[s.a] = s.an; if (s.c && s.a) { charAcct[s.c] = charAcct[s.c] || {}; charAcct[s.c][s.a] = (charAcct[s.c][s.a] || 0) + 1; } });
    portals.forEach(() => {});
    const builderCount = {};
    pieces.forEach((p) => { if (p[5]) builderCount[p[5]] = (builderCount[p[5]] || 0) + 1; });
    const characters = Object.keys(builderCount).sort((a, b) => builderCount[b] - builderCount[a]).map((id) => {
      let acct = '';
      if (charAcct[id]) { const best = Object.entries(charAcct[id]).sort((a, b) => b[1] - a[1])[0][0]; acct = best; }
      return { id, name: charName[id] || '', account: acct ? (steamName[acct] || acctDisplay[acct] || '') : '', steam: acct, pieces: builderCount[id] };
    });
    // Kartentische: gemeinsam aufgedeckte Karte + Pins mit Ersteller (Minimap.GetSharedMapData, Version 3)
    const tablePins = [], pinSeen = new Set(); let tableBits = null, tableSize = 0;
    mapTables.forEach((t) => {
      try {
        const u = (t.d[0] === 0x1f && t.d[1] === 0x8b) ? gunzip(t.d) : t.d; const r = new R(u); const ver = r.i32(); if (ver < 3) return;
        const n = r.i32(), bits = r.bytes(n), sz = Math.round(Math.sqrt(n));
        if (!tableBits) { tableBits = new Uint8Array(n); tableSize = sz; } if (sz === tableSize) for (let i = 0; i < n; i++) if (bits[i]) tableBits[i] = 1;
        const pc = r.i32();
        for (let i = 0; i < pc; i++) {
          const owner = r.i64().toString(), name = r.str(), x = r.f32(); r.f32(); const z = r.f32(), type = r.i32(), checked = r.u8(), author = r.str();
          const key = Math.round(x) + ',' + Math.round(z) + ',' + type; if (pinSeen.has(key)) continue; pinSeen.add(key);
          tablePins.push({ n: name, x: Math.round(x), z: Math.round(z), t: type, c: checked ? 1 : 0, by: charName[owner] || steamName[author] || acctDisplay[author] || '' });
        }
      } catch (e) { warnings.push('Kartentisch nicht lesbar: ' + e.message); }
    });
    let tableMap = null;
    if (tableBits) { // auf 1024² (24 m) verkleinern, 1 Bit je Pixel
      const S2 = tableSize >> 1, out = new Uint8Array(Math.ceil(S2 * S2 / 8));
      for (let y = 0; y < S2; y++) for (let x = 0; x < S2; x++) { const a = (2 * y) * tableSize + 2 * x; if (tableBits[a] | tableBits[a + 1] | tableBits[a + tableSize] | tableBits[a + tableSize + 1]) { const b = y * S2 + x; out[b >> 3] |= 1 << (b & 7); } }
      tableMap = { size: S2, pixel: 24, tables: mapTables.length, bits: b64(out) };
    }
    const ownerLabel = {}; characters.forEach((c, i) => { ownerLabel[c.id] = (c.name || 'Unbekannt ' + (i + 1)) + (c.account ? ' (' + c.account + ')' : ''); });

    // Basen finden: Raster 32 m, verbundene Zellen (mit 1 Zelle Lücke)
    const CS = 32, cells = new Map();
    pieces.forEach((p, i) => { if (!p[5]) return; const k = Math.floor(p[0] / CS) + ',' + Math.floor(p[2] / CS); (cells.get(k) || cells.set(k, []).get(k)).push(i); });
    const done = new Set(), clusters = [];
    for (const k of cells.keys()) {
      if (done.has(k)) continue;
      const q = [k]; done.add(k); const cl = [];
      while (q.length) {
        const c = q.pop(); cl.push(c); const [cx, cz] = c.split(',').map(Number);
        for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) { const nk = (cx + dx) + ',' + (cz + dz); if (cells.has(nk) && !done.has(nk)) { done.add(nk); q.push(nk); } }
      }
      let n = 0, x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
      cl.forEach((c) => cells.get(c).forEach((i) => { const p = pieces[i]; n++; x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); z0 = Math.min(z0, p[2]); z1 = Math.max(z1, p[2]); }));
      if (n >= minBase) clusters.push({ n, x0, x1, z0, z1 });
    }
    clusters.sort((a, b) => b.n - a.n);

    // Bodenpunkte als Raster-Index für schnelle Abfrage
    // Ersatzpunkte nur dort, wo keine bekannten Bodenobjekte liegen (32-m-Zellen)
    for (let i = 0; i < alt.length; i += 3) if (!gCells.has(Math.floor(alt[i] / 32) + ',' + Math.floor(alt[i + 2] / 32))) pushG(alt[i], alt[i + 1], alt[i + 2]);
    const ground = gx.subarray(0, gn * 3);
    function heightGrid(x0, z0, w, h, res, far) {
      const cr = res * 2, cw = Math.ceil(w * res / cr) + 1, ch = Math.ceil(h * res / cr) + 1;
      const c = new Float32Array(cw * ch).fill(NaN);
      // Höhe je Zelle = Median der Bodenpunkte (der tiefste Punkt wäre oft ein Stein im Wasser am Ufer → Insel würde zu Meer)
      const cnt = new Uint32Array(cw * ch);
      for (let i = 0; i < gn; i++) { const ci = Math.floor((ground[i * 3] - x0) / cr), cj = Math.floor((ground[i * 3 + 2] - z0) / cr); if (ci >= 0 && cj >= 0 && ci < cw && cj < ch && ground[i * 3 + 1] <= 400) cnt[cj * cw + ci]++; }
      const off = new Uint32Array(cw * ch + 1); for (let i = 0; i < cw * ch; i++) off[i + 1] = off[i] + cnt[i];
      const ys = new Float32Array(off[cw * ch]), fillp = off.slice(0, cw * ch);
      for (let i = 0; i < gn; i++) { const ci = Math.floor((ground[i * 3] - x0) / cr), cj = Math.floor((ground[i * 3 + 2] - z0) / cr); if (ci >= 0 && cj >= 0 && ci < cw && cj < ch && ground[i * 3 + 1] <= 400) { const k = cj * cw + ci; ys[fillp[k]++] = ground[i * 3 + 1]; } }
      for (let k = 0; k < cw * ch; k++) { const n = cnt[k]; if (!n) continue; const a = ys.subarray(off[k], off[k] + n); a.sort(); c[k] = a[n >> 1]; }
      // Bauteile: Gelände nie tiefer als das unterste Bauteil (Basen sind oft abgeholzt; Stege mit Pfosten im Wasser bleiben Wasser)
      const pc = new Map();
      for (const p of pieces) { if (!p[5] || p[1] > 400) continue; const ci = Math.floor((p[0] - x0) / cr), cj = Math.floor((p[2] - z0) / cr); if (ci < 0 || cj < 0 || ci >= cw || cj >= ch) continue; const k = cj * cw + ci; const v = pc.get(k); if (v === undefined || p[1] < v) pc.set(k, p[1]); }
      for (const [k, y] of pc) if (isNaN(c[k]) || c[k] < y - 1.5) c[k] = y - 0.3;
      let known = null;
      if (far) { // nur erkundete Gebiete: Rest wird Meeresboden
        known = new Uint8Array(cw * ch); for (let i = 0; i < c.length; i++) known[i] = isNaN(c[i]) ? 0 : 1;
        for (let it = 0; it < 2; it++) { const k2 = known.slice(); for (let j = 0; j < ch; j++) for (let i = 0; i < cw; i++) if (!known[j * cw + i]) { for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) { const x = i + di, y = j + dj; if (x >= 0 && y >= 0 && x < cw && y < ch && known[y * cw + x]) k2[j * cw + i] = 1; } } known = k2; }
      }
      if (known && EXP) for (let j = 0; j < ch; j++) for (let i = 0; i < cw; i++) if (!known[j * cw + i] && expAt(x0 + (i + 0.5) * cr, z0 + (j + 0.5) * cr)) known[j * cw + i] = 2; // aufgedeckt, ohne Pflanzen in der Nähe → Wasser
      fillGrid(c, cw, ch);
      if (known) for (let i = 0; i < c.length; i++) { if (!known[i]) c[i] = WATER - 25; else if (known[i] === 2) c[i] = WATER - 10; }
      const o = new Float32Array(w * h);
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
        const fx = Math.min(cw - 1.001, Math.max(0, (i * res) / cr - 0.5)), fy = Math.min(ch - 1.001, Math.max(0, (j * res) / cr - 0.5));
        const xa = Math.floor(fx), ya = Math.floor(fy), tx = fx - xa, ty = fy - ya;
        o[j * w + i] = (c[ya * cw + xa] * (1 - tx) + c[ya * cw + xa + 1] * tx) * (1 - ty) + (c[(ya + 1) * cw + xa] * (1 - tx) + c[(ya + 1) * cw + xa + 1] * tx) * ty;
      }
      const out = blur(o, w, h);
      if (known) { const m = new Uint8Array(w * h); for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const ci = Math.min(cw - 1, Math.floor(i * res / cr)), cj = Math.min(ch - 1, Math.floor(j * res / cr)); m[j * w + i] = known[cj * cw + ci]; } out.mask = m; }
      return out;
    }

    // Typtabelle (Bauteil-Maße)
    const SP = D.pieces;
    function makeChest(c) {
      let lab = '', bd = 2.2;
      signs.forEach((s) => { const d = Math.hypot(s.x - c.x, s.z - c.z); if (d < bd && Math.abs(s.y - c.y) < 2.5) { bd = d; lab = s.t; } });
      const items = {};
      // [Name, Anzahl, Item-Hash] – der Hash erlaubt dem Spiel-Mod die Zuordnung unabhängig von der Sprache
      const hs = {}; c.inv.forEach(([h, st, q]) => { const nm = (D.items[h] || 'Unbekannt (0x' + (h >>> 0).toString(16) + ')') + (q > 1 ? ' ★' + q : ''); items[nm] = (items[nm] || 0) + st; hs[nm] = h; });
      return { t: c.t, s: lab, o: c.c ? (ownerLabel[c.c] || 'Unbekannt') : '', x: r2(c.x), y: r2(c.y), z: r2(c.z), i: Object.entries(items).sort((a, b) => b[1] - a[1]).map(([n, k]) => [n, k, hs[n]]) };
    }
    function regionFor(cl, idx, W) {
      const M = 140;
      let x0 = Math.floor((cl.x0 - M) / 8) * 8, x1 = Math.ceil((cl.x1 + M) / 8) * 8, z0 = Math.floor((cl.z0 - M) / 8) * 8, z1 = Math.ceil((cl.z1 + M) / 8) * 8;
      const span = Math.max(x1 - x0, z1 - z0); let res = span > 1400 ? 8 : 4;
      if (W) { x0 = W.x0; x1 = W.x1; z0 = W.z0; z1 = W.z1; res = W.res; }
      const nx = Math.round((x1 - x0) / res) + 1, nz = Math.round((z1 - z0) / res) + 1;
      const hm = heightGrid(x0, z0, nx, nz, res, !!W);
      const h16 = new Int16Array(hm.length); for (let i = 0; i < hm.length; i++) h16[i] = Math.round(hm[i] * 10);
      const inR = (x, z) => x >= x0 && x <= x1 && z >= z0 && z <= z1;
      const types = [], tix = {}, owners = [], oix = {}, P = {};
      const bOwn = {}, tCount = {};
      pieces.forEach((p) => {
        if (!inR(p[0], p[2])) return;
        const name = PREF[p[4]] || ('0x' + (p[4] >>> 0).toString(16));
        const s = SP[name] || ['misc', 0.5, 0.5, 0.5, 0];
        if (tix[name] === undefined) { tix[name] = types.length; types.push([name, s[1], s[2], s[3], s[4]]); }
        const on = p[5] ? (ownerLabel[p[5]] || 'Unbekannt') : 'ohne Erbauer';
        if (oix[on] === undefined) { oix[on] = owners.length; owners.push(on); }
        (P[s[0]] || (P[s[0]] = [])).push(r2(p[0]), r2(p[1]), r2(p[2]), p[3], tix[name], oix[on]);
        if (p[5]) bOwn[on] = (bOwn[on] || 0) + 1;
        tCount[name] = (tCount[name] || 0) + 1;
      });
      const NATR = {}, natureModels = {};
      const CAP = W ? { rock: 15000, bush: 10000, log: 4000 } : null, cnt = {}, step = {};
      if (W) { nature.forEach((n) => (cnt[n[0]] = (cnt[n[0]] || 0) + 1)); Object.keys(cnt).forEach((k) => (step[k] = Math.max(1, Math.ceil(cnt[k] / (CAP[k] || 25000))))); }
      const seenN = {};
      nature.forEach((n) => { if (!inR(n[1], n[3])) return; if (W) { seenN[n[0]] = (seenN[n[0]] || 0) + 1; if (seenN[n[0]] % step[n[0]]) return; } const values = [r1(n[1]), r1(n[2]), r1(n[3]), Math.round(n[4]), r2(n[5])]; (NATR[n[0]] || (NATR[n[0]] = [])).push(...values); if (n[6]) { const entry = natureModels[n[6]] || (natureModels[n[6]] = { kind: n[0], instances: [] }); entry.instances.push(...values); } });
      const labels = [];
      portals.forEach((p) => { if (inR(p.x, p.z)) labels.push(['portal', p.tag, r1(p.x), r1(p.y + 4), r1(p.z)]); });
      beds.forEach((b) => { if (inR(b.x, b.z)) labels.push(['bed', b.n, r1(b.x), r1(b.y + 1.5), r1(b.z)]); });
      tombs.forEach((b) => { if (inR(b.x, b.z)) labels.push(['tomb', b.n, r1(b.x), r1(b.y + 1.5), r1(b.z)]); });
      const chests = [];
      conts.forEach((c) => { if (!inR(c.x, c.z)) return; if (!W) c.used = true; chests.push(makeChest(c)); });
      // Name der Basis: nächstes Portal oder Haupterbauer
      const cx = (cl.x0 + cl.x1) / 2, cz = (cl.z0 + cl.z1) / 2;
      let pn = '', pd = 1e9; portals.forEach((p) => { const d = Math.hypot(p.x - cx, p.z - cz); if (p.tag && d < pd && d < 250) { pd = d; pn = p.tag; } });
      const top = Object.entries(bOwn).sort((a, b) => b[1] - a[1]);
      const name = W ? 'Ganze Welt' : idx === 0 ? 'Hauptbasis' : (pn ? 'Basis „' + pn + '“' : 'Basis ' + (idx + 1));
      return {
        id: W ? 'world' : 'b' + idx, name, center: [Math.round(cx), Math.round(cz)], pieceCount: cl.n,
        bounds: [x0, x1, z0, z1], res, nx, nz, h: b64(new Uint8Array(h16.buffer)), mask: hm.mask ? b64(hm.mask) : undefined,
        types, owners, pieces: P, nature: NATR, natureModels, labels, chests,
        builders: top, topTypes: Object.entries(tCount).sort((a, b) => b[1] - a[1]).slice(0, 25)
      };
    }
    const regions = [];
    const maxRegions = opts.maxRegions || 40;
    clusters.slice(0, maxRegions).forEach((cl, i) => { regions.push(regionFor(cl, i)); prog('Basis ' + (i + 1) + '/' + Math.min(maxRegions, clusters.length), 0.72 + 0.2 * (i + 1) / Math.min(maxRegions, clusters.length)); });
    // Ganze erkundete Welt als ein 3D-Modell (16-m-Gelände, alle Bauteile, Natur ausgedünnt)
    let world3d = null;
    if (gn || EXP) {
      prog('Ganze Welt in 3D …', 0.92);
      let wx0 = 1e9, wx1 = -1e9, wz0 = 1e9, wz1 = -1e9;
      for (let i = 0; i < gn; i++) { const x = ground[i * 3], z = ground[i * 3 + 2]; if (x < wx0) wx0 = x; if (x > wx1) wx1 = x; if (z < wz0) wz0 = z; if (z > wz1) wz1 = z; }
      pieces.forEach((p) => { if (p[0] < wx0) wx0 = p[0]; if (p[0] > wx1) wx1 = p[0]; if (p[2] < wz0) wz0 = p[2]; if (p[2] > wz1) wz1 = p[2]; });
      const EB = EXP ? expBounds() : null; if (EB) { wx0 = Math.min(wx0, EB.x0); wx1 = Math.max(wx1, EB.x1); wz0 = Math.min(wz0, EB.z0); wz1 = Math.max(wz1, EB.z1); }
      const WR = opts.worldRes || 16;
      wx0 = Math.floor(wx0 / 64) * 64 - 64; wz0 = Math.floor(wz0 / 64) * 64 - 64; wx1 = Math.ceil(wx1 / 64) * 64 + 64; wz1 = Math.ceil(wz1 / 64) * 64 + 64;
      const nP = pieces.filter((p) => p[5]).length;
      world3d = regionFor({ x0: wx0, x1: wx1, z0: wz0, z1: wz1, n: nP }, -1, { x0: wx0, x1: wx1, z0: wz0, z1: wz1, res: WR });
    }
    // Kisten außerhalb erkannter Basen (Außenposten, Karren, Schiffe)
    const looseChests = conts.filter((c) => !c.used).map((c) => {
      const ch = makeChest(c);
      let pn = '', pd = 250; portals.forEach((p) => { const d = Math.hypot(p.x - c.x, p.z - c.z); if (p.tag && d < pd) { pd = d; pn = p.tag; } });
      ch.g = pn ? 'Außenposten bei Portal „' + pn + '“' : 'Außenposten (' + Math.round(c.x) + ', ' + Math.round(c.z) + ')';
      return ch;
    });

    // Übersichtskarte (64 m, erforschte Gebiete)
    prog('Übersichtskarte …', 0.94);
    let ox0 = 1e9, ox1 = -1e9, oz0 = 1e9, oz1 = -1e9;
    for (let i = 0; i < gn; i++) { const x = ground[i * 3], z = ground[i * 3 + 2]; if (x < ox0) ox0 = x; if (x > ox1) ox1 = x; if (z < oz0) oz0 = z; if (z > oz1) oz1 = z; }
    const OEB = EXP ? expBounds() : null; if (OEB) { ox0 = Math.min(ox0, OEB.x0); ox1 = Math.max(ox1, OEB.x1); oz0 = Math.min(oz0, OEB.z0); oz1 = Math.max(oz1, OEB.z1); }
    const OR = 32; ox0 = Math.floor(ox0 / OR) * OR - OR; oz0 = Math.floor(oz0 / OR) * OR - OR;
    const onx = Math.ceil((ox1 - ox0) / OR) + 2, onz = Math.ceil((oz1 - oz0) / OR) + 2;
    const ov = new Float32Array(onx * onz).fill(NaN);
    for (let i = 0; i < gn; i++) { const ci = Math.floor((ground[i * 3] - ox0) / OR), cj = Math.floor((ground[i * 3 + 2] - oz0) / OR); const k = cj * onx + ci; const y = ground[i * 3 + 1]; if (y < 400 && !(ov[k] <= y)) ov[k] = y; }
    const ou = new Uint8Array(onx * onz);
    for (let i = 0; i < ou.length; i++) ou[i] = isNaN(ov[i]) ? 0 : Math.max(1, Math.min(255, Math.round(ov[i] - WATER) + 100));
    if (EXP) { // aufgedeckt, aber ohne Bodenpunkte: aus Nachbarzellen (bis 3 Zellen) auffüllen, sonst Wasser
      const src = ou.slice();
      for (let j = 0; j < onz; j++) for (let i = 0; i < onx; i++) {
        const k = j * onx + i; if (src[k] || !expAt(ox0 + (i + 0.5) * OR, oz0 + (j + 0.5) * OR)) continue;
        let sum = 0, n = 0;
        for (let d = 1; d <= 3 && !n; d++) for (let dj = -d; dj <= d; dj++) for (let di = -d; di <= d; di++) { const a = i + di, b = j + dj; if (a < 0 || b < 0 || a >= onx || b >= onz) continue; const v = src[b * onx + a]; if (v) { sum += v; n++; } }
        ou[k] = n ? Math.round(sum / n) : 80;
      }
    }

    // Biom-Raster (64 m) über die Übersicht: exakt vom Mod, sonst aus Objekten geschätzt
    let biomes = null;
    {
      const bx0 = Math.floor(ox0 / BR) * BR, bz0 = Math.floor(oz0 / BR) * BR, bnx = Math.ceil((onx * OR + (ox0 - bx0)) / BR) + 1, bnz = Math.ceil((onz * OR + (oz0 - bz0)) / BR) + 1;
      const bb = new Uint8Array(bnx * bnz); let src = 'geschätzt';
      if (BIO) {
        src = 'Weltgenerator';
        for (let j = 0; j < bnz; j++) for (let i = 0; i < bnx; i++) { const gi = Math.floor((bx0 + (i + 0.5) * BR - BIO.x0) / BIO.res), gj = Math.floor((bz0 + (j + 0.5) * BR - BIO.z0) / BIO.res); if (gi >= 0 && gj >= 0 && gi < BIO.n && gj < BIO.n) bb[j * bnx + i] = BIO.b[gj * BIO.n + gi]; }
      } else {
        for (const [k, v] of bioVotes) { const [ci, cj] = k.split(',').map(Number); const i = ci - bx0 / BR, j = cj - bz0 / BR; if (i < 0 || j < 0 || i >= bnx || j >= bnz) continue; let best = 0; for (let t = 1; t < 10; t++) if (v[t] > v[best]) best = t; bb[j * bnx + i] = best; }
        for (let it = 0; it < 4; it++) { const c = bb.slice(); for (let j = 0; j < bnz; j++) for (let i = 0; i < bnx; i++) { if (c[j * bnx + i]) continue; const cnt = new Uint8Array(10); for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) { const a = i + di, b2 = j + dj; if (a >= 0 && b2 >= 0 && a < bnx && b2 < bnz && c[b2 * bnx + a]) cnt[c[b2 * bnx + a]]++; } let best = 0; for (let t = 1; t < 10; t++) if (cnt[t] > cnt[best]) best = t; if (best) bb[j * bnx + i] = best; } }
        for (let j = 0; j < bnz; j++) for (let i = 0; i < bnx; i++) { const k = j * bnx + i; if (bb[k]) continue; const z = bz0 + (j + 0.5) * BR; bb[k] = z < -6000 ? 6 : z > 7000 ? 7 : 1; } // grobe Lage: Süden Aschelande, Norden Tiefer Norden
      }
      biomes = { x0: bx0, z0: bz0, res: BR, nx: bnx, nz: bnz, b: b64(bb), src };
    }

    const strip = !!opts.stripIds;
    const snap = {
      format: 'vwelt', version: FORMAT_VERSION, created: new Date().toISOString(), generator: 'Valheim Welt-Viewer (inoffiziell)',
      world: { name: world.name, seed: world.seedName, worldGen: world.worldGen, modifiers: world.modifiers },
      crafted: (() => { // Wer hat welche (noch vorhandenen) Gegenstände hergestellt – aus Kisten, Ständern und vom Boden
        const by = {}; const add = ([h, st, , who]) => { if (!who) return; const nm = D.items[h] || ('Unbekannt (0x' + (h >>> 0).toString(16) + ')'); const e = by[who] || (by[who] = { n: 0, i: {} }); e.n += st; e.i[nm] = (e.i[nm] || 0) + st; };
        conts.forEach((c) => c.inv.forEach(add)); loose.forEach(add);
        return Object.entries(by).sort((a, b) => b[1].n - a[1].n).map(([who, e]) => [who, e.n, Object.entries(e.i).sort((a, b) => b[1] - a[1])]);
      })(),
      players: world.players.map((p) => strip ? { name: p.name } : { name: p.name, platform: p.platform }),
      characters: characters.map((c) => strip ? { name: c.name, account: c.account, pieces: c.pieces } : { name: c.name, account: c.account, steam: c.steam, pieces: c.pieces }),
      bosses: dbi.keys.filter((k) => k.startsWith('defeated_')).map((k) => k.slice(9)),
      globalKeys: dbi.keys, locations: dbi.locations, pins: tablePins, tableMap,
      portals: portals.map((p) => ({ tag: p.tag, x: Math.round(p.x), z: Math.round(p.z) })),
      // Grabsteine: Todeszeit = Spielstand-Zeit minus (Weltzeit jetzt − Weltzeit beim Tod); Weltzeit in .NET-Ticks (100 ns)
      tombs: tombs.map((b) => { const ref = opts.saveTime || Date.now(); const t = b.tod && dbi.netTime ? Math.round(ref - (dbi.netTime - b.tod / 1e7) * 1000) : null; return { n: b.n, x: Math.round(b.x), y: Math.round(b.y), z: Math.round(b.z), t: t && t > 1.5e12 && t <= ref + 6e4 ? t : null, items: b.items }; }),
      bases: regions.map((r) => ({ id: r.id, name: r.name, center: r.center, pieces: r.pieceCount, chests: r.chests.length, builders: r.builders.slice(0, 3) })),
      overview: { x0: ox0, z0: oz0, res: OR, nx: onx, nz: onz, h: b64(ou) },
      biomes,
      regions,
      world3d,
      looseChests,
      live,
      stats: { zdos: total, chunks: chunks.length, duplicatesSkipped: dupes, pieces: pieces.length, playerPieces: Object.values(builderCount).reduce((a, b) => a + b, 0), containers: conts.length, groundPoints: gn },
      warnings
    };
    prog('Fertig', 1);
    return snap;
  }

  const api = { convert, stable, parseFwl, parseDb, parseChunk, parseInv, FORMAT_VERSION };
  g.VWConvert = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof self !== 'undefined' ? self : globalThis);
