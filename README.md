# Valheim World Viewer (unofficial)

**➜ Open the viewer: https://blackwarrior309.github.io/Valheim-welt/** · [Deutsch](#deutsch)

Turns a Valheim world (1.0 and newer) into a **3D map of the whole explored world** with every building,
**chest content**, portal, builder and building plan. Share it as **one file** or show it **live**.
English and German interface (switch at the top right, or `?lang=en`).

| | What | For whom |
|---|---|---|
| 🌍 **Viewer** | Drop your world files on the page → 3D map, chest search, share file. Runs entirely in your browser, nothing is uploaded. | everyone |
| 🗺 **Live map for your server** | A copy of this repo fetches your server's world via FTP every ~10 minutes (GitHub Actions) and publishes it on GitHub Pages. → [docs/LIVE-MAP.md](docs/LIVE-MAP.md) | server owners (e.g. Nitrado) |
| 🔌 **Mod “Valheim Welt Live”** | BepInEx mod: live map of your own game on `http://localhost:8686` with players in real time; on a server it writes a world file for the live map. → [mod/thunderstore/README.md](mod/thunderstore/README.md), [docs/SERVER.md](docs/SERVER.md) | players & server owners |

## Viewer – how to

1. Open https://blackwarrior309.github.io/Valheim-welt/
2. Drop your world: `<World>.fwl2`, `<World>.db2` and the `.chunk` files – easiest as one zip of the world folder.
   Local worlds: `%USERPROFILE%\AppData\LocalLow\IronGate\Valheim\worlds_local`
3. Look around: map, 3D (whole world or single bases, fly mode with WASD), chest search, world & players.
4. Share: **“Share file (.html)”** at the top. The file opens with a double-click in any browser, even offline.

Old worlds (`.fwl` + `.db`) are not supported: load and save them once in the current game.

## Privacy

Everything is converted in your browser. A share file or a public live map shows bases, chest contents and builder names.
Steam IDs can be left out (checkbox on the start page) and are always left out by the live map and the mod.

## Feedback

Bugs, wrongly displayed pieces or wishes: https://github.com/Blackwarrior309/Valheim-welt/issues
Screenshots help most – one in game and one in the viewer from a similar angle.

## Repository

```
index.html, css/, js/, lib/, plans/   the website (static, GitHub Pages)
  js/convert.js                       save files / mod dump → .vwelt (browser and Node)
  js/viewer.js                        display: map, 3D, chests, world & players
  js/i18n.js                          language: German/English
  plans/                              building plans
.github/workflows/live.yml            live map: FTP → convert → GitHub Pages (docs/LIVE-MAP.md)
sync/                                 Valheim-Sync: the same for a PC (FTP → GitHub), see sync/LIESMICH.txt
mod/                                  mod source (C#, BepInEx), Thunderstore files, server config
tools/                                convert.cjs (command line), package-mod.sh, name list generators
docs/                                 LIVE-MAP.md, SERVER.md, FORMAT.md (.vwelt, .vwplan, VWD1)
```

Try it locally:

```bash
python3 -m http.server 8000          # then http://localhost:8000
node tools/convert.cjs <world folder|zip> world.vwelt [--strip-ids]
```

## Limits

- **Terrain** is estimated from trees, rocks and plants (plus the biome grid from the mod), not rebuilt from the seed.
- **Building pieces** are simplified shapes. Rare pieces show up as “unknown”; name lists live in `tools/*.py`
  (`python3 tools/gen_data.py` writes `js/data.js`).
- Without the mod, biomes are estimated from what grows where.

Unofficial fan project, not affiliated with Iron Gate. Valheim is a trademark of Iron Gate AB. No game assets included.
MIT licence (`LICENSE`); includes three.js (MIT) and fflate (MIT).

---

<a id="deutsch"></a>
# Valheim Welt-Viewer (inoffiziell)

**➜ Zur Seite: https://blackwarrior309.github.io/Valheim-welt/**

Verwandelt eine Valheim-Welt (ab 1.0) in eine **3D-Karte der ganzen erkundeten Welt** mit allen Gebäuden,
**Kisteninhalten**, Portalen, Erbauern und Bauplänen. Teilen als **eine Datei** oder **live** anzeigen.
Oberfläche auf Deutsch und Englisch (Umschalter oben rechts).

| | Was | Für wen |
|---|---|---|
| 🌍 **Viewer** | Weltdateien auf die Seite ziehen → 3D-Karte, Kistensuche, Teilen-Datei. Läuft komplett im Browser, nichts wird hochgeladen. | alle |
| 🗺 **Live-Karte für deinen Server** | Eine Kopie dieses Repos holt die Serverwelt alle ~10 Minuten per FTP (GitHub Actions) und veröffentlicht sie auf GitHub Pages. → [docs/LIVE-MAP.md](docs/LIVE-MAP.md) | Server-Betreiber (z. B. Nitrado) |
| 🔌 **Mod „Valheim Welt Live“** | BepInEx-Mod: Live-Karte des eigenen Spiels auf `http://localhost:8686` mit Spielern in Echtzeit; auf dem Server schreibt er eine Weltdatei für die Live-Karte. → [mod/README.md](mod/README.md), [docs/SERVER.md](docs/SERVER.md#deutsch) | Spieler & Server-Betreiber |

## So geht's

1. Seite öffnen: https://blackwarrior309.github.io/Valheim-welt/
2. Weltdateien reinziehen: `<Welt>.fwl2`, `<Welt>.db2` und die `.chunk`-Dateien, am einfachsten alles als ZIP.
   Lokale Welten liegen unter `%USERPROFILE%\AppData\LocalLow\IronGate\Valheim\worlds_local`.
3. Ansehen: Karte, 3D (ganze Welt oder einzelne Basen, Flugmodus mit WASD), Kisten durchsuchen, Welt & Spieler.
4. Teilen: oben **„Teilen-Datei (.html)“** speichern und verschicken. Öffnet sich per Doppelklick, auch offline.

Alte Welten (`.fwl` + `.db`) einmal im aktuellen Spiel laden und speichern.

| Aufruf | Was passiert |
|---|---|
| https://blackwarrior309.github.io/Valheim-welt/ | Startseite: Welt reinziehen → umwandeln → ansehen → Teilen-Datei speichern |
| …/?src=live/welt.vwelt&refresh=300 | Live-Welt, lädt alle 5 Min. neu |
| http://localhost:8686 | dieselbe Seite, ausgeliefert vom Mod, live aus dem laufenden Spiel |
| `?lang=en` / `?lang=de` | Sprache festlegen |

## Datenschutz

Umgewandelt wird im Browser. Eine Teilen-Datei oder öffentliche Live-Karte zeigt Basen, Kisteninhalte und Erbauer-Namen.
Steam-IDs lassen sich weglassen (Häkchen auf der Startseite); Live-Karte und Mod lassen sie immer weg.

## Leistung & Grafik

Im 3D-Menü unter **„Leistung & Grafik“**: Schatten (Standard aus; wenn an, nur im Stillstand berechnet), Grafik
(Natur-Texturen, „Einfach“ oder „Blöcke“), Natur-Dichte, Auflösung und Sichtweite. Der Browser merkt sich die Einstellungen.

## Feedback

Fehler, falsch dargestellte Bauteile oder Wünsche bitte als Issue: https://github.com/Blackwarrior309/Valheim-welt/issues
Am hilfreichsten sind Screenshots, einmal im Spiel und einmal im Viewer aus ähnlichem Winkel.

Inoffizielles Fan-Projekt, nicht mit Iron Gate verbunden. Valheim ist eine Marke von Iron Gate AB. Ohne Spielgrafiken. MIT-Lizenz.
