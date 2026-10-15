# Dateiformat `.vwelt` (Version 1)

Eine `.vwelt`-Datei ist **gzip-komprimiertes JSON**. Sie ist die gemeinsame Schnittstelle für alles:

| Quelle | erzeugt `.vwelt` über |
|---|---|
| Browser (diese Seite) | `js/convert.js` im Web-Worker |
| PC / FTP-Pipeline | `node tools/convert.cjs <weltordner|zip>` (gleicher Code) |
| später: Server-Plugin | schreibt dasselbe JSON (oder ruft den Konverter auf) |

Der Viewer liest `.vwelt` per Datei, per Teilen-HTML (eingebettet) oder per URL (`?src=…`).

## Aufbau

```jsonc
{
  "format": "vwelt",            // Pflicht
  "version": 1,                 // Formatversion; Viewer akzeptiert ≥1
  "created": "2026-10-14T13:28:20.000Z",   // Zeitpunkt der Erzeugung – Live-Viewer lädt nur neu, wenn sich das ändert
  "generator": "…",
  "world":   { "name": "Mowlserver", "seed": "NxKPxyPYhX", "modifiers": ["resourcerate 150", …] },
  "players": [ { "name": "Night309", "platform": "Steam_7656…" } ],          // platform fehlt bei --strip-ids
  "characters": [ { "name": "Leyrawr", "account": "Clwhmmr", "steam": "Steam_…", "pieces": 5920 } ],
  "bosses": ["eikthyr","gdking",…],          // besiegte Bosse (aus Global Keys)
  "globalKeys": [ … ],
  "locations": [ { "k": "GDKing", "n": "Der Älteste", "x": -186, "z": 1219, "v": 1 } ],   // v=1: Zone schon generiert
  "portals":   [ { "tag": "Lager", "x": -574, "z": -385 } ],
  "bases":     [ { "id": "b0", "name": "Hauptbasis", "center": [x,z], "pieces": 13001, "chests": 165, "builders": [[name,count],…] } ],
  "overview":  { "x0", "z0", "res": 32, "nx", "nz", "h": "<base64 Uint8>" },   // 0 = keine Daten, sonst Höhe-30+100
  "biomes":    { "x0", "z0", "res": 64, "nx", "nz", "b": "<base64 Uint8>", "src": "Weltgenerator"|"geschätzt" },   // 1 Wiesen 2 Sumpf 3 Berge 4 Schwarzwald 5 Ebenen 6 Aschelande 7 Tiefer Norden 8 Meer 9 Nebellande
  "world3d":   Region,                   // ganze erkundete Welt (id "world", 16-m-Gelände, alle Bauteile, Natur ausgedünnt, "mask" = erkundete Zellen)
  "regions":   [ Region, … ],             // Detail-3D je Basis (4-m-Gelände)
  "stats":     { "zdos", "chunks", "pieces", "playerPieces", "containers", "groundPoints", "duplicatesSkipped" },
  "looseChests": [ Kiste mit Feld "g" = Ortsname ],   // Kisten außerhalb erkannter Basen
  "live":      { "time": ms, "players": [ { "name", "x", "y", "z" } ] },   // nur bei Mod-Dumps
  "plans":     [ { "name", "region", "x", "y", "z", "r", "data": vwplan } ],   // eingeblendete Baupläne
  "warnings":  [ "…" ]
}
```

### Region

```jsonc
{
  "id": "b0", "name": "Hauptbasis", "center": [x, z], "pieceCount": 13001,
  "bounds": [x0, x1, z0, z1],          // Weltkoordinaten (Valheim: x Ost, z Nord, y Höhe; Wasser = 30)
  "res": 4, "nx": 157, "nz": 147,      // Höhenraster
  "h": "<base64 Int16, Dezimeter>",    // Zeile für Zeile, z aufsteigend
  "types": [ [prefabName, breite, höhe, tiefe, neigungGrad], … ],
  "owners": [ "Leyrawr (Clwhmmr)", … ],
  "pieces": { "<kategorie>": [x,y,z,gierGrad,typIndex,ownerIndex,  x,y,z,…] },   // flach, Schritt 6
  "nature": { "<art>": [x,y,z,gier,scale, …] },                                    // flach, Schritt 5
  "labels": [ ["portal"|"bed"|"tomb", text, x, y, z] ],
  "chests": [ { "t": "Holzkiste", "s": "Schildtext", "o": "Erbauer", "x","y","z", "i": [[itemName, anzahl], …] } ],
  "builders": [[name, anzahl]], "topTypes": [[prefab, anzahl]]
}
```

Kategorien: `wood core floor roof droof dark stone marble iron glass chest craft portal fire bed ship misc`.
Natur: `tree_beech tree_beech_s tree_birch tree_oak tree_fir tree_fir_s tree_swamp tree_ygg bush rock log`.

## Live-Karte

```
https://<name>.github.io/<repo>/?src=welt.vwelt&refresh=300
```

* `src` – URL einer `.vwelt` (gleicher Server oder mit CORS-Freigabe). Auch eine Teilen-HTML funktioniert.
* `refresh` – Sekunden zwischen Abfragen (min. 10). Neu gezeichnet wird nur, wenn sich `created` ändert; Basis, Tab und Kamera bleiben erhalten.

## Live-Dump `VWD1` (vom Mod)

Rohdaten aus dem Spielspeicher, little-endian; Strings wie C# `BinaryWriter.Write(string)` (7-Bit-Länge + UTF-8). Als Datei bzw. per HTTP gzip-komprimiert.

```
"VWD1"  i32 version(1)  str welt  str seed  i64 zeit_ms
i32 n  str[n]                         Global Keys
i32 n  (str name, f32 x, f32 y, f32 z)[n]          Spieler online
i32 n  (str prefabName, f32 x, f32 z, u8 erkundet)[n]   Orte (Boss-Altäre usw.)
i32 n  ZDO[n]:
   i32 prefabHash  f32 x y z  f32 gierGrad  f32 scale  u8 maske
   maske&1: i64 creator   maske&2: i64 owner
   maske&4: u8 k, (i32 keyHash, str wert)[k]     (text, tag, ownerName, author, tagauthor, authorName)
   maske&8: i32 len, bytes[len]                  (Kisteninventar „items“)
danach optional, in beliebiger Reihenfolge:
"EXPL"  i32 größe(2048)  f32 pixel(12 m)  i32 len  bytes[len]   aufgedeckte Karte als Bitfeld (Spiel-Client; Pixel = Welt/pixel + größe/2, Bit i → byte[i>>3] & (1<<(i&7)))
"BIOM"  i32 n(320)  f32 res(64 m)  f32 ursprung(-10240)  i32 len  bytes[len]   Biom je Zelle aus dem Weltgenerator (Werte wie "biomes")
```

Der Konverter (`js/convert.js`) wandelt einen Dump genau wie Spielstände in eine `.vwelt` um; `live.players` enthält dann die Spielerpositionen.

## Server-Plugin / Mod

Der Mod `mod/ValheimWeltLive` liefert
1. lokal eine Schnittstelle (`/api/info`, `/api/players`, `/api/world.vwdump`) und die Webseite selbst (`http://localhost:8686`),
2. auf Servern die Datei `welt.vwdump`, die `sync/sync.cjs` per FTP abholt, umwandelt und auf GitHub hochlädt.

Geplant: kleine Änderungsmeldungen (`format: "vwelt-delta"`), damit nicht jedes Mal die ganze Welt übertragen wird.

Neue Felder dürfen jederzeit ergänzt werden; ältere Viewer ignorieren sie. Inkompatible Änderungen erhöhen `version`.

## Bauplan `.vwplan`

gzip-JSON: `{ "format": "vwplan", "version": 1, "name", "size": [breite, höhe, tiefe], "groups": [ { "c": "rrggbb", "o": deckkraft%, "p": "<base64 Int16 cm, Dreiecke>", "n": "<base64 Int8 Normalen>" } ] }`.
Beispiel: `plans/grasland-halle.vwplan`, Liste der mitgelieferten Pläne: `plans/index.json`.

## Bau-Verlauf (Zeitraffer)

Die Live-Karte schreibt bei jeder Bau-Änderung einen Eintrag in den Branch `verlauf` (nicht auf den Server).
Die Seite bekommt ihn unter `live/verlauf/`.

- `index.json`: `{ v:1, world, updated, entries: [{ t, f, add, del, by: { Erbauer: Anzahl }, src? }] }`, `t` = Zeit in ms
- `e/<ISO-Zeit>.json.gz`: `{ v:1, t, types:[Name…], owners:[Erbauer…], add:[[typ,x,y,z,rot,erbauer]…], del:[…] }`
  – Unterschied zum vorherigen Eintrag. Der erste Eintrag enthält alle Teile.
- Ein Teil wird über `Name|x|y|z|rot` erkannt (Werte wie in `.vwelt`, auf 2 Nachkommastellen).
- Ältere Stände (Backups) lassen sich nachträglich einsortieren: `node tools/history-add.cjs <ordner> <backup.zip|weltordner|.vwelt> [--time "JJJJ-MM-TT hh:mm"]`.
- Fehlen in einem neuen Stand plötzlich über 30 % der Teile, wird er als unvollständig verworfen.
