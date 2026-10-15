# Changelog

## 0.2.0
- Server-friendly: the world is read in small portions (16,384 objects per frame), so a full read no longer causes a hitch.
- Biomes from the world generator (exact colours on the map), explored areas from the minimap, Ashlands support.
- Live player list from the server (only players with a public map position).
- Dump file is written atomically (`.tmp` → rename); first write is logged.
- Web page: English/German interface, no browser caching of viewer files.

## 0.1.0
- First version: built-in web page on `http://localhost:8686`, world dump (VWD1), player positions.
