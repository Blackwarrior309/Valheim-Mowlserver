/* Hinged door geometry and motion, using prefab-local pivots. */
(function(g) {
  'use strict';
  function split(d, THREE) {
    if (!d.door || !d.door.vertices.length) return null;
    const mask = new Uint8Array(d.positions.length / 3);
    for (const [start,count] of d.door.vertices) mask.fill(1,start,start+count);
    function part(moving) {
      const positions=[], normals=[], uvs=[], indices=[], groups=[], map=new Map();
      for (const [start,count,material] of d.groups) {
        const offset=indices.length;
        for(let i=start;i<start+count;i+=3) {
          const tri=d.indices.slice(i,i+3); if (!!mask[tri[0]] !== moving) continue;
          for(const old of tri) { if (!map.has(old)) { map.set(old,map.size); positions.push(...d.positions.slice(old*3,old*3+3)); normals.push(...d.normals.slice(old*3,old*3+3)); uvs.push(...d.uvs.slice(old*2,old*2+2)); } indices.push(map.get(old)); }
        }
        if(indices.length>offset) groups.push([offset,indices.length-offset,material]);
      }
      const geometry=new THREE.BufferGeometry(); geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3)); geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3)); geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2)); geometry.setIndex(indices); groups.forEach(a=>geometry.addGroup(...a)); if(positions.length) {geometry.computeBoundingBox();geometry.computeBoundingSphere();} return geometry;
    }
    return {leaf:part(true),frame:part(false),pivot:d.door.pivot,colliders:d.door.colliders || []};
  }
  function delta(THREE, pivot, axis, angle) {
    return new THREE.Matrix4().makeTranslation(pivot.x,pivot.y,pivot.z).multiply(new THREE.Matrix4().makeRotationAxis(axis,angle)).multiply(new THREE.Matrix4().makeTranslation(-pivot.x,-pivot.y,-pivot.z));
  }
  function opening(THREE,pivot,center,axis,player) {
    const tangent=new THREE.Vector3().crossVectors(axis,center.clone().sub(pivot));
    return (tangent.dot(player.clone().sub(center)) > 0 ? -1 : 1) * Math.PI/2;
  }
  function angle(from,to,elapsed,duration=0.45) { const t=Math.max(0,Math.min(1,elapsed/duration));return from+(to-from)*t*t*(3-2*t); }
  const api={split,delta,opening,angle}; if(typeof module!=='undefined'&&module.exports) module.exports=api; else g.VWDoors=api;
})(typeof window!=='undefined'?window:globalThis);
