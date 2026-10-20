#!/usr/bin/env node
/* Komplett-Backup des Valheim-Servers per FTP – nur lesen, nichts wird auf dem Server geändert.
 *   VS_FTP_HOST/PORT/USER/PASSWORD/SECURE  node sync/ftp-backup.cjs <Zielordner> [--alles]
 * Spieldateien des Servers (valheim_server_Data usw.) werden ohne --alles übersprungen.
 * Ausgabe nur: Anzahl, Größen, Ordner – keine Inhalte, keine Zugangsdaten, keine Steam-IDs. */
const fs = require('fs'), path = require('path');
process.env.VS_SCAN_ONLY = '1';
const { FTP } = require('./sync.cjs');
const E = process.env, out = process.argv[2], ALL = process.argv.includes('--alles');
if (!out) { console.error('Zielordner fehlt'); process.exit(1); }
const red = (x) => [E.VS_FTP_HOST, E.VS_FTP_USER, E.VS_FTP_PASSWORD].filter(Boolean).reduce((t, v) => t.split(v).join('***'), String(x)).replace(/\d{15,20}/g, '[ID]');
const GAME = /^(valheim_server_Data|MonoBleedingEdge|linux64|steamapps|steamcmd|D3D12|doorstop_libs|\.steam|Steam|steamclient)$/i;
(async () => {
  const ftp = new FTP({ host: E.VS_FTP_HOST, port: +E.VS_FTP_PORT || 21, user: E.VS_FTP_USER, password: E.VS_FTP_PASSWORD || '', secure: /^(1|true|ja|yes)$/i.test(E.VS_FTP_SECURE || '') });
  const S = { files: 0, bytes: 0, skipped: [], failed: [], worlds: [], dirs: new Map() };
  await ftp.connect();
  async function walk(d) {
    let items; try { items = await ftp.list(d); } catch (e) { S.failed.push(d + ' (Ordner)'); return; }
    for (const it of items) {
      if (it.name === '.' || it.name === '..') continue;
      const p = path.posix.join(d, it.name);
      if (it.dir) { if (!ALL && GAME.test(it.name)) { S.skipped.push(p); continue; } await walk(p); continue; }
      if (!ALL && d === '/' && /\.(exe|dll|so|pdb)$/i.test(it.name)) continue;
      try {
        const buf = await ftp.get(p); const local = path.join(out, ...p.split('/').filter(Boolean));
        fs.mkdirSync(path.dirname(local), { recursive: true }); fs.writeFileSync(local, buf);
        S.files++; S.bytes += buf.length; S.dirs.set(d, (S.dirs.get(d) || 0) + buf.length);
        if (/\.(db2?|fwl2?)$/i.test(it.name)) S.worlds.push(p + ' (' + (buf.length / 1e6).toFixed(1) + ' MB)');
      } catch (e) { S.failed.push(p); }
    }
  }
  await walk('/');
  try { await ftp.quit?.(); } catch (e) { }
  const L = [`Backup: ${S.files} Dateien, ${(S.bytes / 1e6).toFixed(1)} MB`, 'Weltdateien: ' + (S.worlds.join(', ') || 'KEINE'), 'Ordner (MB): ' + [...S.dirs].sort((a, b) => b[1] - a[1]).slice(0, 15).map(([k, v]) => `${k} ${(v / 1e6).toFixed(1)}`).join(' · ')];
  if (S.skipped.length) L.push('Übersprungen (Spieldateien): ' + S.skipped.join(', '));
  if (S.failed.length) L.push('Nicht geladen: ' + S.failed.slice(0, 30).join(', '));
  const txt = red(L.join('\n')); console.log(txt);
  console.log('::notice title=Backup::' + txt.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A'));
  if (!S.worlds.length) process.exit(2);
  process.exit(0);
})().catch((e) => { console.log('::error title=Backup::' + red(e.message)); process.exit(1); });
