/* Pure map tools, shared by the viewer and Node tests. World coordinates, metres. */
(function (g) {
  'use strict';
  const finite = (n) => typeof n === 'number' && Number.isFinite(n);
  const point = (p) => p && finite(p.x) && finite(p.z) && Math.abs(p.x) <= 20000 && Math.abs(p.z) <= 20000 && (p.y == null || finite(p.y) && Math.abs(p.y) < 5000);
  const key = (p) => [p.x, p.y, p.z].join(',');
  const worldKey = (s) => JSON.stringify([s.world.name, s.world.seed || '']);
  function room(r) {
    if (!r || typeof r.id !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(r.id) || ['__proto__', 'constructor', 'prototype'].includes(r.id) || typeof r.name !== 'string' || !r.name.trim() || r.name.length > 80 || !Array.isArray(r.min) || !Array.isArray(r.max) || r.min.length !== 3 || r.max.length !== 3) throw new Error('Ungültiger Bereich');
    if (![...r.min, ...r.max].every((n) => finite(n) && Math.abs(n) < 20000) || !r.min.every((v, i) => v < r.max[i])) throw new Error('Bereich braucht eine positive Breite, Höhe und Tiefe.');
    return { id: r.id, name: r.name.trim(), min: r.min.slice(), max: r.max.slice() };
  }
  function contains(r, p) { return [p.x, p.y, p.z].every((v, i) => finite(v) && v >= r.min[i] && v < r.max[i]); }
  const volume = (r) => r.max.reduce((v, n, i) => v * (n - r.min[i]), 1);
  function assigned(rooms, p) { return rooms.filter((r) => contains(r, p)).sort((a, b) => volume(a) - volume(b) || a.id.localeCompare(b.id))[0] || null; }
  function project(p) {
    if (!p || typeof p.id !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(p.id) || ['__proto__', 'constructor', 'prototype'].includes(p.id) || typeof p.name !== 'string' || !p.name.trim() || p.name.length > 80 || !Array.isArray(p.needs) || p.needs.length > 1000) throw new Error('Ungültiges Bauprojekt');
    const needs = new Map();
    for (const n of p.needs) { if (!Array.isArray(n) || typeof n[0] !== 'string' || !n[0] || n[0].length > 100 || !Number.isSafeInteger(n[1]) || n[1] <= 0 || n[1] > 1e7) throw new Error('Ungültige Materialmenge'); needs.set(n[0], (needs.get(n[0]) || 0) + n[1]); }
    return { id: p.id, name: p.name.trim(), owner: String(p.owner || '').slice(0, 80), status: ['planned', 'building', 'done'].includes(p.status) ? p.status : 'planned', room: String(p.room || '').slice(0, 100), needs: [...needs] };
  }
  function allocate(projects, chests, rooms) {
    // One global stock pool prevents two projects reserving the same items. Room restrictions
    // narrow the eligible chests without creating a second, independent stock pool.
    const stock = chests.map((c) => ({ c, items: new Map(c.i.map(([name, n]) => [name, n])) }));
    return projects.map((p) => ({ ...p, materials: p.needs.map(([name, need]) => {
      if (p.status === 'done') return { name, need, reserved: 0, missing: 0 };
      let left = need;
      for (const s of stock) {
        if (p.room && (!assigned(rooms, s.c) || assigned(rooms, s.c).id !== p.room)) continue;
        const have = s.items.get(name) || 0, take = Math.min(left, have);
        s.items.set(name, have - take); left -= take; if (!left) break;
      }
      return { name, need, reserved: need - left, missing: left };
    }) }));
  }
  function pieceMap(s) {
    const out = new Map();
    for (const r of s.world3d ? [s.world3d] : s.regions || []) for (const a of Object.values(r.pieces || {})) for (let i = 0; i < a.length; i += 6) {
      const name = r.types[a[i + 4]][0], owner = r.owners[a[i + 5]];
      if (!owner || owner === 'ohne Erbauer') continue;
      const p = { name, x: a[i], y: a[i + 1], z: a[i + 2], yaw: a[i + 3], owner };
      out.set([name, key(p), p.yaw].join('|'), p);
    }
    return out;
  }
  function diff(before, after) {
    if (worldKey(before) !== worldKey(after)) throw new Error('Die Vergleichsdatei gehört zu einer anderen Welt.');
    const a = pieceMap(before), b = pieceMap(after);
    return { added: [...b].filter(([k]) => !a.has(k)).map(([, p]) => p), removed: [...a].filter(([k]) => !b.has(k)).map(([, p]) => p), before: before.created, after: after.created };
  }
  function diffMaps(before, after) { return { added: [...after].filter(([k]) => !before.has(k)).map(([, p]) => p), removed: [...before].filter(([k]) => !after.has(k)).map(([, p]) => p) }; }
  function rewind(current, events) {
    const out = new Map(current);
    const convert = (p) => ({ name: p[0], x: p[1], y: p[2], z: p[3], yaw: p[4], owner: p[5] });
    const id = (p) => [p.name, key(p), p.yaw].join('|');
    for (const ev of events.slice().sort((a, b) => b.t - a.t)) { for (const p of ev.add) out.delete(id(convert(p))); for (const p of ev.del) { const o = convert(p); out.set(id(o), o); } }
    return out;
  }
  function share(url, world, camera, region) {
    const u = new URL(url); u.hash = 'ort=' + encodeURIComponent(JSON.stringify({ v: 1, world, region, ...camera })); return u.href;
  }
  function parseShare(hash, world) {
    if (!hash.startsWith('#ort=')) return null;
    try {
      const p = JSON.parse(decodeURIComponent(hash.slice(5)));
      if (p.v !== 1 || p.world !== world || !point(p) || ![p.dist, p.yaw, p.pit].every(finite) || p.dist < 1 || p.dist > 30000 || p.pit < 0 || p.pit > Math.PI / 2 || typeof p.region !== 'string') return null;
      return p;
    } catch (e) { return null; }
  }
  class Heap {
    constructor() { this.a = []; }
    push(v) { let i = this.a.push(v) - 1; while (i) { const p = (i - 1) >> 1; if (this.a[p].f <= v.f) break; this.a[i] = this.a[p]; i = p; } this.a[i] = v; }
    pop() { const out = this.a[0], v = this.a.pop(); if (this.a.length) { let i = 0; while (i * 2 + 1 < this.a.length) { let c = i * 2 + 1; if (c + 1 < this.a.length && this.a[c + 1].f < this.a[c].f) c++; if (this.a[c].f >= v.f) break; this.a[i] = this.a[c]; i = c; } this.a[i] = v; } return out; }
  }
  function terrainRoute(a, b, height, opts = {}) {
    const distance = Math.hypot(b.x - a.x, b.z - a.z), step = Math.max(1, distance / 120), margin = Math.max(24, Math.min(500, distance * 0.4));
    const x0 = Math.min(a.x, b.x) - margin, z0 = Math.min(a.z, b.z) - margin;
    const nx = Math.ceil((Math.abs(a.x - b.x) + 2 * margin) / step) + 1, nz = Math.ceil((Math.abs(a.z - b.z) + 2 * margin) / step) + 1;
    const at = (p) => Math.round((p.z - z0) / step) * nx + Math.round((p.x - x0) / step);
    const pos = (k) => ({ x: x0 + k % nx * step, z: z0 + Math.floor(k / nx) * step });
    const start = at(a), end = at(b), costs = new Map([[start, 0]]), parent = new Map(), closed = new Set(), heights = new Map(), heap = new Heap();
    const h = (k) => { if (!heights.has(k)) { const p = pos(k); heights.set(k, height(p.x, p.z)); } return heights.get(k); };
    heap.push({ k: start, f: distance }); let visited = 0;
    while (heap.a.length && visited++ < 16000) {
      const { k } = heap.pop(); if (closed.has(k)) continue; closed.add(k);
      if (k === end) {
        const path = []; let cur = k; while (cur != null) { const p = pos(cur); path.push({ ...p, y: opts.boat ? Math.max(30, h(cur)) : h(cur) }); cur = parent.get(cur); }
        path.reverse(); path[0] = a; path[path.length - 1] = b;
        return { d: costs.get(k), path, approximate: false };
      }
      const x = k % nx, z = Math.floor(k / nx);
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [-1, 1], [1, -1]]) {
        const xx = x + dx, zz = z + dz; if (xx < 0 || zz < 0 || xx >= nx || zz >= nz) continue;
        const next = zz * nx + xx; if (closed.has(next)) continue;
        const p = pos(next), y = h(next), water = y < 29;
        const rise = Math.abs((opts.boat ? Math.max(30, y) : y) - (opts.boat ? Math.max(30, h(k)) : h(k)));
        if (!finite(y) || water && !opts.boat || rise > step * 1.2) continue;
        if (opts.blocked && next !== end && opts.blocked(p.x, p.z, y)) continue;
        if (dx && dz && opts.blocked && (opts.blocked(p.x, pos(k).z, y) || opts.blocked(pos(k).x, p.z, y))) continue;
        const cost = costs.get(k) + Math.hypot(dx, dz) * step * (water ? 1.6 : 1) + rise * 2;
        if (cost >= (costs.get(next) ?? Infinity)) continue;
        costs.set(next, cost); parent.set(next, k); heap.push({ k: next, f: cost + Math.hypot(p.x - b.x, p.z - b.z) });
      }
    }
    return { d: Infinity, path: [], approximate: true };
  }
  function portalRoute(a, b, links, cost = (p, q) => Math.hypot(p.x - q.x, p.z - q.z)) {
    const nodes = [a, b], ids = new Map(), edges = new Map();
    const id = (p) => { const k = key(p); if (!ids.has(k)) { ids.set(k, nodes.length); nodes.push(p); } return ids.get(k); };
    for (const l of links) { const from = id(l.a), to = id(l.b); edges.set(from + ':' + to, l.tag); }
    const dist = new Array(nodes.length).fill(Infinity), prev = [], used = new Set(); dist[0] = 0;
    while (used.size < nodes.length) {
      let u = -1; for (let i = 0; i < nodes.length; i++) if (!used.has(i) && (u < 0 || dist[i] < dist[u])) u = i;
      if (u < 0 || !finite(dist[u]) || u === 1) break; used.add(u);
      for (let v = 0; v < nodes.length; v++) { if (v === u || used.has(v)) continue; const tag = edges.get(u + ':' + v); const d = dist[u] + (tag ? 45 : cost(nodes[u], nodes[v])); if (d < dist[v]) { dist[v] = d; prev[v] = { from: u, tag }; } }
    }
    const path = []; let i = 1;
    if (finite(dist[1])) { while (i !== 0) { const e = prev[i]; path.push({ ...nodes[i], ...(e.tag ? { jump: true, portal: e.tag } : {}) }); i = e.from; } path.push(a); path.reverse(); }
    return { d: dist[1], path, via: path.filter((p) => p.jump).map((p) => p.portal).join(' → ') || null };
  }
  const api = { finite, point, worldKey, key, room, contains, assigned, project, allocate, pieceMap, diff, diffMaps, rewind, share, parseShare, terrainRoute, portalRoute };
  g.VWTools = api; if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof self !== 'undefined' ? self : globalThis);
