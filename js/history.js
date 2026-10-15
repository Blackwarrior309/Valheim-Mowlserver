/* Valheim Welt-Viewer – Bau-Verlauf (Zeitraffer)
 * Gemeinsamer Kern für Browser und Node:
 *  - piecesFromSnap(snap): alle von Spielern gebauten Teile eines .vwelt-Stands → Map key → [name,x,y,z,rot,owner]
 *  - diff(prev, cur): hinzugekommene / entfernte Teile
 *  - encodeEvent / decodeEvent: kompaktes Speicherformat (Typ- und Erbauer-Tabelle)
 *  - keyTimes(events): Zeitpunkt, seit dem jedes heute vorhandene Teil steht
 * Speicherort (Live-Karte): Branch „verlauf“, Dateien index.json + e/<zeit>.json.gz – siehe docs/FORMAT.md
 */
(function (g) {
  'use strict';
  const NONE = 'ohne Erbauer';
  const keyOf = (name, x, y, z, rot) => name + '|' + x + '|' + y + '|' + z + '|' + rot;

  function piecesFromSnap(snap) {
    const out = new Map();
    const regs = snap.world3d ? [snap.world3d] : (snap.regions || []);
    for (const r of regs) {
      for (const arr of Object.values(r.pieces || {})) {
        for (let o = 0; o < arr.length; o += 6) {
          const owner = r.owners[arr[o + 5]];
          if (!owner || owner === NONE) continue;
          const name = r.types[arr[o + 4]][0];
          const k = keyOf(name, arr[o], arr[o + 1], arr[o + 2], arr[o + 3]);
          if (!out.has(k)) out.set(k, [name, arr[o], arr[o + 1], arr[o + 2], arr[o + 3], owner]);
        }
      }
    }
    return out;
  }

  function diff(prev, cur) {
    const add = [], del = [];
    for (const [k, v] of cur) if (!prev.has(k)) add.push(v);
    for (const [k, v] of prev) if (!cur.has(k)) del.push(v);
    return { add, del };
  }

  function encodeEvent(t, add, del) {
    const types = [], tix = {}, owners = [], oix = {};
    const T = (n) => (tix[n] !== undefined ? tix[n] : (tix[n] = types.push(n) - 1));
    const O = (n) => (oix[n] !== undefined ? oix[n] : (oix[n] = owners.push(n) - 1));
    return {
      v: 1, t, types, owners,
      add: add.map((p) => [T(p[0]), p[1], p[2], p[3], p[4], O(p[5])]),
      del: del.map((p) => [T(p[0]), p[1], p[2], p[3], p[4], O(p[5])])
    };
  }
  function decodeEvent(e) {
    const f = (a) => [e.types[a[0]], a[1], a[2], a[3], a[4], e.owners[a[5]]];
    return { t: e.t, add: (e.add || []).map(f), del: (e.del || []).map(f) };
  }
  function apply(state, ev) {
    for (const p of ev.del) state.delete(keyOf(p[0], p[1], p[2], p[3], p[4]));
    for (const p of ev.add) state.set(keyOf(p[0], p[1], p[2], p[3], p[4]), p);
    return state;
  }
  // events: decodiert, zeitlich sortiert → Map key → Zeitpunkt des (letzten) Hinzukommens
  function keyTimes(events) {
    const t = new Map();
    for (const ev of events) {
      for (const p of ev.del) t.delete(keyOf(p[0], p[1], p[2], p[3], p[4]));
      for (const p of ev.add) t.set(keyOf(p[0], p[1], p[2], p[3], p[4]), ev.t);
    }
    return t;
  }
  function summary(add, del) {
    const by = {}; add.forEach((p) => (by[p[5]] = (by[p[5]] || 0) + 1));
    return { add: add.length, del: del.length, by };
  }

  const API = { NONE, keyOf, piecesFromSnap, diff, encodeEvent, decodeEvent, apply, keyTimes, summary };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  g.VW_HISTORY = API;
})(typeof window !== 'undefined' ? window : globalThis);
