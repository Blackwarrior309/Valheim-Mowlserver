/* Stable combat roster. Timestamps are local receive times, not remote clocks. */
(function(g) {
  'use strict';
  const cards = typeof module !== 'undefined' && module.exports ? require('./player-card.js') : g.VWPlayerCard;
  const STALE = 5000, OFFLINE = 20000;
  function vital(value, max) {
    const valid = Number.isFinite(value) && value >= 0, maximum = Number.isFinite(max) && max >= 0;
    return {value:valid ? value : null, max:maximum ? max : null, ratio:valid && maximum && max > 0 ? Math.min(1,value/max) : null};
  }
  function roster(players, now, memory = new Map()) {
    const present = new Set();
    for (const p of players) {
      if (!p || p.web || typeof p.name !== 'string') continue;
      const key = cards.key(p); present.add(key); memory.set(key,{...p,details:cards.details(p.details)});
    }
    const out=[];
    for (const [key,p] of memory) {
      const age = Number.isFinite(p.receivedAt) ? Math.max(0,now-p.receivedAt) : Infinity;
      const status = !present.has(key) || !p.online || age >= OFFLINE ? 'offline' : age > STALE ? 'stale' : 'live';
      const d = status === 'offline' ? {} : p.details || {};
      const health=vital(d.health,d.maxHealth),stamina=vital(d.stamina,d.maxStamina),eitr=vital(d.eitr,d.maxEitr);
      out.push({key,player:p,status,age,health,stamina,eitr,critical:status==='live' && health.ratio!==null && health.ratio<=.25,details:d});
    }
    // Keep lost peers visible as offline, with a bound on long-running sessions.
    while(memory.size>128) {const old=out.find(r=>r.status==='offline'&&memory.has(r.key));if(!old)break;memory.delete(old.key);out.splice(out.indexOf(old),1);}
    return out.sort((a,b)=>a.player.name.localeCompare(b.player.name,'de'));
  }
  function create(root,{players,open,connect,reconnect,connection,fullscreen,newTab,now=()=>performance.now()}) {
    const memory=new Map(),elements=new Map(); let active=false;
    root.innerHTML=`<div class="party-top"><div><h1>Live-Spieler</h1><p class="party-summary" role="status"></p></div><div class="row"><button class="party-connect">Mein Spiel verbinden</button><button class="party-reconnect">Mitspieler neu verbinden</button><a class="party-window" target="_blank" rel="noopener">In eigenem Tab öffnen</a><button class="party-full">Vollbild</button></div></div><div class="party-controls"><input class="party-search" type="search" aria-label="Mitspieler filtern" placeholder="Mitspieler filtern …"><label><input class="party-compact" type="checkbox"> Kompakt</label><span class="party-connection"></span></div><p class="party-help">Leben, Ausdauer und Eitr werden automatisch aktualisiert. Nach 5 Sekunden ohne Meldung gelten Werte als veraltet. Detailwerte benötigen den Live-Mod 0.5.0 und eine aktive Spiel-Freigabe pro Spieler.</p><div class="party-grid"></div><p class="party-empty" hidden>Keine passenden Mitspieler. Verbinde dein Spiel oder warte auf freigegebene Live-Daten.</p>`;
    const $=s=>root.querySelector(s),grid=$('.party-grid'),summary=$('.party-summary'),search=$('.party-search');
    $('.party-connect').onclick=connect;$('.party-reconnect').onclick=reconnect;$('.party-full').onclick=fullscreen;
    $('.party-window').href=newTab;
    $('.party-compact').onchange=e=>root.classList.toggle('compact',e.target.checked);
    search.oninput=()=>render();
    const text=(el,value)=>{if(el.textContent!==value)el.textContent=value;};
    const number=n=>n==null?'–':Math.round(n).toLocaleString('de-DE');
    function make(row) {
      const el=document.createElement('article');el.className='party-member';
      el.innerHTML=`<div class="party-heading"><h2></h2><span class="party-badge"></span></div><div class="party-vitals"></div><div class="party-hands"></div><button class="party-detail">Spielerkarte</button>`;
      const meters=['Leben','Ausdauer','Eitr'].map((label,i)=>{const line=document.createElement('div');line.className='party-vital vital-'+i;const header=document.createElement('div'),name=document.createElement('span'),value=document.createElement('b'),bar=document.createElement('div'),fill=document.createElement('div');header.className='party-vital-label';name.textContent=label;header.append(name,value);bar.className='party-meter';fill.className='party-fill';bar.appendChild(fill);line.append(header,bar);el.querySelector('.party-vitals').appendChild(line);bar.setAttribute('aria-label',label+' von '+row.player.name);return {value,bar,fill};});
      const item={el,name:el.querySelector('h2'),badge:el.querySelector('.party-badge'),hands:el.querySelector('.party-hands'),button:el.querySelector('.party-detail'),meters,row};
      item.button.onclick=()=>open(item.row.player);grid.appendChild(el);elements.set(row.key,item);return item;
    }
    function render() {
      if(!active)return;
      const rows=roster(players(),now(),memory),query=search.value.trim().toLocaleLowerCase('de-DE');
      const counts={live:0,stale:0,offline:0,critical:0};for(const r of rows){counts[r.status]++;if(r.critical)counts.critical++;}
      text(summary,`${counts.live} live · ${counts.critical} kritisch · ${counts.stale} veraltet · ${counts.offline} offline`);
      const state=connection();text($('.party-connection'),state.text);text($('.party-connect'),state.local?'Spiel trennen':'Mein Spiel verbinden');
      let visible=0;const keys=new Set(rows.map(r=>r.key));
      for(const [key,item]of elements)if(!keys.has(key)){item.el.remove();elements.delete(key);}
      for(const row of rows) {
        const item=elements.get(row.key)||make(row);item.row=row;
        const show=row.player.name.toLocaleLowerCase('de-DE').includes(query);item.el.hidden=!show;if(show)visible++;
        item.el.dataset.state=row.status;item.el.classList.toggle('critical',row.critical);text(item.name,row.player.name);
        const hasVitals=[row.health,row.stamina,row.eitr].some(v=>v.value!==null);
        text(item.badge,row.status==='offline'?'Offline':row.status==='stale'?'Veraltet · '+Math.floor(row.age/1000)+' s':!hasVitals?'Keine Vitaldaten':row.critical?'Kritisch · '+Math.round(row.health.ratio*100)+' % Leben':'Live');
        for(const [i,v] of [row.health,row.stamina,row.eitr].entries()) {const m=item.meters[i];text(m.value,number(v.value)+' / '+number(v.max));m.fill.style.width=(v.ratio===null?0:v.ratio*100)+'%';m.bar.classList.toggle('unknown',v.ratio===null);if(v.ratio!==null){m.bar.setAttribute('role','meter');m.bar.setAttribute('aria-valuemin','0');m.bar.setAttribute('aria-valuemax',String(v.max));m.bar.setAttribute('aria-valuenow',String(Math.min(v.max,v.value)));}else{m.bar.removeAttribute('role');m.bar.removeAttribute('aria-valuenow');m.bar.removeAttribute('aria-valuemax');}}
        text(item.hands,row.status==='offline'?'Keine aktuellen Werte':hasVitals?'Links: '+(row.details.left==null?'–':row.details.left||'Leer')+' · Rechts: '+(row.details.right==null?'–':row.details.right||'Leer'):'Aktuellen Mod und Spiel-Freigabe aktivieren');
      }
      $('.party-empty').hidden=visible>0;
    }
    return {render,setActive(value){active=value;render();},setFullscreen(value){text($('.party-full'),value?'Vollbild verlassen':'Vollbild');},message(value){text($('.party-connection'),value);},destroy(){elements.clear();memory.clear();root.innerHTML='';}};
  }
  const api={roster,vital,create,STALE,OFFLINE};if(typeof module!=='undefined'&&module.exports)module.exports=api;else g.VWLiveParty=api;
})(typeof window!=='undefined'?window:globalThis);
