const test = require('node:test'), assert = require('node:assert/strict');
const T = require('../js/map-tools.js');
const room = (id, min, max) => T.room({ id, name: id, min, max });
test('rooms distinguish storeys and give deterministic ownership to the smallest volume', () => {
  const all = room('hall', [0, 0, 0], [20, 20, 20]), cellar = room('cellar', [1, 1, 1], [8, 4, 8]), upper = room('upper', [1, 4, 1], [8, 8, 8]);
  assert.equal(T.assigned([all, cellar, upper], { x: 2, y: 3, z: 2 }).id, 'cellar');
  assert.equal(T.assigned([all, cellar, upper], { x: 2, y: 4, z: 2 }).id, 'upper');
  assert.equal(T.assigned([upper, cellar, all], { x: 2, y: 3, z: 2 }).id, 'cellar');
  assert.equal(T.assigned([all], { x: 25, y: 1, z: 1 }), null);
  for (const bad of [{ ...all, min: [0, NaN, 0] }, { ...all, max: all.min }, { ...all, id: '__proto__' }]) assert.throws(() => T.room(bad));
});
test('project reservations share one stock pool and obey room restrictions', () => {
  const rooms = [room('lower', [0, 0, 0], [10, 5, 10]), room('upper', [0, 5, 0], [10, 10, 10])];
  const chests = [{ x: 1, y: 1, z: 1, i: [['Holz', 60]] }, { x: 1, y: 6, z: 1, i: [['Holz', 40]] }];
  const project = (id, r = '') => T.project({ id, name: id, room: r, needs: [['Holz', 80]] });
  const a = T.allocate([project('first', 'lower'), project('second')], chests, rooms);
  assert.equal(a[0].materials[0].reserved, 60); assert.equal(a[1].materials[0].reserved, 40);
  assert.equal(T.allocate([{ ...project('done'), status: 'done' }, project('next')], chests, rooms)[1].materials[0].reserved, 80);
  assert.throws(() => T.project({ id: 'bad', name: 'Bad', needs: [['Holz', -1]] }));
});
test('routing supports two portal hops instead of only one', () => {
  const a = { x: 0, z: 0 }, b = { x: 1000, z: 0 };
  const links = [{ a: { x: 1, z: 0 }, b: { x: 400, z: 0 }, tag: 'one' }, { a: { x: 401, z: 0 }, b: { x: 999, z: 0 }, tag: 'two' }];
  const r = T.portalRoute(a, b, links);
  assert.equal(r.d, 93); assert.equal(r.path.filter((p) => p.jump).length, 2);
  assert.equal(T.portalRoute(a, b, []).d, 1000);
});
test('terrain routing detours around walls and respects water and boat mode', () => {
  const a = { x: 0, y: 32, z: 0 }, b = { x: 20, y: 32, z: 0 };
  const blocked = (x, z) => x > 8 && x < 12 && Math.abs(z) < 6;
  const r = T.terrainRoute(a, b, () => 32, { blocked });
  assert(Number.isFinite(r.d)); assert(r.path.some((p) => Math.abs(p.z) >= 6));
  assert.equal(T.terrainRoute(a, b, (x) => x > 4 && x < 16 ? 28 : 32).d, Infinity);
  assert(Number.isFinite(T.terrainRoute(a, b, () => 28, { boat: true }).d));
  assert.equal(T.terrainRoute(a, b, () => NaN).d, Infinity);
});
test('place links round-trip world coordinates and camera and reject unrelated worlds', () => {
  const camera = { x: -400, y: 36, z: 100, dist: 80, yaw: -0.4, pit: 0.7 };
  const link = T.share('https://example.org/map/?src=live/welt.vwelt', 'World A', camera, 'b0');
  assert.deepEqual(T.parseShare(new URL(link).hash, 'World A'), { v: 1, world: 'World A', region: 'b0', ...camera });
  assert.equal(T.parseShare(new URL(link).hash, 'World B'), null);
  assert.equal(T.parseShare('#ort=not-json', 'World A'), null);
});
test('snapshot diff deduplicates regions and includes removed pieces with their positions', () => {
  const region = (a) => ({ types: [['woodwall']], owners: ['Player'], pieces: { wood: a } });
  const before = { world: { name: 'A', seed: '123' }, regions: [region([1, 32, 2, 90, 0, 0]), region([1, 32, 2, 90, 0, 0])] };
  const after = { ...before, regions: [region([5, 32, 6, 0, 0, 0])] };
  const d = T.diff(before, after); assert.equal(d.added.length, 1); assert.equal(d.removed.length, 1); assert.equal(d.removed[0].x, 1);
  assert.throws(() => T.diff(before, { ...after, world: { name: 'B' } }));
});
test('rewinding history cancels temporary construction and restores demolished pieces', () => {
  const s = { world: { name: 'A' }, regions: [{ types: [['woodwall']], owners: ['Player'], pieces: { wood: [5, 32, 6, 0, 0, 0] } }] };
  const events = [{ t: 1, add: [['woodwall', 8, 32, 9, 0, 'Player']], del: [['woodwall', 1, 32, 2, 0, 'Player']] }, { t: 2, add: [['woodwall', 5, 32, 6, 0, 'Player']], del: [['woodwall', 8, 32, 9, 0, 'Player']] }];
  const now = T.pieceMap(s), before = T.rewind(now, events), d = T.diffMaps(before, now);
  assert.equal(d.added.length, 1); assert.equal(d.removed.length, 1); assert.equal(d.removed[0].x, 1);
});
