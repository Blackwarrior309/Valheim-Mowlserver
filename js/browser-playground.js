(function(g){
'use strict';
const weapons={ak:{label:'AK',delay:110,damage:18,range:180,color:0xffcc44},sniper:{label:'Sniper',delay:1000,damage:85,range:800,color:0x66ddff},rocket:{label:'Raketenwerfer',delay:1100,damage:90,range:300,radius:9,color:0xff7733},cannon:{label:'Panzerkanone',delay:1400,damage:100,range:400,radius:11,color:0xffaa44}};
function state(d){
 if(!d||typeof d!=='object'||!Number.isFinite(d.hp)||d.hp<0||d.hp>100||typeof d.pvp!=='boolean'||!['ak','sniper','rocket','cannon'].includes(d.weapon))return null;
 const v=d.vehicle;
 if(v&&(!['jet','tank'].includes(v.kind)||!['yaw','pitch','roll'].every(k=>Number.isFinite(v[k])&&Math.abs(v[k])<=Math.PI*2)))return null;
 return {hp:d.hp,pvp:d.pvp,weapon:d.weapon,vehicle:v?{kind:v.kind,yaw:v.yaw,pitch:v.pitch,roll:v.roll}:null};
}
function shot(d){
 if(!d||d.s!=='shot'||!weapons[d.weapon]||!Number.isInteger(d.seq)||d.seq<0||d.seq>1e9)return null;
 if(![d.a,d.b].every(p=>p&&['x','y','z'].every(k=>Number.isFinite(p[k])&&Math.abs(p[k])<25000)))return null;
 const distance=Math.hypot(d.a.x-d.b.x,d.a.y-d.b.y,d.a.z-d.b.z);
 if(distance<.01||distance>weapons[d.weapon].range+1)return null;
 return d;
}
function create(o){
 const {THREE:T,scene,pane,canvas}=o; let enabled=false,pvp=true,hp=100,weapon='ak',last=-Infinity,seq=0,dead=0,held=false,vehicle=null,speed=0,disposed=false;
 const baseFov=o.camera.fov;const effects=[],pending=[],remote=new Map(),seen=new Map(); const aim=new T.Raycaster();
 const gun=new T.Group(),gunMaterial=new T.MeshStandardMaterial({color:0x303239,roughness:.65});
 for(const [x,y,z,w,h,d]of [[0,0,0,.14,.18,.55],[0,0,.5,.06,.06,.6],[0,-.16,-.04,.09,.25,.12],[0,-.15,.12,.08,.28,.15]]){const m=new T.Mesh(new T.BoxGeometry(w,h,d),gunMaterial);m.position.set(x,y,z);gun.add(m);}gun.visible=false;scene.add(gun);
 const menu=document.createElement('section');menu.className='sbPanel';menu.hidden=true;menu.setAttribute('aria-label','Waffen und Fahrzeuge');
 menu.innerHTML='<b>⚔ Waffen & Fahrzeuge</b><button data-close style="float:right">✕</button><p>Browser-Spielplatz · B öffnet dieses Menü</p><div class="row"><button data-gun="ak">AK</button><button data-gun="sniper">Sniper</button><button data-gun="rocket">Raketenwerfer</button></div><p><label><input data-pvp type="checkbox" style="width:auto" checked> Bei Browser-Gefechten mitmachen</label></p><div class="row"><button data-spawn="tank">Panzer fahren</button><button data-spawn="jet">Jet fliegen</button><button data-exit>Aussteigen (E)</button></div><p>WASD: steuern · Jet: W/S Schub, A/D Kurve, ↑/↓ steigen/sinken, Q/R rollen · Panzer: W/S vor/zurück, A/D lenken · Linksklick halten: feuern · Sniper: rechte Maustaste zielen</p><button data-off>Waffen weglegen</button>';
 pane.appendChild(menu);
 const button=document.createElement('button');button.textContent='⚔ Waffen / Fahrzeuge (B)';button.style.cssText='position:absolute;right:12px;bottom:70px;z-index:10';pane.appendChild(button);
 const health=document.createElement('div');health.style.cssText='position:absolute;right:12px;bottom:110px;z-index:10;padding:6px 10px;background:#172027dd;color:white;border-radius:8px;pointer-events:none';health.hidden=true;pane.appendChild(health);
 function report(){health.hidden=!enabled;health.textContent=hp<=0?'💀 Wieder da in '+Math.max(1,Math.ceil((dead-performance.now())/1000))+' s':'♥ '+hp+' / 100 · '+weapons[vehicle?.kind==='tank'?'cannon':weapon].label+(vehicle?' · '+(vehicle.kind==='jet'?'Jet':'Panzer')+' '+Math.round(Math.abs(speed)*3.6)+' km/h':'')+(pvp?' · PvP':' · friedlich');}
 function open(){if(!o.walking())o.walk();enabled=true;o.camera.fov=baseFov;o.camera.updateProjectionMatrix();if(o.equip)o.equip();menu.hidden=!menu.hidden;if(document.pointerLockElement===canvas)document.exitPointerLock();held=false;report();}
 button.onclick=open;menu.querySelector('[data-close]').onclick=()=>menu.hidden=true;
 menu.querySelector('[data-pvp]').onchange=e=>{pvp=e.target.checked;report();};
 menu.querySelectorAll('[data-gun]').forEach(b=>b.onclick=()=>{weapon=b.dataset.gun;enabled=true;menu.querySelectorAll('[data-gun]').forEach(x=>x.classList.toggle('on',x===b));report();});
 menu.querySelectorAll('[data-spawn]').forEach(b=>b.onclick=()=>spawn(b.dataset.spawn));
 menu.querySelector('[data-exit]').onclick=exit;
 menu.querySelector('[data-off]').onclick=()=>{exit();enabled=false;held=false;menu.hidden=true;report();};
 function model(kind){
 const root=new T.Group(); const paint=new T.MeshStandardMaterial({color:kind==='tank'?0x65734a:0x657d91,roughness:.65}),dark=kind==='tank'?new T.MeshStandardMaterial({color:0x20242a}):null,glass=kind==='jet'?new T.MeshStandardMaterial({color:0x58c5de,metalness:.5,roughness:.15}):null;
 function box(x,y,z,a,b,c,m=paint){const mesh=new T.Mesh(new T.BoxGeometry(a,b,c),m);mesh.position.set(x,y,z);root.add(mesh);return mesh;}
 if(kind==='tank'){box(0,1,0,3.1,1.2,4.5);box(0,2,.1,2,1,2.1);box(0,2,2.6,.24,.24,4);for(const x of [-1.7,1.7]){box(x,.55,0,.7,1,4.8,dark);for(let z=-1.7;z<=1.8;z+=.85){const wheel=new T.Mesh(new T.CylinderGeometry(.42,.42,.8,12),dark);wheel.rotation.z=Math.PI/2;wheel.position.set(x,.55,z);root.add(wheel);}}}
 else{box(0,0,0,1.5,1.2,8);box(0,.7,1.5,1,.6,2,glass);const wing=box(0,0,-.6,10,.18,2);wing.rotation.y=.12;box(0,.3,-3.6,4,.2,1.3);box(0,1,-3.2,.18,2,1.3);const nose=new T.Mesh(new T.ConeGeometry(.75,2,12),paint);nose.rotation.x=Math.PI/2;nose.position.z=5;root.add(nose);}
 return root;
 }
 function free(mesh){scene.remove(mesh);const r=new Set();mesh.traverse(x=>{if(x.geometry)r.add(x.geometry);[].concat(x.material||[]).forEach(m=>r.add(m));});r.forEach(x=>x.dispose());}
 function spawn(kind){if(hp<=0)return;exit();if(!o.walking())o.walk();enabled=true;vehicle=model(kind);vehicle.kind=kind;vehicle.position.copy(o.pos);vehicle.rotation.order='YXZ';vehicle.rotation.y=o.heading();// Spawn on open ground beside the player, rather than inside their house.
 for(let radius=10;radius<=50;radius+=10){let found=false;for(let angle=0;angle<6.28;angle+=.79){const candidate=o.pos.clone().add(new T.Vector3(Math.sin(angle)*radius,0,Math.cos(angle)*radius));candidate.y=o.ground(candidate.x,candidate.z)+1.5;let blocked=false;for(let direction=0;direction<6.28;direction+=.79){aim.set(candidate,new T.Vector3(Math.sin(direction),0,Math.cos(direction)));aim.far=5;if(aim.intersectObjects(o.targets(),false).length){blocked=true;break;}}if(!blocked){vehicle.position.copy(candidate);vehicle.position.y-=1.5;found=true;break;}}if(found)break;}
 vehicle.position.y+=kind==='jet'?12:0;speed=kind==='jet'?28:0;scene.add(vehicle);menu.hidden=true;o.say(kind==='jet'?'Jet: W/S Schub · ↑/↓ Höhenruder · E aussteigen':'Panzer: WASD fahren · Klick Kanone · E aussteigen');report();}
 function exit(){if(!vehicle)return;o.pos.copy(vehicle.position);o.pos.x+=3;o.pos.y=Math.max(o.ground(o.pos.x,o.pos.z),o.pos.y);free(vehicle);vehicle=null;speed=0;o.invalidate();}
 function trace(a,b,color){const line=new T.Line(new T.BufferGeometry().setFromPoints([a,b]),new T.LineBasicMaterial({color,transparent:true,opacity:.9}));scene.add(line);effects.push({mesh:line,t:.16});if(effects.length>80)free(effects.shift().mesh);}
 function world(v){return {x:v.x+o.cx(),y:v.y+30,z:o.cz()-v.z};}
 function local(v){return new T.Vector3(v.x-o.cx(),v.y-30,o.cz()-v.z);}
 function fire(now){
 if(!enabled||!o.walking()||hp<=0||!menu.hidden)return;
 const w=vehicle?.kind==='tank'?'cannon':weapon,W=weapons[w];if(now-last<W.delay)return;last=now;
 const a=o.pos.clone().add(new T.Vector3(0,vehicle?2:1.55,0));
 let direction=new T.Vector3(Math.sin(o.heading())*Math.cos(o.pitch()),-Math.sin(o.pitch()),Math.cos(o.heading())*Math.cos(o.pitch()));
 if(vehicle?.kind==='jet')direction=new T.Vector3(0,0,1).applyQuaternion(vehicle.quaternion);
 aim.set(a,direction);aim.far=W.range;let hit=aim.intersectObjects(o.targets(),false)[0];
 const b=hit?hit.point:a.clone().addScaledVector(direction,W.range);
 // The closest avatar stops a bullet; geometry stops it first.
 if(!W.radius){let nearest=a.distanceTo(b);for(const P of o.peers().values()){if(P.g||!P.play||!P.play.pvp||P.play.hp<=0)continue;const center=new T.Vector3(P.tx-o.cx(),P.ty-30+1,o.cz()-P.tz);const t=center.clone().sub(a).dot(direction);if(t>0&&t<nearest&&aim.ray.distanceToPoint(center)<(P.play.vehicle?2.7:.85)){nearest=t;b.copy(a).addScaledVector(direction,t);}}}
 const packet={s:'shot',seq:++seq,weapon:w,a:world(a),b:world(b)};trace(a,b,W.color);if(pvp)o.send(packet);
 if(W.radius)o.blast(a,b,w==='cannon'?'rocket':w);
 o.invalidate();
 }
 function receive(bytes){
 if(!bytes||bytes.length>768)return false;let d;try{d=JSON.parse(new TextDecoder().decode(bytes));}catch(_){return false;}if(d?.s!=='shot')return false;
 if(!shot(d)||typeof d.from!=='string')return true;const P=o.peers().get(d.from);if(!P||P.g||!P.play?.pvp||P.play.hp<=0)return true;
 const W=weapons[d.weapon],now=performance.now(),old=seen.get(d.from);
 if(old&&(d.seq<=old.seq||now-old.t<W.delay*.75))return true;
 if(Math.hypot(d.a.x-P.tx,d.a.y-P.ty,d.a.z-P.tz)>12)return true;
 seen.set(d.from,{seq:d.seq,t:now});const a=local(d.a),b=local(d.b);trace(a,b,W.color);
 if(pending.length<128)pending.push({a,b,w:d.weapon,at:now+(W.radius?Math.min(4000,a.distanceTo(b)/65*1000):0)});
 o.invalidate();return true;
 }
 function damage(event,now){if(!enabled||!pvp||hp<=0||!o.walking())return;const W=weapons[event.w],center=o.pos.clone().add(new T.Vector3(0,1,0));let amount=0;
 if(W.radius){const distance=center.distanceTo(event.b);if(distance<W.radius)amount=Math.ceil(W.damage*(1-distance/W.radius));}
 else{const dir=event.b.clone().sub(event.a),length=dir.length();dir.normalize();const along=center.clone().sub(event.a).dot(dir);if(along>=0&&along<=length+1&&new T.Ray(event.a,dir).distanceToPoint(center)<(vehicle?2.7:.85))amount=W.damage;}
 if(!amount)return;
 // Reject hits through currently intact geometry on the receiving client.
 const direction=center.clone().sub(event.a),distance=direction.length();aim.set(event.a,direction.normalize());aim.far=Math.max(0,distance-1);if(aim.intersectObjects(o.targets(),false).length&&!W.radius)return;
 hp=Math.max(0,hp-amount);o.say('Treffer! −'+amount+' ♥');if(hp===0){dead=now+4000;exit();held=false;o.say('Erwischt! Wiedererscheinen in 4 Sekunden');}report();
 }
 function tick(dt,keys,now){
 if(disposed)return false;if(effects.length)o.invalidate();
 gun.visible=enabled&&o.walking()&&hp>0&&!vehicle;
 if(gun.visible){gun.rotation.set(o.pitch(),o.heading(),0,'YXZ');gun.position.copy(o.pos).add(new T.Vector3(-Math.cos(o.heading())*.3,1.25,Math.sin(o.heading())*.3)).add(new T.Vector3(Math.sin(o.heading())*.5,0,Math.cos(o.heading())*.5));gun.scale.set(1,1,weapon==='sniper'?1.6:weapon==='rocket'?1.3:1);o.invalidate();}
 for(let i=effects.length-1;i>=0;i--){const e=effects[i];e.t-=dt;if(e.t<=0){free(e.mesh);effects.splice(i,1);}}
 for(let i=pending.length-1;i>=0;i--)if(now>=pending[i].at){damage(pending[i],now);pending.splice(i,1);}
 for(const [id]of seen)if(!o.peers().has(id))seen.delete(id);
 if(hp<=0&&now>=dead){hp=100;o.respawn();report();}
 for(const [id,r]of remote)if(!o.peers().has(id)||!o.peers().get(id).play?.vehicle){free(r);remote.delete(id);}
 for(const [id,P]of o.peers()){
 const v=!P.g&&P.play?.vehicle;if(!v)continue;let r=remote.get(id);if(r?.kind!==v.kind){if(r)free(r);r=model(v.kind);r.kind=v.kind;remote.set(id,r);scene.add(r);}r.position.set(P.x-o.cx(),P.y-30,o.cz()-P.z);r.rotation.set(v.pitch,v.yaw,v.roll,'YXZ');r.visible=P.play.hp>0 && (!o.inside || o.inside(P));P.h.g.visible=false;
 }
 if(held)fire(now);
 if(!o.walking()){if(vehicle)exit();return false;}
 if(hp<=0){o.camera.position.copy(o.pos).add(new T.Vector3(0,4,-7));o.camera.lookAt(o.pos);o.hero.visible=false;o.publish(now,false);o.invalidate();report();return true;}
 if(!vehicle)return false;
 if(o.hud)o.hud(vehicle.kind);
 const jet=vehicle.kind==='jet';speed+=((keys.KeyW?1:0)-(keys.KeyS?1:0))*dt*(jet?18:9);speed*=Math.exp(-dt*(jet?.05:1.5));speed=Math.max(jet?0:-7,Math.min(jet?100:14,speed));
 vehicle.rotation.y+=((keys.KeyA?1:0)-(keys.KeyD?1:0))*dt*(jet?.7:Math.min(1.2,Math.abs(speed)*.2));
 vehicle.rotation.y=Math.atan2(Math.sin(vehicle.rotation.y),Math.cos(vehicle.rotation.y));
 if(jet){vehicle.rotation.x=Math.max(-1.1,Math.min(1.1,vehicle.rotation.x+((keys.ArrowDown?1:0)-(keys.ArrowUp?1:0))*dt*.8));vehicle.rotation.z+=((keys.KeyQ?1:0)-(keys.KeyR?1:0))*dt*1.8;}
 const previous=vehicle.position.clone(),forward=new T.Vector3(0,0,1).applyQuaternion(vehicle.quaternion);aim.set(previous.clone().add(new T.Vector3(0,jet?0:1,0)),forward.clone().multiplyScalar(speed<0?-1:1));aim.far=Math.abs(speed)*dt+(jet?4:2.6);
 if(aim.intersectObjects(o.targets(),false).length){if(jet&&Math.abs(speed)>20){hp=Math.max(0,hp-35);o.say('Kollision!');}speed=0;if(hp<=0){dead=now+4000;exit();return true;}}
 vehicle.position.addScaledVector(forward,speed*dt);
 const floor=o.ground(vehicle.position.x,vehicle.position.z);
 if(!jet){vehicle.position.y=floor;const f=new T.Vector3(Math.sin(vehicle.rotation.y),0,Math.cos(vehicle.rotation.y));const rise=o.ground(vehicle.position.x+f.x*2,vehicle.position.z+f.z*2)-floor;if(Math.abs(rise)>1.8){vehicle.position.copy(previous);speed=0;}vehicle.rotation.x=-Math.atan2(Math.max(-1,Math.min(1,rise)),2);}
 else{vehicle.position.y-=Math.max(0,18-speed)*dt*.5;if(vehicle.position.y<floor+1){vehicle.position.y=floor+1;if(speed>20){hp=Math.max(0,hp-35);speed=0;o.say('Kollision!');if(!hp){dead=now+4000;exit();return true;}}}vehicle.position.y=Math.min(2000,vehicle.position.y);}
 vehicle.position.x=Math.max(-20000-o.cx(),Math.min(20000-o.cx(),vehicle.position.x));vehicle.position.z=Math.max(o.cz()-20000,Math.min(o.cz()+20000,vehicle.position.z));
 o.pos.copy(vehicle.position);o.hero.visible=false;
 const back=new T.Vector3(-Math.sin(o.heading())*14,7,-Math.cos(o.heading())*14);const focus=o.pos.clone().add(new T.Vector3(0,3,0));aim.set(focus,back.clone().normalize());aim.far=back.length();const obstacle=aim.intersectObjects(o.targets(),false)[0];if(obstacle)back.setLength(Math.max(2,obstacle.distance-.4));o.camera.position.copy(focus).add(back);o.camera.position.y=Math.max(o.camera.position.y,o.ground(o.camera.position.x,o.camera.position.z)+.6);o.camera.lookAt(o.pos.clone().add(new T.Vector3(0,2,0)));o.publish(now,true);o.invalidate();report();return true;
 }
 function key(e){if(e.code==='Escape'){held=false;o.camera.fov=baseFov;o.camera.updateProjectionMatrix();}if(e.code==='KeyB'&&!e.repeat){open();return true;}if(e.code==='KeyE'&&vehicle){if(!e.repeat)exit();return true;}return false;}
 function pointer(e,down){if(!down&&e.button===2){o.camera.fov=baseFov;o.camera.updateProjectionMatrix();o.invalidate();}if(!enabled||!o.walking()||!menu.hidden){if(!down)held=false;return false;}if(e.button===2&&weapon==='sniper'){o.camera.fov=down?18:baseFov;o.camera.updateProjectionMatrix();o.invalidate();return true;}if(e.button!==0)return false;held=down;if(down)fire(performance.now());return true;}
 function reset(){held=false;exit();pending.length=0;effects.splice(0).forEach(e=>free(e.mesh));remote.forEach(free);remote.clear();o.camera.fov=baseFov;o.camera.updateProjectionMatrix();}
 function dispose(){disposed=true;exit();free(gun);effects.forEach(e=>free(e.mesh));remote.forEach(free);menu.remove();button.remove();health.remove();}
 return {open,key,pointer,receive,tick,dispose,reset,get active(){return enabled&&o.walking();},get dead(){return hp<=0;},state:()=>enabled?{hp,pvp,weapon,vehicle:vehicle?{kind:vehicle.kind,yaw:vehicle.rotation.y,pitch:vehicle.rotation.x,roll:Math.atan2(Math.sin(vehicle.rotation.z),Math.cos(vehicle.rotation.z))}:null}:null};
}
const api={weapons,state,shot,create};if(typeof module!=='undefined'&&module.exports)module.exports=api;else g.VWPlayground=api;
})(typeof window!=='undefined'?window:globalThis);
