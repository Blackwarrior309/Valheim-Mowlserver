#!/usr/bin/env node
/* Steam-Serverabfrage (A2S) ohne Mod: Spielerzahl und – falls der Server sie liefert – Namen und Spielzeit.
 * Port: aus /valheim/docker_start_server.sh (nur die Zahl wird gelesen, sonst nichts ausgegeben), Abfrage-Port = Spielport + 1.
 * Ausgabe: JSON auf stdout bzw. Datei (Argument), Zugangsdaten und IP werden nie ausgegeben. */
const dgram = require('dgram'), dns = require('dns').promises, fs = require('fs');
process.env.VS_SCAN_ONLY = '1';
const { FTP } = require('./sync.cjs');
const E = process.env;
function a2s(ip, port, payload, timeout = 3000) {
  return new Promise((res, rej) => {
    const s = dgram.createSocket('udp4'); const t = setTimeout(() => { s.close(); rej(new Error('keine Antwort')); }, timeout);
    s.on('message', (m) => { clearTimeout(t); s.close(); res(m); }); s.on('error', (e) => { clearTimeout(t); s.close(); rej(e); });
    s.send(payload, port, ip);
  });
}
const HDR = Buffer.from([0xff, 0xff, 0xff, 0xff]);
async function ask(ip, port, kind, timeout) {
  const base = kind === 'info' ? Buffer.concat([HDR, Buffer.from('TSource Engine Query\0', 'latin1')]) : Buffer.concat([HDR, Buffer.from([0x55])]);
  let ch = kind === 'info' ? Buffer.alloc(0) : Buffer.from([0xff, 0xff, 0xff, 0xff]);
  for (let i = 0; i < 3; i++) {
    const m = await a2s(ip, port, Buffer.concat([base, ch]), timeout);
    if (m[4] === 0x41) { ch = m.subarray(5, 9); continue; } // Challenge
    return m;
  }
  throw new Error('Challenge');
}
function cstr(b, o) { const e = b.indexOf(0, o); return [b.toString('utf8', o, e), e + 1]; }
(async () => {
  const out = { time: new Date().toISOString(), ok: false };
  try {
    let port = +E.VS_GAME_PORT || 0;
    if (!port) {
      const ftp = new FTP({ host: E.VS_FTP_HOST, port: +E.VS_FTP_PORT || 21, user: E.VS_FTP_USER, password: E.VS_FTP_PASSWORD || '', secure: /^(1|true|ja|yes)$/i.test(E.VS_FTP_SECURE || '') });
      await ftp.connect(); try { const t = (await ftp.get('/valheim/docker_start_server.sh')).toString('utf8'); const m = t.match(/-port[\s=]+"?(\d{2,5})/); if (m) port = +m[1]; else out.startScript = [...new Set(t.match(/(^|\s)-[a-zA-Z]+|\$\{?[A-Z_]+\}?/g) || [])].map((x) => x.trim()).join(' '); } finally { ftp.close(); }
    }
    const ip = (await dns.lookup(E.VS_GAME_HOST || E.VS_FTP_HOST)).address;
    let info = null, used = 0;
    const cand = port ? [port + 1, port] : [];
    if (!port) for (let p = 2456; p <= 2480; p++) cand.push(p); // Spielport unbekannt: übliche Valheim-Ports durchprobieren
    for (const qp of cand) { try { info = await ask(ip, qp, 'info', 1200); used = qp; out.queryPort = qp; break; } catch (e) { } }
    if (!info) throw new Error('Server antwortet nicht auf die Steam-Abfrage');
    let o = 6; let name, map, folder, game; [name, o] = cstr(info, o); [map, o] = cstr(info, o); [folder, o] = cstr(info, o); [game, o] = cstr(info, o); o += 2;
    out.players = info[o]; out.maxPlayers = info[o + 1]; out.name = name; out.ok = true;
    try {
      const pl = await ask(ip, used, 'players'); const n = pl[5]; let p = 6; out.list = [];
      for (let i = 0; i < n && p < pl.length; i++) { p++; let nm; [nm, p] = cstr(pl, p); p += 4; const dur = pl.readFloatLE(p); p += 4; out.list.push({ n: nm, s: Math.round(dur) }); }
    } catch (e) { out.listError = e.message; }
  } catch (e) { out.error = String(e.message || e).split(E.VS_FTP_HOST || '\u0000').join('***'); }
  const j = JSON.stringify(out);
  if (process.argv[2]) fs.writeFileSync(process.argv[2], j); console.log(j);
  const esc = (x) => x.replace(/%/g, '%25').replace(/\n/g, '%0A');
  console.log('::notice title=Steam-Abfrage::' + esc(out.ok ? `${out.name}: ${out.players}/${out.maxPlayers} online (Abfrage-Port ${out.queryPort})` + (out.list ? '\nListe: ' + (out.list.map((x) => (x.n || '(ohne Name)') + ' ' + Math.round(x.s / 60) + ' min').join(', ') || 'leer') : '\n' + (out.listError || '')) : 'Fehler: ' + out.error + (out.startScript ? '\nStartskript-Schalter: ' + out.startScript : '')));
})();
