const {test}=require('node:test'),assert=require('node:assert/strict');
const cards=require('../js/player-card.js'),{decode}=require('../js/peer-protocol.js');
function el(tag){return {tag,children:[],style:{},hidden:false,attrs:{},append(...a){this.children.push(...a)},appendChild(a){this.children.push(a)},setAttribute(k,v){this.attrs[k]=v},focus(){},remove(){this.removed=true}}}
function fixture(){global.document={createElement:el};let list=[{name:'Viking <script>',online:true,x:1,z:2,details:{health:0,maxHealth:100,eitr:0,maxEitr:0,playedSeconds:7200,deaths:0,visits:1,distance:1000,left:'',right:'Sword',equipment:[]}}];const root=el('root'),calls=[];const c=cards.create({root,players:()=>list,go:p=>calls.push(['go',p.x]),follow:p=>calls.push(['follow',p.x]),switchView:p=>calls.push(['switch',p.x])});const panel=root.children[0],[close,body,actions]=panel.children;return {c,panel,close,body,buttons:actions.children,calls,get list(){return list},set list(v){list=v}}}
test('details exclude invalid fields, bound equipment and fit UTF-8 wire budget',()=>{
 const d=cards.details({health:0,stamina:-1,eitr:'1',deaths:Infinity,visits:2,token:'secret',equipment:Array.from({length:50},()=>({slot:'Helmet',name:'𐍈'.repeat(200)}))});
 assert.equal(d.health,0);assert.equal(d.stamina,undefined);assert.equal(d.eitr,undefined);assert.equal(d.token,undefined);assert.ok(new TextEncoder().encode(JSON.stringify(d)).length<=1300);
 const raw={n:'Viking',x:1,y:2,z:3,r:0,details:d};assert.deepEqual(decode('r','r/p/a',new TextEncoder().encode(JSON.stringify(raw))).data.details,d);
});
test('live card preserves zero values, escapes names and updates without reopening',()=>{
 const f=fixture();f.c.open(f.list[0]);assert.equal(f.panel.hidden,false);assert.match(f.body.innerHTML,/Viking &lt;script&gt;/);assert.match(f.body.innerHTML,/Tode: 0/);assert.match(f.body.innerHTML,/Leben<\/b> 0 \/ 100/);
 f.list=[{...f.list[0],details:{health:80,maxHealth:100}}];f.c.refresh();assert.match(f.body.innerHTML,/Leben<\/b> 80 \/ 100/);
});
test('follow uses current position, stops on offline, close and manual cancellation',()=>{
 const f=fixture();f.c.open(f.list[0]);f.buttons[0].onclick();f.list=[{...f.list[0],x:42}];f.c.tick();assert.deepEqual(f.calls.at(-1),['follow',42]);
 f.list=[];f.c.tick();assert.ok(f.buttons.every(b=>b.disabled));assert.match(f.body.innerHTML,/Offline/);assert.equal(f.buttons[0].attrs['aria-pressed'],'false');
 f.list=[{name:'Viking <script>',online:true,x:5,z:2}];f.c.tick();f.buttons[1].onclick();f.buttons[2].onclick();assert.deepEqual(f.calls.slice(-2),[['go',5],['switch',5]]);
 f.buttons[0].onclick();f.c.stop();const count=f.calls.length;f.c.tick();assert.equal(f.calls.length,count);f.close.onclick();assert.equal(f.panel.hidden,true);f.c.destroy();assert.equal(f.panel.removed,true);
});
test('browser IDs separate duplicate names from game characters',()=>{
 assert.notEqual(cards.key({name:'a'}),cards.key({name:'a',web:true,id:'1'}));assert.notEqual(cards.key({name:'a',web:true,id:'1'}),cards.key({name:'a',web:true,id:'2'}));
});
