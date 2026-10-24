# Changelog

## 0.7.3
- Live events/invasions: the server's current random or forced event (name, message, position, radius, time) every 5 s on `…/event`, plus a history of the last 40 events (`ereignisse.json`).

## 0.7.2
- Fix: portals were missing from the world dump since 0.6.4 (the game keeps them in a separate list, not in the sector lists) – portal network on the map works again.

## 0.7.1
- Lag measurement on the server: server FPS, longest frame, active objects and the 64 m areas with the most active objects every 10 s (`…/perf`, 15 min history).
- Kill leaderboard: a creature whose object disappears with 0 health counts for the nearest player within 50 m; bosses count for everyone within 80 m (`…/kills`, saved in `kills.json`). Boss kills are logged.

## 0.7.0
- Server live feed (`[Live]`, on by default on dedicated servers): every second all online players with exact position, health, stamina, eitr, equipment, dead/sleeping, session start and total play time; every 5 s creatures near players incl. pet names. Sent to the live map's public MQTT channel `vwelt-srv/<seed>/…` (outgoing connection only, no port opened). No client mod needed.
- Play time per player is counted on the server (`spielzeit.json` next to the dump).
- World dump gets an optional `TAME` section: all tamed animals with name and level (older readers ignore it).

## 0.6.4
- World dump reads the objects sector by sector instead of copying the whole object list in one frame (on a ~1 million object world that single copy cost 30–170 ms per dump). Frame time now stays near the configured budget.
- Server-friendly defaults on dedicated servers (batch mode): dump every 300 s, dump file on, web page off, player positions every 5 s.
- Performance log shows how many of all objects were exported.

## 0.6.3
- Smoother world dump on servers: work per frame is limited by object count (`MaxObjectsPerFrame`, default 2048) and a time budget (`MaxMillisecondsPerFrame`, default 2 ms); the biome grid uses the same budget.
- Less memory: records are written straight into one buffer and compressed directly into `welt.vwdump.tmp` (no full copies of the snapshot); gzip "Fastest" by default (`FastCompression`).
- Safe file output: the old `welt.vwdump` is replaced only after the new file is complete and closed; on errors the last valid dump stays.
- ZDOs that were removed or reused during the scan are skipped instead of exported with mixed data.
- Never two dumps at once; skipped dumps are logged. One performance line per dump (`LogPerformance`).
- Dedicated servers (web page off) no longer collect creature/dungeon data nobody reads. Format of `.vwdump` unchanged.

## 0.6.1
- New `/api/dungeon`: rooms, chests with contents, pickables and scrap piles of the dungeon you are in – shown in the map's new “Dungeon” tab.

## 0.6.0
- Players nearby: health, stamina, eitr, equipment with quality, dead / sleeping – the values the game itself sends over the network.
- New `/api/creatures`: enemies and animals in the loaded area (also inside dungeons) with health, stars, tamed and boss flags.

## 0.5.0
- Live player cards in map, 3D and player lists, with follow, go-to and view switching.
- Local character health, stamina, eitr, equipped items and held items in `/api/players`.
- Persisted per-world observed playtime, deaths, foot distance and session visits. These counters start when this version begins recording; they are not historical character totals.
- `Spieler.ShareDetails` controls the additional local API fields and collection. Live browser sharing forwards these details when enabled.


## 0.4.0
- In-game chest search (F7): type an item name – nearby chests get a label with the amount, all chests appear as map pins, the recipe shows every ingredient with how much is stored.
- Optional `LiveMapUrl`: also finds chests far away, using your live map's world file.
- Web page: “Search in game” button in the chest view when connected to the mod.

## 0.3.0
- Server: records every death (tode.csv) – including tombstones looted before the next save.
- Server: optional walking heatmap – player positions every 10 s (spuren-YYYYMMDD.csv, kept 3 days on the server). Off by default, only with your players' consent.
- Live map: portal network, death markers, walking heatmap and a leaderboard (pieces built, deaths, playtime, distance).

## 0.2.0
- Server-friendly: the world is read in small portions (16,384 objects per frame), so a full read no longer causes a hitch.
- Biomes from the world generator (exact colours on the map), explored areas from the minimap, Ashlands support.
- Live player list from the server (only players with a public map position).
- Dump file is written atomically (`.tmp` → rename); first write is logged.
- Web page: English/German interface, no browser caching of viewer files.

## 0.1.0
- First version: built-in web page on `http://localhost:8686`, world dump (VWD1), player positions.
