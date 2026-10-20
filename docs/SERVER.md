# Server mod (dedicated server, e.g. Nitrado)

[Deutsch weiter unten](#deutsch)

Download: `ValheimWeltLive-Server-<version>.zip` from the [releases](https://github.com/Blackwarrior309/Valheim-welt/releases), or build it with `tools/package-mod.sh`.
The zip contains the DLL, a ready server config ([mod/server/de.valheimweltviewer.live.cfg](../mod/server/de.valheimweltviewer.live.cfg)) and this guide.

```text
Valheim Welt Live – installing the mod on a dedicated server (e.g. Nitrado)
===========================================================================

What the mod does on the server
- Every 5 minutes it reads the whole world (in many small steps, so the server doesn't hitch)
  and writes it to  BepInEx/config/ValheimWeltLive/welt.vwdump  (one file, overwritten each time).
- A live map (GitHub Actions or the PC sync script) fetches this file via FTP instead of the save files:
  more up to date, no waiting for the server to save. Players do NOT need the mod.
- No web page on the server (Web.Enabled = false), no Steam IDs in the file.

Before you start: make sure you have a recent backup of the world.

1. Enable BepInEx on the server
- Look for a BepInEx / mod option for Valheim in your host's web interface and enable it, then restart once.
- Afterwards the server must have a folder  BepInEx  with the subfolders  core  and  plugins
  (file browser or FTP).
- No such option? Install "BepInExPack Valheim" (Thunderstore) on the server via FTP.

2. Upload the files (stop the server first)
- The  BepInEx  folder in this zip already has the right structure. Easiest: drag it via FTP
  (e.g. FileZilla) into the server folder that already contains  BepInEx  – merge, don't replace.
- Or one by one:
  ValheimWeltLive.dll  →  BepInEx/plugins/ValheimWeltLive/ValheimWeltLive.dll  (create the folder if needed)
  de.valheimweltviewer.live.cfg  →  BepInEx/config/de.valheimweltviewer.live.cfg

3. Start the server and wait about 6 minutes
- Now  BepInEx/config/ValheimWeltLive/welt.vwdump  must exist (a few MB).
- The server log should contain:
  "Valheim Welt Live 0.6.3 loaded. Web: off, dump file: on"
  "Biome grid computed"
  "World dump written: … objects"

4. Live map
- The GitHub Actions live map (docs/LIVE-MAP.md) and the PC sync script find the file automatically.
  If the file stops changing for more than 45 minutes, they fall back to the save files.

Deaths & walking paths
- The mod writes every death to  BepInEx/config/ValheimWeltLive/tode.csv  (on).
- Walking heatmap: set  RecordPositions = true  under [Spuren] in the .cfg – only if all players agree.
  Positions are written per day to  spuren-YYYYMMDD.csv ; the server keeps only the last 3 days.

Turning it off
- Stop the server, delete BepInEx/plugins/ValheimWeltLive, start the server.
  (Or disable BepInEx in your host's settings.)
```

<a id="deutsch"></a>

# Server-Mod (dedizierter Server, z. B. Nitrado)

Download: `ValheimWeltLive-Server-<version>.zip` unter [Releases](https://github.com/Blackwarrior309/Valheim-welt/releases) oder mit `tools/package-mod.sh` bauen.

```text
Valheim Welt Live – Mod auf einem dedizierten Server (z. B. Nitrado)
====================================================================

Was der Mod auf dem Server macht
- Liest alle 5 Minuten die ganze Welt aus (verteilt auf viele kleine Schritte, damit nichts ruckelt)
  und schreibt sie nach  BepInEx/config/ValheimWeltLive/welt.vwdump  (eine Datei, wird überschrieben).
- Die Live-Karte (GitHub Actions oder Valheim-Sync am PC) holt diese Datei per FTP statt der Spielstände:
  aktueller, ohne auf das Speichern des Servers zu warten. Spieler brauchen den Mod NICHT.
- Keine Webseite auf dem Server (Web.Enabled = false), keine Steam-IDs in der Datei.

Vorher: ein aktuelles Backup der Welt sicherstellen (Nitrado-Webinterface → Backups).

1. BepInEx auf dem Server einschalten
- Im Webinterface des Hosters nach einer BepInEx- bzw. Mod-Option für Valheim suchen, aktivieren,
  dann einmal neu starten.
- Danach muss es auf dem Server einen Ordner  BepInEx  mit den Unterordnern  core  und  plugins  geben
  (Dateibrowser oder FTP).
- Gibt es keine solche Option: „BepInExPack Valheim“ (Thunderstore) per FTP auf den Server laden.

2. Dateien hochladen (Server vorher stoppen)
- Der Ordner  BepInEx  in dieser ZIP hat schon die richtige Struktur. Am einfachsten per FTP
  (z. B. FileZilla) in den Server-Ordner ziehen, in dem schon  BepInEx  liegt – zusammenführen, nicht ersetzen.
- Einzeln geht auch:
  ValheimWeltLive.dll  →  BepInEx/plugins/ValheimWeltLive/ValheimWeltLive.dll  (Ordner ggf. anlegen)
  de.valheimweltviewer.live.cfg  →  BepInEx/config/de.valheimweltviewer.live.cfg

3. Server starten und ca. 6 Minuten warten
- Dann muss es  BepInEx/config/ValheimWeltLive/welt.vwdump  geben (einige MB groß).
- Im Server-Log sollte stehen:
  „Valheim Welt Live 0.6.3 loaded. Web: off, dump file: on“
  „Biome grid computed“
  „World dump written: … objects“

4. Live-Karte
- Die Live-Karte per GitHub Actions (docs/LIVE-MAP.md) und Valheim-Sync finden die Datei automatisch.
  Ändert sie sich länger als 45 Minuten nicht, nehmen sie wieder die Spielstände.

Tode & Laufwege
- Der Mod schreibt jeden Tod nach  BepInEx/config/ValheimWeltLive/tode.csv  (an).
- Laufwege für die Heatmap: in der .cfg unter [Spuren]  RecordPositions = true  setzen – nur, wenn alle Spieler einverstanden sind.
  Die Positionen landen tageweise in  spuren-JJJJMMTT.csv , auf dem Server bleiben nur die letzten 3 Tage.

Wieder ausschalten
- Server stoppen, BepInEx/plugins/ValheimWeltLive löschen, Server starten.
  (Oder BepInEx beim Hoster wieder deaktivieren.)
```
