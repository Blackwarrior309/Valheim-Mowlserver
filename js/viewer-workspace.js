/* Named 3D rooms, snapshot comparison, shared project board and place links. */
(function (g) {
  'use strict';
  const T = g.VWTools;
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  function mount(root, api) {
    const $ = (s) => root.querySelector(s), actor = crypto.randomUUID();
    const world = T.worldKey(api.snapshot()), storageKey = 'vw-workspace:' + world;
    const undo = [];
    let records = {}, client = null, closed = false, comparison = null, baseline = null, historyBase = null;
    const rooms = () => Object.values(records).filter((r) => !r.deleted && r.kind === 'room').map((r) => r.data);
    const projects = () => Object.values(records).filter((r) => !r.deleted && r.kind === 'project').sort((a, b) => a.data.id.localeCompare(b.data.id)).map((r) => r.data);
    const save = () => { try { localStorage.setItem(storageKey, JSON.stringify(records)); } catch (e) { $('.wsStatus').textContent = 'Speicher voll: Bitte Arbeitsdaten exportieren.'; } };
    function accept(record, id) {
      if (!record || !['room', 'project'].includes(record.kind) || !Number.isSafeInteger(record.stamp) || record.stamp < 0 || record.stamp > Date.now() + 300000 || typeof record.actor !== 'string' || record.actor.length > 100 || typeof record.deleted !== 'boolean') throw new Error('Ungültiger Arbeitsdatensatz');
      const data = record.kind === 'room' ? T.room(record.data) : T.project(record.data);
      if (data.id !== id || Object.keys(records).length >= 2000 && !records[id]) throw new Error('Zu viele Arbeitsdaten');
      const old = records[id]; if (old && (old.stamp > record.stamp || old.stamp === record.stamp && old.actor >= record.actor)) return false;
      records[id] = { kind: record.kind, stamp: record.stamp, actor: record.actor, deleted: record.deleted, data }; return true;
    }
    function merge(data) {
      if (!data || data.version !== 1 || data.world !== world || !data.records || Object.keys(data.records).length > 2000) throw new Error('Arbeitsdaten gehören zu einer anderen Welt oder sind ungültig.');
      const previous = { ...records };
      try { for (const [id, record] of Object.entries(data.records)) accept(record, id); }
      catch (e) { records = previous; throw e; }
      save(); render();
    }
    function change(kind, data, deleted = false, remember = true) {
      const record = { kind, data, deleted, stamp: Math.max(Date.now(), (records[data.id]?.stamp || 0) + 1), actor };
      if (remember) { undo.push({ previous: records[data.id] || { kind, data, deleted: true }, stamp: record.stamp, id: data.id }); if (undo.length > 20) undo.shift(); }
      accept(record, data.id); save(); render();
      if (client?.connected) client.publish(topic() + '/' + data.id, JSON.stringify(record), { qos: 1, retain: true });
    }
    function exportData() { return { version: 1, world, records }; }
    function download(data, name) {
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })), a = document.createElement('a');
      a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 3000);
    }
    if (!document.getElementById('vw-workspace-css')) { const style = document.createElement('style'); style.id = 'vw-workspace-css'; style.textContent = '.vw .workspace input,.vw .wsBoard input,.vw .wsBoard textarea{font:inherit;font-size:13px;padding:6px 8px;border-radius:7px;border:1px solid var(--line);background:var(--chip);color:var(--fg);min-width:0}.vw .wsBoard{margin-top:12px}.vw .wsBoard textarea{resize:vertical}.vw .workspace>.row{margin:6px 0}.vw .wsJoin{display:block;margin:6px 0}.vw .wsProjectStatus{margin-bottom:6px}'; document.head.appendChild(style); }
    const side = document.createElement('section'); side.className = 'workspace';
    side.innerHTML = `<h2>Ort teilen</h2><button class="wsShare">🔗 Aktuelle 3D-Ansicht teilen</button><button class="wsPeerLink">Mitspieler-Einladungslink</button><a class="wsJoin" hidden>Einladungsraum beitreten</a><input class="wsLink" readonly aria-label="Link zum Ort" hidden style="width:100%;margin-top:6px">
      <h2>Änderungsansicht</h2><div class="row"><button class="wsBase">Aktuellen Stand merken</button><button class="wsYesterday">Seit 24 Stunden</button><label class="vw-btnlike">Älteren Stand laden<input class="wsCompare" type="file" accept=".vwelt,.json" hidden></label></div>
      <select class="wsDiff" aria-label="Änderungen anzeigen" style="width:100%;margin-top:6px"><option value="off">Änderungen ausblenden</option><option value="all">Neu grün / entfernt rot</option><option value="added">Neue grün markieren</option><option value="removed">Entfernte rot markieren</option></select><div class="sub wsDiffInfo">Vergleich gilt für gebaute Teile, nicht Kisteninhalte.</div>
      <h2>Benannte 3D-Bereiche</h2><input class="wsRoomName" maxlength="80" placeholder="Bereichsname, z. B. Schmiedekeller" style="width:100%">
      <div class="row"><label>Unterkante ü. M. <input class="wsLow" type="number" value="0" step="0.1" style="width:70px"></label><label>Höhe <input class="wsHeight" type="number" value="4" min="0.1" step="0.1" style="width:65px"> m</label></div>
      <button class="wsPick">▧ Zwei Ecken in 3D markieren</button><button class="wsCancel" hidden>Abbrechen</button><div class="sub wsPickInfo">Zwei gegenüberliegende Ecken anklicken. Höhe trennt Stockwerke.</div><div class="wsRooms"></div>
      <h2>Arbeitsdaten teilen</h2><div class="row"><button class="wsExport">⬇ Bereiche &amp; Projekte</button><button class="wsUndo">Rückgängig</button><label class="vw-btnlike">Import<input class="wsImport" type="file" accept=".json" hidden></label></div>
      <div class="row"><input class="wsTeam" aria-label="Teamraum" value="standard" maxlength="40" style="width:130px"><button class="wsSync">Team verbinden</button></div><div class="sub wsStatus" role="status">Lokal gespeichert. Team-Verbindung teilt Bereiche und Projekte mit Besuchern desselben Teamraums.</div>`;
    $('.dnInfo').after(side);
    const board = document.createElement('section'); board.className = 'vw-panel wsBoard';
    board.innerHTML = `<h2>Gemeinsame Bauprojekte</h2><div class="sub wsProjectStatus" role="status"></div><div class="row"><input class="wsProjectName" placeholder="Projektname" maxlength="80"><input class="wsOwner" placeholder="Verantwortlich" maxlength="80"><select class="wsProjectRoom" aria-label="Materiallager"></select></div>
      <textarea class="wsNeeds" aria-label="Materialbedarf" placeholder="Materialbedarf, eine Zeile je Material:&#10;Holz;100&#10;Stein;50" rows="4" style="width:100%;margin:8px 0"></textarea>
      <div class="row"><button class="wsAddProject">Projekt anlegen</button><button class="wsFromPlan">Bedarf aus ausgewählten Bauteilen</button><label class="vw-btnlike">PlanBuild-Bauplan laden<input class="wsBlueprint" type="file" accept=".blueprint" hidden></label></div><div class="sub">Materialien werden in Projekt-Reihenfolge reserviert und nicht doppelt verplant. Eine Reservierung verändert keine Kisten im Spiel.</div><div class="wsProjects"></div>`;
    $('.kroute').after(board);
    const roomFilter = document.createElement('select'); roomFilter.className = 'wsRoomFilter'; roomFilter.setAttribute('aria-label', 'Bereich für Kistensuche'); $('.ka').after(roomFilter);
    const room3 = document.createElement('select'); room3.className = 'wsRoom3'; room3.setAttribute('aria-label', 'Bereich in 3D durchsuchen'); $('.cq').before(room3);
    function report(message) { $('.wsStatus').textContent = message; $('.wsProjectStatus').textContent = message; }
    const chestRoom = (c) => T.assigned(rooms(), c);
    function render() {
      if (closed) return;
      const rs = rooms(), ps = projects(), chests = api.chests();
      for (const s of [roomFilter, room3, $('.wsProjectRoom')]) {
        const old = s.value; s.innerHTML = '<option value="">Alle Bereiche</option>' + rs.map((r) => `<option value="${esc(r.id)}">${esc(r.name)}</option>`).join(''); s.value = rs.some((r) => r.id === old) ? old : '';
      }
      $('.wsRooms').innerHTML = rs.map((r) => `<div class="vw-card" style="margin-top:6px"><b>${esc(r.name)}</b> · ${chests.filter((c) => chestRoom(c)?.id === r.id).length} Kisten<br><span class="sub">${r.min[1] - 30} bis ${r.max[1] - 30} m ü. M.</span><div class="row"><button data-room-go="${esc(r.id)}">Ansehen</button><button data-room-find="${esc(r.id)}">Kisten</button><button data-room-edit="${esc(r.id)}">Bearbeiten</button><button data-room-delete="${esc(r.id)}">Löschen</button></div></div>`).join('');
      const allocation = T.allocate(ps, chests, rs);
      $('.wsProjects').innerHTML = allocation.map((p) => `<div class="vw-card" style="margin-top:8px"><b>${esc(p.name)}</b>${p.owner ? ' · ' + esc(p.owner) : ''}<select data-project-status="${esc(p.id)}" aria-label="Projektstatus">${[['planned', 'Geplant'], ['building', 'Im Bau'], ['done', 'Fertig']].map(([v, n]) => `<option value="${v}" ${p.status === v ? 'selected' : ''}>${n}</option>`).join('')}</select><button data-project-delete="${esc(p.id)}">Löschen</button><ul>${p.materials.map((m) => `<li>${esc(m.name)}: ${m.reserved}/${m.need} reserviert${m.missing ? ' · fehlt ' + m.missing : ''}</li>`).join('')}</ul></div>`).join('') || '<p class="sub">Noch keine Projekte.</p>';
      api.roomsChanged(rs);
      api.searchChanged();
    }
    root.addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      try {
        const r = rooms().find((v) => v.id === (b.dataset.roomGo || b.dataset.roomFind || b.dataset.roomDelete || b.dataset.roomEdit));
        if (b.dataset.roomGo && r) api.focus({ x: (r.min[0] + r.max[0]) / 2, y: (r.min[1] + r.max[1]) / 2, z: (r.min[2] + r.max[2]) / 2 });
        if (b.dataset.roomFind && r) { roomFilter.value = r.id; api.openChests(); }
        if (b.dataset.roomDelete && r) change('room', r, true);
        if (b.dataset.roomEdit && r) { editing = r.id; $('.wsRoomName').value = r.name; $('.wsLow').value = r.min[1] - 30; $('.wsHeight').value = r.max[1] - r.min[1]; $('.wsPickInfo').textContent = 'Name/Höhe ändern und „Änderungen speichern“ drücken oder Ecken neu markieren.'; editSave.hidden = false; }
        const p = projects().find((v) => v.id === b.dataset.projectDelete); if (p) change('project', p, true);
      } catch (err) { report(err.message); }
    });
    root.addEventListener('change', (e) => { if (e.target.dataset.projectStatus) { const p = projects().find((v) => v.id === e.target.dataset.projectStatus); if (p) change('project', { ...p, status: e.target.value }); } });
    roomFilter.onchange = () => api.searchChanged(); room3.onchange = () => api.searchChanged();
    let editing = null;
    const editSave = document.createElement('button'); editSave.textContent = 'Änderungen speichern'; editSave.hidden = true; $('.wsPickInfo').after(editSave);
    editSave.onclick = () => { try { const r = rooms().find((v) => v.id === editing); if (!r) return; const min = r.min.slice(), max = r.max.slice(); min[1] = +$('.wsLow').value + 30; max[1] = min[1] + +$('.wsHeight').value; change('room', T.room({ ...r, name: $('.wsRoomName').value, min, max })); editing = null; editSave.hidden = true; } catch (e) { $('.wsPickInfo').textContent = e.message; } };
    $('.wsPick').onclick = () => {
      const name = $('.wsRoomName').value.trim(), low = +$('.wsLow').value + 30, high = low + +$('.wsHeight').value;
      if (!name || !T.finite(low) || !T.finite(high) || high <= low) { $('.wsPickInfo').textContent = 'Bitte Name, Unterkante und positive Höhe angeben.'; return; }
      $('.wsCancel').hidden = false; $('.wsPickInfo').textContent = 'Erste Ecke anklicken (Escape bricht ab).';
      api.pick((a, b) => {
        if (!b) { $('.wsPickInfo').textContent = a ? 'Zweite Ecke anklicken.' : 'Markierung abgebrochen.'; if (!a) $('.wsCancel').hidden = true; return; }
        try { change('room', T.room({ id: editing || crypto.randomUUID(), name, min: [Math.min(a.x, b.x), low, Math.min(a.z, b.z)], max: [Math.max(a.x, b.x), high, Math.max(a.z, b.z)] })); editing = null; editSave.hidden = true; $('.wsPickInfo').textContent = 'Bereich gespeichert. Kisten wurden automatisch zugeordnet.'; }
        catch (e) { $('.wsPickInfo').textContent = e.message; }
        $('.wsCancel').hidden = true;
      });
    };
    $('.wsCancel').onclick = () => api.pick(null);
    $('.wsAddProject').onclick = () => { try {
      const needs = $('.wsNeeds').value.split('\n').filter((v) => v.trim()).map((v) => { const i = v.lastIndexOf(';'); return [v.slice(0, i).trim(), Number(v.slice(i + 1))]; });
      if (!needs.length) throw new Error('Bitte Materialbedarf im Format Holz;100 eingeben.');
      change('project', T.project({ id: Date.now() + '-' + actor, name: $('.wsProjectName').value, owner: $('.wsOwner').value, room: $('.wsProjectRoom').value, needs })); $('.wsProjectName').value = ''; $('.wsNeeds').value = '';
    } catch (e) { report(e.message); } };
    $('.wsFromPlan').onclick = () => { const needs = api.selectedMaterials(); if (!needs.length) { report('Zuerst in 3D Bauteile auswählen.'); return; } $('.wsNeeds').value = needs.map(([n, c]) => n + ';' + c).join('\n'); api.openChests(); };
    $('.wsBlueprint').onchange = async (e) => { try { const f = e.target.files[0]; if (!f) return; if (f.size > 4e6) throw new Error('Bauplan zu groß.'); const result = api.blueprintMaterials(await f.text()); if (result.unknown.length) throw new Error('Unbekannte Baukosten für: ' + result.unknown.join(', ')); if (!result.needs.length) throw new Error('Bauplan enthält keine bekannten Bauteile.'); $('.wsNeeds').value = result.needs.map(([n, c]) => n + ';' + c).join('\n'); $('.wsProjectName').value = f.name.replace(/\.blueprint$/i, ''); } catch (err) { report(err.message); } };
    $('.wsPeerLink').onclick = async () => { const u = new URL(location.href); u.searchParams.set('room', crypto.randomUUID()); const current = api.camera(); const link = current ? T.share(u.href, world, current.camera, current.region) : u.href; $('.wsLink').hidden = false; $('.wsLink').value = link; $('.wsJoin').hidden = false; $('.wsJoin').href = link; report('Einladungsraum erstellt. Zum Wechseln beitreten und den Link an Mitspieler weitergeben.'); try { await navigator.clipboard.writeText(link); } catch (e) { } };
    $('.wsShare').onclick = async () => { const s = api.camera(); if (!s) return; const link = T.share(location.href, world, s.camera, s.region); $('.wsLink').hidden = false; $('.wsLink').value = link; try { await navigator.clipboard.writeText(link); $('.wsShare').textContent = '✓ Link kopiert'; } catch (e) { $('.wsLink').select(); } };
    $('.wsBase').onclick = () => { baseline = api.snapshot(); historyBase = null; $('.wsDiffInfo').textContent = 'Stand vom ' + new Date(baseline.created).toLocaleString() + ' gemerkt. Weitere Live-Updates werden verglichen.'; };
    function showDiff() { if (historyBase) comparison = T.diffMaps(historyBase, T.pieceMap(api.snapshot())); if (baseline) { comparison = T.diff(baseline, api.snapshot()); $('.wsDiffInfo').textContent = comparison.added.length + ' neu · ' + comparison.removed.length + ' entfernt'; } api.changes(comparison, $('.wsDiff').value); }
    $('.wsDiff').onchange = showDiff;
    $('.wsYesterday').onclick = async () => {
      const button = $('.wsYesterday'); button.disabled = true;
      try {
        if (!api.history || !g.VW_HISTORY) throw new Error('Kein Server-Verlauf verfügbar. Alternativ einen älteren .vwelt-Stand laden.');
        const response = await fetch(api.history + 'index.json', { cache: 'no-store' }); if (!response.ok) throw new Error('Verlauf nicht erreichbar.');
        const index = await response.json(), historySnapshot = api.snapshot(), end = Math.min(Date.now(), Date.parse(historySnapshot.created) || Date.now()), cutoff = end - 86400000;
        const entries = (index.entries || []).slice().sort((a, b) => a.t - b.t).filter((e, i) => i > 0 && e.t > cutoff && e.t <= end + 1000);
        if (entries.length > 400) throw new Error('Zu viele Verlaufseinträge; bitte eine Vergleichsdatei verwenden.');
        const events = [];
        for (const e of entries) { if (closed) return; if (!/^e\/[a-zA-Z0-9_.-]+$/.test(e.f)) throw new Error('Ungültiger Verlaufspfad.'); const r = await fetch(api.history + e.f); if (!r.ok) throw new Error('Verlaufseintrag fehlt.'); const raw = g.fflate.gunzipSync(new Uint8Array(await r.arrayBuffer())); events.push(g.VW_HISTORY.decodeEvent(JSON.parse(new TextDecoder().decode(raw)))); }
        baseline = null; historyBase = T.rewind(T.pieceMap(historySnapshot), events); $('.wsDiff').value = 'all'; showDiff();
        $('.wsDiffInfo').textContent = comparison.added.length + ' neu · ' + comparison.removed.length + ' entfernt (24 h bis zu diesem Snapshot, soweit aufgezeichnet)';
      } catch (e) { $('.wsDiffInfo').textContent = e.message; } finally { button.disabled = false; }
    };
    $('.wsCompare').onchange = async (e) => { try { const f = e.target.files[0]; if (!f) return; if (f.size > 100e6) throw new Error('Vergleichsdatei zu groß.'); let bytes = new Uint8Array(await f.arrayBuffer()); if (bytes[0] === 31 && bytes[1] === 139) bytes = g.fflate.gunzipSync(bytes); const s = JSON.parse(new TextDecoder().decode(bytes)); T.diff(s, api.snapshot()); baseline = s; historyBase = null; $('.wsDiff').value = 'all'; showDiff(); } catch (err) { $('.wsDiffInfo').textContent = err.message; } };
    $('.wsUndo').onclick = () => { const action = undo.pop(); if (!action) { $('.wsStatus').textContent = 'Keine eigene Änderung zum Rückgängigmachen.'; return; } const now = records[action.id]; if (now.stamp !== action.stamp || now.actor !== actor) { $('.wsStatus').textContent = 'Dieser Eintrag wurde inzwischen geändert; bitte erneut bearbeiten.'; return; } change(action.previous.kind, action.previous.data, action.previous.deleted, false); };
    $('.wsExport').onclick = () => download(exportData(), 'valheim-bereiche-projekte.json');
    $('.wsImport').onchange = async (e) => { try { const f = e.target.files[0]; if (f.size > 4e6) throw new Error('Arbeitsdatei zu groß.'); merge(JSON.parse(await f.text())); $('.wsStatus').textContent = 'Arbeitsdaten importiert.'; if (client?.connected) for (const r of Object.values(records)) client.publish(topic() + '/' + r.data.id, JSON.stringify(r), { qos: 1, retain: true }); } catch (err) { report(err.message); } };
    let team = 'standard';
    const topic = () => 'valheimwelt/workspace/v1/' + encodeURIComponent(world) + '/' + encodeURIComponent(team);
    $('.wsSync').onclick = async () => {
      if (client) { client.end(true); client = null; $('.wsSync').textContent = 'Team verbinden'; $('.wsStatus').textContent = 'Getrennt. Arbeitsdaten bleiben lokal gespeichert.'; return; }
      team = $('.wsTeam').value.trim(); if (!/^[\p{L}\p{N}_-]{1,40}$/u.test(team)) { $('.wsStatus').textContent = 'Teamraum: 1–40 Buchstaben, Zahlen, - oder _.'; return; }
      try {
        if (!g.mqtt) { const sc = document.createElement('script'); sc.src = new URL('../lib/mqtt.min.js', document.querySelector('script[src*="viewer-workspace.js"]').src); await new Promise((resolve, reject) => { sc.onload = resolve; sc.onerror = reject; document.head.appendChild(sc); }); }
        if (closed) return;
        client = g.mqtt.connect('wss://broker.emqx.io:8084/mqtt', { clientId: 'vw_ws_' + actor, clean: true, reconnectPeriod: 4000, connectTimeout: 15000 });
        client.on('connect', () => { if (closed) return; client.subscribe(topic() + '/+'); $('.wsSync').textContent = 'Team trennen'; $('.wsStatus').textContent = 'Verbunden: ' + team + '. Gleicher Welt- und Teamraum synchronisiert Bereiche und Projekte; bitte zusätzlich exportieren.'; setTimeout(() => { if (!closed && client?.connected) for (const r of Object.values(records)) client.publish(topic() + '/' + r.data.id, JSON.stringify(r), { qos: 1, retain: true }); }, 1000); });
        client.on('message', (t, bytes) => { if (closed || bytes.length > 200000 || !t.startsWith(topic() + '/')) return; try { const r = JSON.parse(new TextDecoder().decode(bytes)); if (accept(r, t.split('/').pop())) { save(); render(); } } catch (e) { /* Ignore malformed remote state. */ } });
        client.on('error', () => { if (!closed) $('.wsStatus').textContent = 'Team-Verbindung fehlgeschlagen. Lokales Speichern funktioniert weiter.'; });
        client.on('offline', () => { if (!closed) $('.wsStatus').textContent = 'Team offline; verbinde erneut …'; });
      } catch (e) { $('.wsStatus').textContent = 'Team-Verbindung nicht verfügbar; Export/Import verwenden.'; if (client) client.end(true); client = null; }
    };
    const storage = (e) => { if (e.key === storageKey && e.newValue) { try { merge({ version: 1, world, records: JSON.parse(e.newValue) }); } catch (err) { } } };
    g.addEventListener('storage', storage);
    try { records = {}; const saved = JSON.parse(localStorage.getItem(storageKey) || '{}'); for (const [id, r] of Object.entries(saved)) accept(r, id); } catch (e) { records = {}; }
    if (api.snapshot().workspace) { try { merge(api.snapshot().workspace); } catch (e) { } }
    render();
    return { rooms, projects, chestRoom, filter: () => roomFilter.value, filter3: () => room3.value, exportData,
      update() { render(); showDiff(); }, restoreLink() { const p = T.parseShare(location.hash, world); if (p) api.restore(p); else if (location.hash.startsWith('#ort=')) $('.wsStatus').textContent = 'Ortslink ist ungültig oder gehört zu einer anderen Welt.'; },
      destroy() { closed = true; if (client) client.end(true); g.removeEventListener('storage', storage); } };
  }
  g.VWWorkspace = { mount };
})(typeof self !== 'undefined' ? self : globalThis);
