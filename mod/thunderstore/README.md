# Valheim Welt Live – live 3D world map in your browser

Unofficial companion mod for the **Valheim World Viewer** (https://blackwarrior309.github.io/Valheim-welt/).
It reads your world straight from the running game and shows it in the browser, for example on a second screen:

- **3D map** of the whole explored world with every player-built piece in its real position and rotation
- **Chest search** – find out which chest holds your iron, mead or core wood
- portals, bosses, biomes, explored areas, who built what
- **players in real time** on the map and in 3D

Everything stays on your PC. The mod only opens a local web page on `http://localhost:8686`.

## Usage (single player or self-hosted)

1. Install with r2modman / Thunderstore Mod Manager (or manually, see below).
2. Start Valheim and load your world.
3. Open **http://localhost:8686** in your browser. The map connects by itself.
   The world is read every 30 s, player positions every second.

The public viewer page can connect too: *“Connect live to the Valheim Welt Live mod”* → `http://localhost:8686`.

## Usage on a dedicated server (e.g. Nitrado)

Hosted servers usually don't open an extra port, so on a server the mod writes the world to a file instead:
`BepInEx/config/ValheimWeltLive/welt.vwdump`. A small sync script (GitHub Actions or a PC script) fetches it via FTP and
publishes a live map. Players do **not** need the mod. Step-by-step guide:
https://github.com/Blackwarrior309/Valheim-welt/blob/main/docs/SERVER.md

Recommended server settings (`BepInEx/config/de.valheimweltviewer.live.cfg`):

```
[Daten]
WorldIntervalSeconds = 300
PlayerIntervalSeconds = 5
[Datei]
WriteDumpFile = true
[Datenschutz]
StripSteamIds = true
[Web]
Enabled = false
```

## Manual installation

Copy the `plugins` folder content to `Valheim/BepInEx/plugins/ValheimWeltLive/`, so that
`ValheimWeltLive.dll` and the `web` folder sit next to each other.

## Settings (`BepInEx/config/de.valheimweltviewer.live.cfg`)

| Section | Key | Default | Meaning |
|---|---|---|---|
| Web | Enabled | true | built-in web page / API |
| Web | Port | 8686 | `http://localhost:PORT/` |
| Web | BindAll | false | reachable from your LAN too (Windows may need admin rights) |
| Daten | WorldIntervalSeconds | 30 | read the whole world again (min. 10) |
| Daten | PlayerIntervalSeconds | 1 | player positions |
| Datei | WriteDumpFile | false | write the world file for FTP sync |
| Datei | DumpPath | empty | default `BepInEx/config/ValheimWeltLive/welt.vwdump` |
| Datenschutz | StripSteamIds | true | leave Steam IDs out |

## Privacy

A shared or public map shows bases, chest contents and builder names. Steam IDs are left out by default.
Only publish maps of worlds where everybody agrees.

## Notes

- Unofficial fan project, not affiliated with Iron Gate. Valheim is a trademark of Iron Gate AB.
- Source code, issues and feedback: https://github.com/Blackwarrior309/Valheim-welt
- MIT licence. The web page includes three.js (MIT) and fflate (MIT).
