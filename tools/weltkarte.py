#!/usr/bin/env python3
"""Ganze Weltkarte (Höhen, Flüsse, Wälder) aus dem "All Data"-Download von valheim-map.world erzeugen.

  python3 tools/weltkarte.py MapData_<SEED>.zip [ausgabe-ordner] [pixel]

Ergebnis: weltkarte/<SEED>.webp (Relief-Karte ±10500 m) + weltkarte/<SEED>.json.
Der Viewer lädt sie automatisch für die Welt mit diesem Seed (Kartenebene „Ganze Welt“)."""
import sys, io, json, gzip, zipfile, os
import numpy as np
from PIL import Image

src = sys.argv[1]; out = sys.argv[2] if len(sys.argv) > 2 else 'weltkarte'; PX = int(sys.argv[3]) if len(sys.argv) > 3 else 3072
z = zipfile.ZipFile(src)
def rd(n): return z.read([f for f in z.namelist() if f.replace('\\', '/').endswith(n)][0])
M = json.loads(rd('data/map.json')); R = M['TileRowCount']; N = M['TileSideCount']; W = M['WorldWidth']; seed = M['WorldSeed']
dt = np.dtype([('b', '<u2'), ('h', '<f4'), ('f', '<f4')])
B = np.zeros((N * R, N * R), np.uint16); H = np.zeros((N * R, N * R), np.float32); F = np.zeros_like(H)
for x in range(N):
    for zz in range(N):
        a = np.frombuffer(gzip.decompress(rd(f'tiles/{x:02d}-{zz:02d}.bin.gz')), dt).reshape(R, R)  # [x, z]
        B[x*R:(x+1)*R, zz*R:(zz+1)*R] = a['b']; H[x*R:(x+1)*R, zz*R:(zz+1)*R] = a['h']; F[x*R:(x+1)*R, zz*R:(zz+1)*R] = a['f']
st = W / (N * R)  # Abstand der Messpunkte; Punkt i liegt bei -W/2 + i*st
EXT = 10500
i0 = int(round((W / 2 - EXT) / st)); n = int(round(2 * EXT / st))
# Bild: Zeile = Norden oben → z absteigend; Spalte = x
B = B[i0:i0+n, i0:i0+n].T[::-1]; H = H[i0:i0+n, i0:i0+n].T[::-1]; F = F[i0:i0+n, i0:i0+n].T[::-1]
def blur(a, r=1):  # kleiner Weichzeichner gegen Rauschen an der Wasserlinie
    k = np.array([1, 2, 1], np.float32) / 4
    for _ in range(r):
        a = np.pad(a, 1, mode='edge'); a = a[:-2] * k[0] + a[1:-1] * k[1] + a[2:] * k[2]
        a = a[:, :-2] * k[0] + a[:, 1:-1] * k[1] + a[:, 2:] * k[2]
    return a
H = blur(H, 2)
COL = {1: (111, 154, 69), 2: (92, 86, 52), 4: (196, 202, 208), 8: (52, 86, 50), 16: (190, 172, 88), 32: (92, 52, 42), 64: (226, 236, 244), 512: (84, 82, 104), 256: (111, 154, 69)}
rgb = np.zeros(H.shape + (3,), np.float32)
for k, c in COL.items(): rgb[B == k] = c
e = H - 30.0  # Wasserspiegel liegt bei 30 m
e = np.where((B == 256) & (e < 1.5), np.minimum(e, -0.5), e)  # flaches Meer bleibt Wasser
m = blur((e >= 0).astype(np.float32), 5)  # einzelne Sandkörner im Flachwasser entfernen
e = np.where((e >= 0) & (e < 4) & (m < 0.85), -0.3, e)
t = np.clip((e - 2) / 90, 0, 1)[..., None] * 0.35
rgb = rgb + (np.array([235, 240, 245]) - rgb) * t
s2 = np.clip((e - 75) / 40, 0, 1)[..., None]
rgb = rgb + (np.array([240, 244, 248]) - rgb) * s2
# Wald etwas dunkler (wie die Spielkarte: Wiesen < 1,15, Ebenen < 0,8, Schwarzwald immer, Nebellande weich)
fo = np.zeros(H.shape, np.float32)
fo[(B == 1) & (F < 1.15)] = 1; fo[(B == 16) & (F < 0.8)] = 1; fo[B == 8] = 1
ml = B == 512; fo[ml] = 1 - np.clip((F[ml] - 1.1) / 0.2, 0, 1)
rgb *= (1 - 0.16 * fo * (e > 2))[..., None]
# Schummerung (Licht von Nordwest)
gy, gx = np.gradient(blur(H, 2), st)
sh = np.clip(1 + (-gx * -0.7 + gy * 0.7) * 0.9, 0.55, 1.35)  # gy: Zeilen nach unten = Süden
land = e >= 0
rgb[land] *= sh[land][..., None]
sand = (e >= 0) & (e < 2); rgb[sand] = rgb[sand] * 0.3 + np.array([205, 190, 140]) * 0.7
# Wasser (Meer, Flüsse, Seen); Flachwasser weich zum Sand überblenden statt hart abschneiden
eb = blur(e, 4)
wt = np.clip(-eb / 25, 0, 1)
water = np.stack([40 + 30 * (1 - wt), 90 + 40 * (1 - wt), 120 + 30 * (1 - wt)], -1)
water = np.where(((B == 32) & (e < 0))[..., None], water * np.array([1.25, 0.75, 0.7]), water)
shallow = np.array([150, 170, 150], np.float32)
sb = np.clip((eb + 2.5) / 2.5, 0, 1)[..., None]  # -2,5 m … 0 m: Wasser → Flachwasser
water = water + (shallow - water) * sb * 0.55
rgb = np.where((e < 0)[..., None], water, rgb)
yy, xx = np.mgrid[0:n, 0:n]; cx = (xx + 0.5) * st - EXT; cz = EXT - (yy + 0.5) * st
alpha = np.where(np.hypot(cx, cz) <= EXT, 255, 0).astype(np.uint8)
img = Image.fromarray(np.dstack([np.clip(rgb, 0, 255).astype(np.uint8), alpha]), 'RGBA').resize((PX, PX), Image.LANCZOS)
os.makedirs(out, exist_ok=True)
# Gelände für die 3D-Ansicht: 24-m-Raster, Int16 Höhe (dm) + Uint8 Biom (Viewer-Codes) + Uint8 Wald (0–255), gzip
TR = 24; TN = int(2 * EXT / TR) + 1
src_i = np.clip(np.round((np.arange(TN) * TR) / st).astype(int), 0, n - 1)  # Spalten (x) im Bild
src_j = np.clip(np.round((np.arange(TN) * TR) / st).astype(int), 0, n - 1)  # z aufsteigend
Hn = H[::-1]  # Zeilen wieder z aufsteigend
Hs = blur(Hn, 1)[np.ix_(src_j, src_i)]
Bs = B[::-1][np.ix_(src_j, src_i)]
fo_n = fo[::-1] * (Hn > 31)
k = max(1, int(round(TR / st)))
pad = np.pad(fo_n, k, mode='edge'); acc = np.zeros_like(fo_n)
for dy in range(-k // 2, k // 2 + 1):
    for dx in range(-k // 2, k // 2 + 1): acc += pad[k + dy:k + dy + n, k + dx:k + dx + n]
Fs = (acc / ((k // 2 * 2 + 1) ** 2))[np.ix_(src_j, src_i)]
BMAP = np.zeros(1024, np.uint8)
for gb, vb in {1: 1, 2: 2, 4: 3, 8: 4, 16: 5, 32: 6, 64: 7, 256: 8, 512: 9}.items(): BMAP[gb] = vb
blob = np.clip(np.round(Hs * 10), -32768, 32767).astype('<i2').tobytes() + BMAP[Bs].tobytes() + np.clip(Fs * 255, 0, 255).astype(np.uint8).tobytes()
open(f'{out}/{seed}-gelaende.bin', 'wb').write(gzip.compress(blob, 9))
print('Gelände', TN, 'x', TN, os.path.getsize(f'{out}/{seed}-gelaende.bin') // 1024, 'KB', 'Waldzellen', int((Fs > 0.5).sum()))

img.save(f'{out}/{seed}.webp', 'WEBP', quality=82, method=6)
json.dump({'seed': seed, 'version': M.get('WorldVersion'), 'x0': -EXT, 'z0': -EXT, 'size': 2 * EXT, 'px': PX, 'image': f'{seed}.webp', 'terrain': {'file': f'{seed}-gelaende.bin', 'res': TR, 'n': TN, 'x0': -EXT, 'z0': -EXT},
           'source': 'valheim-map.world (All Data, Generator ' + str(M.get('GeneratorVersion')) + ')'}, open(f'{out}/{seed}.json', 'w'), ensure_ascii=False, indent=1)
print(seed, f'{out}/{seed}.webp', os.path.getsize(f'{out}/{seed}.webp') // 1024, 'KB')
