/* Valheim Welt-Viewer – Anzeige eines .vwelt-Snapshots (inoffiziell).
 * VWViewer.mount(element, snapshot, { actions:[{label,onClick,primary}], status:'' })
 *   → { update(snapshot), setStatus(text), destroy() }
 * Benötigt three.js r128 (global THREE).
 */
(function (g) {
  'use strict';
  const WL = 30;
  const CSS = `
.vw{--bg:#12171b;--panel:rgba(22,28,33,.94);--card:#1a2126;--fg:#ece6d8;--mut:#9aa39f;--acc:#e0a854;--line:#2d373d;--chip:#222b31;--hl:rgba(224,168,84,.28);
  position:fixed;inset:0;display:flex;flex-direction:column;background:var(--bg);color:var(--fg);font:14px/1.45 system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
@media (prefers-color-scheme: light){.vw:not(.dark){--bg:#e9e5dc;--panel:rgba(252,250,245,.95);--card:#fffdf8;--fg:#22201c;--mut:#666055;--acc:#9c5d12;--line:#dcd4c4;--chip:#efe9dc;--hl:rgba(156,93,18,.18)}}
.vw *{box-sizing:border-box}.vw [hidden]{display:none!important}
.vw button{font:inherit;font-size:13px;color:var(--fg);background:var(--chip);border:1px solid var(--line);border-radius:8px;padding:6px 10px;cursor:pointer}
.vw button.on{border-color:var(--acc);box-shadow:inset 0 0 0 1px var(--acc)}
.vw button.pri{background:var(--acc);border-color:var(--acc);color:#1b1408;font-weight:600}
.vw input[type=search],.vw select{font:inherit;font-size:13px;padding:7px 10px;border-radius:8px;border:1px solid var(--line);background:var(--chip);color:var(--fg);min-width:0}
.vw-top{display:flex;align-items:center;gap:10px;padding:8px 14px;border-bottom:1px solid var(--line);flex-wrap:wrap;background:var(--panel);z-index:5}
.vw-title{font-weight:700;font-size:16px;margin-right:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:40vw}
.vw-tabs{display:flex;gap:4px;flex-wrap:wrap}.vw-tabs button{background:none;border-color:transparent}.vw-tabs button.on{background:var(--chip);border-color:var(--acc);box-shadow:none}
.vw-act{margin-left:auto;display:flex;gap:6px;flex-wrap:wrap;align-items:center}
.vw-status{font-size:12px;color:var(--mut)}
.vw-main{position:relative;flex:1;min-height:0}
.vw-pane{position:absolute;inset:0;overflow:hidden}
.vw-side{position:absolute;top:12px;left:12px;width:310px;max-width:calc(100% - 32px);max-height:calc(100% - 24px);overflow:auto;background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:12px 14px;z-index:3;backdrop-filter:blur(6px)}
.vw-side.min{max-height:46px;overflow:hidden}
.vw-filter{display:grid;grid-template-columns:1fr 1fr;gap:1px 8px}.vw-filter label{display:flex;align-items:center;gap:6px;padding:3px 2px;cursor:pointer;border-radius:5px;font-size:13px;white-space:nowrap;overflow:hidden}.vw-filter label:hover{background:rgba(127,127,127,.12)}.vw-filter input{margin:0;accent-color:#c8913f;flex:none}.vw-filter .ic{width:12px;text-align:center;flex:none;font-size:12px}.vw-filter .n{margin-left:auto;opacity:.55;font-size:11px}.vw-filter label[hidden]{display:none}
.vw h2{font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:var(--acc);margin:12px 0 6px}
.vw h3{font-size:15px;margin:18px 0 8px}
.vw .row{display:flex;flex-wrap:wrap;gap:6px}
.vw .sub{color:var(--mut);font-size:12px}
.vw table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:12.5px}
.vw td{padding:3px 0;border-bottom:1px solid var(--line);overflow-wrap:anywhere}.vw td.n{text-align:right;width:64px;font-variant-numeric:tabular-nums}
.vw .sw{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:6px;vertical-align:-1px}
.vw canvas.gl,.vw canvas.map{position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none}
.vw-tip{position:absolute;pointer-events:none;background:var(--panel);border:1px solid var(--line);border-radius:8px;padding:4px 8px;font-size:12px;z-index:6}
.vw-lbl{position:absolute;transform:translate(-50%,-100%);font-size:11.5px;padding:2px 6px;border-radius:6px;white-space:nowrap;pointer-events:none;background:rgba(15,20,24,.78);color:#f1e6cf;border:1px solid rgba(216,162,74,.6);z-index:2}
.vw-lbl.bed{border-color:rgba(120,180,255,.6)}.vw-lbl.tomb{border-color:rgba(255,120,120,.7)}
.vw-lbl.pl{border-color:#4cc36b;background:rgba(10,40,20,.85);color:#d9ffe3;z-index:3}.vw-lbl.ch{border-color:#ffc83d;background:rgba(40,30,8,.88);pointer-events:auto;cursor:pointer}
.vw-cres{margin-top:6px;font-size:12.5px}.vw-cres .r{display:flex;justify-content:space-between;gap:8px;padding:4px 6px;border-radius:6px;cursor:pointer;border-bottom:1px solid var(--line)}
.vw-cres .r:hover{background:var(--chip)}.vw-cres .r span:last-child{color:var(--acc);white-space:nowrap;font-variant-numeric:tabular-nums}
.vw-chest{position:absolute;right:12px;top:12px;width:290px;max-width:calc(100% - 32px);max-height:calc(100% - 24px);overflow:auto;background:var(--panel);border:1px solid var(--acc);border-radius:12px;padding:12px 14px;z-index:4}
.vw-chest h3{margin:0 26px 2px 0}.vw-chest .x{position:absolute;top:8px;right:8px;padding:2px 8px}
.vw ul.it{list-style:none;margin:0;padding:0;font-size:13px}.vw ul.it li{display:flex;justify-content:space-between;gap:8px;padding:1px 4px;border-radius:5px}
.vw ul.it li.m{background:var(--hl)}.vw ul.it li span:last-child{color:var(--mut);font-variant-numeric:tabular-nums}
.vw-joy{position:absolute;left:346px;bottom:24px;width:130px;height:130px;border-radius:50%;background:rgba(15,20,24,.45);border:2px solid rgba(216,162,74,.7);touch-action:none;z-index:5}
.vw-joy .k{position:absolute;left:50%;top:50%;width:54px;height:54px;margin:-27px 0 0 -27px;border-radius:50%;background:rgba(216,162,74,.85)}
.vw-ud{position:absolute;right:24px;bottom:24px;display:flex;flex-direction:column;gap:10px;z-index:5}
.vw-ud button{width:62px;height:62px;border-radius:50%;font-size:22px;background:rgba(15,20,24,.55);color:#f1e6cf;border:2px solid rgba(216,162,74,.7);touch-action:none;user-select:none}
.vw-ud button.on{background:rgba(216,162,74,.85);color:#1a1a1a}
.vw-hud{position:absolute;left:calc(50% + 160px);top:12px;transform:translateX(-50%);background:var(--panel);border:1px solid var(--acc);border-radius:10px;padding:6px 12px;font-size:12px;text-align:center;max-width:calc(100% - 360px);z-index:5}
.vw-prompt{position:absolute;left:calc(50% + 160px);top:62%;transform:translateX(-50%);background:rgba(15,20,24,.72);color:#f1e6cf;border:1px solid rgba(216,162,74,.8);border-radius:10px;padding:7px 14px;font-size:14px;pointer-events:none;z-index:5;white-space:nowrap}.vw-prompt .key{display:inline-block;min-width:22px;padding:1px 6px;margin-right:6px;border-radius:5px;background:rgba(216,162,74,.9);color:#1a1a1a;text-align:center}@media (max-width:760px){.vw-prompt{left:50%}}
.vw-act2{position:absolute;right:24px;bottom:24px;z-index:5}.vw-act2 button{width:66px;height:66px;border-radius:50%;font-size:26px;background:rgba(15,20,24,.55);color:#f1e6cf;border:2px solid rgba(216,162,74,.7)}@media (min-width:761px){.vw-act2{display:none}}
.vw-cross{position:absolute;left:50%;top:50%;width:14px;height:14px;margin:-7px 0 0 -7px;pointer-events:none;z-index:5}
.vw-cross:before,.vw-cross:after{content:"";position:absolute;background:rgba(255,255,255,.8)}.vw-cross:before{left:6px;top:0;width:2px;height:14px}.vw-cross:after{top:6px;left:0;height:2px;width:14px}
.vw-scroll{position:absolute;inset:0;overflow:auto;padding:18px 16px 60px}
.vw-wrap{max-width:1180px;margin:0 auto}
.vw-bar{position:sticky;top:-18px;z-index:2;background:var(--bg);padding:10px 0;display:flex;flex-wrap:wrap;gap:8px;border-bottom:1px solid var(--line)}
.vw-bar input{flex:1 1 240px}
.vw-stats{display:flex;flex-wrap:wrap;gap:10px;margin:14px 0}
.vw-stat{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:10px 14px;min-width:120px}.vw-stat b{display:block;font-size:20px}.vw-stat span{color:var(--mut);font-size:12px}
.vw-grid{display:grid;grid-template-columns:minmax(0,300px) minmax(0,1fr);gap:18px;align-items:start}
.vw-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:10px}
.vw-card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:10px 12px}.vw-card.hit{border-color:var(--acc)}
.vw-card .lab{font-weight:600;overflow-wrap:anywhere}.vw-card .lab.none{color:var(--mut);font-style:italic;font-weight:500}.vw-card .meta{color:var(--mut);font-size:11.5px;margin:2px 0 6px}
.vw-card .more{background:none;border:0;padding:0;color:var(--acc);font-size:12px;margin-top:4px}
.vw-panel{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:12px 14px}
.vw-maplist .b{display:flex;justify-content:space-between;gap:8px;padding:6px 6px;border-bottom:1px solid var(--line);cursor:pointer;border-radius:6px}.vw-maplist .b:hover{background:var(--chip)}
.vw-legend{position:absolute;right:12px;bottom:12px;background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:8px 10px;font-size:12px;z-index:3}
.vw .kcraft a.cr{color:var(--acc);text-decoration:none;border-bottom:1px dotted currentColor}.vw-mob{display:none}.vw details.perf{margin-top:12px;border:1px solid var(--line);border-radius:10px;padding:8px 10px}.vw details.perf summary{cursor:pointer;font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:var(--acc)}.vw .qrow{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:6px 0}.vw .qrow label{font-size:12.5px}.vw .qrow select{flex:0 1 190px}.vw .vw-btnlike{display:inline-block;font-size:13px;background:var(--chip);border:1px solid var(--line);border-radius:8px;padding:6px 10px}
@media (max-width:760px){.vw-grid{grid-template-columns:minmax(0,1fr)}.vw-side{top:auto;bottom:12px;left:16px;right:16px;width:auto;max-height:45%}.vw-mob{display:inline-block}
 .vw-joy{left:16px;bottom:80px;width:120px;height:120px}.vw-ud{bottom:80px;right:16px}.vw-hud{left:16px;right:84px;transform:none;max-width:none;font-size:11px}.vw-hud .k{display:none}.vw-title{max-width:60vw}.vw-legend{display:none}}
@media (min-width:761px){.vw-hud .m{display:none}}
`;
  const CAT = { wood: [0xa8794a, 'Holz'], core: [0x7a5434, 'Kernholz/Rundholz'], floor: [0x9c7448, 'Holzboden'], roof: [0x8a4f2e, 'Holzdach'], droof: [0x3b3633, 'Teer-/Dunkelholzdach'], dark: [0x4a3a2e, 'Dunkelholz'], stone: [0xa8a49a, 'Stein'], marble: [0x2b2b30, 'Schwarzer Marmor'], iron: [0x5d6266, 'Eisen'], glass: [0x9ad7e8, 'Kristall'], chest: [0xc9953e, 'Kisten'], craft: [0xd2c06a, 'Werkbänke/Stationen'], portal: [0x7d4bd6, 'Portale'], fire: [0xff7a2a, 'Feuer'], bed: [0x4f7ad1, 'Betten'], ship: [0x6b4a2a, 'Schiffe/Karren'], misc: [0xb4a58a, 'Sonstiges'] };
  const OWNC = [0xe4572e, 0x3fa7d6, 0xf6c544, 0x7bc950, 0xb57edc, 0xf28fad, 0xaaaaaa, 0x55ddcc, 0xff9f43, 0x8395a7];
  const BOSS = { eikthyr: 'Eikthyr', gdking: 'Der Älteste', bonemass: 'Knochenmasse', dragon: 'Moder', goblinking: 'Yagluth', queen: 'Die Königin', fader: 'Fader', serpent: 'Seeschlange', writhan: 'Writhan' };
  const T = (s) => (g.VW_I18N ? g.VW_I18N.t(s) : s);
  const LOC = () => (g.VW_I18N ? g.VW_I18N.locale() : 'de-DE');
  const fmt = (n) => Number(n).toLocaleString(LOC());
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const hex = (c) => '#' + c.toString(16).padStart(6, '0');
  const b64u8 = (s) => { const b = atob(s), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; };
  const PN = () => (g.VW_DATA && g.VW_DATA.pieceNames) || {};
  const pieceName = (n) => PN()[n] || n;

  function mount(root, snap, opts) {
    let destroyed = false, workspace = null;
    const cleanup = [], timers = new Set(), frames = new Set(), timeouts = new Set();
    const listen = (target, name, fn, options) => { target.addEventListener(name, fn, options); cleanup.push(() => target.removeEventListener(name, fn, options)); };
    const addEventListener = (name, fn, options) => listen(g, name, fn, options);
    const setInterval = (fn, ms) => { if (destroyed) return 0; const id = g.setInterval(() => { if (!destroyed) fn(); }, ms); timers.add(id); return id; };
    const clearInterval = (id) => { timers.delete(id); g.clearInterval(id); };
    const setTimeout = (fn, ms) => { if (destroyed) return 0; const id = g.setTimeout(() => { timeouts.delete(id); if (!destroyed) fn(); }, ms); timeouts.add(id); return id; };
    const clearTimeout = (id) => { timeouts.delete(id); g.clearTimeout(id); };
    const requestAnimationFrame = (fn) => { const id = g.requestAnimationFrame((t) => { frames.delete(id); if (!destroyed) fn(t); }); frames.add(id); return id; };
    opts = opts || {};
    if (!document.getElementById('vw-css')) { const st = document.createElement('style'); st.id = 'vw-css'; st.textContent = CSS; document.head.appendChild(st); }
    root.innerHTML = '';
    const R = document.createElement('div'); R.className = 'vw'; root.appendChild(R);
    R.innerHTML = `
<div class="vw-top"><span class="vw-title"></span>
  <div class="vw-tabs"><button data-t="map" class="on">Karte</button><button data-t="3d">3D</button><button data-t="chests">Kisten</button><button data-t="info">Welt & Spieler</button></div>
  <div class="vw-act"><span class="vw-status"></span></div></div>
<div class="vw-main">
  <div class="vw-pane" data-p="map"><canvas class="map"></canvas>
    <div class="vw-side"><button class="vw-mob" data-min>Menü</button><button class="pri w3d" style="width:100%;margin-top:4px">🌍 Ganze Welt in 3D ansehen</button><h2>Basen</h2><div class="vw-maplist"></div>
      <h2 data-en="Map layers">Karten-Ebenen</h2><div class="vw-filter"></div>
      <div class="heatCtl" hidden><div class="row" style="margin-top:6px"><select class="hPl" style="flex:1;min-width:0"></select><select class="hDays"><option value="0">Alle Tage</option><option value="1">Heute</option><option value="7">7 Tage</option><option value="30">30 Tage</option></select></div></div>
      <div class="sub mlInfo" style="margin-top:6px"></div>
      <button class="gameLink" style="width:100%;margin-top:8px" title="Braucht den Mod „Valheim Welt Live“ auf diesem PC (http://localhost:8686). Deine Position wird live auf der Karte gezeigt und an andere Besucher der Karte geschickt.">🎮 Mein Spiel live zeigen (Mod)</button>
      <h2>Legende</h2><div class="sub">● Basis (anklicken = 3D) · ◆ Portal · ▲ Boss/Ort (grau = noch nicht erkundet)<br>Ziehen = verschieben · Mausrad/Pinch = Zoom</div><div class="sub biolg" style="margin-top:6px"></div></div>
  </div>
  <div class="vw-pane" data-p="3d" hidden><canvas class="gl"></canvas><div class="vw-labels"></div>
    <div class="vw-side s3"><button class="vw-mob" data-min>Menü</button>
      <h2>Gebiet</h2><select class="reg" style="width:100%"></select>
      <h2>Ansicht</h2><div class="row"><button data-v="top">Von oben</button><button data-v="obl" class="on">Schräg</button><button data-v="near">Nah</button><button class="flyBtn">✈ Flugmodus (F)</button><button class="walkBtn">🚶 Laufen (G)</button></div><div class="row" style="margin-top:6px"><input class="walkName" type="text" maxlength="24" placeholder="Dein Name für Mitspieler" title="So sehen dich andere, die gerade auch auf dieser Karte laufen" style="flex:1;font:inherit;font-size:13px;padding:6px 9px;border-radius:8px;border:1px solid var(--line);background:var(--chip);color:var(--fg)"></div>
      <div class="tl" hidden><h2>Zeitraffer</h2><div class="row" style="flex-wrap:nowrap;align-items:center"><button class="tlPlay" aria-label="Abspielen">▶</button><input type="range" class="tlR" min="0" max="0" value="0" style="flex:1;min-width:0"></div><div class="sub tlInfo" style="margin-top:4px"></div><div class="tlList" style="max-height:170px;overflow:auto;margin-top:6px"></div></div>
      <h2>Tageszeit</h2><div class="row dnRow"><button class="dnPause" title="Uhr anhalten / weiterlaufen lassen">⏸</button><input class="dnSlider" type="range" min="0" max="1440" step="5" style="flex:1;min-width:0"><b class="dnClock" style="min-width:44px;text-align:right;font-variant-numeric:tabular-nums">12:00</b></div>
      <div class="row" style="margin-top:6px"><select class="dnMode" style="flex:1;min-width:0"><option value="server">Wie auf dem Server</option><option value="normal">Eigener Ablauf (1 Tag = 30 Min., wie im Spiel)</option><option value="fast">Schnell (1 Tag = 3 Min.)</option></select></div>
      <div class="sub dnInfo" style="margin-top:4px"></div>
      <h2>Gebäude exportieren</h2>
      <div class="row"><button class="selMode">☝ Auswählen</button><select class="selHow" style="flex:1"><option value="0">Zusammenhängendes Gebäude</option><option value="6">Umkreis 6 m</option><option value="12">Umkreis 12 m</option><option value="25">Umkreis 25 m</option><option value="1">Einzelnes Teil</option></select></div>
      <div class="row" style="margin-top:6px"><button class="selAll">Alles im Gebiet</button><button class="selClr">Leeren</button></div>
      <div class="sub selInfo" style="margin-top:4px">Klick = hinzufügen, Shift+Klick = entfernen.</div>
      <div class="selExp" hidden><input class="selName" type="text" placeholder="Name des Bauplans" style="width:100%;margin-top:6px;font:inherit;font-size:13px;padding:7px 10px;border-radius:8px;border:1px solid var(--line);background:var(--chip);color:var(--fg)"><div class="row" style="margin-top:6px"><button class="pri selBp">⬇ PlanBuild (.blueprint)</button></div><div class="sub selHint" style="margin-top:4px" data-en="For the PlanBuild mod: put the file into <code>BepInEx/config/PlanBuild/blueprints</code>, place it in game with the blueprint rune as a hologram and build it.">Für den Mod PlanBuild: Datei nach <code>BepInEx/config/PlanBuild/blueprints</code> legen, im Spiel mit der Bauplan-Rune als Hologramm platzieren und nachbauen.</div></div>
      <h2>Grafik</h2><div class="row gstyle"><button data-gs="valheim" hidden>Valheim Original</button><button data-gs="real" title="Gemalte Texturen (textures/*.jpg)">Realistisch</button><button data-gs="natur">Natur</button><button data-gs="full">Einfach</button><button data-gs="simple">Blöcke</button></div>
      <div class="sub originalStatus" role="status" hidden></div>
      <details class="perf"><summary>Leistung &amp; Grafik</summary>
        <div class="row"><button data-profile="low">Sparsam / Handy</button><button data-profile="mid">Ausgewogen</button><button data-profile="high">Detail</button></div>
        <div class="qrow"><label for="vwq-sh">Schatten</label><select id="vwq-sh" data-q="shadows"><option value="0">Aus (schnell)</option><option value="1">An – berechnet im Stillstand</option></select></div>
        <div class="qrow"><label for="vwq-de">Grafik</label><select id="vwq-de" data-q="detail"><option value="valheim" hidden disabled>Valheim Original (Modelle &amp; Texturen)</option><option value="real">Realistisch (gemalte Texturen)</option><option value="natur">Natur-Texturen (Holz, Stein, Stroh)</option><option value="full">Einfach texturiert (einfärbbar)</option><option value="simple">Blöcke (am schnellsten)</option></select></div>
        <div class="qrow"><label for="vwq-na">Natur</label><select id="vwq-na" data-q="nature"><option value="low">Wenig</option><option value="mid">Mittel</option><option value="high">Alles</option></select></div>
        <div class="qrow"><label for="vwq-re">Auflösung</label><select id="vwq-re" data-q="res"><option value="1">100 %</option><option value="0.75">75 %</option><option value="0.5">50 %</option></select></div>
        <div class="qrow"><label for="vwq-ra">Sichtweite</label><select id="vwq-ra" data-q="range"><option value="near">Nah</option><option value="mid">Mittel</option><option value="far">Weit</option></select></div>
        <div class="sub">Gezeichnet wird nur, wenn sich etwas bewegt. Schatten werden erst berechnet, wenn die Kamera kurz stillsteht, und sind im Flugmodus immer aus.</div>
      </details>
      <h2 data-en="Layers">Ebenen</h2><div class="row layers"></div>
      <div class="plOnline" hidden><h2>Spieler online</h2><div class="vw-cres plList"></div></div>
      <h2>Bauplan einblenden</h2><div class="row"><select class="plSel" style="flex:1"><option value="">Plan wählen …</option></select><label class="plFile" style="cursor:pointer"><span class="vw-btnlike">Datei …</span><input type="file" accept=".vwplan,.json" hidden></label></div>
      <div class="plCtl" hidden><div class="row" style="margin-top:6px"><button data-pm="0,4">N</button><button data-pm="0,-4">S</button><button data-pm="-4,0">W</button><button data-pm="4,0">O</button><button data-pr="90">⟲ 90°</button><button data-pr="-5">↻ 5°</button><button data-pr="5">↺ 5°</button><button data-py="0.5">Höher</button><button data-py="-0.5">Tiefer</button><button class="plGo">Hinfliegen</button><button class="plDel">Entfernen</button></div><div class="sub plPos" style="margin-top:6px"></div></div>
      <h2>Kisten durchsuchen</h2><input type="search" class="cq" placeholder="Item suchen, z. B. Eisen, Münzen …" autocomplete="off" style="width:100%">
      <div class="vw-cres cres"></div>
      <h2>Färbung</h2><div class="row"><button class="cMat on">Material</button><button class="cOwn">Erbauer</button></div><div class="legend" style="margin-top:8px"></div>
      <h2>Gebaut von</h2><table class="own"></table>
      <h2>Häufigste Bauteile</h2><table class="top"></table>
      <div class="sub" style="margin-top:10px">Ziehen = drehen · Rechtsklick/2 Finger = verschieben · Mausrad = Zoom · Doppelklick = hinzoomen · Kiste anklicken = Inhalt.<br><span data-en="Terrain is estimated from trees and rocks. The graphics setting controls object detail.">Gelände ist aus Bäumen und Steinen geschätzt. Die Grafikeinstellung bestimmt die Modelldetails.</span></div>
    </div>
    <div class="vw-tip" hidden></div><div class="vw-chest" hidden></div>
    <div class="vw-joy" hidden><div class="k"></div></div>
    <div class="vw-ud" hidden><button data-ud="up" aria-label="Hoch">▲</button><button data-ud="fast" aria-label="Schnell">»</button><button data-ud="dn" aria-label="Runter">▼</button></div>
    <div class="vw-hud" hidden></div><div class="vw-prompt" hidden></div><div class="vw-act2" hidden><button aria-label="Benutzen">✋</button></div><div class="vw-cross" hidden></div>
  </div>
  <div class="vw-pane" data-p="chests" hidden><div class="vw-scroll"><div class="vw-wrap">
    <div class="vw-bar"><input type="search" class="kq" placeholder="Item suchen, z. B. Eisen, Met, Kernholz …" autocomplete="off"><select class="ka"></select><button class="klab">Nur beschriftete</button><button class="kgame" hidden title="Öffnet die Kisten-Suche im laufenden Spiel und setzt Pins auf der Karte">🎯 Im Spiel suchen</button></div>
    <details class="vw-panel"><summary>Routen-Einstellungen</summary><div class="row"><select class="rtPlayer" aria-label="Routenstart"><option value="view">Aktuelle 3D-Position</option><option value="station">Werkstation</option></select><label><input class="rtBoat" type="checkbox"> Bootswege erlauben</label><label><input class="rtMetal" type="checkbox"> Welt erlaubt Metall durch Portale</label></div><div class="sub">Wege berücksichtigen das verfügbare Höhenraster; unbekannte Gebiete können nicht zuverlässig bewertet werden.</div></details><div class="vw-stats kstats"></div><div class="kcraft"></div><div class="kroute"></div>
    <div class="vw-grid"><div class="vw-panel"><h2 style="margin-top:0">Summe</h2><table class="ktot"></table><div class="sub" style="margin-top:8px">Klick auf ein Item filtert die Kisten. „★2“ = Ausrüstungsstufe.</div></div><div class="klist"></div></div>
  </div></div></div>
  <div class="vw-pane" data-p="info" hidden><div class="vw-scroll"><div class="vw-wrap info"></div></div></div>
</div>`;
    const $ = (s, p) => (p || R).querySelector(s), $$ = (s, p) => Array.from((p || R).querySelectorAll(s));
    const act = $('.vw-act');
    (opts.actions || []).forEach((a) => { const b = document.createElement('button'); b.textContent = a.label; if (a.primary) b.className = 'pri'; if (a.title) b.title = a.title; b.onclick = a.onClick; act.appendChild(b); });
    $$('[data-min]').forEach((b) => { b.onclick = () => b.parentElement.classList.toggle('min'); if (innerWidth <= 760) b.parentElement.classList.add('min'); });

    let S = snap, tab = 'map', LIVE = null;
    // ---- 3D-Gelände der ganzen Welt inkl. unerkundeter Gebiete (weltkarte/<Seed>.json → terrain, aus tools/weltkarte.py)
    const SEEDW = { seed: '', meta: null, data: null, reg: null, regS: null };
    function seedRegion() {
      const m = SEEDW.meta; if (!m || !m.terrain || SEEDW.seed !== (S.world && S.world.seed)) return null;
      if (SEEDW.reg && SEEDW.regS === S) return SEEDW.reg;
      const w = S.world3d || {}, t = m.terrain, x1 = t.x0 + (t.n - 1) * t.res, z1 = t.z0 + (t.n - 1) * t.res;
      SEEDW.reg = { id: 'seed', name: 'Ganze Welt mit unerkundeten Gebieten (Seed)', lazy: true, bounds: [t.x0, x1, t.z0, z1], center: w.center || [0, 0], pieceCount: w.pieceCount || 0, res: t.res, nx: t.n, nz: t.n,
        types: w.types || [], owners: w.owners || [], pieces: w.pieces || {}, labels: w.labels || [], chests: w.chests || [], builders: w.builders || [], topTypes: w.topTypes || [], natureModels: w.natureModels, nature: {} };
      SEEDW.regS = S; return SEEDW.reg;
    }
    function loadSeedMeta() {
      const sd = S.world && S.world.seed; if (!sd || SEEDW.seed === sd || !/^[\w-]+$/.test(sd) || location.protocol === 'file:') return;
      SEEDW.seed = sd; SEEDW.meta = null; SEEDW.data = null; SEEDW.reg = null;
      fetch('weltkarte/' + sd + '.json', { cache: 'no-cache' }).then((r) => (r.ok ? r.json() : null)).then((m) => { if (m && m.seed === sd && SEEDW.seed === sd && m.terrain) { SEEDW.meta = m; three.fillSelect(); } }).catch(() => { });
    }
    async function prepSeed(r) {
      if (r.H16) return;
      const t = SEEDW.meta.terrain, n = t.n, RS = t.res, X0 = t.x0, Z0 = t.z0, N = n * n;
      if (!SEEDW.data) {
        const res = await fetch('weltkarte/' + t.file); if (!res.ok) throw new Error('HTTP ' + res.status);
        const b = new Uint8Array(await res.arrayBuffer()), u = (b[0] === 0x1f && b[1] === 0x8b) ? fflate.gunzipSync(b) : b;
        SEEDW.data = { H: new Int16Array(u.buffer.slice(u.byteOffset, u.byteOffset + N * 2)), B: u.slice(N * 2, N * 3), F: u.slice(N * 3, N * 4) };
      }
      const { B, F } = SEEDW.data, H = new Int16Array(SEEDW.data.H), MK = new Uint8Array(N), ex = new Uint8Array(N);
      // erkundete Gebiete: echte Höhen aus dem Spielstand (mit Terraforming), damit Basen richtig stehen
      const w = S.world3d; let HW = null, MW = null;
      if (w && w.h) { const hu = b64u8(w.h); HW = new Int16Array(hu.buffer, hu.byteOffset, hu.byteLength / 2); MW = w.mask ? b64u8(w.mask) : null; }
      const R2 = (Math.abs(X0) + RS) * (Math.abs(X0) + RS);
      for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
        const k = j * n + i, x = X0 + i * RS, z = Z0 + j * RS; MK[k] = x * x + z * z <= R2 ? 1 : 0;
        if (HW) { const wi = Math.round((x - w.bounds[0]) / w.res), wj = Math.round((z - w.bounds[2]) / w.res); if (wi >= 0 && wj >= 0 && wi < w.nx && wj < w.nz) { const wk = wj * w.nx + wi; if (!MW || MW[wk]) { H[k] = HW[wk]; ex[k] = 1; } } }
      }
      // Natur: erkundet aus dem Spielstand, sonst Bäume aus der Walddichte des Weltgenerators
      const nat = {}; Object.entries((w && w.nature) || {}).forEach(([kk, a]) => (nat[kk] = a.slice()));
      const KIND = { 1: ['tree_beech', 'tree_birch'], 4: ['tree_fir', 'tree_fir_s'], 2: ['tree_swamp', 'tree_swamp'], 5: ['tree_oak', 'tree_birch'], 9: ['tree_ygg', 'tree_ygg'], 3: ['tree_fir_s', 'tree_fir_s'] };
      const rnd = (a, b) => { const v = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453; return v - Math.floor(v); };
      for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
        const k = j * n + i; if (ex[k] || !MK[k] || F[k] < 40 || H[k] < 320) continue;
        const kd = KIND[B[k]]; if (!kd || rnd(i, j) * 255 > F[k]) continue;
        const r2 = rnd(j + 7.1, i - 3.3), x = X0 + i * RS + (r2 - 0.5) * RS * 0.9, z = Z0 + j * RS + (rnd(i + 1.7, j + 9.2) - 0.5) * RS * 0.9;
        (nat[kd[r2 < 0.7 ? 0 : 1]] || (nat[kd[r2 < 0.7 ? 0 : 1]] = [])).push(x, H[k] / 10 - 0.3, z, r2 * 360, 0.8 + r2 * 0.5);
      }
      r.nature = nat; r.H16 = H; r.MK = MK; r.lazy = false;
      r.bio = (x, z) => { const i = Math.round((x - X0) / RS), j = Math.round((z - Z0) / RS); return (i < 0 || j < 0 || i >= n || j >= n) ? 0 : B[j * n + i]; };
    }
    const areas = () => { const sr = seedRegion(); return (S.world3d ? [S.world3d] : []).concat(S.regions, sr ? [sr] : []); };
    const livePlayers = () => { const L = (LIVE || (S.live && S.live.players) || []).slice(); let P = []; try { P = three.peerList().filter((p) => !p.web); } catch (e) { } const have = new Set(L.map((p) => p.name)); P.forEach((p) => { if (!have.has(p.name)) L.push(Object.assign({ peer: true }, p)); }); return L; };
    // Biome → Grundfarbe (ohne Biomdaten: klassisches Grün)
    // Rohstoff-Vorkommen aus dem Spielstand (nur Unabgebautes): [Art, Farbe, Name]
    const RES_K = [['copper', '#d9824a', 'Kupfer'], ['tin', '#c9cfd4', 'Zinn'], ['silver', '#eef3ff', 'Silber'], ['obsidian', '#3b2a55', 'Obsidian'], ['tar', '#15110e', 'Teer'], ['scrap', '#8a6a4a', 'Schrott'],
      ['giant', '#9aa3ad', 'Riesenreste'], ['tissue', '#e07aa0', 'Weichgewebe'], ['blackcore', '#5a3b8a', 'Schwarzer Kern'], ['surtling', '#ffb23d', 'Surtlingkern'], ['chitin', '#7fc7b8', 'Chitin'], ['flametal', '#ff6a2a', 'Flammenmetall']];
    // Kartenfilter: [Schlüssel, Symbol, Farbe, Text]; Orte nach Kategorie (tools/gen_data.py)
    const FILTERS = [['seed', '🗺', '#9ec3d8', 'Ganze Welt'], ['bases', '●', '#e0a854', 'Basen'], ['players', '●', '#4cc36b', 'Spieler online'], ['portals', '◆', '#b48cff', 'Portale'],
      ['deaths', '✝', '#ff6b5a', 'Tode'], ['pins', '📍', '#ffe08a', 'Kartentisch-Pins'], ['heat', '👣', '#ffb347', 'Laufwege'], ['L_s', '▲', '#e8584a', 'Spawn'], ['L_b', '▲', '#e8584a', 'Bosse'], ['L_t', '●', '#ffd34d', 'Händler'],
      ['L_q', '◆', '#d07cff', 'Quests'], ['L_d', '■', '#c9935a', 'Dungeons'], ['L_h', '■', '#b5483a', 'Feindl. Dörfer'], ['L_n', '●', '#7fbf5a', 'Nester'],
      ['L_m', '●', '#2b2b2b', 'Material'], ['L_v', '■', '#58c7d6', 'Dvergr-Lager'], ['_h', '', '', 'Rohstoffe']].concat(RES_K.map(([k, c, de]) => ['R_' + k, '◆', c, de]));
    const LOCSTY = { s: ['#e8584a', 'tri', 1], b: ['#e8584a', 'tri', 1], t: ['#ffd34d', 'dot', 1], q: ['#d07cff', 'dia', 1], d: ['#c9935a', 'sq'], h: ['#b5483a', 'sq'], n: ['#7fbf5a', 'dot'], m: ['#2b2b2b', 'dot'], v: ['#58c7d6', 'sq'] };
    const LOCK = {}; Object.values((g.VW_DATA && g.VW_DATA.locations) || {}).forEach((l) => { if (l[2]) LOCK[l[0]] = l[2]; });
    const locCat = (l) => LOCK[l.k] || l.c || 'b';
    const PIN_IC = { 0: '🔥', 1: '🏠', 2: '🔨', 3: '●', 4: '✦', 9: '☠' };
    const PIN_N = { '$enemy_eikthyr': 'Eikthyr', '$enemy_gdking': 'Der Älteste', '$enemy_bonemass': 'Knochenmasse', '$enemy_dragon': 'Moder', '$enemy_goblinking': 'Yagluth', '$enemy_seekerqueen': 'Die Königin', '$enemy_fader': 'Fader' };
    const pinName = (p) => { const n = p.n || ''; if (PIN_N[n]) return T(PIN_N[n]); if (/^\$hud_pin_hildir/.test(n)) return 'Hildir'; return n.replace(/^\$\w+_/, ''); };
    const FOG = 110; // Abdunklung unerkundeter Gebiete auf der fertigen Weltkarte (0–255)
    const BIO_COL = [null, [111, 154, 69], [92, 86, 52], [196, 202, 208], [52, 86, 50], [190, 172, 88], [92, 52, 42], [226, 236, 244], null, [84, 82, 104]];
    let BIOU = null, BIOS = null;
    const bioAt = (x, z) => { const B = S.biomes; if (!B) return 0; if (BIOS !== B) { BIOS = B; BIOU = b64u8(B.b); } const i = Math.floor((x - B.x0) / B.res), j = Math.floor((z - B.z0) / B.res); return (i < 0 || j < 0 || i >= B.nx || j >= B.nz) ? 0 : BIOU[j * B.nx + i]; };
    const setStatus = (t) => { $('.vw-status').textContent = t || ''; };
    setStatus(opts.status);
    function setTab(t) {
      tab = t; $$('.vw-tabs button').forEach((b) => b.classList.toggle('on', b.dataset.t === t));
      $$('.vw-pane').forEach((p) => (p.hidden = p.dataset.p !== t));
      if (t === 'map') map.draw(); if (t === '3d') three.start(); else three.stop();
      if (t === 'chests') kisten.render(); if (t === 'info') info();
    }
    $$('.vw-tabs button').forEach((b) => (b.onclick = () => setTab(b.dataset.t)));

    // ================= Zusatzdaten der Live-Karte: Tode, Laufwege (live/verlauf/) =================
    const EX = { deaths: null, days: [], heat: {}, base: opts.history || null };
    async function loadExtra() {
      if (!EX.base) return;
      try { const r = await fetch(EX.base + 'tode.json', { cache: 'no-store' }); if (r.ok) EX.deaths = await r.json(); } catch (e) { }
      try { const r = await fetch(EX.base + 'spuren/index.json', { cache: 'no-store' }); if (r.ok) EX.days = await r.json(); } catch (e) { }
      map.layersChanged(); if (tab === 'info') info();
    }
    async function heatDays(n) {
      const days = n ? EX.days.slice(-n) : EX.days;
      for (const d of days) if (!EX.heat[d]) { try { const r = await fetch(EX.base + 'spuren/' + d + '.json', { cache: 'no-store' }); if (r.ok) EX.heat[d] = await r.json(); } catch (e) { } }
      return days.map((d) => EX.heat[d]).filter(Boolean);
    }
    // Tode: aufgezeichnete (Live-Karte) + aktuelle Grabsteine aus dem Stand
    function allDeaths() {
      const out = (EX.deaths || []).map((d) => Object.assign({}, d)); const key = (d) => d.n + '|' + Math.round(d.x) + '|' + Math.round(d.z);
      const have = new Set(out.map(key)); const now = new Set((S.tombs || []).map(key));
      (S.tombs || []).forEach((b) => { if (!have.has(key(b))) out.push(Object.assign({}, b)); });
      out.forEach((d) => (d.open = now.has(key(d))));
      return out;
    }

    // ================= Karte (2D) =================
    const map = (function () {
      const cv = $('canvas.map'), ctx = cv.getContext('2d');
      let img = null, fog = null, fogTab = null, view = { cx: 0, cz: 0, s: 0.1 }, hover = null;
      function build() {
        const o = S.overview; const u = b64u8(o.h); const c = document.createElement('canvas'); c.width = o.nx; c.height = o.nz;
        const x = c.getContext('2d'), id = x.createImageData(o.nx, o.nz), fc = document.createElement('canvas'); fc.width = o.nx; fc.height = o.nz; const fx = fc.getContext('2d'), fd = fx.createImageData(o.nx, o.nz);
        for (let j = 0; j < o.nz; j++) for (let i = 0; i < o.nx; i++) {
          const v = u[j * o.nx + i], k = ((o.nz - 1 - j) * o.nx + i) * 4; let r, gg, b, a = 255;
          if (!v) { a = 0; r = gg = b = 0; } else { const e = v - 100; if (e < 0) { const t = Math.min(1, -e / 25); r = 40 + 30 * (1 - t); gg = 90 + 40 * (1 - t); b = 120 + 30 * (1 - t); } else if (e < 2) { r = 205; gg = 190; b = 140; } else { const bc = BIO_COL[bioAt(o.x0 + (i + 0.5) * o.res, o.z0 + (j + 0.5) * o.res)]; if (bc) { const t = Math.min(1, (e - 2) / 90); r = bc[0] + (235 - bc[0]) * t * 0.35; gg = bc[1] + (240 - bc[1]) * t * 0.35; b = bc[2] + (245 - bc[2]) * t * 0.35; if (e > 75) { const s2 = Math.min(1, (e - 75) / 40); r += (240 - r) * s2; gg += (244 - gg) * s2; b += (248 - b) * s2; } } else { const t = Math.min(1, (e - 2) / 60); r = 110 + 90 * t; gg = 150 + 50 * t; b = 70 + 100 * t; } } }
          id.data[k] = r; id.data[k + 1] = gg; id.data[k + 2] = b; id.data[k + 3] = a; fd.data[k] = 14; fd.data[k + 1] = 22; fd.data[k + 2] = 30; fd.data[k + 3] = a ? 0 : FOG;
        }
        x.putImageData(id, 0, 0); img = c; fx.putImageData(fd, 0, 0); fog = fc; fogTab = null;
        const TM = S.tableMap; if (TM && TM.bits) { // auf dem Kartentisch aufgedeckt ODER Daten im Spielstand = erkundet
          const tb = b64u8(TM.bits), N = TM.size, tc = document.createElement('canvas'); tc.width = tc.height = N; const tx = tc.getContext('2d'), td = tx.createImageData(N, N);
          for (let py = 0; py < N; py++) for (let px = 0; px < N; px++) {
            const b = py * N + px; let e = (tb[b >> 3] >> (b & 7)) & 1;
            if (!e) { const wx = (px + 0.5 - N / 2) * TM.pixel, wz = (py + 0.5 - N / 2) * TM.pixel, oi = Math.floor((wx - o.x0) / o.res), oj = Math.floor((wz - o.z0) / o.res); if (oi >= 0 && oj >= 0 && oi < o.nx && oj < o.nz && u[oj * o.nx + oi]) e = 1; }
            const k = ((N - 1 - py) * N + px) * 4; td.data[k] = 14; td.data[k + 1] = 22; td.data[k + 2] = 30; td.data[k + 3] = e ? 0 : FOG;
          }
          tx.putImageData(td, 0, 0); fogTab = { c: tc, ext: N / 2 * TM.pixel };
        }
        const NAMES = ['', 'Wiesen', 'Sumpf', 'Berge', 'Schwarzwald', 'Ebenen', 'Aschelande', 'Tiefer Norden', '', 'Nebellande'];
        $('.biolg').innerHTML = S.biomes ? 'Biome' + (S.biomes.src === 'Weltgenerator' ? ' (exakt)' : ' (geschätzt)') + ':<br>' + [1, 4, 2, 3, 5, 9, 6, 7].map((k) => `<span style="display:inline-block;width:10px;height:10px;border-radius:2px;margin:0 3px 0 6px;vertical-align:-1px;background:rgb(${BIO_COL[k].join(',')})"></span>${NAMES[k]}`).join('') : '';
        // passend einpassen
        const bw = o.nx * o.res, bh = o.nz * o.res; view.cx = o.x0 + bw / 2; view.cz = o.z0 + bh / 2;
        fit(bw, bh);
        const ml = $('.vw-maplist'); ml.innerHTML = S.bases.map((b, i) => `<div class="b" data-i="${i}"><span>${esc(b.name)}<br><span class="sub">${b.builders.map((x) => esc(x[0].split(' (')[0])).join(', ')}</span></span><span class="sub">${fmt(b.pieces)} Teile<br>${b.chests} Kisten</span></div>`).join('') || '<div class="sub">Keine Basen gefunden.</div>';
        $$('.b', ml).forEach((d) => (d.onclick = () => open3d(+d.dataset.i)));
      }
      // ---- Ganze Welt aus dem Seed (js/worldgen.js): wird zeilenweise im Hintergrund berechnet
      // Liegt eine fertige Weltkarte (Höhen, Flüsse, Wälder; tools/weltkarte.py) unter weltkarte/<Seed>.json, wird die genommen.
      const SEED_RES = 24, SEED_N = Math.ceil(21000 / SEED_RES); let SEEDRES = null, seedResF = null, seedImg = null, seedFor = '', seedJob = 0, seedBox = [-10500, -10500, 21000], seedSrc = '';
      function buildSeed() {
        const sd = S.world && S.world.seed; if (!sd || seedFor === sd) return; seedFor = sd; clearTimeout(seedJob); seedSrc = '';
        const calc = () => { if (seedFor === sd && !seedSrc) calcSeed(sd); };
        if (!/^[\w-]+$/.test(sd) || location.protocol === 'file:') return calc();
        fetch('weltkarte/' + sd + '.json', { cache: 'no-cache' }).then((r) => (r.ok ? r.json() : null)).then((m) => {
          if (!m || m.seed !== sd || seedFor !== sd) return calc();
          if (m.resources) fetch('weltkarte/' + m.resources).then((r) => (r.ok ? r.json() : null)).then((j) => { if (j && j.seed === sd && seedFor === sd) { SEEDRES = j.resources || null; seedResF = null; layersChanged(); } }).catch(() => { });
          const im = new Image(); im.onload = () => { if (seedFor !== sd) return; clearTimeout(seedJob); seedImg = im; seedBox = [m.x0, m.z0, m.size]; seedSrc = m.source || 'Weltkarte'; layersChanged(); }; im.onerror = calc; im.src = 'weltkarte/' + (m.image || sd + '.webp');
          calc(); // bis das Bild da ist: Biome berechnen
        }).catch(calc);
      }
      function seedRes() {
        if (!SEEDRES) return null; if (seedResF && seedResF.S === S) return seedResF.r;
        const gen = (S.locations || []).filter((l) => l.v), R2 = {};
        Object.entries(SEEDRES).forEach(([k, a]) => { const own = (S.resources && S.resources[k]) || [], out = [];
          for (let i = 0; i < a.length; i += 3) { const x = a[i], z = a[i + 1]; if (gen.some((l) => Math.abs(l.x - x) < 40 && Math.abs(l.z - z) < 40)) continue; let near = false; for (let j = 0; j < own.length && !near; j += 3) near = Math.abs(own[j] - x) < 150 && Math.abs(own[j + 1] - z) < 150; if (!near) out.push(x, z, a[i + 2]); }
          if (out.length) R2[k] = out; });
        seedResF = { S, r: R2 }; return R2;
      }
      function calcSeed(sd) {
        if (!g.VWWorldGen) return; seedBox = [-10500, -10500, 21000];
        const W = g.VWWorldGen.create(sd, S.world.worldGen); const c = document.createElement('canvas'); c.width = c.height = SEED_N; const x = c.getContext('2d'); const id = x.createImageData(SEED_N, 1); let row = 0; seedImg = c;
        const step = () => {
          const t0 = performance.now();
          while (row < SEED_N && performance.now() - t0 < 20) {
            const wz = 10500 - (row + 0.5) * SEED_RES;
            for (let i = 0; i < SEED_N; i++) {
              const wx = -10500 + (i + 0.5) * SEED_RES, k = i * 4, d = Math.hypot(wx, wz);
              if (d > 10500) { id.data[k + 3] = 0; continue; }
              const b = W.biome(wx, wz), h = W.baseHeight(wx, wz); let r, gg, bb;
              if (b === 8) { const t = Math.min(1, Math.max(0, (0.02 - h) / 0.35)); r = 40 + 26 * (1 - t); gg = 92 + 40 * (1 - t); bb = 122 + 30 * (1 - t); }
              else { const bc = BIO_COL[b] || BIO_COL[1], t = Math.min(1, Math.max(0, (h - 0.02) / 0.6)); r = bc[0] + (235 - bc[0]) * t * 0.3; gg = bc[1] + (240 - bc[1]) * t * 0.3; bb = bc[2] + (245 - bc[2]) * t * 0.3; if (h < 0.035) { r = 205; gg = 190; bb = 140; } }
              id.data[k] = r; id.data[k + 1] = gg; id.data[k + 2] = bb; id.data[k + 3] = 255;
            }
            x.putImageData(id, 0, row); row++;
          }
          if (row % 60 === 0 || row >= SEED_N) draw();
          if (row < SEED_N) seedJob = setTimeout(step, 0);
        };
        step();
      }
      function fit(bw, bh) { const r = cv.getBoundingClientRect(); if (!r.width) return; view.s = Math.min(r.width / bw, r.height / bh) * 0.92; }
      const toS = (x, z) => { const r = cv.getBoundingClientRect(); return [r.width / 2 + (x - view.cx) * view.s, r.height / 2 - (z - view.cz) * view.s]; };
      const toW = (sx, sy) => { const r = cv.getBoundingClientRect(); return [view.cx + (sx - r.width / 2) / view.s, view.cz - (sy - r.height / 2) / view.s]; };
      function draw() {
        if (tab !== 'map' || !img) return;
        const r = cv.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1);
        if (cv.width !== Math.round(r.width * dpr)) { cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr); }
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.fillStyle = '#1d3a4a'; ctx.fillRect(0, 0, r.width, r.height);
        const o = S.overview; const [ax, ay] = toS(o.x0, o.z0 + o.nz * o.res);
        if (ML.seed && seedImg) { const [bx, bz, bs] = seedBox, [sx, sy] = toS(bx, bz + bs); ctx.imageSmoothingEnabled = true; ctx.globalAlpha = seedSrc ? 1 : 0.62; ctx.drawImage(seedImg, sx, sy, bs * view.s, bs * view.s); ctx.globalAlpha = 1; } // unerkundet: blasser
        if (ML.seed && seedImg && seedSrc) { // fertige Weltkarte: überall scharf, Unerkundetes nur abgedunkelt (wie der Nebel im Spiel)
          const ow = o.nx * o.res * view.s, oh = o.nz * o.res * view.s, [wx, wy] = toS(0, 0);
          if (fogTab) { const [fx0, fy0] = toS(-fogTab.ext, fogTab.ext), fs = 2 * fogTab.ext * view.s; ctx.save(); ctx.beginPath(); ctx.arc(wx, wy, 10500 * view.s, 0, Math.PI * 2); ctx.clip(); ctx.imageSmoothingEnabled = true; ctx.drawImage(fogTab.c, fx0, fy0, fs, fs); ctx.restore(); }
          else { ctx.fillStyle = `rgba(14,22,30,${FOG / 255})`; ctx.beginPath(); ctx.arc(wx, wy, 10500 * view.s, 0, Math.PI * 2); ctx.rect(ax + ow, ay, -ow, oh); ctx.fill('evenodd');
          ctx.imageSmoothingEnabled = true; ctx.drawImage(fog, ax, ay, ow, oh); }
        } else { ctx.imageSmoothingEnabled = view.s < 0.5; ctx.drawImage(img, ax, ay, o.nx * o.res * view.s, o.nz * o.res * view.s); }
        // Weltrand
        const [cx0, cy0] = toS(0, 0); ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.beginPath(); ctx.arc(cx0, cy0, 10000 * view.s, 0, Math.PI * 2); ctx.stroke();
        drawLayers(); drawRoute2d(ctx, toS, view.s);
        ctx.font = '12px system-ui,sans-serif'; ctx.textAlign = 'center';
        { const SR = ML.seed ? seedRes() : null; if (SR) { ctx.textAlign = 'center'; RES_K.forEach(([k, col]) => { const a = SR[k]; if (!a || !ML['R_' + k]) return; ctx.lineWidth = 2.5; ctx.strokeStyle = col; ctx.fillStyle = 'rgba(0,0,0,.35)';
          for (let i = 0; i < a.length; i += 3) { const [x, y] = toS(a[i], a[i + 1]); if (x < -20 || y < -20 || x > 5000 || y > 5000) continue; ctx.beginPath(); ctx.moveTo(x, y - 6); ctx.lineTo(x + 5, y); ctx.lineTo(x, y + 6); ctx.lineTo(x - 5, y); ctx.closePath(); ctx.fill(); ctx.stroke(); if (view.s > 0.12 && a[i + 2] > 1) { ctx.font = 'bold 10px system-ui,sans-serif'; ctx.fillStyle = '#fff'; ctx.fillText('×' + a[i + 2], x, y - 8); ctx.fillStyle = 'rgba(0,0,0,.35)'; } } }); ctx.font = '12px system-ui,sans-serif'; } }
        RES_K.forEach(([k, col]) => { const a = S.resources && S.resources[k]; if (!a || !ML['R_' + k]) return; const r = view.s > 0.6 ? 4 : view.s > 0.2 ? 3 : 2; ctx.fillStyle = col; ctx.strokeStyle = 'rgba(0,0,0,.7)'; ctx.lineWidth = 1;
          for (let i = 0; i < a.length; i += 3) { const [x, y] = toS(a[i], a[i + 1]); if (x < -10 || y < -10 || x > 5000 || y > 5000) continue; ctx.beginPath(); ctx.moveTo(x, y - r - 1); ctx.lineTo(x + r, y); ctx.lineTo(x, y + r + 1); ctx.lineTo(x - r, y); ctx.closePath(); ctx.fill(); ctx.stroke(); if (a[i + 2] === 1 && r > 2) { ctx.strokeStyle = '#fff'; ctx.stroke(); ctx.strokeStyle = 'rgba(0,0,0,.7)'; } } });
        S.locations.forEach((l) => { const c = locCat(l); if (!ML['L_' + c]) return; const [x, y] = toS(l.x, l.z); const st = LOCSTY[c] || LOCSTY.d; const a = l.v ? 1 : 0.6;
          ctx.globalAlpha = a; ctx.fillStyle = st[0]; ctx.strokeStyle = 'rgba(0,0,0,.65)'; ctx.lineWidth = 1.5; ctx.beginPath();
          if (st[1] === 'tri') { ctx.moveTo(x, y - 6); ctx.lineTo(x + 5, y + 4); ctx.lineTo(x - 5, y + 4); ctx.closePath(); } else if (st[1] === 'dot') ctx.arc(x, y, 3.5, 0, Math.PI * 2); else if (st[1] === 'dia') { ctx.moveTo(x, y - 5); ctx.lineTo(x + 5, y); ctx.lineTo(x, y + 5); ctx.lineTo(x - 5, y); ctx.closePath(); } else ctx.rect(x - 3.5, y - 3.5, 7, 7);
          ctx.fill(); ctx.stroke(); ctx.globalAlpha = 1;
          if ((st[2] && view.s > 0.12) || l.k === 'StartTemple' || view.s > 0.35) { ctx.fillStyle = '#fff'; ctx.fillText(T(l.n), x, y - 9); } });
        if (ML.pins) { ctx.textBaseline = 'middle'; (S.pins || []).forEach((p) => { const [x, y] = toS(p.x, p.z); const ic = PIN_IC[p.t] || '•'; ctx.globalAlpha = p.c ? 0.5 : 1; ctx.font = (p.t === 9 ? 'bold 15px' : '13px') + ' system-ui,sans-serif'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.65)'; ctx.fillStyle = p.t === 9 ? '#ffb4a8' : '#ffe08a'; ctx.strokeText(ic, x, y); ctx.fillText(ic, x, y);
            if (view.s > 0.25) { const nm = pinName(p); const t = (nm ? nm + ' · ' : '') + (p.by || ''); if (t) { ctx.font = '11px system-ui,sans-serif'; ctx.strokeText(t, x, y + 13); ctx.fillStyle = '#fff3c9'; ctx.fillText(t, x, y + 13); } } ctx.globalAlpha = 1; }); ctx.textBaseline = 'alphabetic'; ctx.font = '12px system-ui,sans-serif'; }
        if (ML.portals) S.portals.forEach((p) => { const [x, y] = toS(p.x, p.z); ctx.fillStyle = '#b48cff'; ctx.save(); ctx.translate(x, y); ctx.rotate(Math.PI / 4); ctx.fillRect(-3, -3, 6, 6); ctx.restore(); if (view.s > 0.6 && p.tag) { ctx.fillStyle = '#e6dbff'; ctx.fillText(p.tag, x, y - 7); } });
        if (ML.players) livePlayers().forEach((p) => { const [x, y] = toS(p.x, p.z); ctx.fillStyle = '#4cc36b'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#d9ffe3'; ctx.font = 'bold 12px system-ui,sans-serif'; ctx.fillText(p.name, x, y + 18); ctx.font = '12px system-ui,sans-serif'; });
        if (ML.bases) S.bases.forEach((b, i) => { const [x, y] = toS(b.center[0], b.center[1]); const rr = Math.max(5, Math.min(14, 3 + Math.sqrt(b.pieces) / 8)); ctx.fillStyle = hover === i ? '#ffd27a' : '#e0a854'; ctx.strokeStyle = '#1b1408'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, rr, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#fff'; ctx.font = 'bold 12px system-ui,sans-serif'; ctx.fillText(T(b.name), x, y - rr - 4); ctx.font = '12px system-ui,sans-serif'; });
      }
      const ptr = new Map(); let pd = 0, moved = 0;
      cv.addEventListener('pointerdown', (e) => { cv.setPointerCapture(e.pointerId); ptr.set(e.pointerId, { x: e.clientX, y: e.clientY }); moved = 0; });
      cv.addEventListener('pointermove', (e) => {
        const p = ptr.get(e.pointerId); const r = cv.getBoundingClientRect();
        if (!p) { const hit = pick(e.clientX - r.left, e.clientY - r.top); if (hit !== hover) { hover = hit; cv.style.cursor = hit != null ? 'pointer' : ''; draw(); } return; }
        const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY; moved += Math.abs(dx) + Math.abs(dy);
        if (ptr.size === 2) { const a = [...ptr.values()]; const d = Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y); if (pd) view.s *= d / pd; pd = d; }
        else { view.cx -= dx / view.s; view.cz += dy / view.s; }
        draw();
      });
      const up = (e) => { ptr.delete(e.pointerId); pd = 0; if (moved < 5 && e.type === 'pointerup') { const r = cv.getBoundingClientRect(); const hit = pick(e.clientX - r.left, e.clientY - r.top); if (hit != null) open3d(hit); } };
      cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
      cv.addEventListener('wheel', (e) => { e.preventDefault(); const r = cv.getBoundingClientRect(); const [wx, wz] = toW(e.clientX - r.left, e.clientY - r.top); view.s *= Math.exp(-e.deltaY * 0.0015); view.s = Math.max(0.02, Math.min(8, view.s)); const [nx, nz] = toW(e.clientX - r.left, e.clientY - r.top); view.cx += wx - nx; view.cz += wz - nz; draw(); }, { passive: false });
      // ---- Ebenen: Portal-Netz, Tode, Laufwege
      let ML = { seed: true, bases: true, players: true, portals: true, deaths: false, pins: true, heat: false, L_s: true, L_b: true, L_t: true, L_q: false, L_d: false, L_h: false, L_n: false, L_m: false, L_v: false }; try { Object.assign(ML, JSON.parse(localStorage.getItem('vw-maplayers') || '{}')); } catch (e) { }
      let heatCells = null, heatMax = 1, heatCell = 16, baseInfo = '';
      function portalNet() {
        const g = {}; (S.portals || []).forEach((p) => { if (p.tag) (g[p.tag] || (g[p.tag] = [])).push(p); });
        const pairs = [], single = [], multi = [];
        Object.entries(g).forEach(([t, l]) => { if (l.length === 1) single.push(t); else { if (l.length > 2) multi.push(t); for (let i = 1; i < l.length; i++) pairs.push([l[0], l[i], l.length > 2]); } });
        const untagged = (S.portals || []).filter((p) => !p.tag).length;
        return { pairs, single, multi, untagged };
      }
      function drawLayers() {
        if (ML.heat && heatCells) {
          const cs = heatCell * view.s, lm = Math.log(heatMax + 1);
          heatCells.forEach((c, k) => { const [i, j] = k.split(',').map(Number); const [x, y] = toS(i * heatCell, (j + 1) * heatCell); const t = Math.log(c + 1) / lm; ctx.fillStyle = `hsla(${Math.round(55 - 55 * t)},100%,${Math.round(60 - 15 * t)}%,${(0.25 + 0.6 * t).toFixed(2)})`; ctx.fillRect(x, y, Math.max(1.5, cs), Math.max(1.5, cs)); });
        }
        if (ML.portals) {
          const N = portalNet(); ctx.lineWidth = 2;
          N.pairs.forEach(([a, b, m]) => { const [x1, y1] = toS(a.x, a.z), [x2, y2] = toS(b.x, b.z); ctx.strokeStyle = m ? 'rgba(255,170,60,.85)' : 'rgba(190,150,255,.75)'; ctx.setLineDash(m ? [6, 4] : []); ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); });
          ctx.setLineDash([]);
          (S.portals || []).forEach((p) => { if (!p.tag || N.single.includes(p.tag)) { const [x, y] = toS(p.x, p.z); ctx.strokeStyle = '#ff5a4a'; ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.stroke(); } });
        }
        if (ML.deaths) {
          ctx.font = 'bold 13px system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          allDeaths().forEach((d) => { const [x, y] = toS(d.x, d.z); ctx.fillStyle = d.open ? '#ff6b5a' : 'rgba(235,225,215,.8)'; ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.lineWidth = 3; ctx.strokeText('✝', x, y); ctx.fillText('✝', x, y); if (view.s > 0.5) { ctx.font = '11px system-ui,sans-serif'; ctx.lineWidth = 3; ctx.strokeText(d.n, x, y + 12); ctx.fillText(d.n, x, y + 12); ctx.font = 'bold 13px system-ui,sans-serif'; } });
          ctx.textBaseline = 'alphabetic';
        }
      }
      async function refreshHeat() {
        heatCells = null; if (!ML.heat || !EX.days.length) return;
        const pl = $('.hPl').value, n = +$('.hDays').value; const days = await heatDays(n);
        const m = new Map(); let tot = 0, cell = 16;
        days.forEach((d) => { cell = d.cell || 16; Object.entries(d.players || {}).forEach(([name, p]) => { if (pl && pl !== name) return; Object.entries(p.cells).forEach(([k, c]) => { m.set(k, (m.get(k) || 0) + c); tot += c; }); }); });
        heatCells = m; heatCell = cell; heatMax = Math.max(1, ...m.values());
        $('.mlInfo').innerHTML = (baseInfo ? baseInfo + '<br>' : '') + (days.length ? `Laufwege: ${fmt(days.length)} Tag(e), ${fmt(m.size)} Felder à ${cell} m` : 'Noch keine Laufwege aufgezeichnet.');
        draw();
      }
      function layersChanged() {
        $$('[data-ml]').forEach((b) => (b.checked = !!ML[b.dataset.ml]));
        const cnt = {}; (S.locations || []).forEach((l) => { const c = 'L_' + locCat(l); cnt[c] = (cnt[c] || 0) + 1; });
        cnt.bases = S.bases.length; cnt.players = livePlayers().length; cnt.portals = (S.portals || []).length; cnt.deaths = allDeaths().length; Object.entries(S.resources || {}).forEach(([k, a]) => (cnt['R_' + k] = a.length / 3)); const SRc = ML.seed ? seedRes() : null; if (SRc) Object.entries(SRc).forEach(([k, a]) => { let n = 0; for (let i = 2; i < a.length; i += 3) n += a[i]; cnt['R_' + k] = (cnt['R_' + k] || 0) + n; }); cnt.pins = (S.pins || []).length;
        $$('.vw-filter label').forEach((lb) => { const k = lb.dataset.fk; $('.n', lb).textContent = cnt[k] ? fmt(cnt[k]) : ''; if (k.startsWith('L_') || k.startsWith('R_')) lb.hidden = !cnt[k]; }); const fh = $('.vw-filter .fh'); if (fh) fh.hidden = !Object.keys(S.resources || {}).length && !SRc;
        $('[data-fk="seed"]').hidden = !(g.VWWorldGen && S.world && S.world.seed); if (ML.seed) buildSeed();
        $('[data-fk="heat"]').hidden = !EX.days.length; $('[data-fk="pins"]').hidden = !(S.pins || []).length;
        $('.heatCtl').hidden = !(ML.heat && EX.days.length);
        if (EX.days.length && !$('.hPl').options.length) {
          const names = new Set(); Promise.resolve(heatDays(7)).then((ds) => { ds.forEach((d) => Object.keys(d.players || {}).forEach((n) => names.add(n))); $('.hPl').innerHTML = '<option value="">Alle Spieler</option>' + [...names].sort().map((n) => `<option>${esc(n)}</option>`).join(''); });
        }
        const info = [];
        if (ML.portals) { const N = portalNet(); info.push(`Portal-Netz: ${fmt(N.pairs.length)} Verbindungen` + (N.single.length ? ` · ohne Partner: ${N.single.map(esc).join(', ')}` : '') + (N.multi.length ? ` · mehr als 2 gleiche Namen: ${N.multi.map(esc).join(', ')}` : '') + (N.untagged ? ` · ${N.untagged} ohne Namen` : '')); }
        if (SRc && RES_K.some(([k]) => ML['R_' + k] && SRc[k])) info.push(T('Rohstoffe: ausgefüllt = im Spielstand, hohl = laut Seed in unerkundeten Orten (Anzahl daneben)'));
        if (ML.seed && seedSrc) info.push(T('Ganze Welt mit Höhen, Flüssen und Wäldern') + ' · ' + T('Quelle') + ': ' + esc(seedSrc));
        if (ML.deaths) { const D = allDeaths(); info.push(`Tode: ${fmt(D.length)} erfasst` + (D.some((d) => d.open) ? ` · rot = Grabstein liegt noch` : '')); }
        baseInfo = info.join('<br>'); $('.mlInfo').innerHTML = baseInfo;
        if (ML.heat) refreshHeat(); else draw();
      }
      $('.vw-filter').innerHTML = FILTERS.map(([k, ic, col, de]) => k === '_h' ? `<div class="fh" style="grid-column:1/-1;margin-top:6px;font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;opacity:.7">${de}</div>` : `<label data-fk="${k}"><input type="checkbox" data-ml="${k}"><span class="ic" style="color:${col}">${ic}</span><span>${de}</span><span class="n"></span></label>`).join('');
      $$('[data-ml]').forEach((b) => (b.onchange = () => { ML[b.dataset.ml] = b.checked; try { localStorage.setItem('vw-maplayers', JSON.stringify(ML)); } catch (e) { } layersChanged(); }));
      $('.hPl').onchange = refreshHeat; $('.hDays').onchange = refreshHeat;

      function pick(sx, sy) { let best = null, bd = 16; S.bases.forEach((b, i) => { const [x, y] = toS(b.center[0], b.center[1]); const d = Math.hypot(x - sx, y - sy); if (d < bd) { bd = d; best = i; } }); return best; }
      addEventListener('resize', draw);
      function focus(P) { if (!P || !P.length) return; let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; P.forEach((p) => { x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); z0 = Math.min(z0, p.z); z1 = Math.max(z1, p.z); }); view.cx = (x0 + x1) / 2; view.cz = (z0 + z1) / 2; const r = cv.getBoundingClientRect(); if (r.width) view.s = Math.max(0.02, Math.min(4, Math.min(r.width / Math.max(80, x1 - x0), r.height / Math.max(80, z1 - z0)) * 0.8)); draw(); }
      return { build, draw, layersChanged, focus };
    })();

    // ================= 3D =================
    const three = (function () {
      const cv = $('canvas.gl'), pane = $('[data-p="3d"]');
      const Q = Object.assign({ shadows: (window.matchMedia && matchMedia('(pointer:fine)').matches && innerWidth > 900) ? '1' : '0', detail: 'valheim', nature: 'high', res: '1', range: 'mid' }, (() => { try { const o = JSON.parse(localStorage.getItem('vw-quality') || '{}'); if (o.v !== 3) { delete o.detail; delete o.nature; o.v = 3; } return o; } catch (e) { return {}; } })());
      // Standard: Originalgrafik und alle Natur – ohne Grafikpaket (Template) automatisch Natur-Texturen
      const ren = new THREE.WebGLRenderer({ canvas: cv, antialias: true, preserveDrawingBuffer: true });
      ren.setPixelRatio(Math.min(devicePixelRatio, 2) * +Q.res); ren.shadowMap.enabled = true; ren.shadowMap.type = THREE.PCFSoftShadowMap; ren.shadowMap.autoUpdate = false;
      let dirty = 2; const invalidate = () => { dirty = 2; };
      const scene = new THREE.Scene(); scene.background = new THREE.Color(0x9fc3d8); scene.fog = new THREE.Fog(0x9fc3d8, 500, 1600);
      const cam = new THREE.PerspectiveCamera(45, 1, 0.5, 30000);
      scene.add(new THREE.HemisphereLight(0xdfeeff, 0x5a5040, 0.62));
      const sun = new THREE.DirectionalLight(0xffe2b8, 1.2); sun.position.set(-180, 260, 140); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
      sun.shadow.bias = -0.0008; sun.castShadow = Q.shadows === '1'; scene.add(sun); scene.add(sun.target);
      const floor = new THREE.Mesh(new THREE.PlaneGeometry(60000, 60000), new THREE.MeshLambertMaterial({ color: 0x4f5f5a })); floor.rotation.x = -Math.PI / 2; floor.position.y = -25.2; scene.add(floor);
      const water = new THREE.Mesh(new THREE.PlaneGeometry(60000, 60000), new THREE.MeshPhongMaterial({ color: 0x2f6f8f, transparent: true, opacity: 0.62, shininess: 80, specular: 0x99bbcc, depthWrite: false }));
      water.rotation.x = -Math.PI / 2; water.renderOrder = 2; scene.add(water);
      // Himmel, Licht, Nebel und Wasser passend zum Biom in der Gebietsmitte
      const hemi = scene.children.find((o) => o.isHemisphereLight);
      const ENV = {
        1: { sky: 0x9fc9df, fog: 0xb9d0d5, hemi: 0xdceeff, ground: 0x625a43, sun: 0xfff1d6, water: 0x2f6f8f }, // Wiesen
        2: { sky: 0x879a91, fog: 0x9ba99c, hemi: 0xc6d5c9, ground: 0x4b5140, sun: 0xe1e5d4, water: 0x3f5a52 }, // Sumpf
        3: { sky: 0xb4c9dc, fog: 0xc7d3df, hemi: 0xe7efff, ground: 0x777b80, sun: 0xfff4e2, water: 0x3f7090 }, // Berge
        4: { sky: 0x91b5c7, fog: 0xa8c3c8, hemi: 0xd9e7d6, ground: 0x4f5941, sun: 0xfff0d0, water: 0x2d6a80 }, // Schwarzwald
        5: { sky: 0xa8c9df, fog: 0xc3d5d6, hemi: 0xf1edda, ground: 0x696047, sun: 0xfff2d6, water: 0x337890 }, // Ebenen
        6: { sky: 0x9a7770, fog: 0xb18d7d, hemi: 0xe5c2a5, ground: 0x51403a, sun: 0xffd0a0, water: 0x5a4844 }, // Aschelande
        7: { sky: 0xb7cbdc, fog: 0xd1dbe3, hemi: 0xeaf3ff, ground: 0x72777c, sun: 0xf2f3ff, water: 0x46788f }, // Tiefer Norden
        9: { sky: 0x777d91, fog: 0x9297a4, hemi: 0xc7cbd9, ground: 0x474b50, sun: 0xd7d5e8, water: 0x36586e }  // Nebellande
      };
      const skyCv = document.createElement('canvas'); skyCv.width = 2; skyCv.height = 256; const skyTex = new THREE.CanvasTexture(skyCv);
      function paintSky(top, horizon) {
        const x = skyCv.getContext('2d'), g = x.createLinearGradient(0, 0, 0, 256);
        const c = (h) => '#' + new THREE.Color(h).getHexString();
        g.addColorStop(0, c(top)); g.addColorStop(0.62, c(horizon)); g.addColorStop(1, c(horizon)); x.fillStyle = g; x.fillRect(0, 0, 2, 256); skyTex.needsUpdate = true;
      }
      function applyEnvironment(r, big) {
        const [X0, X1, Z0, Z1] = r.bounds;
        const e = (!big && ENV[bioAt((X0 + X1) / 2, (Z0 + Z1) / 2)]) || ENV[1];
        const top = new THREE.Color(e.sky).lerp(new THREE.Color(0x3d6a96), 0.45); paintSky(top, e.fog); scene.background = skyTex; scene.fog.color.setHex(e.fog);
        if (hemi) { hemi.color.setHex(e.hemi); hemi.groundColor.setHex(e.ground); }
        sun.color.setHex(e.sun); water.material.color.setHex(e.water); ENVB.top = top.clone(); ENVB.fog = new THREE.Color(e.fog);
      }
      // ---- Tag und Nacht: t = Tagesanteil (0 Mitternacht, 0,5 Mittag), wie EnvMan im Spiel (1 Tag = 1800 s Spielzeit)
      const ENVB = { top: new THREE.Color(0x6d93b8), fog: new THREE.Color(0xb9d0d5) }; let ENVL = null;
      const DN = Object.assign({ mode: 'server', paused: false, t: 0.5 }, (() => { try { return JSON.parse(localStorage.getItem('vw-daynight') || '{}'); } catch (e) { return {}; } })());
      let dnT = DN.t, dnLast = performance.now(), dnShadowT = -1, dnSky = -1;
      const sunDir = new THREE.Vector3(-0.55, 0.8, 0.45).normalize();
      const C_NTOP = new THREE.Color(0x0b1630), C_NHOR = new THREE.Color(0x1d2c47), C_SET = new THREE.Color(0xe39a5c), C_MOON = new THREE.Color(0x9fb4e0), C_NHEMI = new THREE.Color(0x3a4a6e), tc1 = new THREE.Color(), tc2 = new THREE.Color();
      const serverT = () => { const W2 = S.world && S.world.time; if (!W2) return null; const sec = W2.net + (Date.now() - W2.at) / 1000; return { t: ((sec % 1800) + 1800) % 1800 / 1800, day: Math.floor(sec / 1800) + 1 }; };
      function captureEnv(LIN) { ENVL = { sun: sun.color.clone(), hemi: hemi ? hemi.color.clone() : null, ground: hemi ? hemi.groundColor.clone() : null, fog: scene.fog.color.clone(), water: water.material.color.clone(), LIN }; dnSky = -1; applyTime(true); }
      function applyTime(force) {
        if (!ENVL) return; const t = dnT, a = (t - 0.25) * Math.PI * 2, el = Math.sin(a) + 0.25; // +0,25: lange Abende wie im Spiel (hell ca. 5–21 Uhr)
        const day = THREE.MathUtils.smoothstep(el, -0.15, 0.3), set = el > -0.2 ? 1 - THREE.MathUtils.smoothstep(Math.abs(el), 0.05, 0.4) : 0;
        if (el > -0.05) sunDir.set(-Math.cos(a) * 0.85, Math.max(0.08, el), 0.45).normalize(); else sunDir.set(Math.cos(a) * 0.6, 0.75, -0.35).normalize(); // nachts: Mond gegenüber, gleichbleibend hoch
        const moon = el <= -0.05;
        sun.intensity = moon ? 0.15 + 0.3 * THREE.MathUtils.smoothstep(-el, 0.05, 0.35) : 1.2 * Math.max(0.15, day); sun.color.copy(moon ? C_MOON : tc1.copy(ENVL.sun).lerp(C_SET, set * 0.6)); if (ENVL.LIN && moon) sun.color.convertSRGBToLinear();
        if (hemi) { hemi.intensity = 0.62 * (0.45 + 0.55 * day); hemi.color.copy(ENVL.hemi).lerp(ENVL.LIN ? tc2.copy(C_NHEMI).convertSRGBToLinear() : C_NHEMI, 1 - day); }
        const fogN = ENVL.LIN ? tc2.copy(C_NHOR).convertSRGBToLinear() : C_NHOR; scene.fog.color.copy(ENVL.fog).lerp(fogN, (1 - day) * 0.85);
        water.material.color.copy(ENVL.water).multiplyScalar(0.35 + 0.65 * day);
        const key = Math.round(t * 400); if (force || key !== dnSky) { dnSky = key; tc1.copy(ENVB.top).lerp(C_NTOP, (1 - day) * 0.9); tc2.copy(ENVB.fog).lerp(C_NHOR, (1 - day) * 0.85).lerp(C_SET, set * 0.45 * day); paintSky(tc1, tc2); }
        if (!bigArea && reg) { const span = Math.max(reg.bounds[1] - reg.bounds[0], reg.bounds[3] - reg.bounds[2]); sun.position.copy(sunDir).multiplyScalar(span * 0.6 + 200); sun.target.position.set(0, 0, 0); sun.target.updateMatrixWorld(); }
        if (Math.abs(t - dnShadowT) > 0.004 || force) { dnShadowT = t; shadowFresh = false; }
        const h = Math.floor(t * 24), m = Math.floor((t * 24 - h) * 60); const ck = $('.dnClock'); if (ck) ck.textContent = String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
        const sl = $('.dnSlider'); if (sl && document.activeElement !== sl) sl.value = Math.round(t * 1440);
        invalidate();
      }
      function dnSave() { DN.t = dnT; try { localStorage.setItem('vw-daynight', JSON.stringify(DN)); } catch (e) { } }
      function dnTick() {
        const now = performance.now(), dt = (now - dnLast) / 1000; dnLast = now;
        if (!DN.paused) {
          if (DN.mode === 'server') { const st = serverT(); if (st) { dnT = st.t; $('.dnInfo').textContent = T('Tag') + ' ' + fmt(st.day) + ' · ' + T('Spielzeit vom Server, läuft weiter'); } else { DN.mode = 'normal'; $('.dnMode').value = 'normal'; } }
          if (DN.mode !== 'server') { dnT = (dnT + dt / (DN.mode === 'fast' ? 180 : 1800)) % 1; $('.dnInfo').textContent = ''; }
        } else $('.dnInfo').textContent = T('Angehalten');
        applyTime(false);
      }
      setInterval(() => { if (running) dnTick(); }, 1000);
      $('.dnPause').onclick = () => { DN.paused = !DN.paused; $('.dnPause').textContent = DN.paused ? '▶' : '⏸'; if (!DN.paused && DN.mode === 'server') DN.mode = 'normal', $('.dnMode').value = 'normal'; dnSave(); dnTick(); };
      $('.dnSlider').oninput = (e) => { dnT = +e.target.value / 1440; if (DN.mode === 'server') { DN.mode = 'normal'; $('.dnMode').value = 'normal'; } dnSave(); applyTime(false); };
      $('.dnMode').onchange = (e) => { DN.mode = e.target.value; if (DN.mode === 'server') DN.paused = false; $('.dnPause').textContent = DN.paused ? '▶' : '⏸'; dnSave(); dnTick(); };
      $('.dnMode').value = DN.mode; $('.dnPause').textContent = DN.paused ? '▶' : '⏸';
      const box = new THREE.BoxGeometry(1, 1, 1);
      const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), eu = new THREE.Euler(0, 0, 0, 'YXZ'), sv = new THREE.Vector3(), pv = new THREE.Vector3(), tmp = new THREE.Color();
      const mats = { leaf: new THREE.MeshLambertMaterial({ color: 0x3f6e2a }), fir: new THREE.MeshLambertMaterial({ color: 0x2f5a3a }), swamp: new THREE.MeshLambertMaterial({ color: 0x5a6b3a }), ygg: new THREE.MeshLambertMaterial({ color: 0x8fb8c8 }), trunk: new THREE.MeshLambertMaterial({ color: 0x5a4330 }), rock: new THREE.MeshLambertMaterial({ color: 0x7c786f }), bush: new THREE.MeshLambertMaterial({ color: 0x557a33 }) };
      const geos = { crown: new THREE.IcosahedronGeometry(1, 1), crown0: new THREE.IcosahedronGeometry(1, 0), cone: new THREE.ConeGeometry(1, 1, 7), cyl: new THREE.CylinderGeometry(0.5, 0.6, 1, 6), rock: new THREE.DodecahedronGeometry(1, 0), log: new THREE.CylinderGeometry(0.4, 0.4, 1, 6) };

      // ---------- Detailgrafik: prozedurale Texturen (Triplanar) und Formen
      function texCanvas(kind) {
        const S2 = 256, c = document.createElement('canvas'); c.width = c.height = S2; const x = c.getContext('2d');
        const rnd = (() => { let s = 7; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
        const fill = (v) => { x.fillStyle = `rgb(${v},${v},${v})`; };
        fill(225); x.fillRect(0, 0, S2, S2);
        if (kind === 'planks') { // senkrechte Bretter mit Maserung
          for (let i = 0; i < 4; i++) { fill(205 + rnd() * 40); x.fillRect(i * 64, 0, 64, S2); x.fillStyle = 'rgba(60,40,20,.55)'; x.fillRect(i * 64, 0, 3, S2);
            for (let k = 0; k < 14; k++) { x.strokeStyle = `rgba(90,60,30,${0.08 + rnd() * 0.12})`; x.beginPath(); const xx = i * 64 + 6 + rnd() * 52; x.moveTo(xx, 0); x.bezierCurveTo(xx + rnd() * 8 - 4, 80, xx + rnd() * 8 - 4, 170, xx, S2); x.stroke(); }
            x.fillStyle = 'rgba(40,30,20,.6)'; x.beginPath(); x.arc(i * 64 + 32, 30 + rnd() * 190, 2.5, 0, 7); x.fill(); x.beginPath(); x.arc(i * 64 + 32, 30 + rnd() * 190, 2.5, 0, 7); x.fill(); }
        } else if (kind === 'logs') { // liegende Stämme
          for (let i = 0; i < 4; i++) { const g = x.createLinearGradient(0, i * 64, 0, i * 64 + 64); g.addColorStop(0, '#6a5a48'); g.addColorStop(0.15, '#d8c8b0'); g.addColorStop(0.5, '#f0e2c8'); g.addColorStop(0.85, '#c8b498'); g.addColorStop(1, '#5a4a3a'); x.fillStyle = g; x.fillRect(0, i * 64, S2, 64);
            for (let k = 0; k < 10; k++) { x.strokeStyle = `rgba(80,55,30,${0.1 + rnd() * 0.1})`; x.beginPath(); const yy = i * 64 + 10 + rnd() * 44; x.moveTo(0, yy); x.lineTo(S2, yy + rnd() * 6 - 3); x.stroke(); } }
        } else if (kind === 'stone') { // Quader
          x.fillStyle = '#6e6c66'; x.fillRect(0, 0, S2, S2);
          for (let r = 0; r < 4; r++) for (let k = -1; k < 3; k++) { const off = r % 2 ? 64 : 0; const v = 175 + rnd() * 60; fill(v); x.fillRect(k * 128 + off + 4, r * 64 + 4, 120, 56);
            for (let n = 0; n < 40; n++) { x.fillStyle = `rgba(0,0,0,${rnd() * 0.08})`; x.fillRect(k * 128 + off + 4 + rnd() * 116, r * 64 + 4 + rnd() * 52, 3, 3); } }
        } else if (kind === 'shingles') { // Dachschindeln
          for (let r = 0; r < 8; r++) for (let k = -1; k < 9; k++) { const off = r % 2 ? 16 : 0; fill(170 + rnd() * 70); x.fillRect(k * 32 + off + 1, r * 32 + 1, 30, 30); x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(k * 32 + off, r * 32 + 28, 32, 4); }
        } else if (kind === 'marble') {
          x.fillStyle = '#9a9aa0'; x.fillRect(0, 0, S2, S2);
          for (let r = 0; r < 2; r++) for (let k = 0; k < 2; k++) { fill(200 + rnd() * 40); x.fillRect(k * 128 + 3, r * 128 + 3, 122, 122); for (let n = 0; n < 6; n++) { x.strokeStyle = 'rgba(255,255,255,.35)'; x.beginPath(); x.moveTo(k * 128 + rnd() * 128, r * 128); x.lineTo(k * 128 + rnd() * 128, r * 128 + 128); x.stroke(); } }
        } else if (kind === 'metal') {
          for (let i = 0; i < 8; i++) { fill(190 + rnd() * 50); x.fillRect(0, i * 32, S2, 32); x.fillStyle = 'rgba(0,0,0,.3)'; for (let k = 0; k < 4; k++) { x.beginPath(); x.arc(16 + k * 64, i * 32 + 16, 3, 0, 7); x.fill(); } }
        } else { for (let n = 0; n < 400; n++) { x.fillStyle = `rgba(0,0,0,${rnd() * 0.06})`; x.fillRect(rnd() * S2, rnd() * S2, 4, 4); } }
        const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = Math.min(8, ren.capabilities.getMaxAnisotropy()); return t;
      }
      const TEX = {}; const tex = (k) => TEX[k] || (TEX[k] = texCanvas(k));

      // Natur-Texturen: eigene Farben für Holz, Stein, Stroh … (Variante B)
      function rng(seed) { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }
      function realTex(kind){
  const S=512,c=document.createElement('canvas');c.width=c.height=S;const x=c.getContext('2d');const r=rng(11);
  const hsl=(h,s,l,a=1)=>`hsla(${h},${s}%,${l}%,${a})`;
  if(kind==='planks'){ // Bretter: warmes Braun, Maserung, Fugen, Äste
    for(let i=0;i<8;i++){const h=24+r()*8,l=30+r()*12;x.fillStyle=hsl(h,45,l);x.fillRect(i*64,0,64,S);
      for(let k=0;k<26;k++){x.strokeStyle=hsl(h,40,l-8-r()*10,0.35);x.lineWidth=0.6+r()*1.4;x.beginPath();const xx=i*64+4+r()*56;x.moveTo(xx,0);x.bezierCurveTo(xx+r()*10-5,S*0.3,xx+r()*10-5,S*0.7,xx+r()*6-3,S);x.stroke();}
      for(let k=0;k<2;k++){const kx=i*64+14+r()*36,ky=r()*S;x.fillStyle=hsl(20,50,15,0.8);x.beginPath();x.ellipse(kx,ky,4,7,0,0,7);x.fill();x.strokeStyle=hsl(20,40,22,0.5);x.beginPath();x.ellipse(kx,ky,8,13,0,0,7);x.stroke();}
      const g=x.createLinearGradient(i*64,0,i*64+64,0);g.addColorStop(0,'rgba(0,0,0,.45)');g.addColorStop(0.07,'rgba(0,0,0,0)');g.addColorStop(0.93,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(0,0,0,.35)');x.fillStyle=g;x.fillRect(i*64,0,64,S);
      if(r()<0.6){const y=r()*S;x.fillStyle='rgba(20,10,0,.6)';x.fillRect(i*64,y,64,2);} // Stoß
      x.fillStyle='rgba(40,40,40,.7)';[[i*64+10,40],[i*64+54,40],[i*64+10,S-40],[i*64+54,S-40]].forEach(([a,b])=>{x.beginPath();x.arc(a,b,2.2,0,7);x.fill();});
    }
  } else if(kind==='logs'){ // liegende Kernholz-Stämme mit Rinde
    for(let i=0;i<4;i++){const y0=i*128;const g=x.createLinearGradient(0,y0,0,y0+128);g.addColorStop(0,'#2a1c10');g.addColorStop(0.12,'#5a3c22');g.addColorStop(0.45,'#8a6038');g.addColorStop(0.6,'#7a5230');g.addColorStop(0.9,'#4a3018');g.addColorStop(1,'#1e140a');x.fillStyle=g;x.fillRect(0,y0,S,128);
      for(let k=0;k<60;k++){x.strokeStyle=hsl(25,40,15+r()*20,0.35);x.lineWidth=1+r()*2;x.beginPath();const yy=y0+10+r()*108;const xx=r()*S;x.moveTo(xx,yy);x.lineTo(xx+40+r()*120,yy+r()*4-2);x.stroke();}}
  } else if(kind==='stone'){ // Bruchstein mit Mörtel
    x.fillStyle='#57534b';x.fillRect(0,0,S,S);
    for(let row=0;row<8;row++){let xx=-r()*40;while(xx<S){const w=40+r()*50,h=56+r()*8,y=row*64+3;const l=48+r()*18,h2=30+r()*20;x.fillStyle=hsl(h2,8+r()*8,l);x.beginPath();x.moveTo(xx+4+r()*4,y+2);x.lineTo(xx+w-3,y+r()*5);x.lineTo(xx+w-1-r()*3,y+h-4);x.lineTo(xx+3,y+h-2-r()*4);x.closePath();x.fill();
      const g=x.createLinearGradient(0,y,0,y+h);g.addColorStop(0,'rgba(255,255,255,.18)');g.addColorStop(1,'rgba(0,0,0,.25)');x.fillStyle=g;x.fill();
      for(let n=0;n<25;n++){x.fillStyle=`rgba(${r()<.5?0:255},${r()<.5?0:255},${r()<.5?0:255},.07)`;x.fillRect(xx+r()*w,y+r()*h,2+r()*3,2+r()*3);} if(r()<0.25){x.fillStyle='rgba(70,110,40,.35)';x.beginPath();x.ellipse(xx+r()*w,y+h-6,10+r()*10,5,0,0,7);x.fill();} xx+=w+3;}}
  } else if(kind==='thatch'){ // Strohdach: Lagen mit Halmen
    x.fillStyle='#6a5428';x.fillRect(0,0,S,S);
    for(let row=0;row<8;row++){const y0=row*64;for(let k=0;k<900;k++){const xx=r()*S,yy=y0+r()*70,len=18+r()*40;x.strokeStyle=hsl(34+r()*12,28+r()*22,30+r()*26,0.85);x.lineWidth=0.8+r()*1.3;x.beginPath();x.moveTo(xx,yy);x.lineTo(xx+r()*6-3,yy+len);x.stroke();}
      const g=x.createLinearGradient(0,y0+44,0,y0+64);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(30,18,5,.55)');x.fillStyle=g;x.fillRect(0,y0+44,S,20);}
  } else if(kind==='tar'){ // geteerte Holzschindeln
    x.fillStyle='#1c1612';x.fillRect(0,0,S,S);
    for(let row=0;row<8;row++)for(let k=-1;k<9;k++){const off=row%2?32:0;const l=14+r()*12;x.fillStyle=hsl(25,25,l);x.fillRect(k*64+off+2,row*64+2,60,58);x.fillStyle='rgba(0,0,0,.5)';x.fillRect(k*64+off,row*64+56,64,8);for(let n=0;n<8;n++){x.strokeStyle=hsl(25,20,l+6,0.4);x.beginPath();const xx=k*64+off+6+r()*50;x.moveTo(xx,row*64+4);x.lineTo(xx,row*64+54);x.stroke();}}
  } else if(kind==='bmarble'){ // schwarzer Marmor mit Adern
    x.fillStyle='#16161a';x.fillRect(0,0,S,S);
    for(let r2=0;r2<2;r2++)for(let k=0;k<2;k++){x.fillStyle=hsl(240,6,10+r()*8);x.fillRect(k*256+4,r2*256+4,248,248);for(let n=0;n<10;n++){x.strokeStyle=hsl(200,10,45+r()*30,0.35);x.lineWidth=0.6+r();x.beginPath();let px=k*256+r()*256,py=r2*256;x.moveTo(px,py);for(let s2=0;s2<6;s2++){px+=r()*60-30;py+=45;x.lineTo(px,py);}x.stroke();}}
  } else if(kind==='iron'){
    for(let i=0;i<8;i++){x.fillStyle=hsl(210,6,26+r()*10);x.fillRect(0,i*64,S,64);x.fillStyle='rgba(0,0,0,.45)';x.fillRect(0,i*64+60,S,4);for(let k=0;k<6;k++){x.fillStyle='rgba(20,20,20,.8)';x.beginPath();x.arc(20+k*90,i*64+30,4,0,7);x.fill();x.fillStyle='rgba(180,180,190,.35)';x.beginPath();x.arc(19+k*90,i*64+29,1.5,0,7);x.fill();} for(let n=0;n<40;n++){x.fillStyle=`rgba(120,60,20,${r()*0.15})`;x.fillRect(r()*S,i*64+r()*60,6,3);}}
  } else if(kind==='detail'){ // Boden-Detail (grau, multipliziert die Geländefarbe)
    x.fillStyle='#e8e8e8';x.fillRect(0,0,S,S);for(let k=0;k<9000;k++){const v=180+r()*75;x.fillStyle=`rgba(${v},${v},${v},.6)`;x.fillRect(r()*S,r()*S,1.5,2+r()*4);}
  } else if(kind==='grass'){
    x.fillStyle='#5f8a3a';x.fillRect(0,0,S,S);for(let k=0;k<6000;k++){x.fillStyle=hsl(80+r()*30,35+r()*25,25+r()*25,0.6);x.fillRect(r()*S,r()*S,1.5,3+r()*4);}
  }
  const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=Math.min(8,ren.capabilities.getMaxAnisotropy());return t;
}

      // Grafik „Realistisch“: gemalte Texturen aus textures/ (Liste in textures/list.json). Fehlt eine Datei, bleibt die selbst gezeichnete.
      let REAL = false;
      const texBase = (() => { const sc = [...document.scripts].find((x) => /viewer\.js/.test(x.src)); return sc ? sc.src.replace(/js\/viewer\.js.*$/, '') : ''; })();
      const originals = g.VWValheimAssets && texBase && location.protocol !== 'file:' ? g.VWValheimAssets.create(texBase, THREE) : null;
      let originalRevision = 0;
      // Die Option erscheint nur, wenn das Grafikpaket (assets/valheim) auf dieser Seite vorhanden ist
      const noOriginals = () => { if (Q.detail !== 'valheim') return; Q.detail = 'natur'; const sel = $('[data-q="detail"]'); if (sel) sel.value = 'natur'; $$('[data-gs]').forEach((b) => b.classList.toggle('on', b.dataset.gs === 'natur')); try { if (reg) reloadKeep(); } catch (e) { } };
      if (!originals) noOriginals();
      if (originals) fetch(texBase + 'assets/valheim/index.json', { method: 'HEAD', cache: 'no-cache' }).then((r) => { if (!r.ok) { noOriginals(); return; } $$('[data-gs="valheim"]').forEach((b) => (b.hidden = false)); const o = $('#vwq-de option[value="valheim"]'); if (o) { o.hidden = false; o.disabled = false; } }).catch(noOriginals);
      function prepareOriginals(r) {
        const revision = ++originalRevision, status = $('.originalStatus');
        status.hidden = Q.detail !== 'valheim';
        if (status.hidden) return;
        if (!originals) { status.textContent = 'Originalgrafik ist hier nicht verfügbar. Natur-Grafik wird verwendet.'; return; }
        const names = [...new Set(r.types.map((t) => t[0]).concat(Object.keys(r.natureModels || {})))];
        status.textContent = 'Valheim-Modelle und Texturen werden geladen …';
        const before = names.filter((n) => originals.get(n)).length;
        originals.prepare(names).then((count) => {
          if (revision !== originalRevision || Q.detail !== 'valheim' || reg !== r) return;
          status.textContent = `${count} von ${names.length} Objekttypen mit Originalgrafik. Fehlende Modelle nutzen Natur-Grafik. Gelände und Effekte bleiben vereinfacht.`;
          if (count > before) reloadKeep();
        }).catch(() => {
          if (revision === originalRevision) status.textContent = 'Originalgrafik konnte nicht geladen werden. Natur-Grafik wird verwendet.';
        });
      }
      const texList = (texBase && location.protocol !== 'file:') ? fetch(texBase + 'textures/list.json', { cache: 'no-cache' }).then((r) => (r.ok ? r.json() : {})).catch(() => ({})) : Promise.resolve({});
      const RTEX = {}; const rtex = (k) => {
        const key = (REAL ? 'img:' : '') + k; if (RTEX[key]) return RTEX[key];
        const t = RTEX[key] = realTex(k);
        if (REAL) texList.then((L) => { if (!L[k]) return; const img = new Image(); img.onload = () => { t.image = img; t.needsUpdate = true; invalidate(); }; img.src = texBase + 'textures/' + k + '.jpg?v=' + L[k]; });
        return t;
      };
      const CAT_REAL = { wood: 'planks', floor: 'planks', dark: 'planks', chest: 'planks', craft: 'planks', ship: 'planks', bed: 'planks', core: 'logs', roof: 'thatch', droof: 'tar', stone: 'stone', portal: 'stone', fire: 'stone', marble: 'bmarble', iron: 'iron', misc: 'planks' };
      const CAT_TEX = { wood: 'planks', floor: 'planks', dark: 'planks', core: 'logs', roof: 'shingles', droof: 'shingles', stone: 'stone', marble: 'marble', iron: 'metal', chest: 'planks', craft: 'planks', ship: 'planks', bed: 'planks', portal: 'stone', fire: 'stone', misc: 'plain' };
      function triplanar(mat, scale) {
        mat.onBeforeCompile = (sh) => {
          sh.uniforms.uTri = { value: scale };
          sh.vertexShader = 'varying vec3 vTriP; varying vec3 vTriN;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
            vec3 triS = vec3(1.0);
            #ifdef USE_INSTANCING
              triS = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
            #endif
            vTriP = position * triS; vTriN = normal;`);
          sh.fragmentShader = 'uniform float uTri; varying vec3 vTriP; varying vec3 vTriN;\n' + sh.fragmentShader.replace('#include <map_fragment>', `
            vec3 tw = abs(normalize(vTriN)); tw = pow(tw, vec3(4.0)); tw /= (tw.x + tw.y + tw.z);
            vec4 tA = texture2D(map, vTriP.zy * uTri); vec4 tB = texture2D(map, vTriP.xz * uTri); vec4 tC = texture2D(map, vTriP.xy * uTri);
            diffuseColor *= tA * tw.x + tB * tw.y + tC * tw.z;`);
        };
        mat.customProgramCacheKey = () => 'tri' + scale;
        return mat;
      }
      function pieceMat(cat, mode) {
        const glass = cat === 'glass';
        const m = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: glass, opacity: glass ? 0.55 : 1 });
        if (glass || mode === 'simple') return m;
        if (mode === 'natur') { m.map = rtex(CAT_REAL[cat] || 'planks'); triplanar(m, cat === 'roof' || cat === 'droof' ? 0.72 : 0.62); m.customProgramCacheKey = () => 'nat' + cat; }
        else { m.map = tex(CAT_TEX[cat] || 'plain'); triplanar(m, cat === 'roof' || cat === 'droof' ? 0.82 : 0.62); }
        return m;
      }
      // Formen: Prismen für Giebel/Firste, Zylinder für Pfosten und Stämme
      function prism(pts) { // Dreieck in XY (x∈[-.5,.5], y∈[-.5,.5]), Tiefe z∈[-.5,.5]
        const sh = new THREE.Shape(); sh.moveTo(pts[0][0], pts[0][1]); pts.slice(1).forEach((p) => sh.lineTo(p[0], p[1])); sh.closePath();
        const g = new THREE.ExtrudeGeometry(sh, { depth: 1, bevelEnabled: false }); g.translate(0, 0, -0.5); return g;
      }
      const SHAPES = {
        box: box,
        cyl: new THREE.CylinderGeometry(0.5, 0.5, 1, 10),
        logx: (() => { const g = new THREE.CylinderGeometry(0.5, 0.5, 1, 10); g.rotateZ(Math.PI / 2); return g; })(),
        tri: prism([[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5]]),
        triInv: prism([[-0.5, 0.5], [0.5, 0.5], [-0.5, -0.5]]),
        triF: prism([[0.5, -0.5], [-0.5, -0.5], [0.5, 0.5]]),
        triInvF: prism([[0.5, 0.5], [-0.5, 0.5], [0.5, -0.5]]),
        gable: prism([[-0.5, -0.5], [0.5, -0.5], [0, 0.5]]),
        ridge: (() => { const g = prism([[-0.5, -0.5], [0.5, -0.5], [0, 0.5]]); g.rotateY(Math.PI / 2); return g; })()
      };
      const YO = (ty) => (ty[5] != null ? ty[5] : /stair|stepladder/i.test(ty[0]) && !/spiral/i.test(ty[0]) ? ty[2] / 2 : 0); // Bezugspunkt: aus dem Spiel gemessen (Truhen, Portale … stehen auf dem Boden)
      function shapeOf(name) {
        if (/pole|stone_pillar_round|groundtorch|walltorch|brazierceiling|spice|mortarandpestle|spinningwheel|treasure_stack|treasure_pile|stone_pile|coal_pile|spiralstair|chest_barrel|piece_pot\d|fire_pit_iron|bonfire|Candle|brazierfloor|xmastree/.test(name)) return 'cyl';
        if (/wood_wall_log_4x0\.5|wood_log_(26|45)|_log$|wood_core_stack/.test(name)) return 'logx';
        if (/wall_roof.*upsidedown.*flipped/.test(name)) return 'triInvF';
        if (/wall_roof.*flipped/.test(name)) return 'triF';
        if (/wall_roof.*upsidedown/.test(name)) return 'triInv';
        if (/wall_roof_top/.test(name)) return 'gable';
        if (/wall_roof/.test(name)) return 'tri';
        if (/roof_top/.test(name)) return 'ridge';
        return 'box';
      }
      let curMode = 'natur', bigArea = false, reg = null, CX = 0, CZ = 0, content = null, meshes = {}, pickList = [], natG = null, terrain = null, labels = [], showLbl = true, colorMode = 'mat';
      const areaG = new THREE.Group(), changeG = new THREE.Group(); scene.add(areaG, changeG);
      let roomDefs = [], roomLab = [], changeDef = null, changeMode = 'off', areaPick = null, areaFirst = null;
      function emptyGroup(group) { while (group.children.length) { const o = group.children[0]; group.remove(o); if (o.geometry) o.geometry.dispose(); for (const m of [].concat(o.material || [])) m.dispose(); } }
      function drawAreas(rooms = roomDefs) {
        roomDefs = rooms; emptyGroup(areaG); roomLab.forEach((l) => l.d.remove()); roomLab = [];
        if (!reg) return;
        for (const r of rooms) {
          const size = r.max.map((n, i) => n - r.min[i]), center = r.max.map((n, i) => (n + r.min[i]) / 2);
          if (r.max[0] < reg.bounds[0] || r.min[0] > reg.bounds[1] || r.max[2] < reg.bounds[2] || r.min[2] > reg.bounds[3]) continue;
          const box = new THREE.BoxGeometry(...size), edges = new THREE.EdgesGeometry(box); box.dispose();
          const mesh = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x4ddbd4, transparent: true, opacity: 0.8 }));
          mesh.position.copy(W(...center)); areaG.add(mesh);
          const d = document.createElement('div'); d.className = 'vw-lbl'; d.textContent = r.name; LB.appendChild(d); roomLab.push({ d, v: W(center[0], r.max[1], center[2]) });
        }
        invalidate();
      }
      function tintChanges() {
        if (!reg || !changeDef || changeMode === 'off' || changeMode === 'removed') return;
        const keys = new Set(changeDef.added.map((p) => [p.name, [p.x, p.y, p.z].join(','), p.yaw].join('|')));
        for (const im of Object.values(meshes).flat()) { const a = im.userData.arr;
          for (let i = 0; i < a.length; i += 6) if (keys.has([reg.types[a[i + 4]][0], [a[i], a[i + 1], a[i + 2]].join(','), a[i + 3]].join('|'))) im.setColorAt(i / 6, tmp.setHex(0x33ff66));
          if (im.instanceColor) im.instanceColor.needsUpdate = true;
        }
      }
      function drawChanges(data = changeDef, mode = changeMode) {
        changeDef = data; changeMode = mode; emptyGroup(changeG); if (!reg) return;
        recolor(colorMode);
        if (data && mode !== 'off' && mode !== 'added') for (const p of data.removed) {
          if (p.x < reg.bounds[0] || p.x > reg.bounds[1] || p.z < reg.bounds[2] || p.z > reg.bounds[3]) continue;
          const spec = g.VW_DATA.pieces[p.name] || ['misc', 1, 1, 1], box = new THREE.BoxGeometry(spec[1], spec[2], spec[3]), edges = new THREE.EdgesGeometry(box); box.dispose();
          const ghost = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0xff4444 })); ghost.position.copy(W(p.x, p.y, p.z)); ghost.rotation.y = -p.yaw * Math.PI / 180; changeG.add(ghost);
        }
        invalidate();
      }
      function beginArea(fn) { if (areaPick) areaPick(null); areaPick = fn; areaFirst = null; cv.style.cursor = fn ? 'crosshair' : ''; if (fn) { if (walk) toggleWalk(false); if (fly) toggleFly(false); } }
      addEventListener('keydown', (e) => { if (e.code === 'Escape' && areaPick) beginArea(null); });
      const W = (x, y, z) => new THREE.Vector3(x - CX, y - WL, -(z - CZ));
      const LB = $('.vw-labels');
      // Kamera
      let tgt = new THREE.Vector3(), dist = 400, yaw = -0.6, pit = 0.9;
      function views(v) {
        if (fly) toggleFly(false);
        const prevRegId = reg && reg.id;
        let c = reg ? W(reg.center[0], 34, reg.center[1]) : new THREE.Vector3();
        if (reg && (reg.id === 'world' || reg.id === 'seed') && S.bases[0] && v !== 'top') c = W(S.bases[0].center[0], 34, S.bases[0].center[1]);
        if (v === 'top') { tgt.copy(c); dist = Math.max(reg.bounds[1] - reg.bounds[0], reg.bounds[3] - reg.bounds[2]) * 1.15; pit = 1.52; yaw = 0; }
        else if (v === 'near') { tgt.copy(c); dist = 140; pit = 0.55; yaw = -0.9; }
        else { tgt.copy(c); dist = reg.id === 'world' ? 1600 : reg.id === 'seed' ? 3200 : Math.max(160, Math.max(reg.bounds[1] - reg.bounds[0], reg.bounds[3] - reg.bounds[2]) * 0.8); pit = 0.9; yaw = -0.6; }
        $$('[data-v]').forEach((b) => b.classList.toggle('on', b.dataset.v === v));
      }
      $$('[data-v]').forEach((b) => (b.onclick = () => views(b.dataset.v)));
      function orbit() {
        pit = Math.max(0.08, Math.min(1.55, pit)); dist = Math.max(12, Math.min(25000, dist));
        cam.position.set(tgt.x + dist * Math.cos(pit) * Math.sin(yaw), tgt.y + dist * Math.sin(pit), tgt.z + dist * Math.cos(pit) * Math.cos(yaw)); cam.lookAt(tgt);
        const nn = Math.min(40, Math.max(0.5, dist / 400)); if (Math.abs(cam.near - nn) > 0.05) { cam.near = nn; cam.updateProjectionMatrix(); } // Nahgrenze mit dem Zoom: genaue Tiefe, kein Flackern von Wasser/Strand
      }
      function clear() {
        if (content) { scene.remove(content); content.traverse((o) => { if (o.userData.original) return; if (o.geometry && !Object.values(geos).includes(o.geometry) && o.geometry !== box && !Object.values(SHAPES).includes(o.geometry)) o.geometry.dispose(); if (o.material && !Object.values(mats).includes(o.material)) o.material.dispose(); }); }
        labels.forEach((l) => l.d.remove()); labels = []; meshes = {}; pickList = []; clearMarkers(); $('.vw-chest').hidden = true;
      }
      function load(r, keepCam) {
        clear(); reg = r; content = new THREE.Group(); scene.add(content);
        const [X0, X1, Z0, Z1] = r.bounds; CX = (X0 + X1) / 2; CZ = (Z0 + Z1) / 2;
        const pmode = Q.detail === 'simple' ? 'simple' : ((Q.detail === 'natur' || Q.detail === 'real' || Q.detail === 'valheim') && colorMode !== 'own') ? 'natur' : 'full'; curMode = pmode; REAL = Q.detail === 'real';
        ren.outputEncoding = Q.detail === 'valheim' ? THREE.sRGBEncoding : THREE.LinearEncoding;
        const span = Math.max(X1 - X0, Z1 - Z0); bigArea = span > 2000; const sc = sun.shadow.camera;
        const sh = bigArea ? 380 : span / 2 + 20; sc.left = -sh; sc.right = sh; sc.top = sh; sc.bottom = -sh; sc.far = bigArea ? 1600 : 1500; sc.updateProjectionMatrix();
        if (!bigArea) { sun.position.copy(sunDir).multiplyScalar(span * 0.6 + 200); sun.target.position.set(0, 0, 0); }
        applyEnvironment(r, bigArea);
        // „Valheim Original“ rendert in sRGB: die übrigen (in sRGB angegebenen) Farben dafür nach linear umrechnen, sonst wirkt alles blass
        const LIN = Q.detail === 'valheim';
        skyTex.encoding = LIN ? THREE.sRGBEncoding : THREE.LinearEncoding; skyTex.needsUpdate = true;
        if (LIN) { scene.fog.color.convertSRGBToLinear(); sun.color.convertSRGBToLinear(); if (hemi) { hemi.color.convertSRGBToLinear(); hemi.groundColor.convertSRGBToLinear(); } water.material.color.convertSRGBToLinear(); }
        captureEnv(LIN);
        const RF = { near: 0.5, mid: 1, far: 2 }[Q.range] || 1; scene.fog.near = (bigArea ? 2500 : span * 0.9) * RF; scene.fog.far = (bigArea ? 14000 : span * 2.6 + 400) * RF; if (r.id === 'seed') { scene.fog.near = 6000 * RF; scene.fog.far = 32000 * RF; }
        // Gelände
        { const SPN = g.VW_DATA && g.VW_DATA.pieces; if (SPN) r.types.forEach((t) => { const sp = SPN[t[0]]; if (sp) { t[1] = sp[1]; t[2] = sp[2]; t[3] = sp[3]; t[4] = sp[4]; t[5] = sp[5]; } }); } // ältere Snapshots: aktuelle Maße nehmen
        const NX = r.nx, NZ = r.nz, RS = r.res; let H = r.H16; if (!H) { const hu = b64u8(r.h); H = new Int16Array(hu.buffer, hu.byteOffset, hu.byteLength / 2); } const bio = r.bio || bioAt;
        TER = { H, NX, NZ, RS, X0, Z0 };
        const hAt = (i, j) => H[Math.min(NZ - 1, Math.max(0, j)) * NX + Math.min(NX - 1, Math.max(0, i))] / 10;
        const tg = new THREE.BufferGeometry(), pos = new Float32Array(NX * NZ * 3), col = new Float32Array(NX * NZ * 3);
        const cSand = new THREE.Color(0xb9a273), cG = new THREE.Color(0x5f8a3a), cG2 = new THREE.Color(0x45692c), cRock = new THREE.Color(0x77736a), cSea = new THREE.Color(0x5e5c4a), cDirt = new THREE.Color(0x6b5a3c);
        // Valheim-artige Bodenfarben je Biom: [Grundfarbe, Variante] – Flecken aus weichem Rauschen
        const BIO3 = { 1: [0x4c7d2a, 0x6d8e33], 2: [0x4f5232, 0x3b3f2a], 3: [0xb9c0c6, 0x8f9499], 4: [0x34552b, 0x4a4a2e], 5: [0xb59f55, 0x93924a], 6: [0x4a2e26, 0x6a3a28], 7: [0xd6e0e8, 0xb8c4cc], 9: [0x4f5266, 0x5d5a52] };
        const c3a = new THREE.Color(), c3b = new THREE.Color();
        const noise = (x, z) => (Math.sin(x * 0.021 + Math.sin(z * 0.013) * 2.1) + Math.sin(z * 0.017 - x * 0.009 + Math.cos(x * 0.011) * 1.7) + Math.sin((x + z) * 0.047) * 0.5) / 2.5;
        for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) {
          const k = j * NX + i, h = hAt(i, j), x = X0 + i * RS, z = Z0 + j * RS;
          pos[k * 3] = x - CX; pos[k * 3 + 1] = h - WL; pos[k * 3 + 2] = -(z - CZ);
          const sl = Math.hypot(hAt(i + 1, j) - hAt(i - 1, j), hAt(i, j + 1) - hAt(i, j - 1)) / (2 * RS), e = h - WL;
          if (e < 0) tmp.copy(cSea).lerp(cSand, THREE.MathUtils.smoothstep(e, -7, 0)); // unter Wasser: Meeresgrund → Sand
          else { const b3 = BIO3[bio(x, z)]; const nz = noise(x, z);
              if (b3) { c3a.setHex(b3[0]); c3b.setHex(b3[1]); tmp.copy(c3a).lerp(c3b, THREE.MathUtils.smoothstep(nz, -0.2, 0.6)); } else tmp.copy(cG).lerp(cG2, Math.min(1, Math.max(0, e - 2) / 25));
              const nd = noise(x * 3.1 + 500, z * 3.1 - 300); if (nd > 0.55) tmp.lerp(cDirt, Math.min(0.35, (nd - 0.55) * 1.6)); // Erdflecken
            tmp.lerp(cSand, 1 - THREE.MathUtils.smoothstep(e, 0.4, 2.4)); } // Strand weich ins Land
          if (e > 70) tmp.lerp(new THREE.Color(0xe8eef2), Math.min(1, (e - 70) / 40));
          if (sl > 0.7) tmp.lerp(cRock, Math.min(1, (sl - 0.7) * 1.5));
          tmp.offsetHSL(0, 0, (Math.sin(x * 0.37) * Math.cos(z * 0.29) + Math.sin(x * 0.11 + z * 0.13)) * 0.03);
          if (LIN) tmp.convertSRGBToLinear();
          col[k * 3] = tmp.r; col[k * 3 + 1] = tmp.g; col[k * 3 + 2] = tmp.b;
        }
        const MK = r.MK || (r.mask ? b64u8(r.mask) : null);
        const idx = new Uint32Array((NX - 1) * (NZ - 1) * 6); let t = 0;
        for (let j = 0; j < NZ - 1; j++) for (let i = 0; i < NX - 1; i++) { const a = j * NX + i, b = a + 1, c = a + NX, d = c + 1; if (MK && !(MK[a] | MK[b] | MK[c] | MK[d])) continue; idx[t++] = a; idx[t++] = b; idx[t++] = c; idx[t++] = b; idx[t++] = d; idx[t++] = c; }
        tg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); tg.setAttribute('color', new THREE.BufferAttribute(col, 3)); tg.setIndex(new THREE.BufferAttribute(idx.subarray(0, t), 1)); tg.computeVertexNormals();
        const tmat = new THREE.MeshLambertMaterial({ vertexColors: true }); if (pmode === 'natur') { tmat.map = rtex('detail'); triplanar(tmat, 0.35); tmat.customProgramCacheKey = () => 'terrDetail'; }
        terrain = new THREE.Mesh(tg, tmat); terrain.receiveShadow = true; content.add(terrain);
        // Bauteile: je Kategorie und Form ein InstancedMesh (detailliert: Texturen + echte Formen)
        const detailed = pmode !== 'simple';
        for (const [cat, arr] of Object.entries(r.pieces)) {
          const n = arr.length / 6; if (!n) continue;
          const groups = {};
          for (let k = 0; k < n; k++) { const o = k * 6; const ty = r.types[arr[o + 4]]; const shape = Q.detail === 'valheim' && originals && originals.get(ty[0]) ? 'original:' + ty[0] : detailed ? shapeOf(ty[0]) : 'box'; const sk = shape + '@' + Math.floor(arr[o] / 128) + ',' + Math.floor(arr[o + 2] / 128); (groups[sk] || (groups[sk] = [])).push(o); }
          for (const [sk, idxs] of Object.entries(groups)) {
            const shape = sk.split('@')[0], original = shape.startsWith('original:') && originals.get(shape.slice(9));
            const im = new THREE.InstancedMesh(original ? original.geometry : SHAPES[shape], original ? original.materials : pieceMat(cat, pmode), idxs.length); im.castShadow = true; im.receiveShadow = true;
            const sub = new Array(idxs.length * 6), bounds = new THREE.Box3();
            idxs.forEach((o, k) => {
              for (let j = 0; j < 6; j++) sub[k * 6 + j] = arr[o + j];
              const ty = r.types[arr[o + 4]], tilt = (ty[4] || 0) * Math.PI / 180, alongX = ty[1] >= ty[3] * 1.5;
              pv.set(arr[o] - CX, arr[o + 1] - WL, -(arr[o + 2] - CZ)); if (!original) pv.y += YO(ty);
              if (tilt && alongX) eu.set(0, -arr[o + 3] * Math.PI / 180, tilt, 'YXZ'); else eu.set(-tilt, -arr[o + 3] * Math.PI / 180, 0, 'YXZ');
              if (original) { eu.set(0, -arr[o + 3] * Math.PI / 180, 0, 'YXZ'); sv.set(1, 1, 1); }
              else sv.set(ty[1], ty[2], ty[3]);
              q.setFromEuler(eu); m4.compose(pv, q, sv); im.setMatrixAt(k, m4); bounds.expandByPoint(pv);
            });
            im.userData = { cat, arr: sub, original: !!original, bounds: bounds.expandByScalar(40) }; (meshes[cat] || (meshes[cat] = [])).push(im); content.add(im); pickList.push(im);
          }
        }
        recolor(colorMode);
        heroColors(Q.detail === 'valheim');
        if (typeof walk !== 'undefined' && walk) { buildColliders(); if (reg.id !== prevRegId && !teleporting) spawn(); } // Laufmodus bleibt bei Neuladen (Live-Update, Originalgrafik) aktiv
        // Natur
        natG = new THREE.Group(); content.add(natG);
        let N = r.nature || {};
        if (Q.detail === 'valheim' && originals && r.natureModels) {
          N = {};
          for (const [name, entry] of Object.entries(r.natureModels)) {
            const model = originals.get(name), a = entry.instances;
            if (!model) { const fallback = N[entry.kind] || (N[entry.kind] = []); for (const v of a) fallback.push(v); continue; }
            const step = bigArea ? ({ low: 4, mid: 2, high: 1 }[Q.nature] || 1) : (Q.nature === 'low' ? 2 : 1);
            const im = new THREE.InstancedMesh(model.geometry, model.materials, Math.ceil(a.length / 5 / step));
            let instance = 0;
            for (let i = 0; i < a.length; i += 5 * step) {
              pv.set(a[i] - CX, a[i + 1] - WL, -(a[i + 2] - CZ));
              eu.set(0, -a[i + 3] * Math.PI / 180, 0, 'YXZ'); q.setFromEuler(eu); sv.setScalar(a[i + 4] || 1);
              m4.compose(pv, q, sv); im.setMatrixAt(instance++, m4);
            }
            im.userData.original = true; im.castShadow = !bigArea; im.receiveShadow = true; natG.add(im);
          }
        }
        const NS = bigArea ? { low: 4, mid: 2, high: 1 }[Q.nature] : { low: 2, mid: 1, high: 1 }[Q.nature] || 1;
        const list = (keys, f) => { const out = []; keys.forEach(([k, s]) => { const a = N[k] || []; for (let i = 0, c = 0; i < a.length; i += 5, c++) if (c % NS === 0) out.push([a[i], a[i + 1], a[i + 2], a[i + 3], a[i + 4], s]); }); return out; };
        function inst(geo, mat, arr, fn) { if (!arr.length) return; const im = new THREE.InstancedMesh(geo, mat, arr.length); im.castShadow = !bigArea; arr.forEach((p, k) => { fn(p); im.setMatrixAt(k, m4); }); natG.add(im); }
        const at = (p, dy, sx, sy, sz, ry) => { pv.set(p[0] - CX, p[1] - WL + dy, -(p[2] - CZ)); eu.set(0, ry || 0, 0); q.setFromEuler(eu); sv.set(sx, sy, sz); m4.compose(pv, q, sv); };
        const CR = bigArea ? geos.crown0 : geos.crown;
        const dec = list([['tree_beech', 1], ['tree_beech_s', 0.55], ['tree_birch', 0.8], ['tree_oak', 1.4]]);
        inst(geos.cyl, mats.trunk, dec, (p) => { const s = p[4] * p[5]; at(p, 4 * s, 0.9 * s, 8 * s, 0.9 * s); });
        inst(CR, mats.leaf, dec, (p) => { const s = p[4] * p[5]; at(p, 10 * s, 4.2 * s, 4.6 * s, 4.2 * s, p[3]); });
        const firs = list([['tree_fir', 1], ['tree_fir_s', 0.45]]);
        inst(geos.cone, mats.fir, firs, (p) => { const s = p[4] * p[5]; at(p, 9 * s, 3.4 * s, 16 * s, 3.4 * s); });
        const sw = list([['tree_swamp', 1]]); inst(geos.cyl, mats.trunk, sw, (p) => { const s = p[4]; at(p, 5 * s, 1.2 * s, 10 * s, 1.2 * s); }); inst(CR, mats.swamp, sw, (p) => { const s = p[4]; at(p, 11 * s, 4 * s, 3 * s, 4 * s); });
        const yg = list([['tree_ygg', 1]]); inst(geos.cyl, mats.trunk, yg, (p) => { const s = p[4]; at(p, 6 * s, 1 * s, 12 * s, 1 * s); }); inst(CR, mats.ygg, yg, (p) => { const s = p[4]; at(p, 13 * s, 5 * s, 2.5 * s, 5 * s); });
        inst(CR, mats.bush, list([['bush', 1]]), (p) => { const s = p[4]; at(p, 0.6 * s, 1.3 * s, 1 * s, 1.3 * s, p[3]); });
        inst(geos.rock, mats.rock, list([['rock', 1]]), (p) => { const s = p[4] || 1; at(p, 0.2 * s, 1.2 * s, 0.8 * s, 1 * s, p[3] * Math.PI / 180); });
        inst(geos.log, mats.trunk, list([['log', 1]]), (p) => { pv.set(p[0] - CX, p[1] - WL + 0.4, -(p[2] - CZ)); eu.set(0, -p[3] * Math.PI / 180, Math.PI / 2); q.setFromEuler(eu); sv.set(1, 8, 1); m4.compose(pv, q, sv); });
        // Beschriftungen
        labels = (r.labels || []).map((l) => { const d = document.createElement('div'); d.className = 'vw-lbl ' + l[0]; d.textContent = ({ bed: '🛏 ', tomb: '✝ ' }[l[0]] || '⛩ ') + (l[1] || '(ohne Name)'); LB.appendChild(d); return { d, v: W(l[2], l[3], l[4]), k: l[0] }; });
        // Seitenleiste
        $('.own').innerHTML = r.builders.map((o) => `<tr><td>${esc(o[0])}</td><td class="n">${fmt(o[1])}</td></tr>`).join('') || '<tr><td class="sub">–</td></tr>';
        $('.top').innerHTML = r.topTypes.slice(0, 15).map((t) => `<tr><td>${esc(pieceName(t[0]))}</td><td class="n">${fmt(t[1])}</td></tr>`).join('');
        chestSearch(); placePlans(); drawPlayers(); shadowFresh = false; shadowPasses = 2; invalidate();
        if (!keepCam) views('obl');
        SEL.reset(); TL.onLoad(); prepareOriginals(r); drawRoute3(); drawAreas(); drawChanges();
      }
      function recolor(mode) {
        colorMode = mode;
        for (const im of Object.values(meshes).flat()) {
          const { cat, arr } = im.userData; const n = arr.length / 6;
          const NAT_TINT = { dark: 0x8a7a6a, misc: 0xd8d0c0 };
          for (let k = 0; k < n; k++) { const o = k * 6; tmp.setHex(mode === 'own' ? OWNC[arr[o + 5] % OWNC.length] : curMode === 'natur' ? (NAT_TINT[cat] || 0xffffff) : CAT[cat] ? CAT[cat][0] : 0xb4a58a); if (mode !== 'own') { const j = ((arr[o] * 7.3 + arr[o + 2] * 3.1 + arr[o + 1] * 5.7) % 1 + 1) % 1; tmp.offsetHSL(0, 0, (j - 0.5) * 0.07); } im.setColorAt(k, tmp); }
          if (im.userData.original && mode !== 'own') for (let k = 0; k < n; k++) im.setColorAt(k, tmp.setHex(0xffffff));
          im.instanceColor.needsUpdate = true;
        }
        tintChanges(); SEL.paint();
        invalidate();
        const L = $('.legend');
        if (!reg) return;
        L.innerHTML = mode === 'own' ? reg.owners.map((o, i) => `<div><span class="sw" style="background:${hex(OWNC[i % OWNC.length])}"></span>${esc(o)}</div>`).join('')
          : Object.keys(meshes).map((c) => `<div><span class="sw" style="background:${hex((CAT[c] || CAT.misc)[0])}"></span>${(CAT[c] || CAT.misc)[1]} <span class="sub">(${fmt(meshes[c].reduce((a, m) => a + m.count, 0))})</span></div>`).join('');
      }
      $('.cMat').onclick = () => { $('.cMat').classList.add('on'); $('.cOwn').classList.remove('on'); colorMode = 'mat'; if ((Q.detail === 'natur' || Q.detail === 'real' || Q.detail === 'valheim') && reg) reloadKeep(); else recolor('mat'); };
      $('.cOwn').onclick = () => { $('.cOwn').classList.add('on'); $('.cMat').classList.remove('on'); colorMode = 'own'; if (curMode === 'natur' && reg) reloadKeep(); else recolor('own'); };
      const layerDefs = [['Bauteile', (v) => Object.values(meshes).flat().forEach((m) => (m.visible = v))], ['Dächer', (v) => ['roof', 'droof'].forEach((c) => meshes[c] && meshes[c].forEach((m) => (m.visible = v)))], ['Vegetation', (v) => natG && (natG.visible = v)], ['Wasser', (v) => (water.visible = v)], ['Namen', (v) => (showLbl = v)]];
      const layerState = layerDefs.map(() => true);
      layerDefs.forEach(([n, f], i) => { const b = document.createElement('button'); b.textContent = n; b.className = 'on'; b.onclick = () => { layerState[i] = !layerState[i]; b.classList.toggle('on', layerState[i]); f(layerState[i]); invalidate(); }; $('.layers').appendChild(b); });
      const applyLayers = () => { layerDefs.forEach(([, f], i) => f(layerState[i])); invalidate(); };


      // ---- Leistung: Schatten nur im Stillstand neu berechnen, Einstellungen
      let shadowFresh = false, lastMove = 0;
      function refreshShadow() {
        if (!sun.castShadow || !reg) return;
        if (bigArea) { const c = tgt; sun.target.position.set(c.x, c.y, c.z); sun.position.set(c.x + sunDir.x * 650, c.y + sunDir.y * 650, c.z + sunDir.z * 650); }
        sun.target.updateMatrixWorld(); ren.shadowMap.needsUpdate = true; shadowFresh = true; invalidate();
      }
      let shadowPasses = 0;
      function reloadKeep() { const st = { tgt: tgt.clone(), dist, yaw, pit }; load(reg, true); applyLayers(); tgt.copy(st.tgt); dist = st.dist; yaw = st.yaw; pit = st.pit; }
      function setShadows(on) { sun.castShadow = on; shadowFresh = false; shadowPasses = on ? 2 : 0; invalidate(); }
      const syncGs = () => $$('[data-gs]').forEach((b) => b.classList.toggle('on', b.dataset.gs === Q.detail));
      $$('[data-profile]').forEach((b) => b.onclick = () => { Object.assign(Q, ({ low: { detail: 'natur', nature: 'low', shadows: '0', res: '0.5', range: 'near' }, mid: { detail: originals ? 'valheim' : 'natur', nature: 'mid', shadows: '0', res: '1', range: 'mid' }, high: { detail: originals ? 'valheim' : 'natur', nature: 'high', shadows: '1', res: '1', range: 'far' } })[b.dataset.profile]); try { localStorage.setItem('vw-quality', JSON.stringify(Q)); } catch (e) { } $$('[data-q]').forEach((el) => el.value = Q[el.dataset.q]); ren.setPixelRatio(Math.min(devicePixelRatio, 2) * +Q.res); setShadows(Q.shadows === '1' && !fly && !walk); syncGs(); if (reg) reloadKeep(); resize(); });
      $$('[data-gs]').forEach((b) => (b.onclick = () => { const sel = $('[data-q="detail"]'); sel.value = b.dataset.gs; sel.onchange(); }));
      $$('[data-q]').forEach((el) => {
        el.value = Q[el.dataset.q];
        el.onchange = () => {
          Q[el.dataset.q] = el.value; syncGs(); try { localStorage.setItem('vw-quality', JSON.stringify(Q)); } catch (e) { }
          if (el.dataset.q === 'shadows') setShadows(Q.shadows === '1' && !fly);
          else if (el.dataset.q === 'res') { ren.setPixelRatio(Math.min(devicePixelRatio, 2) * +Q.res); resize(); }
          else if (reg) reloadKeep();
          invalidate();
        };
      });
      syncGs();
      // ---- Live-Spieler
      const plG = new THREE.Group(); scene.add(plG); let plLab = [];
      const plMat = new THREE.MeshBasicMaterial({ color: 0x4cc36b, depthTest: false, transparent: true, opacity: 0.9 });
      const plBody = new THREE.CylinderGeometry(0.45, 0.45, 1.8, 10), plRing = new THREE.TorusGeometry(1.6, 0.12, 6, 24); plRing.rotateX(Math.PI / 2);
      function drawPlayers() {
        plG.clear(); plLab.forEach((l) => l.d.remove()); plLab = [];
        const all = livePlayers(); $('.plOnline').hidden = !all.length;
        const PL = $('.plList'), names = all.map((p) => p.name).join('|');
        if (PL.dataset.names !== names) { PL.dataset.names = names; PL.innerHTML = all.map((p, i) => `<div class="r" data-i="${i}"><span>● ${esc(p.name)}</span><span class="pc"></span></div>`).join(''); }
        $$('.pc', PL).forEach((el, i) => { el.textContent = Math.round(all[i].x) + ' / ' + Math.round(all[i].z); });
        PL.onclick = (e) => { const d = e.target.closest('.r'); if (!d) return; const p = livePlayers()[+d.dataset.i]; if (!p) return; const inside = reg && p.x >= reg.bounds[0] && p.x <= reg.bounds[1] && p.z >= reg.bounds[2] && p.z <= reg.bounds[3]; if (!inside) { const ri = areas().findIndex((r) => p.x >= r.bounds[0] && p.x <= r.bounds[1] && p.z >= r.bounds[2] && p.z <= r.bounds[3]); if (ri >= 0) selectRegion(ri); } if (fly) toggleFly(false); tgt.copy(W(p.x, p.y, p.z)); dist = 45; pit = 0.6; };
        invalidate();
        // Online-Spieler als laufende Figuren (wie im Laufmodus); Spieler, die schon über MQTT als Figur kommen, nicht doppelt
        const seen = new Set(), now = performance.now();
        all.forEach((p) => {
          if (p.peer) return; seen.add(p.name); let O = OP.get(p.name);
          if (!O) { const h = makeHero(COLS[[...p.name].reduce((a, c) => a + c.charCodeAt(0), 0) % COLS.length]); scene.add(h.g); O = { h, x: p.x, y: p.y, z: p.z, tx: p.x, ty: p.y, tz: p.z, r: 0, anim: 0, run: 0, t: now }; OP.set(p.name, O); }
          const dx = p.x - O.tx, dz = p.z - O.tz, d = Math.hypot(dx, dz); if (d > 0.15) O.r = Math.atan2(dx, -dz);
          if (d > 60) { O.x = p.x; O.y = p.y; O.z = p.z; } // Teleport (Portal): springen statt gleiten
          O.run = d > 0.15 ? Math.min(2, d / Math.max(0.3, (now - O.t) / 1000) / 4) : 0; O.tx = p.x; O.ty = p.y; O.tz = p.z; O.t = now;
          const r = new THREE.Mesh(plRing, plMat); r.renderOrder = 11; plG.add(r); O.ring = r;
          const dv = document.createElement('div'); dv.className = 'vw-lbl pl'; dv.textContent = '● ' + p.name; LB.appendChild(dv); O.lab = { d: dv, v: new THREE.Vector3() }; plLab.push(O.lab);
        });
        for (const [n, O] of OP) if (!seen.has(n)) { scene.remove(O.h.g); OP.delete(n); }
        opTick(0);
      }
      // ---- Baupläne (.vwplan): als Modell einblenden, verschieben, drehen
      const planG = new THREE.Group(); scene.add(planG);
      let plans = [], plActive = -1;
      const b64ToU8 = b64u8;
      function planMesh(data) {
        const grp = new THREE.Group();
        data.groups.forEach((gp) => {
          const P = new Int16Array(b64ToU8(gp.p).buffer), Nn = new Int8Array(b64ToU8(gp.n).buffer);
          const pos = new Float32Array(P.length), nor = new Float32Array(Nn.length);
          for (let i = 0; i < P.length; i++) pos[i] = P[i] / 100; for (let i = 0; i < Nn.length; i++) nor[i] = Nn[i] / 127;
          const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
          const m = new THREE.Mesh(geo, planMat(gp)); m.castShadow = m.receiveShadow = true; grp.add(m);
        });
        grp.userData.mode = curMode; return grp;
      }
      // B-Grafik für Baupläne: Farbe → Holz, Stamm, Stroh, Stein oder Eisen; Stoffe/Deko bleiben einfarbig
      const PLMAT = {};
      function planMat(gp) {
        const key = curMode + gp.c + gp.o; if (PLMAT[key]) return PLMAT[key];
        const col = new THREE.Color('#' + gp.c), hsl = {}; col.getHSL(hsl); const H = hsl.h * 360, S = hsl.s, L = hsl.l;
        const m = new THREE.MeshLambertMaterial({ color: col, transparent: gp.o < 100, opacity: gp.o / 100, side: THREE.DoubleSide });
        let k = null;
        if (curMode === 'natur' && gp.o >= 100) {
          if (S < 0.14) k = L < 0.2 ? 'iron' : 'stone';
          else if (H >= 15 && H <= 50) k = (L > 0.42 && S > 0.3) ? 'thatch' : L < 0.2 ? 'logs' : 'planks';
        }
        if (k) { m.map = rtex(k); m.color.setHex(k === 'stone' ? (L > 0.45 ? 0xffffff : 0xd0ccc4) : k === 'thatch' ? 0xfff2d8 : 0xffffff); triplanar(m, k === 'thatch' ? 0.6 : 0.5); m.customProgramCacheKey = () => 'plan' + k; }
        return (PLMAT[key] = m);
      }
      function groundAt(x, z) {
        if (!reg) return WL; const [X0, , Z0] = reg.bounds; const hu = b64u8(reg.h); const H = new Int16Array(hu.buffer, hu.byteOffset, hu.byteLength / 2);
        const i = Math.max(0, Math.min(reg.nx - 1, Math.round((x - X0) / reg.res))), j = Math.max(0, Math.min(reg.nz - 1, Math.round((z - Z0) / reg.res))); return H[j * reg.nx + i] / 10;
      }
      function placePlans() {
        plans.forEach((p, i) => {
          if (p.group.userData.mode !== curMode) { planG.remove(p.group); p.group = planMesh(p.data); planG.add(p.group); }
          const inside = reg && p.region === reg.id; p.group.visible = !!inside;
          if (inside) { p.group.position.copy(W(p.x, p.y, p.z)); p.group.rotation.y = p.r * Math.PI / 180; }
        });
        const ctl = $('.plCtl'), p = plans[plActive];
        ctl.hidden = !(p && reg && p.region === reg.id);
        invalidate();
        if (p) $('.plPos').textContent = `${p.name} · x ${Math.round(p.x)} / z ${Math.round(p.z)} · Boden ${(p.y - WL).toFixed(1)} m ü. M. · ${p.r}° · ca. ${Math.round(p.data.size[0])} × ${Math.round(p.data.size[2])} m`;
      }
      function addPlan(data, at) {
        if (!data || data.format !== 'vwplan') throw new Error('Keine gültige Bauplan-Datei (.vwplan).');
        if (!reg) return;
        let x, y, z, r = 0;
        if (at) ({ x, y, z, r } = at); else { x = tgt.x + CX; z = -tgt.z + CZ; y = Math.max(WL + 0.3, groundAt(x, z) + 0.3); }
        const p = { name: data.name || 'Bauplan', data, x: Math.round(x), y: Math.round(y * 10) / 10, z: Math.round(z), r, region: at && at.region ? at.region : reg.id, group: planMesh(data) };
        planG.add(p.group); plans.push(p); plActive = plans.length - 1; placePlans(); return p;
      }
      $$('[data-pm]').forEach((b) => (b.onclick = () => { const p = plans[plActive]; if (!p) return; const [dx, dz] = b.dataset.pm.split(',').map(Number); p.x += dx; p.z += dz; placePlans(); }));
      $$('[data-pr]').forEach((b) => (b.onclick = () => { const p = plans[plActive]; if (!p) return; p.r = ((p.r + Number(b.dataset.pr)) % 360 + 360) % 360; placePlans(); }));
      $$('[data-py]').forEach((b) => (b.onclick = () => { const p = plans[plActive]; if (!p) return; p.y = Math.round((p.y + Number(b.dataset.py)) * 10) / 10; placePlans(); }));
      $('.plDel').onclick = () => { const p = plans[plActive]; if (!p) return; planG.remove(p.group); plans.splice(plActive, 1); plActive = plans.length - 1; placePlans(); };
      $('.plGo').onclick = () => { const p = plans[plActive]; if (!p) return; if (fly) toggleFly(false); tgt.copy(W(p.x, p.y, p.z)); dist = Math.max(60, p.data.size[0] * 1.5); pit = 0.55; };
      async function loadPlanFromBytes(u8) { const txt = (u8[0] === 0x1f && u8[1] === 0x8b) ? fflate.strFromU8(fflate.gunzipSync(u8)) : fflate.strFromU8(u8); return addPlan(JSON.parse(txt)); }
      $('.plFile input').onchange = async (e) => { const f = e.target.files[0]; if (!f) return; try { await loadPlanFromBytes(new Uint8Array(await f.arrayBuffer())); } catch (er) { $('.plPos').textContent = er.message; $('.plCtl').hidden = false; } e.target.value = ''; };
      const plSel = $('.plSel');
      (opts.plans || []).forEach((pl, i) => { const o = document.createElement('option'); o.value = i; o.textContent = pl.name; plSel.appendChild(o); });
      if (!(opts.plans || []).length) plSel.hidden = true;
      plSel.onchange = async () => { const pl = (opts.plans || [])[plSel.value]; plSel.value = ''; if (!pl) return; try { const r = await fetch(pl.url); await loadPlanFromBytes(new Uint8Array(await r.arrayBuffer())); } catch (er) { $('.plPos').textContent = 'Plan nicht ladbar: ' + er.message; $('.plCtl').hidden = false; } };
      function getPlans() { return plans.map((p) => ({ name: p.name, region: p.region, x: p.x, y: p.y, z: p.z, r: p.r, data: p.data })); }
      function setPlans(list) { plans.forEach((p) => planG.remove(p.group)); plans = []; plActive = -1; (list || []).forEach((p) => { const q = { name: p.name, data: p.data, x: p.x, y: p.y, z: p.z, r: p.r || 0, region: p.region, group: planMesh(p.data) }; planG.add(q.group); plans.push(q); plActive = plans.length - 1; }); placePlans(); }

      // ---- Kisten: Suche, Marker, Popup
      const mk = new THREE.Group(); scene.add(mk);
      const mkGeo = new THREE.ConeGeometry(0.8, 1.8, 12); mkGeo.rotateX(Math.PI);
      const mkMat = new THREE.MeshBasicMaterial({ color: 0xffc83d, depthTest: false, transparent: true, opacity: 0.95 }), beamMat = new THREE.MeshBasicMaterial({ color: 0xffd54a, transparent: true, opacity: 0.28, depthWrite: false, depthTest: false });
      const beamGeo = new THREE.CylinderGeometry(0.18, 0.18, 30, 8);
      let chLab = [], curQ = '';
      const nm = (s) => (g.VW_I18N ? g.VW_I18N.names(s) : [s]);
      const hitItem = (it, q) => q && nm(it[0]).some((n) => n.toLowerCase().includes(q));
      function clearMarkers() { mk.clear(); chLab.forEach((l) => l.d.remove()); chLab = []; }
      function chestSearch() {
        const q = $('.cq').value.trim().toLowerCase(); curQ = q; clearMarkers(); const CR = $('.cres');
        if (!reg) return;
        const roomFilter = workspace && workspace.filter3();
        if (!q && !roomFilter) { CR.innerHTML = `<div class="sub">${reg.chests.length} Kisten in diesem Gebiet. Treffer werden gelb markiert, Kiste anklicken zeigt den Inhalt.</div>`; return; }
        const matches = [];
        reg.chests.forEach((c, i) => { if (roomFilter && workspace.chestRoom(c)?.id !== roomFilter) return; const n = c.i.filter((it) => hitItem(it, q)).reduce((a, b) => a + b[1], 0); if (!q || n || c.s.toLowerCase().includes(q) || (workspace?.chestRoom(c)?.name || '').toLowerCase().includes(q)) matches.push({ i, n }); });
        matches.sort((a, b) => b.n - a.n);
        matches.forEach((m) => {
          const c = reg.chests[m.i], v = W(c.x, c.y, c.z);
          const cone = new THREE.Mesh(mkGeo, mkMat); cone.renderOrder = 10; cone.position.set(v.x, v.y + 3.2, v.z); cone.userData.base = v.y + 3.2; mk.add(cone);
          const beam = new THREE.Mesh(beamGeo, beamMat); beam.renderOrder = 9; beam.position.set(v.x, v.y + 19, v.z); mk.add(beam);
          const d = document.createElement('div'); d.className = 'vw-lbl ch'; d.textContent = (c.s || c.t) + (m.n ? ' · ' + fmt(m.n) : ''); d.onclick = () => openChest(m.i, true); LB.appendChild(d); chLab.push({ d, v: new THREE.Vector3(v.x, v.y + 4.6, v.z) });
        });
        const total = matches.reduce((a, m) => a + m.n, 0);
        CR.innerHTML = `<div class="sub">${matches.length} Kisten · ${fmt(total)} Stück</div>` + matches.slice(0, 40).map((m) => { const c = reg.chests[m.i]; return `<div class="r" data-i="${m.i}"><span>${esc(c.s || 'ohne Schild')} <span class="sub">· ${esc(c.t)}</span></span><span>${m.n ? fmt(m.n) : ''}</span></div>`; }).join('') + (matches.length > 40 ? `<div class="sub">… ${matches.length - 40} weitere</div>` : '') + (matches.length ? '' : '<div class="sub">Nichts gefunden.</div>');
        $$('.r', CR).forEach((d) => (d.onclick = () => openChest(+d.dataset.i, true)));
        invalidate();
      }
      $('.cq').addEventListener('input', chestSearch);
      function openChest(i, go) {
        const c = reg.chests[i];
        if (go) { const v = W(c.x, c.y, c.z); if (fly) { const f = fdir(); fp.copy(v).addScaledVector(f, -7); fp.y += 1.5; } else { tgt.copy(v); dist = 38; pit = Math.max(pit, 0.6); } }
        let it = c.i; if (curQ) it = [...it.filter((x) => hitItem(x, curQ)), ...it.filter((x) => !hitItem(x, curQ))];
        const P = $('.vw-chest');
        P.innerHTML = `<button class="x" aria-label="Schließen">✕</button><h3>${esc(c.s || 'ohne Schild')}</h3><div class="sub" style="margin-bottom:8px">${esc(c.t)}${c.o ? ' · ' + esc(c.o) : ''} · x ${Math.round(c.x)} / z ${Math.round(c.z)}</div>` + (it.length ? `<ul class="it">${it.map((x) => `<li class="${hitItem(x, curQ) ? 'm' : ''}"><span>${esc(x[0])}</span><span>${fmt(x[1])}</span></li>`).join('')}</ul>` : '<div class="sub">leer</div>');
        P.hidden = false; $('.x', P).onclick = () => (P.hidden = true);
      }
      function chestAt(p) { let best = -1, bd = 1.2; reg.chests.forEach((c, i) => { const d = Math.hypot(c.x - p[0], c.y - p[1], c.z - p[2]); if (d < bd) { bd = d; best = i; } }); return best; }

      // ---- Eingabe (Orbit)
      const ptrs = new Map(); let drag = null, pd = 0, downAt = null;
      cv.addEventListener('contextmenu', (e) => e.preventDefault());
      cv.addEventListener('pointerdown', (e) => { cv.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); drag = { b: e.button, shift: e.shiftKey }; downAt = { x: e.clientX, y: e.clientY, shift: e.shiftKey }; });
      const pUp = (e) => {
        ptrs.delete(e.pointerId); if (!ptrs.size) drag = null; pd = 0;
        if (e.type === 'pointerup' && downAt && Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) < 5) {
          if (areaPick) { const hit = rayHit(e, true); if (hit) { const p = { x: hit.point.x + CX, y: hit.point.y + WL, z: CZ - hit.point.z }; if (!areaFirst) { areaFirst = p; areaPick(p, null); } else { const fn = areaPick, first = areaFirst; areaPick = null; areaFirst = null; cv.style.cursor = ''; fn(first, p); } } return; }
          const h = rayHit(e);
          if (SEL.active) { if (h && h.instanceId != null) SEL.click(h.object, h.instanceId, e.shiftKey || downAt.shift); }
          else if (h && h.object.userData.cat === 'chest') { const k = chestAt(arrAt(h)); if (k >= 0) openChest(k, false); }
        }
      };
      cv.addEventListener('pointerup', pUp); cv.addEventListener('pointercancel', pUp);
      function pan(dx, dy) { const s = dist * 0.0016; const fw = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw)), rt = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw)); tgt.addScaledVector(rt, -dx * s).addScaledVector(fw, -dy * s); }
      cv.addEventListener('pointermove', (e) => {
        const p = ptrs.get(e.pointerId); if (!p) { if (walk) { TIP.hidden = true; return; } hover(e); return; }
        const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
        if (walk) { lookWalk(dx, dy); return; }
        if (fly) { fyw -= dx * 0.0045; fpt = Math.max(-1.5, Math.min(1.5, fpt - dy * 0.0045)); return; }
        if (ptrs.size === 2) { const a = [...ptrs.values()]; const d = Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y); if (pd) dist *= pd / d; pd = d; pan(dx / 2, dy / 2); }
        else if (drag && (drag.b === 2 || drag.shift)) pan(dx, dy); else { yaw -= dx * 0.006; pit += dy * 0.005; }
      });
      cv.addEventListener('wheel', (e) => { e.preventDefault(); if (walk) { wdist = Math.max(0, Math.min(14, (wdist < 0.6 && e.deltaY > 0 ? 1.2 : wdist * Math.exp(e.deltaY * 0.0016)))); if (wdist < 0.6) wdist = 0; invalidate(); return; } if (fly) { fspd = Math.max(2, Math.min(200, fspd * Math.exp(-e.deltaY * 0.0015))); return; } dist *= Math.exp(e.deltaY * 0.0012); }, { passive: false });
      const ray = new THREE.Raycaster(), mv = new THREE.Vector2();
      function rayHit(e, withTerrain) { const r = cv.getBoundingClientRect(); mv.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1); ray.setFromCamera(mv, cam); const objs = pickList.filter((m) => m.visible); if (withTerrain) objs.push(terrain); return ray.intersectObjects(objs)[0]; }
      const arrAt = (h) => { const a = h.object.userData.arr, o = h.instanceId * 6; return [a[o], a[o + 1], a[o + 2], a[o + 3], a[o + 4], a[o + 5]]; };
      cv.addEventListener('dblclick', (e) => { if (fly || walk) return; const h = rayHit(e, true); if (h) { tgt.copy(h.point); dist = Math.max(30, dist * 0.45); } });
      const TIP = $('.vw-tip'); let lastHover = 0;
      function hover(e) {
        const now = performance.now(); if (now - lastHover < 60) return; lastHover = now;
        const h = rayHit(e); const r = pane.getBoundingClientRect();
        if (h && h.instanceId != null) {
          const p = arrAt(h), t = reg.types[p[4]];
          TIP.hidden = false; TIP.style.left = (e.clientX - r.left + 14) + 'px'; TIP.style.top = (e.clientY - r.top + 12) + 'px';
          const pc = pieceCost(t[0]);
          TIP.innerHTML = `<b>${esc(pieceName(t[0]))}</b>${h.object.userData.cat === 'chest' ? ' · <span style="color:var(--acc)">klicken für Inhalt</span>' : ''}${pc ? '<br><span class="sub">' + pc.map(([hh, n]) => fmt(n) + ' ' + esc(itemName(hh))).join(' · ') + '</span>' : ''}<br>${esc(reg.owners[p[5]])}<br><span class="sub">x ${p[0].toFixed(0)} · z ${p[2].toFixed(0)} · ${(p[1] - WL).toFixed(1)} m ü. M.</span>`;
        } else TIP.hidden = true;
      }

      // ---- Flugmodus (Tastatur, Joystick, Gamepad)
      let fly = false, fyw = 0, fpt = 0, fspd = 14, fast = false, jx = 0, jy = 0, bu = 0, bd = 0; const fp = new THREE.Vector3(), keys = {};
      const fdir = () => new THREE.Vector3(Math.cos(fpt) * Math.sin(fyw), Math.sin(fpt), Math.cos(fpt) * Math.cos(fyw));
      const JOY = $('.vw-joy'), JK = $('.k', JOY), UD = $('.vw-ud'), HUD = $('.vw-hud'), CROSS = $('.vw-cross'), FB = $('.flyBtn');
      function toggleFly(on) {
        if (on === undefined) on = !fly; if (on === fly) return; fly = on; FB.classList.toggle('on', fly); JOY.hidden = UD.hidden = HUD.hidden = CROSS.hidden = !fly;
        cam.near = fly ? 0.1 : 0.5; cam.updateProjectionMatrix(); setShadows(!fly && Q.shadows === '1');
        if (fly) { fp.copy(cam.position); const d = tgt.clone().sub(cam.position).normalize(); fyw = Math.atan2(d.x, d.z); fpt = Math.asin(d.y); if (fp.distanceTo(tgt) > 120) { fp.copy(tgt).addScaledVector(d, -60); fp.y = Math.max(fp.y, tgt.y + 25); } if (innerWidth <= 760) $('.s3').classList.add('min'); $$('[data-v]').forEach((b) => b.classList.remove('on')); }
        else { const f = fdir(); tgt.copy(fp).addScaledVector(f, 40); dist = 40; yaw = Math.atan2(-f.x, -f.z); pit = Math.max(0.08, Math.asin(-f.y)); }
      }
      FB.onclick = () => toggleFly();
      const kd = (e) => { if (tab !== '3d' || /INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return; if (e.code === 'KeyF' && !walk) { toggleFly(); return; } if (e.code === 'KeyG') { toggleWalk(); return; } if (walk && e.code === 'KeyE') { interact(); return; } if (e.code === 'Escape' && walk && document.pointerLockElement !== cv) { toggleWalk(false); return; } if (e.code === 'Escape' && fly) { toggleFly(false); return; } keys[e.code] = true; if ((fly || walk) && /^(Arrow|Space)/.test(e.code)) e.preventDefault(); };
      const ku = (e) => { keys[e.code] = false; };
      addEventListener('keydown', kd); addEventListener('keyup', ku); addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
      let jid = null;
      function jset(e) { const r = JOY.getBoundingClientRect(); let x = (e.clientX - r.left - r.width / 2) / (r.width / 2), y = (e.clientY - r.top - r.height / 2) / (r.height / 2); const l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l; } jx = x; jy = y; JK.style.transform = `translate(${x * r.width * 0.33}px,${y * r.height * 0.33}px)`; }
      JOY.addEventListener('pointerdown', (e) => { jid = e.pointerId; JOY.setPointerCapture(jid); jset(e); });
      JOY.addEventListener('pointermove', (e) => { if (e.pointerId === jid) jset(e); });
      const jend = (e) => { if (e.pointerId !== jid) return; jid = null; jx = jy = 0; JK.style.transform = ''; };
      JOY.addEventListener('pointerup', jend); JOY.addEventListener('pointercancel', jend);
      $$('[data-ud]', UD).forEach((b) => {
        if (b.dataset.ud === 'fast') { b.onclick = () => { fast = !fast; b.classList.toggle('on', fast); }; return; }
        const set = (v) => { if (b.dataset.ud === 'up') bu = v; else bd = v; };
        b.addEventListener('pointerdown', (e) => { b.setPointerCapture(e.pointerId); set(1); }); ['pointerup', 'pointercancel'].forEach((t) => b.addEventListener(t, () => set(0)));
      });
      const dz = (v) => (Math.abs(v) < 0.15 ? 0 : v); let padStart = false;
      function flyStep(dt) {
        let mx = 0, mz = 0, my = 0, lx = 0, ly = 0, boost = fast || keys.ShiftLeft || keys.ShiftRight;
        if (keys.KeyW || keys.ArrowUp) mz += 1; if (keys.KeyS || keys.ArrowDown) mz -= 1; if (keys.KeyD || keys.ArrowRight) mx += 1; if (keys.KeyA || keys.ArrowLeft) mx -= 1;
        if (keys.Space || keys.KeyE) my += 1; if (keys.KeyC || keys.KeyQ || keys.ControlLeft) my -= 1;
        mx += jx; mz -= jy; my += bu - bd;
        const gps = navigator.getGamepads ? navigator.getGamepads() : [];
        for (const gp of gps) { if (!gp) continue; mx += dz(gp.axes[0] || 0); mz -= dz(gp.axes[1] || 0); lx += dz(gp.axes[2] || 0); ly += dz(gp.axes[3] || 0); const bt = (i) => (gp.buttons[i] ? gp.buttons[i].value : 0); my += bt(7) + bt(5) - bt(6) - bt(4); if (bt(10) || bt(0)) boost = true; const st = gp.buttons[9] && gp.buttons[9].pressed; if (st && !padStart) toggleFly(false); padStart = st; break; }
        fyw -= lx * 2.2 * dt; fpt = Math.max(-1.5, Math.min(1.5, fpt - ly * 1.8 * dt));
        const f = fdir(), rt = new THREE.Vector3(-Math.cos(fyw), 0, Math.sin(fyw)), sp = fspd * (boost ? 4 : 1) * dt;
        fp.addScaledVector(f, mz * sp).addScaledVector(rt, mx * sp); fp.y += my * sp; fp.y = Math.max(-35, Math.min(800, fp.y));
        cam.position.copy(fp); cam.lookAt(fp.clone().add(f));
        const fn = Math.min(4, Math.max(0.1, (fp.y - WL) / 300)); if (Math.abs(cam.near - fn) > 0.02) { cam.near = fn; cam.updateProjectionMatrix(); }
        HUD.innerHTML = `<b>Flugmodus</b> · ${Math.round(fspd * (boost ? 4 : 1))} m/s · Höhe ${fp.y.toFixed(0)} m<br><span class="m sub">Joystick = fliegen · ziehen = umsehen · ▲▼ Höhe · » schnell</span><span class="k sub">WASD/Pfeile · Maus ziehen = umsehen · Leertaste/E hoch · C/Q runter · Shift schnell · Mausrad Tempo · Gamepad · F/Esc beenden</span>`;
      }

      // ---- Laufmodus: Figur in 3rd/1st Person, Kollision mit Bauteilen, Türen und Portale (E)
      let teleporting = false;
      let walk = false, wyaw = 0, wpit = 0.25, wdist = 4.5, vy = 0, onGround = false, anim = 0, lockLook = false, wmsg = '', wmsgT = 0;
      const pos = new THREE.Vector3(), WB = $('.walkBtn'), ACT = $('.vw-act2'), PROMPT = $('.vw-prompt');
      let OBB = [], GRID = new Map(), DOORS = [], TER = null;
      const GS = 4, gkey = (x, z) => Math.floor(x / GS) + ',' + Math.floor(z / GS);
      const iq = new THREE.Quaternion(), lv = new THREE.Vector3(), ld = new THREE.Vector3();
      function terrainY(x, z) { // Szenen-Koordinaten → Geländehöhe (bilinear)
        if (!TER) return -1e9; const wx = x + CX, wz = CZ - z, fi = (wx - TER.X0) / TER.RS, fj = (wz - TER.Z0) / TER.RS;
        const i = Math.max(0, Math.min(TER.NX - 2, Math.floor(fi))), j = Math.max(0, Math.min(TER.NZ - 2, Math.floor(fj))), u = Math.min(1, Math.max(0, fi - i)), v = Math.min(1, Math.max(0, fj - j));
        const h = (a, b) => TER.H[b * TER.NX + a] / 10;
        return (h(i, j) * (1 - u) + h(i + 1, j) * u) * (1 - v) + (h(i, j + 1) * (1 - u) + h(i + 1, j + 1) * u) * v - WL;
      }
      function buildColliders() { // aus den gezeichneten Bauteilen: orientierte Boxen in einem 4-m-Raster
        OBB = []; GRID = new Map(); DOORS = [];
        pickList.forEach((im) => {
          const a = im.userData.arr; if (!a) return;
          for (let k = 0; k < a.length / 6; k++) {
            const o = k * 6, ty = reg.types[a[o + 4]], nm = ty[0], tilt = (ty[4] || 0) * Math.PI / 180, alongX = ty[1] >= ty[3] * 1.5;
            const c = new THREE.Vector3(a[o] - CX, a[o + 1] - WL + YO(ty), -(a[o + 2] - CZ));
            if (tilt && alongX) eu.set(0, -a[o + 3] * Math.PI / 180, tilt, 'YXZ'); else eu.set(-tilt, -a[o + 3] * Math.PI / 180, 0, 'YXZ');
            const qq = new THREE.Quaternion().setFromEuler(eu), h = new THREE.Vector3(ty[1] / 2, ty[2] / 2, ty[3] / 2);
              let rampAxis = 'z', rampSign = 1;
              if (im.userData.original) {
                if (!im.geometry.boundingBox) im.geometry.computeBoundingBox();
                const matrix = new THREE.Matrix4(), scale = new THREE.Vector3(); im.getMatrixAt(k, matrix); matrix.decompose(pv, qq, scale);
                im.geometry.boundingBox.getCenter(c).applyMatrix4(matrix); im.geometry.boundingBox.getSize(h).multiplyScalar(0.5).multiply(scale);
                if (/stair|ladder/i.test(nm)) {
                  const p = im.geometry.attributes.position.array, mean = [0, 0, 0]; for (let j = 0; j < p.length; j++) mean[j % 3] += p[j] / (p.length / 3);
                  let x = 0, z = 0; for (let j = 0; j < p.length; j += 3) { x += (p[j] - mean[0]) * (p[j + 1] - mean[1]); z += (p[j + 2] - mean[2]) * (p[j + 1] - mean[1]); }
                  rampAxis = Math.abs(x) > Math.abs(z) ? 'x' : 'z'; rampSign = Math.sign(rampAxis === 'x' ? x : z) || 1;
                }
              }
            const door = /door|gate|grate/i.test(nm) && !/portal|drawbridge|cloth/i.test(nm), portal = /^portal/i.test(nm), chest = im.userData.cat === 'chest', cloth = /cloth|banner|rug|carpet|torch|Candle|lantern|garland|sapling|mistletoe/i.test(nm);
            const r = Math.hypot(h.x, h.y, h.z);
            const ramp = /stair|ladder/i.test(nm); // Treppen/Leitern: begehbare Rampe statt Klotz
              const b = { c, q: qq, iq: qq.clone().invert(), h, r, door, portal, chest, ramp, rampAxis, rampSign, open: false, pass: cloth, im, k, ty };
            OBB.push(b); if (door || portal || chest) DOORS.push(b);
            const x0 = Math.floor((c.x - r) / GS), x1 = Math.floor((c.x + r) / GS), z0 = Math.floor((c.z - r) / GS), z1 = Math.floor((c.z + r) / GS);
            for (let gx = x0; gx <= x1; gx++) for (let gz = z0; gz <= z1; gz++) { const kk = gx + ',' + gz; let l = GRID.get(kk); if (!l) GRID.set(kk, (l = [])); l.push(b); }
          }
        });
      }
      const near = (x, z) => GRID.get(gkey(x, z)) || [];
      function rayBox(b, o, d, tmax) { // Strahl gegen orientierte Box → Abstand oder null
        lv.copy(o).sub(b.c).applyQuaternion(b.iq); ld.copy(d).applyQuaternion(b.iq);
        let t0 = 0, t1 = tmax;
        for (const ax of ['x', 'y', 'z']) {
          if (Math.abs(ld[ax]) < 1e-9) { if (Math.abs(lv[ax]) > b.h[ax]) return null; continue; }
          let a1 = (-b.h[ax] - lv[ax]) / ld[ax], a2 = (b.h[ax] - lv[ax]) / ld[ax]; if (a1 > a2) [a1, a2] = [a2, a1];
          t0 = Math.max(t0, a1); t1 = Math.min(t1, a2); if (t0 > t1) return null;
        }
        return t0;
      }
      const DOWN = new THREE.Vector3(0, -1, 0);
      function groundY(x, z, fromY) { // höchste begehbare Fläche unter fromY
        let g = terrainY(x, z); const o = new THREE.Vector3(x, fromY, z);
        for (const b of near(x, z)) {
          if (b.pass || (b.door && b.open)) continue; if (Math.abs(b.c.x - x) > b.r || Math.abs(b.c.z - z) > b.r) continue;
          if (b.ramp) { // Höhe auf der Schräge; Steigrichtung unbekannt → die Richtung nehmen, die unter den Füßen liegt
            lv.set(x - b.c.x, 0, z - b.c.z).applyQuaternion(b.iq); if (Math.abs(lv.x) > b.h.x + 0.1 || Math.abs(lv.z) > b.h.z + 0.05) continue;
              const axis = b.rampAxis, t = Math.max(0, Math.min(1, (lv[axis] * b.rampSign + b.h[axis]) / (2 * b.h[axis]))), y0 = b.c.y - b.h.y, H2 = 2 * b.h.y;
              const hh = y0 + t * H2; if (hh <= fromY + 0.01) g = Math.max(g, hh);
            continue;
          }
          let t = rayBox(b, o, DOWN, 40);
          if (t !== null && t <= 1e-4) { o.y = fromY + 0.45; t = rayBox(b, o, DOWN, 40); o.y = fromY; if (t !== null && t > 1e-4) t -= 0.45; else t = null; } // im Klotz: nur knapp höhere Oberkante zählt, sonst Hindernis
          if (t !== null) g = Math.max(g, fromY - t);
        }
        return g;
      }
      const RAD = 0.35, STEP = 0.55, HEIGHT = 1.8;
      function pushOut(p) { // seitliche Kollision: Körper als Säule aus drei Kugeln
        for (let it = 0; it < 2; it++) for (const b of near(p.x, p.z)) {
          if (b.pass || b.ramp || (b.door && b.open)) continue; if (Math.abs(b.c.x - p.x) > b.r + RAD || Math.abs(b.c.z - p.z) > b.r + RAD) continue;
          for (const hy of [STEP + 0.15, 1.0, 1.6]) {
            lv.set(p.x, p.y + hy, p.z).sub(b.c).applyQuaternion(b.iq);
            const cx = Math.max(-b.h.x, Math.min(b.h.x, lv.x)), cy = Math.max(-b.h.y, Math.min(b.h.y, lv.y)), cz = Math.max(-b.h.z, Math.min(b.h.z, lv.z));
            ld.set(lv.x - cx, lv.y - cy, lv.z - cz); const d = ld.length(); if (d >= RAD) continue;
            if (d < 1e-6) { ld.set(lv.x / (b.h.x || 1), 0, lv.z / (b.h.z || 1)); if (Math.abs(ld.x) > Math.abs(ld.z)) ld.set(Math.sign(lv.x) || 1, 0, 0); else ld.set(0, 0, Math.sign(lv.z) || 1); ld.multiplyScalar(RAD); }
            else ld.multiplyScalar((RAD - d) / d);
            ld.applyQuaternion(b.q); ld.y = 0; p.add(ld);
          }
        }
      }
      // Figur aus einfachen Formen (eigenes Modell, kein Spiel-Asset)
      const HERO_MATS = []; let heroLin = false;
      function heroColors(lin) { if (lin === heroLin) return; heroLin = lin; HERO_MATS.forEach((m) => { m.color.setHex(m.userData.hex); if (lin) m.color.convertSRGBToLinear(); }); }
      // ---- Route des Routenplaners in 3D: Linie mit nummerierten Wegpunkten (Portalsprünge gestrichelt)
      let RT3 = null, rtG = null, rtLab = [];
      const rtMatU = new THREE.LineDashedMaterial({ color: 0xf28c28, dashSize: 1, gapSize: 2, depthTest: false, transparent: true });
      const rtMat = new THREE.LineBasicMaterial({ color: 0xffc83d, depthTest: false, transparent: true, opacity: 0.95 }), rtMatJ = new THREE.LineDashedMaterial({ color: 0xbe96ff, dashSize: 3, gapSize: 3, depthTest: false, transparent: true });
      function drawRoute3() {
        if (rtG) { scene.remove(rtG); rtG.traverse((o) => o.geometry && o.geometry.dispose()); rtG = null; } rtLab.forEach((l) => l.d.remove()); rtLab = [];
        if (!RT3 || !reg) { invalidate(); return; } rtG = new THREE.Group(); rtG.renderOrder = 12; scene.add(rtG);
        const P = RT3.path; let seg = [];
        const flush = (mat, pts) => { if (pts.length < 2) return; const g2 = new THREE.BufferGeometry().setFromPoints(pts); const ln = new THREE.Line(g2, mat); ln.renderOrder = 12; if (mat.isLineDashedMaterial) ln.computeLineDistances(); rtG.add(ln); };
        P.forEach((p, i) => { const v = W(p.x, p.y + 1.5, p.z); if (p.jump || p.uncertain) { flush(rtMat, seg); flush(p.jump ? rtMatJ : rtMatU, [W(P[i - 1].x, P[i - 1].y + 1.5, P[i - 1].z), v]); seg = [v]; } else seg.push(v); }); flush(rtMat, seg);
        RT3.pts.forEach((p, i) => { const d = document.createElement('div'); d.className = 'vw-lbl rt'; d.style.background = '#ffc83d'; d.style.color = '#2a1d08'; d.style.fontWeight = '700'; d.textContent = (i + 1) + ' ' + p.label; LB.appendChild(d); rtLab.push({ d, v: W(p.x, p.y + 3, p.z) }); });
        invalidate();
      }
      function setRoute3(R) { RT3 = R; drawRoute3(); }
      function showRoute3() {
        if (!RT3) return; const p0 = RT3.pts[0]; const A = areas(); let i = A.findIndex((r) => r.id !== 'world' && r.id !== 'seed' && p0.x >= r.bounds[0] && p0.x <= r.bounds[1] && p0.z >= r.bounds[2] && p0.z <= r.bounds[3]); if (i < 0) i = A.findIndex((r) => r.id === 'world'); if (i < 0) i = 0;
        if (!reg || reg !== A[i]) selectRegion(i); else drawRoute3(); tgt.copy(W(p0.x, p0.y, p0.z)); dist = 90; pit = 0.75; invalidate();
      }
      const OP = new Map(); // Online-Spieler-Figuren
      function opTick(dt) {
        if (!OP.size) return; let moved = false; const k = dt ? Math.min(1, dt * 4) : 0;
        for (const O of OP.values()) {
          if (k) { O.x += (O.tx - O.x) * k; O.y += (O.ty - O.y) * k; O.z += (O.tz - O.z) * k; }
          let dr = O.r - O.h.g.rotation.y; dr = Math.atan2(Math.sin(dr), Math.cos(dr)); O.h.g.rotation.y += dr * (dt ? Math.min(1, dt * 8) : 1);
          const going = Math.abs(O.tx - O.x) + Math.abs(O.tz - O.z) > 0.05;
          if (going) { O.anim += dt * (O.run > 1.2 ? 13 : 9); moved = true; } else O.anim *= 0.85;
          const sw = Math.sin(O.anim) * (going ? 0.7 : 0); O.h.legL.rotation.x = sw; O.h.legR.rotation.x = -sw; O.h.armL.rotation.x = -sw * 0.8; O.h.armR.rotation.x = sw * 0.8;
          const inside = reg && O.x >= reg.bounds[0] - 50 && O.x <= reg.bounds[1] + 50 && O.z >= reg.bounds[2] - 50 && O.z <= reg.bounds[3] + 50;
          O.h.g.visible = !!inside; O.h.g.position.set(O.x - CX, O.y - WL, CZ - O.z);
          if (O.ring) { O.ring.visible = !!inside; O.ring.position.set(O.x - CX, O.y - WL + 0.1, CZ - O.z); }
          if (O.lab) { O.lab.v.set(O.x - CX, O.y - WL + 2.6, CZ - O.z); O.lab.out = !inside; }
        }
        if (moved) invalidate();
      }
      function makeHero(tunicCol) {
        const G = new THREE.Group();
        const hm = (c) => { const m = new THREE.MeshLambertMaterial({ color: c }); m.userData.hex = c; if (heroLin) m.color.convertSRGBToLinear(); HERO_MATS.push(m); return m; };
        const part = (geo, mat, x, y, z, parent) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; (parent || G).add(m); return m; };
        const skin = hm(0xe0b090), tunic = hm(tunicCol), pants = hm(0x4a4038), iron = hm(0x8a8f95), beard = hm(0xb0602a), boots = hm(0x2e2620);
        const legL = new THREE.Group(), legR = new THREE.Group(), armL = new THREE.Group(), armR = new THREE.Group();
        [[legL, -0.13], [legR, 0.13]].forEach(([g2, x]) => { g2.position.set(x, 0.85, 0); G.add(g2); part(new THREE.BoxGeometry(0.2, 0.75, 0.22), pants, 0, -0.4, 0, g2); part(new THREE.BoxGeometry(0.22, 0.14, 0.32), boots, 0, -0.78, 0.04, g2); });
        part(new THREE.BoxGeometry(0.5, 0.62, 0.3), tunic, 0, 1.15, 0); part(new THREE.BoxGeometry(0.54, 0.08, 0.33), boots, 0, 0.9, 0);
        [[armL, -0.33], [armR, 0.33]].forEach(([g2, x]) => { g2.position.set(x, 1.42, 0); G.add(g2); part(new THREE.BoxGeometry(0.15, 0.6, 0.17), tunic, 0, -0.27, 0, g2); part(new THREE.BoxGeometry(0.13, 0.12, 0.14), skin, 0, -0.62, 0, g2); });
        part(new THREE.SphereGeometry(0.17, 12, 10), skin, 0, 1.62, 0);
        const beardM = part(new THREE.ConeGeometry(0.15, 0.32, 8), beard, 0, 1.45, 0.08); beardM.rotation.x = Math.PI;
        part(new THREE.SphereGeometry(0.185, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), iron, 0, 1.66, 0);
        [-1, 1].forEach((sg) => { const h = part(new THREE.ConeGeometry(0.045, 0.25, 6), hm(0xe8e0c8), sg * 0.2, 1.8, 0); h.rotation.z = -sg * 0.9; });
        return { g: G, legL, legR, armL, armR };
      }
      const H0 = makeHero(0x6d4a2b), HERO = H0.g, legL = H0.legL, legR = H0.legR, armL = H0.armL, armR = H0.armR; HERO.visible = false; scene.add(HERO);

      // ---- Mitspieler im Browser: Position und Name laufen über einen öffentlichen MQTT-Broker (kein Server nötig, nichts am Spielserver)
      const MP = { cli: null, loading: false, me: Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, '0')).join(''), peers: new Map(), lastPub: 0, lastMsg: '', mine: new Map() };
      const inviteRoom = new URLSearchParams(location.search).get('room');
      const mpRoom = () => 'vwelt/' + (inviteRoom && /^[a-zA-Z0-9_-]{16,80}$/.test(inviteRoom) ? 'invite/' + inviteRoom + '/' : '') + (location.host + location.pathname).replace(/[^a-z0-9]/gi, '_').toLowerCase().slice(0, 60) + '/' + String((S.world && (S.world.seed || S.world.name)) || 'welt').replace(/[^a-z0-9]/gi, '_');
      const NAME_IN = $('.walkName');
      let myName = ''; try { myName = (localStorage.getItem('vw-walk-name') || '').trim().slice(0, 24); } catch (e) { }
      if (!myName) myName = 'Wikinger ' + MP.me.slice(0, 3).toUpperCase();
      NAME_IN.value = myName; NAME_IN.onchange = () => { myName = (NAME_IN.value || '').trim().slice(0, 24) || myName; NAME_IN.value = myName; try { localStorage.setItem('vw-walk-name', myName); } catch (e) { } MP.lastPub = 0; };
      const MP_STATUS = document.createElement('span'); MP_STATUS.setAttribute('role', 'status'); MP_STATUS.style.fontSize = '12px';
      const MP_RETRY = document.createElement('button'); MP_RETRY.textContent = 'Erneut verbinden'; MP_RETRY.hidden = true;
      NAME_IN.parentElement.after(MP_STATUS, MP_RETRY);
      function mpStatus(text, retry) { if (destroyed) return; MP_STATUS.textContent = 'Mitspieler: ' + text; MP_RETRY.hidden = !retry; }
      MP_RETRY.onclick = () => { if (MP.cli) { MP.cli.removeAllListeners(); MP.cli.end(true); MP.cli = null; } MP.loading = false; mpStart(); };
      mpStatus('noch nicht verbunden', false);
      function mpStart() {
        if (MP.cli || MP.loading || !texBase || location.protocol === 'file:') return; MP.loading = true; mpStatus('verbinde …', false);
        const url = new URLSearchParams(location.search).get('mqtt') || 'wss://broker.emqx.io:8084/mqtt';
        const go = () => { if (destroyed) { MP.loading = false; return; } try {
          const c = g.mqtt.connect(url, { clientId: 'vw_' + MP.me, clean: true, connectTimeout: 15000, reconnectPeriod: 4000, keepalive: 30, will: { topic: mpRoom() + '/p/' + MP.me, payload: '', qos: 0, retain: false } });
          MP.cli = c; MP.loading = false;
          c.on('connect', () => { c.subscribe(mpRoom() + '/p/+', (err) => { if (err) { mpStatus('Abonnement fehlgeschlagen', true); return; } mpStatus('verbunden', false); MP.lastPub = -Infinity; MP.lastMsg = ''; if (walk && !document.hidden) mpPublish(performance.now(), false); }); });
          c.on('reconnect', () => mpStatus('verbinde erneut …', true));
          c.on('offline', () => mpStatus('Verbindung unterbrochen', true));
          c.on('close', () => mpStatus('Verbindung unterbrochen', true));
          c.on('message', onPeer); c.on('error', () => mpStatus('Verbindung fehlgeschlagen', true));
        } catch (e) { MP.loading = false; mpStatus('nicht verfügbar', true); } };
        if (g.mqtt) go(); else { const sc = document.createElement('script'); sc.src = texBase + 'lib/mqtt.min.js'; sc.onload = go; sc.onerror = () => { MP.loading = false; mpStatus('Bibliothek nicht geladen', true); sc.remove(); }; document.head.appendChild(sc); }
      }
      const COLS = [0x6d4a2b, 0x2f5d8a, 0x7a2e2e, 0x3d6b35, 0x6b4c8a, 0x8a6d2b, 0x2e7a72, 0x555555];
      function onPeer(topic, msg) {
        if (destroyed) return;
        const packet = g.VWPeerProtocol.decode(mpRoom(), topic, msg); if (!packet) return;
        const { id, data: d } = packet; if (id === MP.me || MP.mine.has(id)) return;
        let P = MP.peers.get(id);
        if (packet.leave) { removePeer(id); return; }
        if (!P && MP.peers.size >= g.VWPeerProtocol.limit) return;
        const now = performance.now(); if (P && now - P.seen < 60) return;
        if (!P) { const h = makeHero(COLS[[...id].reduce((a, c) => a + c.charCodeAt(0), 0) % COLS.length]); scene.add(h.g); const lab = document.createElement('div'); lab.className = 'vw-lbl pl'; LB.appendChild(lab); P = { h, lab, x: d.x, y: d.y, z: d.z, r: d.r, anim: 0 }; MP.peers.set(id, P); }
        if (Math.hypot(d.x - P.x, d.y - P.y, d.z - P.z) > 50) { P.x = d.x; P.y = d.y; P.z = d.z; }
        Object.assign(P, { tx: d.x, ty: d.y, tz: d.z, tr: d.r, run: d.m, g: !!d.g, seen: performance.now(), n: String(d.n || '?').slice(0, 24) }); P.lab.textContent = (P.g ? '🎮 ' : '🧍 ') + P.n; invalidate();
      }
      function mpPublish(now, moving) {
        if (!MP.cli || !MP.cli.connected || document.hidden) return;
        const d = { n: myName, x: +(pos.x + CX).toFixed(2), y: +(pos.y + WL).toFixed(2), z: +(CZ - pos.z).toFixed(2), r: +HERO.rotation.y.toFixed(2), m: moving ? 1 : 0 };
        if (!g.VWPeerProtocol.decode(mpRoom(), mpRoom() + '/p/' + MP.me, new TextEncoder().encode(JSON.stringify(d)))) return;
        const j = JSON.stringify(d); if (j === MP.lastMsg && now - MP.lastPub < 3000) return; if (now - MP.lastPub < 120) return;
        MP.cli.publish(mpRoom() + '/p/' + MP.me, j, { qos: 0 }); MP.lastMsg = j; MP.lastPub = now;
      }
      // Spieler aus dem eigenen Spiel (Mod) für alle Besucher der Karte veröffentlichen
      function pubGame(list) {
        mpStart(); if (!MP.cli || !MP.cli.connected) return; const now = performance.now();
        (list || []).forEach((p) => {
          if (!p || typeof p.name !== 'string' || !g.VWTools.point(p) || !Number.isFinite(p.y)) return; const id = 'g' + MP.me + '_' + [...p.name].reduce((a, c) => (Math.imul(a, 31) + c.charCodeAt(0)) | 0, 7).toString(36).replace('-', 'm');
          const o = MP.mine.get(id), r = o ? Math.atan2(p.x - o.x, p.z - o.z) : 0, mv = o ? Math.hypot(p.x - o.x, p.z - o.z) > 0.3 : false;
          const d = { n: p.name.slice(0, 24), x: +(+p.x).toFixed(2), y: +(+p.y).toFixed(2), z: +(+p.z).toFixed(2), r: mv ? +(-r + Math.PI).toFixed(2) : (o ? o.r : 0), m: mv ? 1 : 0, g: 1 };
          MP.mine.set(id, Object.assign({}, d, { t: now })); MP.cli.publish(mpRoom() + '/p/' + id, JSON.stringify(d), { qos: 0 });
        });
      }
      const peerList = () => [...MP.peers.values()].map((P) => ({ name: P.n, x: P.tx, y: P.ty, z: P.tz, web: !P.g }));
      function removePeer(id) {
        const P = MP.peers.get(id); if (!P) return;
        scene.remove(P.h.g); P.lab.remove(); MP.peers.delete(id);
        const resources = new Set(); P.h.g.traverse(o => { if (o.geometry) resources.add(o.geometry); for (const m of [].concat(o.material || [])) resources.add(m); });
        resources.forEach(r => { const i = HERO_MATS.indexOf(r); if (i >= 0) HERO_MATS.splice(i, 1); r.dispose(); }); invalidate();
      }
      function mpLeave() { if (MP.cli && MP.cli.connected) MP.cli.publish(mpRoom() + '/p/' + MP.me, '', { qos: 0 }); MP.lastMsg = ''; MP.lastPub = -Infinity; }
      setInterval(() => {
        const now = performance.now();
        for (const [id, P] of MP.peers) if (now - P.seen > g.VWPeerProtocol.ttl) removePeer(id);
        for (const [id, p] of MP.mine) if (now - p.t > 6000) { if (MP.cli && MP.cli.connected) MP.cli.publish(mpRoom() + '/p/' + id, '', { qos: 0 }); MP.mine.delete(id); }
        if (walk && !document.hidden) mpPublish(now, false);
      }, 3000);
      listen(document, 'visibilitychange', () => { if (document.hidden) mpLeave(); else { MP.lastPub = -Infinity; if (walk) mpPublish(performance.now(), false); } });
      function mpTick(dt) {
        if (!MP.peers.size) return; const now = performance.now(); let moved = false; const pr = pane.getBoundingClientRect();
        for (const [id, P] of MP.peers) {
          if (now - P.seen > g.VWPeerProtocol.ttl) { removePeer(id); moved = true; continue; }
          const k = 1 - Math.exp(-Math.min(dt, 1) * 8); P.x += (P.tx - P.x) * k; P.y += (P.ty - P.y) * k; P.z += (P.tz - P.z) * k;
          let dr = P.tr - P.h.g.rotation.y; dr = Math.atan2(Math.sin(dr), Math.cos(dr)); P.h.g.rotation.y += dr * k;
          const inside = reg && P.x >= reg.bounds[0] - 50 && P.x <= reg.bounds[1] + 50 && P.z >= reg.bounds[2] - 50 && P.z <= reg.bounds[3] + 50;
          P.h.g.visible = !!inside; P.h.g.position.set(P.x - CX, P.y - WL, CZ - P.z);
          if (P.run) { P.anim += dt * 9; moved = true; } else P.anim *= 0.85;
          const sw = Math.sin(P.anim) * (P.run ? 0.7 : 0); P.h.legL.rotation.x = sw; P.h.legR.rotation.x = -sw; P.h.armL.rotation.x = -sw * 0.8; P.h.armR.rotation.x = sw * 0.8;
          if (Math.abs(P.tx - P.x) + Math.abs(P.tz - P.z) > 0.01) moved = true;
          pv2.set(P.x - CX, P.y - WL + 2.2, CZ - P.z).project(cam); const vis = inside && pv2.z < 1 && Math.abs(pv2.x) < 1.05 && Math.abs(pv2.y) < 1.05;
          P.lab.style.display = vis ? 'block' : 'none'; if (vis) { P.lab.style.left = ((pv2.x + 1) / 2 * pr.width) + 'px'; P.lab.style.top = ((1 - pv2.y) / 2 * pr.height) + 'px'; }
        }
        if (moved) invalidate();
      }
      // Markierung des Ziels (Kiste/Tür/Portal), mit dem gerade interagiert werden kann
      const HL = new THREE.Group(); HL.visible = false; scene.add(HL);
      HL.add(new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)), new THREE.LineBasicMaterial({ color: 0xffc83d, transparent: true, opacity: 0.95, depthTest: false })));
      HL.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0xffc83d, transparent: true, opacity: 0.2, depthWrite: false })));
      HL.renderOrder = 5; let hlFor = null;
      function highlight(b) {
        if (b === hlFor) return; hlFor = b; HL.visible = !!b; invalidate(); if (!b) return;
        HL.position.copy(b.c); HL.quaternion.copy(b.q); HL.scale.set(b.h.x * 2 + 0.08, b.h.y * 2 + 0.08, b.h.z * 2 + 0.08);
      }
      function say(t) { wmsg = t; wmsgT = performance.now(); }
      function placeAt(x, z, y) { pos.set(x, y !== undefined ? y : groundY(x, z, 500) , z); vy = 0; }
      function spawn() { // auf den nächsten Boden eines Gebäudes stellen, sonst aufs nächste Land
        let best = null, bd = 1e9;
        OBB.forEach((b) => { if (!/floor|stair/i.test(b.ty[0]) || b.ty[4] || b.c.y < -0.8) return; const d = Math.hypot(b.c.x - tgt.x, b.c.z - tgt.z); if (d < bd) { bd = d; best = b; } });
        if (best && bd < 120) { pos.set(best.c.x, groundY(best.c.x, best.c.z, best.c.y + 1.2), best.c.z); vy = 0; return; }
        for (let r = 0; r < 300; r += 2) for (let a = 0; a < 6.28; a += 0.4) { const x = tgt.x + Math.cos(a) * r, z = tgt.z + Math.sin(a) * r; if (terrainY(x, z) > 0.3) { placeAt(x, z); return; } }
        placeAt(tgt.x, tgt.z);
      }
      if (/[?&]debug/.test(location.search)) g.__walk = { MP: () => MP, groundY: (x, z, y) => groundY(x, z, y), get pos() { return pos; }, get OBB() { return OBB; }, interact: () => interact(), placeAt: (x, z, y) => placeAt(x, z, y), get yaw() { return wyaw; }, set yaw(v) { wyaw = v; } };
      function toggleWalk(on) {
        if (on === undefined) on = !walk; if (on === walk) return;
        if (on && !reg) return;
        if (on && fly) toggleFly(false);
        walk = on; TIP.hidden = true; PROMPT.hidden = true; highlight(null); WB.classList.toggle('on', walk); HERO.visible = walk; HUD.hidden = CROSS.hidden = !walk; JOY.hidden = !walk || innerWidth > 760; ACT.hidden = !walk;
        setShadows(!walk && Q.shadows === '1');
        if (walk) {
          buildColliders(); spawn(); wyaw = yaw + Math.PI; wpit = 0.25; wdist = 4.5;
          cam.near = 0.08; cam.updateProjectionMatrix(); if (innerWidth <= 760) $('.s3').classList.add('min');
        } else {
          if (document.pointerLockElement === cv) document.exitPointerLock(); mpLeave();
          tgt.copy(pos); tgt.y += 1; dist = 30; yaw = wyaw - Math.PI; pit = 0.5; cam.near = 0.5; cam.updateProjectionMatrix();
        }
        invalidate();
      }
      WB.onclick = () => toggleWalk();
      addEventListener('beforeunload', () => { try { mpLeave(); } catch (e) { } });
      function lookWalk(dx, dy) { wyaw -= dx * 0.0042; wpit = Math.max(-1.2, Math.min(1.35, wpit + dy * 0.0035)); }
      cv.addEventListener('click', () => { if (walk && innerWidth > 760 && document.pointerLockElement !== cv && cv.requestPointerLock) cv.requestPointerLock(); });
      listen(document, 'mousemove', (e) => { if (walk && document.pointerLockElement === cv) lookWalk(e.movementX, e.movementY); });
      function target() { // Tür/Portal/Kiste vor der Figur
        const f = new THREE.Vector3(Math.sin(wyaw), 0, Math.cos(wyaw)); let best = null, bd = 2.6;
        for (const b of DOORS) { const dx = b.c.x - pos.x, dz = b.c.z - pos.z; if (Math.abs(dx) > 4 || Math.abs(dz) > 4) continue; const d = Math.hypot(dx, dz); if (Math.abs(b.c.y - (pos.y + 1)) > 2.6) continue; const sc = Math.max(0, d - Math.max(b.h.x, b.h.z) * 0.6) - 0.6 * (dx * f.x + dz * f.z) / (d || 1); if (sc < bd) { bd = sc; best = b; } }
        return best;
      }
      function portalOf(b) { const wx = b.c.x + CX, wz = CZ - b.c.z; let me = null, md = 6; (S.portals || []).forEach((p) => { const d = Math.hypot(p.x - wx, p.z - wz); if (d < md) { md = d; me = p; } }); return me; }
      function interact() {
        const best = target();
        if (!best) { say('Hier ist keine Tür, Kiste oder Portal.'); return; }
        if (best.chest) { const a = best.im.userData.arr, o = best.k * 6, k = chestAt([a[o], a[o + 1], a[o + 2]]); if (k >= 0) { if (document.pointerLockElement === cv) document.exitPointerLock(); openChest(k, false); } else say('Kiste ist leer'); return; }
        if (best.door) {
          best.open = !best.open; const m = new THREE.Matrix4(); best.im.getMatrixAt(best.k, m);
          if (!best.m0) best.m0 = m.clone();
          if (best.open) { // um die Kante (Scharnier) aufschwingen
            const hinge = new THREE.Vector3(-best.h.x, 0, 0).applyQuaternion(best.q).add(best.c), side = lv.copy(pos).sub(best.c).applyQuaternion(best.iq).z > 0 ? -1 : 1, rot = new THREE.Matrix4().makeRotationY(Math.PI / 2 * side);
            const t = new THREE.Matrix4().makeTranslation(hinge.x, hinge.y, hinge.z).multiply(rot).multiply(new THREE.Matrix4().makeTranslation(-hinge.x, -hinge.y, -hinge.z));
            best.im.setMatrixAt(best.k, t.multiply(best.m0));
          } else best.im.setMatrixAt(best.k, best.m0);
          best.im.instanceMatrix.needsUpdate = true; say(best.open ? 'Tür geöffnet' : 'Tür geschlossen'); invalidate(); return;
        }
        // Portal: Gegenstück mit gleichem Namen suchen
        const P = S.portals || [], me = portalOf(best);
        if (!me) { say('Portal ohne Namen'); return; }
        const dest = P.find((p) => p !== me && p.tag === me.tag && Math.hypot(p.x - me.x, p.z - me.z) > 6);
        if (!dest) { say('Portal „' + me.tag + '“ hat kein Gegenstück'); return; }
        const inside = (r) => dest.x >= r.bounds[0] && dest.x <= r.bounds[1] && dest.z >= r.bounds[2] && dest.z <= r.bounds[3];
        if (!inside(reg)) { const A = areas(); let i = A.findIndex((r) => r.id !== 'world' && inside(r)); if (i < 0) i = A.findIndex((r) => inside(r)); if (i < 0) { say('Ziel liegt außerhalb der geladenen Karte'); return; } teleporting = true; try { selectRegion(i); } finally { teleporting = false; } }
        const dx = dest.x - CX, dz = -(dest.z - CZ); const back = new THREE.Vector3(Math.sin(wyaw), 0, Math.cos(wyaw));
        // Höhe: Fuß des Ziel-Portals (Portale im Snapshot haben nur x/z), sonst Gelände
        let pb = null, pd2 = 8; OBB.forEach((b) => { if (!b.portal) return; const d = Math.hypot(b.c.x - dx, b.c.z - dz); if (d < pd2) { pd2 = d; pb = b; } });
        const baseY = pb ? pb.c.y - pb.h.y : terrainY(dx, dz);
        const ox = dx - back.x * 2.2, oz = dz - back.z * 2.2; placeAt(ox, oz, 0); pos.y = groundY(ox, oz, baseY + 1.5);
        say('Portal „' + me.tag + '“ → angekommen'); invalidate();
      }
      $('.vw-act2 button').onclick = () => interact();
      function walkStep(dt) {
        let mx = 0, mz = 0, run = keys.ShiftLeft || keys.ShiftRight, lx = 0, ly = 0, jump = keys.Space;
        if (keys.KeyW || keys.ArrowUp) mz += 1; if (keys.KeyS || keys.ArrowDown) mz -= 1; if (keys.KeyD || keys.ArrowRight) mx += 1; if (keys.KeyA || keys.ArrowLeft) mx -= 1;
        mx += jx; mz -= jy;
        const gps = navigator.getGamepads ? navigator.getGamepads() : [];
        for (const gp of gps) { if (!gp) continue; mx += dz(gp.axes[0] || 0); mz -= dz(gp.axes[1] || 0); lx += dz(gp.axes[2] || 0); ly += dz(gp.axes[3] || 0); if (gp.buttons[0] && gp.buttons[0].pressed) jump = true; if (gp.buttons[10] && gp.buttons[10].pressed) run = true; }
        wyaw -= lx * 2.4 * dt; wpit = Math.max(-1.2, Math.min(1.35, wpit + ly * 1.8 * dt));
        const l = Math.hypot(mx, mz); if (l > 1) { mx /= l; mz /= l; }
        const sp = (run ? 7 : 4) * dt, fw = new THREE.Vector3(Math.sin(wyaw), 0, Math.cos(wyaw)), rt = new THREE.Vector3(-Math.cos(wyaw), 0, Math.sin(wyaw));
        const mv = fw.clone().multiplyScalar(mz).addScaledVector(rt, mx);
        const prev = pos.clone(); pos.addScaledVector(mv, sp * (l > 0 ? 1 : 0) / (l > 1 ? 1 : 1));
        // Schwerkraft, Stufen, Wasser
        let g = groundY(pos.x, pos.z, pos.y + STEP); const water = -1.3;
        for (const [ox, oz] of [[RAD, 0], [-RAD, 0], [0, RAD], [0, -RAD]]) g = Math.max(g, groundY(pos.x + ox, pos.z + oz, pos.y + STEP)); // Füße als Scheibe: kleine Fugen überbrücken
        if (onGround && jump) { vy = run ? 9.5 : 5.2; onGround = false; }
        vy -= 18 * dt; pos.y += vy * dt;
        const floor = Math.max(g, water);
        if (pos.y <= floor) { pos.y = floor; vy = 0; onGround = true; } else onGround = pos.y - floor < 0.05;
        pushOut(pos);
        // Kopf stößt an Decke
        if (vy > 0) { const up = new THREE.Vector3(0, 1, 0), o = new THREE.Vector3(pos.x, pos.y + 1.2, pos.z); for (const b of near(pos.x, pos.z)) { if (b.pass || b.ramp || (b.door && b.open)) continue; const t = rayBox(b, o, up, 0.7); if (t !== null) { vy = 0; break; } } }
        // Figur
        if (l > 0.05) { const want = Math.atan2(mv.x, mv.z), cur = HERO.rotation.y; let d = want - cur; d = Math.atan2(Math.sin(d), Math.cos(d)); HERO.rotation.y = cur + d * Math.min(1, dt * 12); anim += dt * (run ? 13 : 9) * Math.min(1, l); }
        else anim *= 0.85;
        const sw = Math.sin(anim) * (l > 0.05 ? 0.7 : 0) * (onGround ? 1 : 0.3);
        legL.rotation.x = sw; legR.rotation.x = -sw; armL.rotation.x = -sw * 0.8; armR.rotation.x = sw * 0.8;
        HERO.position.copy(pos); mpPublish(performance.now(), l > 0.05 || !onGround);
        // Kamera: hinter dem Kopf, Mausrad = Abstand bis in die Ich-Perspektive; nicht durch Wände
        const head = pos.clone(); head.y += 1.62;
        const dir = new THREE.Vector3(-Math.sin(wyaw) * Math.cos(wpit), Math.sin(wpit), -Math.cos(wyaw) * Math.cos(wpit));
        let cd = wdist;
        if (cd > 0.3) { for (const kx of [-1, 0, 1]) for (const kz of [-1, 0, 1]) for (const b of near(head.x + kx * GS, head.z + kz * GS)) { if (b.pass || (b.door && b.open)) continue; const t = rayBox(b, head, dir, cd); if (t !== null && t > 0.05) cd = Math.max(0.3, t - 0.2); } }
        const cp = head.clone().addScaledVector(dir, cd); cp.y = Math.max(cp.y, terrainY(cp.x, cp.z) + 0.25);
        const first = cd < 0.6; HERO.visible = !first; CROSS.hidden = !first;
        cam.position.copy(first ? head : cp);
        if (first) cam.lookAt(head.clone().addScaledVector(dir, -1)); else cam.lookAt(head.x, head.y - 0.1, head.z);
        if (pos.distanceTo(prev) > 0 || Math.abs(vy) > 0) invalidate();
        const tg = target(); let hint = ''; highlight(tg);
        if (tg) { if (tg.chest) hint = 'Kiste öffnen'; else if (tg.door) hint = tg.open ? 'Tür schließen' : 'Tür öffnen'; else { const pp = portalOf(tg); hint = pp && pp.tag ? 'Portal „' + pp.tag + '“ benutzen' : 'Portal (ohne Namen)'; } }
        PROMPT.hidden = !hint; if (hint) PROMPT.innerHTML = `<b class="key">${innerWidth > 760 ? 'E' : '✋'}</b> ${esc(hint)}`;
        const msg = performance.now() - wmsgT < 2500 ? `<br><b style="color:var(--acc)">${esc(wmsg)}</b>` : '';
        HUD.innerHTML = `<b>Laufen</b> · ${first ? 'Ich-Perspektive' : '3rd Person'}${msg}<br><span class="m sub">Joystick = laufen · ziehen = umsehen · ✋ = Tür/Portal</span><span class="k sub">WASD laufen · Shift rennen · Leertaste springen · Shift+Leertaste hoch springen · E Tür/Kiste/Portal · Mausrad Abstand · Klick = Maus fangen · G/Esc beenden</span>`;
      }

      // ---- Schleife
      let animationId = 0, running = false, last = performance.now(), lastKey = '';
      const pv2 = new THREE.Vector3(), viewFrustum = new THREE.Frustum(), viewMatrix = new THREE.Matrix4();
      function resize() { const r = pane.getBoundingClientRect(); if (!r.width) return; ren.setSize(r.width, r.height, false); cam.aspect = r.width / r.height; cam.updateProjectionMatrix(); invalidate(); }
      addEventListener('resize', resize);
      function frame() {
        if (!running || destroyed) return;
        const now = performance.now(), dt = Math.min(0.1, (now - last) / 1000); last = now;
        if (walk) walkStep(dt); else if (fly) flyStep(dt); else orbit();
        mpTick(dt); opTick(dt);
        if (bigArea) { scene.fog.far = Math.max(14000 * ({ near: 0.5, mid: 1, far: 2 }[Q.range] || 1), (fly ? 0 : dist) * 2.2); scene.fog.near = scene.fog.far * 0.2; }
        cam.updateMatrixWorld();
        viewFrustum.setFromProjectionMatrix(viewMatrix.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
        for (const im of pickList) { const bounds = im.userData.bounds; im.visible = layerState[0] && (!['roof', 'droof'].includes(im.userData.cat) || layerState[1]) && (!bounds || viewFrustum.intersectsBox(bounds)); }
        const key = cam.matrixWorld.elements.map((v) => v.toFixed(3)).join(',');
        if (key !== lastKey) { lastKey = key; lastMove = now; dirty = Math.max(dirty, 1); if (bigArea) shadowFresh = false; }
        if (sun.castShadow && (!shadowFresh || shadowPasses > 0) && now - lastMove > 350 && !fly) { refreshShadow(); if (shadowPasses > 0) shadowPasses--; }
        if (dirty > 0) {
          dirty--;
          ren.render(scene, cam);
          const r = pane.getBoundingClientRect();
          const place = (l, vis) => { l.d.style.display = vis ? 'block' : 'none'; if (vis) { l.d.style.left = ((pv2.x + 1) / 2 * r.width) + 'px'; l.d.style.top = ((1 - pv2.y) / 2 * r.height) + 'px'; } };
          labels.forEach((l) => { pv2.copy(l.v).project(cam); const d = fly ? l.v.distanceTo(cam.position) : dist; place(l, showLbl && pv2.z < 1 && Math.abs(pv2.x) < 1.05 && Math.abs(pv2.y) < 1.05 && d < (l.k === 'bed' || l.k === 'tomb' ? (fly ? 60 : 220) : (fly ? 150 : 380))); });
          roomLab.forEach((l) => { pv2.copy(l.v).project(cam); place(l, pv2.z < 1 && Math.abs(pv2.x) < 1.05 && Math.abs(pv2.y) < 1.05); });
          rtLab.forEach((l) => { pv2.copy(l.v).project(cam); place(l, pv2.z < 1 && Math.abs(pv2.x) < 1.05 && Math.abs(pv2.y) < 1.05); });
          plLab.forEach((l) => { pv2.copy(l.v).project(cam); place(l, !l.out && pv2.z < 1 && Math.abs(pv2.x) < 1.05 && Math.abs(pv2.y) < 1.05); });
          chLab.forEach((l) => { pv2.copy(l.v).project(cam); place(l, pv2.z < 1 && Math.abs(pv2.x) < 1.05 && Math.abs(pv2.y) < 1.05 && (fly ? l.v.distanceTo(cam.position) < 120 : dist < 260)); });
        }
        animationId = requestAnimationFrame(frame);
      }
      // ---- Auswahl & Export (PlanBuild .blueprint)
      const SEL = (function () {
        let active = false, sel = new Map(); // mesh → Set(instanceId)
        const btn = $('.selMode'), info = $('.selInfo'), exp = $('.selExp'), nameIn = $('.selName');
        const NONE = 'ohne Erbauer';
        const count = () => { let n = 0; sel.forEach((s) => (n += s.size)); return n; };
        const all = () => Object.values(meshes).flat();
        function paint() {
          if (!sel.size) return;
          tmp.setHex(0x3fd0ff);
          sel.forEach((set, im) => { set.forEach((k) => im.setColorAt(k, tmp)); if (im.instanceColor) im.instanceColor.needsUpdate = true; });
        }
        function refresh() {
          const n = count(); exp.hidden = !n;
          info.innerHTML = n ? `<b>${fmt(n)} Teile gewählt</b>` + (unknown().length ? ` · ${fmt(unknown().length)} unbekannte werden ausgelassen` : '') + materials() : 'Klick = hinzufügen, Shift+Klick = entfernen.';
          recolor(colorMode);
        }
        function reset() { sel = new Map(); if (exp) { exp.hidden = true; info.innerHTML = 'Klick = hinzufügen, Shift+Klick = entfernen.'; } }
        function rec(im, k) { const a = im.userData.arr, o = k * 6; return { im, k, x: a[o], y: a[o + 1], z: a[o + 2], r: a[o + 3], t: reg.types[a[o + 4]], own: reg.owners[a[o + 5]] }; }
        function materials() { // Materialliste zum Nachbauen + Bestand in allen Kisten
          if (!RC) return ''; const need = {}; let noCost = 0;
          sel.forEach((set, im) => set.forEach((k) => { const c = pieceCost(rec(im, k).t[0]); if (!c) { noCost++; return; } c.forEach(([h, n]) => (need[h] = (need[h] || 0) + n)); }));
          const st = stock(), rows = Object.entries(need).sort((a, b) => b[1] - a[1]);
          if (!rows.length) return '';
          return `<div style="margin-top:6px"><b>Materialliste</b></div><table style="width:100%">${rows.map(([h, n]) => { const have = st[h] || 0; return `<tr><td>${have >= n ? '✔' : '✘'} ${esc(itemName(h))}</td><td class="n">${fmt(n)}</td><td class="n sub">${fmt(have)} da</td></tr>`; }).join('')}</table>` + (noCost ? `<div class="sub">${fmt(noCost)} Teile ohne bekannte Kosten</div>` : '');
        }
        function unknown() { const u = []; sel.forEach((set, im) => set.forEach((k) => { const r = rec(im, k); if (/^0x/.test(r.t[0])) u.push(r); })); return u; }
        function add(im, k) { (sel.get(im) || sel.set(im, new Set()).get(im)).add(k); }
        function has(im, k) { const s = sel.get(im); return !!(s && s.has(k)); }
        function flood(im0, k0) {
          // zusammenhängende Spieler-Bauteile: Abstand der Mittelpunkte ≤ halbe Größen + 0,4 m
          const P = []; all().forEach((im) => { const n = im.userData.arr.length / 6; for (let k = 0; k < n; k++) { const r = rec(im, k); if (r.own === NONE) continue; r.h = Math.max(r.t[1], r.t[2], r.t[3]) / 2; P.push(r); } });
          const C = 4, grid = new Map(), key = (x, y, z) => x + ',' + y + ',' + z;
          P.forEach((p, i) => { const g = key(Math.floor(p.x / C), Math.floor(p.y / C), Math.floor(p.z / C)); (grid.get(g) || grid.set(g, []).get(g)).push(i); });
          const start = P.findIndex((p) => p.im === im0 && p.k === k0); if (start < 0) return 0;
          const seen = new Uint8Array(P.length), q = [start]; seen[start] = 1; let n = 0;
          while (q.length && n < 30000) {
            const p = P[q.pop()]; add(p.im, p.k); n++;
            const cx = Math.floor(p.x / C), cy = Math.floor(p.y / C), cz = Math.floor(p.z / C);
            for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) {
              const l = grid.get(key(cx + dx, cy + dy, cz + dz)); if (!l) continue;
              for (const j of l) { if (seen[j]) continue; const o = P[j]; if (Math.hypot(o.x - p.x, o.y - p.y, o.z - p.z) <= p.h + o.h + 0.4) { seen[j] = 1; q.push(j); } }
            }
          }
          return n;
        }
        function radius(im0, k0, R) {
          const c = rec(im0, k0); let n = 0;
          all().forEach((im) => { const a = im.userData.arr, m = a.length / 6; for (let k = 0; k < m; k++) { const o = k * 6; if (reg.owners[a[o + 5]] === NONE) continue; if (Math.hypot(a[o] - c.x, a[o + 2] - c.z) <= R && Math.abs(a[o + 1] - c.y) < 40) { add(im, k); n++; } } });
          return n;
        }
        function click(im, k, shift) {
          const how = +$('.selHow').value;
          // gewünschte Teile in eine eigene Auswahl sammeln, dann hinzufügen (Klick) oder entfernen (Shift+Klick)
          const keep = sel; sel = new Map();
          if (how === 1) add(im, k); else if (how > 1) radius(im, k, how); else flood(im, k);
          const pick = sel; sel = keep;
          pick.forEach((set, m) => set.forEach((x) => { if (shift) { const s = sel.get(m); if (s) s.delete(x); } else add(m, x); }));
          if (!nameIn.value) nameIn.value = (reg.name || 'Bauwerk').replace(/\s*\(.*$/, '');
          refresh();
        }
        function toBlueprint(name) {
          const R = []; sel.forEach((set, im) => set.forEach((k) => { const r = rec(im, k); if (!/^0x/.test(r.t[0])) R.push(r); }));
          if (!R.length) return null;
          const mx = Math.min(...R.map((r) => r.x)), my = Math.min(...R.map((r) => r.y)), mz = Math.min(...R.map((r) => r.z));
          R.sort((a, b) => a.y - b.y || a.x - b.x || a.z - b.z);
          const f = (v) => String(Math.round(v * 10000) / 10000);
          const L = ['#Name:' + name, '#Creator:Valheim Welt-Viewer', '#Description:' + JSON.stringify('Exportiert aus ' + (S.world.name || 'Valheim') + ' · ' + reg.name + ' · ' + R.length + ' Teile'), '#Category:', '#Pieces'];
          R.forEach((r) => { const h = r.r * Math.PI / 360; L.push([r.t[0], 'Building', f(r.x - mx), f(r.y - my), f(r.z - mz), 0, f(Math.sin(h)), 0, f(Math.cos(h)), '""', 1, 1, 1].join(';')); });
          return L.join('\n') + '\n';
        }
        btn.onclick = () => { active = !active; btn.classList.toggle('on', active); cv.style.cursor = active ? 'crosshair' : ''; };
        $('.selClr').onclick = () => { sel = new Map(); refresh(); };
        $('.selAll').onclick = () => { sel = new Map(); all().forEach((im) => { const n = im.userData.arr.length / 6; for (let k = 0; k < n; k++) if (reg.owners[im.userData.arr[k * 6 + 5]] !== NONE) add(im, k); }); if (!nameIn.value) nameIn.value = (reg.name || 'Bauwerk').replace(/\s*\(.*$/, ''); refresh(); };
        $('.selBp').onclick = () => {
          const name = (nameIn.value || 'Bauwerk').trim(); const txt = toBlueprint(name); if (!txt) return;
          const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([txt], { type: 'text/plain' }));
          a.download = name.replace(/[\\/:*?"<>|]+/g, '_') + '.blueprint'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
        };
        function selectedMaterials() { const out = new Map(); sel.forEach((set, im) => set.forEach((k) => { for (const [h, n] of pieceCost(rec(im, k).t[0]) || []) { const name = itemName(h); out.set(name, (out.get(name) || 0) + n); } })); return [...out]; }
        return { get active() { return active; }, click, paint, reset, toBlueprint, count, selectedMaterials };
      })();

      // ---- Zeitraffer (Bau-Verlauf aus live/verlauf/)
      const TL = (function () {
        let entries = [], times = null, cur = -1, timer = 0, ready = false;
        const box = $('.tl'), R = $('.tlR'), info = $('.tlInfo'), list = $('.tlList'), play = $('.tlPlay');
        const dfmt = (t) => new Date(t).toLocaleString(LOC(), { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        async function init(base) {
          if (!base || !g.VW_HISTORY || !g.fflate) return;
          try {
            const r = await fetch(base + 'index.json', { cache: 'no-store' }); if (!r.ok) return;
            const idx = await r.json(); entries = (idx.entries || []).slice().sort((a, b) => a.t - b.t); if (!entries.length) return;
            const evs = [];
            for (const e of entries) { const b = await fetch(base + e.f).then((x) => x.arrayBuffer()); evs.push(VW_HISTORY.decodeEvent(JSON.parse(fflate.strFromU8(fflate.gunzipSync(new Uint8Array(b)))))); }
            times = VW_HISTORY.keyTimes(evs); ready = true;
            R.max = entries.length - 1; R.value = entries.length - 1; cur = entries.length - 1; box.hidden = false;
            list.innerHTML = entries.map((e, i) => ({ e, i })).reverse().slice(0, 80).map(({ e, i }) => `<div class="tle" data-i="${i}" style="cursor:pointer;display:block;padding:5px 6px;border-bottom:1px solid var(--line);font-size:12.5px;border-radius:6px"><b>${dfmt(e.t)}</b> · ${i === 0 ? 'Beginn der Aufzeichnung' : '+' + fmt(e.add) + (e.del ? ' / −' + fmt(e.del) : '')}<br><span class="sub">${Object.entries(e.by || {}).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([o, n]) => esc(o.split(' (')[0]) + ' ' + fmt(n)).join(' · ')}</span></div>`).join('');
            list.onclick = (ev) => { const d = ev.target.closest('[data-i]'); if (d) { stopPlay(); set(+d.dataset.i); } };
            showInfo();
          } catch (e) { box.hidden = true; }
        }
        function showInfo() {
          const e = entries[cur]; if (!e) return;
          info.innerHTML = `<b>${dfmt(e.t)}</b>${cur === entries.length - 1 ? ' · aktueller Stand' : ''}<br>${cur === 0 ? 'Beginn der Aufzeichnung' : '+' + fmt(e.add) + ' Teile' + (e.del ? ', −' + fmt(e.del) + ' abgerissen' : '')}`;
          $$('.tle', list).forEach((d) => (d.style.background = +d.dataset.i === cur ? 'var(--chip)' : ''));
        }
        function apply() {
          if (!ready || !reg) return;
          const T = entries[cur].t, Tp = cur > 0 ? entries[cur - 1].t : -Infinity, last = cur === entries.length - 1;
          recolor(colorMode);
          for (const im of Object.values(meshes).flat()) {
            const u = im.userData, n = u.arr.length / 6;
            if (!u.m0) u.m0 = im.instanceMatrix.array.slice();
            if (!u.tt) { u.tt = new Float64Array(n); for (let k = 0; k < n; k++) { const o = k * 6, own = reg.owners[u.arr[o + 5]]; const t = own === VW_HISTORY.NONE ? undefined : times.get(VW_HISTORY.keyOf(reg.types[u.arr[o + 4]][0], u.arr[o], u.arr[o + 1], u.arr[o + 2], u.arr[o + 3])); u.tt[k] = t === undefined ? -Infinity : t; } }
            const M = im.instanceMatrix.array;
            for (let k = 0; k < n; k++) {
              const t = u.tt[k];
              if (last || t <= T) { for (let j = 0; j < 16; j++) M[k * 16 + j] = u.m0[k * 16 + j]; if (!last && cur > 0 && t > Tp) { tmp.setHex(0xffc845); im.setColorAt(k, tmp); } }
              else for (let j = 0; j < 16; j++) M[k * 16 + j] = 0;
            }
            im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
          }
          shadowFresh = false; shadowPasses = 2; invalidate();
        }
        function set(i) { cur = Math.max(0, Math.min(entries.length - 1, i)); R.value = cur; showInfo(); apply(); }
        function stopPlay() { if (timer) { clearInterval(timer); timer = 0; } play.textContent = '▶'; }
        R.oninput = () => { stopPlay(); set(+R.value); };
        play.onclick = () => {
          if (timer) return stopPlay();
          if (cur >= entries.length - 1) set(0);
          play.textContent = '❚❚';
          timer = setInterval(() => { if (cur >= entries.length - 1) return stopPlay(); set(cur + 1); }, 900);
        };
        return { init, onLoad: () => { if (ready && cur !== entries.length - 1) apply(); } };
      })();
      if (opts.history) TL.init(opts.history);

      function start() { if (destroyed) return; mpStart(); if (!reg && areas().length) selectRegion(0); resize(); invalidate(); if (!running) { running = true; last = performance.now(); animationId = requestAnimationFrame(frame); } }
      function stop() { running = false; g.cancelAnimationFrame(animationId); frames.delete(animationId); }
      // Basis-Auswahl
      const sel = $('.reg');
      function fillSelect() { const A = areas(); sel.innerHTML = A.map((r, i) => `<option value="${i}">${r.id === 'world' ? '🌍 Ganze Welt (alle erkundeten Gebiete)' : r.id === 'seed' ? '🗺 ' + esc(r.name) : esc(r.name) + ' (' + fmt(r.pieceCount) + ' Teile, Detail)'}</option>`).join(''); if (reg) { const i = A.findIndex((x) => x.id === reg.id); if (i >= 0) sel.value = i; } }
      sel.onchange = () => selectRegion(+sel.value);
      function selectRegion(i, keepCam) {
        const A = areas(), r = A[i]; if (!r) return; sel.value = i;
        if (r.lazy && !r.H16) { const st = $('.vw-status'), prev = st.textContent; st.textContent = T('Lade Gelände der ganzen Welt …'); return prepSeed(r).then(() => { if (destroyed) return; st.textContent = prev; if (+sel.value === i) { load(r, keepCam); applyLayers(); } }).catch((e) => { st.textContent = 'Gelände nicht ladbar: ' + e.message; }); }
        load(r, keepCam); applyLayers();
      }
      function focusAt(p) {
        setTab('3d'); const contains = (r) => p.x >= r.bounds[0] && p.x <= r.bounds[1] && p.z >= r.bounds[2] && p.z <= r.bounds[3];
        const A = areas(), i = A.findIndex((r) => r.id === p.region); const chosen = i >= 0 ? i : A.findIndex((r) => !['world', 'seed'].includes(r.id) && contains(r));
        return Promise.resolve(selectRegion(chosen >= 0 ? chosen : 0)).then(() => { if (destroyed || !reg) return; tgt.copy(W(p.x, p.y == null ? WL : p.y, p.z)); dist = p.dist || 65; yaw = p.yaw == null ? yaw : p.yaw; pit = p.pit == null ? 0.7 : p.pit; invalidate(); });
      }
      function capture() { if (!reg) return null; return { region: reg.id, camera: { x: tgt.x + CX, y: tgt.y + WL, z: CZ - tgt.z, dist, yaw, pit } }; }
      function dispose() {
        running = false; originalRevision++; if (MP.cli) { mpLeave(); for (const id of MP.mine.keys()) if (MP.cli.connected) MP.cli.publish(mpRoom() + '/p/' + id, '', { qos: 0 }); MP.cli.removeAllListeners(); MP.cli.end(true); } if (originals) originals.dispose();
        const resources = new Set(); scene.traverse((o) => { if (o.geometry) resources.add(o.geometry); for (const m of [].concat(o.material || [])) { resources.add(m); for (const v of Object.values(m)) if (v && v.isTexture) resources.add(v); } }); resources.forEach((r) => r.dispose()); ren.dispose(); ren.forceContextLoss();
      }
      return { drawAreas, drawChanges, beginArea, focusAt, capture, dispose, searchRooms: chestSearch, selectedMaterials: () => SEL.selectedMaterials(), start, stop, selectRegion, fillSelect, pubGame, peerList, mpStart, setRoute: setRoute3, showRoute: showRoute3, walkPos: () => (walk ? { x: pos.x + CX, y: pos.y + WL, z: CZ - pos.z } : null), addPlan, getPlans, setPlans, drawPlayers, get regionId() { return reg ? reg.id : null; }, get state() { return { tgt: tgt.clone(), dist, yaw, pit }; }, set state(s) { tgt.copy(s.tgt); dist = s.dist; yaw = s.yaw; pit = s.pit; } };
    })();

    $('.w3d').onclick = () => { setTab('3d'); three.selectRegion(0); };
    function open3d(i) { setTab('3d'); three.selectRegion(i + (S.world3d ? 1 : 0)); }

    // ================= Kisten-Liste =================
    // ================= Rezepte & Baukosten (js/recipes.js, aus den Jötunn-Datenlisten) =================
    const RC = g.VW_RECIPES || null;
    const IT = () => (g.VW_DATA && g.VW_DATA.items) || {};
    const itemName = (h) => IT()[h] || (RC && RC.items[h] && RC.items[h][1]) || '?';
    const itemNames = (h) => { const de = IT()[h], en = RC && RC.items[h] && RC.items[h][1]; return [de, en, de && T(de)].filter(Boolean); };
    let STOCK = null;
    function stock() { // Bestand aller Kisten: Item-Hash → Anzahl (Qualitätsstufen zusammengezählt)
      if (STOCK) return STOCK; const byName = {}; const add = (c) => c.i.forEach(([n, k]) => { const b = n.replace(/ ★\d+$/, ''); byName[b] = (byName[b] || 0) + k; });
      S.regions.forEach((r) => r.chests.forEach(add)); (S.looseChests || []).forEach(add);
      // Kisten tragen Namen (aus data.js) – Bestand je Hash über denselben Namen nachschlagen
      STOCK = new Proxy({}, { get: (o, h) => byName[itemName(h)] || 0 });
      return STOCK;
    }
    function recipesFor(q) {
      if (!RC || !q || q.length < 3) return [];
      const out = RC.recipes.filter((r) => itemNames(r[0]).some((n) => n.toLowerCase().includes(q)));
      out.sort((a, b) => (itemNames(a[0]).some((n) => n.toLowerCase() === q) ? 0 : 1) - (itemNames(b[0]).some((n) => n.toLowerCase() === q) ? 0 : 1) || itemName(a[0]).length - itemName(b[0]).length);
      return out.slice(0, 6);
    }
    function craftHtml(r) {
      const st = stock(); let can = Infinity;
      const rows = r[2].map(([h, n]) => { const have = st[h] || 0; can = Math.min(can, Math.floor(have / n)); const sub = have < n && RC.recipes.some((x) => String(x[0]) === String(h)); return `<li class="${have >= n ? 'ok' : 'no'}"><span>${have >= n ? '✔' : '✘'} ${fmt(n)} × <a href="#" class="cr" data-n="${esc(itemName(h))}">${esc(itemName(h))}</a>${sub ? ' <span class="sub">(herstellbar)</span>' : ''}</span><span class="sub">${fmt(have)} da</span></li>`; }).join('');
      return `<div class="vw-card ${can > 0 ? 'hit' : ''}"><div class="lab">${esc(itemName(r[0]))}${r[1] > 1 ? ' ×' + r[1] : ''}</div><div class="meta">${can > 0 ? 'Herstellbar: ' + fmt(can) + '×' : 'Zutaten fehlen'}</div><ul class="it">${rows}</ul><div class="row" style="margin-top:8px;gap:6px"><input class="rtN" data-h="${r[0]}" type="number" min="1" max="999" value="1" style="width:58px;font:inherit;padding:5px 6px;border-radius:8px;border:1px solid var(--line);background:var(--chip);color:var(--fg)"><button class="rtGo" data-h="${r[0]}" style="flex:1">🧭 Route planen</button></div></div>`;
    }
    // ================= Routenplaner: Rezeptbaum auflösen, Zutaten in Kisten finden, kürzesten Weg (mit Portalen) planen =================
    let ROUTE = null;
    const ST_NAME = { workbench: 'Werkbank', forge: 'Schmiede', cauldron: 'Kessel', smelter: 'Schmelzofen', blast: 'Hochofen', kiln: 'Meiler', spin: 'Spinnrad', mill: 'Windmühle', refinery: 'Eitr-Raffinerie', galdr: 'Galdrtisch', blackforge: 'Schwarze Schmiede' };
    const ST_PREFAB = { piece_workbench: 'workbench', forge: 'forge', piece_cauldron: 'cauldron', smelter: 'smelter', blastfurnace: 'blast', charcoal_kiln: 'kiln', piece_spinningwheel: 'spin', windmill: 'mill', eitrrefinery: 'refinery', piece_magetable: 'galdr', blackforge: 'blackforge' };
    let P2H = null; const ph = (pf) => { if (!P2H) { P2H = {}; Object.entries((RC && RC.items) || {}).forEach(([h, v]) => { if (v[0]) P2H[v[0]] = +h; }); } return P2H[pf]; };
    function recipeOf(h) {
      const CONV = [['Copper', 'CopperOre', 'smelter'], ['Tin', 'TinOre', 'smelter'], ['Iron', 'IronScrap', 'smelter'], ['Silver', 'SilverOre', 'smelter'], ['BlackMetal', 'BlackMetalScrap', 'blast'], ['FlametalNew', 'FlametalOreNew', 'blast'], ['Coal', 'Wood', 'kiln'], ['LinenThread', 'Flax', 'spin'], ['BarleyFlour', 'Barley', 'mill']];
      for (const [o, i, st] of CONV) if (ph(o) === +h && ph(i)) return { out: +h, amt: 1, ing: [[ph(i), 1]], st, sure: true };
      if (ph('Eitr') === +h && ph('Sap') && ph('Softtissue')) return { out: +h, amt: 1, ing: [[ph('Sap'), 1], [ph('Softtissue'), 1]], st: 'refinery', sure: true };
      const r = RC && RC.recipes.find((x) => +x[0] === +h); if (!r) return null;
      const typ = (RC.items[r[0]] || [])[2], ings = r[2].map(([ih]) => (RC.items[ih] || [])[0] || '');
      let st = 'workbench';
      if (ings.includes('Eitr')) st = 'galdr'; else if (ings.includes('Carapace') || ings.includes('Mandible')) st = 'blackforge';
      else if (ings.some((n) => /^(Copper|Tin|Bronze|Iron|Silver|BlackMetal|Flametal|FlametalNew)$/.test(n))) st = 'forge';
      else if (typ === 'Consumable') st = 'cauldron';
      return { out: +h, amt: r[1] || 1, ing: r[2].map(([a, b]) => [+a, b]), st, sure: false };
    }
    function allChests() {
      const out = []; const NH = {}; Object.entries(IT()).forEach(([h, n]) => (NH[n] = +h));
      const add = (c, reg) => { const m = new Map(); c.i.forEach(([n, k, h]) => { const hh = h != null ? +h : NH[n.replace(/ ★\d+$/, '')]; if (hh != null) m.set(hh, (m.get(hh) || 0) + k); }); if (m.size) out.push({ c, reg, m }); };
      S.regions.forEach((r) => r.chests.forEach((c) => add(c, r.name))); (S.looseChests || []).forEach((c) => add(c, c.g || ''));
      return out;
    }
    function stationsByKind() {
      const out = {}; const w = S.world3d; if (!w) return out;
      Object.values(w.pieces || {}).forEach((arr) => { for (let i = 0; i < arr.length; i += 6) { const ty = w.types[arr[i + 4]]; const k = ty && ST_PREFAB[ty[0]]; if (k) (out[k] || (out[k] = [])).push({ x: arr[i], y: arr[i + 1], z: arr[i + 2] }); } });
      return out;
    }
    function portalLinks() {
      const by = {}; (S.portals || []).forEach((p) => { if (p.tag) (by[p.tag] || (by[p.tag] = [])).push(p); });
      const w = S.world3d, PY = []; if (w && w.pieces && w.pieces.portal) { const a = w.pieces.portal; for (let i = 0; i < a.length; i += 6) PY.push([a[i], a[i + 1], a[i + 2]]); }
      const yOf = (p) => { let best = 32, bd = 1e9; PY.forEach(([x, y, z]) => { const d = Math.hypot(x - p.x, z - p.z); if (d < bd) { bd = d; best = y; } }); return best; };
      const L = []; Object.entries(by).forEach(([t, l]) => { if (l.length !== 2) return; for (let i = 0; i < l.length; i++) for (let j = 0; j < l.length; j++) if (i !== j) L.push({ a: { x: l[i].x, y: yOf(l[i]), z: l[i].z }, b: { x: l[j].x, y: yOf(l[j]), z: l[j].z }, tag: t }); });
      return L;
    }
    let routeTerrain = null;
    function routingTerrain() {
      if (routeTerrain && routeTerrain.snap === S) return routeTerrain;
      const r = S.world3d, grid = new Map(), floors = new Map();
      const terrains = (S.regions || []).concat(r ? [r] : []).filter((v) => v.h).sort((a, b) => a.res - b.res).map((region) => { const bytes = b64u8(region.h); return { region, heights: new Int16Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 2) }; });
      const rawHeight = (x, z) => {
        const t = terrains.find(({ region: v }) => x >= v.bounds[0] && x <= v.bounds[1] && z >= v.bounds[2] && z <= v.bounds[3]); if (!t) return NaN;
        const v = t.region, fx = (x - v.bounds[0]) / v.res, fz = (z - v.bounds[2]) / v.res, i = Math.min(v.nx - 2, Math.floor(fx)), j = Math.min(v.nz - 2, Math.floor(fz));
        const dx = fx - i, dz = fz - j, h = (xx, zz) => t.heights[zz * v.nx + xx] / 10;
        return (h(i, j) * (1 - dx) + h(i + 1, j) * dx) * (1 - dz) + (h(i, j + 1) * (1 - dx) + h(i + 1, j + 1) * dx) * dz;
      };
      if (r) for (const [cat, a] of Object.entries(r.pieces)) for (let i = 0; i < a.length; i += 6) {
        const ty = r.types[a[i + 4]], name = ty[0];
        if (!/wall|fence|stake/.test(name) && cat !== 'floor') continue;
        const yaw = -a[i + 3] * Math.PI / 180, item = { x: a[i], y: a[i + 1], z: a[i + 2], w: ty[1], h: ty[2], d: ty[3], yaw };
        const rad = Math.hypot(ty[1], ty[3]) / 2;
        for (let x = Math.floor((item.x - rad) / 4); x <= Math.floor((item.x + rad) / 4); x++) for (let z = Math.floor((item.z - rad) / 4); z <= Math.floor((item.z + rad) / 4); z++) { const k = x + ',' + z, map = cat === 'floor' ? floors : grid; (map.get(k) || map.set(k, []).get(k)).push(item); }
      }
      const inside = (p, x, z, margin = 0) => { const dx = x - p.x, dz = z - p.z; return Math.abs(dx * Math.cos(p.yaw) + dz * Math.sin(p.yaw)) <= p.w / 2 + margin && Math.abs(-dx * Math.sin(p.yaw) + dz * Math.cos(p.yaw)) <= p.d / 2 + margin; };
      const height = (x, z) => { let y = rawHeight(x, z); for (const p of floors.get(Math.floor(x / 4) + ',' + Math.floor(z / 4)) || []) if (inside(p, x, z) && p.y > y && p.y < Math.max(y + 4, 34)) y = p.y; return y; };
      const blocked = (x, z, y) => (grid.get(Math.floor(x / 4) + ',' + Math.floor(z / 4)) || []).some((p) => p.y + p.h / 2 > y + 0.4 && p.y - p.h / 2 < y + 1.5 && inside(p, x, z, 0.2));
      return (routeTerrain = { snap: S, height, blocked });
    }
    function legOf(a, b, PL) {
      const boat = $('.rtBoat').checked, height = routingTerrain().height;
      return g.VWTools.portalRoute(a, b, PL, (p, q) => { let penalty = 0; for (let j = 1; j < 8; j++) { const y = height(p.x + (q.x - p.x) * j / 8, p.z + (q.z - p.z) * j / 8); if (y < 29) penalty += boat ? 0.15 : 2; } return Math.hypot(p.x - q.x, p.z - q.z) * (1 + penalty) + Math.abs((p.y || 30) - (q.y || 30)) * 2; });
    }
    function planRoute(h, qty) {
      const CH = allChests(), ST = stationsByKind(); let PL = portalLinks(); const legCache = new Map(); const estimate = (a, b) => { const k = JSON.stringify([a.x,a.y,a.z,b.x,b.y,b.z]); if (!legCache.has(k)) legCache.set(k, legOf(a,b,PL)); return legCache.get(k); };
      const avail = new Map(); CH.forEach((c) => c.m.forEach((k, ih) => avail.set(ih, (avail.get(ih) || 0) + k)));
      const takes = new Map(), missing = new Map(), crafts = [];
      function need(ih, n, depth) {
        const a = avail.get(ih) || 0, t = Math.min(a, n); if (t > 0) { avail.set(ih, a - t); takes.set(ih, (takes.get(ih) || 0) + t); }
        const rest = n - t; if (rest <= 0) return;
        const rc = depth < 7 ? recipeOf(ih) : null; if (!rc) { missing.set(ih, (missing.get(ih) || 0) + rest); return; }
        craft(rc, Math.ceil(rest / rc.amt), depth);
      }
      function craft(rc, batches, depth) { rc.ing.forEach(([ih, k]) => need(ih, k * batches, depth + 1)); crafts.push({ h: rc.out, n: batches * rc.amt, batches, st: rc.st, sure: rc.sure }); }
      const top = recipeOf(h); if (!top) return { err: 'Kein Rezept bekannt.' };
      craft(top, Math.ceil(qty / top.amt), 0);
      if (!$('.rtMetal').checked && [...takes.keys()].some((ih) => /^(Copper|Tin|Bronze|Iron|Silver|BlackMetal|Flametal|FlametalNew|CopperOre|TinOre|IronScrap|SilverOre|BlackMetalScrap|FlametalOreNew)$/.test((RC.items[ih] || [])[0] || ''))) PL = [];
      // Explicit player selection; never pick an unrelated online player automatically.
      const choice = $('.rtPlayer').value, players = livePlayers();
      let me = choice.startsWith('player:') ? players.find((p) => p.name === choice.slice(7)) : null;
      if (choice === 'view') { me = three.walkPos(); if (!me) me = three.capture()?.camera || null; if (me) me = { ...me, label: 'Aktuelle 3D-Position' }; }
      if (choice.startsWith('player:') && !me) return { err: 'Der gewählte Spieler ist nicht mehr online.' };
      if (me && !me.label) me = { ...me, label: me.name };
      const anchor0 = me || (CH[0] && { x: CH[0].c.x, z: CH[0].c.z }) || { x: 0, z: 0 };
      const nearest = (list, p) => { let b = null, bd = 1e18; (list || []).forEach((q) => { const d = estimate(p, q).d; if (d < bd) { bd = d; b = q; } }); return b; };
      const finalKind = ST[top.st] ? top.st : 'workbench', finalSt = nearest(ST[finalKind], anchor0) || nearest(ST.workbench, anchor0);
      const anchor = finalSt || anchor0;
      // Kisten wählen: je Zutat die nächstgelegenen (zur Werkstation) zuerst
      const pick = new Map();
      takes.forEach((n, ih) => {
        const cand = CH.filter((c) => c.m.get(ih)).map((c) => ({ c, d: estimate(c.c, anchor).d })).sort((a, b) => a.d - b.d);
        let left = n; for (const { c } of cand) { if (left <= 0) break; const t = Math.min(left, c.m.get(ih)); left -= t; const e = pick.get(c) || pick.set(c, []).get(c); e.push([ih, t]); }
      });
      // Reihenfolge der Kisten: nächster Nachbar + 2-opt, Ende Richtung Werkstation
      let order = [...pick.keys()]; const start = me || anchor;
      const D = (a, b) => estimate(a, b).d;
      { const rest = order.slice(); order = []; let cur = start; while (rest.length) { let bi = 0, bd = 1e18; rest.forEach((c, i) => { const d = D(cur, c.c); if (d < bd) { bd = d; bi = i; } }); cur = rest[bi].c; order.push(rest.splice(bi, 1)[0]); } }
      const tour = (o) => { let d = 0, cur = start; o.forEach((c) => { d += D(cur, c.c); cur = c.c; }); return d + D(cur, anchor); };
      for (let it = 0, imp = true; imp && it < (order.length > 30 ? 1 : 8); it++) { imp = false; for (let i = 0; i < order.length - 1; i++) for (let j = i + 1; j < order.length; j++) { const o2 = order.slice(0, i).concat(order.slice(i, j + 1).reverse(), order.slice(j + 1)); if (tour(o2) < tour(order) - 0.5) { order = o2; imp = true; } } }
      // Wegpunkte + Werkstationen in Herstell-Reihenfolge
      const pts = []; const push = (p, kind, label, info) => pts.push({ x: p.x, y: p.y != null ? p.y : 34, z: p.z, kind, label, info });
      push(start, 'start', me ? me.label || T('Start') : 'Start an der Werkstation');
      order.forEach((c) => push(c.c, 'chest', (c.c.s ? '„' + c.c.s + '“' : c.c.t) + (c.reg ? ' · ' + c.reg : ''), pick.get(c).map(([ih, t]) => fmt(t) + '× ' + itemName(ih)).join(', ')));
      const stepsAt = new Map(); crafts.forEach((cr) => { const k = ST[cr.st] ? cr.st : 'workbench'; (stepsAt.get(k) || stepsAt.set(k, []).get(k)).push(cr); });
      stepsAt.forEach((list, k) => { if (k === finalKind) return; const sp = nearest(ST[k], anchor); push(sp || anchor, 'station', ST_NAME[k] + (sp ? '' : ' (' + T('nicht gefunden') + ')'), list.map((cr) => fmt(cr.n) + '× ' + itemName(cr.h)).join(', ')); });
      if (finalSt || !pts.length) push(finalSt || anchor, 'station', ST_NAME[finalKind] + (ST[top.st] ? '' : ' (' + T('nicht gefunden') + ')'), (stepsAt.get(finalKind) || []).map((cr) => fmt(cr.n) + '× ' + itemName(cr.h)).join(', '));
      // Resolve every portal hop, then navigate walking/boat legs over the height grid.
      const path = []; let dist = 0, uncertain = 0, straight = 0; const terrain = routingTerrain();
      for (let i = 0; i < pts.length; i++) {
        if (i === 0) { path.push({ ...pts[0] }); continue; }
        const leg = estimate(pts[i - 1], pts[i]); if (!Number.isFinite(leg.d)) return { err: 'Keine Verbindung zwischen den Wegpunkten.' };
        for (let j = 1; j < leg.path.length; j++) {
          const target = leg.path[j], from = leg.path[j - 1];
          if (target.jump) { path.push(target); continue; }
          let segment = g.VWTools.terrainRoute(from, target, terrain.height, { boat: $('.rtBoat').checked, blocked: terrain.blocked }), weak = false;
          if (!Number.isFinite(segment.d)) { uncertain++; weak = true; segment = g.VWTools.terrainRoute(from, target, terrain.height, { boat: $('.rtBoat').checked }); }
          if (!Number.isFinite(segment.d)) { straight++; path.push({ ...target, uncertain: true }); dist += Math.hypot(target.x - from.x, target.z - from.z); continue; }
          for (let k = 1; k < segment.path.length; k++) { dist += Math.hypot(segment.path[k].x - segment.path[k - 1].x, segment.path[k].z - segment.path[k - 1].z); path.push({ ...segment.path[k], ...(weak ? { uncertain: true } : {}) }); }
        }
        pts[i].via = leg.via;
      }
      return { h, qty, pts, path, uncertain, straight, dist: Math.round(dist), missing: [...missing].map(([ih, n]) => [itemName(ih), n]), crafts, guess: crafts.some((c) => !c.sure) };
    }
    function routeHtml(R) {
      if (R.err) return `<div class="sub">${esc(R.err)}</div>`;
      const ic = { start: '🧍', chest: '📦', station: '🔨' };
      return `<h3 style="margin:14px 0 6px">🧭 ${T('Route')}: ${fmt(R.qty)}× ${esc(itemName(R.h))} <span class="sub">· ${T('ca.')} ${fmt(R.dist)} m ${$('.rtBoat').checked ? 'zu Fuß / Boot' : T('zu Fuß')}</span></h3>` +
        (R.uncertain ? `<p role="status" style="color:#c47a20">${R.uncertain} Wegabschnitte konnten nicht als begehbar bestätigt werden (orange gestrichelt). ${R.straight || 0} davon sind reine Luftlinie. Bei den übrigen sind Gebäudehindernisse/Stockwerke ungeprüft; Geländedaten und Bootsmodus werden berücksichtigt.</p>` : '') +
        (R.missing.length ? `<div class="vw-card" style="border-color:#c0574a"><b>${T('Fehlt in allen Kisten')}:</b> ${R.missing.map(([n, k]) => fmt(k) + '× ' + esc(n)).join(', ')}</div>` : '') +
        `<ol class="rtList" style="margin:8px 0 6px 18px;padding:0">${R.pts.map((p, i) => `<li style="margin:4px 0">${p.via ? `<span class="sub">⛩ ${T('Portal')} „${esc(p.via)}“ →</span><br>` : ''}${ic[p.kind] || '•'} <b>${esc(p.label)}</b>${p.info ? '<br><span class="sub">' + (p.kind === 'chest' ? T('mitnehmen') + ': ' : T('herstellen') + ': ') + esc(p.info) + '</span>' : ''}</li>`).join('')}</ol>` +
        `<div class="row" style="gap:6px"><button class="rt3d">🌍 ${T('In 3D zeigen')}</button><button class="rtMap">🗺 ${T('Auf der Karte')}</button><button class="rtClr">✕ ${T('Route löschen')}</button></div>` +
        (R.guess ? `<div class="sub" style="margin-top:6px">${T('Werkstationen für Rezepte sind geschätzt (Schmiede für Metall, Kessel für Essen, sonst Werkbank). Wege sind Näherungen aus dem Höhenraster; Gebäudeinneres und unbekanntes Gelände können abweichen.')}</div>` : `<div class="sub" style="margin-top:6px">${T('Wege sind Näherungen aus dem Höhenraster; Gebäudeinneres und unbekanntes Gelände können abweichen.')}</div>`);
    }
    function setRoute(R) { ROUTE = R && !R.err ? R : null; try { three.setRoute(ROUTE); } catch (e) { } try { map.draw(); } catch (e) { } }
    function drawRoute2d(ctx, toS, s) {
      if (!ROUTE) return; const P = ROUTE.path; ctx.save(); ctx.lineWidth = 3;
      for (let i = 1; i < P.length; i++) { const [x1, y1] = toS(P[i - 1].x, P[i - 1].z), [x2, y2] = toS(P[i].x, P[i].z); ctx.strokeStyle = P[i].uncertain ? '#f28c28' : P[i].jump ? 'rgba(190,150,255,.9)' : 'rgba(255,200,60,.95)'; ctx.setLineDash(P[i].uncertain ? [2, 6] : P[i].jump ? [3, 6] : [10, 6]); ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
      ctx.setLineDash([]); ctx.font = 'bold 11px system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ROUTE.pts.forEach((p, i) => { const [x, y] = toS(p.x, p.z); ctx.fillStyle = p.kind === 'station' ? '#ffb347' : p.kind === 'start' ? '#4cc36b' : '#ffd84a'; ctx.strokeStyle = '#2a1d08'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, 9, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#2a1d08'; ctx.fillText(String(i + 1), x, y + 0.5); });
      ctx.textBaseline = 'alphabetic'; ctx.restore();
    }
    function pieceCost(name) { return RC && RC.pieces[name] ? RC.pieces[name][2] : null; }

    const kisten = (function () {
      const q = $('.kq'), sel = $('.ka'), lab = $('.klab'); let only = false; const open = new Set();
      lab.onclick = () => { only = !only; lab.classList.toggle('on', only); render(); };
      const kg = $('.kgame'); kg.hidden = opts.mod == null;
      kg.onclick = () => { const v = q.value.trim(); if (!v) return; fetch((opts.mod || '') + '/api/find?q=' + encodeURIComponent(v)).then(() => { kg.textContent = '✔ Im Spiel geöffnet'; setTimeout(() => (kg.textContent = '🎯 Im Spiel suchen'), 2500); }).catch(() => { kg.textContent = 'Spiel nicht erreichbar'; setTimeout(() => (kg.textContent = '🎯 Im Spiel suchen'), 2500); }); };
      q.oninput = render; sel.onchange = render;
      function fill() { sel.innerHTML = `<option value="">Alle Orte</option>` + S.regions.map((r, i) => `<option value="${i}">${esc(r.name)}</option>`).join('') + ((S.looseChests || []).length ? `<option value="loose">Außenposten, Karren, Schiffe</option>` : ''); }
      function render() {
        const playerSelect = $('.rtPlayer'), oldPlayer = playerSelect.value;
        playerSelect.innerHTML = '<option value="view">Aktuelle 3D-Position</option><option value="station">Werkstation</option>' + livePlayers().map((p) => `<option value="player:${esc(p.name)}">${esc(p.name)}</option>`).join(''); playerSelect.value = [...playerSelect.options].some((o) => o.value === oldPlayer) ? oldPlayer : 'station';
        const s = q.value.trim().toLowerCase(), a = sel.value;
        let cs = []; if (a !== 'loose') S.regions.forEach((r, ri) => { if (a !== '' && +a !== ri) return; r.chests.forEach((c) => cs.push(Object.assign({ reg: r.name }, c))); });
        if (a === '' || a === 'loose') (S.looseChests || []).forEach((c) => cs.push(Object.assign({ reg: c.g }, c)));
        if (workspace && workspace.filter()) cs = cs.filter((c) => workspace.chestRoom(c)?.id === workspace.filter());
        const all = cs; if (only) cs = cs.filter((c) => c.s);
        const match = (it) => s && (g.VW_I18N ? g.VW_I18N.names(it[0]) : [it[0]]).some((n) => n.toLowerCase().includes(s));
        if (s) cs = cs.filter((c) => c.i.some(match) || c.s.toLowerCase().includes(s) || (workspace?.chestRoom(c)?.name || '').toLowerCase().includes(s));
        let found = 0; cs.forEach((c) => c.i.forEach((it) => { if (match(it)) found += it[1]; }));
        const items = cs.reduce((n, c) => n + c.i.reduce((m, i) => m + i[1], 0), 0);
        $('.kstats').innerHTML = `<div class="vw-stat"><b>${fmt(cs.length)}</b><span>Kisten</span></div><div class="vw-stat"><b>${fmt(items)}</b><span>Items</span></div>` + (s ? `<div class="vw-stat"><b>${fmt(found)}</b><span>× „${esc(q.value)}“</span></div>` : `<div class="vw-stat"><b>${fmt(all.filter((c) => !c.i.length).length)}</b><span>leere Kisten</span></div>`);
        const R = recipesFor(s);
        $('.kcraft').innerHTML = R.length ? `<h3 style="margin:14px 0 8px">Herstellen${found ? '' : ' – nichts davon in den Kisten'}</h3><div class="vw-cards">${R.map(craftHtml).join('')}</div>` : '';
        $$('.kcraft a.cr').forEach((a) => (a.onclick = (e) => { e.preventDefault(); q.value = a.dataset.n; render(); }));
        $$('.kcraft .rtGo').forEach((b) => (b.onclick = () => { const n = Math.max(1, +($(`.rtN[data-h="${b.dataset.h}"]`).value) || 1); const Rt = planRoute(+b.dataset.h, n); setRoute(Rt); showRoute(Rt); }));
        if (ROUTE) showRoute(ROUTE);
        const tot = {}; all.forEach((c) => c.i.forEach((it) => (tot[it[0]] = (tot[it[0]] || 0) + it[1])));
        let tl = Object.entries(tot).sort((x, y) => y[1] - x[1]); if (s) tl = tl.filter((t) => (g.VW_I18N ? g.VW_I18N.names(t[0]) : [t[0]]).some((n) => n.toLowerCase().includes(s)));
        $('.ktot').innerHTML = tl.slice(0, s ? 400 : 60).map((t) => `<tr class="click" data-i="${esc(t[0])}" style="cursor:pointer"><td>${esc(t[0])}</td><td class="n">${fmt(t[1])}</td></tr>`).join('') + (tl.length > 60 && !s ? `<tr><td colspan="2" class="sub">… ${tl.length - 60} weitere – Suche nutzen</td></tr>` : '') || '<tr><td class="sub">Nichts gefunden</td></tr>';
        $$('.ktot tr.click').forEach((tr) => (tr.onclick = () => { q.value = tr.dataset.i.replace(/ ★\d+$/, ''); render(); }));
        const groups = {}; cs.forEach((c) => { const label = workspace?.chestRoom(c)?.name || c.reg || 'Ohne Bereich'; (groups[label] || (groups[label] = [])).push(c); });
        $('.klist').innerHTML = Object.entries(groups).map(([gname, arr]) => `<h3>${esc(gname)} <span class="sub">· ${arr.length} Kisten</span></h3><div class="vw-cards">` + arr.map(card).join('') + '</div>').join('') || '<div class="sub">Keine Kiste passt zur Suche.</div>';
        $$('.vw-card .more').forEach((b) => (b.onclick = () => { const k = b.dataset.k; open.has(k) ? open.delete(k) : open.add(k); render(); }));
        function card(c) {
          const k = c.x + '_' + c.z + '_' + c.y, hit = s && c.i.some(match); let it = c.i; if (s) it = [...it.filter(match), ...it.filter((i) => !match(i))]; const lim = open.has(k) ? 999 : 8;
          return `<div class="vw-card${hit ? ' hit' : ''}"><div class="lab${c.s ? '' : ' none'}">${c.s ? esc(c.s) : 'ohne Schild'}</div><div class="meta">${esc(c.t)}${c.o ? ' · ' + esc(c.o) : ''} · x ${Math.round(c.x)} / z ${Math.round(c.z)}</div>` +
            (c.i.length ? `<ul class="it">${it.slice(0, lim).map((i) => `<li class="${match(i) ? 'm' : ''}"><span>${esc(i[0])}</span><span>${fmt(i[1])}</span></li>`).join('')}</ul>${c.i.length > 8 ? `<button class="more" data-k="${k}">${open.has(k) ? 'weniger' : '+ ' + (c.i.length - 8) + ' weitere'}</button>` : ''}` : '<div class="sub">leer</div>') + '</div>';
        }
      }
      function showRoute(Rt) {
        const el = $('.kroute'); el.innerHTML = routeHtml(Rt);
        const b3 = $('.rt3d', el), bm = $('.rtMap', el), bc = $('.rtClr', el);
        if (bc) bc.onclick = () => { setRoute(null); el.innerHTML = ''; };
        if (bm) bm.onclick = () => { setTab('map'); map.focus(Rt.path); };
        if (b3) b3.onclick = () => { setTab('3d'); three.showRoute(); };
      }
      return { fill, render };
    })();

    // ================= Welt & Spieler =================
    function info() {
      const w = S.world, st = S.stats || {};
      const mods = (w.modifiers || []).filter((m) => !m.startsWith('preset')).map(esc).join(' · ') || '–';
      const bossAll = ['eikthyr', 'gdking', 'bonemass', 'dragon', 'goblinking', 'queen', 'fader'];
      $('.info').innerHTML = `
<h3 style="margin-top:0">${esc(w.name)}</h3>
<div class="vw-stats"><div class="vw-stat"><b>${esc(w.seed || '–')}</b><span>Seed</span></div><div class="vw-stat"><b>${fmt(st.playerPieces || st.pieces || 0)}</b><span>Bauteile von Spielern</span></div><div class="vw-stat"><b>${fmt(st.containers || 0)}</b><span>Kisten</span></div><div class="vw-stat"><b>${S.bases.length}</b><span>Basen</span></div><div class="vw-stat"><b>${fmt(st.zdos || 0)}</b><span>Objekte gelesen</span></div></div>
<div class="vw-grid"><div class="vw-panel"><h2 style="margin-top:0">Bosse</h2><table>${bossAll.map((b) => `<tr><td>${BOSS[b]}</td><td class="n">${S.bosses.includes(b) ? '✔' : '–'}</td></tr>`).join('')}</table>
<h2>Welt-Einstellungen</h2><div class="sub">${mods}</div></div>
<div class="vw-panel"><h2 style="margin-top:0">Charaktere (wer hat gebaut)</h2><table>${S.characters.map((c) => `<tr><td>${esc(c.name || '?')}${c.account ? ' <span class="sub">· ' + esc(c.account) + '</span>' : ''}${c.steam ? '<br><span class="sub">' + esc(c.steam) + '</span>' : ''}</td><td class="n">${fmt(c.pieces)}</td></tr>`).join('')}</table>
<h2>Spieler auf dem Server</h2><table>${S.players.map((p) => `<tr><td>${esc(p.name)}${p.platform ? '<br><span class="sub">' + esc(p.platform) + '</span>' : ''}</td></tr>`).join('') || '<tr><td class="sub">–</td></tr>'}</table></div></div>
${board()}
<div class="sub" style="margin-top:16px">Snapshot vom ${new Date(S.created).toLocaleString(LOC())} · Format v${S.version}${(S.warnings || []).length ? '<br>Hinweise: ' + S.warnings.map(esc).join(' · ') : ''}<br>Inoffizieller Fan-Viewer, nicht mit Iron Gate verbunden.</div>`;
    }

    // Bestenliste: Tode (Grabsteine), gebaute Teile, Spielzeit und Strecke (Laufwege, nur mit Server-Mod)
    let boardDays = null;
    function board() {
      const P = {}; const get = (n) => P[n] || (P[n] = { n, deaths: 0, pieces: 0, secs: 0, dist: 0, made: 0, pins: 0, boss: 0 });
      const PN = S.pins || []; PN.forEach((p) => { if (p.by) { const q = get(p.by); q.pins++; if (p.t === 9) q.boss++; } });
      const CR = S.crafted || []; CR.forEach(([n, k]) => (get(n).made += k));
      (S.characters || []).forEach((c) => { if (c.name) get(c.name).pieces += c.pieces || 0; });
      const D = allDeaths(); D.forEach((d) => { if (d.n) get(d.n).deaths++; });
      if (EX.days.length && !boardDays) { heatDays(0).then((ds) => { boardDays = ds; if (tab === 'info') info(); }); }
      (boardDays || []).forEach((d) => Object.entries(d.players || {}).forEach(([n, p]) => { const q = get(n); q.secs += (p.n || 0) * (d.iv || 10); q.dist += p.dist || 0; }));
      const rows = Object.values(P).filter((p) => p.deaths || p.pieces || p.secs || p.made || p.pins).sort((a, b) => b.pieces - a.pieces);
      if (!rows.length) return '';
      const hasT = !!(boardDays && boardDays.length);
      const hm = (s) => { const h = Math.floor(s / 3600), m = Math.round((s % 3600) / 60); return h ? h + ' h ' + m + ' min' : m + ' min'; };
      const top = (k) => Math.max(0, ...rows.map((r) => r[k]));
      const cell = (r, k, v) => `<td class="n" style="white-space:nowrap">${r[k] && r[k] === top(k) ? '👑 ' : ''}${v}</td>`;
      const last = D.filter((d) => d.t || d.seen).sort((a, b) => (b.t || b.seen) - (a.t || a.seen)).slice(0, 8);
      return `<div class="vw-panel" style="margin-top:18px"><h2 style="margin-top:0">Bestenliste</h2>
<table><tr><td class="sub">Spieler</td><td class="n sub">Gebaute Teile</td><td class="n sub">Tode</td>${CR.length ? '<td class="n sub">Hergestellt</td>' : ''}${PN.length ? '<td class="n sub" title="Pins auf dem Kartentisch (☠ = Bosse gefunden)" style="white-space:nowrap">📍 Pins</td>' : ''}${hasT ? '<td class="n sub">Spielzeit</td><td class="n sub">Strecke</td>' : ''}</tr>
${rows.map((r) => `<tr><td>${esc(r.n)}</td>${cell(r, 'pieces', fmt(r.pieces))}${cell(r, 'deaths', fmt(r.deaths))}${CR.length ? cell(r, 'made', fmt(r.made)) : ''}${PN.length ? cell(r, 'pins', fmt(r.pins) + (r.boss ? ' · ☠ ' + r.boss : '')) : ''}${hasT ? cell(r, 'secs', hm(r.secs)) + cell(r, 'dist', fmt(Math.round(r.dist / 100) / 10) + ' km') : ''}</tr>`).join('')}</table>
${CR.length ? `<h2>Hergestellte Gegenstände</h2>${CR.map(([n, k, it]) => `<details><summary>${esc(n)} <span class="sub">· ${fmt(k)}</span></summary><table>${it.slice(0, 40).map(([nm, c]) => `<tr><td>${esc(T(nm))}</td><td class="n">${fmt(c)}</td></tr>`).join('')}</table>${it.length > 40 ? `<div class="sub">… und ${fmt(it.length - 40)} weitere</div>` : ''}</details>`).join('')}<div class="sub" style="margin-top:6px">Nur Gegenstände, die noch in Kisten, Ständern oder am Boden liegen – was Spieler gerade bei sich tragen, steht nicht in der Welt-Datei.</div>` : ''}
${last.length ? `<h2>Letzte Tode</h2><table>${last.map((d) => `<tr><td>✝ ${esc(d.n)}</td><td class="sub">${new Date(d.t || d.seen).toLocaleString(LOC(), { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}${d.t ? '' : ' (gefunden)'}</td><td class="n sub">x ${Math.round(d.x)} / z ${Math.round(d.z)}</td></tr>`).join('')}</table>` : ''}
<div class="sub" style="margin-top:8px">Tode werden über Grabsteine erfasst, die beim Speichern des Servers noch liegen.</div></div>`;
    }

    function apply(newSnap, keep) {
      const prevTab = tab, prevReg = three.regionId, cam = keep ? three.state : null;
      S = newSnap; STOCK = null; $('.vw-title').textContent = S.world.name + (S.world.seed ? ' · ' + S.world.seed : '');
      map.build(); map.layersChanged(); three.fillSelect(); kisten.fill(); loadSeedMeta();
      if (keep && prevReg) { const i = areas().findIndex((r) => r.id === prevReg); if (i >= 0) { three.selectRegion(i, true); three.state = cam; } }
      setTab(prevTab); if (workspace) workspace.update();
    }
    if (g.VWWorkspace) workspace = g.VWWorkspace.mount(R, {
      history: opts.history, snapshot: () => S, chests: () => { const seen = new Set(); return S.regions.flatMap((r) => r.chests).concat(S.looseChests || []).filter((c) => { const k = [c.x, c.y, c.z].join(','); if (seen.has(k)) return false; seen.add(k); return true; }); },
      roomsChanged: (rs) => three.drawAreas(rs), searchChanged: () => { kisten.render(); three.searchRooms(); },
      focus: (p) => three.focusAt(p), openChests: () => setTab('chests'), pick: (fn) => three.beginArea(fn),
      blueprintMaterials: (text) => { const needs = new Map(), unknown = new Set(); for (const line of text.split('\n')) { if (!line.trim() || line.trim().startsWith('#')) continue; const name = line.split(';')[0].trim(), cost = pieceCost(name); if (!cost) { unknown.add(name); continue; } for (const [h, n] of cost) { const item = itemName(h); needs.set(item, (needs.get(item) || 0) + n); } } return { needs: [...needs], unknown: [...unknown] }; },
      selectedMaterials: () => three.selectedMaterials(), camera: () => three.capture(), restore: (p) => three.focusAt(p), changes: (d, mode) => three.drawChanges(d, mode)
    });
    apply(snap, false);
    if (workspace) workspace.restoreLink();
    loadExtra();
    if (g.VW_I18N) g.VW_I18N.onChange(() => { try { info(); if (tab === 'map') map.draw(); } catch (e) { } });
    if (snap.plans && snap.plans.length) three.setPlans(snap.plans);
    requestAnimationFrame(() => { map.build(); map.draw(); });
    function updateLive(players) { LIVE = players; three.drawPlayers(); if (tab === 'map') map.draw(); }
    // ---- Eigenes Spiel live (Mod „Valheim Welt Live“ auf diesem PC): Position auf der Online-Karte zeigen und an andere Besucher schicken
    let GL = { on: false, timer: 0, fails: 0, url: 'http://localhost:8686' };
    async function gamePoll() {
      try { const ctl = new AbortController(), to = setTimeout(() => ctl.abort(), 2500); const l = await (await fetch(GL.url + '/api/players', { cache: 'no-store', signal: ctl.signal })).json(); clearTimeout(to);
        GL.fails = 0; updateLive(l); three.pubGame(l); $('.gameLink').textContent = '🎮 ' + T('Spiel verbunden') + (l[0] ? ' · ' + l[0].name : '');
      } catch (e) { GL.fails++; $('.gameLink').textContent = '🎮 ' + T('Spiel nicht erreichbar – läuft Valheim mit dem Mod?'); if (GL.fails > 3) LIVE = null; }
    }
    function gameLink(on) {
      GL.on = on; clearInterval(GL.timer); try { localStorage.setItem('vw-gamelink', on ? '1' : ''); } catch (e) { }
      $('.gameLink').classList.toggle('on', on);
      if (on) { const u = new URLSearchParams(location.search).get('mod'); if (u) GL.url = u.replace(/\/+$/, ''); three.mpStart(); gamePoll(); GL.timer = setInterval(gamePoll, 1500); }
      else { $('.gameLink').textContent = '🎮 ' + T('Mein Spiel live zeigen (Mod)'); LIVE = null; map.draw(); }
    }
    $('.gameLink').onclick = () => gameLink(!GL.on);
    if (location.protocol === 'file:') $('.gameLink').hidden = true; else { let a = ''; try { a = localStorage.getItem('vw-gamelink'); } catch (e) { } if (a) gameLink(true); }
    setInterval(() => { try { if (tab === 'map' && three.peerList().some((p) => !p.web)) map.draw(); } catch (e) { } }, 2000); // Mitspieler aus dem Spiel bewegen sich
    function destroy() { if (destroyed) return; destroyed = true; if (workspace) workspace.destroy(); timers.forEach((id) => g.clearInterval(id)); timeouts.forEach((id) => g.clearTimeout(id)); frames.forEach((id) => g.cancelAnimationFrame(id)); cleanup.forEach((f) => f()); three.dispose(); R.remove(); }
    return { update: (s) => { if (!destroyed) { LIVE = null; apply(s, true); } }, destroy, setStatus, setTab, open3d, getPlans: () => three.getPlans(), getWorkspace: () => workspace && workspace.exportData(), updateLive };
  }
  g.VWViewer = { mount };
})(typeof self !== 'undefined' ? self : globalThis);
