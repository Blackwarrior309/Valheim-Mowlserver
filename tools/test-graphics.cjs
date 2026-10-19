/* Run: node tools/test-graphics.cjs (no npm dependencies). */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const THREE = require('../lib/three.min.js');
require('../js/data.js');
global.VWDoors = require('../js/doors.js');
require('../js/valheim-assets.js');
const { convert, stable } = require('../js/convert.js');

function testRotations() {
  // wood_roof_45 has a 90-degree root yaw in the source prefab. Its authored
  // slope runs along local Z; the prefab root yaw must not be baked into the mesh.
  const d = JSON.parse(fs.readFileSync(path.join(root, 'assets/valheim/models/wood_roof_45.json')));
  const p = d.positions, n = p.length / 3, mean = [0, 0, 0];
  for (let i = 0; i < p.length; i++) mean[i % 3] += p[i] / n;
  let yx = 0, yz = 0;
  for (let i = 0; i < p.length; i += 3) {
    yx += (p[i + 1] - mean[1]) * (p[i] - mean[0]);
    yz += (p[i + 1] - mean[1]) * (p[i + 2] - mean[2]);
  }
  assert(Math.abs(yz) > 5 * Math.abs(yx), 'Roof slope must follow prefab-local Z, without the root yaw');
  // Mirroring Unity Z requires negating the instance yaw in Three.js.
  for (const yaw of [0, 45, 90, 180, 270]) {
    const angle = yaw * Math.PI / 180, x = 0.3, z = 1;
    const expected = new THREE.Vector3(Math.cos(angle) * x + Math.sin(angle) * z, 0.2,
      Math.sin(angle) * x - Math.cos(angle) * z);
    const actual = new THREE.Vector3(x, 0.2, -z).applyAxisAngle(new THREE.Vector3(0, 1, 0), -angle);
    assert(actual.distanceTo(expected) < 1e-9, 'Unity-to-viewer yaw conversion: ' + yaw);
  }
}

function testPack() {
  const crypto = require('node:crypto');
  const base = path.join(root, 'assets/valheim');
  const index = JSON.parse(fs.readFileSync(path.join(base, 'index.json')));
  let triangles = 0;
  for (const [name, entry] of Object.entries(index.models)) {
    const bytes = fs.readFileSync(path.join(base, entry.file));
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex').slice(0, 12), entry.version, name);
    const d = JSON.parse(bytes), count = d.positions.length / 3;
    assert.equal(d.normals.length, count * 3, name);
    assert.equal(d.uvs.length, count * 2, name);
    assert(d.positions.every(Number.isFinite), name);
    assert(d.indices.every((i) => Number.isInteger(i) && i >= 0 && i < count), name);
    assert.equal(d.indices.length % 3, 0, name);
    assert.equal(d.groups.reduce((n, group) => n + group[1], 0), d.indices.length, name);
    for (const [start, length, material] of d.groups) {
      assert(start >= 0 && length > 0 && start + length <= d.indices.length, name);
      assert(d.materials[material], name);
    }
    for (const m of d.materials) if (m.map) assert(fs.existsSync(path.join(base, m.map)), name);
    triangles += d.indices.length / 3;
  }
  console.log(`Validated ${Object.keys(index.models).length} prefab models (${triangles} triangles).`);
}

async function testLoader() {
  const calls = new Map();
  global.fetch = async (url) => {
    calls.set(url, (calls.get(url) || 0) + 1);
    const file = path.join(root, url.split('?')[0]);
    return { ok: fs.existsSync(file), status: 404, json: async () => JSON.parse(fs.readFileSync(file)) };
  };
  THREE.TextureLoader = class { load(url, loaded) { loaded(new THREE.Texture()); } };
  const store = VWValheimAssets.create('', THREE);
  await Promise.all([store.prepare(['woodwall', 'not-a-prefab']), store.prepare(['woodwall'])]);
  const model = store.get('woodwall');
  assert(model);
  assert.equal(store.get('not-a-prefab'), undefined);
  assert.equal(model.geometry.attributes.position.count, model.geometry.attributes.normal.count);
  assert(model.geometry.index.count > 0);
  assert.equal(model.materials[0].map.encoding, THREE.sRGBEncoding);
  assert([...calls.values()].every((n) => n === 1), 'Concurrent requests must share cached downloads');
  await store.prepare(['wood_door']);
  const door = store.get('wood_door').door; assert(door && door.leaf.index.count && door.frame.index.count);
  let disposed = 0; for (const geometry of [door.leaf, door.frame]) geometry.addEventListener('dispose', () => disposed++);
  store.dispose(); assert.equal(disposed, 2, 'Door parts must be disposed with the asset store');
  // A missing pack must reject cleanly so the viewer can report its fallback.
  await assert.rejects(VWValheimAssets.create('missing/', THREE).prepare(['woodwall']));
}

function testConversion() {
  const chunks = [];
  const bytes = (v) => chunks.push(Buffer.from(v));
  const i32 = (v) => { const b = Buffer.alloc(4); b.writeInt32LE(v); chunks.push(b); };
  const f32 = (v) => { const b = Buffer.alloc(4); b.writeFloatLE(v); chunks.push(b); };
  const i64 = (v) => { const b = Buffer.alloc(8); b.writeBigInt64LE(BigInt(v)); chunks.push(b); };
  const str = (s) => { const b = Buffer.from(s); assert(b.length < 128); bytes([b.length]); chunks.push(b); };
  bytes(Buffer.from('VWD1')); i32(1); str('Graphics test'); str('seed'); i64(Date.now());
  i32(0); i32(0); i32(0); i32(26);
  for (let k = 0; k < 25; k++) {
    i32(stable('woodwall')); [k % 5 * 2, 32, Math.floor(k / 5) * 2, 90, 1].forEach(f32);
    bytes([1]); i64(123);
  }
  i32(stable('Beech1')); [6, 31, 10, 45, 1.25].forEach(f32); bytes([0]);
  const result = convert([{ name: 'test.vwdump', data: new Uint8Array(Buffer.concat(chunks)) }],
    { gunzip: (v) => new Uint8Array(require('node:zlib').gunzipSync(v)) });
  const region = result.regions[0];
  assert(region);
  assert.equal(region.natureModels.Beech1.kind, 'tree_beech');
  assert.deepEqual(region.natureModels.Beech1.instances, [6, 31, 10, 45, 1.25]);
  assert.deepEqual(region.nature.tree_beech, region.natureModels.Beech1.instances);
  assert.equal(region.pieces.wood.length / 6, 25);
  assert(region.types.some((t) => t[0] === 'woodwall'));
}

(async () => { testRotations(); testPack(); await testLoader(); testConversion(); console.log('Graphics rotation, loader and world conversion passed.'); })()
  .catch((e) => { console.error(e); process.exitCode = 1; });
