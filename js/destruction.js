/* Local destruction playground. cannon-es owns simulation; source snapshots stay read-only. */
(function(g){
'use strict';
const LIMITS={debris:320,projectiles:12,effects:18,statics:1800,ground:96};
const WEAPONS={pulse:{radius:3,power:15,label:'Impulsgewehr'},bomb:{radius:8,power:25,label:'Bombe'},rocket:{radius:11,power:32,label:'Rakete'}};
function create({THREE:T,CANNON:C,scene,targets,ground,invalidate,status,limits={}}){
 const cap={...LIMITS,...limits},world=new C.World({gravity:new C.Vec3(0,-18,0),allowSleep:true});world.broadphase=new C.SAPBroadphase(world);world.solver.iterations=7;world.defaultContactMaterial.friction=.55;world.defaultContactMaterial.restitution=.23;
 const layer=new T.Group();scene.add(layer);
 let enabled=false,paused=false,indexed=false,records=[],grid=new Map(),saved=new Map(),broken=new Set(),bodies=[],shots=[],effects=[],statics=new Map(),tiles=new Map(),queue=[],queueAt=0,disposed=false,lastFire=-Infinity;
 const scratch=new T.Matrix4(),box=new T.Box3(),size=new T.Vector3(),zero=new T.Matrix4().makeScale(0,0,0);
 const sphere=new T.SphereGeometry(1,10,7),rocketGeo=new T.CylinderGeometry(.13,.13,.9,8),coneGeo=new T.ConeGeometry(.22,.5,8),rocketMat=new T.MeshBasicMaterial({color:0xe65f38}),metalMat=new T.MeshBasicMaterial({color:0xdddddd});
 function report(){status({destroyed:broken.size,debris:bodies.length,projectiles:shots.length,queued:queue.length-queueAt,paused});}
 const finiteGround=(x,z)=>{const y=ground(x,z);return Number.isFinite(y)&&y>-10000?y:-25;};
 function index(){
  if(indexed)return;indexed=true;
  for(const im of targets()){
   let shown=true;for(let o=im;o;o=o.parent)if(o.visible===false){shown=false;break;}if(!shown)continue;
   if(!im.isInstancedMesh||!im.geometry||!im.visible)continue;
   if(!im.geometry.boundingBox)im.geometry.computeBoundingBox();const native=im.geometry.boundingBox;if(!native||native.isEmpty())continue;
   for(let k=0;k<im.count;k++){
    im.getMatrixAt(k,scratch);if(Math.abs(scratch.determinant())<1e-12)continue;box.copy(native).applyMatrix4(scratch);
    if(im.userData.frame){const f=im.userData.frame;if(!f.geometry.boundingBox)f.geometry.computeBoundingBox();const fm=new T.Matrix4();f.getMatrixAt(k,fm);box.union(f.geometry.boundingBox.clone().applyMatrix4(fm));}
    const r={im,k,box:box.clone(),center:box.getCenter(new T.Vector3())};records.push(r);
    for(let x=Math.floor(box.min.x/8);x<=Math.floor(box.max.x/8);x++)for(let z=Math.floor(box.min.z/8);z<=Math.floor(box.max.z/8);z++){const key=x+','+z;if(!grid.has(key))grid.set(key,[]);grid.get(key).push(r);}
   }
  }
 }
 function nearby(p,radius){const found=new Set();for(let x=Math.floor((p.x-radius)/8);x<=Math.floor((p.x+radius)/8);x++)for(let z=Math.floor((p.z-radius)/8);z<=Math.floor((p.z+radius)/8);z++)for(const r of grid.get(x+','+z)||[])if(!broken.has(r)&&r.box.distanceToPoint(p)<=radius)found.add(r);return [...found];}
 function shape(r){
  const matrix=new T.Matrix4();r.im.getMatrixAt(r.k,matrix);const local=r.im.geometry.boundingBox.clone();let frameMatrix=null;
  if(r.im.userData.frame){const f=r.im.userData.frame;frameMatrix=new T.Matrix4();f.getMatrixAt(r.k,frameMatrix);local.union(f.geometry.boundingBox.clone().applyMatrix4(matrix.clone().invert().multiply(frameMatrix)));}
  const position=new T.Vector3(),quaternion=new T.Quaternion(),scale=new T.Vector3();matrix.decompose(position,quaternion,scale);
  const center=local.getCenter(new T.Vector3()).applyMatrix4(matrix),half=local.getSize(new T.Vector3()).multiply(new T.Vector3(Math.abs(scale.x),Math.abs(scale.y),Math.abs(scale.z))).multiplyScalar(.5);half.max(new T.Vector3(.04,.04,.04));
  return {matrix,frameMatrix,center,quaternion,half};
 }
 function save(im){if(!saved.has(im))saved.set(im,im.instanceMatrix.array.slice());}
 function removeBody(item){world.removeBody(item.body);layer.remove(item.visual);for(const m of item.owned||[])m.dispose();}
 function addGround(x,z){
  const gx=Math.floor(x/32),gz=Math.floor(z/32),key=gx+','+gz;if(tiles.has(key))return;
  const data=[];for(let i=0;i<=8;i++){const col=[];for(let j=0;j<=8;j++)col.push(finiteGround(gx*32+i*4,(gz+1)*32-j*4));data.push(col);}
  const body=new C.Body({mass:0,shape:new C.Heightfield(data,{elementSize:4})});body.position.set(gx*32,0,(gz+1)*32);body.quaternion.setFromEuler(-Math.PI/2,0,0);world.addBody(body);tiles.set(key,body);
  if(tiles.size>cap.ground){const [old,b]=tiles.entries().next().value;world.removeBody(b);tiles.delete(old);}
 }
 function rebuildStatics(center){
  for(const b of statics.values())world.removeBody(b);statics.clear();
  for(const r of nearby(center,30).sort((a,b)=>a.center.distanceToSquared(center)-b.center.distanceToSquared(center)).slice(0,cap.statics)){
   const s=shape(r),body=new C.Body({mass:0,shape:new C.Box(new C.Vec3(s.half.x,s.half.y,s.half.z))});body.position.copy(s.center);body.quaternion.copy(s.quaternion);world.addBody(body);statics.set(r,body);
  }
  for(const dx of [-24,0,24])for(const dz of [-24,0,24])addGround(center.x+dx,center.z+dz);
 }
 function detach(r){
  if(broken.has(r))return null;
  if(bodies.length>=cap.debris)removeBody(bodies.shift());
  const s=shape(r),visual=new T.Group(),owned=[];visual.position.copy(s.center);visual.quaternion.copy(s.quaternion);
  const inverse=new T.Matrix4().compose(s.center,s.quaternion,new T.Vector3(1,1,1)).invert();
  function mesh(im,matrix){let material=im.material;const tint=new T.Color(1,1,1);if(im.instanceColor){im.getColorAt(r.k,tint);if(tint.r!==1||tint.g!==1||tint.b!==1){material=[].concat(material).map(m=>{const copy=m.clone();copy.color.multiply(tint);copy.onBeforeCompile=m.onBeforeCompile;owned.push(copy);return copy;});}}
   const m=new T.Mesh(im.geometry,material);m.matrixAutoUpdate=false;m.matrix.copy(inverse.clone().multiply(matrix));m.castShadow=false;visual.add(m);
  }
  mesh(r.im,s.matrix);save(r.im);r.im.setMatrixAt(r.k,zero);r.im.instanceMatrix.needsUpdate=true;
  if(s.frameMatrix){const frame=r.im.userData.frame;mesh(frame,s.frameMatrix);save(frame);frame.setMatrixAt(r.k,zero);frame.instanceMatrix.needsUpdate=true;}
  broken.add(r);if(statics.has(r)){world.removeBody(statics.get(r));statics.delete(r);}
  const heavy=/stone|marble|iron|metal|rock/.test(r.im.userData.cat||'');const mass=Math.max(.4,Math.min(45,s.half.x*s.half.y*s.half.z*8*(heavy?4:1.5)));
  const body=new C.Body({mass,shape:new C.Box(new C.Vec3(s.half.x,s.half.y,s.half.z)),linearDamping:.15,angularDamping:.22,allowSleep:true,sleepSpeedLimit:.3,sleepTimeLimit:1.5});body.position.copy(s.center);body.quaternion.copy(s.quaternion);world.addBody(body);layer.add(visual);const item={body,visual,owned};bodies.push(item);addGround(s.center.x,s.center.z);return item;
 }
 function impulse(body,point,radius,power){const d=new C.Vec3(body.position.x-point.x,body.position.y-point.y,body.position.z-point.z);const distance=d.length();d.y+=Math.max(1,radius*.25);d.normalize();const force=power*Math.sqrt(body.mass)*Math.max(.15,1-distance/(radius*1.5));d.scale(force,d);body.wakeUp();body.applyImpulse(d,new C.Vec3(.2,.1,-.15));body.angularVelocity.vadd(new C.Vec3((Math.random()-.5)*5,(Math.random()-.5)*5,(Math.random()-.5)*5),body.angularVelocity);}
 function removeEffect(e){layer.remove(e.visual);e.geometry.dispose();e.material.dispose();if(e.flash){layer.remove(e.flash);e.flash.material.dispose();}}
 function burst(point,radius){
  if(effects.length>=cap.effects)removeEffect(effects.shift());
  const positions=new Float32Array(48*3),velocity=new Float32Array(48*3);for(let i=0;i<48;i++){const n=new T.Vector3(Math.random()-.5,Math.random()*.8,Math.random()-.5).normalize().multiplyScalar(radius*(.5+Math.random()));positions.set([point.x,point.y,point.z],i*3);velocity.set(n.toArray(),i*3);}
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(positions,3));const material=new T.PointsMaterial({color:0xffbc54,size:.35,transparent:true,opacity:1,depthWrite:false});const visual=new T.Points(geometry,material);visual.frustumCulled=false;layer.add(visual);const flash=new T.Mesh(sphere,new T.MeshBasicMaterial({color:0xff7a21,transparent:true,opacity:.7,depthWrite:false,blending:T.AdditiveBlending}));flash.position.copy(point);flash.scale.setScalar(radius*.2);layer.add(flash);effects.push({visual,geometry,material,positions,velocity,flash,radius,age:0});
 }
 function explode(point,radius,power){if(!enabled||disposed)return;index();const candidates=nearby(point,radius);for(const r of candidates)detach(r);rebuildStatics(point);for(const b of bodies)if(b.body.position.distanceTo(new C.Vec3(point.x,point.y,point.z))<radius*2)impulse(b.body,point,radius,power);burst(point,radius);invalidate();report();}
 function removeShot(s){if(s.body)world.removeBody(s.body);layer.remove(s.visual);}
 function fire(origin,target,weapon='rocket',scale=1,now=performance.now()){
  if(!enabled||paused||disposed||now-lastFire<180)return false;lastFire=now;const spec=WEAPONS[weapon]||WEAPONS.rocket;scale=Math.max(.5,Math.min(2,scale));
  index();if(weapon==='pulse'){explode(target,spec.radius*scale,spec.power*scale);return true;}
  if(shots.length>=cap.projectiles)removeShot(shots.shift());
  const visual=new T.Group(),body=weapon==='bomb'?new C.Body({mass:.7,shape:new C.Sphere(.22),linearDamping:.01}):null;let duration;
  if(body){const ball=new T.Mesh(sphere,metalMat);ball.scale.setScalar(.22);visual.add(ball);duration=1.8;body.position.copy(origin);body.velocity.set((target.x-origin.x)/duration,(target.y-origin.y)/duration+9*duration,(target.z-origin.z)/duration);world.addBody(body);rebuildStatics(target);}
  else {const rocket=new T.Mesh(rocketGeo,rocketMat),nose=new T.Mesh(coneGeo,metalMat);nose.position.y=.7;visual.add(rocket,nose);visual.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),target.clone().sub(origin).normalize());duration=Math.max(.2,Math.min(4,origin.distanceTo(target)/65));}
  visual.position.copy(origin);layer.add(visual);shots.push({visual,body,origin:origin.clone(),target:target.clone(),age:0,duration,weapon,radius:spec.radius*scale,power:spec.power*scale});invalidate();report();return true;
 }
 function tick(dt){
  if(disposed||!enabled||paused)return;dt=Math.max(0,Math.min(.08,dt));if(!dt)return;
  if(queueAt<queue.length){for(let i=0;i<20&&queueAt<queue.length;i++){const r=queue[queueAt++],b=detach(r);if(b)impulse(b.body,r.center,12,30);}if(queueAt>=queue.length){queue=[];queueAt=0;}report();}
  if(bodies.length||shots.length){for(const item of bodies)if(item.body.sleepState!==C.Body.SLEEPING)addGround(item.body.position.x,item.body.position.z);world.step(1/60,dt,5);for(const item of bodies){item.visual.position.copy(item.body.position);item.visual.quaternion.copy(item.body.quaternion);}}
  for(let i=shots.length-1;i>=0;i--){const s=shots[i];s.age+=dt;if(s.body)s.visual.position.copy(s.body.position);else s.visual.position.lerpVectors(s.origin,s.target,Math.min(1,s.age/s.duration));if(s.age>=s.duration){const point=s.visual.position.clone();removeShot(s);shots.splice(i,1);explode(point,s.radius,s.power);}}
  for(let i=effects.length-1;i>=0;i--){const e=effects[i];e.age+=dt;if(e.age>1.6){removeEffect(e);effects.splice(i,1);continue;}for(let j=0;j<e.positions.length;j+=3){e.velocity[j+1]-=8*dt;for(let k=0;k<3;k++)e.positions[j+k]+=e.velocity[j+k]*dt;}e.geometry.attributes.position.needsUpdate=true;e.material.opacity=1-e.age/1.6;e.material.size=.35+e.age;e.material.color.setHex(e.age<.3?0xffbc54:0x85817b);e.flash.visible=e.age<.5;e.flash.scale.setScalar(e.radius*(.2+e.age*2));e.flash.material.opacity=Math.max(0,.7*(1-e.age/.5));}
  if(bodies.some(b=>b.body.sleepState!==C.Body.SLEEPING)||shots.length||effects.length||queue.length)invalidate();
 }
 function reset(){queue=[];queueAt=0;for(const item of bodies)removeBody(item);bodies=[];for(const s of shots)removeShot(s);shots=[];for(const e of effects)removeEffect(e);effects=[];for(const b of statics.values())world.removeBody(b);statics.clear();for(const b of tiles.values())world.removeBody(b);tiles.clear();for(const [im,matrices]of saved){im.instanceMatrix.array.set(matrices);im.instanceMatrix.needsUpdate=true;}saved.clear();broken.clear();records=[];grid.clear();indexed=false;paused=false;invalidate();report();}
 return {get active(){return enabled;},get paused(){return paused;},setEnabled(value){if(!value)reset();enabled=!!value;report();},setPaused(value){paused=!!value;report();},fire,tick,reset,explode,armageddon(){if(!enabled)return;index();queue=records.filter(r=>!broken.has(r));queueAt=0;invalidate();report();},stats:()=>({destroyed:broken.size,debris:bodies.length,projectiles:shots.length,effects:effects.length,statics:statics.size,ground:tiles.size,worldBodies:world.bodies.length}),dispose(){if(disposed)return;reset();disposed=true;enabled=false;scene.remove(layer);sphere.dispose();rocketGeo.dispose();coneGeo.dispose();rocketMat.dispose();metalMat.dispose();}};
}
const api={create,WEAPONS,LIMITS};if(typeof module!=='undefined'&&module.exports)module.exports=api;else g.VWDestruction=api;
})(typeof window!=='undefined'?window:globalThis);
