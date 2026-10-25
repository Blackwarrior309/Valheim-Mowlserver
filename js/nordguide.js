/* Tab „Hoher Norden“: Crafting-Kompendium (Waffen, Magie, Schilde, Rüstung, Trinkets, Kochen) im Stil des Viewers.
 * VWNordGuide.mount(el, { onMap }) – rendert einmal, danach nur Filter/Suche. Abhaken wird nur im eigenen Browser gemerkt. */
(function (g) {
  'use strict';
  const CSS = `
.ng{max-width:1180px;margin:0 auto;padding:16px 16px 40px}
.ng h2{font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--mut);margin:22px 0 8px;font-weight:700}
.ng .hero{display:flex;flex-wrap:wrap;gap:14px;align-items:flex-end;justify-content:space-between}
.ng .hero h1{font-size:22px;margin:0 0 4px}.ng .hero p{margin:0;color:var(--mut);max-width:640px}
.ng .stats{display:flex;gap:8px;flex-wrap:wrap}.ng .stat{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:6px 12px;text-align:center;min-width:84px}
.ng .stat b{display:block;font-size:18px;color:var(--acc)}.ng .stat span{font-size:11px;color:var(--mut)}
.ng .steps{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:8px}
.ng .step{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:10px 12px}.ng .step b{color:var(--acc);margin-right:6px}
.ng .step p{margin:4px 0 0;color:var(--mut);font-size:13px}
.ng .ngBar{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-bottom:8px}
.ng .ngBar input[type=search]{flex:1;min-width:180px}
.ng .cards{display:grid;align-items:start;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:8px}
.ng .it{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:10px 12px;display:flex;flex-direction:column;gap:6px}
.ng .it.done{opacity:.55}.ng .it.done h3::after{content:' ✓';color:#4cc36b}
.ng .it .ty{font-size:11px;color:var(--mut);text-transform:uppercase;letter-spacing:.05em}
.ng .it h3{margin:0;font-size:15px}.ng .it .sl{font-size:13px;color:var(--acc);font-variant-numeric:tabular-nums}
.ng .it .st{font-size:12px;color:var(--mut)}
.ng .it .row{display:flex;justify-content:space-between;align-items:center;gap:6px;margin-top:auto}
.ng .it .det{display:none;font-size:13px;border-top:1px solid var(--line);padding-top:6px}.ng .it.open .det{display:block}
.ng .it .det b{display:block;font-size:11px;color:var(--mut);text-transform:uppercase;letter-spacing:.05em;margin-top:6px}.ng .it .det p{margin:2px 0 0}
.ng .tag{font-size:11px;padding:2px 8px;border-radius:99px;background:var(--chip);border:1px solid var(--line)}
.ng .tag.Frostfeuer{border-color:#4f9be0}.ng .tag.Donnerblut{border-color:#a874e6}
.ng .mats{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:8px}
.ng .mat{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:10px 12px;font-size:13px}.ng .mat p{margin:4px 0 0;color:var(--mut)}
.ng .empty{color:var(--mut);padding:20px;text-align:center;grid-column:1/-1}
.ng .src{font-size:12px;color:var(--mut)}.ng .src a{color:var(--acc)}
.ng .it{padding:0;overflow:hidden}.ng .it>:not(.vis){margin-left:12px;margin-right:12px}.ng .it>.ty{margin-top:8px}.ng .it>.row{margin-bottom:10px}
.ng .vis{height:96px;display:flex;align-items:center;justify-content:center;background:radial-gradient(ellipse at center,#294d57 0%,#132832 70%);border-bottom:1px solid var(--line)}.ng .vis svg{height:76px;width:96px;filter:drop-shadow(0 6px 9px #0008)}
.ng .mv{float:right;width:52px;height:52px;margin:0 0 6px 10px;background:#203b43;border:1px solid #3e6267;border-radius:10px;display:grid;place-items:center}.ng .mv svg{width:40px;height:40px}
.ng .vnote{font-size:12px;color:var(--mut);margin:4px 0 0}
.ng .lv{align-self:flex-start;font-size:12px;font-weight:700;padding:2px 9px;border-radius:99px;background:var(--hl);border:1px solid var(--acc)}
.ng .inv{font-size:12.5px;font-weight:600;padding:5px 8px;border-radius:8px;background:var(--chip);border:1px solid var(--line)}.ng .inv.have{border-color:#4cc36b;color:#2f9a4c}.ng .inv.can{border-color:var(--acc)}.ng .inv.no{color:var(--mut)}
.ng .it.got{border-color:#4cc36b}.ng .kl{list-style:none;margin:2px 0 0;padding:0}.ng .kl li{display:flex;justify-content:space-between;gap:6px;padding:1px 0}.ng .kl li.no{color:#d0584a}.ng .kl a{color:inherit}.ng .kl .h{color:var(--mut);font-variant-numeric:tabular-nums}
@media (prefers-color-scheme: dark){.ng .inv.have{color:#7fe09a}}
.ng label.ck{display:flex;gap:6px;align-items:center;font-size:12px;cursor:pointer}`;
  /* Stilisierte Offline-Illustrationen (keine Original-Spielgrafiken) aus dem Guide „mit Bildern“ */
  function symbol(kind){let k=kind.toLowerCase(),shape='';if(/schwert|sword|klinge/.test(k))shape='<path d="M48 10 L55 10 L58 58 L52 70 L46 58 Z" fill="#c3e5ed" stroke="#e7f5fa" stroke-width="2"/><path d="M29 61 L75 61" stroke="#d9b67b" stroke-width="8" stroke-linecap="round"/><path d="M52 65 L52 87" stroke="#a57b50" stroke-width="8" stroke-linecap="round"/>';else if(/bogen|bow|armbrust|crossbow/.test(k))shape='<path d="M36 11 Q85 48 36 88" fill="none" stroke="#e0bd85" stroke-width="9"/><path d="M36 11 L36 88 M23 49 L79 49" stroke="#d6edf2" stroke-width="3"/><path d="M70 44 L81 49 L70 54" fill="#b4d9e3"/>';else if(/schild|shield|buckler/.test(k))shape='<path d="M52 12 L84 26 L79 62 Q67 82 52 90 Q37 82 25 62 L20 26 Z" fill="#6593a0" stroke="#e7d49c" stroke-width="5"/><path d="M52 24 L52 76 M31 46 L73 46" stroke="#cbe7e8" stroke-width="5"/>';else if(/stab|staff|magie|caller|spike|vengeance/.test(k))shape='<path d="M34 90 L66 23" stroke="#c5a67b" stroke-width="9" stroke-linecap="round"/><path d="M66 8 L81 24 L65 42 L50 24 Z" fill="#91e6ed" stroke="#e1fbff" stroke-width="3"/>';else if(/rüstung|armor|brust|helm|hood|hose|greaves|cape|umhang|mantel|robe|caller|warrior|scout/.test(k))shape='<path d="M37 18 L25 30 L15 58 L32 65 L38 53 L38 88 L68 88 L68 53 L74 65 L91 58 L81 30 L68 18 L60 31 L45 31 Z" fill="#6c9aa1" stroke="#e5d19d" stroke-width="4"/>';else if(/keule|mace|hammer|axe|axt|speer|spear|atgeir/.test(k))shape='<path d="M49 87 L58 27" stroke="#c9aa7a" stroke-width="8" stroke-linecap="round"/><path d="M35 13 L74 13 L80 40 L30 40 Z" fill="#b4d4dc" stroke="#e8f5fa" stroke-width="3"/>';else if(/fleisch|meat|elch|robbe|fisch|fish/.test(k))shape='<path d="M28 34 Q39 8 66 22 Q89 39 64 63 Q41 85 24 59 Q16 46 28 34 Z" fill="#bd7469" stroke="#f2b2a0" stroke-width="4"/><circle cx="44" cy="42" r="9" fill="#f5d1b5"/>';else if(/beere|berry|preisel|lingon/.test(k))shape='<circle cx="38" cy="39" r="15" fill="#dc777f"/><circle cx="66" cy="43" r="16" fill="#c55369"/><circle cx="52" cy="65" r="15" fill="#e58b90"/><path d="M52 30 L55 12" stroke="#8ab98c" stroke-width="5"/>';else if(/eis|frost|ice/.test(k))shape='<path d="M52 7 L82 43 L65 91 L30 75 L21 39 Z" fill="#91d6e6" stroke="#e4fbff" stroke-width="4"/><path d="M52 7 L52 76 L82 43 L21 39" fill="none" stroke="#e7ffff" stroke-width="3"/>';else if(/gold|metall|bloodgold/.test(k))shape='<path d="M24 58 L37 25 L72 25 L84 58 L73 79 L32 79 Z" fill="#d3a866" stroke="#ffe0a1" stroke-width="4"/><path d="M37 25 L49 58 L84 58" fill="none" stroke="#ffdfa1" stroke-width="3"/>';else if(/holz|timber|ast|branch/.test(k))shape='<path d="M24 74 L73 22" stroke="#9b6d4c" stroke-width="17" stroke-linecap="round"/><path d="M37 60 L21 38 M55 42 L82 38" stroke="#c49b6e" stroke-width="8" stroke-linecap="round"/>';else if(/trinket|amulett|anhänger/.test(k))shape='<circle cx="52" cy="50" r="27" fill="#618b95" stroke="#e9c786" stroke-width="7"/><path d="M52 30 L68 50 L52 70 L36 50 Z" fill="#bcebf0"/>';else shape='<path d="M52 12 L82 31 L72 75 L52 90 L32 75 L22 31 Z" fill="#719fa5" stroke="#e7c98c" stroke-width="4"/><path d="M52 23 L62 47 L52 76 L42 47 Z" fill="#d2ecdf"/>';return `<svg viewBox="0 0 104 100" role="img" aria-label="Stilisierte Illustration" xmlns="http://www.w3.org/2000/svg">${shape}</svg>`}
  /* Benötigte Stationsstufe (Recherche 24.10.2026: Valheim-Wiki, bamboogaming, allthings.how, metabot, physgun) */
  function lvl(x) {
    const n = x.name, gr = x.group, c = x.category;
    if (c === 'Kochen') { const m = x.station.match(/Stufe (\d)/); return m ? { b: 'Kessel ' + m[1], t: x.station } : { b: '', t: x.station }; }
    if (gr === 'Umhänge') return { b: 'Handwerkstisch 4', t: 'Handwerkstisch Stufe 4' };
    if (/Wurzelschild/.test(n)) return { b: 'Werkbank 2', t: 'Werkbank Stufe 2' };
    if (c === 'Trinkets') return { b: 'Schmiede 1', t: 'Schwarze Schmiede Stufe 1' };
    if (c === 'Magie' || gr === 'Rufer') return { b: 'Galdrtisch 3', t: 'Guss: Galdrtisch Stufe 3 → fertig in der Frostgießerei' };
    if (gr === 'Frostfeuer') return { b: 'Schmiede 4', t: 'Schwarze Schmiede Stufe 4 (fertige Nord-Waffe + Essenz)' };
    if (gr === 'Donnerblut') return { b: 'Schmiede 4?', t: 'Schwarze Schmiede Stufe 4 (fertige Nord-Waffe + Essenz) – Stufe unbestätigt' };
    return { b: 'Schmiede 4', t: 'Guss: Schwarze Schmiede Stufe 4 → fertig in der Frostgießerei · Aufwerten: Schmiede Stufe 5 / 6' };
  }
  /* Englische Spielnamen für den Abgleich mit dem Kistenbestand */
  const PRE = { Nord: 'Nord', Frostfeuer: 'Frostfire', Donnerblut: 'Thunderblood' };
  function enNames(x) {
    const p = (x.name.match(/\(([^)]+)\)\s*$/) || [])[1], base = p || x.name.replace(/-/g, ' ');
    const out = [];
    if ((x.category === 'Waffen' || x.category === 'Schilde') && PRE[x.group] && p) out.push(PRE[x.group] + ' ' + p);
    if (x.category === 'Schilde' && /^Nord/.test(x.name) && p) out.push('Nord ' + p);
    out.push(base, x.name.replace(/-/g, ' '));
    return out;
  }
  /* Zutaten auf Deutsch (Spieldaten liefern englische Namen) */
  const DE = { 'Bloodgold': 'Blutgold', 'Timberwood': 'Bauholz', 'Frostfire Essence': 'Frostfeuer-Essenz', 'Thunderblood Essence': 'Donnerblut-Essenz', 'Moose Hide': 'Elchfell', 'Moose Meat': 'Elchfleisch', 'Moose Sinew': 'Elchsehne', 'Moose Trophy': 'Elchtrophäe', 'Seal Pelt': 'Robbenfell', 'Seal Blubber': 'Robbenfett', 'Nornathread': 'Nornengarn', 'Frozen Branch': 'Gefrorener Ast', 'Hexen Trophy': 'Hexentrophäe', 'Ice': 'Eis', 'Elaking Hair Bundle': 'Elaking-Haarbündel', 'Long Claws': 'Lange Klauen', 'Kale': 'Grünkohl', 'Oat Flour': 'Hafermehl', 'Oats': 'Hafer', 'Lingonberries': 'Preiselbeeren', 'Oat Milk': 'Hafermilch', 'Raw fish': 'Roher Fisch', 'Leather Straps': 'Lederriemen', 'Liquid Frost': 'Flüssiger Frost', 'Memorial Coal': 'Gedenkkohle', 'Petrified Tissue': 'Versteinertes Gewebe', 'Fine Wood': 'Edelholz', 'Roots': 'Wurzeln', 'Refined Eitr': 'Veredeltes Eitr' };
  let ENDE = null;
  function de(en) {
    if (!ENDE) { ENDE = Object.assign({}, DE); ((g.VW_NORD && g.VW_NORD.items) || []).forEach((x) => { enNames(x).forEach((n, i) => { if (i === 0 && !ENDE[n]) ENDE[n] = x.name.replace(/\s*\([^)]*\)\s*$/, ''); }); }); }
    const m = en.match(/^(Mould|Cast): (.+)$/); if (m) return (m[1] === 'Mould' ? 'Form: ' : 'Guss: ') + (ENDE[m[2]] || m[2]);
    return ENDE[en] || en;
  }
  const CATS = ['Alle', 'Waffen', 'Magie', 'Schilde', 'Rüstung', 'Trinkets', 'Kochen'];
  const KEY = 'vw-nord-checked';
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function mount(el, opts) {
    opts = opts || {};
    const D = g.VW_NORD || { items: [], materials: {} }, I = D.items;
    if (!document.getElementById('ng-css')) { const st = document.createElement('style'); st.id = 'ng-css'; st.textContent = CSS; document.head.appendChild(st); }
    let checked = new Set(); try { checked = new Set(JSON.parse(localStorage.getItem(KEY) || '[]')); } catch (e) { }
    const save = () => { try { localStorage.setItem(KEY, JSON.stringify([...checked])); } catch (e) { } };
    let cat = 'Alle';
    el.innerHTML = `<div class="ng">
  <div class="hero"><div><h1>❄ Der Hohe Norden – Crafting-Kompendium</h1><p>Waffen, Magie, Rüstungen, Schmuckstücke und Kochen: Fundorte, Materialien und Stationen. Spoilerarm – verborgene Abschlussbelohnungen sind nicht enthalten.</p></div>
    <div class="stats"><div class="stat"><b>${I.filter((x) => x.category !== 'Kochen').length}</b><span>Ausrüstung</span></div><div class="stat"><b>${I.filter((x) => x.category === 'Kochen').length}</b><span>Nahrung</span></div><div class="stat"><b>${I.filter((x) => x.category === 'Magie').length}</b><span>Magiewaffen</span></div><div class="stat"><b class="ngHave">–</b><span>📦 im Lager</span></div><div class="stat"><b class="ngCan">–</b><span>✔ herstellbar</span></div><div class="stat"><b class="ngDone">0</b><span>Abgehakt</span></div></div></div>
  <h2>Vom Fundstück zur fertigen Waffe</h2>
  <div class="steps"><div class="step"><b>1</b>Form finden<p>In Dungeons, Truhen oder als Beute im Hohen Norden.</p></div><div class="step"><b>2</b>Guss herstellen<p>Schwarze Schmiede Stufe 4 (Stäbe &amp; Rufer-Set: Galdrtisch Stufe 3) mit Blutgold und weiteren Rohstoffen.</p></div><div class="step"><b>3</b>Fertigstellen<p>In der Frostgießerei mit flüssigem Frost aushärten (5 Frost, 50 s). Aufwerten auf Qualität 2/3: Schmiede Stufe 5/6.</p></div><div class="step"><b>✦</b>Elementar verbessern<p>Frostfeuer-/Donnerblut-Essenz von den Ahnen an den Uralten Altären (Gedenkstätten). <button class="ngMap" style="margin-top:6px">🕯 Altäre auf der Karte</button></p></div></div>
  <h2>Alle Gegenstände</h2>
  <div class="ngBar"><div class="vw-tabs ngCats">${CATS.map((c) => `<button data-c="${c}" class="${c === cat ? 'on' : ''}">${c}</button>`).join('')}</div><input type="search" class="ngQ" placeholder="Suchen: Gegenstand, Zutat, Fundort …"><select class="ngG"></select><select class="ngS" title="Abgleich mit euren Kisten"><option value="">Kisten: alle</option><option value="have">📦 Haben wir</option><option value="can">✔ Herstellbar</option><option value="miss">✘ Fehlt was</option></select><button class="ngR">Zurücksetzen</button></div>
  <div class="cards ngCards"></div>
  <p class="vnote">Bildhinweis: Die Symbole sind stilisierte Illustrationen, keine originalen Valheim-Gegenstandsbilder.</p>
  <h2>Rohstoff-Lexikon – wo finde ich die Materialien?</h2>
  <div class="mats">${Object.entries(D.materials).map(([k, v]) => `<div class="mat"><div class="mv">${symbol(k)}</div><b>${esc(k)}</b><p>${esc(v)}</p></div>`).join('')}</div>
  <h2>Quellen</h2>
  <p class="src">Recherche Oktober 2026, Valheim 1.0.20 – Werte und Rezepte können sich durch Patches ändern; manche Rezepte sind unbestätigt. Inoffiziell, nicht mit Iron Gate verbunden.<br>
  <a href="https://www.valheimgame.com/news/valheim-1-0-has-arrived-/" target="_blank" rel="noopener">Patchnotes</a> · <a href="https://allthings.how/valheim-1-0-deep-north-weapons-and-armor-stats-and-recipes/" target="_blank" rel="noopener">Waffen &amp; Rüstungen</a> · <a href="https://valheim.weirdgloop.org/w/Food" target="_blank" rel="noopener">Nahrung</a> · <a href="https://www.bamboogaming.net/valheim/trinkets" target="_blank" rel="noopener">Trinkets</a> · <a href="https://www.valheim.tools/biomes/deep-north" target="_blank" rel="noopener">Hoher Norden</a></p></div>`;
    const $ = (s) => el.querySelector(s), q = $('.ngQ'), gs = $('.ngG'), cards = $('.ngCards');
    const done = () => { $('.ngDone').textContent = checked.size; };
    function groups() { const gr = [...new Set(I.filter((x) => cat === 'Alle' || x.category === cat).map((x) => x.group))]; gs.innerHTML = '<option value="Alle">Alle Varianten</option>' + gr.map((v) => `<option>${esc(v)}</option>`).join(''); }
    let INV = {};
    const fmt = (n) => Number(n).toLocaleString('de-DE');
    function scan() { INV = {}; if (!opts.lookup) return; I.forEach((x, i) => { try { INV[i] = opts.lookup(enNames(x)); } catch (e) { INV[i] = null; } }); const v = Object.values(INV).filter(Boolean); $('.ngHave').textContent = v.length ? v.filter((r) => r.have > 0).length : '–'; $('.ngCan').textContent = v.length ? v.filter((r) => r.can > 0).length : '–'; }
    const stat = (r) => !r ? '' : r.have > 0 ? 'have' : r.can > 0 ? 'can' : r.rows.length ? 'miss' : '';
    function invHtml(r) {
      if (!r) return '';
      if (r.have > 0) return `<div class="inv have">📦 ${fmt(r.have)}× in euren Kisten${r.can > 0 ? ` · nochmal herstellbar ×${fmt(r.can)}` : ''}</div>`;
      if (r.can > 0) return `<div class="inv can">✔ Alle Zutaten da – herstellbar ×${fmt(r.can)}</div>`;
      if (!r.rows.length) return '<div class="inv no">✘ Nicht in den Kisten</div>';
      const miss = r.rows.filter((z) => z.have < z.need).map((z) => `${fmt(z.need - z.have)} ${de(z.raw)}`);
      return `<div class="inv no">✘ Es fehlt: ${esc(miss.slice(0, 3).join(', '))}${miss.length > 3 ? ' …' : ''}</div>`;
    }
    function kl(r) {
      if (!r || !r.rows.length) return '';
      return `<b>Aus euren Kisten</b><ul class="kl">${r.rows.map((z) => `<li class="${z.have >= z.need ? 'ok' : 'no'}"><span>${z.have >= z.need ? '✔' : '✘'} ${fmt(z.need)} × <a href="#" class="ngK" data-n="${esc(z.raw)}" title="In der Kisten-Liste suchen">${esc(de(z.raw))}</a></span><span class="h">${fmt(z.have)} da</span></li>`).join('')}</ul>`;
    }
    function render() {
      const t = q.value.trim().toLocaleLowerCase('de'), gv = gs.value, sv = $('.ngS').value;
      const list = I.map((x, i) => Object.assign({ id: i }, x)).filter((x) => (cat === 'Alle' || x.category === cat) && (gv === 'Alle' || x.group === gv) && [x.name, x.category, x.group, x.station, x.ingredients, x.find, x.details, x.stats].join(' ').toLocaleLowerCase('de').includes(t) && (!sv || (sv === 'can' ? (INV[x.id] && INV[x.id].can > 0) : stat(INV[x.id]) === sv)));
      cards.innerHTML = list.length ? list.map((x) => { const food = x.category === 'Kochen'; const L = lvl(x); const sl = food ? x.stats.replace('❤', '❤ Leben').replace('⚡', '⚡ Ausdauer').replace('✦', '✦ Eitr') : x.stats;
        const r = INV[x.id]; return `<article class="it${checked.has(x.id) ? ' done' : ''}${r && r.have > 0 ? ' got' : ''}" data-id="${x.id}"><div class="vis">${symbol(x.name)}</div><span class="ty">${esc(x.category)} · ${esc(x.group)}</span><h3>${esc(x.name)}</h3>${L.b ? `<span class="lv" title="Benötigte Stationsstufe">⚒ ${esc(L.b)}</span>` : ''}<div class="sl">${esc(sl)}</div><div class="st">⌂ ${esc(L.t)}</div>${invHtml(r)}
<div class="det">${kl(r)}<b>Rezept / Materialien</b><p>${esc(x.ingredients)}</p><b>Fundort &amp; Beschaffung</b><p>${esc(x.find)}</p>${x.details ? `<b>Besonderheiten</b><p>${esc(x.details)}</p>` : ''}</div>
<div class="row"><label class="ck"><input type="checkbox"${checked.has(x.id) ? ' checked' : ''}> hab ich</label><span class="tag ${esc(x.tag)}">${esc(x.tag)}</span><button class="ngT">Details +</button></div></article>`; }).join('') : '<div class="empty">Keine Treffer – anderen Begriff versuchen.</div>';
    }
    $('.ngCats').addEventListener('click', (e) => { const b = e.target.closest('button[data-c]'); if (!b) return; cat = b.dataset.c; el.querySelectorAll('.ngCats button').forEach((x) => x.classList.toggle('on', x === b)); groups(); render(); });
    q.addEventListener('input', render); gs.addEventListener('change', render); $('.ngS').addEventListener('change', render);
    $('.ngR').onclick = () => { q.value = ''; $('.ngS').value = ''; cat = 'Alle'; el.querySelectorAll('.ngCats button').forEach((x) => x.classList.toggle('on', x.dataset.c === 'Alle')); groups(); render(); };
    cards.addEventListener('click', (e) => { const k = e.target.closest('.ngK'); if (k) { e.preventDefault(); if (opts.onChests) opts.onChests(k.dataset.n); return; } const b = e.target.closest('.ngT'); if (!b) return; const a = b.closest('.it'); const o = a.classList.toggle('open'); b.textContent = o ? 'Schließen −' : 'Details +'; });
    cards.addEventListener('change', (e) => { if (!e.target.matches('.ck input')) return; const a = e.target.closest('.it'), id = +a.dataset.id; if (e.target.checked) checked.add(id); else checked.delete(id); save(); a.classList.toggle('done', e.target.checked); done(); });
    $('.ngMap').onclick = () => { if (opts.onMap) opts.onMap(); };
    scan(); groups(); render(); done();
    return { refresh: () => { scan(); render(); } };
  }
  g.VWNordGuide = { mount };
})(typeof window !== 'undefined' ? window : globalThis);
