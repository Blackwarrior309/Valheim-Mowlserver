/* Valheim Welt-Viewer – Biome und Grundhöhe aus dem Seed (eigene Nachbildung des Welt-Generators, inoffiziell).
 * Liefert für jeden Punkt der Welt das Biom so, wie das Spiel es beim Erzeugen der Welt berechnet.
 * Biom-Codes wie im Viewer: 1 Wiesen, 2 Sumpf, 3 Berge, 4 Schwarzwald, 5 Ebenen, 6 Aschelande, 7 Tiefer Norden, 8 Meer, 9 Nebellande. */
(function (g) {
  'use strict';
  const f = Math.fround;

  // Seed-Text → Zahl (wie String.GetStableHashCode im Spiel)
  function stableHash(s) {
    let h1 = 5381, h2 = h1;
    for (let i = 0; i < s.length; i += 2) {
      h1 = (((h1 << 5) + h1) ^ s.charCodeAt(i)) | 0;
      if (i === s.length - 1) break;
      h2 = (((h2 << 5) + h2) ^ s.charCodeAt(i + 1)) | 0;
    }
    return (h1 + Math.imul(h2, 1566083941)) | 0;
  }

  // Zufallsgenerator wie UnityEngine.Random (Xorshift128)
  function unityRandom(seed) {
    const s = new Uint32Array(4);
    s[0] = seed >>> 0; s[1] = (Math.imul(s[0], 1812433253) + 1) >>> 0; s[2] = (Math.imul(s[1], 1812433253) + 1) >>> 0; s[3] = (Math.imul(s[2], 1812433253) + 1) >>> 0;
    function next() { const t = (s[0] ^ (s[0] << 11)) >>> 0; s[0] = s[1]; s[1] = s[2]; s[2] = s[3]; s[3] = (s[3] ^ (s[3] >>> 19) ^ t ^ (t >>> 8)) >>> 0; return s[3]; }
    return { rangeInt(min, max) { if (min === max) return min; if (min > max) [min, max] = [max, min]; const span = (max - min) >>> 0; return (min + (next() % span)) | 0; } };
  }

  // 2D-Perlin-Rauschen wie Mathf.PerlinNoise (verbessertes Perlin-Rauschen, Betrag der Eingaben, auf ~0..1 skaliert)
  const P = [151, 160, 137, 91, 90, 15, 131, 13, 201, 95, 96, 53, 194, 233, 7, 225, 140, 36, 103, 30, 69, 142, 8, 99, 37, 240, 21, 10, 23, 190, 6, 148, 247, 120, 234, 75, 0, 26, 197, 62, 94, 252, 219, 203, 117, 35, 11, 32, 57, 177, 33, 88, 237, 149, 56, 87, 174, 20, 125, 136, 171, 168, 68, 175, 74, 165, 71, 134, 139, 48, 27, 166, 77, 146, 158, 231, 83, 111, 229, 122, 60, 211, 133, 230, 220, 105, 92, 41, 55, 46, 245, 40, 244, 102, 143, 54, 65, 25, 63, 161, 1, 216, 80, 73, 209, 76, 132, 187, 208, 89, 18, 169, 200, 196, 135, 130, 116, 188, 159, 86, 164, 100, 109, 198, 173, 186, 3, 64, 52, 217, 226, 250, 124, 123, 5, 202, 38, 147, 118, 126, 255, 82, 85, 212, 207, 206, 59, 227, 47, 16, 58, 17, 182, 189, 28, 42, 223, 183, 170, 213, 119, 248, 152, 2, 44, 154, 163, 70, 221, 153, 101, 155, 167, 43, 172, 9, 129, 22, 39, 253, 19, 98, 108, 110, 79, 113, 224, 232, 178, 185, 112, 104, 218, 246, 97, 228, 251, 34, 242, 193, 238, 210, 144, 12, 191, 179, 162, 241, 81, 51, 145, 235, 249, 14, 239, 107, 49, 192, 214, 31, 181, 199, 106, 157, 184, 84, 204, 176, 115, 121, 50, 45, 127, 4, 150, 254, 138, 236, 205, 93, 222, 114, 67, 29, 24, 72, 243, 141, 128, 195, 78, 66, 215, 61, 156, 180];
  const PERM = new Uint8Array(512); for (let i = 0; i < 512; i++) PERM[i] = P[i & 255];
  const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
  const lerp = (t, a, b) => a + t * (b - a);
  // Gradient wie in Ken Perlins verbessertem Rauschen (3D, hier mit z = 0)
  function grad(h, x, y) { h &= 15; const u = h < 8 ? x : y, v = h < 4 ? y : (h === 12 || h === 14 ? x : 0); return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v); }
  function perlin(x, y) {
    x = Math.abs(f(x)); y = Math.abs(f(y));
    const fx = Math.floor(x), fy = Math.floor(y), X = fx & 255, Y = fy & 255; x -= fx; y -= fy;
    const u = fade(x), v = fade(y);
    const A = PERM[X] + Y, AA = PERM[A], AB = PERM[A + 1], B = PERM[X + 1] + Y, BA = PERM[B], BB = PERM[B + 1];
    const n = lerp(v, lerp(u, grad(PERM[AA], x, y), grad(PERM[BA], x - 1, y)), lerp(u, grad(PERM[AB], x, y - 1), grad(PERM[BB], x - 1, y - 1)));
    return f((n + 0.69) / 1.483);
  }

  const clamp01 = (v) => (v > 1 ? 1 : v < 0 ? 0 : v);
  const lerpF = (a, b, t) => (t <= 0 ? a : t >= 1 ? b : a * (1 - t) + b * t);
  const lerpStep = (a, b, v) => clamp01((v - a) / (b - a));
  const smoothStep = (a, b, v) => { const t = f(clamp01((v - a) / (b - a))); return t * t * (3 - 2 * t); };
  const len = (x, y) => f(Math.sqrt(x * x + y * y));
  const worldAngle = (x, y) => f(Math.sin(f(f(Math.atan2(x, y)) * 20)));

  function create(seedName, version) {
    const seed = typeof seedName === 'number' ? seedName : stableHash(String(seedName));
    const v = version == null ? 2 : version;
    let minMountain = 1000, minDarkland = 0.4, maxMarsh = 6000;
    if (v <= 0) minMountain = 1500;
    if (v <= 1) { minDarkland = 0.5; maxMarsh = 8000; }
    const R = unityRandom(seed);
    const o0 = R.rangeInt(-10000, 10000), o1 = R.rangeInt(-10000, 10000), o2 = R.rangeInt(-10000, 10000), o3 = R.rangeInt(-10000, 10000);
    R.rangeInt(-2147483648, 2147483647); R.rangeInt(-2147483648, 2147483647);
    const o4 = R.rangeInt(-10000, 10000);

    function baseHeight(x, y) {
      const d = len(x, y);
      x = f(x + 100000 + o0); y = f(y + 100000 + o1);
      let h = 0;
      h += perlin(x * 0.002 * 0.5, y * 0.002 * 0.5) * perlin(x * 0.003 * 0.5, y * 0.003 * 0.5) * 1;
      h += perlin(x * 0.002 * 1, y * 0.002 * 1) * perlin(x * 0.003 * 1, y * 0.003 * 1) * h * 0.9;
      h += perlin(x * 0.005 * 1, y * 0.005 * 1) * perlin(x * 0.01 * 1, y * 0.01 * 1) * 0.5 * h;
      h -= 0.07;
      const p1 = perlin(x * 0.002 * 0.25 + 0.123, y * 0.002 * 0.25 + 0.15123), p2 = perlin(x * 0.002 * 0.25 + 0.321, y * 0.002 * 0.25 + 0.231);
      const ridge = Math.abs(p1 - p2);
      let r = 1 - lerpStep(0.02, 0.12, ridge);
      r *= smoothStep(744, 1000, d);
      h *= 1 - r;
      if (d > 10000) {
        h = lerpF(h, -0.2, lerpStep(10000, 10500, d));
        if (d > 10490) h = lerpF(h, -2, lerpStep(10490, 10500, d));
        return f(h);
      }
      if (d < minMountain && h > 0.28) {
        const t = clamp01((h - 0.28) / 0.0999999940395355);
        h = lerpF(lerpF(0.28, 0.38, t), h, lerpStep(minMountain - 400, minMountain, d));
      }
      return f(h);
    }

    function biome(x, y) {
      const d = len(x, y), h = baseHeight(x, y), a = f(worldAngle(x, y) * 100);
      if (len(x, f(y + -4000)) > 12000 + worldAngle(x, y) * 100) return 6; // Aschelande
      if (h <= 0.02) return 8; // Meer
      if (len(x, f(y + 4000)) > f(12000 + a)) return 7; // Tiefer Norden
      if (h > 0.4) return 3; // Berge
      if (perlin(f(o0 + x) * 0.001, f(o0 + y) * 0.001) > 0.6 && d > 2000 && d < maxMarsh && h > 0.05 && h < 0.25) return 2; // Sumpf
      if (perlin(f(o4 + x) * 0.001, f(o4 + y) * 0.001) > minDarkland && d > f(6000 + a) && d < 10000) return 9; // Nebellande
      if (perlin(f(o1 + x) * 0.001, f(o1 + y) * 0.001) > 0.4 && d > f(3000 + a) && d < 8000) return 5; // Ebenen
      if (perlin(f(o2 + x) * 0.001, f(o2 + y) * 0.001) > 0.4 && d > f(600 + a) && d < 6000) return 4; // Schwarzwald
      if (d > f(5000 + a)) return 4;
      return 1; // Wiesen
    }
    return { seed, offsets: [o0, o1, o2, o3, o4], biome, baseHeight };
  }

  const api = { create, stableHash, perlin };
  g.VWWorldGen = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof self !== 'undefined' ? self : globalThis);
