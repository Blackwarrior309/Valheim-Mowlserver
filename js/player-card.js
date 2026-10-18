/* Shared player details and accessible, live player card. */
(function (g) {
  'use strict';
  const numbers = ['health', 'maxHealth', 'stamina', 'maxStamina', 'eitr', 'maxEitr', 'playedSeconds', 'deaths', 'distance', 'visits', 'since'];
  function details(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const out = {};
    for (const k of numbers) if (Number.isFinite(raw[k]) && raw[k] >= 0 && raw[k] <= 1e12) out[k] = raw[k];
    for (const k of ['left', 'right']) if (typeof raw[k] === 'string') out[k] = raw[k].slice(0, 80);
    if (Array.isArray(raw.equipment)) out.equipment = raw.equipment.slice(0, 12).filter(x => x && typeof x.name === 'string' && typeof x.slot === 'string').map(x => ({name:x.name.slice(0, 80), slot:x.slot.slice(0, 32)}));
    while (out.equipment && out.equipment.length && new TextEncoder().encode(JSON.stringify(out)).length > 1300) out.equipment.pop();
    return out;
  }
  const key = p => p.web ? 'browser:' + p.id : 'game:' + p.name;
  function create({root, players, go, switchView, follow}) {
    let selected = null, following = false, last = '', lastPlayer = null;
    const panel = document.createElement('section'); panel.className = 'vw-player-card'; panel.hidden = true;
    panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', 'Spielerkarte');
    const close = document.createElement('button'); close.textContent = '✕'; close.setAttribute('aria-label', 'Spielerkarte schließen');
    const body = document.createElement('div'), actions = document.createElement('div'); actions.className = 'row';
    const buttons = ['Folgen', 'Gehe zu', 'Ansicht wechseln'].map(label => { const b = document.createElement('button'); b.textContent = label; actions.appendChild(b); return b; });
    panel.append(close, body, actions); root.appendChild(panel);
    const escape = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const current = () => players().find(p => key(p) === selected);
    function stop() { following = false; buttons[0].textContent = 'Folgen'; buttons[0].setAttribute('aria-pressed', 'false'); }
    function render() {
      if (panel.hidden) return;
      const found = current(); if (found) lastPlayer = found; const p = found || (lastPlayer && { ...lastPlayer, online: false, details: null }); if (!p) { stop(); return; }
      const d = details(p.details) || {}, online = !!p.online;
      if (!online) stop(); buttons.forEach(b => b.disabled = !online || !Number.isFinite(p.x) || !Number.isFinite(p.z));
      const number = k => d[k] == null ? '–' : Math.round(d[k]).toLocaleString('de-DE');
      const vital = (label, k, max) => `<div><b>${label}</b> ${number(k)} / ${number(max)}${d[k] != null && d[max] > 0 ? `<meter min="0" max="${d[max]}" value="${Math.min(d[k],d[max])}" aria-label="${label}" style="width:100%"></meter>` : ''}</div>`;
      const html = `<h2>${escape(p.name)}</h2><div class="sub">${p.web ? 'Browserfigur' : online ? 'Live-Spieler' : 'Offline / letzter Weltstand'}</div>` +
        vital('Leben','health','maxHealth') + vital('Ausdauer','stamina','maxStamina') + vital('Eitr','eitr','maxEitr') +
        `<h3>Ausrüstung</h3>${Array.isArray(d.equipment) ? d.equipment.map(x => `<div>${escape(x.slot)}: ${escape(x.name)}</div>`).join('') || '<div>Keine</div>' : '<div>–</div>'}` +
        `<div>Linke Hand: ${d.left == null ? '–' : escape(d.left || 'Leer')}</div><div>Rechte Hand: ${d.right == null ? '–' : escape(d.right || 'Leer')}</div>` +
        `<h3>Statistik</h3><div>Spielzeit: ${d.playedSeconds == null ? '–' : Math.floor(d.playedSeconds / 3600) + ' h ' + Math.floor(d.playedSeconds % 3600 / 60) + ' min'}</div><div>Tode: ${number('deaths')}</div><div>Zu Fuß: ${d.distance == null ? '–' : (d.distance / 1000).toLocaleString('de-DE',{maximumFractionDigits:2}) + ' km'}</div><div>Besuche: ${number('visits')}</div>` +
        `<p class="sub">${d.since ? 'Erfasst seit ' + escape(new Date(d.since * 1000).toLocaleDateString('de-DE')) + ' · in dieser Welt.' : '– = keine Daten verfügbar. Detailwerte benötigen den aktuellen Live-Mod.'}</p>`;
      if (html !== last) { body.innerHTML = html; last = html; }
    }
    close.onclick = () => { panel.hidden = true; stop(); };
    panel.onkeydown = e => { if (e.key === 'Escape') { e.stopPropagation(); close.onclick(); } };
    buttons[0].onclick = () => { following = !following; buttons[0].textContent = following ? 'Folgen beenden' : 'Folgen'; buttons[0].setAttribute('aria-pressed', String(following)); if (following) { const p = current(); if (p) go(p); } };
    buttons[1].onclick = () => { const p = current(); if (p) go(p); };
    buttons[2].onclick = () => { const p = current(); if (p) switchView(p); };
    return { open(p) { selected = key(p); lastPlayer = p; panel.hidden = false; stop(); render(); close.focus(); }, refresh: render, stop,
      tick() { render(); const p = current(); if (following && p && p.online) follow(p); },
      destroy() { panel.remove(); } };
  }
  const api = { details, key, create };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else g.VWPlayerCard = api;
})(typeof window !== 'undefined' ? window : globalThis);
