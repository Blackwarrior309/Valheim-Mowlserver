/* App: Welt einlesen → Viewer → Export (.vwelt / Teilen-HTML) · Live-Quellen */
(function () {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const start = $('#start'), app = $('#app'), prog = $('#prog'), err = $('#err');
  let viewer = null, current = null, currentGz = null, planList = [];
  const plansReady = fetch('plans/index.json').then((r) => (r.ok ? r.json() : [])).then((l) => (planList = Array.isArray(l) ? l : [])).catch(() => {});
  // Snapshot inkl. eingeblendeter Baupläne packen
  function packCurrent() {
    const plans = viewer ? viewer.getPlans() : [];
    const workspace = viewer && viewer.getWorkspace ? viewer.getWorkspace() : null;
    if (!plans.length && (!workspace || !Object.keys(workspace.records).length)) return currentGz;
    return fflate.gzipSync(fflate.strToU8(JSON.stringify(Object.assign({}, current, { plans, workspace }))), { level: 9 });
  }

  // ---------- Hilfen ----------
  const safe = (s) => String(s || 'welt').replace(/[^\wäöüÄÖÜß.-]+/g, '_').replace(/^_+|_+$/g, '') || 'welt';
  const stamp = () => { const d = new Date(), p = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; };
  function download(data, name, type) {
    const url = URL.createObjectURL(new Blob([data], { type }));
    const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }
  function showErr(m) { err.textContent = m; err.hidden = !m; }
  function setProg(t, f) { prog.hidden = false; $('#progText').textContent = t; $('#progBar').style.width = Math.round((f || 0) * 100) + '%'; }
  function b64ToU8(s) { const b = atob(s), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; }
  function u8ToB64(u8) { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); }

  // Snapshot aus .vwelt (gzip/JSON) oder Teilen-HTML lesen
  function decodeSnapshot(u8) {
    if (u8[0] === 0x1f && u8[1] === 0x8b) return { snap: JSON.parse(fflate.strFromU8(fflate.gunzipSync(u8))), gz: u8 };
    const txt = fflate.strFromU8(u8.subarray(0, Math.min(u8.length, 200)));
    if (txt.trim().startsWith('{')) { const snap = JSON.parse(fflate.strFromU8(u8)); return { snap, gz: fflate.gzipSync(u8) }; }
    const full = fflate.strFromU8(u8); const m = full.match(/<script id="vwelt"[^>]*>([^<]+)<\/script>/);
    if (m) { const gz = b64ToU8(m[1].trim()); return { snap: JSON.parse(fflate.strFromU8(fflate.gunzipSync(gz))), gz }; }
    throw new Error('Unbekanntes Dateiformat – erwartet wird eine .vwelt- oder Teilen-HTML-Datei.');
  }
  function checkSnap(s) { if (!s || s.format !== 'vwelt') throw new Error('Das ist keine gültige .vwelt-Datei.'); if (s.version > 1) console.warn('Neuere Formatversion', s.version); return s; }

  // ---------- Viewer ----------
  let liveRefresh = null; // wird im Live-Modus gesetzt (manuelles Aktualisieren)
  function actionsUrl() {
    const m = location.hostname.match(/^([^.]+)\.github\.io$/i); if (!m) return null;
    const repo = location.pathname.split('/').filter(Boolean)[0] || (m[1] + '.github.io');
    return 'https://github.com/' + m[1] + '/' + repo + '/actions/workflows/live.yml';
  }
  // ---------- Server sofort abfragen: startet den Workflow über die GitHub-API ----------
  // Der Token bleibt nur in diesem Browser (localStorage) und steht nie im Seitenquelltext.
  const TOKEN_KEY = 'vw-gh-token';
  const repoInfo = () => { const u = actionsUrl(); if (!u) return null; const m = u.match(/github\.com\/([^/]+)\/([^/]+)\//); return { owner: m[1], repo: m[2] }; };
  const getToken = () => { try { return localStorage.getItem(TOKEN_KEY) || ''; } catch (e) { return ''; } };
  const setToken = (t) => { try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); } catch (e) { } };
  function tokenDialog(msg) {
    return new Promise((resolve) => {
      const ri = repoInfo();
      const d = document.createElement('div'); d.className = 'vw-tokdlg';
      d.innerHTML = `<div class="box"><b class="ttl">Server jetzt abfragen</b>
        <p>${msg ? '<span class="tokerr">' + msg + '</span><br>' : ''}Startet den Abgleich mit dem Server sofort. Das darf nur der Besitzer des Repos – dafür braucht diese Seite einmalig einen GitHub-Token. Er wird nur in diesem Browser gespeichert.</p>
        <ol><li><a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener">Token erstellen</a> (Fine-grained): Repository access → <i>Only select repositories</i> → <b>${ri.repo}</b>, Permissions → <b>Actions: Read and write</b>.</li>
        <li>Token hier einfügen:</li></ol>
        <input type="password" placeholder="github_pat_…" autocomplete="off">
        <div class="row"><button class="pri" data-a="ok">Speichern &amp; starten</button><button data-a="no">Abbrechen</button><a href="${actionsUrl()}" target="_blank" rel="noopener">oder auf GitHub starten</a></div></div>`;
      document.body.appendChild(d); const inp = d.querySelector('input'); inp.focus();
      const done = (v) => { d.remove(); resolve(v); };
      d.querySelector('[data-a=ok]').onclick = () => done(inp.value.trim());
      d.querySelector('[data-a=no]').onclick = () => done('');
      inp.onkeydown = (e) => { if (e.key === 'Enter') done(inp.value.trim()); if (e.key === 'Escape') done(''); };
      d.onclick = (e) => { if (e.target === d) done(''); };
    });
  }
  let fetchBusy = false;
  async function serverFetch() {
    if (fetchBusy) return; const ri = repoInfo(); if (!ri) return;
    let tok = getToken(), msg = '';
    fetchBusy = true;
    try {
      for (let tries = 0; tries < 3; tries++) {
        if (!tok) { tok = await tokenDialog(msg); if (!tok) { if (msg && viewer) viewer.setStatus('Server-Abfrage abgebrochen'); return; } }
        viewer && viewer.setStatus('Starte Server-Abfrage …');
        let r;
        try { r = await fetch(`https://api.github.com/repos/${ri.owner}/${ri.repo}/actions/workflows/live.yml/dispatches`, { method: 'POST', headers: { Authorization: 'Bearer ' + tok, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' }, body: JSON.stringify({ ref: 'main' }) }); }
        catch (e) { viewer && viewer.setStatus('Server-Abfrage: GitHub nicht erreichbar'); return; }
        if (r.status === 204) {
          setToken(tok);
          const t0 = Date.now();
          viewer && viewer.setStatus('Server-Abfrage gestartet – die Karte lädt in ca. 2–4 Min. neu');
          // ein paar Minuten lang nachsehen, ob der neue Stand da ist
          const iv = setInterval(() => { if (Date.now() - t0 > 7 * 60e3) { clearInterval(iv); return; } liveRefresh && liveRefresh(true); }, 30000);
          return;
        }
        setToken(''); tok = '';
        msg = r.status === 401 ? 'Token ungültig oder abgelaufen.' : (r.status === 403 || r.status === 404) ? 'Token hat keine Berechtigung für dieses Repo (Actions: Read and write).' : 'GitHub antwortet mit Fehler ' + r.status + '.';
      }
    } finally { fetchBusy = false; }
  }
  function show(snap, gz, status) {
    if (viewer && current && VWTools.worldKey(current) !== VWTools.worldKey(snap)) { viewer.destroy(); viewer = null; }
    current = snap; currentGz = gz;
    start.hidden = true; app.hidden = false;
    if (viewer) { viewer.update(snap); if (status) viewer.setStatus(status); return; }
    viewer = VWViewer.mount(app, snap, {
      status, plans: planList, history: historyBase, mod: modBase,
      actions: [
        ...(liveRefresh ? [{ label: '⟳ Aktualisieren', title: 'Live-Welt jetzt neu laden', onClick: liveRefresh }] : []),
        ...(liveRefresh && actionsUrl() ? [{ label: '▶ Server abfragen', title: 'Startet den Abgleich mit dem Server sofort (nur für den Repo-Besitzer, braucht einmalig einen GitHub-Token)', onClick: serverFetch }] : []),
        { label: '⬇ Teilen-Datei (.html)', primary: true, title: 'Eine Datei, öffnet sich in jedem Browser – zum Verschicken', onClick: exportHtml },
        { label: '⬇ .vwelt', title: 'Kompakte Datendatei (für diese Seite, Live-Karten, Server)', onClick: () => download(packCurrent(), safe(current.world.name) + '_' + stamp() + '.vwelt', 'application/gzip') },
        { label: 'Neue Welt', onClick: () => { location.href = location.pathname; } }
      ]
    });
  }

  // ---------- Teilen-HTML erzeugen ----------
  async function exportHtml() {
    try {
      viewer && viewer.setStatus('Erzeuge Teilen-Datei …');
      const get = (p) => fetch(p).then((r) => { if (!r.ok) throw new Error(p + ' nicht ladbar'); return r.text(); });
      const [three, ff, data, view, i18n, rec, wgen, tools, ws, peers, cards, doors, physics, destruction] = await Promise.all([get('lib/three.min.js'), get('lib/fflate.min.js'), get('js/data.js'), get('js/viewer.js'), get('js/i18n.js'), get('js/recipes.js').catch(() => ''), get('js/worldgen.js').catch(() => ''), get('js/map-tools.js'), get('js/viewer-workspace.js'), get('js/peer-protocol.js'), get('js/player-card.js'), get('js/doors.js'), get('lib/cannon.min.js'), get('js/destruction.js')]);
      const js = (s) => s.replace(/<\/script/gi, '<\\/script');
      const title = (current.world.name || 'Valheim-Welt') + ' – Valheim-Welt';
      const html = `<!doctype html>
<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title.replace(/</g, '&lt;')}</title>
<meta name="generator" content="Valheim Welt-Viewer (inoffiziell)">
<style>html,body{margin:0;height:100%;background:#12171b}#boot{color:#ece6d8;font:15px/1.5 system-ui,sans-serif;padding:24px;max-width:560px}#boot .h{opacity:0;animation:vwshow 0s 8s forwards;color:#c9c2b4;font-size:14px;margin-top:14px}@keyframes vwshow{to{opacity:1}}#boot .e{color:#ff9a8a;white-space:pre-wrap}</style>
</head><body><div id="app"><div id="boot"><b>Lade Welt …</b><div class="h">Bleibt diese Meldung stehen? Dann wurde die Datei in einer Vorschau geöffnet, die keine Programme ausführt (z. B. Datei-Vorschau in Apps, Mail, WhatsApp). Bitte die Datei herunterladen und in einem Browser öffnen – Chrome, Edge, Firefox oder Safari.</div><div class="e" id="booterr"></div></div></div>
<script>window.onerror=function(m,s,l){var e=document.getElementById('booterr');if(e)e.textContent='Fehler: '+m+' (Zeile '+l+')';};</script>
<script>${js(i18n)}</script>
<script>${js(three)}</script>
<script>${js(physics)}</script>
<script>${js(destruction)}</script>
<script>${js(ff)}</script>
<script>${js(data)}</script>
<script>${js(rec)}</script>
<script>${js(wgen)}</script>
<script>${js(doors)}</script>
<script>${js(cards)}</script>
<script>${js(peers)}</script>
<script>${js(tools)}</script>
<script>${js(ws)}</script>
<script>${js(view)}</script>
<script id="vwelt" type="application/octet-stream">${u8ToB64(packCurrent())}</script>
<script>
(function(){ try {
  var b=document.getElementById('vwelt').textContent.trim(),s=atob(b),u=new Uint8Array(s.length);for(var i=0;i<s.length;i++)u[i]=s.charCodeAt(i);
  var snap=JSON.parse(fflate.strFromU8(fflate.gunzipSync(u)));
  VWViewer.mount(document.getElementById('app'),snap,{status:'Geteilte Welt · Stand '+new Date(snap.created).toLocaleDateString(window.VW_I18N?VW_I18N.locale():'de-DE'),actions:[{label:'⬇ .vwelt',onClick:function(){var a=document.createElement('a');a.href=URL.createObjectURL(new Blob([u],{type:'application/gzip'}));a.download=(snap.world.name||'welt')+'.vwelt';a.click();}}]});
 } catch(e) { var x=document.getElementById('booterr'); if(x) x.textContent='Fehler beim Laden: '+(e&&e.message||e); } })();
</script>
</body></html>`;
      download(html, safe(current.world.name) + '_' + stamp() + '.html', 'text/html');
      viewer && viewer.setStatus('Teilen-Datei gespeichert');
    } catch (e) { alert('Export fehlgeschlagen: ' + e.message); }
  }

  // „Letztes Update“ mit relativer Zeit (vor 5 Min., vor 2 Std. …)
  function ago(ts) { const m = Math.max(0, Math.round((Date.now() - new Date(ts).getTime()) / 60000)); if (m < 1) return 'gerade eben'; if (m < 60) return 'vor ' + m + ' Min.'; const h = Math.round(m / 60); if (h < 48) return 'vor ' + h + ' Std.'; return 'vor ' + Math.round(h / 24) + ' Tagen'; }
  const updText = (ts) => 'Letztes Update: ' + new Date(ts).toLocaleString((window.VW_I18N?VW_I18N.locale():'de-DE'), { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) + ' (' + ago(ts) + ')';
  let modBase = null; // gesetzt, wenn mit dem Spiel-Mod verbunden (für „Im Spiel suchen“)
  // ---------- Umwandeln (Worker) ----------
  function convert(files, status) {
    return new Promise((resolve, reject) => {
      const w = new Worker('js/worker.js');
      const bufs = files.map((f) => f.buf);
      w.onmessage = (e) => {
        const m = e.data;
        if (m.type === 'progress') { if (viewer) viewer.setStatus(m.text); else setProg(m.text, m.frac); }
        else if (m.type === 'done') { w.terminate(); resolve(m); }
        else if (m.type === 'error') { w.terminate(); reject(new Error(m.message)); }
      };
      w.onerror = (e) => { w.terminate(); reject(new Error(e.message || 'Worker-Fehler')); };
      w.postMessage({ files, opts: { stripIds: $('#oStrip').checked } }, bufs);
    });
  }

  async function handleFiles(list) {
    showErr('');
    const arr = Array.from(list).filter((f) => f.size > 0);
    if (!arr.length) return;
    // Snapshot direkt öffnen?
    if (arr.length === 1 && /\.(vwelt|html?)$/i.test(arr[0].name)) {
      try { const { snap, gz } = decodeSnapshot(new Uint8Array(await arr[0].arrayBuffer())); show(checkSnap(snap), gz, 'Geöffnet: ' + arr[0].name); }
      catch (e) { showErr(e.message); }
      return;
    }
    const keep = arr.filter((f) => /\.(zip|db2|fwl2?|chunk)$|\.chunk/i.test(f.name));
    if (!keep.length) { showErr('Keine passenden Dateien gefunden. Erwartet: Zip des Weltordners oder .fwl2/.db2/.chunk-Dateien.'); return; }
    setProg('Lese Dateien …', 0.01);
    try {
      const files = [];
      for (const f of keep) files.push({ name: f.webkitRelativePath || f.name, buf: await f.arrayBuffer() });
      const res = await convert(files);
      prog.hidden = true;
      show(res.snap, res.gz, `${res.snap.stats.zdos.toLocaleString(window.VW_I18N?VW_I18N.locale():'de-DE')} Objekte gelesen`);
    } catch (e) { prog.hidden = true; showErr('Fehler: ' + e.message); }
  }

  // Eingaben
  $('#fFiles').onchange = (e) => handleFiles(e.target.files);
  $('#fDir').onchange = (e) => handleFiles(e.target.files);
  const drop = $('#drop');
  ['dragenter', 'dragover'].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.add('over'); }));
  ['dragleave', 'drop'].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.remove('over'); }));
  drop.addEventListener('drop', async (e) => {
    const items = Array.from(e.dataTransfer.items || []);
    const entries = items.map((i) => i.webkitGetAsEntry && i.webkitGetAsEntry()).filter(Boolean);
    if (entries.some((en) => en.isDirectory)) {
      const out = [];
      const walk = (en, path) => new Promise((res) => {
        if (en.isFile) en.file((f) => { try { Object.defineProperty(f, 'webkitRelativePath', { value: path + f.name }); } catch (x) { } out.push(f); res(); }, () => res());
        else { const r = en.createReader(); const all = []; const rd = () => r.readEntries(async (es) => { if (!es.length) { for (const c of all) await walk(c, path + en.name + '/'); res(); } else { all.push(...es); rd(); } }, () => res()); rd(); }
      });
      for (const en of entries) await walk(en, '');
      handleFiles(out);
    } else handleFiles(e.dataTransfer.files);
  });

  // ---------- Ordner live beobachten (File System Access API) ----------
  $('#bWatch').onclick = async () => {
    if (!window.showDirectoryPicker) { alert('Dein Browser unterstützt das Beobachten von Ordnern nicht. Bitte Chrome oder Edge am PC verwenden.'); return; }
    let dir; try { dir = await showDirectoryPicker({ mode: 'read' }); } catch (e) { return; }
    let sig = '';
    async function collect(d, path, out) {
      for await (const [name, h] of d.entries()) {
        if (h.kind === 'directory') await collect(h, path + name + '/', out);
        else if (/\.(db2|fwl2?|chunk)$/i.test(name)) out.push({ h, name: path + name });
      }
      return out;
    }
    async function tick() {
      try {
        const hs = await collect(dir, '', []); const files = await Promise.all(hs.map(async (x) => ({ name: x.name, f: await x.h.getFile() })));
        const s = files.map((x) => x.name + ':' + x.f.lastModified + ':' + x.f.size).sort().join('|');
        if (s === sig) return; sig = s;
        if (!files.length) { showErr('Im gewählten Ordner sind keine Welt-Dateien.'); return; }
        const res = await convert(await Promise.all(files.map(async (x) => ({ name: x.name, buf: await x.f.arrayBuffer() }))));
        prog.hidden = true;
        show(res.snap, res.gz, 'Live · Ordner beobachtet · aktualisiert ' + new Date().toLocaleTimeString(window.VW_I18N?VW_I18N.locale():'de-DE'));
      } catch (e) { showErr('Fehler: ' + e.message); }
    }
    setProg('Lese Ordner …', 0.02); await tick(); setInterval(tick, 30000);
  };


  // ---------- Live mit dem Mod (Valheim Welt Live) ----------
  async function connectMod(base) {
    base = base.replace(/\/+$/, ''); modBase = base;
    let lastDump = 0, busy = false, fails = 0;
    setProg('Verbinde mit dem Mod (' + (base || location.host) + ') …', 0.05); showErr('');
    async function world() {
      if (busy) return; busy = true;
      try {
        const info = await (await fetch(base + '/api/info', { cache: 'no-store' })).json();
        if (!info.dumpTime) { if (!viewer) setProg('Mod verbunden – Welt wird gerade gelesen. Ist eine Welt geladen?', 0.1); return; }
        if (info.dumpTime === lastDump) return;
        const r = await fetch(base + '/api/world.vwdump', { cache: 'no-store' }); if (!r.ok) throw new Error('HTTP ' + r.status);
        const buf = await r.arrayBuffer(); lastDump = info.dumpTime;
        const res = await convert([{ name: 'live.vwdump', buf }]);
        prog.hidden = true; fails = 0;
        show(res.snap, res.gz, 'Live (Mod) · Welt ' + new Date(info.dumpTime).toLocaleTimeString(window.VW_I18N?VW_I18N.locale():'de-DE'));
      } catch (e) { fails++; if (!viewer) { prog.hidden = true; showErr('Mod nicht erreichbar (' + (base || location.host) + '): ' + e.message + '. Läuft Valheim mit dem Mod? Port richtig?'); } else viewer.setStatus('Live (Mod) · Verbindung unterbrochen …'); }
      finally { busy = false; }
    }
    async function players() {
      if (!viewer) return;
      try { const l = await (await fetch(base + '/api/players', { cache: 'no-store' })).json(); viewer.updateLive(l); } catch (e) { }
    }
    await plansReady; await world();
    setInterval(world, 10000); setInterval(players, 1500);
  }
  $('#bMod').onclick = () => { const v = ($('#modUrl').value || 'http://localhost:8686').trim(); connectMod(v); };

  // ---------- Live-/Fernquelle: ?src=URL&refresh=Sekunden ----------
  const P = new URLSearchParams(location.search);
  const src = P.get('src');
  // Bau-Verlauf liegt neben der Live-Welt: live/welt.vwelt → live/verlauf/
  const historyBase = src && !/^[a-z]+:/i.test(src) ? src.replace(/[?#].*$/, '').replace(/[^/]*$/, '') + 'verlauf/' : null;
  // Liegt eine Live-Welt im Repo (live/welt.vwelt)? Dann auf der Startseite anbieten.
  const modParam = P.get('mod');
  if (modParam !== null) connectMod(modParam || 'http://localhost:8686');
  else if (!src && !/github\.io$/i.test(location.hostname) && location.protocol.startsWith('http')) fetch('api/info', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)).then((i) => { if (i && i.mod) connectMod(''); }).catch(() => {});
  if (!src && modParam === null) {
    fetch('live/welt.vwelt', { cache: 'no-store' }).then((r) => (r.ok ? r.arrayBuffer() : null)).then((buf) => {
      if (!buf) return;
      const { snap } = decodeSnapshot(new Uint8Array(buf)); if (!snap || snap.format !== 'vwelt') return;
      const box = $('#live'); box.hidden = false;
      $('#liveName').textContent = snap.world.name || 'Live-Welt';
      const li = () => ($('#liveInfo').textContent = updText(snap.created) + ' · ' + (snap.bases || []).length + ' Basen · ' + ((snap.stats && snap.stats.playerPieces) || 0).toLocaleString(window.VW_I18N?VW_I18N.locale():'de-DE') + ' Bauteile'); li(); setInterval(li, 60000);
      box.href = '?src=live/welt.vwelt&refresh=60';
    }).catch(() => {});
  }
  if (src) {
    const refresh = Math.max(10, +P.get('refresh') || 0);
    let lastCreated = '';
    async function pull(first, manual) {
      try {
        await plansReady;
        const r = await fetch(src + (src.includes('?') ? '&' : '?') + '_=' + Date.now(), { cache: 'no-store' });
        if (!r.ok) throw new Error('HTTP ' + r.status);
        const { snap, gz } = decodeSnapshot(new Uint8Array(await r.arrayBuffer())); checkSnap(snap);
        const t = new Date().toLocaleTimeString(window.VW_I18N?VW_I18N.locale():'de-DE');
        if (snap.created !== lastCreated) { const neu = !!lastCreated; lastCreated = snap.created; show(snap, gz, (P.get('refresh') ? 'Live · ' : '') + updText(snap.created) + (neu && manual ? ' · neu geladen' : '')); }
        else if (viewer) viewer.setStatus((P.get('refresh') ? 'Live · ' : '') + updText(snap.created) + (manual ? ' · nichts Neues, geprüft ' : ' · geprüft ') + t);
      } catch (e) { if (first) { prog.hidden = true; showErr('Quelle nicht ladbar (' + src + '): ' + e.message); } else if (viewer) viewer.setStatus('Live · Verbindung fehlgeschlagen, neuer Versuch …'); }
    }
    let pulling = false;
    liveRefresh = async (quiet) => { if (pulling) return; pulling = true; if (quiet !== true && viewer) viewer.setStatus('Prüfe auf neue Daten …'); try { await pull(false, quiet !== true); } finally { pulling = false; } };
    setProg('Lade Welt …', 0.3); pull(true).then(() => (prog.hidden = true));
    setInterval(() => { if (viewer && lastCreated) viewer.setStatus((P.get('refresh') ? 'Live · ' : '') + updText(lastCreated)); }, 60000);
    if (P.get('refresh')) setInterval(pull, refresh * 1000);
  }
})();
