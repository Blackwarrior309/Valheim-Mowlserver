const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const THREE=require('../lib/three.min.js'),{create}=require('../js/destruction.js');
const scope={performance};vm.runInNewContext(fs.readFileSync('lib/cannon.min.js','utf8')+';globalThis.physics=CANNON;',scope);const CANNON=scope.physics;
function fixture(count=4,limits={}){
 const scene=new THREE.Scene(),geometry=new THREE.BoxGeometry(1,1,1),material=new THREE.MeshLambertMaterial(),im=new THREE.InstancedMesh(geometry,material,count);im.userData={cat:'wood',arr:Array.from({length:count*6},(_,i)=>i)};
 for(let i=0;i<count;i++)im.setMatrixAt(i,new THREE.Matrix4().makeTranslation((i%4)*1.2,1+Math.floor(i/4),0));scene.add(im);const initial=Array.from(im.instanceMatrix.array),data=JSON.stringify(im.userData.arr),states=[];const sim=create({THREE,CANNON,scene,targets:()=>[im],ground:()=>0,invalidate(){},status:s=>states.push(s),limits});sim.setEnabled(true);return {scene,im,sim,initial,data,states};
}
test('explosions detach real instance geometry; rigid bodies fall and reset restores exact matrices without mutating snapshot arrays',()=>{
 const f=fixture();f.sim.explode(new THREE.Vector3(0,1,0),8,12);assert.equal(f.sim.stats().destroyed,4);assert.equal(f.sim.stats().debris,4);assert.notDeepEqual(Array.from(f.im.instanceMatrix.array),f.initial);
 for(let i=0;i<600;i++)f.sim.tick(1/60);const debris=f.scene.children.find(o=>o.isGroup).children.filter(o=>o.isGroup);assert.ok(debris.some(o=>o.position.y<1));assert.ok(debris.every(o=>Number.isFinite(o.position.y)&&o.position.y>-.2));
 f.sim.reset();assert.deepEqual(Array.from(f.im.instanceMatrix.array),f.initial);assert.equal(JSON.stringify(f.im.userData.arr),f.data);assert.equal(f.sim.stats().worldBodies,0);f.sim.dispose();assert.equal(f.scene.children.length,1);
});
test('debris/projectile/effect budgets and reset are bounded even under repeated attacks',()=>{
 const f=fixture(24,{debris:8,projectiles:3,effects:3,statics:12,ground:12});for(let i=0;i<8;i++)f.sim.explode(new THREE.Vector3(0,2,0),12,5);assert.ok(f.sim.stats().debris<=8);assert.ok(f.sim.stats().effects<=3);for(let i=0;i<9;i++)f.sim.fire(new THREE.Vector3(0,8,-12),new THREE.Vector3(0,1,0),'rocket',1,i*200);assert.equal(f.sim.stats().projectiles,3);f.sim.reset();assert.equal(f.sim.stats().projectiles,0);assert.equal(f.sim.stats().effects,0);assert.equal(f.sim.stats().worldBodies,0);
});
test('bomb and rocket explode on timer, pause freezes simulation and disabled mode rejects shots',()=>{
 for(const weapon of ['bomb','rocket']){const f=fixture();assert.ok(f.sim.fire(new THREE.Vector3(0,6,-8),new THREE.Vector3(0,1,0),weapon,1,1000));f.sim.setPaused(true);for(let i=0;i<180;i++)f.sim.tick(1/60);assert.equal(f.sim.stats().destroyed,0);f.sim.setPaused(false);for(let i=0;i<180;i++)f.sim.tick(1/60);assert.ok(f.sim.stats().destroyed>0,weapon);const left=f.sim.stats().destroyed;f.sim.setEnabled(false);assert.equal(f.sim.stats().destroyed,left,'leaving the mode keeps the shared damage');assert.equal(f.sim.fire(new THREE.Vector3(),new THREE.Vector3()),false);f.sim.reset();assert.equal(f.sim.stats().worldBodies,0);}
});
test('door frames detach and restore with leaves; shared geometry and material are not disposed',()=>{
 const f=fixture(1);const frame=new THREE.InstancedMesh(new THREE.BoxGeometry(2,2,.2),f.im.material,1);frame.setMatrixAt(0,new THREE.Matrix4().makeTranslation(0,1,0));f.im.userData.frame=frame;f.scene.add(frame);const initial=Array.from(frame.instanceMatrix.array);let disposed=0;f.im.geometry.addEventListener('dispose',()=>disposed++);f.im.material.addEventListener('dispose',()=>disposed++);f.sim.explode(new THREE.Vector3(0,1,0),4,10);assert.notDeepEqual(Array.from(frame.instanceMatrix.array),initial);f.sim.reset();assert.deepEqual(Array.from(frame.instanceMatrix.array),initial);f.sim.dispose();assert.equal(disposed,0);
});
test('armageddon drains its queue in bounded batches and reset restores everything',()=>{
 const f=fixture(24,{debris:8});f.sim.armageddon();assert.equal(f.sim.stats().destroyed,0);for(let i=0;i<5;i++)f.sim.tick(1/60);assert.equal(f.sim.stats().destroyed,24);assert.equal(f.sim.stats().debris,8);f.sim.reset();assert.deepEqual(Array.from(f.im.instanceMatrix.array),f.initial);
});
test('hidden or culled pieces still break (same result for every player) but leave no debris',()=>{const f=fixture();f.scene.visible=false;f.sim.explode(new THREE.Vector3(0,1,0),8,12);assert.equal(f.sim.stats().destroyed,4);assert.equal(f.sim.stats().debris,0);assert.ok(f.im.userData.gone.has(0));f.sim.reset();f.scene.visible=true;f.im.visible=false;f.sim.explode(new THREE.Vector3(0,1,0),8,12);assert.equal(f.sim.stats().destroyed,4,'frustum-culled mesh is indexed');f.sim.reset();f.im.visible=true;f.sim.explode(new THREE.Vector3(0,1,0),8,12);assert.equal(f.sim.stats().destroyed,4);assert.equal(f.sim.stats().debris,4);});
test('broken pieces are marked for walk collisions; replay hides without debris; only local blasts are reported',()=>{
 const blasts=[];const f=fixture(4);const sim=create({THREE,CANNON,scene:f.scene,targets:()=>[f.im],ground:()=>0,invalidate(){},status(){},onBlast:(p,r)=>blasts.push(r)});f.sim.dispose();
 sim.explode(new THREE.Vector3(0,1,0),1,5);assert.deepEqual(blasts,[1]);assert.ok(f.im.userData.gone.has(0));assert.ok(!f.im.userData.gone.has(3));
 sim.explode(new THREE.Vector3(3.6,1,0),1,5,true);assert.deepEqual(blasts,[1],'remote blasts are not echoed');assert.ok(f.im.userData.gone.has(3));
 sim.reset();assert.equal(f.im.userData.gone,undefined);sim.hide(new THREE.Vector3(0,1,0),.3);assert.equal(sim.stats().destroyed,1);assert.equal(sim.stats().debris,0);
 sim.hide(null);assert.equal(sim.stats().destroyed,4);sim.dispose();
});
test('local blast uses the rounded point/radius it shares, so every player breaks the same pieces',()=>{const f=fixture(4);f.sim.dispose();const sim=create({THREE,CANNON,scene:f.scene,targets:()=>[f.im],ground:()=>0,invalidate(){},status(){},onBlast:()=>({point:new THREE.Vector3(3.6,1,0),radius:.3})});sim.explode(new THREE.Vector3(0,1,0),.3,5);assert.ok(f.im.userData.gone.has(3));assert.ok(!f.im.userData.gone.has(0));sim.dispose();});
