import sys,json,re;import os;sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from hash import stable;from names import names;from items import NAMES
NAMES.update({'WolfHairBundle':'Wolfshaarbündel','FishingBaitForest':'Köder (Wald)','Bloodbag':'Blutbeutel','SerpentScale':'Seeschlangenschuppe'})
# englische Namen für Items, die (noch) keinen deutschen Namen haben – aus tools/gen_recipes.py (Jötunn-Liste)
try:
    _EN=json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)),'items_en.json'),encoding='utf-8'))
    for _k,_v in _EN.items():
        if _k not in NAMES and not _k.startswith('$'): NAMES[_k]=_v
except FileNotFoundError: pass
from piece_specs import T
NAT={'tree_beech':'Beech1','tree_beech_s':'Beech_small1 Beech_small2','tree_birch':'Birch1 Birch2 Birch1_aut Birch2_aut','tree_oak':'Oak1','tree_fir':'FirTree Pinetree_01','tree_fir_s':'FirTree_small FirTree_small_dead','tree_swamp':'SwampTree1 SwampTree2','tree_ygg':'YggaShoot1 YggaShoot2 YggaShoot3 YggaShoot_small1','bush':'Bush01 Bush02_en shrub_2 Bush01_heath shrub_2_heath RaspberryBush BlueberryBush CloudberryBush','rock':'Rock_4 Rock_3 Rock_7 rock4_coast rock4_forest rock4_heath Rock_4_plains rock1_mountain rock2_mountain rock3_mountain rock2_heath','log':'FirTree_oldLog Beech_log Oak_log SwampTree1_log SwampTree2_log'}
# ground-ish objects used for terrain estimation
GROUND=[n for n in names if any(n.startswith(p) for p in ['Rock','rock','shrub','Pickable_Stone','Pickable_Branch','Pickable_Flint','Pickable_Dandelion','Pickable_Mushroom','FirTree','Pinetree','Beech','Birch','Oak','Bush','SwampTree','Cloudberry','Blueberry','Raspberry','vines','YggaShoot','MineRock','Pickable_Thistle'])]
CONT={'piece_chest_wood':'Holzkiste','piece_chest':'Verstärkte Kiste','piece_chest_blackmetal':'Schwarzmetallkiste','piece_chest_private':'Private Kiste','piece_chest_barrel':'Fass','piece_chest_drawer':'Schublade','Cart':'Karren','Karve':'Karve','VikingShip':'Langschiff','Raft':'Floß'}
for n in CONT: names.add(n)
for n in T: names.add(n)  # jedes Bauteil mit Maßen muss auch über seinen Hash erkannt werden
# Rohstoff-Vorkommen (Kartenebene „Rohstoffe“): Prefab → Art
RES={'rock4_copper':'copper','rock4_copper_frac':'copper','MineRock_Copper':'copper','MineRock_Tin':'tin','Pickable_Tin':'tin',
     'silvervein':'silver','silvervein_frac':'silver','rock3_silver':'silver','rock3_silver_frac':'silver','MineRock_Obsidian':'obsidian','Pickable_Obsidian':'obsidian',
     'Pickable_Tar':'tar','Pickable_TarBig':'tar','mudpile':'scrap','mudpile2':'scrap','mudpile_frac':'scrap','mudpile2_frac':'scrap','mudpile_beacon':'scrap','mudpile_old':'scrap',
     'giant_brain':'tissue','giant_brain_frac':'tissue','giant_ribs':'giant','giant_ribs_frac':'giant','giant_skull':'giant','giant_skull_frac':'giant','giant_helmet1':'giant','giant_helmet2':'giant','giant_sword1':'giant','giant_sword2':'giant',
     'Pickable_BlackCoreStand':'blackcore','Pickable_BlackCore':'blackcore','Pickable_SurtlingCoreStand':'surtling','Pickable_SurtlingCore':'surtling','Leviathan':'chitin','FlametalRockstand':'flametal','FlametalRockstand_frac':'flametal','LeviathanLava':'flametal','MineRock_Meteorite':'flametal','Pickable_Meteorite':'flametal'}
for n in RES: names.add(n)
for n in ['portal_wood','portal_stone','portal','bed','piece_bed02','sign','Player_tombstone','_ZoneCtrl','_TerrainCompiler']: names.add(n)
PN={'stone_wall_2x1':'Steinwand 2×1','stone_floor_2x2':'Steinboden 2×2','wood_floor':'Holzboden 2×2','stone_wall_1x1':'Steinwand 1×1','woodwall':'Holzwand 2×2','wood_wall_half':'Holzwand halb','wood_wall_log_4x0.5':'Rundholz 4×0,5','stone_arch':'Steinbogen','stone_wall_4x2':'Steinwand 4×2','wood_floor_1x1':'Holzboden 1×1','wood_beam':'Holzbalken 2 m','wood_wall_quarter':'Holzwand Viertel','wood_roof':'Holzdach 26°','wood_wall_log':'Rundholzwand','wood_pole_log_4':'Kernholzpfosten 4 m','stone_pillar':'Steinsäule','darkwood_roof':'Teerdach 26°','wood_roof_45':'Holzdach 45°','wood_beam_1':'Holzbalken 1 m','wood_pole2':'Holzpfosten 2 m','wood_beam_45':'Holzbalken 45°','stone_stair':'Steintreppe','piece_chest_wood':'Holzkiste','darkwood_roof_45':'Teerdach 45°','wood_pole':'Holzpfosten 1 m','sign':'Schild','wood_stair':'Holztreppe','woodiron_pole':'Eisenholzpfosten','woodiron_beam':'Eisenholzbalken','piece_chest':'Verstärkte Kiste','portal_wood':'Portal','bed':'Bett','piece_bed02':'Bett','piece_workbench':'Werkbank','forge':'Schmiede','wood_gate':'Holztor','wood_door':'Holztür','darkwood_gate':'Dunkelholztor','fire_pit':'Feuerstelle','hearth':'Herd','wood_stepladder':'Leiter','wood_fence':'Holzzaun','stone_fence':'Steinzaun','crystal_wall_1x1':'Kristallwand','iron_wall_1x1':'Eisenwand','blackmarble_2x2x2':'Marmorblock 2×2×2','wood_log_45':'Rundholz 45°','wood_log_26':'Rundholz 26°','wood_wall_roof_45':'Giebelwand 45°','wood_wall_roof_top':'Giebelspitze'}
# weitere deutsche Bauteil-Namen (inoffizielle Übersetzungen, tools/piece_names_de.json)
try:
    for _k,_v in json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)),'piece_names_de.json'),encoding='utf-8')).items(): PN.setdefault(_k,_v)
except FileNotFoundError: pass
# offizielle Namen und Bezugspunkt-Versatz aus dem Spiel (Hilfs-Mod ValheimWeltExport → tools/piece_meta.json)
try:
    META=json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)),'piece_meta.json'),encoding='utf-8'))
except FileNotFoundError: META={}
for _k,_m in META.items():
    if _m.get('de'): PN[_k]=_m['de']
LOC={'StartTemple':'Spawn','Eikthyrnir':'Eikthyr','GDKing':'Der Älteste','Bonemass':'Knochenmasse','Dragonqueen':'Moder','GoblinKing':'Yagluth','Mistlands_DvergrBossEntrance1':'Die Königin','FaderLocation':'Fader','Vendor_BlackForest':'Haldor (Händler)','Hildir_camp':'Hildir','BogWitch_Camp':'Moorhexe'}
# Orte aus dem Spielstand mit Kategorie für den Kartenfilter:
# s Spawn · b Bosse · t Händler · q Quests · d Dungeons · h Feindliche Siedlungen · n Spawner/Nester · m Material · v Dvergr-Lager
LOCC={'StartTemple':'s','Vendor_BlackForest':'t','Hildir_camp':'t','BogWitch_Camp':'t'}
DUN={'d':{'Crypt2':'Grabkammer','Crypt3':'Grabkammer','Crypt4':'Grabkammer','TrollCave02':'Trollhöhle','SunkenCrypt4':'Versunkene Krypta','MountainCave02':'Frosthöhle',
          'Mistlands_DvergrTownEntrance1':'Befallene Mine','Mistlands_DvergrTownEntrance2':'Befallene Mine','CharredFortress':'Festung (Aschelande)','MorgenHole1':'Morgen-Höhle','MorgenHole2':'Morgen-Höhle','MorgenHole3':'Morgen-Höhle'},
     'q':{'Hildir_crypt':'Hildir: Rauchige Gruft','Hildir_cave':'Hildir: Heulende Höhle','Hildir_plainsfortress':'Hildir: Festung'},
     'h':{'GoblinCamp2':'Fulingdorf','WoodVillage1':'Draugr-Dorf','WoodVillage2':'Draugr-Dorf','CharredFortress':None},
     'n':{'Greydwarf_camp1':'Grauzwerg-Nest','DrakeNest01':'Drachennest'},
     'm':{'TarPit1':'Teergrube','TarPit2':'Teergrube','TarPit3':'Teergrube','Mistlands_Giant1':'Riesenskelett','Mistlands_Giant2':'Riesenskelett'},
     'v':{'Mistlands_GuardTower1_new':'Dvergr-Turm','Mistlands_GuardTower2_new':'Dvergr-Turm','Mistlands_GuardTower3_new':'Dvergr-Turm','Mistlands_Harbour1':'Dvergr-Hafen','Mistlands_Excavation1':'Dvergr-Grabung','Mistlands_Excavation2':'Dvergr-Grabung','Mistlands_Excavation3':'Dvergr-Grabung'}}
out={'locations':dict([(str(stable(k)),[k,v,LOCC.get(k,'b')]) for k,v in LOC.items()]+[(str(stable(k)),[k,v,c]) for c,d in DUN.items() for k,v in d.items() if v]),'prefabs':{str(stable(n)):n for n in sorted(names)},'pieces':{k:list(v[:5])+([META[k]['yoff']] if k in META and 'yoff' in META[k] else []) for k,v in T.items()},
 'nature':{str(stable(n)):k for k,v in NAT.items() for n in v.split()},'ground':[stable(n) for n in GROUND],
 'items':{str(stable(k)):v for k,v in NAMES.items()},'containers':{str(stable(k)):v for k,v in CONT.items()},'resources':{str(stable(k)):[v,1 if k.endswith('_frac') else 0] for k,v in RES.items()},'pieceNames':PN}
js='/* Generiert von tools/gen_data.py – Namens- und Bauteil-Tabellen (inoffiziell) */\n(function(g){g.VW_DATA='+json.dumps(out,ensure_ascii=False,separators=(',',':'))+';})(typeof self!=="undefined"?self:globalThis);\n'
open(os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','js','data.js'),'w').write(js); print(len(js), len(out['prefabs']), len(out['pieces']), len(out['items']))
