const {test}=require('node:test');
const assert=require('node:assert/strict');
const {decode}=require('../js/peer-protocol.js');
const bytes=d=>new TextEncoder().encode(JSON.stringify(d));
const valid={n:'Wikinger',x:1,y:2,z:3,r:0,m:1};
test('accepts legacy presence and exact empty departures',()=>{
 assert.equal(decode('world','world/p/abc',bytes(valid)).data.x,1);
 assert.deepEqual(decode('world','world/p/abc',new Uint8Array()),{id:'abc',leave:true});
});
test('malformed or null payload never becomes departure',()=>{
 for(const b of [bytes(null),bytes(false),bytes([]),new TextEncoder().encode('{'),new Uint8Array(2049)]) assert.equal(decode('world','world/p/a',b),null);
});
test('requires exact topic, safe bounded id and finite bounded coordinates',()=>{
 for(const t of ['world/p/a/nested','other/p/a','world/p/','world/p/'+ 'a'.repeat(81)]) assert.equal(decode('world',t,bytes(valid)),null);
 for(const d of [{x:'1'},{y:null},{z:20001},{y:5000},{r:null},{m:{}},{g:'yes'},{n:'a'.repeat(25)}]) assert.equal(decode('world','world/p/a',bytes({...valid,...d})),null);
 assert.equal(decode('world','world/p/a',bytes({...valid,r:Math.PI*4})).data.r<1e-10,true);
});
// Exercise the actual viewer connection closures with a deterministic clock and fake MQTT.
const fs=require('node:fs'),vm=require('node:vm');
function fixture(){
 let now=10000;const intervals=[],events={},clients=[],status=[];
 const s=fs.readFileSync(require.resolve('../js/viewer.js'),'utf8');
 const start=s.indexOf('      const MP = '),end=s.indexOf('      function mpTick',start);
 const context={crypto:require('node:crypto').webcrypto,URLSearchParams,TextEncoder,TextDecoder,document:{hidden:false,createElement:()=>({style:{},setAttribute(){},remove(){}})},location:{search:'',protocol:'http:',host:'localhost',pathname:'/'},S:{world:{name:'test'}},texBase:'/',destroyed:false,playground:null,performance:{now:()=>now},localStorage:{getItem(){},setItem(){}},$:()=>({parentElement:{after(){}}}),g:{VWPlayerCard:require('../js/player-card.js'),VWPeerProtocol:require('../js/peer-protocol.js'),VWTools:{point:p=>Number.isFinite(p.x)&&Number.isFinite(p.z)},mqtt:{connect:()=>{const c={connected:false,handlers:{},published:[],on(n,f){this.handlers[n]=f},subscribe(t,cb){cb()},publish(...a){this.published.push(a)},removeAllListeners(){this.handlers={}},end(){this.ended=true}};clients.push(c);return c;}}},setInterval:f=>intervals.push(f),listen:(d,n,f)=>events[n]=f,walk:true,pos:{x:1,y:2,z:3},CX:0,CZ:0,WL:0,HERO:{rotation:{y:0}},scene:{remove(){}},HERO_MATS:[],invalidate(){},console};
 vm.createContext(context);vm.runInContext(s.slice(start,end)+'\nglobalThis.api={MP,mpStart,mpLeave,onPeer,MP_RETRY,MP_STATUS,pubGame};',context);
 return {context,api:context.api,clients,intervals,events,advance:t=>now+=t,status};
}
test('reconnect republishes standing player, visibility leaves and returns, retry ends old client',()=>{
 const f=fixture();f.api.mpStart();const c=f.clients[0];c.connected=true;c.handlers.connect();assert.equal(c.published.length,1);
 c.handlers.connect();assert.equal(c.published.length,2);
 f.context.document.hidden=true;f.events.visibilitychange();assert.equal(c.published.at(-1)[1],'');
 f.context.document.hidden=false;f.events.visibilitychange();assert.notEqual(c.published.at(-1)[1],'');
 f.api.MP_RETRY.onclick();assert.equal(c.ended,true);assert.equal(f.clients.length,2);
});
test('malformed packet preserves peer; expiration runs without 3D frame and disposes resources',()=>{
 const f=fixture();let disposed=0,removed=0;
 const peer={seen:0,lab:{remove(){removed++}},h:{g:{traverse(fn){fn({geometry:{dispose(){disposed++}}})}}}};
 f.api.MP.peers.set('abc',peer);f.api.onPeer('vwelt/localhost_/test/p/abc',bytes(null));assert.equal(f.api.MP.peers.size,1);
 f.advance(21000);f.intervals[0]();assert.equal(f.api.MP.peers.size,0);assert.equal(disposed,1);assert.equal(removed,1);
});
test('game proxy IDs are session-specific and stale proxies send departure',()=>{
 const a=fixture(),b=fixture();for(const f of [a,b]){f.api.mpStart();f.clients[0].connected=true;f.api.pubGame([{name:'Viking',x:1,y:2,z:3}]);}
 assert.notEqual([...a.api.MP.mine.keys()][0],[...b.api.MP.mine.keys()][0]);
 a.advance(7000);a.intervals[0]();assert.equal(a.api.MP.mine.size,0);assert.equal(a.clients[0].published.at(-2)[1],'');
});
