/* Bounded wire validation; empty payload alone means departure. */
(function (g) {
  'use strict';
  const cards = typeof module !== 'undefined' && module.exports ? require('./player-card.js') : g.VWPlayerCard;
  function decode(room, topic, bytes) {
    const prefix = room + '/p/';
    if (typeof topic !== 'string' || !topic.startsWith(prefix)) return null;
    const id = topic.slice(prefix.length);
    if (!/^[a-zA-Z0-9_-]{1,80}$/.test(id) || !bytes || bytes.length > 2048) return null;
    if (!bytes.length) return { id, leave: true };
    let d; try { d = JSON.parse(new TextDecoder().decode(bytes)); } catch (_) { return null; }
    if (!d || typeof d !== 'object' || Array.isArray(d) ||
        !['x', 'y', 'z', 'r'].every(k => Number.isFinite(d[k])) ||
        Math.abs(d.x) > 20000 || Math.abs(d.z) > 20000 || Math.abs(d.y) >= 5000 ||
        typeof d.n !== 'string' || d.n.length > 24 || ![undefined, 0, 1, false, true].includes(d.m) ||
        ![undefined, 0, 1, false, true].includes(d.g)) return null;
    return { id, data: { ...d, details: cards ? cards.details(d.details) : null, r: Math.atan2(Math.sin(d.r), Math.cos(d.r)) } };
  }
  const api = { decode, ttl: 20000, limit: 64 };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else g.VWPeerProtocol = api;
})(typeof window !== 'undefined' ? window : globalThis);
