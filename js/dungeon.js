/* Dungeon-Ansicht (nur mit dem Mod „Valheim Welt Live“ ≥ 0.6.0 auf diesem PC):
 * Grundriss der Räume von oben, eigene Figur, Mitspieler, Gegner, Truhen mit Inhalt, Aufsammelbares und Schrotthaufen.
 * Besuchte Räume werden je Dungeon im Browser gemerkt. */
(function (g) {
  'use strict';
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  function mount(pane, api) {
    const T = api.T || ((s) => s);
    pane.innerHTML = `<div class="vw-dg" style="position:absolute;inset:0;display:grid;grid-template-columns:minmax(0,1fr) 300px">
      <canvas class="dgc" style="width:100%;height:100%;display:block;background:#14181b;touch-action:none"></canvas>
      <div class="vw-side dgside" style="position:static;width:auto;max-height:none;border-radius:0;overflow:auto">
        <h2>${T('Dungeon')}</h2><div class="sub dgstat"></div>
        <div class="row" style="margin-top:6px"><button class="dgCenter">⌖ ${T('Auf mich zentrieren')}</button><button class="dgReset">${T('Besuchte Räume zurücksetzen')}</button></div>
        <h2>${T('Legende')}</h2><div class="sub" style="line-height:1.7">
          <span style="color:#4cc36b">▲</span> ${T('Du')} · <span style="color:#7fd0ff">●</span> ${T('Mitspieler')}<br>
          <span style="color:#ff5a4a">●</span> ${T('Gegner')} (★ = ${T('Sterne')}) · <span style="color:#ffd34d">■</span> ${T('Truhe')}<br>
          <span style="color:#ffb23d">◆</span> ${T('Aufsammelbar')} · <span style="color:#a07850">◆</span> ${T('Abbaubar (Schrott …)')}<br>
          <span style="display:inline-block;width:12px;height:9px;background:#4a5a52;border:1px solid #8fa"></span> ${T('besucht')} · <span style="display:inline-block;width:12px;height:9px;background:#2a3036;border:1px solid #567"></span> ${T('noch nicht besucht')}</div>
        <h2>${T('Truhen')}</h2><div class="dgchests sub"></div>
        <h2>${T('Gegner')}</h2><div class="dgenemies sub"></div>
      </div></div>`;
    const cv = pane.querySelector('.dgc'), ctx = cv.getContext('2d'), $ = (s) => pane.querySelector(s);
    let D = null, view = { cx: 0, cz: 0, s: 3 }, follow = true, visited = new Set(), dkey = '', hover = null;
    const loadVisited = () => { try { visited = new Set(JSON.parse(localStorage.getItem('vw-dungeon:' + dkey) || '[]')); } catch (e) { visited = new Set(); } };
    const saveVisited = () => { try { localStorage.setItem('vw-dungeon:' + dkey, JSON.stringify([...visited].slice(-500))); } catch (e) { } };
    const rkey = (r) => Math.round(r[0]) + ',' + Math.round(r[2]);
    const inside = (r, x, y, z) => { const a = r[3] * Math.PI / 180, dx = x - r[0], dz = z - r[2]; const lx = dx * Math.cos(a) - dz * Math.sin(a), lz = dx * Math.sin(a) + dz * Math.cos(a); return Math.abs(lx) <= r[4] / 2 + 0.5 && Math.abs(lz) <= r[6] / 2 + 0.5 && Math.abs(y - r[1]) <= r[5] / 2 + 3; };
    function update(d, creatures, players) {
      if (!d || !d.inside) { D = d; draw(); return; }
      // Dungeon wiedererkennen: Eingangsraum (oder erster Raum) als Schlüssel
      const ent = (d.rooms || []).find((r) => r[8]) || (d.rooms || [])[0]; const k = ent ? rkey(ent) : Math.round(d.x / 64) + ',' + Math.round(d.z / 64);
      if (k !== dkey) { dkey = k; loadVisited(); follow = true; }
      d.creatures = (creatures || []).filter((c) => c.y > 3000 && Math.abs(c.x - d.x) < 260 && Math.abs(c.z - d.z) < 260);
      d.players = (players || []).filter((p) => p.y > 3000 && Math.abs(p.x - d.x) < 260 && Math.abs(p.z - d.z) < 260);
      let changed = false; (d.rooms || []).forEach((r) => { if (inside(r, d.x, d.y, d.z) && !visited.has(rkey(r))) { visited.add(rkey(r)); changed = true; } }); if (changed) saveVisited();
      D = d; if (follow) { view.cx = d.x; view.cz = d.z; }
      side(); draw();
    }
    function side() {
      if (!D || !D.inside) { $('.dgstat').textContent = T('Du bist gerade in keinem Dungeon.'); return; }
      const nR = (D.rooms || []).length, nV = (D.rooms || []).filter((r) => visited.has(rkey(r))).length;
      $('.dgstat').textContent = `${nV} / ${nR} ${T('Räume besucht')} · ${(D.creatures || []).length} ${T('Gegner')} · ${(D.chests || []).length} ${T('Truhen')} · ${(D.picks || []).length} ${T('aufsammelbar')} · ${(D.rocks || []).length} ${T('abbaubar')}`;
      $('.dgchests').innerHTML = (D.chests || []).map((c) => `<div style="margin:4px 0"><b>${esc(c[3])}</b>${c[4].length ? ': ' + c[4].map(([n, k]) => esc(n) + ' ×' + k).join(', ') : ' – ' + T('leer')}</div>`).join('') || '–';
      const by = {}; (D.creatures || []).forEach((c) => { const k = c.n + (c.lv > 1 ? ' ' + '★'.repeat(c.lv - 1) : ''); by[k] = (by[k] || 0) + 1; });
      $('.dgenemies').innerHTML = Object.entries(by).map(([n, k]) => `<div>${esc(n)} ×${k}</div>`).join('') || '–';
    }
    const toS = (x, z) => { const r = cv.getBoundingClientRect(); return [r.width / 2 + (x - view.cx) * view.s, r.height / 2 - (z - view.cz) * view.s]; };
    function draw() {
      const r = cv.getBoundingClientRect(); if (!r.width) return; const dpr = Math.min(2, devicePixelRatio || 1);
      if (cv.width !== Math.round(r.width * dpr)) { cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr); }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.fillStyle = '#14181b'; ctx.fillRect(0, 0, r.width, r.height);
      if (!D || !D.inside) { ctx.fillStyle = '#9aa'; ctx.font = '15px system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.fillText(T('Geh mit deiner Figur in eine Krypta oder Höhle – dann erscheint hier der Grundriss.'), r.width / 2, r.height / 2); return; }
      // Räume (gedrehte Rechtecke), nach Höhe sortiert: tiefere Stockwerke zuerst
      const rooms = (D.rooms || []).slice().sort((a, b) => a[1] - b[1]);
      rooms.forEach((rm) => {
        const [x, y] = toS(rm[0], rm[2]), a = rm[3] * Math.PI / 180, vis = visited.has(rkey(rm)), here = inside(rm, D.x, D.y, D.z), other = Math.abs(rm[1] - D.y) > 6;
        ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.globalAlpha = other ? 0.35 : 1;
        ctx.fillStyle = here ? '#5c7a62' : vis ? '#4a5a52' : '#2a3036'; ctx.strokeStyle = here ? '#bfffd0' : vis ? '#8fa' : '#567'; ctx.lineWidth = here ? 2 : 1;
        ctx.fillRect(-rm[4] / 2 * view.s, -rm[6] / 2 * view.s, rm[4] * view.s, rm[6] * view.s); ctx.strokeRect(-rm[4] / 2 * view.s, -rm[6] / 2 * view.s, rm[4] * view.s, rm[6] * view.s);
        ctx.restore();
      });
      ctx.globalAlpha = 1; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const mark = (list, fn) => (list || []).forEach((it) => { const [x, y] = toS(it[0], it[2]); ctx.globalAlpha = Math.abs(it[1] - D.y) > 6 ? 0.4 : 1; fn(x, y, it); });
      mark(D.rocks, (x, y) => { ctx.fillStyle = '#a07850'; ctx.beginPath(); ctx.moveTo(x, y - 5); ctx.lineTo(x + 5, y); ctx.lineTo(x, y + 5); ctx.lineTo(x - 5, y); ctx.fill(); });
      mark(D.picks, (x, y) => { ctx.fillStyle = '#ffb23d'; ctx.beginPath(); ctx.moveTo(x, y - 5); ctx.lineTo(x + 5, y); ctx.lineTo(x, y + 5); ctx.lineTo(x - 5, y); ctx.fill(); });
      mark(D.chests, (x, y, c) => { ctx.fillStyle = c[4].length ? '#ffd34d' : '#8a7a40'; ctx.strokeStyle = '#2a1d08'; ctx.lineWidth = 1.5; ctx.fillRect(x - 5, y - 4, 10, 8); ctx.strokeRect(x - 5, y - 4, 10, 8); });
      ctx.globalAlpha = 1;
      (D.creatures || []).forEach((c) => { const [x, y] = toS(c.x, c.z); ctx.globalAlpha = Math.abs(c.y - D.y) > 6 ? 0.4 : 1; ctx.fillStyle = c.tame ? '#4cc36b' : c.boss ? '#ff2fd0' : '#ff5a4a'; ctx.strokeStyle = '#000'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        if (c.lv > 1) { ctx.fillStyle = '#ffe680'; ctx.font = 'bold 10px system-ui,sans-serif'; ctx.fillText('★'.repeat(c.lv - 1), x, y - 10); }
        if (c.mhp > 0) { ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(x - 8, y + 7, 16, 3); ctx.fillStyle = '#e04a3c'; ctx.fillRect(x - 8, y + 7, 16 * Math.max(0, Math.min(1, c.hp / c.mhp)), 3); } });
      ctx.globalAlpha = 1;
      (D.players || []).forEach((p) => { if (Math.abs(p.x - D.x) < 0.5 && Math.abs(p.z - D.z) < 0.5) return; const [x, y] = toS(p.x, p.z); ctx.fillStyle = '#7fd0ff'; ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#fff'; ctx.font = '11px system-ui,sans-serif'; ctx.fillText(p.name, x, y - 11); });
      // eigene Figur als Pfeil in Blickrichtung
      { const [x, y] = toS(D.x, D.z), a = (D.r || 0) * Math.PI / 180; ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.fillStyle = '#4cc36b'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(6, 7); ctx.lineTo(0, 3); ctx.lineTo(-6, 7); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore(); }
      if (hover) { ctx.font = '12px system-ui,sans-serif'; ctx.textAlign = 'left'; const w = ctx.measureText(hover.t).width + 12; ctx.fillStyle = 'rgba(10,14,16,.9)'; ctx.fillRect(hover.x + 12, hover.y - 10, w, 22); ctx.fillStyle = '#f1e6cf'; ctx.fillText(hover.t, hover.x + 18, hover.y + 1); }
      ctx.textBaseline = 'alphabetic';
    }
    // Bedienung: ziehen = verschieben (beendet Mitlaufen), Mausrad = Zoom
    let drag = null;
    cv.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY }; cv.setPointerCapture(e.pointerId); });
    cv.addEventListener('pointermove', (e) => {
      if (drag) { view.cx -= (e.clientX - drag.x) / view.s; view.cz += (e.clientY - drag.y) / view.s; drag = { x: e.clientX, y: e.clientY }; follow = false; draw(); return; }
      if (!D || !D.inside) return; const r = cv.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top; let best = null, bd = 12;
      const test = (x, z, t) => { const [sx, sy] = toS(x, z), d = Math.hypot(sx - mx, sy - my); if (d < bd) { bd = d; best = { x: mx, y: my, t }; } };
      (D.chests || []).forEach((c) => test(c[0], c[2], c[3] + (c[4].length ? ': ' + c[4].map(([n, k]) => n + ' ×' + k).join(', ') : ' – ' + T('leer'))));
      (D.picks || []).forEach((p) => test(p[0], p[2], p[3])); (D.rocks || []).forEach((p) => test(p[0], p[2], p[3]));
      (D.creatures || []).forEach((c) => test(c.x, c.z, c.n + (c.lv > 1 ? ' ' + '★'.repeat(c.lv - 1) : '') + ' ❤ ' + Math.round(c.hp) + ' / ' + Math.round(c.mhp)));
      if ((best && best.t) !== (hover && hover.t)) { hover = best; draw(); }
    });
    const up = () => { drag = null; }; cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    cv.addEventListener('wheel', (e) => { e.preventDefault(); view.s = Math.max(0.5, Math.min(20, view.s * Math.exp(-e.deltaY * 0.0015))); draw(); }, { passive: false });
    $('.dgCenter').onclick = () => { follow = true; if (D && D.inside) { view.cx = D.x; view.cz = D.z; } draw(); };
    $('.dgReset').onclick = () => { visited = new Set(); saveVisited(); draw(); side(); };
    g.addEventListener('resize', () => draw());
    side();
    return { update, draw };
  }
  g.VWDungeon = { mount };
})(typeof window !== 'undefined' ? window : globalThis);
