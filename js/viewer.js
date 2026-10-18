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
      <h2 data-en="Map layers">Karten-Ebenen</h2><div class="row mlay"><button data-ml="portals">⛩ Portal-Netz</button><button data-ml="deaths">✝ Tode</button><button data-ml="heat" hidden>👣 Laufwege</button></div>
      <div class="heatCtl" hidden><div class="row" style="margin-top:6px"><select class="hPl" style="flex:1;min-width:0"></select><select class="hDays"><option value="0">Alle Tage</option><option value="1">Heute</option><option value="7">7 Tage</option><option value="30">30 Tage</option></select></div></div>
      <div class="sub mlInfo" style="margin-top:6px"></div>
      <h2>Legende</h2><div class="sub">● Basis (anklicken = 3D) · ◆ Portal · ▲ Boss/Ort (grau = noch nicht erkundet)<br>Ziehen = verschieben · Mausrad/Pinch = Zoom</div><div class="sub biolg" style="margin-top:6px"></div></div>
  </div>
  <div class="vw-pane" data-p="3d" hidden><canvas class="gl"></canvas><div class="vw-labels"></div>
    <div class="vw-side s3"><button class="vw-mob" data-min>Menü</button>
      <h2>Gebiet</h2><select class="reg" style="width:100%"></select>
      <h2>Ansicht</h2><div class="row"><button data-v="top">Von oben</button><button data-v="obl" class="on">Schräg</button><button data-v="near">Nah</button><button class="flyBtn">✈ Flugmodus (F)</button></div>
      <div class="tl" hidden><h2>Zeitraffer</h2><div class="row" style="flex-wrap:nowrap;align-items:center"><button class="tlPlay" aria-label="Abspielen">▶</button><input type="range" class="tlR" min="0" max="0" value="0" style="flex:1;min-width:0"></div><div class="sub tlInfo" style="margin-top:4px"></div><div class="tlList" style="max-height:170px;overflow:auto;margin-top:6px"></div></div>
      <h2>Gebäude exportieren</h2>
      <div class="row"><button class="selMode">☝ Auswählen</button><select class="selHow" style="flex:1"><option value="0">Zusammenhängendes Gebäude</option><option value="6">Umkreis 6 m</option><option value="12">Umkreis 12 m</option><option value="25">Umkreis 25 m</option><option value="1">Einzelnes Teil</option></select></div>
      <div class="row" style="margin-top:6px"><button class="selAll">Alles im Gebiet</button><button class="selClr">Leeren</button></div>
      <div class="sub selInfo" style="margin-top:4px">Klick = hinzufügen, Shift+Klick = entfernen.</div>
      <div class="selExp" hidden><input class="selName" type="text" placeholder="Name des Bauplans" style="width:100%;margin-top:6px;font:inherit;font-size:13px;padding:7px 10px;border-radius:8px;border:1px solid var(--line);background:var(--chip);color:var(--fg)"><div class="row" style="margin-top:6px"><button class="pri selBp">⬇ PlanBuild (.blueprint)</button></div><div class="sub selHint" style="margin-top:4px" data-en="For the PlanBuild mod: put the file into <code>BepInEx/config/PlanBuild/blueprints</code>, place it in game with the blueprint rune as a hologram and build it.">Für den Mod PlanBuild: Datei nach <code>BepInEx/config/PlanBuild/blueprints</code> legen, im Spiel mit der Bauplan-Rune als Hologramm platzieren und nachbauen.</div></div>
      <h2>Grafik</h2><div class="row gstyle"><button data-gs="valheim">Valheim Original</button><button data-gs="real" title="Gemalte Texturen (textures/*.jpg)">Realistisch</button><button data-gs="natur">Natur</button><button data-gs="full">Einfach</button><button data-gs="simple">Blöcke</button></div>
      <div class="sub originalStatus" role="status" hidden></div>
      <details class="perf"><summary>Leistung &amp; Grafik</summary>
        <div class="qrow"><label for="vwq-sh">Schatten</label><select id="vwq-sh" data-q="shadows"><option value="0">Aus (schnell)</option><option value="1">An – berechnet im Stillstand</option></select></div>
        <div class="qrow"><label for="vwq-de">Grafik</label><select id="vwq-de" data-q="detail"><option value="valheim">Valheim Original (Modelle &amp; Texturen)</option><option value="real">Realistisch (gemalte Texturen)</option><option value="natur">Natur-Texturen (Holz, Stein, Stroh)</option><option value="full">Einfach texturiert (einfärbbar)</option><option value="simple">Blöcke (am schnellsten)</option></select></div>
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
    <div class="vw-hud" hidden></div><div class="vw-cross" hidden></div>
  </div>
  <div class="vw-pane" data-p="chests" hidden><div class="vw-scroll"><div class="vw-wrap">
    <div class="vw-bar"><input type="search" class="kq" placeholder="Item suchen, z. B. Eisen, Met, Kernholz …" autocomplete="off"><select class="ka"></select><button class="klab">Nur beschriftete</button><button class="kgame" hidden title="Öffnet die Kisten-Suche im laufenden Spiel und setzt Pins auf der Karte">🎯 Im Spiel suchen</button></div>
    <div class="vw-stats kstats"></div><div class="kcraft"></div>
    <div class="vw-grid"><div class="vw-panel"><h2 style="margin-top:0">Summe</h2><table class="ktot"></table><div class="sub" style="margin-top:8px">Klick auf ein Item filtert die Kisten. „★2“ = Ausrüstungsstufe.</div></div><div class="klist"></div></div>
  </div></div></div>
  <div class="vw-pane" data-p="info" hidden><div class="vw-scroll"><div class="vw-wrap info"></div></div></div>
</div>`;
    const $ = (s, p) => (p || R).querySelector(s), $$ = (s, p) => Array.from((p || R).querySelectorAll(s));
    const act = $('.vw-act');
    (opts.actions || []).forEach((a) => { const b = document.createElement('button'); b.textContent = a.label; if (a.primary) b.className = 'pri'; if (a.title) b.title = a.title; b.onclick = a.onClick; act.appendChild(b); });
    $$('[data-min]').forEach((b) => { b.onclick = () => b.parentElement.classList.toggle('min'); if (innerWidth <= 760) b.parentElement.classList.add('min'); });

    let S = snap, tab = 'map', LIVE = null;
    const areas = () => (S.world3d ? [S.world3d] : []).concat(S.regions);
    const livePlayers = () => (LIVE || (S.live && S.live.players) || []);
    // Biome → Grundfarbe (ohne Biomdaten: klassisches Grün)
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
      let img = null, view = { cx: 0, cz: 0, s: 0.1 }, hover = null;
      function build() {
        const o = S.overview; const u = b64u8(o.h); const c = document.createElement('canvas'); c.width = o.nx; c.height = o.nz;
        const x = c.getContext('2d'), id = x.createImageData(o.nx, o.nz);
        for (let j = 0; j < o.nz; j++) for (let i = 0; i < o.nx; i++) {
          const v = u[j * o.nx + i], k = ((o.nz - 1 - j) * o.nx + i) * 4; let r, gg, b, a = 255;
          if (!v) { a = 0; r = gg = b = 0; } else { const e = v - 100; if (e < 0) { const t = Math.min(1, -e / 25); r = 40 + 30 * (1 - t); gg = 90 + 40 * (1 - t); b = 120 + 30 * (1 - t); } else if (e < 2) { r = 205; gg = 190; b = 140; } else { const bc = BIO_COL[bioAt(o.x0 + (i + 0.5) * o.res, o.z0 + (j + 0.5) * o.res)]; if (bc) { const t = Math.min(1, (e - 2) / 90); r = bc[0] + (235 - bc[0]) * t * 0.35; gg = bc[1] + (240 - bc[1]) * t * 0.35; b = bc[2] + (245 - bc[2]) * t * 0.35; if (e > 75) { const s2 = Math.min(1, (e - 75) / 40); r += (240 - r) * s2; gg += (244 - gg) * s2; b += (248 - b) * s2; } } else { const t = Math.min(1, (e - 2) / 60); r = 110 + 90 * t; gg = 150 + 50 * t; b = 70 + 100 * t; } } }
          id.data[k] = r; id.data[k + 1] = gg; id.data[k + 2] = b; id.data[k + 3] = a;
        }
        x.putImageData(id, 0, 0); img = c;
        const NAMES = ['', 'Wiesen', 'Sumpf', 'Berge', 'Schwarzwald', 'Ebenen', 'Aschelande', 'Tiefer Norden', '', 'Nebellande'];
        $('.biolg').innerHTML = S.biomes ? 'Biome' + (S.biomes.src === 'Weltgenerator' ? ' (exakt)' : ' (geschätzt)') + ':<br>' + [1, 4, 2, 3, 5, 9, 6, 7].map((k) => `<span style="display:inline-block;width:10px;height:10px;border-radius:2px;margin:0 3px 0 6px;vertical-align:-1px;background:rgb(${BIO_COL[k].join(',')})"></span>${NAMES[k]}`).join('') : '';
        // passend einpassen
        const bw = o.nx * o.res, bh = o.nz * o.res; view.cx = o.x0 + bw / 2; view.cz = o.z0 + bh / 2;
        fit(bw, bh);
        const ml = $('.vw-maplist'); ml.innerHTML = S.bases.map((b, i) => `<div class="b" data-i="${i}"><span>${esc(b.name)}<br><span class="sub">${b.builders.map((x) => esc(x[0].split(' (')[0])).join(', ')}</span></span><span class="sub">${fmt(b.pieces)} Teile<br>${b.chests} Kisten</span></div>`).join('') || '<div class="sub">Keine Basen gefunden.</div>';
        $$('.b', ml).forEach((d) => (d.onclick = () => open3d(+d.dataset.i)));
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
        ctx.imageSmoothingEnabled = view.s < 0.5; ctx.drawImage(img, ax, ay, o.nx * o.res * view.s, o.nz * o.res * view.s);
        // Weltrand
        const [cx0, cy0] = toS(0, 0); ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.beginPath(); ctx.arc(cx0, cy0, 10000 * view.s, 0, Math.PI * 2); ctx.stroke();
        drawLayers();
        ctx.font = '12px system-ui,sans-serif'; ctx.textAlign = 'center';
        S.locations.forEach((l) => { const [x, y] = toS(l.x, l.z); ctx.fillStyle = l.v ? '#e8584a' : 'rgba(200,200,200,.55)'; ctx.beginPath(); ctx.moveTo(x, y - 6); ctx.lineTo(x + 5, y + 4); ctx.lineTo(x - 5, y + 4); ctx.fill(); if (view.s > 0.12 || l.k === 'StartTemple') { ctx.fillStyle = '#fff'; ctx.fillText(T(l.n), x, y - 9); } });
        S.portals.forEach((p) => { const [x, y] = toS(p.x, p.z); ctx.fillStyle = '#b48cff'; ctx.save(); ctx.translate(x, y); ctx.rotate(Math.PI / 4); ctx.fillRect(-3, -3, 6, 6); ctx.restore(); if (view.s > 0.6 && p.tag) { ctx.fillStyle = '#e6dbff'; ctx.fillText(p.tag, x, y - 7); } });
        livePlayers().forEach((p) => { const [x, y] = toS(p.x, p.z); ctx.fillStyle = '#4cc36b'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#d9ffe3'; ctx.font = 'bold 12px system-ui,sans-serif'; ctx.fillText(p.name, x, y + 18); ctx.font = '12px system-ui,sans-serif'; });
        S.bases.forEach((b, i) => { const [x, y] = toS(b.center[0], b.center[1]); const rr = Math.max(5, Math.min(14, 3 + Math.sqrt(b.pieces) / 8)); ctx.fillStyle = hover === i ? '#ffd27a' : '#e0a854'; ctx.strokeStyle = '#1b1408'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, rr, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#fff'; ctx.font = 'bold 12px system-ui,sans-serif'; ctx.fillText(T(b.name), x, y - rr - 4); ctx.font = '12px system-ui,sans-serif'; });
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
      let ML = { portals: true, deaths: false, heat: false }; try { Object.assign(ML, JSON.parse(localStorage.getItem('vw-maplayers') || '{}')); } catch (e) { }
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
        $$('[data-ml]').forEach((b) => b.classList.toggle('on', !!ML[b.dataset.ml]));
        const hb = $('[data-ml="heat"]'); hb.hidden = !EX.days.length;
        $('.heatCtl').hidden = !(ML.heat && EX.days.length);
        if (EX.days.length && !$('.hPl').options.length) {
          const names = new Set(); Promise.resolve(heatDays(7)).then((ds) => { ds.forEach((d) => Object.keys(d.players || {}).forEach((n) => names.add(n))); $('.hPl').innerHTML = '<option value="">Alle Spieler</option>' + [...names].sort().map((n) => `<option>${esc(n)}</option>`).join(''); });
        }
        const info = [];
        if (ML.portals) { const N = portalNet(); info.push(`Portal-Netz: ${fmt(N.pairs.length)} Verbindungen` + (N.single.length ? ` · ohne Partner: ${N.single.map(esc).join(', ')}` : '') + (N.multi.length ? ` · mehr als 2 gleiche Namen: ${N.multi.map(esc).join(', ')}` : '') + (N.untagged ? ` · ${N.untagged} ohne Namen` : '')); }
        if (ML.deaths) { const D = allDeaths(); info.push(`Tode: ${fmt(D.length)} erfasst` + (D.some((d) => d.open) ? ` · rot = Grabstein liegt noch` : '')); }
        baseInfo = info.join('<br>'); $('.mlInfo').innerHTML = baseInfo;
        if (ML.heat) refreshHeat(); else draw();
      }
      $$('[data-ml]').forEach((b) => (b.onclick = () => { ML[b.dataset.ml] = !ML[b.dataset.ml]; try { localStorage.setItem('vw-maplayers', JSON.stringify(ML)); } catch (e) { } layersChanged(); }));
      $('.hPl').onchange = refreshHeat; $('.hDays').onchange = refreshHeat;

      function pick(sx, sy) { let best = null, bd = 16; S.bases.forEach((b, i) => { const [x, y] = toS(b.center[0], b.center[1]); const d = Math.hypot(x - sx, y - sy); if (d < bd) { bd = d; best = i; } }); return best; }
      addEventListener('resize', draw);
      return { build, draw, layersChanged };
    })();

    // ================= 3D =================
    const three = (function () {
      const cv = $('canvas.gl'), pane = $('[data-p="3d"]');
      const Q = Object.assign({ shadows: (window.matchMedia && matchMedia('(pointer:fine)').matches && innerWidth > 900) ? '1' : '0', detail: 'natur', nature: 'mid', res: '1', range: 'mid' }, (() => { try { const o = JSON.parse(localStorage.getItem('vw-quality') || '{}'); if (o.v !== 2) { o.detail = 'natur'; o.v = 2; } return o; } catch (e) { return {}; } })());
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
        sun.color.setHex(e.sun); water.material.color.setHex(e.water);
      }
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
      const W = (x, y, z) => new THREE.Vector3(x - CX, y - WL, -(z - CZ));
      const LB = $('.vw-labels');
      // Kamera
      let tgt = new THREE.Vector3(), dist = 400, yaw = -0.6, pit = 0.9;
      function views(v) {
        if (fly) toggleFly(false);
        let c = reg ? W(reg.center[0], 34, reg.center[1]) : new THREE.Vector3();
        if (reg && reg.id === 'world' && S.bases[0] && v !== 'top') c = W(S.bases[0].center[0], 34, S.bases[0].center[1]);
        if (v === 'top') { tgt.copy(c); dist = Math.max(reg.bounds[1] - reg.bounds[0], reg.bounds[3] - reg.bounds[2]) * 1.15; pit = 1.52; yaw = 0; }
        else if (v === 'near') { tgt.copy(c); dist = 140; pit = 0.55; yaw = -0.9; }
        else { tgt.copy(c); dist = reg.id === 'world' ? 1600 : Math.max(160, Math.max(reg.bounds[1] - reg.bounds[0], reg.bounds[3] - reg.bounds[2]) * 0.8); pit = 0.9; yaw = -0.6; }
        $$('[data-v]').forEach((b) => b.classList.toggle('on', b.dataset.v === v));
      }
      $$('[data-v]').forEach((b) => (b.onclick = () => views(b.dataset.v)));
      function orbit() {
        pit = Math.max(0.08, Math.min(1.55, pit)); dist = Math.max(12, Math.min(25000, dist));
        cam.position.set(tgt.x + dist * Math.cos(pit) * Math.sin(yaw), tgt.y + dist * Math.sin(pit), tgt.z + dist * Math.cos(pit) * Math.cos(yaw)); cam.lookAt(tgt);
        const nn = Math.min(40, Math.max(0.5, dist / 400)); if (Math.abs(cam.near - nn) > 0.05) { cam.near = nn; cam.updateProjectionMatrix(); } // Nahgrenze mit dem Zoom: genaue Tiefe, kein Flackern von Wasser/Strand
      }
      function clear() {
        if (content) { scene.remove(content); content.traverse((o) => { if (o.userData.original) return; if (o.geometry && !Object.values(geos).includes(o.geometry) && o.geometry !== box) o.geometry.dispose(); if (o.material && !Object.values(mats).includes(o.material)) o.material.dispose(); }); }
        labels.forEach((l) => l.d.remove()); labels = []; meshes = {}; pickList = []; clearMarkers(); $('.vw-chest').hidden = true;
      }
      function load(r, keepCam) {
        clear(); reg = r; content = new THREE.Group(); scene.add(content);
        const [X0, X1, Z0, Z1] = r.bounds; CX = (X0 + X1) / 2; CZ = (Z0 + Z1) / 2;
        const pmode = Q.detail === 'simple' ? 'simple' : ((Q.detail === 'natur' || Q.detail === 'real' || Q.detail === 'valheim') && colorMode !== 'own') ? 'natur' : 'full'; curMode = pmode; REAL = Q.detail === 'real';
        ren.outputEncoding = Q.detail === 'valheim' ? THREE.sRGBEncoding : THREE.LinearEncoding;
        const span = Math.max(X1 - X0, Z1 - Z0); bigArea = span > 2000; const sc = sun.shadow.camera;
        const sh = bigArea ? 380 : span / 2 + 20; sc.left = -sh; sc.right = sh; sc.top = sh; sc.bottom = -sh; sc.far = bigArea ? 1600 : 1500; sc.updateProjectionMatrix();
        if (!bigArea) { sun.position.set(-span * 0.3, span * 0.45 + 120, span * 0.25); sun.target.position.set(0, 0, 0); }
        applyEnvironment(r, bigArea);
        const RF = { near: 0.5, mid: 1, far: 2 }[Q.range] || 1; scene.fog.near = (bigArea ? 2500 : span * 0.9) * RF; scene.fog.far = (bigArea ? 14000 : span * 2.6 + 400) * RF;
        // Gelände
        const NX = r.nx, NZ = r.nz, RS = r.res; const hu = b64u8(r.h); const H = new Int16Array(hu.buffer, hu.byteOffset, hu.byteLength / 2);
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
          else { const b3 = BIO3[bioAt(x, z)]; const nz = noise(x, z);
              if (b3) { c3a.setHex(b3[0]); c3b.setHex(b3[1]); tmp.copy(c3a).lerp(c3b, THREE.MathUtils.smoothstep(nz, -0.2, 0.6)); } else tmp.copy(cG).lerp(cG2, Math.min(1, Math.max(0, e - 2) / 25));
              const nd = noise(x * 3.1 + 500, z * 3.1 - 300); if (nd > 0.55) tmp.lerp(cDirt, Math.min(0.35, (nd - 0.55) * 1.6)); // Erdflecken
            tmp.lerp(cSand, 1 - THREE.MathUtils.smoothstep(e, 0.4, 2.4)); } // Strand weich ins Land
          if (e > 70) tmp.lerp(new THREE.Color(0xe8eef2), Math.min(1, (e - 70) / 40));
          if (sl > 0.7) tmp.lerp(cRock, Math.min(1, (sl - 0.7) * 1.5));
          tmp.offsetHSL(0, 0, (Math.sin(x * 0.37) * Math.cos(z * 0.29) + Math.sin(x * 0.11 + z * 0.13)) * 0.03);
          col[k * 3] = tmp.r; col[k * 3 + 1] = tmp.g; col[k * 3 + 2] = tmp.b;
        }
        const MK = r.mask ? b64u8(r.mask) : null;
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
          for (let k = 0; k < n; k++) { const o = k * 6; const ty = r.types[arr[o + 4]]; const sk = Q.detail === 'valheim' && originals && originals.get(ty[0]) ? 'original:' + ty[0] : detailed ? shapeOf(ty[0]) : 'box'; (groups[sk] || (groups[sk] = [])).push(o); }
          for (const [sk, idxs] of Object.entries(groups)) {
            const original = sk.startsWith('original:') && originals.get(sk.slice(9));
            const im = new THREE.InstancedMesh(original ? original.geometry : SHAPES[sk], original ? original.materials : pieceMat(cat, pmode), idxs.length); im.castShadow = true; im.receiveShadow = true;
            const sub = new Array(idxs.length * 6);
            idxs.forEach((o, k) => {
              for (let j = 0; j < 6; j++) sub[k * 6 + j] = arr[o + j];
              const ty = r.types[arr[o + 4]], tilt = (ty[4] || 0) * Math.PI / 180, alongX = ty[1] >= ty[3] * 1.5;
              pv.set(arr[o] - CX, arr[o + 1] - WL, -(arr[o + 2] - CZ));
              if (tilt && alongX) eu.set(0, -arr[o + 3] * Math.PI / 180, tilt, 'YXZ'); else eu.set(-tilt, -arr[o + 3] * Math.PI / 180, 0, 'YXZ');
              if (original) { eu.set(0, -arr[o + 3] * Math.PI / 180, 0, 'YXZ'); sv.set(1, 1, 1); }
              else sv.set(ty[1], ty[2], ty[3]);
              q.setFromEuler(eu); m4.compose(pv, q, sv); im.setMatrixAt(k, m4);
            });
            im.userData = { cat, arr: sub, original: !!original }; (meshes[cat] || (meshes[cat] = [])).push(im); content.add(im); pickList.push(im);
          }
        }
        recolor(colorMode);
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
        SEL.reset(); TL.onLoad(); prepareOriginals(r);
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
        SEL.paint();
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
        if (bigArea) { const c = tgt; sun.target.position.set(c.x, c.y, c.z); sun.position.set(c.x - 300, c.y + 500, c.z + 250); }
        sun.target.updateMatrixWorld(); ren.shadowMap.needsUpdate = true; shadowFresh = true; invalidate();
      }
      let shadowPasses = 0;
      function reloadKeep() { const st = { tgt: tgt.clone(), dist, yaw, pit }; load(reg, true); applyLayers(); tgt.copy(st.tgt); dist = st.dist; yaw = st.yaw; pit = st.pit; }
      function setShadows(on) { sun.castShadow = on; shadowFresh = false; shadowPasses = on ? 2 : 0; invalidate(); }
      const syncGs = () => $$('[data-gs]').forEach((b) => b.classList.toggle('on', b.dataset.gs === Q.detail));
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
        if (!reg) return; const [X0, X1, Z0, Z1] = reg.bounds;
        all.forEach((p) => {
          if (p.x < X0 || p.x > X1 || p.z < Z0 || p.z > Z1) return;
          const v = W(p.x, p.y, p.z); const b = new THREE.Mesh(plBody, plMat); b.position.set(v.x, v.y + 0.9, v.z); b.renderOrder = 11; plG.add(b);
          const r = new THREE.Mesh(plRing, plMat); r.position.set(v.x, v.y + 0.1, v.z); r.renderOrder = 11; plG.add(r);
          const d = document.createElement('div'); d.className = 'vw-lbl pl'; d.textContent = '● ' + p.name; LB.appendChild(d); plLab.push({ d, v: new THREE.Vector3(v.x, v.y + 2.6, v.z) });
        });
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
        if (!q) { CR.innerHTML = `<div class="sub">${reg.chests.length} Kisten in diesem Gebiet. Treffer werden gelb markiert, Kiste anklicken zeigt den Inhalt.</div>`; return; }
        const matches = [];
        reg.chests.forEach((c, i) => { const n = c.i.filter((it) => hitItem(it, q)).reduce((a, b) => a + b[1], 0); if (n || c.s.toLowerCase().includes(q)) matches.push({ i, n }); });
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
          const h = rayHit(e);
          if (SEL.active) { if (h && h.instanceId != null) SEL.click(h.object, h.instanceId, e.shiftKey || downAt.shift); }
          else if (h && h.object.userData.cat === 'chest') { const k = chestAt(arrAt(h)); if (k >= 0) openChest(k, false); }
        }
      };
      cv.addEventListener('pointerup', pUp); cv.addEventListener('pointercancel', pUp);
      function pan(dx, dy) { const s = dist * 0.0016; const fw = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw)), rt = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw)); tgt.addScaledVector(rt, -dx * s).addScaledVector(fw, -dy * s); }
      cv.addEventListener('pointermove', (e) => {
        const p = ptrs.get(e.pointerId); if (!p) { hover(e); return; }
        const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
        if (fly) { fyw -= dx * 0.0045; fpt = Math.max(-1.5, Math.min(1.5, fpt - dy * 0.0045)); return; }
        if (ptrs.size === 2) { const a = [...ptrs.values()]; const d = Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y); if (pd) dist *= pd / d; pd = d; pan(dx / 2, dy / 2); }
        else if (drag && (drag.b === 2 || drag.shift)) pan(dx, dy); else { yaw -= dx * 0.006; pit += dy * 0.005; }
      });
      cv.addEventListener('wheel', (e) => { e.preventDefault(); if (fly) { fspd = Math.max(2, Math.min(200, fspd * Math.exp(-e.deltaY * 0.0015))); return; } dist *= Math.exp(e.deltaY * 0.0012); }, { passive: false });
      const ray = new THREE.Raycaster(), mv = new THREE.Vector2();
      function rayHit(e, withTerrain) { const r = cv.getBoundingClientRect(); mv.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1); ray.setFromCamera(mv, cam); const objs = pickList.filter((m) => m.visible); if (withTerrain) objs.push(terrain); return ray.intersectObjects(objs)[0]; }
      const arrAt = (h) => { const a = h.object.userData.arr, o = h.instanceId * 6; return [a[o], a[o + 1], a[o + 2], a[o + 3], a[o + 4], a[o + 5]]; };
      cv.addEventListener('dblclick', (e) => { if (fly) return; const h = rayHit(e, true); if (h) { tgt.copy(h.point); dist = Math.max(30, dist * 0.45); } });
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
      const kd = (e) => { if (tab !== '3d' || /INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return; if (e.code === 'KeyF') { toggleFly(); return; } if (e.code === 'Escape' && fly) { toggleFly(false); return; } keys[e.code] = true; if (fly && /^(Arrow|Space)/.test(e.code)) e.preventDefault(); };
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

      // ---- Schleife
      let running = false, last = performance.now(), lastKey = '';
      const pv2 = new THREE.Vector3();
      function resize() { const r = pane.getBoundingClientRect(); if (!r.width) return; ren.setSize(r.width, r.height, false); cam.aspect = r.width / r.height; cam.updateProjectionMatrix(); invalidate(); }
      addEventListener('resize', resize);
      function frame() {
        if (!running) return;
        const now = performance.now(), dt = Math.min(0.1, (now - last) / 1000); last = now;
        if (fly) flyStep(dt); else orbit();
        if (bigArea) { scene.fog.far = Math.max(14000 * ({ near: 0.5, mid: 1, far: 2 }[Q.range] || 1), (fly ? 0 : dist) * 2.2); scene.fog.near = scene.fog.far * 0.2; }
        cam.updateMatrixWorld();
        const key = cam.matrixWorld.elements.map((v) => v.toFixed(3)).join(',');
        if (key !== lastKey) { lastKey = key; lastMove = now; dirty = Math.max(dirty, 1); if (bigArea) shadowFresh = false; }
        if (sun.castShadow && (!shadowFresh || shadowPasses > 0) && now - lastMove > 350 && !fly) { refreshShadow(); if (shadowPasses > 0) shadowPasses--; }
        if (dirty > 0) {
          dirty--;
          ren.render(scene, cam);
          const r = pane.getBoundingClientRect();
          const place = (l, vis) => { l.d.style.display = vis ? 'block' : 'none'; if (vis) { l.d.style.left = ((pv2.x + 1) / 2 * r.width) + 'px'; l.d.style.top = ((1 - pv2.y) / 2 * r.height) + 'px'; } };
          labels.forEach((l) => { pv2.copy(l.v).project(cam); const d = fly ? l.v.distanceTo(cam.position) : dist; place(l, showLbl && pv2.z < 1 && Math.abs(pv2.x) < 1.05 && Math.abs(pv2.y) < 1.05 && d < (l.k === 'bed' || l.k === 'tomb' ? (fly ? 60 : 220) : (fly ? 150 : 380))); });
          plLab.forEach((l) => { pv2.copy(l.v).project(cam); place(l, pv2.z < 1 && Math.abs(pv2.x) < 1.05 && Math.abs(pv2.y) < 1.05); });
          chLab.forEach((l) => { pv2.copy(l.v).project(cam); place(l, pv2.z < 1 && Math.abs(pv2.x) < 1.05 && Math.abs(pv2.y) < 1.05 && (fly ? l.v.distanceTo(cam.position) < 120 : dist < 260)); });
        }
        requestAnimationFrame(frame);
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
        return { get active() { return active; }, click, paint, reset, toBlueprint, count };
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

      function start() { if (!reg && areas().length) selectRegion(0); resize(); invalidate(); if (!running) { running = true; last = performance.now(); requestAnimationFrame(frame); } }
      function stop() { running = false; }
      // Basis-Auswahl
      const sel = $('.reg');
      function fillSelect() { sel.innerHTML = areas().map((r, i) => `<option value="${i}">${r.id === 'world' ? '🌍 Ganze Welt (alle erkundeten Gebiete)' : esc(r.name) + ' (' + fmt(r.pieceCount) + ' Teile, Detail)'}</option>`).join(''); }
      sel.onchange = () => selectRegion(+sel.value);
      function selectRegion(i, keepCam) { const A = areas(); if (!A[i]) return; sel.value = i; load(A[i], keepCam); applyLayers(); }
      return { start, stop, selectRegion, fillSelect, addPlan, getPlans, setPlans, drawPlayers, get regionId() { return reg ? reg.id : null; }, get state() { return { tgt: tgt.clone(), dist, yaw, pit }; }, set state(s) { tgt.copy(s.tgt); dist = s.dist; yaw = s.yaw; pit = s.pit; } };
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
      return `<div class="vw-card ${can > 0 ? 'hit' : ''}"><div class="lab">${esc(itemName(r[0]))}${r[1] > 1 ? ' ×' + r[1] : ''}</div><div class="meta">${can > 0 ? 'Herstellbar: ' + fmt(can) + '×' : 'Zutaten fehlen'}</div><ul class="it">${rows}</ul></div>`;
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
        const s = q.value.trim().toLowerCase(), a = sel.value;
        let cs = []; if (a !== 'loose') S.regions.forEach((r, ri) => { if (a !== '' && +a !== ri) return; r.chests.forEach((c) => cs.push(Object.assign({ reg: r.name }, c))); });
        if (a === '' || a === 'loose') (S.looseChests || []).forEach((c) => cs.push(Object.assign({ reg: c.g }, c)));
        const all = cs; if (only) cs = cs.filter((c) => c.s);
        const match = (it) => s && (g.VW_I18N ? g.VW_I18N.names(it[0]) : [it[0]]).some((n) => n.toLowerCase().includes(s));
        if (s) cs = cs.filter((c) => c.i.some(match) || c.s.toLowerCase().includes(s));
        let found = 0; cs.forEach((c) => c.i.forEach((it) => { if (match(it)) found += it[1]; }));
        const items = cs.reduce((n, c) => n + c.i.reduce((m, i) => m + i[1], 0), 0);
        $('.kstats').innerHTML = `<div class="vw-stat"><b>${fmt(cs.length)}</b><span>Kisten</span></div><div class="vw-stat"><b>${fmt(items)}</b><span>Items</span></div>` + (s ? `<div class="vw-stat"><b>${fmt(found)}</b><span>× „${esc(q.value)}“</span></div>` : `<div class="vw-stat"><b>${fmt(all.filter((c) => !c.i.length).length)}</b><span>leere Kisten</span></div>`);
        const R = recipesFor(s);
        $('.kcraft').innerHTML = R.length ? `<h3 style="margin:14px 0 8px">Herstellen${found ? '' : ' – nichts davon in den Kisten'}</h3><div class="vw-cards">${R.map(craftHtml).join('')}</div>` : '';
        $$('.kcraft a.cr').forEach((a) => (a.onclick = (e) => { e.preventDefault(); q.value = a.dataset.n; render(); }));
        const tot = {}; all.forEach((c) => c.i.forEach((it) => (tot[it[0]] = (tot[it[0]] || 0) + it[1])));
        let tl = Object.entries(tot).sort((x, y) => y[1] - x[1]); if (s) tl = tl.filter((t) => (g.VW_I18N ? g.VW_I18N.names(t[0]) : [t[0]]).some((n) => n.toLowerCase().includes(s)));
        $('.ktot').innerHTML = tl.slice(0, s ? 400 : 60).map((t) => `<tr class="click" data-i="${esc(t[0])}" style="cursor:pointer"><td>${esc(t[0])}</td><td class="n">${fmt(t[1])}</td></tr>`).join('') + (tl.length > 60 && !s ? `<tr><td colspan="2" class="sub">… ${tl.length - 60} weitere – Suche nutzen</td></tr>` : '') || '<tr><td class="sub">Nichts gefunden</td></tr>';
        $$('.ktot tr.click').forEach((tr) => (tr.onclick = () => { q.value = tr.dataset.i.replace(/ ★\d+$/, ''); render(); }));
        const groups = {}; cs.forEach((c) => (groups[c.reg] = groups[c.reg] || []).push(c));
        $('.klist').innerHTML = Object.entries(groups).map(([gname, arr]) => `<h3>${esc(gname)} <span class="sub">· ${arr.length} Kisten</span></h3><div class="vw-cards">` + arr.map(card).join('') + '</div>').join('') || '<div class="sub">Keine Kiste passt zur Suche.</div>';
        $$('.vw-card .more').forEach((b) => (b.onclick = () => { const k = b.dataset.k; open.has(k) ? open.delete(k) : open.add(k); render(); }));
        function card(c) {
          const k = c.x + '_' + c.z + '_' + c.y, hit = s && c.i.some(match); let it = c.i; if (s) it = [...it.filter(match), ...it.filter((i) => !match(i))]; const lim = open.has(k) ? 999 : 8;
          return `<div class="vw-card${hit ? ' hit' : ''}"><div class="lab${c.s ? '' : ' none'}">${c.s ? esc(c.s) : 'ohne Schild'}</div><div class="meta">${esc(c.t)}${c.o ? ' · ' + esc(c.o) : ''} · x ${Math.round(c.x)} / z ${Math.round(c.z)}</div>` +
            (c.i.length ? `<ul class="it">${it.slice(0, lim).map((i) => `<li class="${match(i) ? 'm' : ''}"><span>${esc(i[0])}</span><span>${fmt(i[1])}</span></li>`).join('')}</ul>${c.i.length > 8 ? `<button class="more" data-k="${k}">${open.has(k) ? 'weniger' : '+ ' + (c.i.length - 8) + ' weitere'}</button>` : ''}` : '<div class="sub">leer</div>') + '</div>';
        }
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
      const P = {}; const get = (n) => P[n] || (P[n] = { n, deaths: 0, pieces: 0, secs: 0, dist: 0, made: 0 });
      const CR = S.crafted || []; CR.forEach(([n, k]) => (get(n).made += k));
      (S.characters || []).forEach((c) => { if (c.name) get(c.name).pieces += c.pieces || 0; });
      const D = allDeaths(); D.forEach((d) => { if (d.n) get(d.n).deaths++; });
      if (EX.days.length && !boardDays) { heatDays(0).then((ds) => { boardDays = ds; if (tab === 'info') info(); }); }
      (boardDays || []).forEach((d) => Object.entries(d.players || {}).forEach(([n, p]) => { const q = get(n); q.secs += (p.n || 0) * (d.iv || 10); q.dist += p.dist || 0; }));
      const rows = Object.values(P).filter((p) => p.deaths || p.pieces || p.secs || p.made).sort((a, b) => b.pieces - a.pieces);
      if (!rows.length) return '';
      const hasT = !!(boardDays && boardDays.length);
      const hm = (s) => { const h = Math.floor(s / 3600), m = Math.round((s % 3600) / 60); return h ? h + ' h ' + m + ' min' : m + ' min'; };
      const top = (k) => Math.max(0, ...rows.map((r) => r[k]));
      const cell = (r, k, v) => `<td class="n">${r[k] && r[k] === top(k) ? '👑 ' : ''}${v}</td>`;
      const last = D.filter((d) => d.t || d.seen).sort((a, b) => (b.t || b.seen) - (a.t || a.seen)).slice(0, 8);
      return `<div class="vw-panel" style="margin-top:18px"><h2 style="margin-top:0">Bestenliste</h2>
<table><tr><td class="sub">Spieler</td><td class="n sub">Gebaute Teile</td><td class="n sub">Tode</td>${CR.length ? '<td class="n sub">Hergestellt</td>' : ''}${hasT ? '<td class="n sub">Spielzeit</td><td class="n sub">Strecke</td>' : ''}</tr>
${rows.map((r) => `<tr><td>${esc(r.n)}</td>${cell(r, 'pieces', fmt(r.pieces))}${cell(r, 'deaths', fmt(r.deaths))}${CR.length ? cell(r, 'made', fmt(r.made)) : ''}${hasT ? cell(r, 'secs', hm(r.secs)) + cell(r, 'dist', fmt(Math.round(r.dist / 100) / 10) + ' km') : ''}</tr>`).join('')}</table>
${CR.length ? `<h2>Hergestellte Gegenstände</h2>${CR.map(([n, k, it]) => `<details><summary>${esc(n)} <span class="sub">· ${fmt(k)}</span></summary><table>${it.slice(0, 40).map(([nm, c]) => `<tr><td>${esc(T(nm))}</td><td class="n">${fmt(c)}</td></tr>`).join('')}</table>${it.length > 40 ? `<div class="sub">… und ${fmt(it.length - 40)} weitere</div>` : ''}</details>`).join('')}<div class="sub" style="margin-top:6px">Nur Gegenstände, die noch in Kisten, Ständern oder am Boden liegen – was Spieler gerade bei sich tragen, steht nicht in der Welt-Datei.</div>` : ''}
${last.length ? `<h2>Letzte Tode</h2><table>${last.map((d) => `<tr><td>✝ ${esc(d.n)}</td><td class="sub">${new Date(d.t || d.seen).toLocaleString(LOC(), { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}${d.t ? '' : ' (gefunden)'}</td><td class="n sub">x ${Math.round(d.x)} / z ${Math.round(d.z)}</td></tr>`).join('')}</table>` : ''}
<div class="sub" style="margin-top:8px">Tode werden über Grabsteine erfasst, die beim Speichern des Servers noch liegen.</div></div>`;
    }

    function apply(newSnap, keep) {
      const prevTab = tab, prevReg = three.regionId, cam = keep ? three.state : null;
      S = newSnap; STOCK = null; $('.vw-title').textContent = S.world.name + (S.world.seed ? ' · ' + S.world.seed : '');
      map.build(); map.layersChanged(); three.fillSelect(); kisten.fill();
      if (keep && prevReg) { const i = areas().findIndex((r) => r.id === prevReg); if (i >= 0) { three.selectRegion(i, true); three.state = cam; } }
      setTab(prevTab);
    }
    apply(snap, false);
    loadExtra();
    if (g.VW_I18N) g.VW_I18N.onChange(() => { try { info(); if (tab === 'map') map.draw(); } catch (e) { } });
    if (snap.plans && snap.plans.length) three.setPlans(snap.plans);
    requestAnimationFrame(() => { map.build(); map.draw(); });
    function updateLive(players) { LIVE = players; three.drawPlayers(); if (tab === 'map') map.draw(); }
    return { update: (s) => { LIVE = null; apply(s, true); }, setStatus, setTab, open3d, getPlans: () => three.getPlans(), updateLive };
  }
  g.VWViewer = { mount };
})(typeof self !== 'undefined' ? self : globalThis);
