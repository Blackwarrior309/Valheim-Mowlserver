# Changelog

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
