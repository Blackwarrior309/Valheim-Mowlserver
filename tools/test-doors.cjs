const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const THREE=require('../lib/three.min.js'),doors=require('../js/doors.js');
const names=['wood_door','wood_gate','wood_fence_gate','darkwood_gate','stave_gate','iron_grate','flametal_gate','ashwood_door','piece_hexagonal_door'];
test('all nine original doors split leaves from frames without lost triangles',()=>{
 for(const name of names){const d=JSON.parse(fs.readFileSync('assets/valheim/models/'+name+'.json')),parts=doors.split(d,THREE);assert.ok(parts,name);assert.equal(parts.leaf.index.count+parts.frame.index.count,d.indices.length,name);assert.ok(parts.leaf.index.count>0);if(!['flametal_gate','piece_hexagonal_door'].includes(name)) assert.ok(parts.frame.index.count>0,name);for(const part of [parts.leaf,parts.frame])assert.ok(part.index.array.every(i=>i<part.attributes.position.count));assert.ok(d.door.pivot.every(Number.isFinite));}
});
test('door swings away from either side at every placed yaw; hinge stays fixed',()=>{
 for(const yaw of [0,.4,Math.PI/2,Math.PI,Math.PI*1.5])for(const z of [-2,2]){
  const m=new THREE.Matrix4().makeRotationY(yaw);m.setPosition(10,3,20);const pivot=new THREE.Vector3(.686,0,0).applyMatrix4(m),center=new THREE.Vector3(0,0,0).applyMatrix4(m),axis=new THREE.Vector3(0,1,0),player=new THREE.Vector3(0,0,z).applyMatrix4(m);
  const angle=doors.opening(THREE,pivot,center,axis,player),delta=doors.delta(THREE,pivot,axis,angle);assert.ok(pivot.clone().applyMatrix4(delta).distanceTo(pivot)<1e-9);const motion=center.clone().applyMatrix4(doors.delta(THREE,pivot,axis,angle*.05)).sub(center);assert.ok(motion.dot(player.clone().sub(center))<0);
 }
 assert.equal(doors.angle(0,Math.PI/2,-1),0);assert.equal(doors.angle(0,Math.PI/2,1),Math.PI/2);assert.ok(doors.angle(0,1,.1)>0&&doors.angle(0,1,.1)<1);
});
const source=fs.readFileSync('js/viewer.js','utf8');
function box(x,z){return {c:new THREE.Vector3(x,1,z),h:new THREE.Vector3(.8,1,.1),q:new THREE.Quaternion(),iq:new THREE.Quaternion(),r:1.3,door:true};}
function targeting(all,solids=all,pitch=0){const c={THREE,DOORS:all,OBB:solids,pos:new THREE.Vector3(),wyaw:0,wpit:pitch,lv:new THREE.Vector3(),ld:new THREE.Vector3()};vm.createContext(c);const ray=source.slice(source.indexOf('      function rayBox('),source.indexOf('      const DOWN ='));const target=source.slice(source.indexOf('      function target()'),source.indexOf('      function portalOf'));vm.runInContext(ray+target+'globalThis.result=target();',c);return c.result;}
test('interaction needs gaze and reach, respects occlusion and works on a frame',()=>{
 const front=box(0,2);assert.equal(targeting([front]),front);assert.equal(targeting([box(0,-2)]),null);assert.equal(targeting([box(2,2)]),null);assert.equal(targeting([box(0,4)]),null);
 const wall=box(0,1);wall.door=false;assert.equal(targeting([front],[front,wall]),null);
 const opened=box(2,2),frame=box(0,2);frame.ownerDoor=opened;opened.frames=[frame];assert.equal(targeting([opened],[opened,frame]),opened);
 assert.equal(targeting([front], [front],Math.PI/2),null);
});
test('actual viewer pose rotates the collision box and leaves frame untouched; close restores exact matrix',()=>{
 const b=box(0,0);b.m0=new THREE.Matrix4().makeTranslation(0,1,0);b.c0=b.c.clone();b.q0=b.q.clone();b.pivot=new THREE.Vector3(.8,1,0);b.axis=new THREE.Vector3(0,1,0);let matrix;const frame=new THREE.Matrix4().makeTranslation(4,0,0),before=frame.clone();b.im={setMatrixAt(k,m){matrix=m.clone()},instanceMatrix:{},userData:{frame}};
 const c={THREE,g:{VWDoors:doors},shadowFresh:true,shadowPasses:0,invalidate(){}};vm.createContext(c);vm.runInContext(source.slice(source.indexOf('      function poseDoor('),source.indexOf('      function doorTick('))+'globalThis.pose=poseDoor;',c);c.pose(b,Math.PI/2);assert.ok(b.c.distanceTo(b.c0)>.8);assert.ok(b.iq.clone().multiply(b.q).angleTo(new THREE.Quaternion())<1e-8);assert.deepEqual(frame.elements,before.elements);c.pose(b,0);assert.deepEqual(matrix.elements,b.m0.elements);assert.ok(b.c.distanceTo(b.c0)<1e-9);
});
test('rebuilding original door colliders preserves state and includes typed static frames in the grid',()=>{
 const raw=JSON.parse(fs.readFileSync('assets/valheim/models/wood_door.json')),parts=doors.split(raw,THREE),im=new THREE.InstancedMesh(parts.leaf,new THREE.MeshBasicMaterial(),1),closed=new THREE.Matrix4().makeTranslation(0,1,0);im.setMatrixAt(0,closed);
 im.userData={arr:[0,31,0,0,0,0],original:true,doorModel:parts,closedMatrices:im.instanceMatrix.array.slice()};
 const c={THREE,g:{VWDoors:doors},OBB:[],GRID:new Map(),DOORS:[],pickList:[im],reg:{types:[['wood_door',1.4,2,.2,0,0]]},CX:0,CZ:0,WL:30,GS:4,YO:()=>0,eu:new THREE.Euler(),pv:new THREE.Vector3(),doorStates:new Map([['wood_door|0|31|0|0',{open:true,angle:Math.PI/2}]]),shadowFresh:true,shadowPasses:0,invalidate(){}};
 vm.createContext(c);vm.runInContext(source.slice(source.indexOf('      function buildColliders('),source.indexOf('      const near ='))+'buildColliders();',c);assert.equal(c.DOORS.length,1);assert.equal(c.DOORS[0].angle,Math.PI/2);assert.ok(c.OBB.length>1);assert.ok(c.OBB.every(b=>b.ty));const first=c.DOORS[0].c.clone();
 vm.runInContext('buildColliders();',c);assert.ok(c.DOORS[0].c.distanceTo(first)<1e-6,'Re-entry must not apply the open rotation twice');assert.ok([...c.GRID.values()].some(list=>list.includes(c.DOORS[0])));
});
