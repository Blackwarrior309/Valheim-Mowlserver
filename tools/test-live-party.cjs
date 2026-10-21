const {test}=require('node:test'),assert=require('node:assert/strict');
const {roster,vital}=require('../js/live-party.js');
const p=(extra={})=>({name:'Freya',online:true,receivedAt:1000,details:{health:20,maxHealth:100,stamina:0,maxStamina:100,eitr:0,maxEitr:0},...extra});
test('critical means current verified low health; stale and offline values cannot look healthy',()=>{
 const m=new Map();let rows=roster([p()],1000,m);assert.equal(rows[0].critical,true);assert.equal(rows[0].status,'live');assert.equal(rows[0].stamina.value,0);
 rows=roster([p()],6001,m);assert.equal(rows[0].status,'stale');assert.equal(rows[0].critical,false);assert.equal(rows[0].health.value,20);
 rows=roster([p()],21000,m);assert.equal(rows[0].status,'offline');assert.equal(rows[0].health.value,null);
 rows=roster([p({receivedAt:21000,details:{health:80,maxHealth:100}})],21000,m);assert.equal(rows[0].status,'live');assert.equal(rows[0].health.value,80);assert.equal(rows[0].critical,false);
});
test('missing peers stay offline, snapshots do not become live and browser figures are excluded',()=>{
 const m=new Map();roster([p()],1000,m);let rows=roster([],2000,m);assert.equal(rows[0].status,'offline');assert.equal(rows[0].health.value,null);
 rows=roster([p({receivedAt:undefined}),p({name:'Web',web:true,id:'1'})],2000);assert.equal(rows.length,1);assert.equal(rows[0].status,'offline');
 rows=roster([p({details:null})],2000);assert.equal(rows[0].health.value,null);assert.equal(rows[0].critical,false);
});
test('bounds meter percentages and unknown maxima without inventing values',()=>{
 assert.equal(vital(200,100).ratio,1);assert.equal(vital(0,100).ratio,0);assert.equal(vital(0,0).ratio,null);assert.equal(vital(undefined,100).value,null);assert.equal(vital(NaN,100).value,null);assert.equal(vital(-1,100).value,null);
});
test('keeps offline roster memory bounded and preserves identity over updates',()=>{
 const m=new Map();for(let i=0;i<200;i++)roster([p({name:'player '+i})],1000,m);assert.ok(m.size<=128);assert.ok(m.has('game:player 199'));const rows=roster([p({name:'player 199',details:{health:99,maxHealth:100}})],1000,m);assert.equal(rows.filter(r=>r.key==='game:player 199').length,1);assert.equal(rows.find(r=>r.key==='game:player 199').health.value,99);
});
const fs=require('node:fs'),vm=require('node:vm');
function pollFixture(fetch){const changes=[],c={GL:{on:true,generation:1,controller:null,fails:0,status:'',url:'http://local'},destroyed:false,AbortController,setTimeout,clearTimeout,fetch,party:{render(){}},updateLive:p=>changes.push(p),three:{pubGame(){},setCreatures(){}},CREA:[],tab:'map',map:{layersChanged(){}},g:{},T:s=>s,$:()=>({})};c.applyLive=()=>c.updateLive(c.GL.list);/* applyLive mischt Client- und Server-Daten; hier nur der Client-Teil */vm.createContext(c);const source=fs.readFileSync('js/viewer.js','utf8');vm.runInContext(source.slice(source.indexOf('    async function gamePoll()'),source.indexOf('    function gameLink(on)'))+'globalThis.poll=gamePoll;',c);return {c,changes};}
test('polling still fetches creature and dungeon data and rejects late results after disconnect',async()=>{
 const urls=[],good=pollFixture(async url=>{urls.push(url);return {ok:true,json:async()=>url.endsWith('/players')?[{name:'Freya'}]:url.endsWith('/creatures')?[]:{inside:false}}});await good.c.poll();assert.equal(good.changes.length,1);assert.equal(urls.length,3);assert.equal(good.c.GL.controller,null);
 let release;const late=pollFixture(()=>new Promise(r=>release=r));const pending=late.c.poll();late.c.GL.generation++;late.c.GL.on=false;release({ok:true,json:async()=>[{name:'Old data'}]});await pending;assert.equal(late.changes.length,0);
 const error=pollFixture(async()=>({ok:false,status:500}));await error.c.poll();assert.equal(error.changes.length,0);assert.equal(error.c.GL.status,'nicht erreichbar');assert.equal(error.c.GL.controller,null);
});
