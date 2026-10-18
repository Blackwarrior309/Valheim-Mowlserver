#!/usr/bin/env node
/* Nur lesen: Ordner auf dem FTP-Server auflisten (ohne Weltdaten-Chunks) und Log-/Textdateien suchen.
 * Gibt eine Übersicht als GitHub-Hinweis aus. Zugangsdaten kommen aus den Secrets und werden nie ausgegeben.
 *   VS_FTP_HOST, VS_FTP_PORT, VS_FTP_USER, VS_FTP_PASSWORD, VS_FTP_SECURE   node sync/ftp-scan.cjs [--tail Datei] */
const path = require('path');
process.env.VS_SCAN_ONLY = '1';
const { FTP } = require('./sync.cjs');
const E = process.env, red = (x) => [E.VS_FTP_HOST, E.VS_FTP_USER, E.VS_FTP_PASSWORD].filter(Boolean).reduce((t, v) => t.split(v).join('***'), String(x));
const esc = (x) => x.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
(async () => {
  const ftp = new FTP({ host: E.VS_FTP_HOST, port: +E.VS_FTP_PORT || 21, user: E.VS_FTP_USER, password: E.VS_FTP_PASSWORD || '', secure: /^(1|true|ja|yes)$/i.test(E.VS_FTP_SECURE || '') });
  const lines = [], logs = [];
  try {
    await ftp.connect();
    async function walk(d, depth) {
      let items; try { items = await ftp.list(d); } catch (e) { lines.push('  '.repeat(depth) + d + ' (nicht lesbar)'); return; }
      const pad = '  '.repeat(depth), files = items.filter((x) => !x.dir), dirs = items.filter((x) => x.dir);
      const chunks = files.filter((x) => /\.(chunk|chunks|db2?|fwl2?|ok|old)$/i.test(x.name));
      const other = files.filter((x) => !chunks.includes(x));
      if (chunks.length) lines.push(pad + '… ' + chunks.length + ' Weltdateien');
      other.slice(0, 25).forEach((x) => { lines.push(pad + '  ' + x.name + '  ' + x.size + '  ' + x.mod); if (/log|\.txt$|\.out$|output/i.test(x.name)) logs.push({ p: path.posix.join(d, x.name), s: x.size, m: x.mod }); });
      if (other.length > 25) lines.push(pad + '  … ' + (other.length - 25) + ' weitere Dateien');
      for (const it of dirs) { if (lines.length > 400) return; if (/^(worlds_local|Managed|MonoBleedingEdge|valheim_server_Data|steamapps|linux64)$/i.test(it.name) && depth > 0) { lines.push(pad + '[D] ' + it.name + ' (übersprungen)'); continue; } lines.push(pad + '[D] ' + it.name + '  ' + it.mod); if (depth < 3) await walk(path.posix.join(d, it.name), depth + 1); }
    }
    lines.push('/'); await walk('/', 0);
    // Von gefundenen Logs die letzten Zeilen zeigen (größte/neueste zuerst), um das Format zu sehen
    logs.sort((a, b) => b.s - a.s);
    for (const l of logs.slice(0, 2)) {
      try { const buf = await ftp.get(l.p); const txt = buf.toString('utf8').split(/\r?\n/).filter(Boolean); lines.push('', '=== ' + l.p + ' (' + txt.length + ' Zeilen) – letzte 40 ==='); txt.slice(-40).forEach((t) => lines.push(t.slice(0, 220))); } catch (e) { lines.push('(' + l.p + ' nicht lesbar: ' + e.message + ')'); }
    }
  } catch (e) { lines.push('FEHLER: ' + e.message); }
  finally { try { ftp.close(); } catch (e) { } }
  const out = red(lines.join('\n'));
  console.log(out);
  // Hinweise sind auf ~4 KB begrenzt: in Teilen ausgeben
  const parts = []; let cur = ''; out.split('\n').forEach((l) => { if (cur.length + l.length > 3500) { parts.push(cur); cur = ''; } cur += l + '\n'; }); if (cur) parts.push(cur);
  parts.slice(0, 9).forEach((p, i) => console.log('::notice title=FTP-Scan ' + (i + 1) + '/' + parts.length + '::' + esc(p)));
  console.log('::notice title=Log-Dateien::' + esc(red(logs.map((l) => l.p + '  ' + l.s + '  ' + l.m).join('\n') || 'keine gefunden')));
})();
