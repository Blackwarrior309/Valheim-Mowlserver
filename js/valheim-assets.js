/* Static Valheim prefab pack. Lazy loading, four concurrent downloads, shared resources. */
(function (g) {
  'use strict';
  function create(base, THREE) {
    let manifest;
    let disposed = false;
    const models = new Map(), pending = new Map(), textures = new Map();
    const url = (file) => base + 'assets/valheim/' + file;
    async function json(file) {
      const r = await fetch(url(file), file === 'index.json' ? { cache: 'no-cache' } : undefined);
      if (!r.ok) throw new Error('Grafikdatei nicht verfügbar: ' + r.status);
      return r.json();
    }
    function index() {
      if (!manifest) manifest = json('index.json').then((v) => {
        if (v.version !== 1 || !v.models) throw new Error('Unbekanntes Grafikformat');
        return v.models;
      });
      return manifest;
    }
    async function material(spec) {
      const m = new THREE.MeshLambertMaterial({ color: new THREE.Color(...(spec.color || [1, 1, 1])),
        side: THREE.DoubleSide, alphaTest: spec.cutoff || 0, opacity: spec.opacity == null ? 1 : spec.opacity,
        transparent: spec.opacity < 1 && !spec.cutoff });
      try {
        if (spec.map) {
          const key = JSON.stringify([spec.map, spec.repeat, spec.offset]);
          if (!textures.has(key)) textures.set(key, new Promise((resolve, reject) => {
            new THREE.TextureLoader().load(url(spec.map), (t) => {
              t.wrapS = t.wrapT = THREE.RepeatWrapping;
              t.encoding = THREE.sRGBEncoding;
              t.repeat.fromArray(spec.repeat || [1, 1]); t.offset.fromArray(spec.offset || [0, 0]);
              if (disposed) { t.dispose(); reject(new Error('Viewer geschlossen')); } else resolve(t);
            }, undefined, reject);
          }));
          m.map = await textures.get(key);
        }
        return m;
      } catch (e) { m.dispose(); throw e; }
    }
    async function read(name, entry) {
      if (!pending.has(name)) pending.set(name, (async () => {
        let geometry, mats = [];
        try {
          const d = await json(entry.file + '?v=' + encodeURIComponent(entry.version));
          if (d.version !== 1 || !d.positions.length || d.positions.length % 3 || !d.indices.length) throw new Error('Ungültiges Modell');
          geometry = new THREE.BufferGeometry();
          geometry.setAttribute('position', new THREE.Float32BufferAttribute(d.positions, 3));
          geometry.setAttribute('normal', new THREE.Float32BufferAttribute(d.normals, 3));
          geometry.setAttribute('uv', new THREE.Float32BufferAttribute(d.uvs, 2));
          geometry.setIndex(d.indices);
          d.groups.forEach(([start, count, mi]) => geometry.addGroup(start, count, mi));
          geometry.computeBoundingSphere();
          // Sequential materials ensure partial loads can be disposed on error.
          for (const spec of d.materials) mats.push(await material(spec));
          if (disposed) throw new Error('Viewer geschlossen');
          models.set(name, { geometry, materials: mats });
        } catch (e) {
          if (geometry) geometry.dispose(); mats.forEach((m) => m.dispose());
          if (!disposed) console.warn('Valheim-Grafik: Ersatzmodell für', name, e);
        }
      })());
      await pending.get(name);
      if (!models.has(name)) pending.delete(name);
    }
    async function prepare(names) {
      if (disposed) return 0;
      const entries = await index();
      const queue = [...new Set(names)].filter((n) => entries[n]);
      let next = 0;
      await Promise.all(Array.from({ length: Math.min(4, queue.length) }, async () => {
        while (next < queue.length && !disposed) { const name = queue[next++]; await read(name, entries[name]); }
      }));
      return names.filter((n) => models.has(n)).length;
    }
    function dispose() { disposed = true; models.forEach((m) => { m.geometry.dispose(); m.materials.forEach((v) => v.dispose()); }); textures.forEach((p) => p.then((t) => t.dispose()).catch(() => {})); models.clear(); textures.clear(); pending.clear(); }
    return { prepare, get: (name) => models.get(name), dispose };
  }
  g.VWValheimAssets = { create };
})(typeof self !== 'undefined' ? self : globalThis);
