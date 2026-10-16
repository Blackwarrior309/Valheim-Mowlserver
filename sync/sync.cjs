#!/usr/bin/env node
/* Valheim-Sync: Welt vom (Nitrado-)FTP holen → in .vwelt umwandeln → auf GitHub (Pages) hochladen.
 * Nur Node.js ≥ 18 nötig, keine weiteren Pakete.
 *   node sync.cjs            einmal abgleichen
 *   node sync.cjs --loop     dauerhaft, Intervall aus der Konfiguration
 *   node sync.cjs --force    auch ohne Änderungen neu umwandeln und hochladen
 * Inoffiziell, nicht von Iron Gate.
 */
'use strict';
const fs = require('fs'), path = require('path'), net = require('net'), tls = require('tls'), zlib = require('zlib'), crypto = require('crypto');

const HERE = __dirname;
const ENV = process.env;
const CI = !!ENV.VS_FTP_HOST;                    // GitHub Actions: Konfiguration aus Secrets statt Datei
const DATA = ENV.VS_DATA ? path.resolve(ENV.VS_DATA) : HERE; // Cache + Zustand (in Actions per actions/cache erhalten)
const CONFIG = path.join(HERE, 'valheim-sync.config.json');
const STATE = path.join(DATA, '.valheim-sync-state.json');
const ARGS = process.argv.slice(2);
const LOOP = ARGS.includes('--loop'), FORCE = ARGS.includes('--force');

// Bibliotheken: im Paket unter ./lib, im Repo unter ../js und ../lib
function findLib(name) {
  for (const p of [path.join(HERE, 'lib', name), path.join(HERE, '..', 'js', name), path.join(HERE, '..', 'lib', name)]) if (fs.existsSync(p)) return p;
  throw new Error('Datei fehlt: ' + name + ' (lib-Ordner neben sync.cjs?)');
}
require(findLib('data.js'));
const { convert } = require(findLib('convert.js'));

const TEMPLATE = {
  _hilfe: 'Felder ausfüllen, speichern, dann Valheim-Sync erneut starten. Anleitung: LIESMICH.txt',
  ftp: { host: 'z. B. ms1234.gamedata.io', port: 21, user: '', password: '', secure: false, remoteDir: 'auto', dumpPath: 'auto' },
  source: 'auto',
  world: '',
  github: { token: '', repo: 'benutzername/valheim-welt', branch: 'main', path: 'live/welt.vwelt' },
  stripSteamIds: true,
  saveShareHtml: true,
  intervalMinutes: 10
};

const LOGBUF = [];
const log = (...a) => { const l = [new Date().toISOString().slice(11, 19), ...a].join(' '); LOGBUF.push(l); console.log(new Date().toLocaleTimeString('de-DE'), ...a); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ======================= FTP-Client (passiv, optional TLS) =======================
class FTP {
  constructor(cfg) { this.cfg = cfg; this.buf = ''; this.waiters = []; this.lines = []; this.queue = []; }
  async connect() {
    const { host, port = 21 } = this.cfg;
    this.sock = await new Promise((res, rej) => { const s = net.connect(port, host, () => res(s)); s.once('error', rej); s.setTimeout(30000, () => s.destroy(new Error('Zeitüberschreitung (FTP)'))); });
    this.attach(this.sock);
    await this.expect(220);
    if (this.cfg.secure) {
      await this.cmd('AUTH TLS', 234);
      this.sock.removeAllListeners('data');
      this.sock = await new Promise((res, rej) => { const t = tls.connect({ socket: this.sock, servername: host, rejectUnauthorized: false }, () => res(t)); t.once('error', rej); });
      this.attach(this.sock);
      await this.cmd('PBSZ 0', 200); await this.cmd('PROT P', 200);
    }
    const u = await this.cmd('USER ' + this.cfg.user);
    if (u.code === 331) await this.cmd('PASS ' + this.cfg.password, 230); else if (u.code !== 230) throw new Error('FTP-Login abgelehnt: ' + u.text);
    await this.cmd('TYPE I', 200);
    const f = await this.cmd('FEAT'); this.mlsd = /MLSD/i.test(f.text);
  }
  attach(s) {
    s.setEncoding('utf8');
    s.on('data', (d) => {
      this.buf += d; let i;
      while ((i = this.buf.indexOf('\n')) >= 0) {
        const line = this.buf.slice(0, i).replace(/\r$/, ''); this.buf = this.buf.slice(i + 1);
        this.lines.push(line);
        const m = /^(\d{3}) /.exec(line);
        if (m && (!this.multi || this.multi === m[1])) { const text = this.lines.join('\n'); this.lines = []; this.multi = null; this.deliver({ code: +m[1], text }); }
        else if (/^\d{3}-/.test(line) && !this.multi) this.multi = line.slice(0, 3);
      }
    });
    s.on('error', (e) => this.deliver({ code: 0, text: e.message }));
    // Server trennt (z. B. Leerlauf-Zeitlimit): wartende Befehle sofort mit Fehler beenden statt ewig zu warten
    s.on('close', () => { this.closed = true; while (this.waiters.length) this.waiters.shift()({ code: 0, text: 'FTP-Verbindung vom Server getrennt' }); });
  }
  deliver(r) { const w = this.waiters.shift(); if (w) w(r); else this.queue.push(r); }
  read() { if (this.queue.length) return Promise.resolve(this.queue.shift()); if (this.closed) return Promise.resolve({ code: 0, text: 'FTP-Verbindung vom Server getrennt' }); return new Promise((r) => this.waiters.push(r)); }
  async expect(code) { const r = await this.read(); if (code && r.code !== code) throw new Error(`FTP: erwartet ${code}, erhalten ${r.code} ${r.text}`); return r; }
  async cmd(c, code) { this.sock.write(c + '\r\n'); const r = await this.read(); if (code && r.code !== code) throw new Error(`FTP „${c.startsWith('PASS') ? 'PASS ***' : c}“: ${r.code} ${r.text}`); return r; }
  async dataCmd(c) {
    const p = await this.cmd('PASV', 227);
    const m = /(\d+),(\d+),(\d+),(\d+),(\d+),(\d+)/.exec(p.text); if (!m) throw new Error('PASV nicht verstanden: ' + p.text);
    const port = +m[5] * 256 + +m[6];
    let ds = await new Promise((res, rej) => { const s = net.connect(port, this.cfg.host, () => res(s)); s.once('error', rej); s.setTimeout(60000, () => s.destroy(new Error('Zeitüberschreitung (Daten)'))); });
    if (this.cfg.secure) ds = await new Promise((res, rej) => { const t = tls.connect({ socket: ds, servername: this.cfg.host, session: this.sock.getSession && this.sock.getSession(), rejectUnauthorized: false }, () => res(t)); t.once('error', rej); });
    const chunks = []; const done = new Promise((res, rej) => { ds.on('data', (d) => chunks.push(d)); ds.on('end', res); ds.on('close', res); ds.on('error', rej); });
    this.sock.write(c + '\r\n');
    const pre = await this.read(); if (pre.code !== 150 && pre.code !== 125) { ds.destroy(); throw new Error(`FTP „${c}“: ${pre.code} ${pre.text}`); }
    await done; const fin = await this.read(); if (fin.code !== 226 && fin.code !== 250) throw new Error(`FTP „${c}“: ${fin.code} ${fin.text}`);
    return Buffer.concat(chunks);
  }
  async list(dir) {
    const out = [];
    if (this.mlsd) {
      try {
        const txt = (await this.dataCmd('MLSD ' + dir)).toString('utf8');
        for (const l of txt.split(/\r?\n/)) {
          if (!l.trim()) continue; const sp = l.indexOf(' '); const facts = {}; l.slice(0, sp).split(';').forEach((f) => { const [k, v] = f.split('='); if (k) facts[k.toLowerCase()] = v; });
          const name = l.slice(sp + 1); if (name === '.' || name === '..' || facts.type === 'cdir' || facts.type === 'pdir') continue;
          out.push({ name, dir: facts.type === 'dir', size: +(facts.size || 0), mod: facts.modify || '' });
        }
        return out;
      } catch (e) { if (/: 50\d /.test(e.message)) this.mlsd = false; else throw e; }
    }
    const txt = (await this.dataCmd('LIST ' + dir)).toString('utf8');
    for (const l of txt.split(/\r?\n/)) {
      if (!l.trim() || /^total/.test(l)) continue;
      let m = /^([d\-l])\S+\s+\d+\s+\S+\s+\S+\s+(\d+)\s+(\w{3}\s+\d+\s+[\d:]+)\s+(.+)$/.exec(l);
      if (m) { if (m[4] === '.' || m[4] === '..') continue; out.push({ name: m[4].replace(/ -> .*$/, ''), dir: m[1] === 'd', size: +m[2], mod: m[3] }); continue; }
      m = /^(\d\d-\d\d-\d\d\s+\d\d:\d\d[AP]M)\s+(<DIR>|\d+)\s+(.+)$/.exec(l);
      if (m) out.push({ name: m[3], dir: m[2] === '<DIR>', size: m[2] === '<DIR>' ? 0 : +m[2], mod: m[1] });
    }
    return out;
  }
  get(file) { return this.dataCmd('RETR ' + file); }
  close() { try { this.sock.write('QUIT\r\n'); this.sock.end(); } catch (e) { } }
}
const join = (a, b) => (a.endsWith('/') ? a : a + '/') + b;

// Weltordner auf dem Server suchen (Ordner mit .fwl2)
async function findWorldDir(ftp, world) {
  const queue = [['/', 0]], seen = new Set(); const hits = [];
  const SKIP = /^(\.|proc|sys|dev|lib|bin|usr|etc|var|tmp|steamapps|Steam|steamcmd|valheim_server_Data|BepInEx|MonoBleedingEdge|logs?|backups?)$/i;
  let visited = 0, inWorlds = false;
  while (queue.length && visited < 400) {
    const [dir, depth] = queue.shift(); if (seen.has(dir)) continue; seen.add(dir); visited++;
    if (inWorlds && !/worlds_local/i.test(dir)) continue;          // nach dem ersten worlds_local nur noch dort weitersuchen
    let items; try { items = await ftp.list(dir); } catch (e) { continue; }
    const fwl = items.filter((i) => !i.dir && /\.fwl2?$/i.test(i.name) && !/backup|\.old$/i.test(i.name));
    if (fwl.length) {
      const db = (w) => items.find((i) => i.name === w + '.db2' || i.name === w + '.db');
      const ws = [];
      for (const w of fwl.map((f) => f.name.replace(/\.fwl2?$/i, ''))) {
        let size = db(w) ? db(w).size : 0;                     // Valheim 1.0: der Großteil steckt in den .chunk-Dateien im Unterordner
        if (items.some((i) => i.dir && i.name === w)) { try { (await ftp.list(join(dir, w))).forEach((i) => { if (!i.dir) size += i.size || 0; }); } catch (e) { } }
        ws.push({ w, size, mod: db(w) ? db(w).mod : '' });
      }
      ws.sort((a, b) => b.size - a.size || String(b.mod).localeCompare(String(a.mod)));
      hits.push({ dir, worlds: ws.map((x) => x.w), size: ws[0].size });
      if (/worlds_local/i.test(dir)) inWorlds = true;
    }
    if (depth < 7) items.filter((i) => i.dir && !/backup/i.test(i.name) && !(SKIP.test(i.name) && !/^\.config$/i.test(i.name))).forEach((i) => queue.push([join(dir, i.name), depth + 1])); // Sicherungsordner (…_backup_auto-…) nie nehmen
    // .config/unity3d/... und worlds_local bevorzugen
    queue.sort((a, b) => (/config|unity3d|IronGate|Valheim|worlds/i.test(b[0]) ? 1 : 0) - (/config|unity3d|IronGate|Valheim|worlds/i.test(a[0]) ? 1 : 0));
  }
  if (!hits.length) throw new Error('Kein Weltordner (.fwl2) auf dem FTP gefunden. Bitte "remoteDir" in der Konfiguration eintragen.');
  hits.forEach((h) => log('  Weltordner:', h.dir, '→', h.worlds.join(', '), '(' + (h.size / 1e6).toFixed(1) + ' MB)'));
  const pool = hits.some((h) => /worlds_local/i.test(h.dir)) ? hits.filter((h) => /worlds_local/i.test(h.dir)) : hits;
  const want = world && pool.find((h) => h.worlds.includes(world) || h.dir.split('/').pop() === world);
  const pref = want || pool.slice().sort((a, b) => b.size - a.size)[0];
  if (want && !pref.worlds.includes(world)) pref.picked = pref.worlds[0];
  return pref;
}


// Einmalig: Aufbau des Weltordners (Namen, Größen, Zeiten) in den Verlauf schreiben – zeigt, welche älteren Stände/Backups es gibt
async function scanWorldDir(cfg) {
  const state = loadJson(STATE, {}); const ftp = new FTP(cfg.ftp); await ftp.connect();
  const lines = [];
  try {
    const dir = state.remoteDir || (await findWorldDir(ftp, cfg.world)).dir;
    const parent = dir.replace(/\/[^/]*$/, '') || '/';
    async function walk(d, depth) {
      let items; try { items = await ftp.list(d); } catch (e) { lines.push(d + ' (nicht lesbar)'); return; }
      const pad = '  '.repeat(depth), files = items.filter((x) => !x.dir), dirs = items.filter((x) => x.dir);
      if (depth > 0 && files.length > 8) lines.push(pad + '… ' + files.length + ' Dateien (' + (files.reduce((a, x) => a + (x.size || 0), 0) / 1e6).toFixed(1) + ' MB), z. B. ' + files.slice(0, 2).map((x) => x.name + ' ' + x.mod).join(', '));
      else files.forEach((it) => lines.push(pad + '    ' + it.name + '  ' + it.size + '  ' + it.mod));
      for (const it of dirs) { if (lines.length > 600) return; lines.push(pad + '[D] ' + it.name + '  ' + it.mod); if (depth < 2) await walk(join(d, it.name), depth + 1); }
    }
    lines.push('Weltordner: ' + dir); await walk(dir, 0);
    if (parent !== dir) { lines.push('', 'Darüber: ' + parent); (await ftp.list(parent)).forEach((it) => lines.push((it.dir ? '[D] ' : '    ') + it.name + (it.dir ? '' : '  ' + it.size) + '  ' + it.mod)); }
  } finally { ftp.close(); }
  fs.mkdirSync(cfg.historyDir, { recursive: true });
  fs.writeFileSync(path.join(cfg.historyDir, 'scan.txt'), lines.join('\n') + '\n');
  log('Scan des Weltordners gespeichert (' + lines.length + ' Zeilen).');
}

// Spuren (spuren-JJJJMMTT.csv) und Tode (tode.csv) vom Server-Mod in den Verlauf übernehmen.
// Spuren werden je Tag zu einem 16-m-Raster pro Spieler zusammengefasst (spuren/<Tag>.json), die Rohdaten bleiben nur auf dem Server.
async function importTracks(cfg) {
  const state = loadJson(STATE, {}); if (!state.dumpPath) return false;
  const dir = path.posix.dirname(state.dumpPath); const store = require('./history-store.cjs');
  const ftp = new FTP(cfg.ftp); await ftp.connect(); let any = false;
  try {
    const items = (await ftp.list(dir)).filter((i) => !i.dir && (/^spuren-\d{8}\.csv$/.test(i.name) || i.name === 'tode.csv'));
    state.trackSigs = state.trackSigs || {};
    for (const it of items) {
      const sig = it.size + '|' + it.mod; if (state.trackSigs[it.name] === sig) continue;
      const txt = (await ftp.get(join(dir, it.name))).toString('utf8');
      if (it.name === 'tode.csv') {
        const tombs = txt.split('\n').map((l) => l.split(';')).filter((a) => a.length >= 5).map((a) => ({ t: +a[0] * 1000, n: a[1], x: +a[2], y: +a[3], z: +a[4], items: 0 }));
        const n = store.recordDeaths(cfg.historyDir, { tombs }); if (n) { any = true; log('Tode: ' + n + ' neue'); }
      } else {
        const day = it.name.slice(7, 15), C = 16, P = {}, last = {};
        for (const l of txt.split('\n')) {
          const a = l.split(';'); if (a.length < 4) continue; const t = +a[0], n = a[1], x = +a[2], z = +a[3]; if (!n || isNaN(x)) continue;
          const p = P[n] || (P[n] = { n: 0, dist: 0, from: t, to: t, cells: {} }); p.n++; p.to = Math.max(p.to, t); p.from = Math.min(p.from, t);
          const k = Math.floor(x / C) + ',' + Math.floor(z / C); p.cells[k] = (p.cells[k] || 0) + 1;
          const q = last[n]; if (q && t - q.t < 120) { const d = Math.hypot(x - q.x, z - q.z); if (d < 400) p.dist += d; } last[n] = { t, x, z };
        }
        Object.values(P).forEach((p) => (p.dist = Math.round(p.dist)));
        const out = path.join(cfg.historyDir, 'spuren'); fs.mkdirSync(out, { recursive: true });
        const date = day.slice(0, 4) + '-' + day.slice(4, 6) + '-' + day.slice(6, 8);
        fs.writeFileSync(path.join(out, date + '.json'), JSON.stringify({ date, cell: C, players: P }));
        const idxF = path.join(out, 'index.json'); let idx = []; try { idx = JSON.parse(fs.readFileSync(idxF, 'utf8')); } catch (e) { }
        if (!idx.includes(date)) { idx.push(date); idx.sort(); } fs.writeFileSync(idxF, JSON.stringify(idx));
        any = true; log('Spuren ' + date + ': ' + Object.keys(P).length + ' Spieler');
      }
      state.trackSigs[it.name] = sig;
    }
  } finally { ftp.close(); }
  fs.writeFileSync(STATE, JSON.stringify(state, null, 1));
  return any;
}

// Valheims eigene Sicherungen (<Welt>_backup_auto-JJJJMMTT-hhmmss neben dem Weltordner) in den Bau-Verlauf einsortieren.
// Jede Sicherung wird nur einmal geholt (Liste „imported“ in index.json).
async function importBackups(cfg) {
  const state = loadJson(STATE, {});
  const store = require('./history-store.cjs');
  const idxPath = path.join(cfg.historyDir, 'index.json');
  const done = new Set((store.loadIndex(cfg.historyDir).imported) || []);
  const ftp = new FTP(cfg.ftp); await ftp.connect(); let any = false;
  try {
    const wdir = state.remoteDir || (await findWorldDir(ftp, cfg.world)).dir;
    const parent = wdir.replace(/\/[^/]*$/, '') || '/';
    const items = await ftp.list(parent);
    const MON = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
    const cands = items.map((it) => ({ it, m: /_backup_auto-(\d{4})(\d\d)(\d\d)-(\d\d)(\d\d)(\d\d)$/.exec(it.name) })).filter((x) => x.m && !done.has(x.it.name));
    for (const { it, m } of cands.slice(0, 6)) {
      // Name = Ortszeit des Servers; Zeitzone über das (UTC-)Änderungsdatum des Ordners bestimmen
      let t = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]);
      const mm = /^(\w{3})\s+(\d+)\s+(\d\d):(\d\d)$/.exec(String(it.mod).trim()) || /^(\d{4})(\d\d)(\d\d)(\d\d)(\d\d)/.exec(String(it.mod));
      if (mm) { const tm = mm[1].length === 4 ? Date.UTC(+mm[1], +mm[2] - 1, +mm[3], +mm[4], +mm[5]) : Date.UTC(+m[1], MON[mm[1]], +mm[2], +mm[3], +mm[4]); const h = Math.round((t - tm) / 3600e3); if (Math.abs(h) <= 14) t -= h * 3600e3; }
      log('Sicherung', it.name, '…');
      const files = [];
      async function walk(d, depth) { for (const x of await ftp.list(d)) { const p = join(d, x.name); if (x.dir) { if (depth < 3) await walk(p, depth + 1); } else files.push({ name: p.slice(join(parent, it.name).length + 1), data: new Uint8Array(await ftp.get(p)) }); } }
      if (it.dir) await walk(join(parent, it.name), 0); else continue;
      // nur den neuesten Spielstand der Sicherung behalten
      const gens = [...new Set(files.map((f) => (/(?:^|\/)(_main\.\d+)\./.exec(f.name) || [])[1]).filter(Boolean))].sort((a, b) => +b.split('.')[1] - +a.split('.')[1]);
      const use = gens.length > 1 ? files.filter((f) => !/(?:^|\/)_main\.\d+\./.test(f.name) || f.name.includes(gens[0] + '.')) : files;
      let r;
      try {
        const snap = convert(use, { gunzip: (u) => new Uint8Array(zlib.gunzipSync(u)), stripIds: true, saveTime: t });
        r = store.insertSnapshot(cfg.historyDir, snap, t, { log, label: 'backup' }); store.recordDeaths(cfg.historyDir, snap, t);
      } catch (e) { r = { changed: false, reason: e.message }; }
      log('  →', r.changed ? `+${r.add} / −${r.del} Teile` : 'übersprungen (' + r.reason + ')');
      const idx = store.loadIndex(cfg.historyDir); idx.imported = [...new Set([...(idx.imported || []), it.name])];
      fs.mkdirSync(cfg.historyDir, { recursive: true }); fs.writeFileSync(idxPath, JSON.stringify(idx)); any = true;
    }
  } finally { ftp.close(); }
  return any;
}

// Live-Dump des Mods (welt.vwdump) auf dem Server suchen
async function findDump(ftp) {
  const queue = [['/', 0]], seen = new Set(); let visited = 0;
  const PRIO = /BepInEx|config|ValheimWeltLive/i, SKIP = /^(proc|sys|dev|lib|bin|usr|etc|tmp|steamapps|steamcmd|MonoBleedingEdge|valheim_server_Data|plugins|cache|logs?)$/i;
  while (queue.length && visited < 80) {
    const [dir, depth] = queue.shift(); if (seen.has(dir)) continue; seen.add(dir); visited++;
    let items; try { items = await ftp.list(dir); } catch (e) { continue; }
    const hit = items.find((i) => !i.dir && /\.vwdump$/i.test(i.name)); if (hit) return { path: join(dir, hit.name), size: hit.size, mod: hit.mod };
    if (depth < 6) items.filter((i) => i.dir && !SKIP.test(i.name) && !/worlds/i.test(i.name)).forEach((i) => queue.push([join(dir, i.name), depth + 1]));
    queue.sort((a, b) => (PRIO.test(b[0]) ? 1 : 0) - (PRIO.test(a[0]) ? 1 : 0));
  }
  return null;
}

// Dateien einer Welt rekursiv auflisten (andere Welten / Backups überspringen)
async function listWorldFiles(ftp, dir, world, others) {
  const out = [];
  async function walk(d, depth) {
    const items = await ftp.list(d);
    for (const it of items) {
      const p = join(d, it.name);
      if (/backup|\.old$|\.tmp$/i.test(it.name)) continue;
      if (others.some((o) => o !== world && it.name.startsWith(o + '.'))) continue;
      if (it.dir) { if (depth < 3) await walk(p, depth + 1); continue; }
      if (it.name.startsWith(world + '.') || /\.chunk$|\.chunk \d+$/i.test(it.name) || depth > 0 && /\.(db2|fwl2)$/i.test(it.name)) out.push({ path: p, rel: p.slice(dir.length).replace(/^\//, ''), size: it.size, mod: it.mod });
    }
  }
  await walk(dir, 0);
  return out;
}

// ======================= GitHub =======================
async function gh(cfg, method, url, body) {
  const base = process.env.VS_GITHUB_API || 'https://api.github.com';
  const r = await fetch(base + url, { method, headers: { Authorization: 'Bearer ' + cfg.token, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'valheim-sync', 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const txt = await r.text(); let j = null; try { j = JSON.parse(txt); } catch (e) { }
  return { status: r.status, json: j, text: txt };
}
async function uploadGithub(cfg, buf, message) {
  const [owner, repo] = (cfg.repo || '').split('/'); if (!owner || !repo) throw new Error('github.repo muss "benutzer/repo" sein.');
  const p = (cfg.path || 'live/welt.vwelt').split('/').map(encodeURIComponent).join('/');
  const branch = cfg.branch || 'main';
  const cur = await gh(cfg, 'GET', `/repos/${owner}/${repo}/contents/${p}?ref=${encodeURIComponent(branch)}`);
  if (cur.status === 401 || cur.status === 403) throw new Error('GitHub: Token ungültig oder ohne Rechte (Contents: Read and write nötig).');
  if (cur.status !== 200 && cur.status !== 404) throw new Error('GitHub GET ' + cur.status + ': ' + cur.text.slice(0, 200));
  const sha = cur.status === 200 && cur.json ? cur.json.sha : undefined;
  const put = await gh(cfg, 'PUT', `/repos/${owner}/${repo}/contents/${p}`, { message, content: buf.toString('base64'), branch, sha });
  if (put.status !== 200 && put.status !== 201) throw new Error('GitHub-Upload fehlgeschlagen (' + put.status + '): ' + put.text.slice(0, 300));
  return put.json && put.json.commit ? put.json.commit.html_url : '';
}

// ======================= Teilen-HTML =======================
function shareHtml(snap, gz) {
  const rd = (n) => fs.readFileSync(findLib(n), 'utf8').replace(/<\/script/gi, '<\\/script');
  const title = String(snap.world.name || 'Valheim-Welt').replace(/</g, '&lt;') + ' – Valheim-Welt';
  return `<!doctype html>
<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>
<style>html,body{margin:0;height:100%;background:#12171b}#boot{color:#ece6d8;font:15px/1.5 system-ui,sans-serif;padding:24px;max-width:560px}#boot .h{opacity:0;animation:vwshow 0s 8s forwards;color:#c9c2b4;font-size:14px;margin-top:14px}@keyframes vwshow{to{opacity:1}}</style></head><body><div id="app"><div id="boot"><b>Lade Welt …</b><div class="h">Bleibt diese Meldung stehen? Dann wurde die Datei in einer Vorschau ohne Skripte geöffnet. Bitte herunterladen und in Chrome, Edge, Firefox oder Safari öffnen.</div></div></div>
<script>${(() => { try { return rd('i18n.js'); } catch (e) { return ''; } })()}</script><script>${rd('three.min.js')}</script><script>${rd('fflate.min.js')}</script><script>${rd('data.js')}</script><script>${(() => { try { return rd('recipes.js'); } catch (e) { return ''; } })()}</script><script>${rd('viewer.js')}</script>
<script id="vwelt" type="application/octet-stream">${gz.toString('base64')}</script>
<script>(function(){var b=document.getElementById('vwelt').textContent.trim(),s=atob(b),u=new Uint8Array(s.length);for(var i=0;i<s.length;i++)u[i]=s.charCodeAt(i);var snap=JSON.parse(fflate.strFromU8(fflate.gunzipSync(u)));VWViewer.mount(document.getElementById('app'),snap,{status:'Geteilte Welt · Stand '+new Date(snap.created).toLocaleDateString(window.VW_I18N?VW_I18N.locale():'de-DE')});})();</script>
</body></html>`;
}

// ======================= Ablauf =======================
function loadJson(p, d) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { return d; } }
async function runOnce(cfg) {
  const state = loadJson(STATE, {});
  const ftpc = cfg.ftp || {};
  if (!ftpc.host || /z\. B\./.test(ftpc.host) || !ftpc.user) throw Object.assign(new Error('FTP-Daten fehlen in valheim-sync.config.json'), { config: true });
  log('Verbinde mit FTP', ftpc.host + ' …');
  const ftp = new FTP(ftpc); await ftp.connect();
  try {
    const source = cfg.source || 'auto';
    // 1) Live-Dump des Mods bevorzugen (aktueller als der Spielstand)
    if (source !== 'save' && ftpc.dumpPath !== '') {
      let dump = null;
      if (ftpc.dumpPath && ftpc.dumpPath !== 'auto') { const d = path.posix.dirname(ftpc.dumpPath), n = path.posix.basename(ftpc.dumpPath); const it = (await ftp.list(d)).find((i) => i.name === n); if (it) dump = { path: ftpc.dumpPath, size: it.size, mod: it.mod }; }
      else if (state.dumpPath) { const d = path.posix.dirname(state.dumpPath), n = path.posix.basename(state.dumpPath); try { const it = (await ftp.list(d)).find((i) => i.name === n); if (it) dump = { path: state.dumpPath, size: it.size, mod: it.mod }; } catch (e) { } }
      if (!dump && !(state.noDumpAt && Date.now() - state.noDumpAt < 6 * 3600e3)) { log('Suche Live-Dump des Mods …'); dump = await findDump(ftp); if (!dump) { state.noDumpAt = Date.now(); log('Kein Mod-Dump gefunden – nutze den Spielstand.'); } else delete state.noDumpAt; }
      if (dump) {
        state.dumpPath = dump.path; const sig = dump.size + '|' + dump.mod;
        if (state.dumpSig !== sig) state.dumpSeenAt = Date.now();
        // Mod schreibt alle paar Minuten neu – bleibt die Datei lange gleich, läuft der Mod nicht mehr → Spielstand nehmen
        if (state.dumpSig === sig && state.dumpSeenAt && Date.now() - state.dumpSeenAt > 45 * 60e3) { log('Mod-Dump seit über 45 Min. unverändert (Mod aus?) – nutze den Spielstand.'); dump = null; }
        else {
          if (!FORCE && state.dumpSig === sig && state.lastUpload) { log('Mod-Dump unverändert.'); fs.writeFileSync(STATE, JSON.stringify(state, null, 1)); return; }
          log('Lade Mod-Dump', dump.path, '(' + (dump.size / 1e6).toFixed(1) + ' MB) …');
          const data = await ftp.get(dump.path); ftp.close();
          state.dumpSig = sig; fs.writeFileSync(STATE, JSON.stringify(state, null, 1));
          await publish(cfg, state, [{ name: 'welt.vwdump', data: new Uint8Array(data) }], cfg.world || 'welt');
          return;
        }
      }
      if (source === 'mod' && !dump) throw new Error('Kein Mod-Dump (welt.vwdump) auf dem Server gefunden. Ist "WriteDumpFile = true" in der Mod-Konfiguration gesetzt?');
    }
    // 2) Spielstand (.fwl2/.db2/.chunk)
    let dir = ftpc.remoteDir && ftpc.remoteDir !== 'auto' ? ftpc.remoteDir : state.remoteDir;
    let worlds = state.worlds || [];
    if (state.v !== 2) { ['remoteDir', 'worlds', 'files', 'lastUpload'].forEach((k) => delete state[k]); state.v = 2; if (!(ftpc.remoteDir && ftpc.remoteDir !== 'auto')) dir = undefined; worlds = []; }
    let picked = null;
    if (!dir) { log('Suche Weltordner auf dem Server …'); const f = await findWorldDir(ftp, cfg.world); dir = f.dir; worlds = f.worlds; picked = f.picked || null; state.picked = picked; log('Gewählt:', dir, '→', worlds.join(', ')); }
    else { picked = null; worlds = (await ftp.list(dir)).filter((i) => !i.dir && /\.fwl2?$/i.test(i.name) && !/backup|\.old$/i.test(i.name)).map((i) => i.name.replace(/\.fwl2?$/i, '')); } // jedes Mal neu: Valheim nummeriert Spielstände beim Speichern hoch
    // Valheim 1.0 speichert als _main.<Nummer> – immer die höchste Nummer (neuester Stand) nehmen
    const gen = worlds.filter((w) => /^_main\.\d+$/.test(w)).sort((a, b) => +b.split('.')[1] - +a.split('.')[1]);
    const world = (cfg.world && worlds.includes(cfg.world) ? cfg.world : null) || gen[0] || picked || worlds[0];
    if (!world) throw new Error('Keine Welt in ' + dir + ' gefunden.');
    if (!cfg.world && worlds.length > 1) log('Mehrere Welten gefunden (' + worlds.join(', ') + '), nehme die größte: „' + world + '“. Andere mit "world" in der Konfiguration wählen.');
    state.remoteDir = dir; state.worlds = worlds;
    const files = await listWorldFiles(ftp, dir, world, worlds);
    if (!files.some((f) => /\.fwl2?$/i.test(f.rel))) throw new Error('Welt „' + world + '“ nicht vollständig gefunden in ' + dir);
    const cache = path.join(DATA, 'welt-cache', world.replace(/[^\w.-]+/g, '_'));
    fs.mkdirSync(cache, { recursive: true });
    // ältere Spielstände (_main.<alte Nummer>) aus dem Zwischenspeicher entfernen
    for (const d of fs.readdirSync(path.dirname(cache))) if (d !== path.basename(cache)) try { fs.rmSync(path.join(path.dirname(cache), d), { recursive: true, force: true }); } catch (e) { }
    const old = state.files || {}; const now = {}; let changed = 0, bytes = 0;
    for (const f of files) {
      const key = f.rel, sig = f.size + '|' + f.mod, local = path.join(cache, f.rel);
      now[key] = sig;
      if (!FORCE && old[key] === sig && fs.existsSync(local)) continue;
      fs.mkdirSync(path.dirname(local), { recursive: true });
      const data = await ftp.get(f.path); fs.writeFileSync(local, data); changed++; bytes += data.length;
    }
    // gelöschte Dateien lokal entfernen
    Object.keys(old).forEach((k) => { if (!now[k]) try { fs.unlinkSync(path.join(cache, k)); } catch (e) { } });
    state.files = now;
    log(`${files.length} Dateien auf dem Server, ${changed} geladen (${(bytes / 1e6).toFixed(1)} MB).`);
    { const db = files.filter((f) => /\.db2?$/i.test(f.rel)).sort((a, b) => b.size - a.size)[0]; if (db) log('Welt zuletzt gespeichert:', db.rel, String(db.mod)); }
    fs.writeFileSync(STATE, JSON.stringify(state, null, 1));
    if (!changed && !FORCE && state.lastUpload) { log('Keine Änderungen seit dem letzten Abgleich.'); return; }
    ftp.close();

    const list = []; (function walk(d) { for (const n of fs.readdirSync(d)) { const p = path.join(d, n); if (fs.statSync(p).isDirectory()) walk(p); else list.push({ name: path.relative(cache, p), data: new Uint8Array(fs.readFileSync(p)) }); } })(cache);
    await publish(cfg, state, list, world);
  } finally { ftp.close(); }
}


async function publish(cfg, state, list, world) {
    log('Wandle um …');
    const snap = convert(list, { gunzip: (u) => new Uint8Array(zlib.gunzipSync(u)), stripIds: cfg.stripSteamIds !== false });
    const gz = zlib.gzipSync(Buffer.from(JSON.stringify(snap)), { level: 9 });
    const outDir = path.join(DATA, 'ausgabe'); fs.mkdirSync(outDir, { recursive: true });
    const base = (snap.world.name || world).replace(/[^\w.-]+/g, '_');
    fs.writeFileSync(path.join(outDir, base + '.vwelt'), gz);
    if (cfg.saveShareHtml !== false) fs.writeFileSync(path.join(outDir, base + '.html'), shareHtml(snap, gz));
    if (cfg.outFile) { fs.mkdirSync(path.dirname(cfg.outFile), { recursive: true }); fs.writeFileSync(cfg.outFile, gz); log('Gespeichert als', cfg.outFile); }
    changedOut = true;
    log(`Umgewandelt: ${snap.stats.zdos.toLocaleString('de-DE')} Objekte, ${snap.bases.length} Basen, ${(gz.length / 1e6).toFixed(2)} MB → Ordner „ausgabe“.`);
    snap.warnings.forEach((w) => log('Hinweis:', w));
    if (cfg.historyDir) {
      try {
        const r = require('./history-store.cjs').insertSnapshot(cfg.historyDir, snap, new Date(snap.created).getTime(), { log, label: 'live' });
        if (r.changed) historyChanged = true; else log('Verlauf: nichts Neues (' + r.reason + ')');
        const nd = require('./history-store.cjs').recordDeaths(cfg.historyDir, snap); if (nd) { historyChanged = true; log('Tode: ' + nd + ' neue Grabsteine'); }
      } catch (e) { log('Verlauf: Fehler –', e.message); }
    }
    const g = cfg.github || {};
    if (g.token && g.repo && !/benutzername/.test(g.repo)) {
      log('Lade auf GitHub hoch (' + g.repo + '/' + (g.path || 'live/welt.vwelt') + ') …');
      const url = await uploadGithub(g, gz, 'Live-Update ' + (snap.world.name || world) + ' ' + new Date().toISOString().slice(0, 16).replace('T', ' '));
      state.lastUpload = new Date().toISOString(); fs.writeFileSync(STATE, JSON.stringify(state, null, 1));
      log('Fertig. Die Seite zeigt den neuen Stand nach ca. 1 Minute.' + (url ? ' Commit: ' + url : ''));
    } else { state.lastUpload = state.lastUpload || 'lokal'; fs.writeFileSync(STATE, JSON.stringify(state, null, 1)); log('GitHub nicht eingerichtet – nur lokal gespeichert.'); }
}

let changedOut = false, historyChanged = false;
// Kurzprotokoll als Hinweis am Lauf (in der Actions-Übersicht sichtbar, ohne Zugangsdaten)
function summary(cfg, code) {
  try {
    const red = (x) => [cfg.ftp.host, cfg.ftp.user, cfg.ftp.password].filter(Boolean).reduce((t, v) => t.split(v).join('***'), x);
    const esc = (x) => x.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
    console.log('::' + (code ? 'error' : 'notice') + ' title=Abgleich::' + esc(red(LOGBUF.slice(-25).join('\n'))));
  } catch (e) { }
}
function envConfig() {
  const b = (v, d) => (v === undefined || v === '' ? d : /^(1|true|ja|yes)$/i.test(v));
  return {
    ftp: { host: ENV.VS_FTP_HOST, port: +ENV.VS_FTP_PORT || 21, user: ENV.VS_FTP_USER, password: ENV.VS_FTP_PASSWORD || '', secure: b(ENV.VS_FTP_SECURE, false), remoteDir: ENV.VS_FTP_DIR || 'auto', dumpPath: ENV.VS_DUMP_PATH === undefined ? 'auto' : ENV.VS_DUMP_PATH },
    source: ENV.VS_SOURCE || 'auto', world: ENV.VS_WORLD || '',
    github: {},                                   // kein API-Upload: der Workflow veröffentlicht die Seite selbst
    outFile: path.resolve(ENV.VS_OUT || 'live/welt.vwelt'),
    stripSteamIds: b(ENV.VS_STRIP_IDS, true), saveShareHtml: false, intervalMinutes: 10,
    historyDir: ENV.VS_HISTORY ? path.resolve(ENV.VS_HISTORY) : ''
  };
}

(async () => {
  console.log('Valheim-Sync (inoffiziell) – FTP → .vwelt → GitHub\n');
  if (CI) {
    fs.mkdirSync(DATA, { recursive: true });
    const cfg = envConfig(); let code = 0;
    const fatal = (e) => {
      log('ABBRUCH:', (e && e.stack) || e);
      try {
        if (cfg.historyDir) { const red = (x) => [cfg.ftp.host, cfg.ftp.user, cfg.ftp.password].filter(Boolean).reduce((t, v) => t.split(v).join('***'), x); fs.mkdirSync(cfg.historyDir, { recursive: true }); fs.writeFileSync(path.join(cfg.historyDir, 'fehler.txt'), red(new Date().toISOString() + '\n' + LOGBUF.join('\n')) + '\n'); }
        if (ENV.GITHUB_OUTPUT) fs.appendFileSync(ENV.GITHUB_OUTPUT, 'changed=' + changedOut + '\nhistory=' + (historyChanged || !!cfg.historyDir) + '\n');
      } catch (x) { }
      summary(cfg, 1);
      process.exit(1);
    };
    process.on('uncaughtException', fatal); process.on('unhandledRejection', fatal);
    process.on('beforeExit', () => fatal(new Error('Programm endete unerwartet (Warten auf eine Antwort, die nie kam)')));
    try { await runOnce(cfg); } catch (e) { log('FEHLER:', e.message); code = 1; }
    if (cfg.historyDir && !fs.existsSync(path.join(cfg.historyDir, 'scan.txt'))) { try { await scanWorldDir(cfg); historyChanged = true; } catch (e) { log('Scan:', e.message); } }
    if (cfg.historyDir) { try { if (await importTracks(cfg)) historyChanged = true; } catch (e) { log('Spuren/Tode: FEHLER', e.message); } }
    let impErr = false;
    // Server-Sicherungen nur auf Wunsch einsortieren (VS_IMPORT_BACKUPS=true) – der laufende Abgleich erfasst ohnehin jede Änderung
    if (cfg.historyDir && /^(1|true|ja|yes)$/i.test(ENV.VS_IMPORT_BACKUPS || '')) { try { if (await importBackups(cfg)) historyChanged = true; } catch (e) { impErr = true; log('Backups: FEHLER', e.message); } }
    // Fehler für die Fehlersuche in den Verlauf-Branch schreiben (ohne Zugangsdaten)
    // alte Fehlermeldung entfernen, sobald ein Lauf wieder klappt
    if (cfg.historyDir && !code && !impErr && fs.existsSync(path.join(cfg.historyDir, 'fehler.txt'))) { fs.unlinkSync(path.join(cfg.historyDir, 'fehler.txt')); historyChanged = true; }
    if (cfg.historyDir && (code || impErr)) {
      const red = (x) => [cfg.ftp.host, cfg.ftp.user, cfg.ftp.password].filter(Boolean).reduce((t, v) => t.split(v).join('***'), x);
      fs.mkdirSync(cfg.historyDir, { recursive: true }); fs.writeFileSync(path.join(cfg.historyDir, 'fehler.txt'), red(new Date().toISOString() + '\n' + LOGBUF.join('\n')) + '\n'); historyChanged = true;
    }
    if (ENV.GITHUB_OUTPUT) fs.appendFileSync(ENV.GITHUB_OUTPUT, 'changed=' + changedOut + '\nhistory=' + historyChanged + '\n');
    summary(cfg, code);
    process.exit(code);
  }
  if (!fs.existsSync(CONFIG)) {
    fs.writeFileSync(CONFIG, JSON.stringify(TEMPLATE, null, 2));
    console.log('Konfiguration angelegt: ' + CONFIG + '\nBitte FTP- und GitHub-Daten eintragen, speichern und neu starten.');
    process.exit(2);
  }
  const cfg = loadJson(CONFIG, null);
  if (!cfg) { console.log('valheim-sync.config.json ist kein gültiges JSON (Komma/Anführungszeichen prüfen).'); process.exit(2); }
  const every = Math.max(2, +cfg.intervalMinutes || 10);
  do {
    try { await runOnce(cfg); }
    catch (e) { log('FEHLER:', e.message); if (e.config) process.exit(2); if (!LOOP) process.exit(1); }
    if (LOOP) { log(`Nächster Abgleich in ${every} Minuten (Strg+C beendet).`); await sleep(every * 60000); }
  } while (LOOP);
})();
