#!/usr/bin/env python3
"""Rezepte und Baukosten aus den Jötunn-Datenlisten (Valheim-Modding/Jotunn, automatisch aus dem Spiel erzeugt)
   → js/recipes.js
   python3 tools/gen_recipes.py <Pfad zu JotunnLib/Documentation/data>
"""
import re, sys, json, os
sys.path.insert(0, os.path.dirname(__file__))
from hash import stable

D = sys.argv[1]
def rows(path):
    out = []
    for line in open(path, encoding='utf-8'):
        if not line.startswith('|') or line.startswith('|---'): continue
        cells = [c.strip() for c in line.strip().strip('|').split('|')]
        out.append(cells)
    return out
def clean(s): return re.sub(r'<br>.*$', '', s).strip()
def reqs(html):
    # nur Stufe 1 (Herstellen); "Level 2:" usw. = Aufwerten
    first = re.split(r'Level 2:', html)[0]
    return [(int(n), name.strip()) for n, name in re.findall(r'<li>(\d+) ([^<]+)</li>', first)]

# Items: Prefab → Englisch
items = {}; by_en = {}
hdr = None
for c in rows(os.path.join(D, 'objects/item-list.md')):
    if c[0] == 'Item': continue
    prefab, token, en, typ = clean(c[0]), c[2], c[3], c[4]
    if not token.startswith('$item') and not token.startswith('$'): continue
    items[prefab] = (en, typ)
    by_en.setdefault(en.lower(), []).append(prefab)

js = open(os.path.join(os.path.dirname(__file__), '..', 'js/data.js'), encoding='utf-8').read()
DATA = json.JSONDecoder().raw_decode(js[js.index('VW_DATA=') + 8:])[0] if 'VW_DATA=' in js else None
known = set(int(h) for h in DATA['items']) if DATA else set()

def prefab_of(en):
    c = by_en.get(en.lower(), [])
    if not c: return None
    c.sort(key=lambda p: (stable(p) not in known, items[p][1] not in ('Material', 'Consumable'), len(p)))
    return c[0]

missing = set()
def H(en):
    p = prefab_of(en)
    if not p: missing.add(en); return None
    return stable(p)

recipes = []
for c in rows(os.path.join(D, 'objects/recipe-list.md')):
    if c[0] == 'Name': continue
    name, out_en, amt, res = c[0], c[2], c[3], c[4]
    out = prefab_of(out_en) if out_en != 'NULL' else None
    if not out:
        cand = name.replace('Recipe_', '')
        out = cand if cand in items else None
    if not out: continue
    rq = [(H(en), n) for n, en in reqs(res)]
    if not rq or any(h is None for h, _ in rq): continue
    recipes.append([stable(out), int(amt or 1), [[h, n] for h, n in rq]])

pieces = {}
for c in rows(os.path.join(D, 'pieces/piece-list.md')):
    if c[0] == 'Piece' or len(c) < 8: continue
    name, en, res, cat = clean(c[0]), c[3], c[5], c[7]
    rq = [(H(en2), n) for n, en2 in reqs(res)]
    if not rq or any(h is None for h, _ in rq): continue
    pieces[name] = [en, cat, [[h, n] for h, n in rq]]

names = {}
for pf, (en, typ) in items.items():
    if typ in ('OneHandedWeapon',) and en.lower().endswith('attack'): continue
    names[stable(pf)] = [pf, en]
for h in set([r[0] for r in recipes] + [x[0] for r in recipes for x in r[2]] + [x[0] for p in pieces.values() for x in p[2]]):
    if h in names: continue
    pf = next((p for p in items if stable(p) == h), None)
    names[h] = [pf, items[pf][0]] if pf else [None, None]

json.dump({pf: en for pf, (en, typ) in items.items() if not (typ == 'OneHandedWeapon' and en.lower().endswith('attack')) and en and en != 'NULL'},
          open(os.path.join(os.path.dirname(__file__), 'items_en.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=0, sort_keys=True)
out = {'source': 'Jötunn data lists (Valheim 1.0.x)', 'items': {str(h): v for h, v in names.items()}, 'recipes': recipes, 'pieces': pieces}
open(os.path.join(os.path.dirname(__file__), '..', 'js/recipes.js'), 'w', encoding='utf-8').write(
    '/* Rezepte & Baukosten – erzeugt von tools/gen_recipes.py aus den Jötunn-Datenlisten */\n(function(g){g.VW_RECIPES=' + json.dumps(out, ensure_ascii=False, separators=(',', ':')) + ';})(typeof window!=="undefined"?window:globalThis);\n')
print(len(recipes), 'Rezepte,', len(pieces), 'Bauteile,', len(names), 'Items; ohne Zuordnung:', sorted(missing)[:30], len(missing))
